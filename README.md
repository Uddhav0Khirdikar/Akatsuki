# 🎓 Akatsuki: Intra-College Job & Opportunity Hub

> **High-Performance Campus Hiring & Peer Opportunities with Official College ERP Authentication & Job-Specific DMs**

[![Rust](https://img.shields.io/badge/Rust-1.99-orange?logo=rust)](https://www.rust-lang.org/)
[![Axum](https://img.shields.io/badge/Axum-0.7-blue?logo=tokio)](https://github.com/tokio-rs/axum)
[![Tokio](https://img.shields.io/badge/Tokio-Async-red?logo=tokio)](https://tokio.rs/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL_Mode-lightblue?logo=sqlite)](https://sqlite.org/)

---

## 📌 About Akatsuki

**Akatsuki** is an intra-college job & peer opportunity platform designed specifically for students, research labs, student-led startups, and campus clubs.

### 🌟 Key Highlights
- **🏛️ Official College ERP Gated Access**: Integrates with the official college ERP portal (matching the `MIT_Attendance` Spring Security API) to verify student Roll Numbers, official names, and departments.
- **💼 Campus Job Marketplace**: Post and search peer roles, internships, campus gigs, research assistantships, and hackathon team openings.
- **💬 Job-Specific DMs**: When students reach out about a job, their DMs are permanently tied to that job listing. Creators have an inbox grouped **per-job** with unread counters, eliminating context confusion.
- **🔒 Open & Closed Job Lifecycle**: Job owners can close the job (`CLOSED`) when the spot is filled, automatically locking new applications and new inquiry DMs while preserving conversation history. Can be re-opened at any time.
- **⚡ Built for Extreme Performance**: Powered by **Rust (Axum 0.7 + Tokio)** with multi-threading, SQLite in WAL mode, and sub-millisecond real-time WebSockets.

---

## 📖 Documentation & Architecture

* **Product Concept, User Flows & Sequence Diagrams**: [idea.md](idea.md)
* **Backend Architecture, API Endpoints & WebSocket Protocol**: [backend/README.md](backend/README.md)

---

## 🚀 Quick Start

### 1. Prerequisites
- **Rust Toolchain** (1.75+)
- **Python 3** (for integration tests)

### 2. Run the Server
```bash
cd backend
cp .env.example .env
cargo run
```
The server will start at:
* **REST API**: `http://localhost:5000`
* **Real-Time WebSocket Hub**: `ws://localhost:5000/ws?token=<JWT>`

### 3. Run Automated Integration Tests
```bash
python backend/tests/test_api.py
```

---

## 📄 License
ISC License.
