use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::Utc;
use serde_json::json;
use uuid::Uuid;

use crate::{
    handlers::auth::AppState,
    middleware::auth::{AppError, AuthUser},
    models::{
        application::{
            Application, ApplicationWithApplicantDto, CreateApplicationDto,
            StudentApplicationWithJobDto, UpdateApplicationStatusDto,
        },
        job::Job,
    },
};

pub async fn apply_to_job(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(job_id): Path<String>,
    Json(payload): Json<CreateApplicationDto>,
) -> Result<impl IntoResponse, AppError> {
    if payload.pitch_note.trim().is_empty() {
        return Err(AppError(
            StatusCode::BAD_REQUEST,
            "A pitch note explaining your interest and qualifications is required".to_string(),
        ));
    }

    let job = sqlx::query_as::<_, Job>("SELECT * FROM jobs WHERE id = ?")
        .bind(&job_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or_else(|| AppError(StatusCode::NOT_FOUND, "Job posting not found".to_string()))?;

    if job.creator_id == auth.id {
        return Err(AppError(
            StatusCode::BAD_REQUEST,
            "You cannot apply to your own job posting".to_string(),
        ));
    }

    if job.status != "OPEN" {
        return Err(AppError(
            StatusCode::BAD_REQUEST,
            format!("This job posting is currently {} and is not accepting applications", job.status),
        ));
    }

    let existing = sqlx::query_as::<_, Application>(
        "SELECT * FROM applications WHERE job_id = ? AND applicant_id = ?"
    )
    .bind(&job_id)
    .bind(&auth.id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if existing.is_some() {
        return Err(AppError(
            StatusCode::CONFLICT,
            "You have already submitted an application for this job posting".to_string(),
        ));
    }

    let app_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        r#"
        INSERT INTO applications (
            id, job_id, applicant_id, pitch_note, resume_url, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?)
        "#,
    )
    .bind(&app_id)
    .bind(&job_id)
    .bind(&auth.id)
    .bind(payload.pitch_note.trim())
    .bind(&payload.resume_url)
    .bind(&now)
    .bind(&now)
    .execute(&state.db)
    .await
    .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let created = sqlx::query_as::<_, Application>("SELECT * FROM applications WHERE id = ?")
        .bind(&app_id)
        .fetch_one(&state.db)
        .await
        .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok((StatusCode::CREATED, Json(created)))
}

pub async fn get_job_applications(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(job_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let job = sqlx::query_as::<_, Job>("SELECT * FROM jobs WHERE id = ?")
        .bind(&job_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or_else(|| AppError(StatusCode::NOT_FOUND, "Job posting not found".to_string()))?;

    if job.creator_id != auth.id {
        return Err(AppError(
            StatusCode::FORBIDDEN,
            "Only the job creator can review applicants for this job".to_string(),
        ));
    }

    let applications = sqlx::query_as::<_, ApplicationWithApplicantDto>(
        r#"
        SELECT 
            a.id, a.job_id, a.applicant_id,
            u.name AS applicant_name, u.email AS applicant_email,
            u.roll_number AS applicant_roll_number, u.department AS applicant_department,
            u.graduation_year AS applicant_graduation_year,
            a.pitch_note, a.resume_url, a.status, a.created_at
        FROM applications a
        JOIN users u ON a.applicant_id = u.id
        WHERE a.job_id = ?
        ORDER BY a.created_at DESC
        "#,
    )
    .bind(&job_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(applications))
}

pub async fn get_my_applications(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    let applications = sqlx::query_as::<_, StudentApplicationWithJobDto>(
        r#"
        SELECT 
            a.id, a.job_id, j.title AS job_title, j.category AS job_category,
            j.stipend AS job_stipend, j.status AS job_status,
            a.pitch_note, a.resume_url, a.status, a.created_at
        FROM applications a
        JOIN jobs j ON a.job_id = j.id
        WHERE a.applicant_id = ?
        ORDER BY a.created_at DESC
        "#,
    )
    .bind(&auth.id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(applications))
}

pub async fn update_application_status(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(app_id): Path<String>,
    Json(payload): Json<UpdateApplicationStatusDto>,
) -> Result<impl IntoResponse, AppError> {
    let app = sqlx::query_as::<_, Application>("SELECT * FROM applications WHERE id = ?")
        .bind(&app_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or_else(|| AppError(StatusCode::NOT_FOUND, "Application not found".to_string()))?;

    let job = sqlx::query_as::<_, Job>("SELECT * FROM jobs WHERE id = ?")
        .bind(&app.job_id)
        .fetch_one(&state.db)
        .await
        .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if job.creator_id != auth.id {
        return Err(AppError(
            StatusCode::FORBIDDEN,
            "Only the job creator can update applicant status".to_string(),
        ));
    }

    let valid_statuses = ["PENDING", "SHORTLISTED", "ACCEPTED", "REJECTED"];
    let new_status = payload.status.trim().to_uppercase();
    if !valid_statuses.contains(&new_status.as_str()) {
        return Err(AppError(
            StatusCode::BAD_REQUEST,
            format!("Invalid status. Allowed values: {}", valid_statuses.join(", ")),
        ));
    }

    let now = Utc::now().to_rfc3339();
    sqlx::query("UPDATE applications SET status = ?, updated_at = ? WHERE id = ?")
        .bind(&new_status)
        .bind(&now)
        .bind(&app_id)
        .execute(&state.db)
        .await
        .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(json!({
        "message": "Application status updated successfully",
        "id": app_id,
        "status": new_status
    })))
}
