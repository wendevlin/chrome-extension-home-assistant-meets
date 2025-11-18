"""Switch für Google Meets Mikrofon Steuerung."""
import logging

from homeassistant.components.switch import SwitchEntity
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import DOMAIN, get_current_state, send_command

_LOGGER = logging.getLogger(__name__)


async def async_setup_platform(
    hass: HomeAssistant,
    config: dict,
    async_add_entities: AddEntitiesCallback,
    discovery_info=None,
):
    """Set up the Google Meets switch platform."""
    # Erstelle Switch für Mikrofon
    async_add_entities([GoogleMeetsMicrophoneSwitch(hass)], True)


class GoogleMeetsMicrophoneSwitch(SwitchEntity):
    """Representation of a Google Meets Microphone Switch."""

    def __init__(self, hass: HomeAssistant):
        """Initialize the switch."""
        self.hass = hass
        self._attr_name = "Google Meets Microphone"
        self._attr_unique_id = "google_meets_microphone"

    async def async_added_to_hass(self):
        """Register callbacks."""

        @callback
        def update_state(event):
            """Update when state changes."""
            self.async_write_ha_state()

        # Listen für Updates
        self.async_on_remove(
            self.hass.bus.async_listen(f"{DOMAIN}_update", update_state)
        )

    @property
    def is_on(self) -> bool:
        """Return true if microphone is unmuted (ON = unmuted, OFF = muted)."""
        state = get_current_state(self.hass)

        # Switch ist ON wenn Mikrofon NICHT stumm ist
        return not state.get("mic_muted", True)

    @property
    def available(self) -> bool:
        """Return True if entity is available (nur wenn Call aktiv und verbunden)."""
        state = get_current_state(self.hass)

        # Switch ist nur verfügbar wenn:
        # 1. Verbindung zur Extension besteht
        # 2. Ein Call aktiv ist
        connected = state.get("connected", False)
        in_call = state.get("in_call", False)

        return connected and in_call

    async def async_turn_on(self, **kwargs):
        """Turn the microphone on (unmute)."""
        _LOGGER.info("Turning microphone ON (unmute)")
        # ON = unmuted = mic_muted: False
        send_command(self.hass, "set_mic", muted=False)

    async def async_turn_off(self, **kwargs):
        """Turn the microphone off (mute)."""
        _LOGGER.info("Turning microphone OFF (mute)")
        # OFF = muted = mic_muted: True
        send_command(self.hass, "set_mic", muted=True)

    @property
    def icon(self):
        """Return the icon."""
        if not self.available:
            return "mdi:microphone-off"

        if self.is_on:
            return "mdi:microphone"
        return "mdi:microphone-off"

    @property
    def extra_state_attributes(self):
        """Return additional state attributes."""
        state = get_current_state(self.hass)

        return {
            "in_call": state.get("in_call"),
            "muted": state.get("mic_muted"),
            "last_update": state.get("last_update"),
        }
