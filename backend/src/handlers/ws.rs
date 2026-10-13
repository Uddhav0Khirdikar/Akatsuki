use crate::{
    handlers::auth::AppState,
    middleware::auth::{authenticate, AppError},
};
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Query, State,
    },
    http::{header, HeaderMap, StatusCode},
    response::IntoResponse,
};
use serde::Deserialize;
use serde_json::json;

#[derive(Clone, Debug)]
pub struct RealtimeEvent {
    pub recipients: [String; 2],
    pub payload: String,
}
impl RealtimeEvent {
    pub fn visible_to(&self, user_id: &str) -> bool {
        self.recipients.iter().any(|recipient| recipient == user_id)
    }
}

#[derive(Deserialize)]
pub struct WsAuthQuery {
    pub token: Option<String>,
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    Query(query): Query<WsAuthQuery>,
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<impl IntoResponse, AppError> {
    if let Some(origin) = headers.get(header::ORIGIN) {
        if !state.config.allowed_origins.contains(origin) {
            return Err(AppError(
                StatusCode::FORBIDDEN,
                "Origin is not allowed".into(),
            ));
        }
    }
    let token = headers
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "))
        .or(query.token.as_deref())
        .unwrap_or("");
    let (user, expiry) = authenticate(&state, token).await?;
    Ok(ws
        .max_message_size(4096)
        .max_frame_size(4096)
        .on_upgrade(move |socket| handle_socket(socket, state, user.id, expiry)))
}

async fn send(socket: &mut WebSocket, payload: String) -> bool {
    matches!(
        tokio::time::timeout(
            std::time::Duration::from_secs(5),
            socket.send(Message::Text(payload))
        )
        .await,
        Ok(Ok(()))
    )
}

async fn handle_socket(mut socket: WebSocket, state: AppState, user_id: String, expiry: usize) {
    let mut rx = state.tx.subscribe();
    if !send(
        &mut socket,
        json!({"event": "connected", "user_id": user_id}).to_string(),
    )
    .await
    {
        return;
    }
    let remaining = std::time::UNIX_EPOCH
        .checked_add(std::time::Duration::from_secs(expiry as u64))
        .and_then(|expiry| expiry.duration_since(std::time::SystemTime::now()).ok())
        .unwrap_or_default();
    let deadline = tokio::time::sleep(remaining);
    tokio::pin!(deadline);
    let mut last_typing = tokio::time::Instant::now() - std::time::Duration::from_secs(1);
    loop {
        if chrono::Utc::now().timestamp() >= expiry as i64 {
            let _ = socket.send(Message::Close(None)).await;
            break;
        }
        tokio::select! {
            biased;
            _ = &mut deadline => { let _ = socket.send(Message::Close(None)).await; break; }
            event = rx.recv() => {
                match event {
                    Ok(event) if event.visible_to(&user_id) => {
                        if !send(&mut socket, event.payload).await { break; }
                    }
                    Ok(_) => {}
                    Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => {
                        if !send(&mut socket, json!({"event": "resync_required"}).to_string()).await { break; }
                    }
                    Err(tokio::sync::broadcast::error::RecvError::Closed) => break,
                }
            }
            message = socket.recv() => {
                match message {
                    Some(Ok(Message::Text(text))) => {
                        let Ok(value) = serde_json::from_str::<serde_json::Value>(&text) else { continue; };
                        if value.get("event").and_then(|e| e.as_str()) != Some("typing") { continue; }
                        let Some(conv_id) = value.get("conversation_id").and_then(|v| v.as_str()) else { continue; };
                        let Some(is_typing) = value.get("is_typing").and_then(|v| v.as_bool()) else { continue; };
                        if conv_id.len() > 100 || last_typing.elapsed() < std::time::Duration::from_millis(200) { continue; }
                        last_typing = tokio::time::Instant::now();
                        let participants = sqlx::query_as::<_, (String, String)>(
                            "SELECT student_id, owner_id FROM conversations WHERE id = ? AND (student_id = ? OR owner_id = ?)")
                            .bind(conv_id).bind(&user_id).bind(&user_id).fetch_optional(&state.db).await;
                        match participants {
                            Ok(Some((student, owner))) => {
                                let _ = state.tx.send(RealtimeEvent { recipients: [student, owner], payload: json!({
                                    "event": "user_typing", "conversation_id": conv_id,
                                    "user_id": user_id, "is_typing": is_typing,
                                }).to_string() });
                            }
                            Ok(None) => {}
                            Err(error) => { tracing::error!(%error, "Typing authorization failed"); break; }
                        }
                    }
                    Some(Ok(Message::Close(_))) | Some(Err(_)) | None => break,
                    _ => {}
                }
            }
        }
    }
}
