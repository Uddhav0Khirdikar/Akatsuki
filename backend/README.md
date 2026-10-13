# Akatsuki backend

Rust/Axum API for verified campus opportunities, applications, and private job-specific messaging. SQLite WAL supports concurrent readers; write transactions serialize lifecycle changes. The WebSocket bus runs inside one backend process.

## Setup

Use a current stable Rust toolchain. From this directory:

```bash
cp .env.example .env
# Generate a secret and set JWT_SECRET in .env to its value:
openssl rand -hex 32
cargo run --locked
```

Startup rejects missing, short, or the former example JWT secret; invalid ports, booleans, ERP URLs, and CORS origins also fail startup. Never reuse a development signing secret for a campus deployment.

| Setting | Default / requirement |
| --- | --- |
| `PORT` | `5000` |
| `DATABASE_URL` | `sqlite://campus_jobs.db` |
| `JWT_SECRET` | Required; unique value of at least 32 bytes |
| `ERP_BASE_URL` | `https://erp.mit.asia`; HTTPS origin only |
| `ALLOWED_ORIGINS` | Exact browser origins, comma separated; defaults to localhost ports 3000 and 5173 |
| `ALLOWED_EMAIL_DOMAINS` | `mit.asia`; used by development registration |
| `ENFORCE_COLLEGE_DOMAIN` | `true`; email syntax is always checked |
| `ALLOW_LOCAL_AUTH` | `false`; enables unverified accounts for development only |
| `SEED_DEMO_DATA` | `false`; requires `ALLOW_LOCAL_AUTH=true` |

For offline development, set both development flags to `true` and use a separate database. This explicitly enables local registration and seeds three demo users on an empty database. Their password is `college123`; for example, `alex.cs@college.edu`. To register additional demo students, add their test email domain to `ALLOWED_EMAIL_DOMAINS`. Demo users can log in locally regardless of the registration domain allowlist. ERP login always calls the ERP, even in development. The full upstream authentication flow has a 20-second timeout, within the current login client’s 25-second request window.

Use HTTPS/WSS at the deployment edge. Authentication endpoints allow 20 requests per minute per actual peer IP, and at most four concurrent ERP/password operations. Forwarded IP headers are not trusted. A reverse proxy therefore shares one rate bucket unless deployment-level rate limiting and trusted client-address handling are added. These limits are initial guardrails, not campus-scale capacity measurements.

## Identity and migration

The ERP roll number is the account key. An email entered into the login form never selects an existing account. Stored `email` for newly provisioned ERP users is a synthetic `<roll-number>@mit.asia` alias; it is not a verified contact address. College credentials are not stored. Phone numbers from the dashboard are neither persisted in profiles nor logged. Graduation year is `0` (unknown) until an authoritative source supplies it.

SQLx tracks versioned migrations in `_sqlx_migrations`. The first migration supports the original schema, and the second adds verification, indexes, and write guards. Existing rows are preserved and marked unverified. Back up an existing database before upgrading. Production authentication rejects its old unverified sessions.

If a real ERP login collides with an unverified legacy roll number, the API returns `409` and requires administrator review. Automatically inheriting an old account would expose data to whoever previously claimed that roll number. There is no automated legacy-account reassignment tool yet; reconcile existing ownership/history and independently verify the old account before changing its verification flag. Switching off local authentication does not retroactively verify demo accounts.

SQLite foreign keys are explicitly enabled on every connection. Deleting a job deletes its applications, inquiry threads, and messages through cascading foreign keys. Use closing when history must remain available.

## API

All routes except health and authentication require `Authorization: Bearer <JWT>`. JWTs expire after seven days. The server checks that the account still exists and, outside development mode, is ERP verified. Responses use current database profile details rather than stale names in JWT claims. Auth/profile responses expose `erp_verified` as a boolean so development identities can be labeled accurately.

