"""Config flow: single instance, no input; options carry the grace window."""

import pytest
import voluptuous as vol
from homeassistant import config_entries
from homeassistant.data_entry_flow import FlowResultType
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.sequence_scheduler.const import CONF_GRACE_MINUTES, DOMAIN


async def test_user_flow_creates_entry(hass):
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    if result["type"] is FlowResultType.FORM:
        result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Sequence Scheduler"


async def test_second_entry_aborts(hass):
    MockConfigEntry(domain=DOMAIN, title="Sequence Scheduler").add_to_hass(hass)
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "single_instance_allowed"


async def test_options_flow_sets_grace(hass, setup_integration):
    entry = await setup_integration()
    result = await hass.config_entries.options.async_init(entry.entry_id)
    assert result["type"] is FlowResultType.FORM
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {CONF_GRACE_MINUTES: 15}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert entry.options[CONF_GRACE_MINUTES] == 15


@pytest.mark.parametrize("bad", [0, 121])
async def test_options_flow_rejects_out_of_range_grace(hass, setup_integration, bad):
    entry = await setup_integration()
    result = await hass.config_entries.options.async_init(entry.entry_id)
    with pytest.raises(vol.Invalid):
        await hass.config_entries.options.async_configure(
            result["flow_id"], {CONF_GRACE_MINUTES: bad}
        )
