# Backend audit — 2026-10-13

## Product alignment

Akatsuki's defining workflow is verified campus identity → discover a peer opportunity → inquire/apply → owner reviews candidates → coordinate privately → close/reopen the opportunity. Inquiry threads must remain attached to their job and private to their two participants. Closing stops new applications and threads while preserving existing coordination.

Reviewed the complete Rust backend, models, routes, configuration, ERP client, SQLite schema, dependency lockfile, integration test, product concept, and available frontend design briefs. A login frontend scaffold was added concurrently; its ERP request, session fields, error mapping, and Vite proxy were checked for API alignment. The full campus frontend and deployment configuration are not yet implemented. Frontend and design files were not changed by this audit. No production database or live college credentials were available for verification.

## Findings addressed

Severity describes the original behavior, before this sweep.

| Severity | Original finding | Implemented correction |
| --- | --- | --- |
| Critical | `college123` and `demo123` returned an invented verified ERP profile for arbitrary usernames | Removed the bypass entirely; every ERP login contacts the configured portal |
| Critical | WebSocket subscribers received all users' private messages and typing events | Events carry explicit participant recipients; outbound sockets filter them; typing verifies membership |
| High | Local registration let anyone claim a college roll number/name; matching ERP logins by submitted email could select another account | Local auth disabled by default; ERP identity keyed only by authoritative roll number; legacy collisions return `409` |
| High | Jobs and poster roll numbers were public despite the campus-only access model | Both discovery and job-detail routes require an active verified account |
| High | Known signing secret and demo credentials were active on default startup | Required signing secret; explicit opt-in development flags for local auth and seeds; strict configuration validation |
| High | Application/DM checks ran separately from inserts, allowing races with closure and duplicate requests | `BEGIN IMMEDIATE` transactions serialize checks/writes with close operations; database insert guards enforce lifecycle and membership |
| High | ERP passwords were hashed into reusable local-login credentials, and phone numbers were copied into visible bios | ERP passwords are never stored; ERP users have no local password; contact numbers are not persisted or logged |
| High | ERP parse errors logged complete student dashboard responses | Removed raw response and identifying profile logs; bounded response reads; required profile fields validated |
| High | Open sockets survived JWT expiry; REST validation reloaded configuration for every request and trusted stale claim identities | Shared startup configuration and live user lookup; strict expiry checks; sockets close at token expiry |
| Medium | An invalid status silently toggled a job; PUT bypassed required fields and enums | Validate every job write; malformed status returns `400`; status toggles are atomic |
| Medium | Multi-step message writes could leave inbox timestamps inconsistent, and failed read acknowledgments were ignored | Message creation/timestamp update commit together; acknowledgment errors propagate; events publish after commit |
| Medium | Reading a thread marked all incoming messages read, including history not returned under pagination | Select a bounded recent page and acknowledge only that page inside one transaction |
| Medium | Inbox, application, and history endpoints loaded unbounded data; latest-message/unread queries lacked composite indexes | Page every list; add deterministic ordering, history/inbox indexes, and an unread partial index |
| Medium | Database, crypto, and JWT implementation errors reached clients | Redact internal errors while preserving explicit safe ERP outage/profile messages; classify uniqueness/closed-job errors |
| Medium | Authentication had no attempt/concurrency limits; bcrypt ran on async workers | Peer-IP attempt limits; shared authentication semaphore; bcrypt uses blocking workers |
| Medium | CORS allowed any origin and WebSocket frame sizes were unrestricted | Exact configured origins, WebSocket Origin checks, 64 KiB JSON limit, 4 KiB socket frames, bounded text fields |
| Medium | Schema creation was unversioned; database connections relied on implicit FK settings | SQLx migrations with checksums; explicit foreign keys on every connection; tested cascades and legacy upgrade |
| Medium | PUT could not clear optional job fields | Omitted fields preserve values; explicit null clears optional fields |
| Medium | ERP outage and invalid credentials were conflated; redirects were followed without origin validation | Distinct `401`/`502`/`503` results; same-origin redirects only; HTTPS production configuration; 20-second total ERP budget compatible with the login client |
| Low | Demo seeding was nontransactional, health ignored the database, and shutdown lacked signal handling | Transactional opt-in seeding; database-backed health; Ctrl-C/SIGTERM graceful shutdown |
| Low | SQLx enabled unused general database features and retained an advisory in its optional MySQL dependency | Disabled default SQLx features; guard the inactive RSA advisory across all targets before excluding it from the scan |
| Low | Existing tests assumed seeded accounts and an ERP bypass; README promised unmeasured latency and FTS | Isolated regression suite and CI; accurate setup/API docs and performance/search descriptions |

The old schema already declared foreign keys and SQLx normally enables them, so missing enforcement was a reliance on defaults, not a demonstrated preexisting FK failure. Enforcement is now explicit and tested across multiple connections.

