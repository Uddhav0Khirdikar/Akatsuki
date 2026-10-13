# Akatsuki: campus jobs and opportunities

Akatsuki is an intra-college opportunity hub for students, research labs, student startups, and clubs. Its core workflow combines verified college identity, campus job discovery, applications, and private conversations tied to each job.

- Students sign in through the official MIT ERP; names, roll numbers, and departments come from the ERP profile.
- Every inquiry thread belongs to one job and contains only its owner and the interested student.
- Owners review applications and see a separate inquiry inbox for each job.
- Closing a job blocks new applications and inquiry threads. Existing chats remain available for coordination. Owners can reopen listings.

The backend uses Rust, Axum, Tokio, and SQLite in WAL mode. The repository currently contains the backend and frontend design studies; it does not yet contain a production frontend. Performance targets require benchmarking.

Read [the product concept](idea.md), [backend setup and API contracts](backend/README.md), and [the backend audit](docs/backend-audit.md).

To run the backend:

```bash
cd backend
cp .env.example .env
# Generate a secret, then set JWT_SECRET in .env to the resulting value:
openssl rand -hex 32
cargo run --locked
```

The API listens on port 5000 by default. ERP authentication requires the college portal to be available; there are no bypass passwords. Local authentication and demo data require explicit development configuration described in the backend README.

Run the isolated regression suite without college credentials or a running server:

```bash
cargo test --locked --manifest-path backend/Cargo.toml
```

License: ISC.
