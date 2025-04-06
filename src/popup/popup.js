document.addEventListener("DOMContentLoaded", async () => {
  // Elements
  const stockToggle = document.getElementById("stockBadgeToggle");
  const chatToggle = document.getElementById("chatAlertsToggle");
  const refreshBtn = document.getElementById("refreshBtn");

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
});
