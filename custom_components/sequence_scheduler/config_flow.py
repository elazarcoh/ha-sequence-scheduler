"""Config flow: a single instance with no setup input.

The only setting is the grace window, offered in the options flow.
"""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.config_entries import (
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlowWithReload,
)
from homeassistant.core import callback
from homeassistant.helpers import selector

from .const import (
    CONF_GRACE_MINUTES,
    DEFAULT_GRACE_MINUTES,
    DOMAIN,
    MAX_GRACE_MINUTES,
    MIN_GRACE_MINUTES,
    TITLE,
)


class SequenceSchedulerConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        return self.async_create_entry(title=TITLE, data={})

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return OptionsFlow()


class OptionsFlow(OptionsFlowWithReload):
    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(
                data={CONF_GRACE_MINUTES: int(user_input[CONF_GRACE_MINUTES])}
            )
        current = self.config_entry.options.get(
            CONF_GRACE_MINUTES, DEFAULT_GRACE_MINUTES
        )
        schema = vol.Schema(
            {
                vol.Required(CONF_GRACE_MINUTES, default=current): vol.All(
                    selector.NumberSelector(
                        selector.NumberSelectorConfig(
                            min=MIN_GRACE_MINUTES,
                            max=MAX_GRACE_MINUTES,
                            step=1,
                            mode=selector.NumberSelectorMode.BOX,
                            unit_of_measurement="min",
                        )
                    ),
                    vol.Coerce(int),
                    vol.Range(min=MIN_GRACE_MINUTES, max=MAX_GRACE_MINUTES),
                )
            }
        )
        return self.async_show_form(step_id="init", data_schema=schema)
