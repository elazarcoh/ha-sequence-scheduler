"""Sequence Scheduler integration."""

from __future__ import annotations

from datetime import timedelta

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.start import async_at_started

from .const import CONF_GRACE_MINUTES, DEFAULT_GRACE_MINUTES, DOMAIN
from .engine import SequenceEngine
from .store import QueueStore, TemplateStore


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    templates = TemplateStore(hass)
    queue = QueueStore(hass)
    await templates.async_load()
    await queue.async_load()
    grace = timedelta(minutes=entry.options.get(CONF_GRACE_MINUTES, DEFAULT_GRACE_MINUTES))
    engine = SequenceEngine(hass, queue, grace)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {
        "templates": templates,
        "queue": queue,
        "engine": engine,
    }

    async def _start(_hass: HomeAssistant) -> None:
        await engine.async_start()

    entry.async_on_unload(async_at_started(hass, _start))
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    data = hass.data.get(DOMAIN, {}).pop(entry.entry_id, None)
    if data:
        await data["engine"].async_stop()
    return True
