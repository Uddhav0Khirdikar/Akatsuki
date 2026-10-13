use super::*;
use axum::response::IntoResponse;
use axum::{
    body::{to_bytes, Body},
    extract::{ConnectInfo, Form},
    http::{Request, StatusCode},
};
use futures_util::{SinkExt, StreamExt};
use jsonwebtoken::{encode, EncodingKey, Header};
use serde_json::{json, Value};
use std::{collections::HashMap, net::SocketAddr};
use tower::ServiceExt;

struct Fixture {
    state: AppState,
    path: std::path::PathBuf,
}
impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = std::fs::remove_file(&self.path);
        let _ = std::fs::remove_file(format!("{}-wal", self.path.display()));
        let _ = std::fs::remove_file(format!("{}-shm", self.path.display()));
    }
}
impl Fixture {
    async fn new() -> Self {
        let path = std::env::temp_dir().join(format!("akatsuki-test-{}.db", Uuid::new_v4()));
        let db = init_db(&format!("sqlite://{}", path.display()))
            .await
            .unwrap();
        let state = AppState {
            db,
            config: Config {
                port: 0,
                database_url: format!("sqlite://{}", path.display()),
                jwt_secret: "test-only-secret-key-at-least-32-bytes".into(),
                allowed_email_domains: vec!["mit.asia".into()],
                enforce_college_domain: true,
                erp_base_url: "https://erp.mit.asia".into(),
                allow_local_auth: false,
                seed_demo_data: false,
                allowed_origins: vec!["http://localhost:3000".parse().unwrap()],
            },
            tx: broadcast::channel(32).0,
            auth_slots: Arc::new(tokio::sync::Semaphore::new(4)),
            rate_limiter: Default::default(),
        };
        for id in ["owner", "student", "outsider"] {
            sqlx::query("INSERT INTO users (id,email,password_hash,name,roll_number,department,graduation_year,created_at,updated_at,erp_verified) VALUES (?,?,'',?,?,'CS',0,?, ?,1)")
                .bind(id).bind(format!("{id}@mit.asia")).bind(id).bind(id.to_uppercase())
                .bind(Utc::now().to_rfc3339()).bind(Utc::now().to_rfc3339()).execute(&state.db).await.unwrap();
        }
        Self { state, path }
    }
    fn token(&self, id: &str, expiry: i64) -> String {
        encode(
            &Header::default(),
            &models::user::Claims {
                sub: id.into(),
                email: format!("{id}@mit.asia"),
                roll_number: "STALE-ROLL".into(),
                name: "stale-name".into(),
                exp: expiry as usize,
            },
            &EncodingKey::from_secret(self.state.config.jwt_secret.as_bytes()),
        )
        .unwrap()
    }
    async fn call(
        &self,
        method: &str,
        path: &str,
        id: Option<&str>,
        payload: Option<Value>,
    ) -> (StatusCode, Value) {
        let mut builder = Request::builder()
            .method(method)
            .uri(path)
            .header("content-type", "application/json")
            .extension(ConnectInfo(SocketAddr::from(([127, 0, 0, 1], 12345))));
        if let Some(id) = id {
            builder = builder.header(
                "authorization",
                format!("Bearer {}", self.token(id, Utc::now().timestamp() + 3600)),
            );
        }
        let request = builder
            .body(Body::from(
                payload.map(|v| v.to_string()).unwrap_or_default(),
            ))
            .unwrap();
        let response = build_router(self.state.clone())
            .oneshot(request)
            .await
            .unwrap();
        let status = response.status();
        let body = to_bytes(response.into_body(), 1024 * 1024).await.unwrap();
        (
            status,
            serde_json::from_slice(&body)
                .unwrap_or_else(|_| json!({"raw": String::from_utf8_lossy(&body)})),
        )
    }
    async fn job(&self) -> String {
        let (status, body) = self
            .call(
                "POST",
                "/api/jobs",
                Some("owner"),
                Some(json!({"title":"Campus role", "description":"Build our campus project"})),
            )
            .await;
        assert_eq!(status, StatusCode::CREATED, "{body}");
        body["id"].as_str().unwrap().into()
    }
    async fn conversation(&self, job: &str) -> String {
        let (status, body) = self
            .call(
                "POST",
                &format!("/api/conversations/job/{job}"),
                Some("student"),
                None,
            )
            .await;
        assert_eq!(status, StatusCode::OK, "{body}");
        body["id"].as_str().unwrap().into()
    }
}

