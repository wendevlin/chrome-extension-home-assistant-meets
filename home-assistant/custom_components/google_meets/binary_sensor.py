"""Binary Sensor für Google Meets Call Status."""
import logging

from homeassistant.components.binary_sensor import (
    BinarySensorEntity,
    BinarySensorDeviceClass,
)
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
    """Set up the Google Meets binary sensor platform."""
    coordinator = hass.data[DOMAIN]["coordinator"]

    # Erstelle Binary Sensor für Call Status
    async_add_entities([GoogleMeetsCallSensor(coordinator)], True)


class GoogleMeetsCallSensor(CoordinatorEntity, BinarySensorEntity):
    """Representation of a Google Meets Call Status Sensor."""

    def __init__(self, coordinator):
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._attr_name = "Google Meets Call Active"
        self._attr_unique_id = "google_meets_call_active"
        self._attr_device_class = BinarySensorDeviceClass.OCCUPANCY

    @property
    def is_on(self) -> bool:
        """Return true if call is active."""
        if self.coordinator.data is None:
            return False
        return self.coordinator.data.get("in_call", False)

    @property
    def available(self) -> bool:
        """Return True if entity is available."""
        if self.coordinator.data is None:
            return False
        return self.coordinator.data.get("connected", False)

    @property
    def extra_state_attributes(self):
        """Return additional state attributes."""
        if self.coordinator.data is None:
            return {}

        return {
            "mic_muted": self.coordinator.data.get("mic_muted"),
            "last_update": self.coordinator.data.get("last_update"),
            "connected": self.coordinator.data.get("connected"),
        }

    @property
    def icon(self):
        """Return the icon."""
        if self.is_on:
            return "mdi:video"
        return "mdi:video-off"
