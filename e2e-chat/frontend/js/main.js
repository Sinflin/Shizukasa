import { ChatSocket } from "./websocket.js";
import {
  renderMessage,
  clearThread,
  setConnectionStatus,
  setActiveContactName,
  getActiveUserId,
  setActiveConversation,
  updateSidebarPreview,
  filterConversations,
  setSidebarVisibleMobile,
  currentTime,
} from "./ui.js";

// Message history per user ID
// Structure: { [userId]: Array<{ text, direction, time }> }
const messageStore = {};

function getPromptUserId() {
  let id = prompt("Enter your user id for testing (e.g. alice / bob):");
  if (id) id = id.trim();
  if (!id) {
    id = "user_" + Math.floor(Math.random() * 1000);
  }
  return id;
}

const myUserId = getPromptUserId();

const chat = new ChatSocket(myUserId, handleIncoming, (status) => {
  setConnectionStatus(status);
});
chat.connect();

const form = document.getElementById("message-form");
const input = document.getElementById("message-input");
const conversationList = document.getElementById("conversation-list");
const searchInput = document.getElementById("search-conversations");
const backBtn = document.getElementById("back-to-sidebar");

// Initialize active conversation thread on startup
const initialActiveUserId = getActiveUserId();
if (initialActiveUserId) {
  loadConversationThread(initialActiveUserId);
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  const to = getActiveUserId();
  if (!to) {
    console.warn("[main] no active conversation selected — nothing to send to");
    return;
  }

  const timeStr = currentTime();
  chat.send(to, text);

  // Store in message store
  if (!messageStore[to]) {
    messageStore[to] = [];
  }
  const msgObj = { text, direction: "outgoing", time: timeStr };
  messageStore[to].push(msgObj);

  renderMessage(msgObj);
  updateSidebarPreview(to, text, timeStr);
  input.value = "";
  input.focus();
});

conversationList.addEventListener("click", (e) => {
  const item = e.target.closest(".conversation-item");
  if (!item) return;

  const userId = item.dataset.userId;
  const name = item.querySelector(".convo-name")?.textContent || userId;

  setActiveConversation(userId);
  setActiveContactName(name);
  loadConversationThread(userId);

  // Mobile navigation support
  setSidebarVisibleMobile(false);
});

if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    filterConversations(e.target.value);
  });
}

if (backBtn) {
  backBtn.addEventListener("click", () => {
    setSidebarVisibleMobile(true);
  });
}

function loadConversationThread(userId) {
  clearThread();
  const history = messageStore[userId] || [];
  history.forEach((msg) => {
    renderMessage(msg);
  });
}

function handleIncoming(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    console.error("[main] received non-JSON payload:", raw);
    return;
  }

  if (data.error) {
    console.error("[main] server rejected our last message:", data.error);
    return;
  }

  const senderId = data.from;
  const messageText = data.message;
  const timeStr = currentTime();

  if (!senderId || !messageText) return;

  // Store incoming message for senderId
  if (!messageStore[senderId]) {
    messageStore[senderId] = [];
  }
  const msgObj = { text: messageText, direction: "incoming", time: timeStr };
  messageStore[senderId].push(msgObj);

  // If the incoming message is from currently active conversation, render it
  if (getActiveUserId() === senderId) {
    renderMessage(msgObj);
  }

  // Update preview snippet in sidebar
  updateSidebarPreview(senderId, messageText, timeStr);
}