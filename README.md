# Shizukasa (静かな会話) — E2E Encrypted Chat App

A security-focused, one-on-one encrypted messaging web app with a Japanese
ink-wash aesthetic. Built as a from-scratch exploration of real-time delivery,
WebSocket architecture, and end-to-end encryption — not a WhatsApp clone, but
inspired by the same core problems (delivery guarantees, presence, multi-device
sync) at a much smaller scale.

> The separate marketing/landing site for Shizukasa also lives in this
> repository under `shizukasa-website/`. It is a standalone TanStack Start +
> React + Tailwind CSS app with its own build toolchain.

---

## Status

**Phase 1 — Bare-bones WebSocket messaging: ✅ Complete**
**Phase 2 — Auth & contacts: ✅ Complete**

The app supports live 1-on-1 text messaging over WebSockets between two
authenticated clients. OTP-based phone-number authentication, JWT
access/refresh tokens, contact management endpoints, and an auth-gated
WebSocket handshake are all implemented and wired end-to-end. The frontend
presents a login overlay (phone → OTP → chat) and automatically reconnects
with the stored token on page refresh. The OTP service is currently mocked
(returns the code directly in the API response) pending a real SMS provider.

### Recent Changes (Frontend Bug-Fix Pass)

| # | File(s) | What changed |
|---|---------|-------------|
| 1 | `js/contact.js` | **Deleted** — empty dead file that shadowed the real `contacts.js` |
| 2 | `index.html` | **Moved `#login-overlay` outside `.app-shell`** — it was a 3rd CSS-grid child in a 2-column layout (`300px 1fr`), causing `<main>` to shift to an implicit column |
| 3 | `js/auth.js` | **Fixed `apiBase()` for `file://` protocol** — previously built broken URLs like `file:///localhost:8000`; now returns `http://localhost:8000` |
| 4 | `js/websocket.js` | **Aligned WebSocket host detection** with the same `file://` fix; simplified the protocol/host branching |
| 5 | `js/ui.js`, `css/style.css` | **Fixed connection-dot state management** — `setConnectionStatus()` now toggles both `.online` and `.offline` classes; added `.dot.offline` CSS rule |
| 6 | `js/websocket.js`, `js/main.js` | **`send()` returns success/failure** — previously a failed send silently rendered the message in the thread without actually delivering it; now bails out early |

---

## Features (planned, per project spec)

- End-to-end encryption (client-side, private keys never leave the device)
- One-on-one messaging only (no group chat, by design)
- Reliable message delivery over a persistent WebSocket connection
- Offline message handling or graceful reconnection
- Architecture considerations for scale (though scaling is explicitly
  deprioritized until later phases)

## Features (currently working)

- **Auth-gated WebSocket** — the `/ws` endpoint accepts connections, then
  expects a `{"token": "..."}` JWT as the first message; the server verifies
  the token and closes the socket (`4001`) on failure
- Targeted 1-on-1 delivery via `send_to_user()` (not broadcast)
- Malformed JSON handling without dropping the connection
- Stale-socket cleanup on duplicate connections from the same user
- 2-panel chat UI (sidebar + thread) with a warm paper-and-ink-brown theme
- Exponential-backoff auto-reconnect on the client (skips reconnect loop on
  auth failure to avoid hammering the server)
- Mobile-responsive layout (collapses to single panel under 760px)
- Correct `file://` protocol handling — opening `index.html` directly from
  the filesystem connects to `http://localhost:8000` for REST and
  `ws://localhost:8000` for WebSocket
- Send-failure detection — `ChatSocket.send()` returns `false` when the
  socket is disconnected, preventing ghost messages in the thread
- OTP-based phone-number authentication (`/auth/request-otp`, `/auth/verify-otp`)
- JWT access & refresh token flow (`/auth/refresh`)
- Frontend login overlay with phone-number → OTP code → chat transition
- Auto-login on page refresh when a session token already exists in
  `sessionStorage`
