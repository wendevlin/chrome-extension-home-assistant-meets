"""Google Meets Home Assistant Integration."""
import logging
import asyncio
import aiohttp
from datetime import timedelta

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.const import Platform
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

_LOGGER = logging.getLogger(__name__)

DOMAIN = "google_meets"
PLATFORMS = [Platform.BINARY_SENSOR, Platform.SWITCH]

# Bridge Server URL (kann in configuration.yaml überschrieben werden)
DEFAULT_BRIDGE_URL = "http://localhost:8555"
SCAN_INTERVAL = timedelta(seconds=2)


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the Google Meets component."""
    hass.data.setdefault(DOMAIN, {})

    # Hole Bridge URL aus Config oder verwende Default
    bridge_url = config.get(DOMAIN, {}).get("bridge_url", DEFAULT_BRIDGE_URL)
    hass.data[DOMAIN]["bridge_url"] = bridge_url

    # Erstelle Coordinator für Status Updates
    coordinator = GoogleMeetsDataUpdateCoordinator(hass, bridge_url)

    # Initiales Update
    await coordinator.async_config_entry_first_refresh()

    hass.data[DOMAIN]["coordinator"] = coordinator

    # Lade Plattformen
    for platform in PLATFORMS:
        hass.async_create_task(
            hass.helpers.discovery.async_load_platform(platform, DOMAIN, {}, config)
        )

    return True


class GoogleMeetsDataUpdateCoordinator(DataUpdateCoordinator):
    """Class to manage fetching Google Meets data."""

    def __init__(self, hass: HomeAssistant, bridge_url: str):
        """Initialize."""
        self.bridge_url = bridge_url
        self.hass = hass

        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=SCAN_INTERVAL,
        )

    async def _async_update_data(self):
        """Fetch data from Bridge Server."""
        session = async_get_clientsession(self.hass)

        try:
            async with asyncio.timeout(10):
                response = await session.get(f"{self.bridge_url}/status")

                if response.status != 200:
                    raise UpdateFailed(f"Error fetching data: {response.status}")

                data = await response.json()

                if not data.get("success"):
                    raise UpdateFailed("Bridge Server returned error")

                state = data.get("state", {})

                return {
                    "in_call": state.get("inCall", False),
                    "mic_muted": state.get("micMuted", False),
                    "connected": state.get("connected", False),
                    "last_update": state.get("lastUpdate"),
                }

        except asyncio.TimeoutError:
            raise UpdateFailed("Timeout connecting to Bridge Server")
        except aiohttp.ClientError as err:
            raise UpdateFailed(f"Error connecting to Bridge Server: {err}")
        except Exception as err:
            raise UpdateFailed(f"Unexpected error: {err}")

    async def async_toggle_mic(self):
        """Toggle microphone."""
        session = async_get_clientsession(self.hass)

        try:
            async with asyncio.timeout(10):
                response = await session.post(f"{self.bridge_url}/toggle")

                if response.status != 200:
                    _LOGGER.error("Failed to toggle microphone: %s", response.status)
                    return False

                # Aktualisiere Daten nach kurzer Verzögerung
                await asyncio.sleep(0.5)
                await self.async_request_refresh()

                return True

        except Exception as err:
            _LOGGER.error("Error toggling microphone: %s", err)
            return False

    async def async_set_mic(self, muted: bool):
        """Set microphone to specific state."""
        session = async_get_clientsession(self.hass)

        try:
            async with asyncio.timeout(10):
                response = await session.post(
                    f"{self.bridge_url}/set", json={"muted": muted}
                )

                if response.status != 200:
                    _LOGGER.error("Failed to set microphone: %s", response.status)
                    return False

                # Aktualisiere Daten nach kurzer Verzögerung
                await asyncio.sleep(0.5)
                await self.async_request_refresh()

                return True

        except Exception as err:
            _LOGGER.error("Error setting microphone: %s", err)
            return False
