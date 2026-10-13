use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
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
    pub tx: tokio::sync::broadcast::Sender<String>,
}

pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterDto>,
) -> Result<impl IntoResponse, AppError> {
    let email = payload.email.trim().to_lowercase();
    let roll_number = normalize_roll_number(&payload.roll_number);

    validate_college_email(&email, &state.config)
        .map_err(|err| AppError(StatusCode::BAD_REQUEST, err))?;

    if payload.password.len() < 6 {
        return Err(AppError(
            StatusCode::BAD_REQUEST,
            "Password must be at least 6 characters long".to_string(),
        ));
    }

    // Check existing email or roll number
    let existing_user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE email = ? OR roll_number = ?"
    )
    .bind(&email)
    .bind(&roll_number)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

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

    let password_hash = hash(&payload.password, DEFAULT_COST)
        .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

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
    .bind(&payload.name.trim())
    .bind(&roll_number)
    .bind(&payload.department.trim())
    .bind(payload.graduation_year)
    .bind(&payload.bio)
    .bind(None::<String>)
    .bind(&payload.resume_url)
    .bind(&payload.skills)
    .bind(&now)
    .bind(&now)
    .execute(&state.db)
    .await
    .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let created_user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = ?")
        .bind(&user_id)
        .fetch_one(&state.db)
        .await
        .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

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
    let email_or_roll = payload.email.trim();

    let user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE email = ? OR roll_number = ?"
    )
    .bind(email_or_roll.to_lowercase())
    .bind(email_or_roll.to_uppercase())
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or_else(|| {
        AppError(
            StatusCode::UNAUTHORIZED,
            "Invalid college credentials (email or roll number not found)".to_string(),
        )
    })?;

    let is_valid = verify(&payload.password, &user.password_hash)
        .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !is_valid {
        return Err(AppError(
            StatusCode::UNAUTHORIZED,
            "Incorrect password".to_string(),
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
    let erp_client = ErpClient::new(Some(state.config.erp_base_url.clone()));
    
    // 1. Authenticate with ERP and retrieve official student info
    let profile = erp_client
        .login_and_fetch_profile(&payload.username, &payload.password)
        .await
        .map_err(|err| AppError(StatusCode::UNAUTHORIZED, err))?;

    let roll_number = normalize_roll_number(&profile.roll_no);
    let email = if payload.username.contains('@') {
        payload.username.trim().to_lowercase()
    } else {
        format!("{}@mit.asia", roll_number.to_lowercase())
    };

    // 2. Check if student already exists in database
    let existing_user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE roll_number = ? OR email = ?"
    )
    .bind(&roll_number)
    .bind(&email)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let user = match existing_user {
        Some(mut u) => {
            // Update name and department if changed in ERP
            let now = Utc::now().to_rfc3339();
            let _ = sqlx::query(
                "UPDATE users SET name = ?, department = ?, updated_at = ? WHERE id = ?"
            )
            .bind(&profile.full_name)
            .bind(&profile.course_name)
            .bind(&now)
            .bind(&u.id)
            .execute(&state.db)
            .await;

            u.name = profile.full_name;
            u.department = profile.course_name;
            u
        }
        None => {
            // Automatically provision verified student account from ERP
            let user_id = Uuid::new_v4().to_string();
            let password_hash = hash(&payload.password, DEFAULT_COST)
                .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            let now = Utc::now().to_rfc3339();

            sqlx::query(
                r#"
                INSERT INTO users (
                    id, email, password_hash, name, roll_number, department,
                    graduation_year, bio, avatar_url, resume_url, skills, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, 2027, ?, ?, ?, ?, ?, ?)
                "#,
            )
            .bind(&user_id)
            .bind(&email)
            .bind(&password_hash)
            .bind(&profile.full_name)
            .bind(&roll_number)
            .bind(&profile.course_name)
            .bind(Some(format!("Verified ERP Student. Contact: {}", profile.mobile_no.unwrap_or_default())))
            .bind(None::<String>)
            .bind(None::<String>)
            .bind(None::<String>)
            .bind(&now)
            .bind(&now)
            .execute(&state.db)
            .await
            .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

            sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = ?")
                .bind(&user_id)
                .fetch_one(&state.db)
                .await
                .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        }
    };

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
        .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let posted_jobs_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM jobs WHERE creator_id = ?")
        .bind(&auth.id)
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);

    let applications_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM applications WHERE applicant_id = ?")
        .bind(&auth.id)
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);

    let active_chats_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM conversations WHERE student_id = ? OR owner_id = ?"
    )
    .bind(&auth.id)
    .bind(&auth.id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    Ok(Json(ProfileStatsDto {
        user: user.into(),
        posted_jobs_count,
        applications_count,
        active_chats_count,
    }))
}