#[tokio::test]
async fn campus_access_requires_live_verified_identity() {
    let f = Fixture::new().await;
    assert_eq!(
        f.call("GET", "/api/jobs", None, None).await.0,
        StatusCode::UNAUTHORIZED
    );
    assert_eq!(
        f.call("GET", "/api/auth/me", Some("missing"), None).await.0,
        StatusCode::UNAUTHORIZED
    );
    sqlx::query("UPDATE users SET erp_verified=0 WHERE id='student'")
        .execute(&f.state.db)
        .await
        .unwrap();
    assert_eq!(
        f.call("GET", "/api/jobs", Some("student"), None).await.0,
        StatusCode::FORBIDDEN
    );
    assert_eq!(
        f.call("GET", "/api/jobs", Some("owner"), None).await.0,
        StatusCode::OK
    );
    let request = Request::builder()
        .uri("/api/auth/me")
        .header(
            "authorization",
            format!("Bearer {}", f.token("owner", Utc::now().timestamp() - 1)),
        )
        .body(Body::empty())
        .unwrap();
    assert_eq!(
        build_router(f.state.clone())
            .oneshot(request)
            .await
            .unwrap()
            .status(),
        StatusCode::UNAUTHORIZED
    );
}

#[tokio::test]
async fn production_disables_local_identity_creation() {
    let f = Fixture::new().await;
    assert_eq!(f.call("POST", "/api/auth/register", None, Some(json!({"email":"fake@mit.asia", "password":"password123", "name":"Fake", "roll_number":"FAKE", "department":"CS", "graduation_year":2027}))).await.0,StatusCode::FORBIDDEN);
    assert_eq!(
        f.call(
            "POST",
            "/api/auth/login",
            None,
            Some(json!({"email":"owner@mit.asia", "password":"college123"}))
        )
        .await
        .0,
        StatusCode::FORBIDDEN
    );
}

#[tokio::test]
async fn jobs_validate_all_write_paths_and_status_never_toggles_on_invalid_input() {
    let f = Fixture::new().await;
    for extra in [
        json!({"category":"UNKNOWN"}),
        json!({"location_type":"UNKNOWN"}),
        json!({"deadline":"2026-02-30"}),
    ] {
        let mut body = json!({"title":"Role", "description":"Description"});
        body.as_object_mut()
            .unwrap()
            .extend(extra.as_object().unwrap().clone());
        assert_eq!(
            f.call("POST", "/api/jobs", Some("owner"), Some(body))
                .await
                .0,
            StatusCode::BAD_REQUEST
        );
    }
    let job = f.job().await;
    for payload in [
        json!({"title":" "}),
        json!({"status":"FILLED"}),
        json!({"category":"UNKNOWN"}),
    ] {
        assert_eq!(
            f.call(
                "PUT",
                &format!("/api/jobs/{job}"),
                Some("owner"),
                Some(payload)
            )
            .await
            .0,
            StatusCode::BAD_REQUEST
        );
    }
    assert_eq!(
        f.call(
            "PATCH",
            &format!("/api/jobs/{job}/status"),
            Some("owner"),
            Some(json!({"status":"TYPO"}))
        )
        .await
        .0,
        StatusCode::BAD_REQUEST
    );
    assert_eq!(
        f.call("GET", &format!("/api/jobs/{job}"), Some("owner"), None)
            .await
            .1["status"],
        "OPEN"
    );
    assert_eq!(
        f.call("GET", "/api/jobs?category=UNKNOWN", Some("owner"), None)
            .await
            .0,
        StatusCode::BAD_REQUEST
    );
}

