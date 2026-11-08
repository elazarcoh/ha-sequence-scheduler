"""The engine runs each queued step once, catches up after restarts, and cancels."""

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest
from homeassistant.core import ServiceCall
from pytest_homeassistant_custom_component.common import (
    async_capture_events,
    async_fire_time_changed,
    async_mock_service,
)

from custom_components.sequence_scheduler.const import DOMAIN, EVENT_STEP_DUE, EVENT_STEP_RESULT
from custom_components.sequence_scheduler.engine import SequenceEngine
from custom_components.sequence_scheduler.models import Action, Block, Step, Template
from custom_components.sequence_scheduler.store import QueueStore, TemplateStore

T0 = datetime(2026, 11, 7, 22, 30, tzinfo=UTC)
KIDS = {"entity_id": ["climate.kids"]}
ON = Action("climate.set_temperature", KIDS, {"hvac_mode": "cool", "temperature": 25, "fan_mode": "silent"})
OFF = Action("climate.turn_off", KIDS, {})
GRACE = timedelta(minutes=10)


@pytest.fixture(autouse=True)
def no_retry_sleep():
    with patch("custom_components.sequence_scheduler.engine.asyncio.sleep", AsyncMock()):
        yield


_ENGINES: list = []


@pytest.fixture(autouse=True)
async def stop_engines():
    yield
    while _ENGINES:
        await _ENGINES.pop().async_stop()


def make_block(start_at, end_at=None, block_id="b1", start=(ON,), end=(OFF,)):
    steps = [Step(f"{block_id}-start", "start", start_at, list(start))]
    if end_at is not None:
        steps.append(Step(f"{block_id}-end", "end", end_at, list(end)))
    return Block(block_id, "kids 01:00 1h 25", "Kids AC", {"temp": 25}, ["climate.kids"], T0, steps)


@pytest.fixture
def services(hass):
    return {
        "on": async_mock_service(hass, "climate", "set_temperature"),
        "off": async_mock_service(hass, "climate", "turn_off"),
        "switch": async_mock_service(hass, "switch", "turn_on"),
    }


async def new_engine(hass, blocks=(), grace=GRACE):
    queue = QueueStore(hass)
    await queue.async_load()
    if blocks:
        await queue.async_add(list(blocks))
    engine = SequenceEngine(hass, queue, grace)
    _ENGINES.append(engine)
    return engine, queue


async def advance(hass, freezer, to):
    freezer.move_to(to)
    async_fire_time_changed(hass, to)
    await hass.async_block_till_done()


def outcomes(events):
    return [(e.data["phase"], e.data["outcome"]) for e in events]


async def test_step_runs_once_at_time(hass, freezer, services):
    freezer.move_to(T0)
    engine, queue = await new_engine(hass)
    await engine.async_start()
    one = T0 + timedelta(minutes=30)
    await engine.async_enqueue([make_block(one, one + timedelta(hours=1))])
    await advance(hass, freezer, one - timedelta(seconds=1))
    assert services["on"] == []
    await advance(hass, freezer, one)
    assert len(services["on"]) == 1
    assert services["on"][0].data["temperature"] == 25
    assert services["on"][0].data["entity_id"] == ["climate.kids"]
    assert [s.phase for s in queue.get("b1").steps] == ["end"]
    await advance(hass, freezer, one + timedelta(minutes=5))
    assert len(services["on"]) == 1


async def test_end_runs_even_if_device_already_off(hass, freezer, services):
    freezer.move_to(T0)
    hass.states.async_set("climate.kids", "off")
    engine, queue = await new_engine(hass)
    await engine.async_start()
    one = T0 + timedelta(minutes=30)
    await engine.async_enqueue([make_block(one, one + timedelta(hours=1))])
    await advance(hass, freezer, one + timedelta(hours=1))
    assert len(services["off"]) == 1


