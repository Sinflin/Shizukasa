// Handles the raw WebSocket connection to the backend.
// No UI logic lives here — this file only talks to the network.

export class ChatSocket {
  constructor(getAccessToken, onMessage, onStatusChange = null, onAuthFailure = null) {
    this.getAccessToken = getAccessToken;
    this.onMessage = onMessage;
    this.onStatusChange = onStatusChange;
    this.onAuthFailure = onAuthFailure;
    this.socket = null;
    this.reconnectAttempts = 0;
    this.authenticated = false;
  }

  connect() {
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    let host = location.host;
    if (!host || location.protocol === "file:" || (location.port && location.port !== "8000")) {
      const hostname = location.hostname || "localhost";
      host = `${hostname}:8000`;
    }

    if (this.onStatusChange) this.onStatusChange("connecting");
    this.authenticated = false;

    this.socket = new WebSocket(`${protocol}://${host}/ws`);

    this.socket.onopen = () => {
      // First message must be the token — server won't accept chat
      // traffic until this succeeds.
      this.socket.send(JSON.stringify({ token: this.getAccessToken() }));
    };

    this.socket.onmessage = (event) => {
      if (!this.authenticated) {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        if (data.error) {
          console.error("[websocket] auth failed:", data.error);
          if (this.onAuthFailure) this.onAuthFailure(data.error);
          this.socket.close();
          return;
        }
        // {"message": "authenticated"} — the handshake succeeded.
        this.authenticated = true;
        this.reconnectAttempts = 0;
        if (this.onStatusChange) this.onStatusChange("online");
        return;
      }

      this.onMessage(event.data);
    };

    this.socket.onclose = () => {
      if (this.onStatusChange) this.onStatusChange("offline");
      this.scheduleReconnect();
    };

    this.socket.onerror = (err) => {
      console.error("[websocket] error", err);
    };
  }

  scheduleReconnect() {
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 10000);
    this.reconnectAttempts += 1;
    setTimeout(() => this.connect(), delay);
  }

  send(to, message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.authenticated) {
      this.socket.send(JSON.stringify({ to, message }));
    } else {
      console.warn("[websocket] cannot send — socket not authenticated/open");
    }
  }
}