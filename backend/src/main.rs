use std::net::SocketAddr;
use std::sync::Arc;

use axum::{
    routing::{get, patch, post, put},
    Json, Router,
};
use bcrypt::{hash, DEFAULT_COST};
use chrono::Utc;
use serde_json::json;
use tokio::sync::broadcast;
use tower_http::cors::{Any, CorsLayer};
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;
use uuid::Uuid;

mod config;
mod db;
mod handlers;
mod middleware;
mod models;
mod utils;

use config::Config;
use db::{init_db, DbPool};
use handlers::auth::AppState;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 1. Initialize logging
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber)
        .expect("Failed to initialize tracing subscriber");

    // 2. Load configuration
    let config = Config::init();
    info!("Starting Akatsuki High-Performance Campus Backend on port {}", config.port);

    // 3. Initialize SQLite Database with WAL mode & high-concurrency connection pool
    let db = init_db(&config.database_url).await?;

    // 4. Seed initial campus data if empty
    seed_initial_data_if_needed(&db).await?;

    // 5. Initialize Tokio broadcast channel for real-time WebSocket messaging
    let (tx, _rx) = broadcast::channel::<String>(2048);

    let state = AppState {
        db,
        config: config.clone(),
        tx,
    };

    // 6. Build CORS Layer
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // 7. Define Routes
    let app = Router::new()
        // Health check
        .route("/api/health", get(|| async {
            Json(json!({
                "status": "healthy",
                "service": "Akatsuki Campus Engine (Rust/Axum)",
                "timestamp": Utc::now().to_rfc3339()
            }))
        }))
        // Authentication routes
        .route("/api/auth/register", post(handlers::auth::register))
        .route("/api/auth/login", post(handlers::auth::login))
        .route("/api/auth/erp-login", post(handlers::auth::erp_login))
        .route("/api/auth/me", get(handlers::auth::get_me))
        // Job Management routes
        .route("/api/jobs", post(handlers::jobs::create_job))
        .route("/api/jobs", get(handlers::jobs::get_jobs))
        .route("/api/jobs/:id", get(handlers::jobs::get_job_by_id))
        .route("/api/jobs/:id", put(handlers::jobs::update_job))
        .route("/api/jobs/:id/status", patch(handlers::jobs::update_job_status))
        .route("/api/jobs/:id", axum::routing::delete(handlers::jobs::delete_job))
        .route("/api/jobs/my/posted", get(handlers::jobs::get_my_posted_jobs))
        // Application routes
        .route("/api/jobs/:id/apply", post(handlers::applications::apply_to_job))
        .route("/api/jobs/:id/applications", get(handlers::applications::get_job_applications))
        .route("/api/applications/my", get(handlers::applications::get_my_applications))
        .route("/api/applications/:id/status", patch(handlers::applications::update_application_status))
        // Conversation & In-Job Chat routes
        .route("/api/jobs/:job_id/conversations", get(handlers::conversations::get_job_conversations))
        .route("/api/conversations/job/:job_id", post(handlers::conversations::get_or_create_conversation_for_job))
        .route("/api/conversations", get(handlers::conversations::get_user_conversations))
        .route("/api/conversations/:id/messages", get(handlers::conversations::get_conversation_messages))
        .route("/api/conversations/:id/messages", post(handlers::conversations::send_message))
        // WebSocket Real-time stream
        .route("/ws", get(handlers::ws::ws_handler))
        .layer(cors)
        .with_state(state);

    // 8. Bind & serve
    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    info!("🚀 Akatsuki Server running at http://localhost:{}", config.port);
    info!("⚡ Real-Time WebSocket endpoint active at ws://localhost:{}/ws", config.port);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn seed_initial_data_if_needed(pool: &DbPool) -> Result<(), sqlx::Error> {
    let user_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users")
        .fetch_one(pool)
        .await
        .unwrap_or(0);

    if user_count > 0 {
        return Ok(());
    }

    info!("Seeding realistic campus demo data (students, startup jobs, research gigs)...");

    let password_hash = hash("college123", DEFAULT_COST).unwrap();
    let now = Utc::now().to_rfc3339();

    // 1. Student 1: Lead Founder (Computer Science)
    let user1_id = Uuid::new_v4().to_string();
    sqlx::query(
        r#"
        INSERT INTO users (id, email, password_hash, name, roll_number, department, graduation_year, bio, skills, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(&user1_id)
    .bind("alex.cs@college.edu")
    .bind(&password_hash)
    .bind("Alex Chen")
    .bind("CS2026-042")
    .bind("Computer Science & Engineering")
    .bind(2026)
    .bind("Founder of CampusNotes AI. Looking for frontend & UI/UX collaborators.")
    .bind("Rust, React, TypeScript, System Design")
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await?;

    // 2. Student 2: Research Scholar (Biotech / AI)
    let user2_id = Uuid::new_v4().to_string();
    sqlx::query(
        r#"
        INSERT INTO users (id, email, password_hash, name, roll_number, department, graduation_year, bio, skills, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(&user2_id)
    .bind("priya.patel@college.edu")
    .bind(&password_hash)
    .bind("Priya Patel")
    .bind("BT2027-118")
    .bind("Biotechnology & Computational Biology")
    .bind(2027)
    .bind("Undergrad Researcher at Genome Data Lab. Searching for python data visualization peer.")
    .bind("Python, BioInformatics, PyTorch")
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await?;

    // 3. Student 3: Design Lead / Job Seeker
    let user3_id = Uuid::new_v4().to_string();
    sqlx::query(
        r#"
        INSERT INTO users (id, email, password_hash, name, roll_number, department, graduation_year, bio, skills, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(&user3_id)
    .bind("devon.des@college.edu")
    .bind(&password_hash)
    .bind("Devon Miller")
    .bind("DES2027-009")
    .bind("Design & Digital Arts")
    .bind(2027)
    .bind("UI/UX designer. Open for campus startup gigs and design collabs.")
    .bind("Figma, TailwindCSS, Prototyping, Brand Design")
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await?;

    // Sample Jobs
    let job1_id = Uuid::new_v4().to_string();
    sqlx::query(
        r#"
        INSERT INTO jobs (id, title, description, category, location_type, location, stipend, skills_required, department, status, deadline, creator_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(&job1_id)
    .bind("Full-Stack React & Rust Developer for CampusNotes Startup")
    .bind("We are building an AI-powered lecture note synthesizer for college courses. Need an enthusiastic peer developer to build the dashboard and interactive study tools.")
    .bind("PROJECT_COLLAB")
    .bind("HYBRID")
    .bind("Innovation Hub Lab 204")
    .bind("₹8,000/mo + Equity")
    .bind("React, TypeScript, Rust, TailwindCSS")
    .bind("Computer Science & Engineering")
    .bind("OPEN")
    .bind("2026-11-30")
    .bind(&user1_id)
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await?;

    let job2_id = Uuid::new_v4().to_string();
    sqlx::query(
        r#"
        INSERT INTO jobs (id, title, description, category, location_type, location, stipend, skills_required, department, status, deadline, creator_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(&job2_id)
    .bind("Undergrad Bioinformatics Research Assistant")
    .bind("Assist in processing DNA sequencing datasets and generating matplotlib visualizations for a peer-reviewed research paper.")
    .bind("RESEARCH_ASSISTANT")
    .bind("ON_CAMPUS")
    .bind("Bio-Tech Building Lab 4")
    .bind("₹10,000/mo Research Grant")
    .bind("Python, Pandas, Matplotlib, Data Analysis")
    .bind("Open to all STEM branches")
    .bind("OPEN")
    .bind("2026-11-15")
    .bind(&user2_id)
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await?;

    let job3_id = Uuid::new_v4().to_string();
    sqlx::query(
        r#"
        INSERT INTO jobs (id, title, description, category, location_type, location, stipend, skills_required, department, status, deadline, creator_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(&job3_id)
    .bind("Campus Hackathon Lead Graphic & UI Designer")
    .bind("Design banners, social media assets, event web portal badges, and swag stickers for the annual College Hackathon 2026.")
    .bind("CAMPUS_GIG")
    .bind("REMOTE")
    .bind("Campus Remote")
    .bind("₹5,000 per event + Official Certificate")
    .bind("Figma, Adobe Illustrator, Canva")
    .bind("Open to all branches")
    .bind("OPEN")
    .bind("2026-10-31")
    .bind(&user1_id)
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await?;

    info!("Demo data seeded successfully! 3 students and 3 campus jobs initialized.");
    Ok(())
}
