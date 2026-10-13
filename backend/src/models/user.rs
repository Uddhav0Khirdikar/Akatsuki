use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct User {
    pub id: String,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub erp_verified: i64,
    pub name: String,
    pub roll_number: String,
    pub department: String,
    pub graduation_year: i64,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
    pub resume_url: Option<String>,
    pub skills: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // user id
    pub email: String,
    pub roll_number: String,
    pub name: String,
    pub exp: usize, // expiration timestamp
}

#[derive(Debug, Deserialize)]
pub struct RegisterDto {
    pub email: String,
    pub password: String,
    pub name: String,
    pub roll_number: String,
    pub department: String,
    pub graduation_year: i64,
    pub bio: Option<String>,
    pub resume_url: Option<String>,
    pub skills: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LoginDto {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct ErpLoginDto {
    pub username: String, // ERP email or student username
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserDto,
}

#[derive(Debug, Serialize, FromRow, Clone)]
pub struct UserDto {
    pub id: String,
    pub erp_verified: bool,
    pub email: String,
    pub name: String,
    pub roll_number: String,
    pub department: String,
    pub graduation_year: i64,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
    pub resume_url: Option<String>,
    pub skills: Option<String>,
    pub created_at: String,
}

impl From<User> for UserDto {
    fn from(u: User) -> Self {
        UserDto {
            id: u.id,
            erp_verified: u.erp_verified == 1,
            email: u.email,
            name: u.name,
            roll_number: u.roll_number,
            department: u.department,
            graduation_year: u.graduation_year,
            bio: u.bio,
            avatar_url: u.avatar_url,
            resume_url: u.resume_url,
            skills: u.skills,
            created_at: u.created_at,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct ProfileStatsDto {
    pub user: UserDto,
    pub posted_jobs_count: i64,
    pub applications_count: i64,
    pub active_chats_count: i64,
}