#[tokio::test]
async fn owners_and_conversation_participants_are_isolated() {
    let f = Fixture::new().await;
    let job = f.job().await;
    let conv = f.conversation(&job).await;
    for (method, path, payload) in [
        ("DELETE", format!("/api/jobs/{job}"), None),
        (
            "PATCH",
            format!("/api/jobs/{job}/status"),
            Some(json!({"status":"CLOSED"})),
        ),
        ("GET", format!("/api/jobs/{job}/applications"), None),
        ("GET", format!("/api/jobs/{job}/conversations"), None),
        ("GET", format!("/api/conversations/{conv}/messages"), None),
        (
            "POST",
            format!("/api/conversations/{conv}/messages"),
            Some(json!({"content":"Intrusion"})),
        ),
    ] {
        assert_eq!(
            f.call(method, &path, Some("outsider"), payload).await.0,
            StatusCode::FORBIDDEN
        );
    }
    assert_eq!(
        f.call(
            "POST",
            &format!("/api/jobs/{job}/apply"),
            Some("owner"),
            Some(json!({"pitch_note":"Self apply"}))
        )
        .await
        .0,
        StatusCode::BAD_REQUEST
    );
    assert_eq!(
        f.call(
            "POST",
            &format!("/api/conversations/job/{job}"),
            Some("owner"),
            None
        )
        .await
        .0,
        StatusCode::BAD_REQUEST
    );
    let (_, app) = f
        .call(
            "POST",
            &format!("/api/jobs/{job}/apply"),
            Some("student"),
            Some(json!({"pitch_note":"I can help"})),
        )
        .await;
    let status_path = format!("/api/applications/{}/status", app["id"].as_str().unwrap());
    assert_eq!(
        f.call(
            "PATCH",
            &status_path,
            Some("student"),
            Some(json!({"status":"ACCEPTED"}))
        )
        .await
        .0,
        StatusCode::FORBIDDEN
    );
    assert_eq!(
        f.call(
            "PATCH",
            &status_path,
            Some("owner"),
            Some(json!({"status":"ACCEPTED"}))
        )
        .await
        .0,
        StatusCode::OK
    );
}

#[tokio::test]
async fn closing_blocks_new_activity_and_preserves_existing_chats() {
    let f = Fixture::new().await;
    let job = f.job().await;
    let conv = f.conversation(&job).await;
    assert_eq!(
        f.call(
            "PATCH",
            &format!("/api/jobs/{job}/status"),
            Some("owner"),
            Some(json!({"status":"CLOSED"}))
        )
        .await
        .0,
        StatusCode::OK
    );
    assert_eq!(
        f.call(
            "POST",
            &format!("/api/conversations/job/{job}"),
            Some("student"),
            None
        )
        .await
        .1["id"],
        conv
    );
    assert_eq!(
        f.call(
            "POST",
            &format!("/api/conversations/job/{job}"),
            Some("outsider"),
            None
        )
        .await
        .0,
        StatusCode::BAD_REQUEST
    );
    assert_eq!(
        f.call(
            "POST",
            &format!("/api/jobs/{job}/apply"),
            Some("student"),
            Some(json!({"pitch_note":"Late"}))
        )
        .await
        .0,
        StatusCode::BAD_REQUEST
    );
    assert_eq!(
        f.call(
            "POST",
            &format!("/api/conversations/{conv}/messages"),
            Some("student"),
            Some(json!({"content":"Coordinate existing work"}))
        )
        .await
        .0,
        StatusCode::CREATED
    );
    f.call(
        "PATCH",
        &format!("/api/jobs/{job}/status"),
        Some("owner"),
        Some(json!({"status":"OPEN"})),
    )
    .await;
    assert_eq!(
        f.call(
            "POST",
            &format!("/api/jobs/{job}/apply"),
            Some("student"),
            Some(json!({"pitch_note":"Now open"}))
        )
        .await
        .0,
        StatusCode::CREATED
    );
}

#[tokio::test]
async fn concurrent_applications_and_conversations_are_consistent() {
    let f = Fixture::new().await;
    let job = f.job().await;
    let application_path = format!("/api/jobs/{job}/apply");
    let results = futures_util::future::join_all((0..8).map(|_| {
        f.call(
            "POST",
            &application_path,
            Some("student"),
            Some(json!({"pitch_note":"Apply"})),
        )
    }))
    .await;
    assert_eq!(
        results
            .iter()
            .filter(|r| r.0 == StatusCode::CREATED)
            .count(),
        1
    );
    assert!(results
        .iter()
        .all(|r| [StatusCode::CREATED, StatusCode::CONFLICT].contains(&r.0)));
    let path = format!("/api/conversations/job/{job}");
    let results = futures_util::future::join_all(
        (0..8).map(|_| f.call("POST", &path, Some("student"), None)),
    )
    .await;
    assert!(results
        .iter()
        .all(|r| r.0 == StatusCode::OK && r.1["id"] == results[0].1["id"]));
}

