
# Project Title

A brief description of what this project does and who it's for

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
**Phase 2 — Auth & contacts: 🔜 Not started**

The app currently supports live 1-on-1 text messaging over WebSockets between
two connected clients. There is no persistence, authentication, or encryption
yet — messages only exist for the duration of the connection.

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

---

## Architecture

### Backend
- **Framework:** Python, FastAPI
- **Transport:** WebSockets (`fastapi.WebSocket`)
- **Structure:**
  - `main.py` — app entrypoint, defines the `/ws/{user_id}` endpoint
  - `app/websocket/connection_manager.py` — tracks active connections,
    handles connect/disconnect and targeted message delivery
- **Planned additions:** SQLAlchemy models, Pydantic schemas, JWT auth,
  key management endpoints

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

---

## Getting Started

### Backend
```bash
pip install -r requirements.txt
uvicorn main:app --reload
```
Server runs at `http://localhost:8000`. WebSocket endpoint:
`ws://localhost:8000/ws/{user_id}`.

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
| 2 | JWT authentication + contact management | 🔜 Next |
| 3 | End-to-end encryption (HKDF-based ratchet, forward secrecy) | Planned |
| 4 | Reliable delivery + minimized server-side metadata logging | Planned |
| 5 | Presence (online/offline, last seen) | Planned |
| 6 | Multi-device sync | Planned |
| 7 | Scaling considerations | Deprioritized |

**Near-term to-dos:**
- Finalize the cherry-blossom ink-wash SVG asset for the thread background
- Decide on phone-number vs. username/passphrase-based identity for auth
- Client-side key storage via IndexedDB with non-extractable WebCrypto keys,
  backed by strict CSP headers

---

## Security Notes

- Private keys are intended to stay client-side only; the server only ever
  holds public keys.
- An earlier idea of spinning up an ephemeral server per session (with data
  wiped on close) was explored and shelved in favor of a more conventional
  persistent-server model with minimized metadata retention.
- `send_to_user()` deliberately replaces an earlier broadcast-based approach —
  broadcasting is the wrong pattern for a strictly 1-on-1 app.

---

## Tech Stack

- **Backend:** Python, FastAPI, WebSockets, SQLAlchemy, Pydantic, Uvicorn
- **Frontend:** HTML, CSS, JavaScript (no framework), Google Fonts
- **Security (planned):** Web Crypto API, HKDF ratchet, IndexedDB, CSP

---

## License

_Not yet decided._