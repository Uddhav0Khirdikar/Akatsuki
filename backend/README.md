# ⚡ Akatsuki High-Performance Campus Engine (Rust + Axum)

A blazingly fast, multi-threaded college job and peer opportunity backend built with **Rust**, **Axum 0.7**, **Tokio**, and **SQLx (SQLite WAL)**. Designed for sub-millisecond response latency, high concurrent connections, and minimal memory usage.

---

## 🚀 Key Features

1. **College ERP Gated Access**:
   - Institutional domain verification (e.g. `@college.edu`, `@*.ac.in`).
   - Roll number / PRN normalization.
   - High-security password hashing with Bcrypt.
   - Fast JWT token generation and validation.

2. **Campus Job Discovery & Management**:
   - Full-text search across titles, descriptions, and skills.
   - Filters: `category`, `location_type`, `department`, `status`.
   - Categories: `INTERNSHIP`, `PART_TIME`, `RESEARCH_ASSISTANT`, `PROJECT_COLLAB`, `CAMPUS_GIG`, `TUTORING`.
   - Poster attribution with roll number, department, and application counters.

3. **Application Lifecycle**:
   - One-click application with pitch notes and verified student profile details.
   - Prevention of duplicate applications or self-applications.
   - Applicant review pipeline with status states (`PENDING`, `SHORTLISTED`, `ACCEPTED`, `REJECTED`).

4. **In-Job Real-Time Messaging & Chat**:
   - Direct message channel linked directly to the specific job posting.
   - High-throughput WebSocket server via `/ws?token=...` for instant bidirectional messaging and typing indicators.
   - Tokio broadcast bus for instant multi-client frame dispatching.
   - Automatic unread tracking and conversation inbox overview.

5. **Ultra-Low Latency Database Architecture**:
   - SQLite with **WAL (Write-Ahead Logging)** mode enabled.
   - `PRAGMA synchronous = NORMAL` for near-instant writes without blocking reads.
   - Automatic database migrations and index optimization.
   - Pre-seeded campus demo dataset on first startup.

---

## 🛠️ Configuration (`.env`)

```env
PORT=5000
DATABASE_URL=sqlite://campus_jobs.db
JWT_SECRET=super_secret_college_erp_jwt_key_2026

# Allowed institutional domains (comma-separated)
ALLOWED_EMAIL_DOMAINS=college.edu,campus.ac.in,univ.edu,student.college.edu

# Set to true to strictly reject non-college email domains
ENFORCE_COLLEGE_DOMAIN=false
```

---

## 🏃 Quick Start

### 1. Build and Run Server
```bash
cargo run
```
The server will start at:
- **REST API**: `http://localhost:5000`
- **WebSocket Hub**: `ws://localhost:5000/ws?token=<JWT_TOKEN>`

### 2. Run Automated Integration Test
```bash
python tests/test_api.py
```

---

## 📡 API Reference

### 🔐 Authentication (`/api/auth`)
- `POST /api/auth/erp-login` — **Official MIT ERP Login** (Mirrors `MIT_Attendance` app): Authenticates via Spring Security, fetches student info (`rollNo`, `firstName`, `courseName`, `mobileNo`), and returns verified student JWT session
- `POST /api/auth/register` — Register student with ERP credentials
- `POST /api/auth/login` — Login and receive JWT
- `GET /api/auth/me` — Get profile and stats (posted jobs, applications, active chats)

### 💼 Jobs (`/api/jobs`)
- `GET /api/jobs` — Search and filter jobs (query parameters: `search`, `category`, `location_type`, `department`, `status`, `limit`, `offset`)
- `POST /api/jobs` — Create a new job opening (Auth required, default status: `OPEN`)
- `GET /api/jobs/:id` — Get job details & applicant count
- `PUT /api/jobs/:id` — Update job posting details (Owner only)
- `PATCH /api/jobs/:id/status` — **GitHub Issues Style Open / Closed Toggle** (Owner only): Toggle status between `OPEN` and `CLOSED` or pass `{ "status": "CLOSED" }` / `{ "status": "OPEN" }`
- `DELETE /api/jobs/:id` — Delete job posting (Owner only)
- `GET /api/jobs/my/posted` — Get all jobs posted by current user
- `GET /api/jobs/:job_id/conversations` — **Job-Wise DM Inbox** (Owner only): View all student DM threads specifically belonging to this job with latest message and unread count

### 📝 Applications
- `POST /api/jobs/:id/apply` — Apply to job with pitch and resume
- `GET /api/jobs/:id/applications` — View applicants for job (Owner only)
- `GET /api/applications/my` — View student's submitted applications
- `PATCH /api/applications/:id/status` — Update status (`PENDING`, `SHORTLISTED`, `ACCEPTED`, `REJECTED`)

### 💬 Messaging & In-Job Inquiries
- `POST /api/conversations/job/:job_id` — Open or retrieve chat thread with job creator
- `GET /api/conversations` — View user's conversation threads & unread counts
- `GET /api/conversations/:id/messages` — Get message history (marks messages as read)
- `POST /api/conversations/:id/messages` — Send message (broadcasts via WebSocket)
- `GET /ws?token=<JWT>` — Real-time WebSocket connection for instant chat events

---

## ⚡ Real-Time WebSocket Protocol (`ws://localhost:5000/ws?token=<JWT>`)

### Inbound Events (Client -> Server)
- **Typing Indicator**:
  ```json
  { "event": "typing", "conversation_id": "<conv_id>", "is_typing": true }
  ```

### Outbound Events (Server -> Client)
- **New Message Received**:
  ```json
  {
    "event": "new_message",
    "conversation_id": "<conv_id>",
    "message": {
      "id": "...",
      "sender_id": "...",
      "sender_name": "...",
      "content": "Hello!",
      "created_at": "..."
    }
  }
  ```
- **Typing Notification**:
  ```json
  {
    "event": "user_typing",
    "conversation_id": "<conv_id>",
    "user_id": "...",
    "is_typing": true
  }
  ```
