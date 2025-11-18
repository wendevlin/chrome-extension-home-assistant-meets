// Background Service Worker - Direct Home Assistant Connection

let currentState = {
  inCall: false,
  micMuted: false,
  lastUpdate: null,
  activeTabId: null
};

let ws = null;
let reconnectInterval = null;
let authenticated = false;
let messageId = 1;

// Konfiguration - wird aus Storage geladen
let config = {
  haUrl: 'ws://homeassistant.local:8123/api/websocket',
  accessToken: null
};

// Lade Konfiguration aus Storage
async function loadConfig() {
  const stored = await chrome.storage.local.get(['haUrl', 'accessToken']);
  if (stored.haUrl) config.haUrl = stored.haUrl;
  if (stored.accessToken) config.accessToken = stored.accessToken;

  console.log('Konfiguration geladen:', { haUrl: config.haUrl, hasToken: !!config.accessToken });
}

// WebSocket Verbindung zu Home Assistant
async function connectToHomeAssistant() {
  if (!config.accessToken) {
    console.warn('⚠️ Kein Access Token konfiguriert. Bitte in Extension-Optionen eintragen.');
    return;
  }

  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log('WebSocket bereits verbunden');
    return;
  }

  try {
    ws = new WebSocket(config.haUrl);

    ws.onopen = () => {
      console.log('✅ Verbunden mit Home Assistant');
      authenticated = false;
    };

    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      await handleHomeAssistantMessage(message);
    };

    ws.onerror = (error) => {
      console.error('WebSocket Fehler:', error);
    };

    ws.onclose = () => {
      console.log('❌ Verbindung zu Home Assistant getrennt');
      ws = null;
      authenticated = false;

      // Versuche Reconnect
      if (!reconnectInterval) {
        reconnectInterval = setInterval(() => {
          console.log('Versuche Reconnect...');
          connectToHomeAssistant();
        }, 5000);
      }
    };
  } catch (e) {
    console.error('Fehler beim Verbinden:', e);
  }
}

// Behandle Messages von Home Assistant
async function handleHomeAssistantMessage(message) {
  console.log('HA Message:', message);

  // Auth Required
  if (message.type === 'auth_required') {
    sendToHomeAssistant({
      type: 'auth',
      access_token: config.accessToken
    });
  }

  // Auth OK
  if (message.type === 'auth_ok') {
    console.log('✅ Authentifizierung erfolgreich');
    authenticated = true;

    // Stoppe Reconnect Versuche
    if (reconnectInterval) {
      clearInterval(reconnectInterval);
      reconnectInterval = null;
    }

    // Sende initialen Status
    await refreshState();
    sendStateToHomeAssistant();

    // Abonniere Service Calls
    subscribeToServiceCalls();
  }

  // Auth Failed
  if (message.type === 'auth_invalid') {
    console.error('❌ Authentifizierung fehlgeschlagen! Prüfe Access Token.');
    ws.close();
  }

  // Event (Service Call von HA)
  if (message.type === 'event') {
    const eventData = message.event;

    // Service Call für Mikrofon Toggle
    if (eventData.event_type === 'google_meets_command') {
      const command = eventData.data.command;

      if (command === 'toggle_mic') {
        await toggleMic();
        sendStateToHomeAssistant();
      } else if (command === 'set_mic') {
        await setMic(eventData.data.muted);
        sendStateToHomeAssistant();
      }
    }
  }
}

// Sende Message an Home Assistant
function sendToHomeAssistant(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    if (!message.id && message.type !== 'auth') {
      message.id = messageId++;
    }
    ws.send(JSON.stringify(message));
  }
}

// Abonniere Service Calls
function subscribeToServiceCalls() {
  sendToHomeAssistant({
    type: 'subscribe_events',
    event_type: 'google_meets_command'
  });
}

// Sende aktuellen Status an Home Assistant
function sendStateToHomeAssistant() {
  if (!authenticated) return;

  // Sende als Custom Event
  sendToHomeAssistant({
    type: 'fire_event',
    event_type: 'google_meets_state',
    event_data: {
      in_call: currentState.inCall,
      mic_muted: currentState.micMuted,
      last_update: currentState.lastUpdate || new Date().toISOString()
    }
  });
}

// Speichere den aktuellen Status
function updateCurrentState(state, tabId) {
  currentState = {
    ...state,
    activeTabId: tabId
  };
  console.log('Current state updated:', currentState);

  // Sende Update an Home Assistant
  sendStateToHomeAssistant();
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

// Listener für Messages von externen Quellen (für API-Kompatibilität)
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log('External message received:', message);

  if (message.type === 'GET_STATE') {
    refreshState().then(state => {
      sendResponse({ success: true, state: state });
    });
    return true;
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
async function initialize() {
  console.log('Google Meets Home Assistant Extension gestartet');

  // Lade Konfiguration
  await loadConfig();

  // Verbinde mit Home Assistant
  connectToHomeAssistant();

  // Regelmäßiges Refresh alle 5 Sekunden
  setInterval(async () => {
    await refreshState();
    sendStateToHomeAssistant();
  }, 5000);
}

// Starte Initialisierung
initialize();
