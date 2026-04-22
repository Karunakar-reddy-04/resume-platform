// ResumeMatch Popup Script

const SUPPORTED_SITES = {
  'linkedin.com': { name: 'LinkedIn', cls: 'site-linkedin' },
  'indeed.com': { name: 'Indeed', cls: 'site-indeed' },
  'greenhouse.io': { name: 'Greenhouse', cls: 'site-greenhouse' },
  'lever.co': { name: 'Lever', cls: 'site-lever' },
  'workday': { name: 'Workday', cls: 'site-workday' },
  'myworkday': { name: 'Workday', cls: 'site-workday' },
};

let currentTab = null;
let currentJD = null;
let appUrl = 'https://your-app.vercel.app'; // Will be overridden from storage

// ── Init ────────────────────────────────────────────────────────────────────

async function init() {
  // Load stored app URL
  const stored = await storageGet('appUrl');
  if (stored) appUrl = stored;
  document.getElementById('open-app').href = appUrl;

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  render();
  updateBatchCount();
}

function getSiteInfo(url) {
  if (!url) return null;
  for (const [key, val] of Object.entries(SUPPORTED_SITES)) {
    if (url.includes(key)) return val;
  }
  return null;
}

function isJobPage(url) {
  if (!url) return false;
  const jobPatterns = [
    /linkedin\.com\/jobs\//,
    /indeed\.com\/(viewjob|rc\/clk)/,
    /boards\.greenhouse\.io/,
    /jobs\.lever\.co/,
    /myworkdayjobs\.com/,
    /myworkday\.com.*\/job\//,
  ];
  return jobPatterns.some(p => p.test(url));
}

// ── Render ───────────────────────────────────────────────────────────────────

async function render() {
  const content = document.getElementById('main-content');
  const url = currentTab?.url || '';
  const siteInfo = getSiteInfo(url);
  const onJobPage = isJobPage(url);

  // App URL config
  let html = `
    <div class="url-label">App URL</div>
    <div id="app-url-row">
      <input id="app-url-input" type="text" value="${escHtml(appUrl)}" placeholder="https://your-app.vercel.app" />
      <button id="save-url-btn">Save</button>
    </div>
  `;

  if (!onJobPage && !siteInfo) {
    html += `
      <div class="not-job-page">
        <div class="not-job-page-icon">🔍</div>
        <div class="not-job-page-title">Navigate to a Job Page</div>
        <div class="not-job-page-sub">
          Works on LinkedIn Jobs, Indeed, Greenhouse, Lever, and Workday.<br>
          Open a job listing, then click this extension.
        </div>
      </div>
    `;
  } else {
    const siteName = siteInfo?.name || 'Job Page';
    const siteCls = siteInfo?.cls || 'site-other';

    html += `
      <div class="page-info">
        <div class="site-badge ${siteCls}">${escHtml(siteName)}</div>
        <div class="page-info-title">${escHtml(currentTab?.title || 'Current Page')}</div>
        <div class="page-info-sub">${escHtml(url.slice(0, 60))}${url.length > 60 ? '…' : ''}</div>
      </div>
      <button class="btn btn-primary" id="analyze-now-btn">
        ⚡ Analyze Now
      </button>
      <button class="btn btn-secondary" id="add-batch-btn">
        + Add to Batch
      </button>
    `;
  }

  // Batch section
  const batch = await storageGet('batch') || [];
  if (batch.length > 0) {
    html += `<hr class="divider" />
    <div class="batch-section">
      <div class="batch-header">
        <span class="batch-title">Batch Queue</span>
        <span class="batch-count">${batch.length}</span>
      </div>
      <div id="batch-list">
        ${batch.map((item, i) => `
          <div class="batch-item" style="display:flex;align-items:center;gap:8px;">
            <div class="batch-item-info">
              <div class="batch-item-title">${escHtml(item.title || 'Untitled')}</div>
              <div class="batch-item-sub">${escHtml(item.company || '')} · ${item.rawText?.length || 0} chars</div>
            </div>
            <button class="batch-item-remove" data-index="${i}" title="Remove">✕</button>
          </div>
        `).join('')}
      </div>
      <button class="btn btn-primary" id="send-batch-btn" style="margin-top:8px;">
        🚀 Send Batch (${batch.length} JD${batch.length !== 1 ? 's' : ''})
      </button>
      <button class="btn btn-danger" id="clear-batch-btn">
        🗑 Clear Batch
      </button>
    </div>`;
  }

  content.innerHTML = html;
  attachListeners();
}

