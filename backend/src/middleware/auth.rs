use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{header, request::Parts, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde_json::json;

use crate::{config::Config, models::user::Claims};

pub struct AuthUser {
    pub id: String,
    pub email: String,
    pub roll_number: String,
    pub name: String,
}

pub struct AppError(pub StatusCode, pub String);

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let body = Json(json!({
            "error": self.1
        }));
        (self.0, body).into_response()
    }
}

#[async_trait]
impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get(header::AUTHORIZATION)
            .and_then(|value| value.to_str().ok());

        let token = match auth_header {
            Some(header) if header.starts_with("Bearer ") => &header[7..],
            _ => {
                return Err(AppError(
                    StatusCode::UNAUTHORIZED,
                    "Missing or malformed Authorization header with Bearer token".to_string(),
                ));
            }
        };

        let config = Config::init();
        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(config.jwt_secret.as_bytes()),
            &Validation::default(),
        )
        .map_err(|e| {
            AppError(
                StatusCode::UNAUTHORIZED,
                format!("Invalid or expired JWT token: {}", e),
            )
        })?;

        Ok(AuthUser {
            id: token_data.claims.sub,
            email: token_data.claims.email,
            roll_number: token_data.claims.roll_number,
            name: token_data.claims.name,
        })
    }
}
