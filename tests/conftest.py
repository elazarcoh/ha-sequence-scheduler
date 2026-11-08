"""Shared fixtures.

pytest-homeassistant-custom-component ships the `hass` fixture; custom
integrations are only loaded when `enable_custom_integrations` is requested.
"""

import pytest
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.sequence_scheduler.const import DOMAIN


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    """Make the custom component importable in every test."""
    yield


@pytest.fixture
async def jerusalem(hass):
    """Pin the test instance to the real deployment timezone.

    The default test timezone is US/Pacific, which silently shifts every
    wall-clock calculation. Any test touching times MUST use this.
    """
    await hass.config.async_set_time_zone("Asia/Jerusalem")
    return hass


@pytest.fixture
def setup_integration(hass):
    """Return an async callable that sets the integration up and returns its entry."""

    async def _setup(options: dict | None = None) -> MockConfigEntry:
        await async_setup_component(hass, "lovelace", {})
        entry = MockConfigEntry(
            domain=DOMAIN, title="Sequence Scheduler", options=options or {}
        )
        entry.add_to_hass(hass)
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
        return entry

    return _setup