- `authedFetch()` helper that auto-refreshes expired access tokens on 401
- Contact management — add and list contacts (`/contacts/add`, `/contacts/`)
- SQLite database with auto-created tables (Users, OTP requests, Contacts)
- Ink-wash visual assets: cherry-blossom chat background (`Chat-bg.png`),
  branch and mountains SVG motifs

---

## Architecture

### Backend

- **Framework:** Python, FastAPI
- **Transport:** WebSockets (`fastapi.WebSocket`)
- **Database:** SQLite via SQLAlchemy (auto-created on first run)
- **Auth:** phone number + OTP (WhatsApp-style) → JWT (access + refresh tokens)
- **Structure:**
  - `app/main.py` — app entrypoint, bootstraps DB tables, enables CORS for
    file-origin and dev-server clients, mounts the `auth` and `contact` routers,
    exposes the `/` health check, and defines the `/ws` endpoint with an in-line
    `_authenticate_socket()` handshake that validates the opening JWT payload
    and rejects malformed auth messages
  - `app/config.py` — centralised settings via `pydantic-settings`
  - `app/database.py` — SQLAlchemy engine, session factory, `Base`
  - `app/dependencies.py` — `get_current_user` dependency (Bearer token → User)
  - `app/models/` — `User` (keyed by phone number), `OTPRequest`, `Contact`
    (owner ↔ contact, unique constraint), `Message`
  - `app/schemas/` — Pydantic request/response models for auth, contacts,
    messages, and users
  - `app/services/` — `jwt_handler.py` (create/decode access & refresh JWTs),
    `otp_service.py` (generate OTP, verify, mark used)
  - `app/routers/` — `auth.py`, `contact.py`, `chat.py`, `users.py`
  - `app/websocket/connection_manager.py` — tracks active connections,
    handles register/disconnect and targeted message delivery
    (`chat_socket.py` also present for future extraction)
- **Identity model:** phone number is the unified key across JWT `sub`
  claims, WebSocket identity (resolved from the token during the handshake),
  and contact relationships

### Frontend

- **Stack:** Vanilla HTML/CSS/JS (no framework)
- **Structure:**
  - `frontend/index.html` — shell markup (sidebar + thread panel + composer);
    login overlay lives outside the grid shell to avoid layout disruption
  - `frontend/css/style.css` — design tokens, layout, responsive rules
  - `frontend/js/auth.js` — REST calls to `/auth/*`, token storage
    (`sessionStorage`), `authedFetch()` with silent 401-refresh, `file://`
    protocol-safe `apiBase()`
  - `frontend/js/main.js` — orchestrator; wires DOM events to the socket and
    auth layers, manages `messageStore`, drives the login flow
  - `frontend/js/contacts.js` — REST calls to `/contacts/*` using `authedFetch`
  - `frontend/js/ui.js` — pure DOM rendering, no network logic
  - `frontend/js/websocket.js` — `ChatSocket` class: connection lifecycle,
    token-first handshake, reconnection backoff, auth-failure callback,
    `file://`-safe host detection
  - `frontend/assets/` — `Chat-bg.png` (ink-wash background), `branch.svg`,
    `mountains.svg`
- **Fonts:** `Shippori Mincho` (display) + `Zen Kaku Gothic New` (body)

### Landing / Marketing Site (`shizukasa-website/`)

- **Stack:** TanStack Start, React, TypeScript, Tailwind CSS v4, shadcn/ui
  (Radix primitives), Vite, Bun
- Single-page design with ink-wash hero, CTA, and contact footer
- Reveal-on-scroll animations via `IntersectionObserver`
- Live JST clock in the navigation bar

### Message flow (current)

```
Client A ──(WS: {token: "..."})──→ FastAPI /ws
                                       │
                            _authenticate_socket() → decode JWT → user_id
                                       │
                            ConnectionManager.register(user_id, ws)
                                       │
Client A ──(WS: {to, message})───→ FastAPI /ws
                                       │
                            ConnectionManager.send_to_user(to, payload)
                                       │
                                       ▼
                            Client B ←(WS: {from, message})
```

### Auth flow

