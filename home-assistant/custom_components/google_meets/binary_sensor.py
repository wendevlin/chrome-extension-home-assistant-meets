"""Binary Sensor für Google Meets Call Status."""
import logging

from homeassistant.components.binary_sensor import (
    BinarySensorEntity,
    BinarySensorDeviceClass,
)
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import DOMAIN, get_current_state

_LOGGER = logging.getLogger(__name__)


async def async_setup_platform(
    hass: HomeAssistant,
    config: dict,
    async_add_entities: AddEntitiesCallback,
    discovery_info=None,
):
    """Set up the Google Meets binary sensor platform."""
    # Erstelle Binary Sensor für Call Status
    async_add_entities([GoogleMeetsCallSensor(hass)], True)


class GoogleMeetsCallSensor(BinarySensorEntity):
    """Representation of a Google Meets Call Status Sensor."""

    def __init__(self, hass: HomeAssistant):
        """Initialize the sensor."""
        self.hass = hass
        self._attr_name = "Google Meets Call Active"
        self._attr_unique_id = "google_meets_call_active"
        self._attr_device_class = BinarySensorDeviceClass.OCCUPANCY

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
        """Return true if call is active."""
        state = get_current_state(self.hass)
        return state.get("in_call", False)

    @property
    def available(self) -> bool:
        """Return True if entity is available."""
        state = get_current_state(self.hass)
        return state.get("connected", False)

    @property
    def extra_state_attributes(self):
        """Return additional state attributes."""
        state = get_current_state(self.hass)

        return {
            "mic_muted": state.get("mic_muted"),
            "last_update": state.get("last_update"),
            "connected": state.get("connected"),
        }

    @property
    def icon(self):
        """Return the icon."""
        if self.is_on:
            return "mdi:video"
        return "mdi:video-off"
