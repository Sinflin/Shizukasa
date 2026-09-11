// Pure DOM rendering. No WebSocket or network logic lives here —
// main.js calls these functions, this file only touches the DOM.

const threadEl = document.getElementById("message-thread");
const emptyStateEl = document.getElementById("empty-state");
const connectionDot = document.getElementById("connection-dot");
const activeNameEl = document.getElementById("active-contact-name");
const activeStatusEl = document.getElementById("active-contact-status");
const sidebarEl = document.getElementById("sidebar");

// Appends one message bubble to the thread and scrolls to the bottom.
// direction must be "incoming" or "outgoing" — matches the CSS classes
// already styled in style.css (.message.incoming / .message.outgoing).
export function renderMessage({ text, direction, time }) {
  if (emptyStateEl) emptyStateEl.style.display = "none";

  const wrapper = document.createElement("div");
  wrapper.className = `message ${direction}`;

  const bubble = document.createElement("span");
  bubble.className = "bubble";
  bubble.textContent = text; // textContent, not innerHTML — don't let peer input render as HTML

  const meta = document.createElement("span");
  meta.className = "meta";
  meta.textContent = time || currentTime();

  wrapper.appendChild(bubble);
  wrapper.appendChild(meta);
  threadEl.appendChild(wrapper);

  threadEl.scrollTop = threadEl.scrollHeight;
}

export function clearThread() {
  if (!threadEl) return;
  const messages = threadEl.querySelectorAll(".message");
  messages.forEach((msg) => msg.remove());

  if (emptyStateEl) {
    emptyStateEl.style.display = "";
  }
}

// Toggles the header dot + status text.
export function setConnectionStatus(status) {
  if (typeof status === "boolean") {
    status = status ? "online" : "offline";
  }

  const isOnline = status === "online";
  if (connectionDot) {
    connectionDot.classList.toggle("online", isOnline);
  }

  if (activeStatusEl) {
    if (status === "online") {
      activeStatusEl.textContent = "Online";
    } else if (status === "connecting") {
      activeStatusEl.textContent = "Connecting...";
    } else {
      activeStatusEl.textContent = "Offline";
    }
  }
}

export function setActiveContactName(name) {
  if (activeNameEl) {
    activeNameEl.textContent = name;
  }
}

// Reads which sidebar conversation is currently marked .active and
// returns its data-user-id — this is who chat.send() will target.
export function getActiveUserId() {
  const activeItem = document.querySelector(".conversation-item.active");
  return activeItem ? activeItem.dataset.userId : null;
}

export function setActiveConversation(userId) {
  document.querySelectorAll(".conversation-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.userId === userId);
  });
}

export function updateSidebarPreview(userId, text, time) {
  const item = document.querySelector(`.conversation-item[data-user-id="${userId}"]`);
  if (!item) return;

  const previewEl = item.querySelector(".convo-preview");
  const timeEl = item.querySelector(".convo-time");

  if (previewEl) previewEl.textContent = text;
  if (timeEl) timeEl.textContent = time || currentTime();
}

export function filterConversations(query) {
  const q = query.trim().toLowerCase();
  document.querySelectorAll(".conversation-item").forEach((item) => {
    const name = item.querySelector(".convo-name")?.textContent.toLowerCase() || "";
    const preview = item.querySelector(".convo-preview")?.textContent.toLowerCase() || "";
    const matches = name.includes(q) || preview.includes(q);
    item.style.display = matches ? "" : "none";
  });
}

export function setSidebarVisibleMobile(visible) {
  if (sidebarEl) {
    sidebarEl.classList.toggle("hidden", !visible);
  }
}

export function currentTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}