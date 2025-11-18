// Content Script für Google Meets
// Überwacht und steuert den Mikrofon-Status

let currentState = {
  inCall: false,
  micMuted: false,
  lastUpdate: null
};

// Funktion um zu prüfen ob wir in einem Call sind
function isInCall() {
  // Google Meets zeigt spezifische Elemente wenn ein Call aktiv ist
  const callElements = document.querySelector('[data-call-ended]');
  const participantElements = document.querySelector('[data-participant-id]');
  const leaveButton = document.querySelector('[aria-label*="Anruf verlassen"], [aria-label*="Leave call"]');

  return !callElements && (participantElements !== null || leaveButton !== null);
}

// Funktion um den Mikrofon-Status zu ermitteln
function getMicStatus() {
  // Suche nach dem Mikrofon-Button
  // Google Meets verwendet verschiedene aria-labels je nach Sprache
  const micButton = document.querySelector(
    '[aria-label*="Mikrofon"], [aria-label*="microphone"], ' +
    '[aria-label*="Mikrofon aus"], [aria-label*="Turn off microphone"], ' +
    '[aria-label*="Mikrofon ein"], [aria-label*="Turn on microphone"], ' +
    '[data-tooltip*="Mikrofon"], [data-tooltip*="microphone"]'
  );

  if (!micButton) {
    return null;
  }

  // Prüfe ob das Mikrofon stumm ist
  // Wenn "Turn on" oder "einschalten" im Label steht, ist es stumm
  const ariaLabel = micButton.getAttribute('aria-label') || '';
  const isMuted = ariaLabel.toLowerCase().includes('turn on') ||
                  ariaLabel.toLowerCase().includes('einschalten') ||
                  ariaLabel.toLowerCase().includes('ein ');

  // Alternative: Prüfe das data-is-muted Attribut falls vorhanden
  const dataMuted = micButton.getAttribute('data-is-muted');
  if (dataMuted !== null) {
    return dataMuted === 'true';
  }

  return isMuted;
}

// Funktion um das Mikrofon umzuschalten
function toggleMic() {
  const micButton = document.querySelector(
    '[aria-label*="Mikrofon"], [aria-label*="microphone"], ' +
    '[aria-label*="Mikrofon aus"], [aria-label*="Turn off microphone"], ' +
    '[aria-label*="Mikrofon ein"], [aria-label*="Turn on microphone"]'
  );

  if (micButton) {
    micButton.click();
    console.log('Mikrofon umgeschaltet');
    // Warte kurz und aktualisiere den Status
    setTimeout(updateState, 300);
    return true;
  }

  console.log('Mikrofon-Button nicht gefunden');
  return false;
}

// Status aktualisieren und an Background Script senden
function updateState() {
  const inCall = isInCall();
  const micMuted = inCall ? getMicStatus() : null;

  const newState = {
    inCall: inCall,
    micMuted: micMuted,
    lastUpdate: new Date().toISOString(),
    url: window.location.href
  };

  // Nur senden wenn sich etwas geändert hat
  if (JSON.stringify(newState) !== JSON.stringify(currentState)) {
    currentState = newState;
    chrome.runtime.sendMessage({
      type: 'STATE_UPDATE',
      state: currentState
    });
    console.log('Status Update:', currentState);
  }
}

// Listener für Messages vom Background Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message empfangen:', message);

  if (message.type === 'GET_STATE') {
    updateState();
    sendResponse({ success: true, state: currentState });
    return true;
  }

  if (message.type === 'TOGGLE_MIC') {
    const success = toggleMic();
    sendResponse({ success: success });
    return true;
  }

  if (message.type === 'SET_MIC') {
    const currentMuted = getMicStatus();
    const targetMuted = message.muted;

    // Nur umschalten wenn der aktuelle Status anders ist als gewünscht
    if (currentMuted !== null && currentMuted !== targetMuted) {
      const success = toggleMic();
      sendResponse({ success: success });
    } else {
      sendResponse({ success: true, message: 'Already in desired state' });
    }
    return true;
  }
});

// Observer für DOM-Änderungen (wenn UI sich aktualisiert)
const observer = new MutationObserver(() => {
  updateState();
});

// Beobachte das DOM für Änderungen
observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['aria-label', 'data-is-muted']
});

// Initiales Update nach 2 Sekunden (damit die Seite Zeit zum Laden hat)
setTimeout(updateState, 2000);

// Regelmäßige Updates alle 5 Sekunden als Fallback
setInterval(updateState, 5000);

console.log('Google Meets Home Assistant Integration geladen');
