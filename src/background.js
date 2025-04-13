// ===== Version Checker =====
const CURRENT_VERSION = '1.0';
const VERSION_CHECK_URL = 'https://api.github.com/repos/yourusername/ttx-extension/releases/latest';
const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

async function checkForUpdates() {
  try {
    const lastChecked = (await chrome.storage.local.get('lastVersionCheck')).lastVersionCheck;
    const now = Date.now();
    
    if (lastChecked && (now - lastChecked) < CHECK_INTERVAL) return;

    const response = await fetch(VERSION_CHECK_URL);
    if (!response.ok) throw new Error('Version check failed');
    
    const data = await response.json();
    await chrome.storage.local.set({ lastVersionCheck: now });

    if (compareVersions(data.tag_name.replace(/^v/, ''), CURRENT_VERSION) > 0) {
      showUpdateNotification(data);
    }
  } catch (error) {
    console.error('Version check error:', error);
  }
}

function compareVersions(a, b) {
  // Simple version comparison
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const partA = partsA[i] || 0;
    const partB = partsB[i] || 0;
    if (partA > partB) return 1;
    if (partA < partB) return -1;
  }
  return 0;
}

function showUpdateNotification(releaseData) {
  chrome.notifications.create('update-available', {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'TTX Extension Update Available',
    message: `Version ${releaseData.tag_name} is available! Click to download.`,
    priority: 2
  });

  chrome.notifications.onClicked.addListener((notificationId) => {
    if (notificationId === 'update-available') {
      chrome.tabs.create({ url: releaseData.html_url });
    }
  });
}



// ===== Extension Setup =====
chrome.runtime.onInstalled.addListener(() => {
  // Set default settings on install
  chrome.storage.sync.set({
    showStockBadge: true,
    showChatAlerts: false,
  });

  checkForUpdates();
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

        console.log("JWT Token:", jwtToken);

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