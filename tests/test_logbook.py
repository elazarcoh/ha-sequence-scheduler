"""Logbook rows for step events, and attribution of device changes."""

from datetime import UTC, datetime, timedelta

import pytest
from homeassistant.core import Event
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import async_capture_events

from custom_components.sequence_scheduler.const import DOMAIN, EVENT_STEP_DUE, EVENT_STEP_RESULT
from custom_components.sequence_scheduler.engine import SequenceEngine
from custom_components.sequence_scheduler.logbook import async_describe_events
from custom_components.sequence_scheduler.models import Action, Block, Step
from custom_components.sequence_scheduler.store import QueueStore


def describers(hass):
    found = {}
    async_describe_events(hass, lambda domain, event_type, fn: found.__setitem__(event_type, (domain, fn)))
    return found


BASE = {"template_name": "Kids AC", "phase": "end", "values": {"temp": 25, "fan": "silent"}}


def message(hass, event_type, data):
    domain, fn = describers(hass)[event_type]
    assert domain == DOMAIN
    row = fn(Event(event_type, data))
    assert row["name"] == "Sequence Scheduler"
    return row["message"]


async def test_describes_due(hass):
    assert message(hass, EVENT_STEP_DUE, BASE) == "Kids AC end due"


@pytest.mark.parametrize(
    "outcome,detail,expected",
    [
        ("ran", "", "Kids AC end ran (temp=25, fan=silent)"),
        ("failed", "climate.turn_off: boom", "Kids AC end failed: climate.turn_off: boom"),
        ("skipped", "overdue by 40 min", "Kids AC end skipped: overdue by 40 min"),
        ("skipped_maybe_ran", "", "Kids AC end not re-run after restart (may already have run)"),
        ("cancelled", "", "Kids AC end cancelled"),
    ],
)
async def test_describes_each_outcome(hass, outcome, detail, expected):
    data = {**BASE, "outcome": outcome, "detail": detail}
    assert message(hass, EVENT_STEP_RESULT, data) == expected


async def test_ran_without_values_has_no_parentheses(hass):
    data = {**BASE, "values": {}, "outcome": "ran", "detail": ""}
    assert message(hass, EVENT_STEP_RESULT, data) == "Kids AC end ran"


@pytest.mark.parametrize("event_type", [EVENT_STEP_DUE, EVENT_STEP_RESULT])
async def test_describer_survives_missing_fields(hass, event_type):
    assert isinstance(message(hass, event_type, {}), str)
    assert isinstance(message(hass, event_type, {"values": "junk", "phase": 3}), str)


async def test_device_change_attributed(hass, freezer):
    t0 = datetime(2026, 11, 7, 22, 0, tzinfo=UTC)
    freezer.move_to(t0)
    assert await async_setup_component(hass, "input_boolean", {"input_boolean": {"ac": {"initial": True}}})
    due = async_capture_events(hass, EVENT_STEP_DUE)
    queue = QueueStore(hass)
    await queue.async_load()
    engine = SequenceEngine(hass, queue, timedelta(minutes=10))
    off = Action("input_boolean.turn_off", {"entity_id": "input_boolean.ac"}, {})
    block = Block("b", "ac 00:00", "AC", {}, ["input_boolean.ac"], t0, [Step("s", "end", t0, [off])])
    await queue.async_add([block])
    await engine.async_start()
    await hass.async_block_till_done()
    state = hass.states.get("input_boolean.ac")
    assert state.state == "off"
    assert state.context.id == due[0].context.id
