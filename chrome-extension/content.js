// Content Script for Google Meets
// Monitors and controls microphone status

let currentState = {
  inCall: false,
  micMuted: false,
  lastUpdate: null
};

// Function to check if we are in a call
function isInCall() {
  // Google Meets shows specific elements when a call is active
  const callElements = document.querySelector('[data-call-ended]');
  const participantElements = document.querySelector('[data-participant-id]');
  const leaveButton = document.querySelector('[aria-label*="Anruf verlassen"], [aria-label*="Leave call"]');

  return !callElements && (participantElements !== null || leaveButton !== null);
}

// Function to determine microphone status
function getMicStatus() {
  // Search for the microphone button
  // Google Meets uses different aria-labels depending on language
  const micButton = document.querySelector(
    '[aria-label*="Mikrofon"], [aria-label*="microphone"], ' +
    '[aria-label*="Mikrofon aus"], [aria-label*="Turn off microphone"], ' +
    '[aria-label*="Mikrofon ein"], [aria-label*="Turn on microphone"], ' +
    '[data-tooltip*="Mikrofon"], [data-tooltip*="microphone"]'
  );

  if (!micButton) {
    return null;
  }

  // Check if microphone is muted
  // If "Turn on" or "einschalten" is in the label, it's muted
  const ariaLabel = micButton.getAttribute('aria-label') || '';
  const isMuted = ariaLabel.toLowerCase().includes('turn on') ||
                  ariaLabel.toLowerCase().includes('einschalten') ||
                  ariaLabel.toLowerCase().includes('ein ');

  // Alternative: Check data-is-muted attribute if available
  const dataMuted = micButton.getAttribute('data-is-muted');
  if (dataMuted !== null) {
    return dataMuted === 'true';
  }

  return isMuted;
}

// Function to toggle microphone
function toggleMic() {
  const micButton = document.querySelector(
    '[aria-label*="Mikrofon"], [aria-label*="microphone"], ' +
    '[aria-label*="Mikrofon aus"], [aria-label*="Turn off microphone"], ' +
    '[aria-label*="Mikrofon ein"], [aria-label*="Turn on microphone"]'
  );

  if (micButton) {
    micButton.click();
    console.log('Microphone toggled');
    // Wait briefly and update status
    setTimeout(updateState, 300);
    return true;
  }

  console.log('Microphone button not found');
  return false;
}

// Update status and send to Background Script
function updateState() {
  const inCall = isInCall();
  const micMuted = inCall ? getMicStatus() : null;

  const newState = {
    inCall: inCall,
    micMuted: micMuted,
    lastUpdate: new Date().toISOString(),
    url: window.location.href
  };

  // Only send if something changed
  if (JSON.stringify(newState) !== JSON.stringify(currentState)) {
    currentState = newState;
    chrome.runtime.sendMessage({
      type: 'STATE_UPDATE',
      state: currentState
    });
    console.log('Status Update:', currentState);
  }
}

// Listener for messages from Background Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);

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

    // Only toggle if current status differs from desired state
    if (currentMuted !== null && currentMuted !== targetMuted) {
      const success = toggleMic();
      sendResponse({ success: success });
    } else {
      sendResponse({ success: true, message: 'Already in desired state' });
    }
    return true;
  }
});

// Observer for DOM changes (when UI updates)
const observer = new MutationObserver(() => {
  updateState();
});

// Observe DOM for changes
observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['aria-label', 'data-is-muted']
});

// Initial update after 2 seconds (to give page time to load)
setTimeout(updateState, 2000);

// Regular updates every 5 seconds as fallback
setInterval(updateState, 5000);

console.log('Google Meets Home Assistant Integration loaded');
