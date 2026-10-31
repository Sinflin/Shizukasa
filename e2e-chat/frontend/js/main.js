import { ChatSocket } from "./websocket.js";
import {
  requestOtp,
  verifyOtp,
  refreshAccessToken,
  getAccessToken,
  isLoggedIn,
  clearSession,
} from "./auth.js";
import { fetchContacts, addContact } from "./contacts.js";
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
  addConversationItem,
  clearConversationList,
} from "./ui.js";

const messageStore = {}; // per-peer history, in memory only
let chat = null;
let pendingPhoneNumber = "";
let recoveringAuth = false;

// ---------- DOM refs ----------
const loginOverlay = document.getElementById("login-overlay");
const phoneForm = document.getElementById("phone-form");
const phoneInput = document.getElementById("phone-input");
const phoneError = document.getElementById("phone-error");
const otpForm = document.getElementById("otp-form");
const otpInput = document.getElementById("otp-input");
const otpError = document.getElementById("otp-error");
const otpDevHint = document.getElementById("otp-dev-hint");
const otpBackBtn = document.getElementById("otp-back-btn");

const form = document.getElementById("message-form");
const input = document.getElementById("message-input");
const conversationList = document.getElementById("conversation-list");
const searchInput = document.getElementById("search-conversations");
const backBtn = document.getElementById("back-to-sidebar");
const addContactForm = document.getElementById("add-contact-form");
const addContactInput = document.getElementById("add-contact-input");
const addContactError = document.getElementById("add-contact-error");

function isSessionError(err) {
  return err.message.startsWith("Session expired") || err.message === "Not authenticated";
}

// ---------- Login flow ----------
function showLogin() {
  if (chat) chat.disconnect();
  chat = null;
  // A different user may log in next — nothing from this session should survive.
  Object.keys(messageStore).forEach((k) => delete messageStore[k]);
  clearConversationList();
  clearThread();
  setActiveContactName("Select a conversation");
  loginOverlay.classList.remove("hidden");
  otpForm.classList.add("hidden");
  phoneForm.classList.remove("hidden");
  otpInput.value = "";
  otpError.textContent = "";
}

phoneForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  phoneError.textContent = "";
  pendingPhoneNumber = phoneInput.value.trim();
  if (!pendingPhoneNumber) return;

  try {
    const { otp_dev_only } = await requestOtp(pendingPhoneNumber);
    phoneForm.classList.add("hidden");
    otpForm.classList.remove("hidden");
    otpDevHint.textContent = `DEV ONLY — your code: ${otp_dev_only}`;
    otpInput.focus();
  } catch (err) {
    phoneError.textContent = err.message;
  }
});

otpForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  otpError.textContent = "";

  try {
    await verifyOtp(pendingPhoneNumber, otpInput.value.trim());
    loginOverlay.classList.add("hidden");
    startChat();
  } catch (err) {
    otpError.textContent = err.message;
  }
});

otpBackBtn.addEventListener("click", () => {
  otpForm.classList.add("hidden");
  phoneForm.classList.remove("hidden");
  otpInput.value = "";
  otpError.textContent = "";
});

// ---------- Socket + contacts ----------
function connectSocket() {
  if (chat) chat.disconnect();
  chat = new ChatSocket(getAccessToken, handleIncoming, setConnectionStatus, handleAuthFailure);
  chat.connect();
}

// Server rejected our token (usually the short-lived access token expiring).
// Try one refresh; only fall back to the login screen if that fails too.
async function handleAuthFailure(authError) {
  console.error("[main] socket auth failed:", authError);
  if (recoveringAuth) return;
  recoveringAuth = true;
  try {
    await refreshAccessToken();
    connectSocket();
  } catch {
    clearSession();
    showLogin();
  } finally {
    recoveringAuth = false;
  }
}

async function loadContacts() {
  clearConversationList();
  try {
    const contacts = await fetchContacts();
    contacts.forEach((c) => addConversationItem(c.contact_phone_number));
  } catch (err) {
    console.error("[main] failed to load contacts:", err);
    if (isSessionError(err)) {
      clearSession();
      showLogin();
    }
  }
}

function startChat() {
  setActiveContactName("Select a conversation");
  connectSocket();
  loadContacts();
}

// ---------- Add contact ----------
addContactForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  addContactError.textContent = "";
  const phone = addContactInput.value.trim();
  if (!phone) return;

  try {
    const contact = await addContact(phone);
    addConversationItem(contact.contact_phone_number);
    addContactInput.value = "";
  } catch (err) {
    addContactError.textContent = err.message;
    if (isSessionError(err)) {
      clearSession();
      showLogin();
    }
  }
});

// ---------- Chat UI (listeners bound once, at load) ----------
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text || !chat) return;

  const to = getActiveUserId();
  if (!to) {
    console.warn("[main] no active conversation selected — nothing to send to");
    return;
  }

  const timeStr = currentTime();
  const sent = chat.send(to, text);
  if (!sent) {
    console.warn("[main] message not sent — connection is down");
    return;
  }

  if (!messageStore[to]) messageStore[to] = [];
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
  setSidebarVisibleMobile(false);
});

if (searchInput) {
  searchInput.addEventListener("input", (e) => filterConversations(e.target.value));
}

if (backBtn) {
  backBtn.addEventListener("click", () => setSidebarVisibleMobile(true));
}

function loadConversationThread(userId) {
  clearThread();
  (messageStore[userId] || []).forEach((msg) => renderMessage(msg));
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

  // A sender who isn't in our contacts still gets a sidebar entry
  // (local only — it isn't saved as a contact).
  addConversationItem(senderId);

  if (!messageStore[senderId]) messageStore[senderId] = [];
  const msgObj = { text: messageText, direction: "incoming", time: timeStr };
  messageStore[senderId].push(msgObj);

  if (getActiveUserId() === senderId) renderMessage(msgObj);
  updateSidebarPreview(senderId, messageText, timeStr);
}

// ---------- Boot ----------
// sessionStorage survives a refresh within the tab, so skip the login screen
// if a token exists. A dead token falls back to login via handleAuthFailure.
setActiveContactName("Select a conversation");
if (isLoggedIn()) {
  loginOverlay.classList.add("hidden");
  startChat();
}