#[tokio::test]
async fn committed_close_wins_over_waiting_application() {
    let f = Fixture::new().await;
    let job = f.job().await;
    let mut tx = f.state.db.begin_with("BEGIN IMMEDIATE").await.unwrap();
    sqlx::query("UPDATE jobs SET status='CLOSED' WHERE id=?")
        .bind(&job)
        .execute(&mut *tx)
        .await
        .unwrap();
    let close = async {
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
        tx.commit().await.unwrap();
    };
    let path = format!("/api/jobs/{job}/apply");
    let (response, ()) = tokio::join!(
        f.call(
            "POST",
            &path,
            Some("student"),
            Some(json!({"pitch_note":"Concurrent"}))
        ),
        close
    );
    assert_eq!(response.0, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn database_guards_and_cascades_work_on_every_connection() {
    let f = Fixture::new().await;
    let job = f.job().await;
    let conv = f.conversation(&job).await;
    assert!(sqlx::query("INSERT INTO messages(id,conversation_id,sender_id,content,created_at) VALUES ('bad',?,'outsider','spoof','now')").bind(&conv).execute(&f.state.db).await.is_err());
    f.call(
        "POST",
        &format!("/api/conversations/{conv}/messages"),
        Some("student"),
        Some(json!({"content":"Hello"})),
    )
    .await;
    f.call(
        "POST",
        &format!("/api/jobs/{job}/apply"),
        Some("student"),
        Some(json!({"pitch_note":"Apply"})),
    )
    .await;
    assert_eq!(
        f.call("DELETE", &format!("/api/jobs/{job}"), Some("owner"), None)
            .await
            .0,
        StatusCode::OK
    );
    for table in ["applications", "conversations", "messages"] {
        let count: i64 = sqlx::query_scalar(&format!("SELECT count(*) FROM {table}"))
            .fetch_one(&f.state.db)
            .await
            .unwrap();
        assert_eq!(count, 0);
    }
    let mut connections = Vec::new();
    for _ in 0..5 {
        connections.push(f.state.db.acquire().await.unwrap());
    }
    for conn in &mut connections {
        let enabled: i64 = sqlx::query_scalar("PRAGMA foreign_keys")
            .fetch_one(&mut **conn)
            .await
            .unwrap();
        assert_eq!(enabled, 1);
    }
}

#[tokio::test]
async fn read_acknowledgements_cover_only_delivered_page() {
    let f = Fixture::new().await;
    let job = f.job().await;
    let conv = f.conversation(&job).await;
    for n in 0..3 {
        assert_eq!(
            f.call(
                "POST",
                &format!("/api/conversations/{conv}/messages"),
                Some("student"),
                Some(json!({"content":format!("Message {n}")}))
            )
            .await
            .0,
            StatusCode::CREATED
        );
    }
    let (_, inbox) = f
        .call("GET", "/api/conversations", Some("owner"), None)
        .await;
    assert_eq!(inbox[0]["unread_count"], 3);
    let (_, messages) = f
        .call(
            "GET",
            &format!("/api/conversations/{conv}/messages?limit=1"),
            Some("owner"),
            None,
        )
        .await;
    assert_eq!(messages.as_array().unwrap().len(), 1);
    assert_eq!(messages[0]["content"], "Message 2");
    assert_eq!(messages[0]["is_read"], 1);
    let (_, inbox) = f
        .call("GET", "/api/conversations", Some("owner"), None)
        .await;
    assert_eq!(inbox[0]["unread_count"], 2);
}

#[tokio::test]
async fn messages_are_persisted_before_private_events_and_use_current_profile() {
    let f = Fixture::new().await;
    let job = f.job().await;
    let conv = f.conversation(&job).await;
    let mut rx = f.state.tx.subscribe();
    let (status, message) = f
        .call(
            "POST",
            &format!("/api/conversations/{conv}/messages"),
            Some("student"),
            Some(json!({"content":"Hello"})),
        )
        .await;
    assert_eq!(status, StatusCode::CREATED);
    assert_eq!(message["sender_name"], "student");
    assert_eq!(message["sender_roll_number"], "STUDENT");
    let event = rx.recv().await.unwrap();
    assert!(event.visible_to("owner"));
    assert!(event.visible_to("student"));
    assert!(!event.visible_to("outsider"));
    let stored: String = sqlx::query_scalar("SELECT content FROM messages WHERE id=?")
        .bind(message["id"].as_str().unwrap())
        .fetch_one(&f.state.db)
        .await
        .unwrap();
    assert_eq!(stored, "Hello");
    assert_eq!(
        f.call(
            "POST",
            &format!("/api/conversations/{conv}/messages"),
            Some("student"),
            Some(json!({"content":"x".repeat(4001)}))
        )
        .await
        .0,
        StatusCode::BAD_REQUEST
    );
}

#[tokio::test]
async fn authentication_rate_limits_are_bounded() {
    let f = Fixture::new().await;
    for _ in 0..20 {
        assert_eq!(
            f.call(
                "POST",
                "/api/auth/login",
                None,
                Some(json!({"email":"unknown", "password":"nope"}))
            )
            .await
            .0,
            StatusCode::FORBIDDEN
        );
    }
    assert_eq!(
        f.call(
            "POST",
            "/api/auth/login",
            None,
            Some(json!({"email":"unknown", "password":"nope"}))
        )
        .await
        .0,
        StatusCode::TOO_MANY_REQUESTS
    );
    assert_eq!(
        f.call("GET", "/api/health", None, None).await.0,
        StatusCode::OK
    );
}

#[tokio::test]
async fn internal_errors_are_redacted() {
    let response = middleware::auth::AppError(
        StatusCode::INTERNAL_SERVER_ERROR,
        "SECRET database path and SQL".into(),
    )
    .into_response();
    let bytes = to_bytes(response.into_body(), 1024).await.unwrap();
    assert_eq!(
        serde_json::from_slice::<Value>(&bytes).unwrap(),
        json!({"error":"Internal server error"})
    );
}

async fn mock_erp() -> (String, tokio::task::JoinHandle<()>) {
    let app=Router::new().route("/j_spring_security_check",post(|Form(form):Form<HashMap<String,String>>|async move {
        if form.get("j_password").map(String::as_str)!=Some("real-test-password") { return (StatusCode::UNAUTHORIZED, ""); }
        (StatusCode::OK, "")
    })).route("/stu_getStudentDashboardDetails.json",get(||async { Json(json!({"profileDetails":{"rollNo":"ERP001", "firstName":"Official Student", "courseName":"Computer Science", "mobileNo":"private-phone"}})) }));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    let handle = tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });
    (format!("http://{addr}"), handle)
}

