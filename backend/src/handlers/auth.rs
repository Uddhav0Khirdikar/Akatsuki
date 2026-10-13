use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::Utc;
use jsonwebtoken::{encode, EncodingKey, Header};
use uuid::Uuid;

use crate::{
    config::Config,
    db::DbPool,
    middleware::auth::{AppError, AuthUser},
    models::user::{
        AuthResponse, Claims, ErpLoginDto, LoginDto, ProfileStatsDto, RegisterDto, User,
    },
    utils::{
        erp::{normalize_roll_number, validate_college_email},
        erp_client::ErpClient,
    },
};

#[derive(Clone)]
pub struct AppState {
    pub db: DbPool,
    pub config: Config,
    pub tx: tokio::sync::broadcast::Sender<crate::handlers::ws::RealtimeEvent>,
    pub auth_slots: std::sync::Arc<tokio::sync::Semaphore>,
    pub rate_limiter: crate::middleware::rate_limit::RateLimiter,
}

pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterDto>,
) -> Result<impl IntoResponse, AppError> {
    if !state.config.allow_local_auth {
        return Err(AppError(
            StatusCode::FORBIDDEN,
            "Local registration is disabled; sign in through ERP".into(),
        ));
    }
    crate::utils::validation::text(&payload.name, "Name", 200)?;
    crate::utils::validation::text(&payload.department, "Department", 200)?;
    crate::utils::validation::text(&payload.roll_number, "Roll number", 100)?;
    crate::utils::validation::optional_text(&payload.bio, "Bio", 2000)?;
    crate::utils::validation::optional_text(&payload.skills, "Skills", 2000)?;
    crate::utils::validation::url(&payload.resume_url)?;
    if !(2000..=2100).contains(&payload.graduation_year) {
        return Err(AppError(
            StatusCode::BAD_REQUEST,
            "Graduation year must be between 2000 and 2100".into(),
        ));
    }
    let email = payload.email.trim().to_lowercase();
    let roll_number = normalize_roll_number(&payload.roll_number);

    validate_college_email(&email, &state.config)
        .map_err(|err| AppError(StatusCode::BAD_REQUEST, err))?;

    if !(8..=72).contains(&payload.password.len()) {
        return Err(AppError(
            StatusCode::BAD_REQUEST,
            "Password must be between 8 and 72 bytes".to_string(),
        ));
    }

    // Check existing email or roll number
    let existing_user =
        sqlx::query_as::<_, User>("SELECT * FROM users WHERE email = ? OR roll_number = ?")
            .bind(&email)
            .bind(&roll_number)
            .fetch_optional(&state.db)
            .await
            .map_err(AppError::from)?;

    if let Some(user) = existing_user {
        if user.email == email {
            return Err(AppError(
                StatusCode::CONFLICT,
                "A student with this college email already exists".to_string(),
            ));
        } else {
            return Err(AppError(
                StatusCode::CONFLICT,
                "A student with this ERP roll number already exists".to_string(),
            ));
        }
    }

    let password_hash = password_hash(&state, payload.password).await?;

    let user_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        r#"
        INSERT INTO users (
            id, email, password_hash, name, roll_number, department,
            graduation_year, bio, avatar_url, resume_url, skills, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&user_id)
    .bind(&email)
    .bind(&password_hash)
    .bind(payload.name.trim())
    .bind(&roll_number)
    .bind(payload.department.trim())
    .bind(payload.graduation_year)
    .bind(&payload.bio)
    .bind(None::<String>)
    .bind(&payload.resume_url)
    .bind(&payload.skills)
    .bind(&now)
    .bind(&now)
    .execute(&state.db)
    .await
    .map_err(AppError::from)?;

    let created_user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = ?")
        .bind(&user_id)
        .fetch_one(&state.db)
        .await
        .map_err(AppError::from)?;

    let exp = (Utc::now().timestamp() + 7 * 24 * 3600) as usize;
    let claims = Claims {
        sub: created_user.id.clone(),
        email: created_user.email.clone(),
        roll_number: created_user.roll_number.clone(),
        name: created_user.name.clone(),
        exp,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(state.config.jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok((
        StatusCode::CREATED,
        Json(AuthResponse {
            token,
            user: created_user.into(),
        }),
    ))
}

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginDto>,
) -> Result<impl IntoResponse, AppError> {
    if !state.config.allow_local_auth {
        return Err(AppError(
            StatusCode::FORBIDDEN,
            "Local login is disabled; sign in through ERP".into(),
        ));
    }
    if payload.password.len() > 72 {
        return Err(AppError(
            StatusCode::UNAUTHORIZED,
            "Invalid credentials".into(),
        ));
    }
    let email_or_roll = payload.email.trim();

    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE email = ? OR roll_number = ?")
        .bind(email_or_roll.to_lowercase())
        .bind(email_or_roll.to_uppercase())
        .fetch_optional(&state.db)
        .await
        .map_err(AppError::from)?
        .ok_or_else(|| AppError(StatusCode::UNAUTHORIZED, "Invalid credentials".to_string()))?;

    if user.password_hash.is_empty() {
        return Err(AppError(
            StatusCode::UNAUTHORIZED,
            "Invalid credentials".into(),
        ));
    }
    let permit = auth_permit(&state)?;
    let stored_hash = user.password_hash.clone();
    let is_valid = tokio::task::spawn_blocking(move || {
        let _permit = permit;
        verify(payload.password, &stored_hash)
    })
    .await
    .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !is_valid {
        return Err(AppError(
            StatusCode::UNAUTHORIZED,
            "Invalid credentials".to_string(),
        ));
    }

    let exp = (Utc::now().timestamp() + 7 * 24 * 3600) as usize;
    let claims = Claims {
        sub: user.id.clone(),
        email: user.email.clone(),
        roll_number: user.roll_number.clone(),
        name: user.name.clone(),
        exp,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(state.config.jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(AuthResponse {
        token,
        user: user.into(),
    }))
}

/// Official College ERP Login (using the MIT_Attendance Spring Security & Dashboard API)
pub async fn erp_login(
    State(state): State<AppState>,
    Json(payload): Json<ErpLoginDto>,
) -> Result<impl IntoResponse, AppError> {
    crate::utils::validation::text(&payload.username, "ERP username", 254)?;
    crate::utils::validation::text(&payload.password, "ERP password", 1024)?;
    let _permit = auth_permit(&state)?;
    let erp_client = ErpClient::new(state.config.erp_base_url.clone());
    // Bound the complete upstream flow, not just each redirect/dashboard request.
    let profile = tokio::time::timeout(
        std::time::Duration::from_secs(20),
        erp_client.login_and_fetch_profile(&payload.username, &payload.password),
    )
    .await
    .map_err(|_| crate::utils::erp_client::ErpError::Unavailable.into_app_error())?
    .map_err(|error| error.into_app_error())?;
    let roll_number = normalize_roll_number(&profile.roll_no);
    // Only the ERP roll number is an authoritative identity. Submitted emails are not proof.
    let email = format!("{}@mit.asia", roll_number.to_lowercase());
    let mut transaction = state.db.begin_with("BEGIN IMMEDIATE").await?;
    let existing = sqlx::query_as::<_, User>("SELECT * FROM users WHERE roll_number = ?")
        .bind(&roll_number)
        .fetch_optional(&mut *transaction)
        .await?;
    let now = Utc::now().to_rfc3339();
    let user_id = if let Some(user) = existing {
        if user.erp_verified != 1 {
            return Err(AppError(StatusCode::CONFLICT,
                "This roll number belongs to an unverified legacy account; administrator migration is required".into()));
        }
        sqlx::query("UPDATE users SET name = ?, department = ?, updated_at = ? WHERE id = ?")
            .bind(&profile.full_name)
            .bind(&profile.course_name)
            .bind(&now)
            .bind(&user.id)
            .execute(&mut *transaction)
            .await?;
        user.id
    } else {
        let user_id = Uuid::new_v4().to_string();
        // ERP credentials are never stored and cannot be reused through local login.
        sqlx::query("INSERT INTO users (id, email, password_hash, name, roll_number, department, graduation_year, created_at, updated_at, erp_verified) VALUES (?, ?, '', ?, ?, ?, 0, ?, ?, 1)")
            .bind(&user_id).bind(&email).bind(&profile.full_name).bind(&roll_number)
            .bind(&profile.course_name).bind(&now).bind(&now)
            .execute(&mut *transaction).await?;
        user_id
    };
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = ?")
        .bind(&user_id)
        .fetch_one(&mut *transaction)
        .await?;
    transaction.commit().await?;

    let exp = (Utc::now().timestamp() + 7 * 24 * 3600) as usize;
    let claims = Claims {
        sub: user.id.clone(),
        email: user.email.clone(),
        roll_number: user.roll_number.clone(),
        name: user.name.clone(),
        exp,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(state.config.jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(AuthResponse {
        token,
        user: user.into(),
    }))
}

pub async fn get_me(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = ?")
        .bind(&auth.id)
        .fetch_one(&state.db)
        .await
        .map_err(AppError::from)?;

    let posted_jobs_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM jobs WHERE creator_id = ?")
            .bind(&auth.id)
            .fetch_one(&state.db)
            .await
            .map_err(AppError::from)?;

    let applications_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM applications WHERE applicant_id = ?")
            .bind(&auth.id)
            .fetch_one(&state.db)
            .await
            .map_err(AppError::from)?;

    let active_chats_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM conversations WHERE student_id = ? OR owner_id = ?",
    )
    .bind(&auth.id)
    .bind(&auth.id)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::from)?;

    Ok(Json(ProfileStatsDto {
        user: user.into(),
        posted_jobs_count,
        applications_count,
        active_chats_count,
    }))
}

pub fn auth_permit(state: &AppState) -> Result<tokio::sync::OwnedSemaphorePermit, AppError> {
    state.auth_slots.clone().try_acquire_owned().map_err(|_| {
        AppError(
            StatusCode::TOO_MANY_REQUESTS,
            "Authentication is busy; retry shortly".into(),
        )
    })
}
async fn password_hash(state: &AppState, password: String) -> Result<String, AppError> {
    let permit = auth_permit(state)?;
    tokio::task::spawn_blocking(move || {
        let _permit = permit;
        hash(password, DEFAULT_COST)
    })
    .await
    .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
}
