"""Switch für Google Meets Mikrofon Steuerung."""
import logging

from homeassistant.components.switch import SwitchEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from . import DOMAIN

_LOGGER = logging.getLogger(__name__)


async def async_setup_platform(
    hass: HomeAssistant,
    config: dict,
    async_add_entities: AddEntitiesCallback,
    discovery_info=None,
):
    """Set up the Google Meets switch platform."""
    coordinator = hass.data[DOMAIN]["coordinator"]

    # Erstelle Switch für Mikrofon
    async_add_entities([GoogleMeetsMicrophoneSwitch(coordinator)], True)


class GoogleMeetsMicrophoneSwitch(CoordinatorEntity, SwitchEntity):
    """Representation of a Google Meets Microphone Switch."""

    def __init__(self, coordinator):
        """Initialize the switch."""
        super().__init__(coordinator)
        self._attr_name = "Google Meets Microphone"
        self._attr_unique_id = "google_meets_microphone"

    @property
    def is_on(self) -> bool:
        """Return true if microphone is unmuted (ON = unmuted, OFF = muted)."""
        if self.coordinator.data is None:
            return False

        # Switch ist ON wenn Mikrofon NICHT stumm ist
        return not self.coordinator.data.get("mic_muted", True)

    @property
    def available(self) -> bool:
        """Return True if entity is available (nur wenn Call aktiv und verbunden)."""
        if self.coordinator.data is None:
            return False

        # Switch ist nur verfügbar wenn:
        # 1. Verbindung zum Bridge Server besteht
        # 2. Ein Call aktiv ist
        connected = self.coordinator.data.get("connected", False)
        in_call = self.coordinator.data.get("in_call", False)

        return connected and in_call

    async def async_turn_on(self, **kwargs):
        """Turn the microphone on (unmute)."""
        _LOGGER.info("Turning microphone ON (unmute)")
        # ON = unmuted = mic_muted: False
        await self.coordinator.async_set_mic(muted=False)

    async def async_turn_off(self, **kwargs):
        """Turn the microphone off (mute)."""
        _LOGGER.info("Turning microphone OFF (mute)")
        # OFF = muted = mic_muted: True
        await self.coordinator.async_set_mic(muted=True)

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
        if self.coordinator.data is None:
            return {}

        return {
            "in_call": self.coordinator.data.get("in_call"),
            "muted": self.coordinator.data.get("mic_muted"),
            "last_update": self.coordinator.data.get("last_update"),
        }
