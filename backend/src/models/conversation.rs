use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Conversation {
    pub id: String,
    pub job_id: String,
    pub student_id: String,
    pub owner_id: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct SendMessageDto {
    pub content: String,
}

#[derive(Debug, Serialize, FromRow)]
pub struct MessageWithSenderDto {
    pub id: String,
    pub conversation_id: String,
    pub sender_id: String,
    pub sender_name: String,
    pub sender_roll_number: String,
    pub content: String,
    pub is_read: i64,
    pub created_at: String,
}

#[derive(Debug, Serialize, FromRow)]
pub struct ConversationSummaryDto {
    pub id: String,
    pub job_id: String,
    pub job_title: String,
    pub student_id: String,
    pub student_name: String,
    pub owner_id: String,
    pub owner_name: String,
    pub last_message: Option<String>,
    pub last_message_time: Option<String>,
    pub unread_count: i64,
    pub updated_at: String,
}

#[derive(Debug, Serialize, FromRow)]
pub struct JobDmSummaryDto {
    pub id: String, // conversation_id
    pub job_id: String,
    pub student_id: String,
    pub student_name: String,
    pub student_roll_number: String,
    pub student_department: String,
    pub last_message: Option<String>,
    pub last_message_time: Option<String>,
    pub unread_count: i64,
    pub updated_at: String,
}
