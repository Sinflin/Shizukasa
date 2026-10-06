import { ChatSocket } from "./websocket.js";
import { requestOtp, verifyOtp, getAccessToken, isLoggedIn } from "./auth.js";
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

const messageStore = {};
let chat = null;
let pendingPhoneNumber = "";

// ---------- Login flow DOM refs ----------
const loginOverlay = document.getElementById("login-overlay");
const phoneForm = document.getElementById("phone-form");
const phoneInput = document.getElementById("phone-input");
const phoneError = document.getElementById("phone-error");
const otpForm = document.getElementById("otp-form");
const otpInput = document.getElementById("otp-input");
const otpError = document.getElementById("otp-error");
const otpDevHint = document.getElementById("otp-dev-hint");
const otpBackBtn = document.getElementById("otp-back-btn");

// ---------- Auto-login: skip the overlay if a token already exists ----------
// sessionStorage persists across page refreshes within the same tab,
// so we can go straight to chat without asking the user to re-authenticate.
if (isLoggedIn()) {
  loginOverlay.classList.add("hidden");
  startChat();
}

// ---------- Login flow ----------

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

// ---------- Chat (unchanged logic, now gated behind login) ----------
function startChat() {
  chat = new ChatSocket(
    getAccessToken,
    handleIncoming,
    (status) => setConnectionStatus(status),
    (authError) => {
      // Token rejected/expired — drop back to login rather than loop forever.
      console.error("[main] auth failed:", authError);
      loginOverlay.classList.remove("hidden");
      otpForm.classList.add("hidden");
      phoneForm.classList.remove("hidden");
    }
  );
  chat.connect();

  const form = document.getElementById("message-form");
  const input = document.getElementById("message-input");
  const conversationList = document.getElementById("conversation-list");
  const searchInput = document.getElementById("search-conversations");
  const backBtn = document.getElementById("back-to-sidebar");

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
}

function loadConversationThread(userId) {
  clearThread();
  const history = messageStore[userId] || [];
  history.forEach((msg) => renderMessage(msg));
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

  if (!messageStore[senderId]) messageStore[senderId] = [];
  const msgObj = { text: messageText, direction: "incoming", time: timeStr };
  messageStore[senderId].push(msgObj);

  if (getActiveUserId() === senderId) renderMessage(msgObj);
  updateSidebarPreview(senderId, messageText, timeStr);
}