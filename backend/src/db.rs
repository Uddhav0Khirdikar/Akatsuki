use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::{Pool, Sqlite};
use std::str::FromStr;
use tracing::info;

pub type DbPool = Pool<Sqlite>;

pub async fn init_db(database_url: &str) -> Result<DbPool, sqlx::Error> {
    let connection_options = SqliteConnectOptions::from_str(database_url)?
        .create_if_missing(true)
        .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
        .synchronous(sqlx::sqlite::SqliteSynchronous::Normal)
        .busy_timeout(std::time::Duration::from_secs(5));

    let pool = SqlitePoolOptions::new()
        .max_connections(25)
        .connect_with(connection_options)
        .await?;

    run_migrations(&pool).await?;

    info!("Database initialized with WAL mode & connection pooling.");
    Ok(pool)
}

async fn run_migrations(pool: &DbPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            roll_number TEXT UNIQUE NOT NULL,
            department TEXT NOT NULL,
            graduation_year INTEGER NOT NULL,
            bio TEXT,
            avatar_url TEXT,
            resume_url TEXT,
            skills TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_roll_number ON users(roll_number);

        CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'CAMPUS_GIG',
            location_type TEXT NOT NULL DEFAULT 'ON_CAMPUS',
            location TEXT,
            stipend TEXT,
            skills_required TEXT,
            department TEXT,
            status TEXT NOT NULL DEFAULT 'OPEN',
            deadline TEXT,
            creator_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(creator_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
        CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category);
        CREATE INDEX IF NOT EXISTS idx_jobs_creator_id ON jobs(creator_id);
        CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);

        CREATE TABLE IF NOT EXISTS applications (
            id TEXT PRIMARY KEY,
            job_id TEXT NOT NULL,
            applicant_id TEXT NOT NULL,
            pitch_note TEXT NOT NULL,
            resume_url TEXT,
            status TEXT NOT NULL DEFAULT 'PENDING',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE,
            FOREIGN KEY(applicant_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(job_id, applicant_id)
        );

        CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
        CREATE INDEX IF NOT EXISTS idx_applications_applicant_id ON applications(applicant_id);

        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            job_id TEXT NOT NULL,
            student_id TEXT NOT NULL,
            owner_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE,
            FOREIGN KEY(student_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(job_id, student_id)
        );

        CREATE INDEX IF NOT EXISTS idx_conversations_student ON conversations(student_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_owner ON conversations(owner_id);

        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            sender_id TEXT NOT NULL,
            content TEXT NOT NULL,
            is_read INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
            FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}
