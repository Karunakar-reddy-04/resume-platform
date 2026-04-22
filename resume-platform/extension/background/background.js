// ResumeMatch Background Service Worker

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'getBatch') {
    chrome.storage.local.get(['batch'], (result) => {
      sendResponse({ batch: result.batch || [] });
    });
    return true;
  }

  if (msg.action === 'addToBatch') {
    chrome.storage.local.get(['batch'], (result) => {
      const batch = result.batch || [];
      batch.push(msg.jd);
      chrome.storage.local.set({ batch }, () => {
        // Update badge
        chrome.action.setBadgeText({ text: String(batch.length) });
        chrome.action.setBadgeBackgroundColor({ color: '#1A56A0' });
        sendResponse({ success: true, count: batch.length });
      });
    });
    return true;
  }

  if (msg.action === 'clearBatch') {
    chrome.storage.local.set({ batch: [] }, () => {
      chrome.action.setBadgeText({ text: '' });
      sendResponse({ success: true });
    });
    return true;
  }

  if (msg.action === 'removeFromBatch') {
    chrome.storage.local.get(['batch'], (result) => {
      const batch = (result.batch || []).filter((_, i) => i !== msg.index);
      chrome.storage.local.set({ batch }, () => {
        const count = batch.length;
        chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
        sendResponse({ success: true, count });
      });
    });
    return true;
  }
});
