// ===== Version Checker with Alarm Notifications =====
const CURRENT_VERSION = "1.1";
const VERSION_CHECK_URL =
  "https://api.github.com/repos/AntiParty/ttx-extension/releases/latest";
const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours for checks
const NOTIFICATION_RETRY_INTERVAL = 30 * 60 * 1000; // 30 minutes for retries

let updateData = null; // Store the latest update info

// Initialize alarm system
function setupAlarms() {
  chrome.alarms.create("version-check", {
    periodInMinutes: CHECK_INTERVAL / (60 * 1000),
  });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "version-check") {
      checkForUpdates();
    } else if (alarm.name === "update-notification" && updateData) {
      showUpdateNotification(updateData);
    }
  });
}

async function checkForUpdates() {
  try {
    console.log("[Update Check] Starting version check...");
    const response = await fetch(VERSION_CHECK_URL);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const versionComparison = compareVersions(data.tag_name, CURRENT_VERSION);

    if (versionComparison > 0) {
      console.log("[Update Check] Update available!");
      updateData = data;

      // Schedule immediate notification and retries
      chrome.alarms.create("update-notification", { when: Date.now() + 1000 });
      chrome.alarms.create("update-notification-retry", {
        periodInMinutes: NOTIFICATION_RETRY_INTERVAL / (60 * 1000),
      });
    }
  } catch (error) {
    console.error("[Update Check] Error:", error);
  }
}

async function showUpdateNotification(releaseData) {
  // Store update data for the popup
  await chrome.storage.local.set({ updateData: releaseData });

  try {
    await chrome.notifications.create({
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon128.png"),
      title: "TTX Update Available",
      message: `Version ${releaseData.tag_name.replace(/^v/, "")} is ready!`,
      priority: 2,
    });
  } catch (error) {
    console.log("Standard notification failed, using popup fallback");
  }
}

// Notification click handler
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === "update-available" && updateData) {
    chrome.tabs.create({ url: updateData.html_url });
    chrome.notifications.clear(notificationId);
  }
});

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    showStockBadge: true,
    showChatAlerts: false,
  });
  setupAlarms();
  checkForUpdates(); // Immediate first check
});

// Compare versions function remains the same
function compareVersions(a, b) {
  const cleanA = a.replace(/^v/, "");
  const cleanB = b.replace(/^v/, "");
  const partsA = cleanA.split(".").map(Number);
  const partsB = cleanB.split(".").map(Number);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const partA = partsA[i] || 0;
    const partB = partsB[i] || 0;
    if (partA > partB) return 1;
    if (partA < partB) return -1;
  }
  return 0;
}

// ===== Extension Setup =====
chrome.runtime.onInstalled.addListener(() => {
  // Set default settings on install
  chrome.storage.sync.set({
    showStockBadge: true,
    showChatAlerts: false,
  });

  setTimeout(() => {
    checkForUpdates();
  }, 1000); // Delay to ensure the extension is fully loaded
});

// Get the JWT token from the TTX.Session cookie and save it to local storage
chrome.cookies.get(
  {
    url: "https://ttx.gg/",
    name: "TTX.Session",
  },
  (cookie) => {
    if (cookie) {
      try {
        const sessionData = JSON.parse(decodeURIComponent(cookie.value));
        const jwtToken = sessionData.token;

        console.log("JWT Token Stored");

        // Save to local storage for use elsewhere in the extension
        chrome.storage.local.set({ ttxJwt: jwtToken }, () => {
          console.log("JWT Token saved to local storage.");
        });
      } catch (err) {
        console.error("Failed to parse session data", err);
      }
    } else {
      console.warn("TTX.Session cookie not found.");
    }
  }
);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "validateToken") {
    chrome.storage.local.get("ttxJwt", ({ ttxJwt }) => {
      sendResponse({ valid: !!ttxJwt });
    });
    return true;
  }
});

// Optional: Handle any changes to cookies in case the token changes
chrome.cookies.onChanged.addListener((changeInfo) => {
  if (
    changeInfo.cookie.name === "TTX.Session" &&
    changeInfo.cookie.domain === "ttx.gg"
  ) {
    // Handle JWT token change
    if (changeInfo.removed) {
      console.log("TTX.Session cookie was removed.");
      chrome.storage.local.remove("ttxJwt");
    } else {
      try {
        const sessionData = JSON.parse(
          decodeURIComponent(changeInfo.cookie.value)
        );
        const jwtToken = sessionData.token;

        console.log("Updated JWT Token:", jwtToken);
        chrome.storage.local.set({ ttxJwt: jwtToken });
      } catch (err) {
        console.error("Failed to parse session data on cookie change", err);
      }
    }
  }
});

setInterval(checkForUpdates, CHECK_INTERVAL);
