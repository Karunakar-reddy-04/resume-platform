// ResumeMatch Content Script
// Extracts JD data from LinkedIn, Indeed, Greenhouse, Lever, Workday + universal fallback

(function () {
  'use strict';

  const hostname = window.location.hostname;
  const href = window.location.href;

  // ── Site-specific extractors ────────────────────────────────────────────────

  function extractLinkedIn() {
    const title = document.querySelector('.job-details-jobs-unified-top-card__job-title, h1.t-24')?.textContent?.trim();
    const company = document.querySelector('.job-details-jobs-unified-top-card__company-name, .topcard__org-name-link')?.textContent?.trim();
    const location = document.querySelector('.job-details-jobs-unified-top-card__bullet, .topcard__flavor--bullet')?.textContent?.trim();
    const descEl = document.querySelector('.jobs-description__content, .jobs-box__html-content, [class*="description"]');
    const rawText = descEl?.innerText || document.body.innerText.slice(0, 8000);
    return { title, company, location, rawText };
  }

  function extractIndeed() {
    const title = document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"], .jobsearch-JobInfoHeader-title, h1[class*="title"]')?.textContent?.trim();
    const company = document.querySelector('[data-testid="inlineHeader-companyName"], .icl-u-lg-mr--sm, [class*="companyName"]')?.textContent?.trim();
    const location = document.querySelector('[data-testid="job-location"], [class*="location"]')?.textContent?.trim();
    const descEl = document.querySelector('#jobDescriptionText, [data-testid="jobsearch-jobDescriptionText"], .jobsearch-jobDescriptionText');
    const rawText = descEl?.innerText || document.body.innerText.slice(0, 8000);
    return { title, company, location, rawText };
  }

  function extractGreenhouse() {
    const title = document.querySelector('.app-title, h1.posting-headline, h1[class*="title"]')?.textContent?.trim();
    const company = document.querySelector('.company-name, [class*="company"]')?.textContent?.trim()
      || document.title.split(' at ')[1]?.split(' - ')[0]?.trim();
    const location = document.querySelector('.location, [class*="location"]')?.textContent?.trim();
    const descEl = document.querySelector('#content, .content, [class*="description"]');
    const rawText = descEl?.innerText || document.body.innerText.slice(0, 8000);
    return { title, company, location, rawText };
  }

  function extractLever() {
    const title = document.querySelector('.posting-headline h2, h2[data-qa="posting-name"], h2[class*="title"]')?.textContent?.trim();
    const company = document.querySelector('.main-header-logo img')?.getAttribute('alt')?.trim()
      || document.title.split(' at ')[1]?.trim();
    const location = document.querySelector('.posting-categories .location, [class*="location"]')?.textContent?.trim();
    const descEl = document.querySelector('.posting-description, [class*="description"]');
    const rawText = descEl?.innerText || document.body.innerText.slice(0, 8000);
    return { title, company, location, rawText };
  }

  function extractWorkday() {
    const title = document.querySelector('[data-automation-id="jobPostingHeader"], h1[class*="title"], .WGUL')?.textContent?.trim();
    const company = document.querySelector('[class*="company"], .gwt-Label')?.textContent?.trim();
    const location = document.querySelector('[data-automation-id="locations"], [class*="location"]')?.textContent?.trim();
    const descEl = document.querySelector('[data-automation-id="jobPostingDescription"], [class*="description"]');
    const rawText = descEl?.innerText || document.body.innerText.slice(0, 8000);
    return { title, company, location, rawText };
  }

  function extractUniversal() {
    // Try common selectors first
    const candidates = [
      document.querySelector('[class*="job-description"]'),
      document.querySelector('[class*="jobDescription"]'),
      document.querySelector('[class*="description"]'),
      document.querySelector('main'),
      document.querySelector('article'),
    ].filter(Boolean);

    const descEl = candidates[0];
    const rawText = descEl?.innerText || document.body.innerText.slice(0, 8000);

    // Try to extract title from page title or h1
    const title = document.querySelector('h1')?.textContent?.trim() || document.title.split(' - ')[0]?.trim();

    return { title, company: undefined, location: undefined, rawText };
  }

  // ── Router ──────────────────────────────────────────────────────────────────

  function extractJD() {
    let data;
    if (hostname.includes('linkedin.com')) data = extractLinkedIn();
    else if (hostname.includes('indeed.com')) data = extractIndeed();
    else if (hostname.includes('greenhouse.io')) data = extractGreenhouse();
    else if (hostname.includes('lever.co')) data = extractLever();
    else if (hostname.includes('workday') || hostname.includes('myworkday')) data = extractWorkday();
    else data = extractUniversal();

    return {
      ...data,
      sourceUrl: href,
      extractedAt: Date.now(),
    };
  }

  // ── Message handler ─────────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === 'extractJD') {
      try {
        const jd = extractJD();
        sendResponse({ success: true, jd });
      } catch (e) {
        sendResponse({ success: false, error: String(e) });
      }
    }
    return true;
  });

  // Notify background that content script is ready
  chrome.runtime.sendMessage({ action: 'contentReady', url: href }).catch(() => {});

})();
