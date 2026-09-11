// Handles the raw WebSocket connection to the backend.
// No UI logic lives here — this file only talks to the network.

export class ChatSocket {
  constructor(userId, onMessage, onStatusChange = null) {
    this.userId = userId;
    this.onMessage = onMessage;
    this.onStatusChange = onStatusChange;
    this.socket = null;
    this.reconnectAttempts = 0;
  }

  connect() {
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    let host = location.host;
    if (!host || location.protocol === "file:" || (location.port && location.port !== "8000")) {
      const hostname = location.hostname || "localhost";
      host = `${hostname}:8000`;
    }

    if (this.onStatusChange) {
      this.onStatusChange("connecting");
    }

    this.socket = new WebSocket(`${protocol}://${host}/ws/${this.userId}`);

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      console.log("[websocket] connected as", this.userId);
      if (this.onStatusChange) {
        this.onStatusChange("online");
      }
    };

    this.socket.onmessage = (event) => {
      this.onMessage(event.data);
    };

    this.socket.onclose = () => {
      console.log("[websocket] disconnected — retrying...");
      if (this.onStatusChange) {
        this.onStatusChange("offline");
      }
      this.scheduleReconnect();
    };

    this.socket.onerror = (err) => {
      console.error("[websocket] error", err);
    };
  }

  // Backoff-based reconnect, matching the "Connection Recovery" step from the doc
  scheduleReconnect() {
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 10000);
    this.reconnectAttempts += 1;
    setTimeout(() => this.connect(), delay);
  }

  // Sends { to, message } — matches the backend's expected JSON payload
  send(to, message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ to, message }));
    } else {
      console.warn("[websocket] cannot send — socket not open");
    }
  }
}