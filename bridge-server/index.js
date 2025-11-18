const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 8555;

// Aktueller Status
let currentState = {
  inCall: false,
  micMuted: false,
  lastUpdate: null,
  connected: false
};

// WebSocket Clients (Chrome Extension)
let extensionClient = null;

// Middleware
app.use(cors());
app.use(express.json());

// WebSocket Verbindung für Chrome Extension
wss.on('connection', (ws) => {
  console.log('Chrome Extension verbunden');
  extensionClient = ws;
  currentState.connected = true;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Message von Extension:', data);

      if (data.type === 'STATE_UPDATE') {
        currentState = {
          ...data.state,
          connected: true
        };
        console.log('Status aktualisiert:', currentState);
      }
    } catch (e) {
      console.error('Fehler beim Parsen der Message:', e);
    }
  });

  ws.on('close', () => {
    console.log('Chrome Extension getrennt');
    extensionClient = null;
    currentState.connected = false;
  });

  ws.on('error', (error) => {
    console.error('WebSocket Fehler:', error);
  });

  // Sende initiales Status Request
  sendToExtension({ type: 'GET_STATE' });
});

// Hilfsfunktion um Messages an die Extension zu senden
function sendToExtension(message) {
  if (extensionClient && extensionClient.readyState === WebSocket.OPEN) {
    extensionClient.send(JSON.stringify(message));
    return true;
  }
  return false;
}

// Warte auf Antwort von der Extension (mit Timeout)
function waitForResponse(timeout = 2000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(null);
    }, timeout);

    if (extensionClient) {
      const handler = (message) => {
        try {
          const data = JSON.parse(message);
          if (data.type === 'STATE_UPDATE') {
            clearTimeout(timer);
            extensionClient.removeListener('message', handler);
            resolve(data.state);
          }
        } catch (e) {
          // Ignoriere parse errors
        }
      };

      extensionClient.on('message', handler);
    } else {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

// API Endpunkte für Home Assistant

// GET /status - Aktueller Status
app.get('/status', async (req, res) => {
  // Fordere aktuellen Status von Extension an
  if (sendToExtension({ type: 'GET_STATE' })) {
    const state = await waitForResponse();
    if (state) {
      currentState = { ...state, connected: true };
    }
  }

  res.json({
    success: true,
    state: currentState
  });
});

// POST /toggle - Mikrofon umschalten
app.post('/toggle', async (req, res) => {
  if (!currentState.connected) {
    return res.status(503).json({
      success: false,
      error: 'Chrome Extension nicht verbunden'
    });
  }

  if (!currentState.inCall) {
    return res.status(400).json({
      success: false,
      error: 'Kein aktiver Call'
    });
  }

  sendToExtension({ type: 'TOGGLE_MIC' });

  // Warte kurz und hole neuen Status
  setTimeout(async () => {
    sendToExtension({ type: 'GET_STATE' });
  }, 500);

  res.json({
    success: true,
    message: 'Mikrofon wird umgeschaltet'
  });
});

// POST /set - Mikrofon auf spezifischen Status setzen
app.post('/set', async (req, res) => {
  const { muted } = req.body;

  if (typeof muted !== 'boolean') {
    return res.status(400).json({
      success: false,
      error: 'Parameter "muted" muss ein Boolean sein'
    });
  }

  if (!currentState.connected) {
    return res.status(503).json({
      success: false,
      error: 'Chrome Extension nicht verbunden'
    });
  }

  if (!currentState.inCall) {
    return res.status(400).json({
      success: false,
      error: 'Kein aktiver Call'
    });
  }

  sendToExtension({
    type: 'SET_MIC',
    muted: muted
  });

  // Warte kurz und hole neuen Status
  setTimeout(async () => {
    sendToExtension({ type: 'GET_STATE' });
  }, 500);

  res.json({
    success: true,
    message: `Mikrofon wird auf ${muted ? 'stumm' : 'aktiv'} gesetzt`
  });
});

// Health Check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'running',
    extensionConnected: currentState.connected
  });
});

// Serve static HTML für die Extension Connector Page
app.get('/connector', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Google Meets HA Bridge Connector</title>
</head>
<body>
  <h1>Google Meets Home Assistant Bridge</h1>
  <p>Status: <span id="status">Verbinde...</span></p>
  <p>In Call: <span id="inCall">-</span></p>
  <p>Mic Muted: <span id="micMuted">-</span></p>

  <script>
    // Diese Seite muss im Browser geöffnet werden damit die Extension kommunizieren kann
    const EXTENSION_ID = 'YOUR_EXTENSION_ID_HERE';
    const ws = new WebSocket('ws://localhost:${PORT}');

    ws.onopen = () => {
      console.log('WebSocket verbunden');
      document.getElementById('status').textContent = 'Verbunden';

      // Starte Polling
      setInterval(updateState, 2000);
      updateState();
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('Message vom Server:', message);

      if (message.type === 'GET_STATE') {
        // Server fragt nach Status - hole von Extension
        updateState();
      } else if (message.type === 'TOGGLE_MIC' || message.type === 'SET_MIC') {
        // Weiterleiten an Extension
        chrome.runtime.sendMessage(EXTENSION_ID, message, (response) => {
          console.log('Response:', response);
        });
      }
    };

    function updateState() {
      chrome.runtime.sendMessage(EXTENSION_ID, { type: 'GET_STATE' }, (response) => {
        if (response && response.state) {
          const state = response.state;

          // Update UI
          document.getElementById('inCall').textContent = state.inCall ? 'Ja' : 'Nein';
          document.getElementById('micMuted').textContent = state.micMuted ? 'Ja' : 'Nein';

          // Sende an Server
          ws.send(JSON.stringify({
            type: 'STATE_UPDATE',
            state: state
          }));
        }
      });
    }
  </script>
</body>
</html>
  `);
});

// Server starten
server.listen(PORT, () => {
  console.log(`🚀 Bridge Server läuft auf http://localhost:${PORT}`);
  console.log(`📊 Status API: http://localhost:${PORT}/status`);
  console.log(`🔌 Connector Page: http://localhost:${PORT}/connector`);
  console.log('\nWarte auf Verbindung von Chrome Extension...');
});
