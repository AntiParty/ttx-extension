chrome.runtime.onInstalled.addListener(() => {
  // Set default settings on install
  chrome.storage.sync.set({
    showStockBadge: true,
    showChatAlerts: false,
  });
});
