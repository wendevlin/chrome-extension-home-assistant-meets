// Options Page Script

// Lade gespeicherte Einstellungen
async function loadSettings() {
  const stored = await chrome.storage.local.get(['haUrl', 'accessToken']);

  if (stored.haUrl) {
    document.getElementById('haUrl').value = stored.haUrl;
  }

  if (stored.accessToken) {
    document.getElementById('accessToken').value = stored.accessToken;
  }
}

// Speichere Einstellungen
async function saveSettings() {
  const haUrl = document.getElementById('haUrl').value.trim();
  const accessToken = document.getElementById('accessToken').value.trim();

  if (!haUrl) {
    showStatus('Bitte gib eine Home Assistant URL ein', 'error');
    return;
  }

  if (!accessToken) {
    showStatus('Bitte gib ein Access Token ein', 'error');
    return;
  }

  // Validiere URL Format
  if (!haUrl.startsWith('ws://') && !haUrl.startsWith('wss://')) {
    showStatus('URL muss mit ws:// oder wss:// beginnen', 'error');
    return;
  }

  await chrome.storage.local.set({
    haUrl: haUrl,
    accessToken: accessToken
  });

  showStatus('Einstellungen gespeichert! Extension wird neugestartet...', 'success');

  // Restart extension background script
  setTimeout(() => {
    chrome.runtime.reload();
  }, 1000);
}

// Zeige Status-Nachricht
function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';

  // Verstecke nach 5 Sekunden (außer bei Erfolg)
  if (type !== 'success') {
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000);
  }
}

// Event Listeners
document.getElementById('save').addEventListener('click', saveSettings);

// Lade Einstellungen beim Start
loadSettings();
