// MV3 service worker background script

// In MV3, the service worker can be suspended at any time, so we keep a small
// in-memory cache AND persist per-tab icon state in storage.session (if available).

const ICON_DEFAULT = 'icons/inactive.png';

// Only icon filenames the content script legitimately reports (getIcon /
// getClickIcon in page-turner.js) may reach chrome.action.setIcon.
const VALID_ICONS = new Set([
  'inactive.png',
  'back.png',
  'next.png',
  'both.png',
  'back-c.png',
  'next-c.png',
  'both-c-back.png',
  'both-c-next.png',
]);

// Prefer storage.session (not persisted across browser restarts) for tab state.
// Fallback to storage.local if session isn't available in the current environment.
const tabStateStorage = (chrome.storage && chrome.storage.session) ? chrome.storage.session : chrome.storage.local;

const iconCache = new Map(); // tabId -> icon filename, e.g. 'next.png'

function setTabIcon(tabId, iconFile) {
  const path = 'icons/' + iconFile;
  chrome.action.setIcon({ tabId, path });
}

async function rememberTabIcon(tabId, iconFile) {
  iconCache.set(tabId, iconFile);
  await tabStateStorage.set({ ['page_turner_icon_' + tabId]: iconFile });
}

async function recallTabIcon(tabId) {
  if (iconCache.has(tabId)) return iconCache.get(tabId);

  const key = 'page_turner_icon_' + tabId;
  const data = await tabStateStorage.get(key);
  const iconFile = data[key];
  if (iconFile) iconCache.set(tabId, iconFile);
  return iconFile;
}

// Messages from the content script tell us what icon to show for the current tab.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request || !VALID_ICONS.has(request.icon)) return;

  const tabId = sender && sender.tab && sender.tab.id;
  if (typeof tabId !== 'number') return;

  // Ignore messages from prerendered/cached documents: their icon state
  // (e.g. page 2's "both") must not overwrite the visible page's icon.
  // sender.tab.active can't catch this - the tab itself IS active.
  if (sender.documentLifecycle && sender.documentLifecycle !== 'active') return;

  const isActive = sender.tab && sender.tab.active === true;

  (async () => {
    if (isActive) setTabIcon(tabId, request.icon);
    await rememberTabIcon(tabId, request.icon);
  })();

  // No async response needed.
});

// When user switches tabs, restore the last-known icon for that tab (or default).
chrome.tabs.onActivated.addListener(({ tabId }) => {
  (async () => {
    const iconFile = await recallTabIcon(tabId);
    if (iconFile) {
      setTabIcon(tabId, iconFile);
    } else {
      chrome.action.setIcon({ tabId, path: ICON_DEFAULT });
    }
  })();
});

// Avoid storing icon data for closed tabs. Chrome reuses tab IDs, so a
// leaked entry could briefly show a stale icon on an unrelated new tab.
chrome.tabs.onRemoved.addListener((tabId) => {
  iconCache.delete(tabId);
  (async () => {
    try {
      await tabStateStorage.remove('page_turner_icon_' + tabId);
    } catch (e) {
      // Storage can be unavailable during browser shutdown; the startup
      // sweep below handles anything left behind.
    }
  })();
});

// storage.session resets itself each browser session, but the storage.local
// fallback persists - sweep stale per-tab icon state from previous sessions.
// Tab IDs are not stable across restarts, so all of it is stale by definition.
if (tabStateStorage === chrome.storage.local) {
  chrome.runtime.onStartup.addListener(() => {
    (async () => {
      const all = await chrome.storage.local.get(null);
      const stale = Object.keys(all).filter((k) => k.startsWith('page_turner_icon_'));
      if (stale.length) await chrome.storage.local.remove(stale);
    })();
  });
}