function attachListeners() {
  // Save URL
  document.getElementById('save-url-btn')?.addEventListener('click', async () => {
    const val = document.getElementById('app-url-input').value.trim().replace(/\/$/, '');
    if (!val) return;
    appUrl = val;
    await storageSet('appUrl', val);
    document.getElementById('open-app').href = val;
    showStatus('App URL saved ✓', 'success');
  });

  // Analyze Now
  document.getElementById('analyze-now-btn')?.addEventListener('click', async () => {
    const jd = await extractFromPage();
    if (!jd) return;
    await sendToApp([jd], true);
  });

  // Add to Batch
  document.getElementById('add-batch-btn')?.addEventListener('click', async () => {
    const jd = await extractFromPage();
    if (!jd) return;
    await chrome.runtime.sendMessage({ action: 'addToBatch', jd });
    showStatus(`Added to batch ✓`, 'success');
    await render();
  });

  // Send Batch
  document.getElementById('send-batch-btn')?.addEventListener('click', async () => {
    const batch = await storageGet('batch') || [];
    if (!batch.length) return;
    await sendToApp(batch, false);
  });

  // Clear Batch
  document.getElementById('clear-batch-btn')?.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ action: 'clearBatch' });
    showStatus('Batch cleared', 'success');
    await render();
    updateBatchCount();
  });

  // Remove individual batch item
  document.querySelectorAll('.batch-item-remove').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idx = parseInt(e.target.dataset.index);
      await chrome.runtime.sendMessage({ action: 'removeFromBatch', index: idx });
      await render();
      updateBatchCount();
    });
  });
}

// ── Extraction ───────────────────────────────────────────────────────────────

async function extractFromPage() {
  try {
    showStatus('Extracting job description…', 'loading');
    const response = await chrome.tabs.sendMessage(currentTab.id, { action: 'extractJD' });
    hideStatus();

    if (!response?.success) {
      // Fallback: ask user to select text
      showStatus('Could not auto-extract. Try selecting the JD text and re-clicking.', 'error');
      return null;
    }

    if (!response.jd?.rawText || response.jd.rawText.length < 100) {
      showStatus('Extracted text is too short. Make sure the job description is fully loaded.', 'error');
      return null;
    }

    currentJD = response.jd;
    return currentJD;
  } catch (e) {
    showStatus('Extraction failed: ' + String(e), 'error');
    return null;
  }
}

// ── Send to app ───────────────────────────────────────────────────────────────

async function sendToApp(jds, openResult) {
  showStatus('Sending to ResumeMatch…', 'loading');
  try {
    const url = `${appUrl}/api/jds`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(jds),
    });

    if (res.status === 401) {
      showStatus('Not logged in — open ResumeMatch and sign in first.', 'error');
      return;
    }

    const data = await res.json();
    if (!res.ok) {
      showStatus('Error: ' + (data.error || 'Unknown error'), 'error');
      return;
    }

    // Clear batch after send
    await chrome.runtime.sendMessage({ action: 'clearBatch' });
    updateBatchCount();

    showStatus(`✓ Processed ${data.processed} JD${data.processed !== 1 ? 's' : ''}`, 'success');

    if (openResult && data.results?.[0]?.jdId) {
      setTimeout(() => {
        chrome.tabs.create({ url: `${appUrl}/jobs/${data.results[0].jdId}` });
      }, 800);
    }

    await render();
  } catch (e) {
    showStatus('Network error — check your app URL and internet connection.', 'error');
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function showStatus(msg, type) {
  const el = document.getElementById('status-msg');
  el.textContent = msg;
  el.className = `status status-${type}`;
  el.style.display = 'block';
  if (type === 'success') setTimeout(hideStatus, 3000);
}

function hideStatus() {
  const el = document.getElementById('status-msg');
  if (el) el.style.display = 'none';
}

async function updateBatchCount() {
  const batch = await storageGet('batch') || [];
  const el = document.getElementById('batch-footer-count');
  if (el) el.textContent = batch.length > 0 ? `${batch.length} in queue` : '';
}

function storageGet(key) {
  return new Promise(resolve => chrome.storage.local.get([key], r => resolve(r[key])));
}

function storageSet(key, val) {
  return new Promise(resolve => chrome.storage.local.set({ [key]: val }, resolve));
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

init();