## Remaining backend work, in priority order

| Priority | Work | Why it matters |
| --- | --- | --- |
| Before existing-data rollout | Review legacy identities, run `PRAGMA foreign_key_check`, reconcile invalid enums/orphaned rows, and back up the database | Migrations preserve old records; they do not independently verify accounts or repair historical data |
| Before campus rollout | Validate the actual ERP protocol/profile with authorized college access | Local fixtures cover our client behavior; they do not prove the production portal accepts the documented Spring Security flow or supplies all expected profile fields |
| Before campus rollout | Add trusted proxy/client-address policy and tune auth limits for campus NAT; HTTPS/WSS and query-token log filtering at the edge | Current rate limits use actual TCP peer IPs, so many students behind one proxy/NAT share a bucket |
| Before campus rollout | Implement logout/revocation/session-version policy and connection quotas | Tokens last seven days; sockets expire but there is no immediate per-session revocation or per-user connection cap |
| Before campus rollout | Provide moderation/reporting and accountable administrative actions; define retention and backups | Verified student identity alone does not prevent spam, harmful listings, or data loss |
| Next backend iteration | Replace synthetic email aliases and unknown graduation-year sentinel with authoritative contact/profile fields | Aliases are not verified mailboxes, and `0` means unknown, not a graduation year |
| Next backend iteration | Add message cursor pagination, explicit read receipts, and a durable delivery/outbox strategy | Offset pages shift under concurrent activity; in-process broadcast can drop events and a crash between commit/publish can miss a live notification |
| Before multiple server instances | Per-user event routing and a shared event broker; benchmark SQLite contention and evaluate a server database if needed | The current bus is process-local and SQLite serializes writers; no extreme-throughput claim has been established |
| Next backend iteration | Common JSON errors for extraction failures and frontend-friendly pagination metadata | Axum currently formats malformed JSON/query errors; successful lists remain arrays without next-page metadata |
| Product decision | Define deadline semantics, application withdrawal/history, opportunity verification, and institution/tenant scope | Dates currently inform readers; only `OPEN`/`CLOSED` gates applications. Accepting an applicant does not automatically close a listing |
| Performance iteration | Benchmark realistic campus traffic and add FTS only when needed | Current search uses `LIKE` and per-user request authorization performs a DB lookup |

GET message history still acts as a read acknowledgment. It guarantees that only the selected page is marked, but network failure after commit can prevent the client from receiving it. A separate explicit acknowledgment endpoint should follow when the client is implemented.

Database deletion intentionally cascades conversation history; closing preserves it. If the product needs history retained after deletion, add archival/soft-delete semantics before changing this contract.

## Validation

The regression suite covers campus gating, local-auth defaults, ERP credential rejection and account isolation, legacy collisions, upstream unavailability, owner/participant permissions, closed-job behavior, simultaneous duplicate requests, a waiting application after a committed close, foreign keys/cascades, paginated unread counters, committed private events, current profile details, rate limits, internal-error redaction, migration preservation/idempotency, CORS/body limits, explicit-null updates, and real WebSocket privacy/spoofing/expiry.

The Python test entry point now invokes this isolated Rust suite; it does not require an existing server or external college access. CI runs formatting, Clippy with warnings denied, tests, and dependency advisories.

Final verification:

- `cargo fmt --check`: passed.
- `cargo clippy --locked --all-targets -- -D warnings`: passed.
- `cargo test --locked`: 20 tests passed, including real local WebSocket connections.
- `cargo build --locked` and `git diff --check`: passed.
- Binary smoke checks: seven unsafe/invalid configuration cases rejected; production starts without demo accounts; explicit development seeding/local login works; database health/migrations and SIGTERM shutdown verified against temporary databases.
- Guarded dependency scan: passed against 1,309 RustSec advisories and 285 locked dependencies; no other vulnerabilities or informational warnings reported.

The raw `cargo audit` lockfile scan reports one advisory: [RUSTSEC-2023-0071](https://rustsec.org/advisories/RUSTSEC-2023-0071.html), affecting `rsa 0.9.10` retained through SQLx's optional MySQL driver. `cargo tree --locked --target all` confirms RSA is absent from this application's active graph, including build/development dependencies. `scripts/audit_dependencies.py` performs that check on every run and excludes this one advisory only while RSA remains inactive. It does not suppress other advisories. This is a documented exclusion for uncompiled optional code, not a claim that the affected crate has been patched. Advisory database commit: `d8325cf4f578e2df4cc5b98a30e9f46b3b88e9f0`.

Live ERP authentication, production data migration, deployment edge behavior, CI execution on GitHub, and load benchmarks were not exercised; those require the corresponding environment and credentials.
