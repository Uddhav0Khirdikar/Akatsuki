use crate::utils::validation::{self, Pagination};
use axum::{
    extract::{Path, Query, State},
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
    models::job::{
        CreateJobDto, Job, JobFilterQuery, JobWithPosterDto, UpdateJobDto, UpdateJobStatusDto,
    },
};

pub async fn create_job(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(payload): Json<CreateJobDto>,
) -> Result<impl IntoResponse, AppError> {
    if payload.title.trim().is_empty() || payload.description.trim().is_empty() {
        return Err(AppError(
            StatusCode::BAD_REQUEST,
            "Job title and description are required".to_string(),
        ));
    }

    validate_job_fields(
        &payload.title,
        &payload.description,
        payload.category.as_deref().unwrap_or("CAMPUS_GIG"),
        payload.location_type.as_deref().unwrap_or("ON_CAMPUS"),
        "OPEN",
        &payload.deadline,
    )?;
    validate_optional_fields(
        &payload.location,
        &payload.stipend,
        &payload.skills_required,
        &payload.department,
    )?;

    let mut transaction = state.db.begin_with("BEGIN IMMEDIATE").await?;
    let job_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let category = payload.category.unwrap_or_else(|| "CAMPUS_GIG".to_string());
    let location_type = payload
        .location_type
        .unwrap_or_else(|| "ON_CAMPUS".to_string());
    let status = "OPEN".to_string();

    sqlx::query(
        r#"
        INSERT INTO jobs (
            id, title, description, category, location_type, location,
            stipend, skills_required, department, status, deadline,
            creator_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&job_id)
    .bind(payload.title.trim())
    .bind(payload.description.trim())
    .bind(&category)
    .bind(&location_type)
    .bind(&payload.location)
    .bind(&payload.stipend)
    .bind(&payload.skills_required)
    .bind(&payload.department)
    .bind(&status)
    .bind(&payload.deadline)
    .bind(&auth.id)
    .bind(&now)
    .bind(&now)
    .execute(&mut *transaction)
    .await
    .map_err(AppError::from)?;

    let created_job = sqlx::query_as::<_, Job>("SELECT * FROM jobs WHERE id = ?")
        .bind(&job_id)
        .fetch_one(&mut *transaction)
        .await
        .map_err(AppError::from)?;

    transaction.commit().await?;
    Ok((StatusCode::CREATED, Json(created_job)))
}

pub async fn get_jobs(
    State(state): State<AppState>,
    _auth: AuthUser,
    Query(filter): Query<JobFilterQuery>,
) -> Result<impl IntoResponse, AppError> {
    let limit = filter.limit.unwrap_or(20).clamp(1, 100);
    let offset = filter.offset.unwrap_or(0).max(0);

    let search_pattern = filter
        .search
        .as_ref()
        .map(|s| format!("%{}%", s.trim().to_lowercase()));
    let category_param = filter.category.as_ref().map(|s| s.trim().to_uppercase());
    let location_param = filter
        .location_type
        .as_ref()
        .map(|s| s.trim().to_uppercase());
    let dept_param = filter
        .department
        .as_ref()
        .map(|s| format!("%{}%", s.trim().to_lowercase()));
    let status_param = filter
        .status
        .as_ref()
        .map(|s| s.trim().to_uppercase())
        .unwrap_or_else(|| "OPEN".to_string());

    validation::choice(&status_param, "status", validation::JOB_STATUSES)?;
    if let Some(category) = &category_param {
        validation::choice(category, "category", validation::CATEGORIES)?;
    }
    if let Some(location) = &location_param {
        validation::choice(location, "location_type", validation::LOCATIONS)?;
    }
    validation::optional_text(&filter.search, "Search", 200)?;
    validation::optional_text(&filter.department, "Department", 200)?;
    let jobs = sqlx::query_as::<_, JobWithPosterDto>(
        r#"
        SELECT 
            j.id, j.title, j.description, j.category, j.location_type, j.location,
            j.stipend, j.skills_required, j.department, j.status, j.deadline,
            j.creator_id, u.name AS creator_name, u.department AS creator_department,
            u.roll_number AS creator_roll_number,
            (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applications_count,
            j.created_at
        FROM jobs j
        JOIN users u ON j.creator_id = u.id
        WHERE (? IS NULL OR j.status = ?)
          AND (? IS NULL OR (LOWER(j.title) LIKE ? OR LOWER(j.description) LIKE ? OR LOWER(COALESCE(j.skills_required, '')) LIKE ?))
          AND (? IS NULL OR j.category = ?)
          AND (? IS NULL OR j.location_type = ?)
          AND (? IS NULL OR LOWER(COALESCE(j.department, '')) LIKE ?)
        ORDER BY j.created_at DESC, j.id DESC
        LIMIT ? OFFSET ?
        "#,
    )
    .bind(&status_param)
    .bind(&status_param)
    .bind(&search_pattern)
    .bind(&search_pattern)
    .bind(&search_pattern)
    .bind(&search_pattern)
    .bind(&category_param)
    .bind(&category_param)
    .bind(&location_param)
    .bind(&location_param)
    .bind(&dept_param)
    .bind(&dept_param)
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db)
    .await
    .map_err(AppError::from)?;

    Ok(Json(jobs))
}

pub async fn get_job_by_id(
    State(state): State<AppState>,
    _auth: AuthUser,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let job = sqlx::query_as::<_, JobWithPosterDto>(
        r#"
        SELECT 
            j.id, j.title, j.description, j.category, j.location_type, j.location,
            j.stipend, j.skills_required, j.department, j.status, j.deadline,
            j.creator_id, u.name AS creator_name, u.department AS creator_department,
            u.roll_number AS creator_roll_number,
            (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applications_count,
            j.created_at
        FROM jobs j
        JOIN users u ON j.creator_id = u.id
        WHERE j.id = ?
        "#,
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await
    .map_err(AppError::from)?
    .ok_or_else(|| AppError(StatusCode::NOT_FOUND, "Job posting not found".to_string()))?;

    Ok(Json(job))
}

pub async fn update_job(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<UpdateJobDto>,
) -> Result<impl IntoResponse, AppError> {
    let mut transaction = state.db.begin_with("BEGIN IMMEDIATE").await?;
    let job = sqlx::query_as::<_, Job>("SELECT * FROM jobs WHERE id = ?")
        .bind(&id)
        .fetch_optional(&mut *transaction)
        .await
        .map_err(AppError::from)?
        .ok_or_else(|| AppError(StatusCode::NOT_FOUND, "Job posting not found".to_string()))?;

    if job.creator_id != auth.id {
        return Err(AppError(
            StatusCode::FORBIDDEN,
            "Only the job creator can modify this posting".to_string(),
        ));
    }

    let title = payload.title.unwrap_or(job.title);
    let description = payload.description.unwrap_or(job.description);
    let category = payload.category.unwrap_or(job.category);
    let location_type = payload.location_type.unwrap_or(job.location_type);
    let location = payload.location.unwrap_or(job.location);
    let stipend = payload.stipend.unwrap_or(job.stipend);
    let skills_required = payload.skills_required.unwrap_or(job.skills_required);
    let department = payload.department.unwrap_or(job.department);
    let status = payload.status.unwrap_or(job.status);
    let deadline = payload.deadline.unwrap_or(job.deadline);
    validate_job_fields(
        &title,
        &description,
        &category,
        &location_type,
        &status,
        &deadline,
    )?;
    validate_optional_fields(&location, &stipend, &skills_required, &department)?;
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        r#"
        UPDATE jobs SET
            title = ?, description = ?, category = ?, location_type = ?,
            location = ?, stipend = ?, skills_required = ?, department = ?,
            status = ?, deadline = ?, updated_at = ?
        WHERE id = ?
        "#,
    )
    .bind(title.trim())
    .bind(description.trim())
    .bind(&category)
    .bind(&location_type)
    .bind(&location)
    .bind(&stipend)
    .bind(&skills_required)
    .bind(&department)
    .bind(&status)
    .bind(&deadline)
    .bind(&now)
    .bind(&id)
    .execute(&mut *transaction)
    .await
    .map_err(AppError::from)?;

    let updated = sqlx::query_as::<_, Job>("SELECT * FROM jobs WHERE id = ?")
        .bind(&id)
        .fetch_one(&mut *transaction)
        .await
        .map_err(AppError::from)?;

    transaction.commit().await?;
    Ok(Json(updated))
}

pub async fn update_job_status(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<UpdateJobStatusDto>,
) -> Result<impl IntoResponse, AppError> {
    let mut transaction = state.db.begin_with("BEGIN IMMEDIATE").await?;
    let job = sqlx::query_as::<_, Job>("SELECT * FROM jobs WHERE id = ?")
        .bind(&id)
        .fetch_optional(&mut *transaction)
        .await
        .map_err(AppError::from)?
        .ok_or_else(|| AppError(StatusCode::NOT_FOUND, "Job posting not found".to_string()))?;

    if job.creator_id != auth.id {
        return Err(AppError(
            StatusCode::FORBIDDEN,
            "Only the job creator can toggle or update this job's status".to_string(),
        ));
    }

    if let Some(status) = &payload.status {
        validation::choice(status, "status", validation::JOB_STATUSES)?;
    }
    let now = Utc::now().to_rfc3339();
    sqlx::query("UPDATE jobs SET status = COALESCE(?, CASE status WHEN 'OPEN' THEN 'CLOSED' ELSE 'OPEN' END), updated_at = ? WHERE id = ?")
        .bind(&payload.status)
        .bind(&now)
        .bind(&id)
        .execute(&mut *transaction)
        .await
        .map_err(AppError::from)?;

    let updated = sqlx::query_as::<_, Job>("SELECT * FROM jobs WHERE id = ?")
        .bind(&id)
        .fetch_one(&mut *transaction)
        .await
        .map_err(AppError::from)?;

    transaction.commit().await?;
    Ok(Json(json!({
        "message": format!("Job status changed to {}", updated.status),
        "job": updated
    })))
}

pub async fn delete_job(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let mut transaction = state.db.begin_with("BEGIN IMMEDIATE").await?;
    let job = sqlx::query_as::<_, Job>("SELECT * FROM jobs WHERE id = ?")
        .bind(&id)
        .fetch_optional(&mut *transaction)
        .await
        .map_err(AppError::from)?
        .ok_or_else(|| AppError(StatusCode::NOT_FOUND, "Job posting not found".to_string()))?;

    if job.creator_id != auth.id {
        return Err(AppError(
            StatusCode::FORBIDDEN,
            "Only the creator can delete this job posting".to_string(),
        ));
    }

    sqlx::query("DELETE FROM jobs WHERE id = ?")
        .bind(&id)
        .execute(&mut *transaction)
        .await
        .map_err(AppError::from)?;

    transaction.commit().await?;
    Ok(Json(
        json!({ "message": "Job deleted successfully", "id": id }),
    ))
}

pub async fn get_my_posted_jobs(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(page): Query<Pagination>,
) -> Result<impl IntoResponse, AppError> {
    let (limit, offset) = page.bounds();
    let jobs = sqlx::query_as::<_, JobWithPosterDto>(
        r#"
        SELECT 
            j.id, j.title, j.description, j.category, j.location_type, j.location,
            j.stipend, j.skills_required, j.department, j.status, j.deadline,
            j.creator_id, u.name AS creator_name, u.department AS creator_department,
            u.roll_number AS creator_roll_number,
            (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applications_count,
            j.created_at
        FROM jobs j
        JOIN users u ON j.creator_id = u.id
        WHERE j.creator_id = ?
        ORDER BY j.created_at DESC, j.id DESC
        LIMIT ? OFFSET ?
        "#,
    )
    .bind(&auth.id)
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db)
    .await
    .map_err(AppError::from)?;

    Ok(Json(jobs))
}

fn validate_job_fields(
    title: &str,
    description: &str,
    category: &str,
    location: &str,
    status: &str,
    deadline: &Option<String>,
) -> Result<(), AppError> {
    validation::text(title, "Title", 200)?;
    validation::text(description, "Description", 20_000)?;
    validation::choice(category, "category", validation::CATEGORIES)?;
    validation::choice(location, "location_type", validation::LOCATIONS)?;
    validation::choice(status, "status", validation::JOB_STATUSES)?;
    validation::deadline(deadline)
}
fn validate_optional_fields(
    location: &Option<String>,
    stipend: &Option<String>,
    skills: &Option<String>,
    department: &Option<String>,
) -> Result<(), AppError> {
    validation::optional_text(location, "Location", 500)?;
    validation::optional_text(stipend, "Stipend", 500)?;
    validation::optional_text(skills, "Skills", 2000)?;
    validation::optional_text(department, "Department", 200)
}
