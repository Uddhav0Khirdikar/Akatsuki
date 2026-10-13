use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Application {
    pub id: String,
    pub job_id: String,
    pub applicant_id: String,
    pub pitch_note: String,
    pub resume_url: Option<String>,
    pub status: String, // PENDING, SHORTLISTED, ACCEPTED, REJECTED
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateApplicationDto {
    pub pitch_note: String,
    pub resume_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateApplicationStatusDto {
    pub status: String,
}

#[derive(Debug, Serialize, FromRow)]
pub struct ApplicationWithApplicantDto {
    pub id: String,
    pub job_id: String,
    pub applicant_id: String,
    pub applicant_name: String,
    pub applicant_email: String,
    pub applicant_roll_number: String,
    pub applicant_department: String,
    pub applicant_graduation_year: i64,
    pub pitch_note: String,
    pub resume_url: Option<String>,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, FromRow)]
pub struct StudentApplicationWithJobDto {
    pub id: String,
    pub job_id: String,
    pub job_title: String,
    pub job_category: String,
    pub job_stipend: Option<String>,
    pub job_status: String,
    pub pitch_note: String,
    pub resume_url: Option<String>,
    pub status: String,
    pub created_at: String,
}