#[tokio::test]
async fn erp_has_no_magic_password_and_never_links_accounts_by_submitted_email() {
    let mut f = Fixture::new().await;
    let (base, server) = mock_erp().await;
    f.state.config.erp_base_url = base;
    for password in ["demo123", "college123"] {
        assert_eq!(
            f.call(
                "POST",
                "/api/auth/erp-login",
                None,
                Some(json!({"username":"owner@mit.asia", "password":password}))
            )
            .await
            .0,
            StatusCode::UNAUTHORIZED
        );
    }
    let (status, result) = f
        .call(
            "POST",
            "/api/auth/erp-login",
            None,
            Some(json!({"username":"owner@mit.asia", "password":"real-test-password"})),
        )
        .await;
    assert_eq!(status, StatusCode::OK, "{result}");
    assert_ne!(result["user"]["id"], "owner");
    assert_eq!(result["user"]["roll_number"], "ERP001");
    assert_eq!(result["user"]["email"], "erp001@mit.asia");
    assert!(result["user"]["bio"].is_null());
    assert_eq!(result["user"]["graduation_year"], 0);
    let hash: String =
        sqlx::query_scalar("SELECT password_hash FROM users WHERE roll_number='ERP001'")
            .fetch_one(&f.state.db)
            .await
            .unwrap();
    assert!(hash.is_empty());
    let (_, again) = f
        .call(
            "POST",
            "/api/auth/erp-login",
            None,
            Some(json!({"username":"other-address@mit.asia", "password":"real-test-password"})),
        )
        .await;
    assert_eq!(again["user"]["id"], result["user"]["id"]);
    server.abort();
}

