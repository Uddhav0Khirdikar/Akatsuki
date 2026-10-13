use crate::middleware::auth::AppError;
use axum::http::StatusCode;
use chrono::NaiveDate;
use serde::Deserialize;

pub const CATEGORIES: &[&str] = &[
    "INTERNSHIP",
    "PART_TIME",
    "RESEARCH_ASSISTANT",
    "PROJECT_COLLAB",
    "CAMPUS_GIG",
    "TUTORING",
];
pub const LOCATIONS: &[&str] = &["ON_CAMPUS", "REMOTE", "HYBRID"];
pub const JOB_STATUSES: &[&str] = &["OPEN", "CLOSED"];

pub fn text(value: &str, field: &str, max: usize) -> Result<(), AppError> {
    if value.trim().is_empty() || value.len() > max {
        return Err(AppError(
            StatusCode::BAD_REQUEST,
            format!("{field} is required and must be at most {max} bytes"),
        ));
    }
    Ok(())
}
pub fn choice(value: &str, field: &str, values: &[&str]) -> Result<(), AppError> {
    if !values.contains(&value) {
        return Err(AppError(
            StatusCode::BAD_REQUEST,
            format!("Invalid {field}. Allowed values: {}", values.join(", ")),
        ));
    }
    Ok(())
}
pub fn optional_text(value: &Option<String>, field: &str, max: usize) -> Result<(), AppError> {
    if value.as_ref().is_some_and(|s| s.len() > max) {
        return Err(AppError(
            StatusCode::BAD_REQUEST,
            format!("{field} must be at most {max} bytes"),
        ));
    }
    Ok(())
}
pub fn url(value: &Option<String>) -> Result<(), AppError> {
    if let Some(value) = value {
        let parsed = reqwest::Url::parse(value).ok();
        if value.len() > 2048
            || !parsed.is_some_and(|u| {
                matches!(u.scheme(), "http" | "https")
                    && u.host_str().is_some()
                    && u.username().is_empty()
                    && u.password().is_none()
            })
        {
            return Err(AppError(
                StatusCode::BAD_REQUEST,
                "Resume URL must be an HTTP(S) URL without credentials".into(),
            ));
        }
    }
    Ok(())
}
pub fn deadline(value: &Option<String>) -> Result<(), AppError> {
    if let Some(value) = value {
        if value.len() != 10 || NaiveDate::parse_from_str(value, "%Y-%m-%d").is_err() {
            return Err(AppError(
                StatusCode::BAD_REQUEST,
                "Deadline must be a valid YYYY-MM-DD date".into(),
            ));
        }
    }
    Ok(())
}

#[derive(Deserialize, Default)]
pub struct Pagination {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}
impl Pagination {
    pub fn bounds(&self) -> (i64, i64) {
        (
            self.limit.unwrap_or(50).clamp(1, 100),
            self.offset.unwrap_or(0).max(0),
        )
    }
}