async def test_block_removed_after_last_step(hass, freezer, services):
    freezer.move_to(T0)
    results = async_capture_events(hass, EVENT_STEP_RESULT)
    engine, queue = await new_engine(hass)
    await engine.async_start()
    one = T0 + timedelta(minutes=30)
    await engine.async_enqueue([make_block(one, one + timedelta(hours=1))])
    await advance(hass, freezer, one)
    await advance(hass, freezer, one + timedelta(hours=1))
    assert queue.blocks == []
    assert outcomes(results) == [("start", "ran"), ("end", "ran")]
    assert results[0].data["template_name"] == "Kids AC"
    assert results[0].data["values"] == {"temp": 25}


async def test_failing_action_does_not_stop_others_or_end(hass, freezer, services):
    attempts = []

    async def broken(call: ServiceCall):
        attempts.append(call)
        raise RuntimeError("AC offline")

    hass.services.async_register("climate", "set_hvac_mode", broken)
    freezer.move_to(T0)
    results = async_capture_events(hass, EVENT_STEP_RESULT)
    engine, queue = await new_engine(hass)
    await engine.async_start()
    one = T0 + timedelta(minutes=30)
    bad = Action("climate.set_hvac_mode", KIDS, {"hvac_mode": "cool"})
    sw = Action("switch.turn_on", {"entity_id": "switch.fan"}, {})
    await engine.async_enqueue([make_block(one, one + timedelta(hours=1), start=(bad, sw))])
    await advance(hass, freezer, one)
    assert len(attempts) == 3
    assert len(services["switch"]) == 1
    assert outcomes(results) == [("start", "failed")]
    assert "AC offline" in results[0].data["detail"]
    await advance(hass, freezer, one + timedelta(hours=1))
    assert len(services["off"]) == 1


async def test_catch_up_within_grace_runs_in_order(hass, freezer, services):
    order = []
    hass.services.async_register("climate", "set_temperature", lambda c: order.append("on"))
    hass.services.async_register("climate", "turn_off", lambda c: order.append("off"))
    freezer.move_to(T0)
    engine, queue = await new_engine(
        hass, [make_block(T0 - timedelta(minutes=5), T0 - timedelta(minutes=1))]
    )
    await engine.async_start()
    await hass.async_block_till_done()
    assert order == ["on", "off"]
    assert queue.blocks == []


async def test_catch_up_past_grace_skips_both(hass, freezer, services):
    """The user's decision: an end overdue beyond the window is skipped too."""
    freezer.move_to(T0)
    results = async_capture_events(hass, EVENT_STEP_RESULT)
    engine, queue = await new_engine(
        hass, [make_block(T0 - timedelta(minutes=100), T0 - timedelta(minutes=40))]
    )
    await engine.async_start()
    await hass.async_block_till_done()
    assert services["on"] == [] and services["off"] == []
    assert outcomes(results) == [("start", "skipped"), ("end", "skipped")]
    assert results[1].data["detail"] == "overdue by 40 min"
    assert queue.blocks == []


async def test_catch_up_mixed_runs_end_only(hass, freezer, services):
    freezer.move_to(T0)
    engine, queue = await new_engine(
        hass, [make_block(T0 - timedelta(minutes=60), T0 - timedelta(minutes=3))]
    )
    await engine.async_start()
    await hass.async_block_till_done()
    assert services["on"] == [] and len(services["off"]) == 1


async def test_in_progress_end_reruns_start_does_not(hass, freezer, services):
    freezer.move_to(T0)
    results = async_capture_events(hass, EVENT_STEP_RESULT)
    a = make_block(T0 - timedelta(minutes=2), T0 + timedelta(hours=1), block_id="a")
    a.steps[0].state = "in_progress"
    b = make_block(T0 - timedelta(hours=1), T0 - timedelta(minutes=2), block_id="b")
    b.steps = b.steps[1:]
    b.steps[0].state = "in_progress"
    engine, queue = await new_engine(hass, [a, b])
    await engine.async_start()
    await hass.async_block_till_done()
    assert services["on"] == []
    assert len(services["off"]) == 1
    assert ("start", "skipped_maybe_ran") in outcomes(results)
    assert [s.phase for s in queue.get("a").steps] == ["end"]


