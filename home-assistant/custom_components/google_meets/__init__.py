"""Google Meets Home Assistant Integration."""
import logging
from datetime import datetime, timedelta

from homeassistant.core import HomeAssistant, Event, callback
from homeassistant.const import Platform
from homeassistant.helpers.event import async_track_time_interval

_LOGGER = logging.getLogger(__name__)

DOMAIN = "google_meets"
PLATFORMS = [Platform.BINARY_SENSOR, Platform.SWITCH]

# Event Types
EVENT_STATE_UPDATE = "google_meets_state"
EVENT_COMMAND = "google_meets_command"

# Timeout for "connected" status (if no update received for X seconds)
CONNECTION_TIMEOUT = timedelta(seconds=15)


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the Google Meets component."""
    hass.data.setdefault(DOMAIN, {})

    # Initial state
    hass.data[DOMAIN]["state"] = {
        "in_call": False,
        "mic_muted": False,
        "last_update": None,
        "connected": False,
    }

    # Event listener for status updates from Chrome Extension
    @callback
    def handle_state_update(event: Event):
        """Handle state update from Chrome Extension."""
        data = event.data
        _LOGGER.debug(f"Received state update: {data}")

        # Update state
        hass.data[DOMAIN]["state"] = {
            "in_call": data.get("in_call", False),
            "mic_muted": data.get("mic_muted", False),
            "last_update": datetime.now(),
            "connected": True,  # If we receive an update, the extension is connected
        }

        # Trigger update for all entities
        hass.bus.async_fire(f"{DOMAIN}_update")

    hass.bus.async_listen(EVENT_STATE_UPDATE, handle_state_update)

    # Periodically check if connection is still alive
    @callback
    def check_connection(now):
        """Check if connection is still alive."""
        last_update = hass.data[DOMAIN]["state"].get("last_update")

        if last_update and (datetime.now() - last_update) > CONNECTION_TIMEOUT:
            if hass.data[DOMAIN]["state"]["connected"]:
                _LOGGER.warning("Chrome Extension connection timeout")
                hass.data[DOMAIN]["state"]["connected"] = False
                hass.data[DOMAIN]["state"]["in_call"] = False
                hass.data[DOMAIN]["state"]["mic_muted"] = False
                hass.bus.async_fire(f"{DOMAIN}_update")

    # Check connection every 10 seconds
    async_track_time_interval(hass, check_connection, timedelta(seconds=10))

    # Register service for microphone toggle
    async def async_toggle_microphone(call):
        """Service to toggle microphone."""
        _LOGGER.info("Toggle microphone service called")
        hass.bus.async_fire(EVENT_COMMAND, {"command": "toggle_mic"})

    hass.services.async_register(DOMAIN, "toggle_microphone", async_toggle_microphone)

    # Register service for microphone set
    async def async_set_microphone(call):
        """Service to set microphone state."""
        muted = call.data.get("muted", True)
        _LOGGER.info(f"Set microphone service called: muted={muted}")
        hass.bus.async_fire(EVENT_COMMAND, {"command": "set_mic", "muted": muted})

    hass.services.async_register(DOMAIN, "set_microphone", async_set_microphone)

    # Load platforms
    for platform in PLATFORMS:
        hass.async_create_task(
            hass.helpers.discovery.async_load_platform(platform, DOMAIN, {}, config)
        )

    _LOGGER.info("Google Meets Integration loaded")
    return True


def get_current_state(hass: HomeAssistant) -> dict:
    """Get current Google Meets state."""
    return hass.data[DOMAIN]["state"]


def send_command(hass: HomeAssistant, command: str, **kwargs):
    """Send command to Chrome Extension."""
    event_data = {"command": command}
    event_data.update(kwargs)
    hass.bus.async_fire(EVENT_COMMAND, event_data)
