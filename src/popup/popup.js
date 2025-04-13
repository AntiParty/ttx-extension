document.addEventListener("DOMContentLoaded", async () => {
  // Elements
  const stockToggle = document.getElementById("stockBadgeToggle");
  const chatToggle = document.getElementById("chatAlertsToggle");
  const refreshBtn = document.getElementById("refreshBtn");
  const tokenText = document.getElementById("tokenText");
  const buyButton = document.getElementById("buyBtn");
  const sellButton = document.getElementById("sellBtn");
  
  const colorPicker = document.getElementById("stockColorPicker");

  const { stockBadgeColor = "#00c274" } = await chrome.storage.sync.get(["stockBadgeColor"]);
  colorPicker.value = stockBadgeColor;

  await checkForExtensionUpdate();

  const updateAlert = document.getElementById("updateAlert");
  const updateVersion = document.getElementById("updateVersion");
  const updateNowBtn = document.getElementById("updateNowBtn");
  const updateLaterBtn = document.getElementById("updateLaterBtn");

  const { ttxJwt } = await chrome.storage.local.get("ttxJwt"); // Use ttxJwt from local storage

  // Load saved settings
  const { showStockBadge = true, showChatAlerts = true } =
    await chrome.storage.sync.get(["showStockBadge", "showChatAlerts"]);

  stockToggle.checked = showStockBadge;
  chatToggle.checked = showChatAlerts;

  // Event listeners
  stockToggle.addEventListener("change", async (e) => {
    await chrome.storage.sync.set({ showStockBadge: e.target.checked });
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    chrome.tabs.sendMessage(tab.id, {
      action: "toggleStockBadge",
      value: e.target.checked,
    });
  });

  colorPicker.addEventListener("input", async (e) => {
    const color = e.target.value;
    await chrome.storage.sync.set({ stockBadgeColor: color });
  
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, {
      action: "updateBadgeColor",
      color,
    });
  });

  updateNowBtn.addEventListener("click", () => {
    chrome.storage.local.get(["updateData"], ({ updateData }) => {
      if (updateData?.html_url) {
        chrome.tabs.create({ url: updateData.html_url });
      }
    });
  });

  updateLaterBtn.addEventListener("click", () => {
    updateAlert.classList.remove("show");
    // Set reminder for 4 hours later
    chrome.alarms.create('update-reminder', { delayInMinutes: 240 });
  });

  chatToggle.addEventListener("change", async (e) => {
    await chrome.storage.sync.set({ showChatAlerts: e.target.checked });
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    chrome.tabs.sendMessage(tab.id, {
      action: "toggleChatAlerts",
      value: e.target.checked,
    });
  });

  refreshBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    chrome.tabs.sendMessage(tab.id, { action: "refreshData" });
  });

  buyButton.addEventListener("click", async () => {
    await handleTransaction("buy");
  });

  sellButton.addEventListener("click", async () => {
    await handleTransaction("sell");
  });
  async function handleTransaction(action) {
    try {
      const shareAmountInput = document.getElementById("shareAmount");
      let shareAmount = Math.max(1, parseInt(shareAmountInput.value) || 1);

      if (shareAmount !== parseInt(shareAmountInput.value)) {
        shareAmountInput.value = shareAmount;
      }

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
        url: "*://www.twitch.tv/*",
      });

      if (!tab) {
        alert("Please open this on a Twitch streamer's page");
        return;
      }

      const { ttxJwt } = await chrome.storage.local.get("ttxJwt");
      if (!ttxJwt) {
        alert("Not logged in to TTX");
        return;
      }

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "handleTransactionPopup",
        actionType: action,
        jwtToken: ttxJwt,
        amount: shareAmount,
      });

      if (response?.success) {
        alert(`${action === "buy" ? "Purchase" : "Sale"} successful!`);
      } else {
        alert(`Failed: ${response?.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Transaction error:", error);
      alert("Transaction failed - check console");
    }
  }
});

async function checkForExtensionUpdate() {
  try {
    const { updateData } = await chrome.storage.local.get(["updateData"]);
    if (updateData) {
      const updateAlert = document.getElementById("updateAlert");
      const updateVersion = document.getElementById("updateVersion");
      
      if (updateAlert && updateVersion) {
        updateVersion.textContent = updateData.tag_name.replace(/^v/, '');
        updateAlert.classList.add("show");
      }
    }
  } catch (error) {
    console.error("Update check failed:", error);
  }
}