(() => {
  "use strict";

  // The UI is served by the same FastAPI app, so the API can use same-origin URLs.
  const API_BASE = "";
  const MAX_QUESTION_LENGTH = 4000;

  const form = document.getElementById("chat-form");
  const input = document.getElementById("question-input");
  const sendButton = document.getElementById("send-button");
  const messageList = document.getElementById("message-list");
  const resetButton = document.getElementById("reset-chat");
  const charCount = document.getElementById("char-count");
  const connectionPill = document.getElementById("connection-pill");
  const connectionText = document.getElementById("connection-text");
  const toast = document.getElementById("toast");
  const originalSendLabel = sendButton.querySelector("span").textContent;

  let isLoading = false;
  let toastTimer = null;

  document.getElementById("current-year").textContent = String(new Date().getFullYear());

  function localTime() {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date());
  }

  function setConnectionState(state, text) {
    connectionPill.classList.remove("is-connected", "is-error");
    if (state === "connected") connectionPill.classList.add("is-connected");
    if (state === "error") connectionPill.classList.add("is-error");
    connectionText.textContent = text;
  }

  async function checkBackend() {
    try {
      const response = await fetch(`${API_BASE}/api/info`, { method: "GET", cache: "no-store" });
      if (!response.ok) throw new Error(`Backend returned ${response.status}`);
      const info = await response.json();
      if (info.github_url) {
        document.querySelectorAll(".github-link").forEach((link) => { link.href = info.github_url; });
      }
      setConnectionState("connected", "Backend connected");
    } catch (error) {
      setConnectionState("error", "Backend unavailable");
    }
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 4500);
  }

  function makeMessage(role, content, options = {}) {
    const row = document.createElement("div");
    row.className = `message-row ${role}${options.error ? " error" : ""}`;
    if (options.thinking) row.classList.add("thinking-row");

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = role === "user" ? "AK" : "AI";
    avatar.setAttribute("aria-hidden", "true");

    const contentWrap = document.createElement("div");
    contentWrap.className = "message-content";

    const meta = document.createElement("div");
    meta.className = "message-meta";
    const name = document.createElement("span");
    name.textContent = role === "user" ? "You" : "Resume assistant";
    const time = document.createElement("span");
    time.className = "message-time";
    time.textContent = localTime();
    meta.append(name, time);

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    if (options.thinking) {
      bubble.setAttribute("aria-label", "Assistant is thinking");
      const dots = document.createElement("span");
      dots.className = "thinking-dots";
      dots.innerHTML = "<span></span><span></span><span></span>";
      bubble.appendChild(dots);
    } else {
      // textContent keeps model output as plain text and prevents injected HTML from executing.
      bubble.textContent = content;
    }

    contentWrap.append(meta, bubble);
    row.append(avatar, contentWrap);
    return row;
  }

  function appendMessage(role, content, options = {}) {
    const welcome = document.getElementById("welcome-state");
    if (welcome) welcome.remove();
    const row = makeMessage(role, content, options);
    messageList.appendChild(row);
    messageList.scrollTop = messageList.scrollHeight;
    return row;
  }

  function addWelcomeState() {
    const wrapper = document.createElement("div");
    wrapper.className = "welcome-state";
    wrapper.id = "welcome-state";

    const icon = document.createElement("div");
    icon.className = "welcome-icon";
    icon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1"/><circle cx="12" cy="12" r="5"/></svg>';
    const kicker = document.createElement("p");
    kicker.className = "welcome-kicker";
    kicker.textContent = "YOUR CONVERSATION STARTS HERE";
    const heading = document.createElement("h4");
    heading.textContent = "What would you like to know?";
    const description = document.createElement("p");
    description.className = "welcome-description";
    description.textContent = "Ask about skills, projects, education, or experience. The assistant will stick to what the resume actually says.";
    const grid = document.createElement("div");
    grid.className = "welcome-prompt-grid";

    const prompts = [
      ["↗", "Profile overview", "Give me the quick summary", "Summarize the candidate's profile in a few sentences.", "purple"],
      ["⌘", "Technical skills", "Explore the listed skill set", "What technical skills are listed in the resume?", "mint"],
      ["▧", "Projects", "See the work mentioned", "Which projects are mentioned in the resume? Summarize each briefly.", "peach"],
      ["⌑", "Education", "Check academic details", "What education details are included in the resume?", "blue"],
    ];
    prompts.forEach(([symbol, title, subtitle, question, color]) => {
      const button = document.createElement("button");
      button.className = "prompt-card";
      button.type = "button";
      button.dataset.prompt = question;
      const promptIcon = document.createElement("span");
      promptIcon.className = `prompt-icon ${color}`;
      promptIcon.textContent = symbol;
      const textWrap = document.createElement("span");
      const strong = document.createElement("strong");
      strong.textContent = title;
      const small = document.createElement("small");
      small.textContent = subtitle;
      textWrap.append(strong, small);
      const arrow = document.createElement("span");
      arrow.className = "prompt-arrow";
      arrow.textContent = "↗";
      button.append(promptIcon, textWrap, arrow);
      grid.appendChild(button);
    });
    wrapper.append(icon, kicker, heading, description, grid);
    messageList.appendChild(wrapper);
  }

  function setBusy(busy) {
    isLoading = busy;
    sendButton.disabled = busy;
    input.disabled = busy;
    resetButton.disabled = busy;
    sendButton.classList.toggle("is-loading", busy);
    sendButton.querySelector("span").textContent = busy ? "Thinking…" : originalSendLabel;
    sendButton.setAttribute("aria-busy", String(busy));
    if (!busy) input.focus();
  }

  function resizeInput() {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 130)}px`;
    charCount.textContent = `${input.value.length} / ${MAX_QUESTION_LENGTH}`;
  }

  async function sendQuestion(question) {
    const cleaned = question.trim();
    if (!cleaned || isLoading) return;
    if (cleaned.length > MAX_QUESTION_LENGTH) {
      showToast(`Please keep the question under ${MAX_QUESTION_LENGTH} characters.`);
      return;
    }

    appendMessage("user", cleaned);
    input.value = "";
    resizeInput();
    setBusy(true);
    const thinkingRow = appendMessage("assistant", "", { thinking: true });

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: cleaned }),
      });

      let payload = {};
      try { payload = await response.json(); } catch { /* A non-JSON response gets a clear generic error below. */ }
      if (!response.ok) {
        const detail = typeof payload.detail === "string" ? payload.detail : `Request failed with status ${response.status}.`;
        throw new Error(detail);
      }
      if (typeof payload.answer !== "string" || !payload.answer.trim()) {
        throw new Error("The AI provider returned an empty answer. Try the question again.");
      }
      thinkingRow.remove();
      appendMessage("assistant", payload.answer.trim());
      setConnectionState("connected", "Backend connected");
    } catch (error) {
      thinkingRow.remove();
      const isNetworkError = error instanceof TypeError;
      const message = isNetworkError
        ? "Could not reach the API. Check that FastAPI is running and that this page is being served by the same app."
        : error.message || "Something went wrong while getting the answer.";
      appendMessage("assistant", message, { error: true });
      if (isNetworkError) setConnectionState("error", "Backend unavailable");
      showToast(message);
    } finally {
      setBusy(false);
      messageList.scrollTop = messageList.scrollHeight;
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    sendQuestion(input.value);
  });

  input.addEventListener("input", resizeInput);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  document.addEventListener("click", (event) => {
    const promptButton = event.target.closest("[data-prompt]");
    if (!promptButton || isLoading) return;
    input.value = promptButton.dataset.prompt || "";
    resizeInput();
    input.focus();
    form.requestSubmit();
  });

  resetButton.addEventListener("click", () => {
    if (isLoading) return;
    messageList.replaceChildren();
    addWelcomeState();
    input.value = "";
    resizeInput();
    input.focus();
  });

  resizeInput();
  checkBackend();
})();