async def test_no_double_run_catch_up_vs_timer(hass, freezer, services):
    freezer.move_to(T0)
    engine, queue = await new_engine(hass, [make_block(T0, None)])
    await engine.async_start()
    await advance(hass, freezer, T0 + timedelta(seconds=1))
    assert len(services["on"]) == 1


async def test_queued_block_survives_template_delete(hass, freezer, services):
    freezer.move_to(T0)
    templates = TemplateStore(hass)
    await templates.async_load()
    await templates.async_save(Template("t", "kids", "Kids AC", (ON,), (OFF,), ()))
    engine, queue = await new_engine(hass)
    await engine.async_start()
    one = T0 + timedelta(minutes=30)
    await engine.async_enqueue([make_block(one, None)])
    await templates.async_delete("t")
    await advance(hass, freezer, one)
    assert services["on"][0].data["temperature"] == 25
    assert queue.blocks == []


async def test_cancel_pending_block(hass, freezer, services):
    freezer.move_to(T0)
    results = async_capture_events(hass, EVENT_STEP_RESULT)
    engine, queue = await new_engine(hass)
    await engine.async_start()
    one = T0 + timedelta(minutes=30)
    await engine.async_enqueue([make_block(one, one + timedelta(hours=1))])
    await engine.async_cancel("b1", run_end=True)  # start not run: run_end is moot
    await advance(hass, freezer, one + timedelta(hours=2))
    assert services["on"] == [] and services["off"] == []
    assert outcomes(results) == [("start", "cancelled"), ("end", "cancelled")]
    assert queue.blocks == []


@pytest.mark.parametrize("run_end,expected_off", [(True, 1), (False, 0)])
async def test_cancel_running_block(hass, freezer, services, run_end, expected_off):
    freezer.move_to(T0)
    engine, queue = await new_engine(hass)
    await engine.async_start()
    one = T0 + timedelta(minutes=30)
    await engine.async_enqueue([make_block(one, one + timedelta(hours=1))])
    await advance(hass, freezer, one)
    await engine.async_cancel("b1", run_end=run_end)
    await hass.async_block_till_done()
    assert len(services["off"]) == expected_off
    await advance(hass, freezer, one + timedelta(hours=2))
    assert len(services["off"]) == expected_off
    assert queue.blocks == []


async def test_cancel_unknown_raises(hass):
    engine, _ = await new_engine(hass)
    with pytest.raises(KeyError):
        await engine.async_cancel("nope", run_end=False)


async def test_step_due_event_shares_context_with_calls(hass, freezer, services):
    freezer.move_to(T0)
    due = async_capture_events(hass, EVENT_STEP_DUE)
    engine, _ = await new_engine(hass)
    await engine.async_start()
    one = T0 + timedelta(minutes=30)
    await engine.async_enqueue([make_block(one, None)])
    await advance(hass, freezer, one)
    assert due[0].data["phase"] == "start"
    assert services["on"][0].context.id == due[0].context.id


async def test_reload_rearms_timers(hass, freezer, services, setup_integration):
    freezer.move_to(T0)
    entry = await setup_integration()
    data = hass.data[DOMAIN][entry.entry_id]
    one = T0 + timedelta(minutes=30)
    await data["engine"].async_enqueue([make_block(one, None)])
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    await advance(hass, freezer, one)
    assert len(services["on"]) == 1


async def test_setup_uses_grace_option(hass, freezer, services, setup_integration):
    freezer.move_to(T0)
    from custom_components.sequence_scheduler.store import QueueStore as QS

    queue = QS(hass)
    await queue.async_load()
    await queue.async_add([make_block(T0 - timedelta(minutes=20), None)])
    await setup_integration({"grace_minutes": 30})
    await hass.async_block_till_done()
    assert len(services["on"]) == 1
