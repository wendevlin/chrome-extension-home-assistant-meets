// Options Page Script

// Load saved settings
async function loadSettings() {
  const stored = await chrome.storage.local.get(['haUrl', 'accessToken']);

  if (stored.haUrl) {
    document.getElementById('haUrl').value = stored.haUrl;
  }

  if (stored.accessToken) {
    document.getElementById('accessToken').value = stored.accessToken;
  }
}

// Save settings
async function saveSettings() {
  const haUrl = document.getElementById('haUrl').value.trim();
  const accessToken = document.getElementById('accessToken').value.trim();

  if (!haUrl) {
    showStatus('Please enter a Home Assistant URL', 'error');
    return;
  }

  if (!accessToken) {
    showStatus('Please enter an Access Token', 'error');
    return;
  }

  // Validate URL format
  if (!haUrl.startsWith('ws://') && !haUrl.startsWith('wss://')) {
    showStatus('URL must start with ws:// or wss://', 'error');
    return;
  }

  await chrome.storage.local.set({
    haUrl: haUrl,
    accessToken: accessToken
  });

  showStatus('Settings saved! Extension will restart...', 'success');

  // Restart extension background script
  setTimeout(() => {
    chrome.runtime.reload();
  }, 1000);
}

// Show status message
function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';

  // Hide after 5 seconds (except for success)
  if (type !== 'success') {
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000);
  }
}

// Event Listeners
document.getElementById('save').addEventListener('click', saveSettings);

// Load settings on start
loadSettings();