| Method | Route | Behavior |
| --- | --- | --- |
| GET | `/api/health` | Checks database connectivity |
| POST | `/api/auth/erp-login` | `{ "username": "...", "password": "..." }`; real ERP verification |
| POST | `/api/auth/register` | Local registration, development only |
| POST | `/api/auth/login` | Local email/roll-number login, development only |
| GET | `/api/auth/me` | Profile and counts |
| GET / POST | `/api/jobs` | Discover / create jobs |
| GET / PUT / DELETE | `/api/jobs/:id` | Details / owner update / owner delete |
| PATCH | `/api/jobs/:id/status` | Owner sets `OPEN` or `CLOSED`; `{}` toggles atomically; invalid values return `400` |
| GET | `/api/jobs/my/posted` | Current user's listings |
| POST | `/api/jobs/:id/apply` | Pitch and optional HTTP(S) resume URL; duplicate applications return `409` |
| GET | `/api/jobs/:id/applications` | Owner reviews applicants |
| GET | `/api/applications/my` | Current user's applications |
| PATCH | `/api/applications/:id/status` | Owner sets `PENDING`, `SHORTLISTED`, `ACCEPTED`, or `REJECTED` |
| POST | `/api/conversations/job/:job_id` | Get/create one thread per student/job; existing threads can be retrieved after closure |
| GET | `/api/jobs/:job_id/conversations` | Owner's inquiry inbox for this job |
| GET | `/api/conversations` | Participant's inbox and unread counters |
| GET / POST | `/api/conversations/:id/messages` | Participant reads / sends messages |
| GET | `/ws` | Authenticated real-time events |

Job discovery supports `search`, `category`, `location_type`, `department`, and `status` (default `OPEN`). Search currently uses substring `LIKE` matching, not an FTS index. Allowed categories: `INTERNSHIP`, `PART_TIME`, `RESEARCH_ASSISTANT`, `PROJECT_COLLAB`, `CAMPUS_GIG`, `TUTORING`. Location types: `ON_CAMPUS`, `REMOTE`, `HYBRID`.

All lists accept `limit` and `offset`, with a maximum page size of 100. Jobs default to 20 per page; other lists default to 50. Message history selects the most recent page and returns it in chronological order. Use increasing offsets to load older pages. Only incoming messages in the returned page are marked read. Offset pages can shift as new messages arrive; use ID cursors in a future client/API iteration for stable long histories.

Job updates preserve omitted fields. Explicit `null` clears optional location, stipend, skills, department, or deadline. A deadline must be a valid `YYYY-MM-DD` date; deadlines are informational, and job status governs applications. The server validates enum values and bounded text on creation and updates. JSON bodies are limited to 64 KiB, message content to 4,000 bytes, and pitches to 10,000 bytes. Application/DM creation and close operations are serialized; database guards enforce these rules for concurrent writes too.

Expected errors: `400` invalid input or closed job, `401` invalid/expired credentials, `403` unauthorized owner/participant or unverified identity, `404` missing record, `409` duplicate/identity conflict, `413` oversized body, `429` authentication limit, `502` invalid ERP profile, `503` unavailable ERP. Internal database errors are logged server-side and redacted from responses. Framework JSON/query extractor errors currently follow Axum's default format.

## WebSocket contract

Native clients can supply a Bearer authorization header. Browser clients can use `ws://localhost:5000/ws?token=<JWT>` for local development and WSS in deployment. Query tokens must be excluded from reverse-proxy access logs. Backend tracing deliberately excludes query strings. When a browser sends `Origin`, it must appear in `ALLOWED_ORIGINS`.

Incoming typing events:

```json
{ "event": "typing", "conversation_id": "...", "is_typing": true }
```

Outgoing events:

```json
{ "event": "connected", "user_id": "..." }
{ "event": "new_message", "conversation_id": "...", "message": { "id": "...", "sender_id": "...", "sender_name": "...", "content": "...", "created_at": "..." } }
{ "event": "user_typing", "conversation_id": "...", "user_id": "...", "is_typing": true }
{ "event": "resync_required" }
```

Only the two conversation participants receive message and typing events. Typing requires server-side membership checks and is limited to five accepted attempts per second per socket. Messages commit before an event is published. Socket frames are limited to 4 KiB, slow sends time out, and connections close when their JWT expires. If a subscriber falls behind, `resync_required` instructs the client to refresh inbox/history through REST.

Events are best effort; SQLite is the source of truth. There is no durable delivery outbox, session revocation service, cross-process event broker, or per-user socket quota yet. See [remaining audit work](../docs/backend-audit.md).

## Verification

```bash
cargo fmt --check
cargo clippy --locked --all-targets -- -D warnings
cargo test --locked
# Optional Python compatibility entry point, invokes the same Rust suite:
python3 tests/test_api.py
# Install cargo-audit, then check the locked dependency graph:
python3 scripts/audit_dependencies.py
```

Tests use temporary SQLite databases, a local ERP fixture, and real local WebSocket servers. They need neither a running backend nor college credentials. Production never enables this ERP fixture.

The raw lockfile scan reports `RUSTSEC-2023-0071` in SQLx's optional MySQL/RSA dependencies. `audit_dependencies.py` excludes only this advisory after checking that `rsa` is absent from the active graph across all platforms. If RSA becomes active, the exclusion stops and CI fails. All other advisories and warnings remain enforced. See the audit report for the scan's scope.
