// Background Service Worker für die Chrome Extension

let currentState = {
  inCall: false,
  micMuted: false,
  lastUpdate: null,
  activeTabId: null
};

let ws = null;
const WS_URL = 'ws://localhost:8555';
let reconnectInterval = null;

// WebSocket Verbindung zum Bridge Server
function connectToServer() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log('WebSocket bereits verbunden');
    return;
  }

  try {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('✅ Verbunden mit Bridge Server');
      // Sende initialen Status
      refreshState().then(() => {
        sendStateToServer();
      });

      // Stoppe Reconnect Versuche
      if (reconnectInterval) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleServerMessage(message);
      } catch (e) {
        console.error('Fehler beim Parsen der Server Message:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket Fehler:', error);
    };

    ws.onclose = () => {
      console.log('❌ Verbindung zum Bridge Server getrennt');
      ws = null;

      // Versuche Reconnect
      if (!reconnectInterval) {
        reconnectInterval = setInterval(() => {
          console.log('Versuche Reconnect...');
          connectToServer();
        }, 5000);
      }
    };
  } catch (e) {
    console.error('Fehler beim Verbinden:', e);
  }
}

// Behandle Messages vom Server
async function handleServerMessage(message) {
  console.log('Message vom Server:', message);

  if (message.type === 'GET_STATE') {
    await refreshState();
    sendStateToServer();
  } else if (message.type === 'TOGGLE_MIC') {
    await toggleMic();
    sendStateToServer();
  } else if (message.type === 'SET_MIC') {
    await setMic(message.muted);
    sendStateToServer();
  }
}

// Sende aktuellen Status an Server
function sendStateToServer() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'STATE_UPDATE',
      state: currentState
    }));
  }
}

// Speichere den aktuellen Status
function updateCurrentState(state, tabId) {
  currentState = {
    ...state,
    activeTabId: tabId
  };
  console.log('Current state updated:', currentState);

  // Sende Update an Server
  sendStateToServer();
}

// Finde den ersten aktiven Google Meets Tab
async function findActiveMeetsTab() {
  const tabs = await chrome.tabs.query({ url: 'https://meet.google.com/*' });

  // Priorisiere Tabs wo ein Call aktiv ist
  for (const tab of tabs) {
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATE' });
      if (response && response.state && response.state.inCall) {
        return tab;
      }
    } catch (e) {
      // Tab antwortet nicht, überspringen
      console.log('Tab antwortet nicht:', tab.id);
    }
  }

  // Fallback: Erster Google Meets Tab
  return tabs[0] || null;
}

// Hole den aktuellen Status vom aktiven Tab
async function refreshState() {
  const tab = await findActiveMeetsTab();

  if (!tab) {
    // Kein Meets Tab gefunden
    currentState = {
      inCall: false,
      micMuted: false,
      lastUpdate: new Date().toISOString(),
      activeTabId: null
    };
    return currentState;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATE' });
    if (response && response.state) {
      updateCurrentState(response.state, tab.id);
    }
  } catch (e) {
    console.error('Fehler beim Abrufen des Status:', e);
  }

  return currentState;
}

// Mikrofon umschalten
async function toggleMic() {
  const tab = await findActiveMeetsTab();

  if (!tab) {
    return { success: false, error: 'No active Meets tab found' };
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_MIC' });
    // Aktualisiere den Status nach kurzer Verzögerung
    setTimeout(refreshState, 500);
    return response;
  } catch (e) {
    console.error('Fehler beim Umschalten des Mikrofons:', e);
    return { success: false, error: e.message };
  }
}

// Mikrofon auf spezifischen Status setzen
async function setMic(muted) {
  const tab = await findActiveMeetsTab();

  if (!tab) {
    return { success: false, error: 'No active Meets tab found' };
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'SET_MIC',
      muted: muted
    });
    // Aktualisiere den Status nach kurzer Verzögerung
    setTimeout(refreshState, 500);
    return response;
  } catch (e) {
    console.error('Fehler beim Setzen des Mikrofons:', e);
    return { success: false, error: e.message };
  }
}

// Listener für Messages von Content Scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  if (message.type === 'STATE_UPDATE') {
    updateCurrentState(message.state, sender.tab.id);
    sendResponse({ success: true });
    return true;
  }
});

// Listener für Messages von externen Quellen (Bridge Server)
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log('External message received:', message);

  if (message.type === 'GET_STATE') {
    refreshState().then(state => {
      sendResponse({ success: true, state: state });
    });
    return true; // Asynchrone Antwort
  }

  if (message.type === 'TOGGLE_MIC') {
    toggleMic().then(result => {
      sendResponse(result);
    });
    return true;
  }

  if (message.type === 'SET_MIC') {
    setMic(message.muted).then(result => {
      sendResponse(result);
    });
    return true;
  }

  sendResponse({ success: false, error: 'Unknown message type' });
  return false;
});

// Initialisierung
console.log('Google Meets Home Assistant Background Service gestartet');

// Verbinde mit Bridge Server
connectToServer();

// Regelmäßiges Refresh alle 10 Sekunden
setInterval(refreshState, 10000);