```
Client ──POST /auth/request-otp──→ Server (generates OTP, stores in DB)
Client ──POST /auth/verify-otp───→ Server (validates OTP, creates user if new,
                                           returns access + refresh JWT)
Client ──POST /auth/refresh──────→ Server (exchanges refresh token for new pair)
Client ──GET  /contacts/ ────────→ Server (Bearer token required)
```

---

## Getting Started

### Backend

```bash
cd e2e-chat
pip install -r requirements.txt
cd backend
uvicorn app.main:app --reload
```

Server runs at `http://localhost:8000`.

- API docs: `http://localhost:8000/docs`
- WebSocket endpoint: `ws://localhost:8000/ws`
  (first message after connect must be `{"token": "<access_token>"}`)

### Frontend

Open `frontend/index.html` in a browser (or serve it statically). You will be
presented with a login overlay — enter a phone number, receive a dev-only OTP
code displayed on screen, verify it, and you're into the chat UI. Open two
browser windows/tabs with different phone numbers (e.g. `+1111111111` and
`+2222222222`) to test 1-on-1 delivery.

### Landing Site

```bash
cd shizukasa-website
bun install          # or npm install
bun run dev          # or npm run dev
```

---

## Roadmap

| Phase | Scope                                                       | Status        |
| ----- | ----------------------------------------------------------- | ------------- |
| 1     | Bare-bones WebSocket send/receive                           | ✅ Done       |
| 2a    | OTP auth + JWT tokens + contact management                  | ✅ Done       |
| 2b    | Gate WebSocket endpoint behind auth                         | ✅ Done       |
| 2c    | Wire frontend to auth endpoints + login UI                  | ✅ Done       |
| 3     | End-to-end encryption (HKDF-based ratchet, forward secrecy) | Planned       |
| 4     | Reliable delivery + minimized server-side metadata logging  | Planned       |
| 5     | Presence (online/offline, last seen)                        | Planned       |
| 6     | Multi-device sync                                           | Planned       |
| 7     | Scaling considerations                                      | Deprioritized |

**Near-term to-dos:**

- Client-side key storage via IndexedDB with non-extractable WebCrypto keys,
  backed by strict CSP headers
- Replace dev-only OTP echo with a real SMS provider (Twilio, etc.)
- Optionally replace phone-number identity with username/passphrase-based auth
- Origin header validation and WebSocket URL escaping on the server-side
  handshake
- Persist messages server-side (currently in-memory `messageStore` per tab)

---

## Security Notes

- Private keys are intended to stay client-side only; the server only ever
  holds public keys.
- An earlier idea of spinning up an ephemeral server per session (with data
  wiped on close) was explored and shelved in favor of a more conventional
  persistent-server model with minimized metadata retention.
- `send_to_user()` deliberately replaces an earlier broadcast-based approach —
  broadcasting is the wrong pattern for a strictly 1-on-1 app.
- `textContent` (not `innerHTML`) is used throughout `ui.js` to prevent HTML
  injection from peer-supplied message content.
- The WebSocket `/ws` endpoint is gated behind JWT authentication — the
  client must send a valid access token as its first message; the server
  validates it and closes the socket with code `4001` on failure.
- Malformed websocket auth payloads and message frames are rejected with JSON
  error payloads instead of crashing the connection, while failed auth closes
  the socket immediately to protect the handshake.
- Duplicate socket registrations for the same user are cleaned up on disconnect,
  preventing stale connections from lingering and receiving future messages.
- CORS is enabled for local file-origin and dev-server access in `app/main.py`;
  it should be tightened before deploying to production.
- OTP codes are currently returned in the API response (`otp_dev_only`) for
  development convenience — this field must be removed before production.

---

## Tech Stack

- **Backend:** Python, FastAPI, WebSockets, SQLAlchemy, Pydantic, python-jose, Uvicorn
- **Frontend:** HTML, CSS, JavaScript (no framework), Google Fonts
- **Landing Site:** TanStack Start, React, TypeScript, Tailwind CSS v4, shadcn/ui, Vite, Bun
- **Security (planned):** Web Crypto API, HKDF ratchet, IndexedDB, CSP

---

## License

_Not yet decided._