#[tokio::test]
async fn erp_refuses_to_inherit_unverified_legacy_accounts() {
    let mut f = Fixture::new().await;
    let (base, server) = mock_erp().await;
    f.state.config.erp_base_url = base;
    sqlx::query("UPDATE users SET roll_number='ERP001',erp_verified=0 WHERE id='outsider'")
        .execute(&f.state.db)
        .await
        .unwrap();
    assert_eq!(
        f.call(
            "POST",
            "/api/auth/erp-login",
            None,
            Some(json!({"username":"student", "password":"real-test-password"}))
        )
        .await
        .0,
        StatusCode::CONFLICT
    );
    server.abort();
}

#[tokio::test]
async fn erp_failure_is_reported_as_unavailability() {
    let mut f = Fixture::new().await;
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    f.state.config.erp_base_url = format!("http://{}", listener.local_addr().unwrap());
    drop(listener);
    assert_eq!(
        f.call(
            "POST",
            "/api/auth/erp-login",
            None,
            Some(json!({"username":"student", "password":"some-password"}))
        )
        .await
        .0,
        StatusCode::SERVICE_UNAVAILABLE
    );
}

#[tokio::test]
async fn websocket_delivers_only_to_participants_and_rejects_spoofed_typing() {
    let f = Fixture::new().await;
    let job = f.job().await;
    let conv = f.conversation(&job).await;
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    let app = build_router(f.state.clone());
    let server = tokio::spawn(async move {
        axum::serve(
            listener,
            app.into_make_service_with_connect_info::<SocketAddr>(),
        )
        .await
        .unwrap();
    });
    let mut sockets = Vec::new();
    for id in ["owner", "student", "outsider"] {
        let (mut socket, _) = tokio_tungstenite::connect_async(format!(
            "ws://{addr}/ws?token={}",
            f.token(id, Utc::now().timestamp() + 60)
        ))
        .await
        .unwrap();
        socket.next().await.unwrap().unwrap();
        sockets.push(socket);
    }
    let spoof = json!({"event":"typing","conversation_id":conv,"is_typing":true}).to_string();
    sockets[2]
        .send(tokio_tungstenite::tungstenite::Message::Text(spoof.clone()))
        .await
        .unwrap();
    let mut rx = f.state.tx.subscribe();
    assert!(
        tokio::time::timeout(std::time::Duration::from_millis(150), rx.recv())
            .await
            .is_err()
    );
    sockets[1]
        .send(tokio_tungstenite::tungstenite::Message::Text(spoof))
        .await
        .unwrap();
    let frame = tokio::time::timeout(std::time::Duration::from_secs(2), sockets[0].next())
        .await
        .unwrap()
        .unwrap()
        .unwrap();
    assert_eq!(
        serde_json::from_str::<Value>(frame.to_text().unwrap()).unwrap()["event"],
        "user_typing"
    );
    f.call(
        "POST",
        &format!("/api/conversations/{conv}/messages"),
        Some("student"),
        Some(json!({"content":"Private message"})),
    )
    .await;
    let frame = tokio::time::timeout(std::time::Duration::from_secs(2), sockets[0].next())
        .await
        .unwrap()
        .unwrap()
        .unwrap();
    assert_eq!(
        serde_json::from_str::<Value>(frame.to_text().unwrap()).unwrap()["message"]["content"],
        "Private message"
    );
    assert!(
        tokio::time::timeout(std::time::Duration::from_millis(150), sockets[2].next())
            .await
            .is_err()
    );
    use tokio_tungstenite::tungstenite::client::IntoClientRequest;
    let mut request = format!(
        "ws://{addr}/ws?token={}",
        f.token("owner", Utc::now().timestamp() + 60)
    )
    .into_client_request()
    .unwrap();
    request
        .headers_mut()
        .insert("origin", "https://untrusted.example".parse().unwrap());
    let error = tokio_tungstenite::connect_async(request).await.unwrap_err();
    assert!(
        matches!(error,tokio_tungstenite::tungstenite::Error::Http(response) if response.status()==StatusCode::FORBIDDEN)
    );
    server.abort();
}

