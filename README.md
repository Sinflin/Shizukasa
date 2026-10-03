# Shizukasa (静かな会話) — E2E Encrypted Chat App

A security-focused, one-on-one encrypted messaging web app with a Japanese
ink-wash aesthetic. Built as a from-scratch exploration of real-time delivery,
WebSocket architecture, and end-to-end encryption — not a WhatsApp clone, but
inspired by the same core problems (delivery guarantees, presence, multi-device
sync) at a much smaller scale.

> This is the chat application itself. The separate marketing/landing site for
> Shizukasa lives in its own repo ([Sinflin/Shizukasa](https://github.com/Sinflin/Shizukasa))
> and is not part of this codebase.

---

## Status

**Phase 1 — Bare-bones WebSocket messaging: ✅ Complete**
**Phase 2 — Auth & contacts: 🟡 In progress**

The app supports live 1-on-1 text messaging over WebSockets between two
connected clients. Phase 2 backend is scaffolded — OTP-based phone-number
authentication, JWT access/refresh tokens, and contact management endpoints
are implemented. The OTP service is currently mocked (returns the code
directly in the API response) pending a real SMS provider. The WebSocket
endpoint is not yet gated behind auth (planned for Phase 2b).

---

## Features (planned, per project spec)

- End-to-end encryption (client-side, private keys never leave the device)
- One-on-one messaging only (no group chat, by design)
- Reliable message delivery over a persistent WebSocket connection
- Offline message handling or graceful reconnection
- Architecture considerations for scale (though scaling is explicitly
  deprioritized until later phases)

## Features (currently working)

- WebSocket connection per user (`/ws/{user_id}`)
- Targeted 1-on-1 delivery via `send_to_user()` (not broadcast)
- Malformed JSON handling without dropping the connection
- Stale-socket cleanup on duplicate connections from the same user
- 2-panel chat UI (sidebar + thread) with a warm paper-and-ink-brown theme
- Exponential-backoff auto-reconnect on the client
- Mobile-responsive layout (collapses to single panel under 760px)
- OTP-based phone-number authentication (`/auth/request-otp`, `/auth/verify-otp`)
- JWT access & refresh token flow (`/auth/refresh`)
- Contact management — add and list contacts (`/contacts/add`, `/contacts/`)
- SQLite database with auto-created tables (Users, OTP requests, Contacts)

---

## Architecture

### Backend
- **Framework:** Python, FastAPI
- **Transport:** WebSockets (`fastapi.WebSocket`)
- **Database:** SQLite via SQLAlchemy (auto-created on first run)
- **Auth:** phone number + OTP (WhatsApp-style) → JWT (access + refresh tokens)
- **Structure:**
  - `app/main.py` — app entrypoint, mounts routers, defines `/ws/{user_id}`
  - `app/config.py` — centralised settings via `pydantic-settings`
  - `app/database.py` — SQLAlchemy engine, session factory, `Base`
  - `app/dependencies.py` — `get_current_user` dependency (Bearer token → User)
  - `app/models/` — `User` (keyed by phone number), `OTPRequest`, `Contact`
    (owner ↔ contact, unique constraint)
  - `app/schemas/` — Pydantic request/response models for auth and contacts
  - `app/services/` — `jwt_handler.py` (create/decode access & refresh JWTs),
    `otp_service.py` (generate OTP, verify, mark used)
  - `app/routers/` — `auth.py`, `contact.py`
  - `app/websocket/connection_manager.py` — tracks active connections,
    handles connect/disconnect and targeted message delivery
- **Identity model:** phone number is the unified key across JWT `sub`
  claims, WebSocket `user_id` routing, and contact relationships

### Frontend
- **Stack:** Vanilla HTML/CSS/JS (no framework)
- **Structure:**
  - `frontend/index.html` — shell markup (sidebar + thread panel + composer)
  - `frontend/css/style.css` — design tokens, layout, responsive rules
  - `frontend/js/main.js` — orchestrator; wires DOM events to the socket layer
  - `frontend/js/ui.js` — pure DOM rendering, no network logic
  - `frontend/js/websocket.js` — connection lifecycle, reconnection backoff
- **Fonts:** `Shippori Mincho` (display) + `Zen Kaku Gothic New` (body)

### Message flow (current)
```
Client A ─(WS: {to, message})→ FastAPI /ws/{user_id}
                                     │
                          ConnectionManager.send_to_user(to, payload)
                                     │
                                     ▼
                          Client B ←(WS: {from, message})
```

### Auth flow (Phase 2)
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
- WebSocket endpoint: `ws://localhost:8000/ws/{user_id}`

### Frontend
Open `frontend/index.html` in a browser (or serve it statically). On load,
you'll be prompted for a test `user_id` — open two browser windows/tabs with
different IDs (e.g. `alice` and `bob`) to test 1-on-1 delivery, and use the
sidebar to select which conversation you're sending to.

---

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 1 | Bare-bones WebSocket send/receive | ✅ Done |
| 2a | OTP auth + JWT tokens + contact management | ✅ Done |
| 2b | Gate WebSocket endpoint behind auth | 🔜 Next |
| 3 | End-to-end encryption (HKDF-based ratchet, forward secrecy) | Planned |
| 4 | Reliable delivery + minimized server-side metadata logging | Planned |
| 5 | Presence (online/offline, last seen) | Planned |
| 6 | Multi-device sync | Planned |
| 7 | Scaling considerations | Deprioritized |

**Near-term to-dos:**
- Gate WebSocket connections with a valid access token (Phase 2b)
- Wire the frontend to the new auth endpoints
- Finalize the cherry-blossom ink-wash SVG asset for the thread background
- Client-side key storage via IndexedDB with non-extractable WebCrypto keys,
  backed by strict CSP headers
- Replace dev-only OTP echo with a real SMS provider (Twilio, etc.)
- Optionally replace phone-number identity with username/passphrase-based auth

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
- Origin header validation and WebSocket URL escaping are cheap fixes
  identified for the WebSocket handshake — don't need to wait for Phase 2b.
- OTP codes are currently returned in the API response (`otp_dev_only`) for
  development convenience — this field must be removed before production.

---

## Tech Stack

- **Backend:** Python, FastAPI, WebSockets, SQLAlchemy, Pydantic, python-jose, Uvicorn
- **Frontend:** HTML, CSS, JavaScript (no framework), Google Fonts
- **Security (planned):** Web Crypto API, HKDF ratchet, IndexedDB, CSP

---

## License

_Not yet decided._
