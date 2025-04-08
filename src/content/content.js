console.log("[TTX Tool] Content script loaded.");

// =======================
// 🏗️  Initialization
// =======================
let lastSeenTransactionId = null;
let chatAlertInterval = null;
let previousUsername = null;

// Initialize the extension
function initExtension() {
  // uncomment createControlPanel if you want to show the control panel on load
  //createControlPanel();
  startMonitoring();
  setupKeyboardShortcut();
}

// =======================
// 🎛️  Control Panel UI
// =======================
function createControlPanel() {
  const panel = document.createElement("div");
  panel.id = "ttx-control-panel";
  Object.assign(panel.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: "9999",
    backgroundColor: "#18181b",
    borderRadius: "8px",
    padding: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    fontFamily: "Inter, sans-serif",
    color: "white",
    minWidth: "200px",
  });

  // Panel Header
  const header = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = "TTX Tool Controls";
  title.style.margin = "0 0 12px 0";
  title.style.color = "#9147ff";

  const closeBtn = document.createElement("div");
  closeBtn.innerHTML = "&times;";
  closeBtn.style.position = "absolute";
  closeBtn.style.top = "8px";
  closeBtn.style.right = "8px";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.fontSize = "18px";
  closeBtn.onclick = () => panel.remove();

  header.appendChild(title);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  // Control Elements
  panel.appendChild(createToggleControl("Stock Badge", toggleStockBadge));
  panel.appendChild(createToggleControl("Chat Alerts", toggleChatAlerts));
  panel.appendChild(createRefreshButton());

  document.body.appendChild(panel);
  makeDraggable(panel);
}

function createToggleControl(label, onChange) {
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.justifyContent = "space-between";
  container.style.alignItems = "center";
  container.style.marginBottom = "8px";

  const labelEl = document.createElement("span");
  labelEl.textContent = label;
  container.appendChild(labelEl);

  const toggle = document.createElement("label");
  toggle.style.position = "relative";
  toggle.style.display = "inline-block";
  toggle.style.width = "40px";
  toggle.style.height = "20px";

  const slider = document.createElement("span");
  Object.assign(slider.style, {
    position: "absolute",
    cursor: "pointer",
    top: "0",
    left: "0",
    right: "0",
    bottom: "0",
    backgroundColor: "#3e3e3e",
    transition: ".4s",
    borderRadius: "20px",
  });

  const knob = document.createElement("span");
  Object.assign(knob.style, {
    position: "absolute",
    height: "16px",
    width: "16px",
    left: "2px",
    bottom: "2px",
    backgroundColor: "white",
    transition: ".4s",
    borderRadius: "50%",
  });

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.style.opacity = "0";
  checkbox.style.width = "0";
  checkbox.style.height = "0";

  // Set initial state
  chrome.storage.sync.get([`show${label.replace(" ", "")}`], (result) => {
    const isChecked = result[`show${label.replace(" ", "")}`] !== false;
    checkbox.checked = isChecked;
    updateToggleStyle(isChecked);
    onChange(isChecked);
  });

  checkbox.addEventListener("change", () => {
    updateToggleStyle(checkbox.checked);
    chrome.storage.sync.set({
      [`show${label.replace(" ", "")}`]: checkbox.checked,
    });
    onChange(checkbox.checked);
  });

  function updateToggleStyle(isChecked) {
    slider.style.backgroundColor = isChecked ? "#9147ff" : "#3e3e3e";
    knob.style.transform = isChecked ? "translateX(20px)" : "translateX(0)";
  }

  toggle.appendChild(checkbox);
  toggle.appendChild(slider);
  toggle.appendChild(knob);
  container.appendChild(toggle);

  return container;
}

function createRefreshButton() {
  const button = document.createElement("button");
  button.textContent = "Refresh Data";
  Object.assign(button.style, {
    marginTop: "10px",
    width: "100%",
    padding: "6px",
    backgroundColor: "#9147ff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  });
  button.onclick = refreshAllData;
  return button;
}

// =======================
// 🛠️  Utility Functions
// =======================
function getUsernameFromURL() {
  return window.location.pathname.split("/").pop();
}

function makeDraggable(element) {
  let pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;
  const header = element.querySelector("h3") || element;

  header.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    element.style.top = `${element.offsetTop - pos2}px`;
    element.style.left = `${element.offsetLeft - pos1}px`;
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "handleTransactionPopup") {
    const { actionType, jwtToken, amount } = message;
    handleTransaction(
      getUsernameFromURL(),
      actionType,
      amount || 1,
      jwtToken,
      sendResponse
    );
    return true;
  }
});

async function handleTransaction(username,actionType, amount,jwtToken,sendResponse) {
  try {
    const safeAmount = Math.max(1, parseInt(amount) || 1);
    
    const url = new URL(`https://api.ttx.gg/creators/${username}/transactions`);
    url.searchParams.append('action', actionType);
    url.searchParams.append('amount', safeAmount);

    console.log('Final request URL:', url.toString());

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${jwtToken}`,
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('API Error:', error);
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log("Transaction success:", data);
    sendResponse({ success: true, data });
    setTimeout(() => refreshAllData(), 1000);
  } catch (error) {
    console.error("Transaction error:", error);
    sendResponse({ 
      success: false,
      error: error.message.includes("Amount") 
        ? "Please enter at least 1 share" 
        : error.message
    });
  }
}

// =======================
// 💰  Stock Price Badge
// =======================
function createStockBadge(price) {
  const badge = document.createElement("span");
  badge.className = "ttx-stock-badge";
  badge.textContent = price;
  Object.assign(badge.style, {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: "12px",
    fontSize: "14px",
    marginLeft: "10px",
    color: "white",
    fontWeight: "bold",
    background: "linear-gradient(-45deg, #ff6b6b, #fcb045, #00d2ff, #3a7bd5)",
    backgroundSize: "300% 300%",
    animation: "gradientShift 5s ease infinite",
  });
  return badge;
}

async function fetchStockPrice(username) {
  try {
    const response = await fetch(`https://api.ttx.gg/creators/${username}`);
    if (response.status === 404) return null;

    const data = await response.json();
    return `$${new Intl.NumberFormat().format(data.value)}`;
  } catch (error) {
    console.error("[TTX] Error fetching stock price:", error);
    return null;
  }
}