#[tokio::test]
async fn websocket_expires_with_its_token() {
    let f = Fixture::new().await;
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    let app = build_router(f.state.clone());
    let server = tokio::spawn(async move {
        axum::serve(
            listener,
            app.into_make_service_with_connect_info::<SocketAddr>(),
        )
        .await
        .unwrap();
    });
    let (mut socket, _) = tokio_tungstenite::connect_async(format!(
        "ws://{addr}/ws?token={}",
        f.token("owner", Utc::now().timestamp() + 2)
    ))
    .await
    .unwrap();
    socket.next().await.unwrap().unwrap();
    let frame = tokio::time::timeout(std::time::Duration::from_secs(3), socket.next())
        .await
        .unwrap()
        .unwrap()
        .unwrap();
    assert!(frame.is_close());
    server.abort();
}

#[tokio::test]
async fn migrations_preserve_legacy_data_and_require_fresh_verification() {
    let path = std::env::temp_dir().join(format!("akatsuki-legacy-test-{}.db", Uuid::new_v4()));
    let url = format!("sqlite://{}", path.display());
    let options = url
        .parse::<sqlx::sqlite::SqliteConnectOptions>()
        .unwrap()
        .create_if_missing(true);
    let legacy = sqlx::sqlite::SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(options)
        .await
        .unwrap();
    sqlx::raw_sql(include_str!("../migrations/0001_initial.sql"))
        .execute(&legacy)
        .await
        .unwrap();
    sqlx::query("INSERT INTO users(id,email,password_hash,name,roll_number,department,graduation_year,created_at,updated_at) VALUES('legacy','legacy@mit.asia','old-hash','Legacy','LEGACY','CS',2027,'then','then')").execute(&legacy).await.unwrap();
    legacy.close().await;
    let pool = init_db(&url).await.unwrap();
    let row: (String, i64) =
        sqlx::query_as("SELECT password_hash,erp_verified FROM users WHERE id='legacy'")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(row, ("old-hash".into(), 0));
    let count: i64 = sqlx::query_scalar("SELECT count(*) FROM _sqlx_migrations WHERE success=1")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 2);
    pool.close().await;
    let again = init_db(&url).await.unwrap();
    assert_eq!(
        sqlx::query_scalar::<_, i64>("SELECT count(*) FROM users")
            .fetch_one(&again)
            .await
            .unwrap(),
        1
    );
    again.close().await;
    let _ = std::fs::remove_file(path);
}

#[tokio::test]
async fn cors_and_body_limits_are_enforced() {
    let f = Fixture::new().await;
    for (origin, allowed) in [
        ("http://localhost:3000", true),
        ("https://untrusted.example", false),
    ] {
        let request = Request::builder()
            .method("OPTIONS")
            .uri("/api/jobs")
            .header("origin", origin)
            .header("access-control-request-method", "POST")
            .header(
                "access-control-request-headers",
                "authorization,content-type",
            )
            .body(Body::empty())
            .unwrap();
        let response = build_router(f.state.clone())
            .oneshot(request)
            .await
            .unwrap();
        assert_eq!(
            response
                .headers()
                .get("access-control-allow-origin")
                .is_some(),
            allowed
        );
    }
    let request = Request::builder()
        .method("POST")
        .uri("/api/jobs")
        .header("content-type", "application/json")
        .header(
            "authorization",
            format!("Bearer {}", f.token("owner", Utc::now().timestamp() + 3600)),
        )
        .body(Body::from(
            json!({"title":"Role","description":"x".repeat(65536)}).to_string(),
        ))
        .unwrap();
    assert_eq!(
        build_router(f.state.clone())
            .oneshot(request)
            .await
            .unwrap()
            .status(),
        StatusCode::PAYLOAD_TOO_LARGE
    );
}

#[tokio::test]
async fn optional_job_fields_can_be_cleared_without_overwriting_omitted_fields() {
    let f = Fixture::new().await;
    let (status,job)=f.call("POST","/api/jobs",Some("owner"),Some(json!({"title":"Role", "description":"Description", "location":"Campus lab", "stipend":"Paid", "deadline":"2026-11-20"}))).await;
    assert_eq!(status, StatusCode::CREATED);
    let (status, updated) = f
        .call(
            "PUT",
            &format!("/api/jobs/{}", job["id"].as_str().unwrap()),
            Some("owner"),
            Some(json!({"deadline":null,"location":null})),
        )
        .await;
    assert_eq!(status, StatusCode::OK);
    assert!(updated["deadline"].is_null());
    assert!(updated["location"].is_null());
    assert_eq!(updated["stipend"], "Paid");
}
