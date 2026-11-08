"""Render this integration's events in Home Assistant's Logbook.

Adapted from ha-shabbat-scheduler logbook.py. TWO events are described:

`EVENT_STEP_DUE` is fired BEFORE any action is called and shares its context
with those calls. That ordering is what lets the logbook attribute each
device's state change to the step, as it does for automations. It cannot
know how the step went, so its message claims nothing beyond "due".

`EVENT_STEP_RESULT` is fired afterwards (or when a step is skipped or
cancelled) and says what actually happened.

Logbook renders HISTORICAL events, so everything a row needs rides on the
payload, and every read is defensive: a describer that raises takes down
the whole logbook page, not just its own row.
"""

from __future__ import annotations

from collections.abc import Callable

from homeassistant.core import Event, HomeAssistant, callback

from .const import DOMAIN, EVENT_STEP_DUE, EVENT_STEP_RESULT, TITLE

_ICONS = {
    "due": "mdi:timer-outline",
    "ran": "mdi:timer-check-outline",
    "failed": "mdi:alert-circle",
    "skipped": "mdi:clock-alert-outline",
    "skipped_maybe_ran": "mdi:restart-off",
    "cancelled": "mdi:cancel",
}


def _label(data) -> str:
    name = data.get("template_name")
    name = name if isinstance(name, str) and name else "(unknown)"
    phase = data.get("phase")
    phase = phase if phase in ("start", "end") else "step"
    return f"{name} {phase}"


def _values(data) -> str:
    values = data.get("values")
    if not isinstance(values, dict) or not values:
        return ""
    return ", ".join(f"{k}={v}" for k, v in values.items())


def _detail(data) -> str:
    detail = data.get("detail")
    return detail if isinstance(detail, str) else ""


def _result_message(data) -> str:
    label = _label(data)
    outcome = data.get("outcome")
    if outcome == "ran":
        values = _values(data)
        return f"{label} ran ({values})" if values else f"{label} ran"
    if outcome == "failed":
        return f"{label} failed: {_detail(data)}"
    if outcome == "skipped":
        return f"{label} skipped: {_detail(data)}"
    if outcome == "skipped_maybe_ran":
        return f"{label} not re-run after restart (may already have run)"
    if outcome == "cancelled":
        return f"{label} cancelled"
    return f"{label}: {outcome}"


@callback
def async_describe_events(
    hass: HomeAssistant,
    async_describe_event: Callable[[str, str, Callable[[Event], dict]], None],
) -> None:
    @callback
    def describe_due(event: Event) -> dict:
        data = event.data or {}
        return {"name": TITLE, "message": f"{_label(data)} due", "icon": _ICONS["due"]}

    @callback
    def describe_result(event: Event) -> dict:
        data = event.data or {}
        return {
            "name": TITLE,
            "message": _result_message(data),
            "icon": _ICONS.get(data.get("outcome"), _ICONS["due"]),
        }

    async_describe_event(DOMAIN, EVENT_STEP_DUE, describe_due)
    async_describe_event(DOMAIN, EVENT_STEP_RESULT, describe_result)
