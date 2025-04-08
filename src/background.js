chrome.runtime.onInstalled.addListener(() => {
  // Set default settings on install
  chrome.storage.sync.set({
    showStockBadge: true,
    showChatAlerts: false,
  });
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
