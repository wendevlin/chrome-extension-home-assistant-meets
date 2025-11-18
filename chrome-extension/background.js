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

// Configuration - loaded from storage
let config = {
  haUrl: 'ws://homeassistant.local:8123/api/websocket',
  accessToken: null
};

// Load configuration from storage
async function loadConfig() {
  const stored = await chrome.storage.local.get(['haUrl', 'accessToken']);
  if (stored.haUrl) config.haUrl = stored.haUrl;
  if (stored.accessToken) config.accessToken = stored.accessToken;

  console.log('Configuration loaded:', { haUrl: config.haUrl, hasToken: !!config.accessToken });
}

// WebSocket connection to Home Assistant
async function connectToHomeAssistant() {
  if (!config.accessToken) {
    console.warn('⚠️ No access token configured. Please set it in extension options.');
    return;
  }

  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log('WebSocket already connected');
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
      console.error('WebSocket Error:', error);
    };

    ws.onclose = () => {
      console.log('❌ Connection to Home Assistant lost');
      ws = null;
      authenticated = false;

      // Attempt reconnect
      if (!reconnectInterval) {
        reconnectInterval = setInterval(() => {
          console.log('Attempting reconnect...');
          connectToHomeAssistant();
        }, 5000);
      }
    };
  } catch (e) {
    console.error('Error connecting:', e);
  }
}

// Handle messages from Home Assistant
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
    console.log('✅ Authentication successful');
    authenticated = true;

    // Stop reconnect attempts
    if (reconnectInterval) {
      clearInterval(reconnectInterval);
      reconnectInterval = null;
    }

    // Send initial status
    await refreshState();
    sendStateToHomeAssistant();

    // Subscribe to service calls
    subscribeToServiceCalls();
  }

  // Auth Failed
  if (message.type === 'auth_invalid') {
    console.error('❌ Authentication failed! Check access token.');
    ws.close();
  }

  // Event (Service Call from HA)
  if (message.type === 'event') {
    const eventData = message.event;

    // Service call for microphone toggle
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

// Send message to Home Assistant
function sendToHomeAssistant(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    if (!message.id && message.type !== 'auth') {
      message.id = messageId++;
    }
    ws.send(JSON.stringify(message));
  }
}

// Subscribe to service calls
function subscribeToServiceCalls() {
  sendToHomeAssistant({
    type: 'subscribe_events',
    event_type: 'google_meets_command'
  });
}

// Send current status to Home Assistant
function sendStateToHomeAssistant() {
  if (!authenticated) return;

  // Send as custom event
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

// Store current status
function updateCurrentState(state, tabId) {
  currentState = {
    ...state,
    activeTabId: tabId
  };
  console.log('Current state updated:', currentState);

  // Send update to Home Assistant
  sendStateToHomeAssistant();
}

// Find first active Google Meets tab
async function findActiveMeetsTab() {
  const tabs = await chrome.tabs.query({ url: 'https://meet.google.com/*' });

  // Prioritize tabs where a call is active
  for (const tab of tabs) {
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATE' });
      if (response && response.state && response.state.inCall) {
        return tab;
      }
    } catch (e) {
      // Tab not responding, skip
    }
  }

  // Fallback: First Google Meets tab
  return tabs[0] || null;
}

// Get current status from active tab
async function refreshState() {
  const tab = await findActiveMeetsTab();

  if (!tab) {
    // No Meets tab found
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
    console.error('Error fetching status:', e);
  }

  return currentState;
}

// Toggle microphone
async function toggleMic() {
  const tab = await findActiveMeetsTab();

  if (!tab) {
    return { success: false, error: 'No active Meets tab found' };
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_MIC' });
    // Update status after brief delay
    setTimeout(refreshState, 500);
    return response;
  } catch (e) {
    console.error('Error toggling microphone:', e);
    return { success: false, error: e.message };
  }
}

// Set microphone to specific status
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
    // Update status after brief delay
    setTimeout(refreshState, 500);
    return response;
  } catch (e) {
    console.error('Error setting microphone:', e);
    return { success: false, error: e.message };
  }
}

// Listener for messages from Content Scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  if (message.type === 'STATE_UPDATE') {
    updateCurrentState(message.state, sender.tab.id);
    sendResponse({ success: true });
    return true;
  }
});

// Listener for messages from external sources (for API compatibility)
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

// Initialization
async function initialize() {
  console.log('Google Meets Home Assistant Extension started');

  // Load configuration
  await loadConfig();

  // Connect to Home Assistant
  connectToHomeAssistant();

  // Regular refresh every 5 seconds
  setInterval(async () => {
    await refreshState();
    sendStateToHomeAssistant();
  }, 5000);
}

// Start initialization
initialize();
