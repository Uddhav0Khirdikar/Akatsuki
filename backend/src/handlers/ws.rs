use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Query, State,
    },
    response::IntoResponse,
};
use futures_util::{SinkExt, StreamExt};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::Deserialize;
use serde_json::json;
use tracing::{error, info};

use crate::{
    handlers::auth::AppState,
    models::user::Claims,
};

#[derive(Debug, Deserialize)]
pub struct WsAuthQuery {
    pub token: Option<String>,
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    Query(query): Query<WsAuthQuery>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let token = query.token.unwrap_or_default();
    let token_data = match decode::<Claims>(
        &token,
        &DecodingKey::from_secret(state.config.jwt_secret.as_bytes()),
        &Validation::default(),
    ) {
        Ok(data) => data,
        Err(err) => {
            error!("WebSocket connection rejected: invalid JWT: {}", err);
            return (
                axum::http::StatusCode::UNAUTHORIZED,
                "Unauthorized: Invalid JWT token in query parameter",
            )
                .into_response();
        }
    };

    let user_id = token_data.claims.sub;
    let user_name = token_data.claims.name;

    ws.on_upgrade(move |socket| handle_socket(socket, state, user_id, user_name))
        .into_response()
}

async fn handle_socket(socket: WebSocket, state: AppState, user_id: String, user_name: String) {
    let (mut sender, mut receiver) = socket.split();
    let mut rx = state.tx.subscribe();

    info!("WebSocket connected for student: {} ({})", user_name, user_id);

    // Send initial welcome/ready frame
    let welcome = json!({
        "event": "connected",
        "user_id": user_id,
        "message": "Connected to Akatsuki real-time messaging server"
    })
    .to_string();

    let _ = sender.send(Message::Text(welcome)).await;

    // Task 1: Forward broadcast messages to this client
    let mut send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if sender.send(Message::Text(msg)).await.is_err() {
                break;
            }
        }
    });

    // Task 2: Process messages coming in from this client (e.g. typing indicators, pings)
    let tx = state.tx.clone();
    let user_id_clone = user_id.clone();
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                Message::Text(text) => {
                    if let Ok(val) = serde_json::from_str::<serde_json::Value>(&text) {
                        let event = val.get("event").and_then(|e| e.as_str()).unwrap_or("");
                        if event == "typing" {
                            let conv_id = val.get("conversation_id").and_then(|c| c.as_str()).unwrap_or("");
                            let is_typing = val.get("is_typing").and_then(|t| t.as_bool()).unwrap_or(true);
                            let broadcast_payload = json!({
                                "event": "user_typing",
                                "conversation_id": conv_id,
                                "user_id": user_id_clone,
                                "is_typing": is_typing
                            }).to_string();
                            let _ = tx.send(broadcast_payload);
                        }
                    }
                }
                Message::Ping(_) => {
                    // Axum handles pong automatically
                }
                Message::Close(_) => {
                    break;
                }
                _ => {}
            }
        }
    });

    // Wait until either task completes, then abort the other
    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    };

    info!("WebSocket disconnected for student: {}", user_id);
}
