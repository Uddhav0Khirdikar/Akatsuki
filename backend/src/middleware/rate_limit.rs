use crate::{handlers::auth::AppState, middleware::auth::AppError};
use axum::{
    extract::{ConnectInfo, Request, State},
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
};
use std::{
    collections::HashMap,
    net::{IpAddr, SocketAddr},
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};

#[derive(Clone, Default)]
pub struct RateLimiter(Arc<Mutex<HashMap<IpAddr, (Instant, u32)>>>);
impl RateLimiter {
    pub fn allow(&self, ip: IpAddr) -> bool {
        let now = Instant::now();
        let mut entries = self.0.lock().unwrap_or_else(|e| e.into_inner());
        entries.retain(|_, (start, _)| now.duration_since(*start) < Duration::from_secs(60));
        if entries.len() >= 10_000 && !entries.contains_key(&ip) {
            return false;
        }
        let entry = entries.entry(ip).or_insert((now, 0));
        if entry.1 >= 20 {
            return false;
        }
        entry.1 += 1;
        true
    }
}

pub async fn authentication_limit(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Response {
    // Use the actual peer address. Forwarded headers are untrusted without a trusted proxy policy.
    let Some(peer) = request.extensions().get::<ConnectInfo<SocketAddr>>() else {
        return AppError(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Missing peer address".into(),
        )
        .into_response();
    };
    if !state.rate_limiter.allow(peer.0.ip()) {
        let mut response = AppError(
            StatusCode::TOO_MANY_REQUESTS,
            "Too many login attempts; retry in a minute".into(),
        )
        .into_response();
        response
            .headers_mut()
            .insert("retry-after", "60".parse().unwrap());
        return response;
    }
    next.run(request).await
}
