// Handles the raw WebSocket connection to the backend.
// No UI logic lives here — this file only talks to the network.

export class ChatSocket {
  constructor(userId, onMessage) {
    this.userId = userId;
    this.onMessage = onMessage;
    this.socket = null;
    this.reconnectAttempts = 0;
  }

  connect() {
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    this.socket = new WebSocket(`${protocol}://${location.host}/ws/${this.userId}`);

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      console.log("[websocket] connected as", this.userId);
    };

    this.socket.onmessage = (event) => {
      this.onMessage(event.data);
    };

    this.socket.onclose = () => {
      console.log("[websocket] disconnected — retrying...");
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