async function updateStockBadge(username) {
  const { showStockBadge } = await chrome.storage.sync.get("showStockBadge");
  if (!showStockBadge) return;

  const price = await fetchStockPrice(username);
  if (!price) return;

  document.querySelectorAll(`a[href*="/${username}"]`).forEach((anchor) => {
    const h1 = anchor.querySelector("h1");
    if (!h1) return;

    const existingBadge = h1.querySelector(".ttx-stock-badge");
    if (existingBadge) {
      existingBadge.textContent = price;
      return;
    }

    h1.appendChild(createStockBadge(price));
  });
}

function removeStockBadges() {
  document.querySelectorAll(".ttx-stock-badge").forEach((el) => el.remove());
}

function toggleStockBadge(shouldShow) {
  if (shouldShow) {
    updateStockBadge(getUsernameFromURL());
  } else {
    removeStockBadges();
  }
}

// =======================
// 💬  Chat Alerts
// =======================
async function fetchTransactions(username) {
  try {
    const response = await fetch(
      `https://api.ttx.gg/creators/${username}/transactions`
    );
    const { data: transactions } = await response.json();
    if (!transactions?.length) return;

    const newTransactions = lastSeenTransactionId
      ? transactions.filter((t) => t.id > lastSeenTransactionId)
      : [transactions[0]];

    newTransactions.reverse().forEach(injectChatMessage);
    lastSeenTransactionId = transactions[0].id;
  } catch (error) {
    console.error("[TTX] Error fetching transactions:", error);
  }
}

function injectChatMessage(event) {
  const chatContainer = document.querySelector(
    '[data-test-selector="chat-scrollable-area__message-container"]'
  );
  if (!chatContainer) return;

  const isBuy = event.action === 0;
  const message = document.createElement("div");
  message.className = "ttx-chat-message";

  Object.assign(message.style, {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 16px",
    fontSize: "14px",
    color: "#f7f7f7",
    fontFamily: "Inter, sans-serif",
    animation: "fadeIn 0.2s ease-out",
  });

  // Create message content
  const logo = document.createElement("img");
  logo.src = "https://ttx.gg/favicon.png";
  logo.alt = "TTX";
  Object.assign(logo.style, {
    width: "16px",
    height: "16px",
    borderRadius: "2px",
  });

  const content = document.createElement("span");
  content.innerHTML = `
    <strong style="color:#00c274">${event.user.name}</strong>
    <span style="color:${isBuy ? "#00c274" : "#ff5252"}">${
    isBuy ? "bought" : "sold"
  }</span>
    ${event.quantity} ${event.creator.ticker}
    <span style="color:rgba(247,247,247,0.6)">@ $${(event.price / 100).toFixed(
      2
    )}</span>
  `;

  message.appendChild(logo);
  message.appendChild(content);
  chatContainer.appendChild(message);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  // Add fade animation if not exists
  if (!document.getElementById("ttx-anim")) {
    const style = document.createElement("style");
    style.id = "ttx-anim";
    style.textContent = `@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }`;
    document.head.appendChild(style);
  }

  // Auto-remove message after delay
  setTimeout(() => {
    message.style.opacity = "0";
    setTimeout(() => message.remove(), 300);
  }, 10000);
}

function startChatAlerts(username) {
  stopChatAlerts();
  lastSeenTransactionId = null;
  chatAlertInterval = setInterval(() => fetchTransactions(username), 15000);
}

function stopChatAlerts() {
  if (chatAlertInterval) {
    clearInterval(chatAlertInterval);
    chatAlertInterval = null;
  }
}

function toggleChatAlerts(shouldShow) {
  if (shouldShow) {
    startChatAlerts(getUsernameFromURL());
  } else {
    stopChatAlerts();
  }
}

// =======================
// 🔄  Data Management
// =======================
function refreshAllData() {
  const username = getUsernameFromURL();
  updateStockBadge(username);
  if (chatAlertInterval) {
    lastSeenTransactionId = null;
    fetchTransactions(username);
  }
}

function checkForChannelChange() {
  const currentUsername = getUsernameFromURL();
  if (currentUsername !== previousUsername) {
    previousUsername = currentUsername;
    updateStockBadge(currentUsername);
    startChatAlerts(currentUsername);
  }
}

// =======================
// ⌨️  Keyboard Shortcut
// =======================
function setupKeyboardShortcut() {
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === "T") {
      const panel = document.getElementById("ttx-control-panel");
      if (panel) {
        panel.style.display = panel.style.display === "none" ? "block" : "none";
      } else {
        createControlPanel();
      }
    }
  });
}

// =======================
// 🔄  Monitoring
// =======================
function startMonitoring() {
  // Initial load
  const username = getUsernameFromURL();
  updateStockBadge(username);
  startChatAlerts(username);

  // Set up periodic checks
  setInterval(checkForChannelChange, 5000);
  setInterval(() => {
    console.log("[TTX Tool] Periodic data refresh...");
    updateStockBadge(getUsernameFromURL());
  }, Math.floor(Math.random() * 5000) + 15000);
}

// =======================
// 🚀  Start the Extension
// =======================
window.addEventListener("load", () => {
  setTimeout(initExtension, 3000);
});
