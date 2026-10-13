use crate::{
    handlers::auth::AppState,
    models::user::{Claims, User},
};
use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{header, request::Parts, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use serde_json::json;

pub struct AuthUser {
    pub id: String,
    pub roll_number: String,
    pub name: String,
}

pub struct AppError(pub StatusCode, pub String);

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        if self.0 == StatusCode::INTERNAL_SERVER_ERROR {
            tracing::error!(status = %self.0, error = %self.1, "Request failed");
            return (self.0, Json(json!({"error": "Internal server error"}))).into_response();
        }
        (self.0, Json(json!({"error": self.1}))).into_response()
    }
}

impl From<sqlx::Error> for AppError {
    fn from(error: sqlx::Error) -> Self {
        if let sqlx::Error::Database(db) = &error {
            if db.is_unique_violation() {
                return Self(StatusCode::CONFLICT, "Record already exists".into());
            }
            if db.message() == "job_closed" {
                return Self(
                    StatusCode::BAD_REQUEST,
                    "This job is closed and is not accepting new applications or inquiries".into(),
                );
            }
        }
        Self(StatusCode::INTERNAL_SERVER_ERROR, error.to_string())
    }
}

pub async fn authenticate(state: &AppState, token: &str) -> Result<(AuthUser, usize), AppError> {
    let mut validation = Validation::new(Algorithm::HS256);
    validation.leeway = 0;
    let claims = decode::<Claims>(
        token,
        &DecodingKey::from_secret(state.config.jwt_secret.as_bytes()),
        &validation,
    )
    .map_err(|_| {
        AppError(
            StatusCode::UNAUTHORIZED,
            "Invalid or expired session".into(),
        )
    })?
    .claims;
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = ?")
        .bind(claims.sub)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| {
            AppError(
                StatusCode::UNAUTHORIZED,
                "Invalid or expired session".into(),
            )
        })?;
    if !state.config.allow_local_auth && user.erp_verified != 1 {
        return Err(AppError(
            StatusCode::FORBIDDEN,
            "ERP verification is required".into(),
        ));
    }
    Ok((
        AuthUser {
            id: user.id,
            roll_number: user.roll_number,
            name: user.name,
        },
        claims.exp,
    ))
}

#[async_trait]
impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AppError;
    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let token = parts
            .headers
            .get(header::AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.strip_prefix("Bearer "))
            .filter(|s| !s.is_empty())
            .ok_or_else(|| AppError(StatusCode::UNAUTHORIZED, "Bearer token is required".into()))?;
        Ok(authenticate(state, token).await?.0)
    }
}
