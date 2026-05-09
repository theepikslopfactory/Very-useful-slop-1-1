document.getElementById("save").addEventListener("click", () => {
  const settings = {
    youtubeAds: document.getElementById("youtubeAds").checked,
    iframeAds: document.getElementById("iframeAds").checked
  };
  chrome.storage.sync.set(settings, () => {
    alert("Settings saved!");
  });
});

document.getElementById("blockElement").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0];

    // Block only REAL internal pages
    const internal = !tab.url ||
                     tab.url.startsWith("chrome://") ||
                     tab.url.startsWith("edge://") ||
                     tab.url.startsWith("about:");

    if (internal) {
      alert("This page cannot be edited. Try a normal website.");
      return;
    }

    // YouTube SPA fix: retry if content script isn't ready yet
    let attempts = 0;
    const maxAttempts = 10;

    const trySend = () => {
      if (attempts++ >= maxAttempts) return;

      chrome.tabs.sendMessage(tab.id, { action: "start-block-mode" }, () => {
        if (chrome.runtime.lastError) {
          setTimeout(trySend, 150);
        }
      });
    };

    trySend();
  });
});

document.getElementById("resetBlocks").addEventListener("click", () => {
  chrome.storage.sync.remove("customBlocks", () => {
    alert("All blocked elements have been restored. Reload the page!");
  });
});
