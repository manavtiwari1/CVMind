/**
 * CVMind AI Extension Popup Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
  const userNameEl = document.getElementById('user-name');
  const userRoleEl = document.getElementById('user-role');
  const userAvatarEl = document.getElementById('user-avatar');
  const pageDetectStatusEl = document.getElementById('page-detect-status');
  const tabJobTitleEl = document.getElementById('tab-job-title');
  const tabJobMatchEl = document.getElementById('tab-job-match');
  const btnAutofill = document.getElementById('btn-popup-autofill');
  const btnOpenDrawer = document.getElementById('btn-popup-open-drawer');

  // 1. Load cached profile from Chrome storage
  chrome.storage.local.get(['cvmind_profile'], (res) => {
    if (res.cvmind_profile) {
      const p = res.cvmind_profile;
      userNameEl.innerText = p.name || 'Candidate';
      userRoleEl.innerText = p.title || 'Job Seeker';
      if (p.name) {
        const initials = p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        userAvatarEl.innerText = initials || 'CV';
      }
    }
  });

  // 2. Query active tab information
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    tabJobTitleEl.innerText = tab.title ? tab.title.replace(/[-|].*$/, '').trim().slice(0, 24) : 'Active Page';
    const isJobUrl = tab.url && (
      tab.url.includes('apply') || tab.url.includes('job') || tab.url.includes('career') ||
      tab.url.includes('greenhouse') || tab.url.includes('lever') || tab.url.includes('demo-sandbox')
    );

    if (isJobUrl) {
      pageDetectStatusEl.innerText = 'Application Detected';
      pageDetectStatusEl.style.background = 'rgba(52, 211, 153, 0.15)';
      pageDetectStatusEl.style.color = '#34d399';
    } else {
      pageDetectStatusEl.innerText = 'Standard Page';
      pageDetectStatusEl.style.background = 'rgba(148, 163, 184, 0.15)';
      pageDetectStatusEl.style.color = '#94a3b8';
    }
  }

  // 3. 1-Click Autofill Trigger
  btnAutofill.addEventListener('click', async () => {
    if (!tab?.id) return;
    btnAutofill.innerText = '⚡ Triggering Autofill...';

    // Execute autofill inside active tab content script
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const autofillBtn = document.getElementById('cvmind-btn-autofill');
          if (autofillBtn) {
            autofillBtn.click();
          } else {
            alert('CVMind Copilot is initializing on this page. Please refresh or click the floating badge.');
          }
        }
      });
      btnAutofill.innerText = '✓ Autofill Sent!';
      setTimeout(() => { btnAutofill.innerHTML = '<span>⚡ 1-Click Autofill Form</span>'; }, 2000);
    } catch (e) {
      btnAutofill.innerText = 'Failed';
      console.error(e);
    }
  });

  // 4. Open Floating Copilot Drawer Trigger
  btnOpenDrawer.addEventListener('click', async () => {
    if (!tab?.id) return;
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const drawer = document.getElementById('cvmind-copilot-drawer');
          if (drawer) {
            drawer.classList.remove('cvmind-drawer-closed');
            drawer.classList.add('cvmind-drawer-open');
          }
        }
      });
      window.close();
    } catch (e) {
      console.error(e);
    }
  });
});
