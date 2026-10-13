use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Job {
    pub id: String,
    pub title: String,
    pub description: String,
    pub category: String,       // INTERNSHIP, PART_TIME, RESEARCH_ASSISTANT, PROJECT_COLLAB, CAMPUS_GIG, TUTORING
    pub location_type: String,  // ON_CAMPUS, REMOTE, HYBRID
    pub location: Option<String>,
    pub stipend: Option<String>,
    pub skills_required: Option<String>,
    pub department: Option<String>,
    pub status: String,         // OPEN, CLOSED
    pub deadline: Option<String>,
    pub creator_id: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateJobDto {
    pub title: String,
    pub description: String,
    pub category: Option<String>,
    pub location_type: Option<String>,
    pub location: Option<String>,
    pub stipend: Option<String>,
    pub skills_required: Option<String>,
    pub department: Option<String>,
    pub deadline: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateJobDto {
    pub title: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub location_type: Option<String>,
    pub location: Option<String>,
    pub stipend: Option<String>,
    pub skills_required: Option<String>,
    pub department: Option<String>,
    pub status: Option<String>,
    pub deadline: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateJobStatusDto {
    pub status: Option<String>, // "OPEN" or "CLOSED" (like GitHub Issues)
}

#[derive(Debug, Deserialize)]
pub struct JobFilterQuery {
    pub search: Option<String>,
    pub category: Option<String>,
    pub location_type: Option<String>,
    pub department: Option<String>,
    pub status: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct JobWithPosterDto {
    pub id: String,
    pub title: String,
    pub description: String,
    pub category: String,
    pub location_type: String,
    pub location: Option<String>,
    pub stipend: Option<String>,
    pub skills_required: Option<String>,
    pub department: Option<String>,
    pub status: String,
    pub deadline: Option<String>,
    pub creator_id: String,
    pub creator_name: String,
    pub creator_department: String,
    pub creator_roll_number: String,
    pub applications_count: i64,
    pub created_at: String,
}
