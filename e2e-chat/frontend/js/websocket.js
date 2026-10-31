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
    this.stopped = false; // set by disconnect(), an auth rejection, or a 4002 close
  }

  connect() {
    if (this.stopped) return;

    // When opened via file:// (double-clicking index.html) or on a dev
    // server that isn't port 8000, point the socket at localhost:8000.
    let protocol;
    let host;
    if (location.protocol === "file:" || !location.hostname) {
      protocol = "ws";
      host = "localhost:8000";
    } else {
      protocol = location.protocol === "https:" ? "wss" : "ws";
      host = `${location.hostname}:8000`;
    }

    if (this.onStatusChange) this.onStatusChange("connecting");
    this.authenticated = false;

    const sock = new WebSocket(`${protocol}://${host}/ws`);
    this.socket = sock;

    sock.onopen = () => {
      sock.send(JSON.stringify({ token: this.getAccessToken() }));
    };

    sock.onmessage = (event) => {
      if (this.socket !== sock) return;

      if (!this.authenticated) {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        if (data.error) {
          console.error("[websocket] auth failed:", data.error);
          this.stopped = true; // never retry with a token the server rejected
          sock.close();
          if (this.onAuthFailure) this.onAuthFailure(data.error);
          return;
        }
        this.authenticated = true;
        this.reconnectAttempts = 0;
        if (this.onStatusChange) this.onStatusChange("online");
        return;
      }

      this.onMessage(event.data);
    };

    sock.onclose = (event) => {
      if (this.socket !== sock) return; // a newer socket has taken over
      if (this.onStatusChange) this.onStatusChange("offline");
      if (event.code === 4002) {
        console.warn("[websocket] signed in from another tab/device — not reconnecting");
        this.stopped = true;
        return;
      }
      if (!this.stopped) this.scheduleReconnect();
    };

    sock.onerror = (err) => {
      console.error("[websocket] error", err);
    };
  }

  scheduleReconnect() {
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 10000);
    this.reconnectAttempts += 1;
    setTimeout(() => this.connect(), delay);
  }

  disconnect() {
    this.stopped = true;
    if (this.socket) this.socket.close();
  }

  // Returns true if the message was sent, false otherwise.
  send(to, message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.authenticated) {
      this.socket.send(JSON.stringify({ to, message }));
      return true;
    }
    console.warn("[websocket] cannot send — socket not authenticated/open");
    return false;
  }
}
