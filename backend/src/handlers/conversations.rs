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
        conversation::{
            Conversation, ConversationSummaryDto, JobDmSummaryDto, MessageWithSenderDto,
            SendMessageDto,
        },
        job::Job,
    },
};

pub async fn get_or_create_conversation_for_job(
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

    if job.creator_id == auth.id {
        return Err(AppError(
            StatusCode::BAD_REQUEST,
            "You cannot start an inquiry conversation with yourself on your own job".to_string(),
        ));
    }

    let existing = sqlx::query_as::<_, Conversation>(
        "SELECT * FROM conversations WHERE job_id = ? AND student_id = ?"
    )
    .bind(&job_id)
    .bind(&auth.id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if let Some(conv) = existing {
        return Ok(Json(conv));
    }

    if job.status == "CLOSED" {
        return Err(AppError(
            StatusCode::BAD_REQUEST,
            "This job thread is closed because the owner marked the job as completed. New inquiry DMs are locked.".to_string(),
        ));
    }

    let conv_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        r#"
        INSERT INTO conversations (id, job_id, student_id, owner_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&conv_id)
    .bind(&job_id)
    .bind(&auth.id)
    .bind(&job.creator_id)
    .bind(&now)
    .bind(&now)
    .execute(&state.db)
    .await
    .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let created = sqlx::query_as::<_, Conversation>("SELECT * FROM conversations WHERE id = ?")
        .bind(&conv_id)
        .fetch_one(&state.db)
        .await
        .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(created))
}

/// Fetch all student DM threads specifically for a given job (Job Owner view)
pub async fn get_job_conversations(
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
            "Only the job creator can view all student DMs for this job".to_string(),
        ));
    }

    let dms = sqlx::query_as::<_, JobDmSummaryDto>(
        r#"
        SELECT 
            c.id, c.job_id,
            c.student_id, u.name AS student_name,
            u.roll_number AS student_roll_number,
            u.department AS student_department,
            (SELECT m.content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
            (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_time,
            (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != ? AND m.is_read = 0) AS unread_count,
            c.updated_at
        FROM conversations c
        JOIN users u ON c.student_id = u.id
        WHERE c.job_id = ?
        ORDER BY c.updated_at DESC
        "#,
    )
    .bind(&auth.id)
    .bind(&job_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(dms))
}

pub async fn get_user_conversations(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    let conversations = sqlx::query_as::<_, ConversationSummaryDto>(
        r#"
        SELECT 
            c.id, c.job_id, j.title AS job_title,
            c.student_id, us.name AS student_name,
            c.owner_id, uo.name AS owner_name,
            (SELECT m.content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
            (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_time,
            (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != ? AND m.is_read = 0) AS unread_count,
            c.updated_at
        FROM conversations c
        JOIN jobs j ON c.job_id = j.id
        JOIN users us ON c.student_id = us.id
        JOIN users uo ON c.owner_id = uo.id
        WHERE c.student_id = ? OR c.owner_id = ?
        ORDER BY c.updated_at DESC
        "#,
    )
    .bind(&auth.id)
    .bind(&auth.id)
    .bind(&auth.id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(conversations))
}

pub async fn get_conversation_messages(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(conv_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let conv = sqlx::query_as::<_, Conversation>("SELECT * FROM conversations WHERE id = ?")
        .bind(&conv_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or_else(|| AppError(StatusCode::NOT_FOUND, "Conversation not found".to_string()))?;

    if conv.student_id != auth.id && conv.owner_id != auth.id {
        return Err(AppError(
            StatusCode::FORBIDDEN,
            "You are not a participant in this conversation".to_string(),
        ));
    }

    // Mark unread messages sent to the current user as read
    let _ = sqlx::query(
        "UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ?"
    )
    .bind(&conv_id)
    .bind(&auth.id)
    .execute(&state.db)
    .await;

    let messages = sqlx::query_as::<_, MessageWithSenderDto>(
        r#"
        SELECT 
            m.id, m.conversation_id, m.sender_id,
            u.name AS sender_name, u.roll_number AS sender_roll_number,
            m.content, m.is_read, m.created_at
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = ?
        ORDER BY m.created_at ASC
        "#,
    )
    .bind(&conv_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(messages))
}

pub async fn send_message(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(conv_id): Path<String>,
    Json(payload): Json<SendMessageDto>,
) -> Result<impl IntoResponse, AppError> {
    let content = payload.content.trim();
    if content.is_empty() {
        return Err(AppError(
            StatusCode::BAD_REQUEST,
            "Message content cannot be empty".to_string(),
        ));
    }

    let conv = sqlx::query_as::<_, Conversation>("SELECT * FROM conversations WHERE id = ?")
        .bind(&conv_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or_else(|| AppError(StatusCode::NOT_FOUND, "Conversation not found".to_string()))?;

    if conv.student_id != auth.id && conv.owner_id != auth.id {
        return Err(AppError(
            StatusCode::FORBIDDEN,
            "You are not a participant in this conversation".to_string(),
        ));
    }

    let msg_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        r#"
        INSERT INTO messages (id, conversation_id, sender_id, content, is_read, created_at)
        VALUES (?, ?, ?, ?, 0, ?)
        "#,
    )
    .bind(&msg_id)
    .bind(&conv_id)
    .bind(&auth.id)
    .bind(content)
    .bind(&now)
    .execute(&state.db)
    .await
    .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    sqlx::query("UPDATE conversations SET updated_at = ? WHERE id = ?")
        .bind(&now)
        .bind(&conv_id)
        .execute(&state.db)
        .await
        .map_err(|e| AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let message_dto = MessageWithSenderDto {
        id: msg_id,
        conversation_id: conv_id.clone(),
        sender_id: auth.id.clone(),
        sender_name: auth.name.clone(),
        sender_roll_number: auth.roll_number.clone(),
        content: content.to_string(),
        is_read: 0,
        created_at: now,
    };

    // Broadcast message via Tokio broadcast channel for real-time WebSocket clients
    let broadcast_payload = json!({
        "event": "new_message",
        "conversation_id": conv_id,
        "message": message_dto
    })
    .to_string();

    let _ = state.tx.send(broadcast_payload);

    Ok((StatusCode::CREATED, Json(message_dto)))
}
