// ---------------------------
// GLOBAL HIGHLIGHT CLEANER
// ---------------------------
const killHighlight = () => {
  const old = document.querySelector("#__yt_block_highlight__");
  if (old) old.remove();
};

// ---------------------------
// INITIALIZATION (runs on load + YouTube SPA navigation)
// ---------------------------
const initAdblock = () => {
  chrome.storage.sync.get(
    ["youtubeAds", "iframeAds", "customBlocks"],
    (settings) => {

      const hide = () => {
        if (settings.youtubeAds) {
          document.querySelectorAll(
            "ytd-promoted-sparkles-web-renderer, ytd-display-ad-renderer, ytd-promoted-video-renderer"
          ).forEach(el => el.remove());
        }

        if (settings.iframeAds) {
          document.querySelectorAll(
            "iframe[src*='ads'], iframe[src*='doubleclick']"
          ).forEach(el => el.remove());
        }

        if (settings.customBlocks) {
          settings.customBlocks.forEach(sel => {
            const forbidden = [
              "ytd-app",
              "#content",
              "ytd-page-manager",
              "#page-manager",
              "ytd-watch-flexy",
              "ytd-browse",
              "ytd-two-column-browse-results-renderer",
              "ytd-rich-grid-renderer"
            ];
            if (forbidden.some(f => sel.includes(f))) return;

            document.querySelectorAll(sel).forEach(el => el.remove());
          });
        }
      };

      if (!document.body) return;

      new MutationObserver(hide).observe(document.body, {
        childList: true,
        subtree: true
      });

      hide();
    }
  );
};

// Run immediately
initAdblock();
window.addEventListener("yt-navigate-finish", initAdblock);


// ---------------------------
// BLOCK ELEMENT MODE
// ---------------------------
let highlightBox;
window.blockAlertShown = false;

const startBlockMode = () => {
  if (!document.body) return;

  // Delay cleanup so block mode initializes properly
  setTimeout(() => killHighlight(), 0);

  highlightBox = document.createElement("div");
  highlightBox.id = "__yt_block_highlight__";

  Object.assign(highlightBox.style, {
    position: "absolute",
    border: "2px solid red",
    pointerEvents: "none",
    zIndex: "999999",
    mixBlendMode: "difference",
    borderRadius: "4px",
    transition: "all 0.05s ease"
  });
  document.body.appendChild(highlightBox);

  document.body.style.cursor = "crosshair";

  const move = (e) => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === highlightBox) return;

    const rect = el.getBoundingClientRect();
    highlightBox.style.top = rect.top + "px";
    highlightBox.style.left = rect.left + "px";
    highlightBox.style.width = rect.width + "px";
    highlightBox.style.height = rect.height + "px";
  };

  const click = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return;

    const selector = getSafeSelector(el);

    if (!selector) {
      if (!window.blockAlertShown) {
        window.blockAlertShown = true;
        alert("Cannot block this element.");
      }
      cleanup();
      return;
    }

    const forbidden = [
      "ytd-app",
      "#content",
      "ytd-page-manager",
      "#page-manager",
      "ytd-watch-flexy",
      "ytd-browse",
      "ytd-two-column-browse-results-renderer",
      "ytd-rich-grid-renderer"
    ];

    if (forbidden.some(f => selector.includes(f))) {
      if (!window.blockAlertShown) {
        window.blockAlertShown = true;
        alert("This element is essential for YouTube and cannot be blocked.");
      }
      cleanup();
      return;
    }

    chrome.storage.sync.get(["customBlocks"], (data) => {
      const list = data.customBlocks || [];
      if (!list.includes(selector)) list.push(selector);

      chrome.storage.sync.set({ customBlocks: list }, () => {
        el.remove();
        cleanup();
      });
    });
  };

  const escCancel = (e) => {
    if (e.key === "Escape") cleanup();
  };

  const cleanup = () => {
    document.removeEventListener("mousemove", move);
    document.removeEventListener("click", click, true);
    document.removeEventListener("keydown", escCancel);
    killHighlight();
    document.body.style.cursor = "";
  };

  document.addEventListener("mousemove", move);
  document.addEventListener("click", click, true);
  document.addEventListener("keydown", escCancel);
};


// ---------------------------
// SAFE SELECTOR GENERATOR
// ---------------------------
const getSafeSelector = (el) => {
  if (el.id) return `#${el.id}`;

  let path = [];
  let current = el;

  while (current && current.tagName && current.tagName.toLowerCase() !== "html") {
    let tag = current.tagName.toLowerCase();

    if (current.className) {
      const cls = current.className.trim().replace(/\s+/g, ".");
      if (cls.length > 0) tag += `.${cls}`;
    }

    const parent = current.parentNode;
    if (parent) {
      const index = Array.from(parent.children).indexOf(current) + 1;
      tag += `:nth-child(${index})`;
    }

    path.unshift(tag);
    current = current.parentNode;
  }

  const selector = path.join(" > ");
  if (!selector || selector.includes("html") || selector.includes("body")) return null;
  return selector;
};


// ---------------------------
// MESSAGE LISTENER
// ---------------------------
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "start-block-mode") startBlockMode();
});


// ---------------------------
// RESET ALERT + HIGHLIGHT ON YT NAVIGATION
// ---------------------------
window.addEventListener("yt-navigate-finish", () => {
  window.blockAlertShown = false;
  killHighlight();
});
