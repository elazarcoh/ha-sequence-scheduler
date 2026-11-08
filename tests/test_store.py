"""TemplateStore and QueueStore persist, look up and refuse unknown versions."""

from datetime import UTC, datetime, timedelta

import pytest
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.storage import Store
from pytest_homeassistant_custom_component.common import flush_store

from custom_components.sequence_scheduler.models import Action, Block, Step, Template
from custom_components.sequence_scheduler.store import QueueStore, TemplateStore
from custom_components.sequence_scheduler.template_schema import TemplateError

AT = datetime(2026, 11, 8, 23, 0, tzinfo=UTC)
OFF = Action("climate.turn_off", {"entity_id": ["climate.kids"]}, {})


def template(id_, key):
    return Template(id=id_, key=key, name=key, start=(OFF,), end=(), placeholders=())


def block(id_="b1", n_steps=2):
    steps = [Step(f"s{i}", "start" if i == 0 else "end", AT + timedelta(hours=i), [OFF]) for i in range(n_steps)]
    return Block(id_, "x 01:00 1h", "x", {}, ["climate.kids"], AT - timedelta(hours=1), steps)


async def test_template_store_duplicate_key_casefold(hass):
    store = TemplateStore(hass)
    await store.async_load()
    await store.async_save(template("a", "kids"))
    with pytest.raises(TemplateError) as err:
        await store.async_save(template("b", "Kids"))
    assert err.value.code == "duplicate_key"
    # Updating the same template under a new case is fine.
    await store.async_save(template("a", "KIDS"))
    assert [t.key for t in store.templates] == ["KIDS"]


async def test_get_by_key_hebrew(hass):
    store = TemplateStore(hass)
    await store.async_load()
    await store.async_save(template("a", "מזגן"))
    assert store.get_by_key("מזגן").id == "a"
    assert store.get_by_key("Kids") is None


async def test_template_delete(hass):
    store = TemplateStore(hass)
    await store.async_load()
    await store.async_save(template("a", "kids"))
    await store.async_delete("a")
    assert store.templates == []
    with pytest.raises(KeyError):
        await store.async_delete("a")


async def test_template_store_persists_across_reload(hass):
    store = TemplateStore(hass)
    await store.async_load()
    await store.async_save(template("a", "kids"))
    await flush_store(store._store)
    again = TemplateStore(hass)
    await again.async_load()
    assert again.templates == [template("a", "kids")]


async def test_queue_store_persists_across_reload(hass):
    store = QueueStore(hass)
    await store.async_load()
    await store.async_add([block()])
    await store.async_set_state("b1", "s0", "in_progress")
    again = QueueStore(hass)
    await again.async_load()
    assert again.get("b1").steps[0].state == "in_progress"


async def test_remove_last_step_removes_block(hass):
    store = QueueStore(hass)
    await store.async_load()
    await store.async_add([block()])
    await store.async_remove_step("b1", "s0")
    assert [s.id for s in store.get("b1").steps] == ["s1"]
    await store.async_remove_step("b1", "s1")
    assert store.get("b1") is None
    assert store.blocks == []


async def test_blocks_sorted_by_first_step(hass):
    store = QueueStore(hass)
    await store.async_load()
    late = block("late")
    for s in late.steps:
        s.at += timedelta(hours=5)
    await store.async_add([late, block("early")])
    assert [b.id for b in store.blocks] == ["early", "late"]


async def test_queue_change_sends_signal(hass):
    from homeassistant.helpers.dispatcher import async_dispatcher_connect

    from custom_components.sequence_scheduler.const import SIGNAL_QUEUE_CHANGED

    seen = []
    async_dispatcher_connect(hass, SIGNAL_QUEUE_CHANGED, lambda: seen.append(1))
    store = QueueStore(hass)
    await store.async_load()
    await store.async_add([block()])
    await store.async_remove_block("b1")
    await hass.async_block_till_done()
    assert len(seen) == 2


async def test_unknown_storage_version_refuses(hass, hass_storage):
    hass_storage["sequence_scheduler.queue"] = {
        "version": 99, "minor_version": 1, "key": "sequence_scheduler.queue", "data": {"blocks": []},
    }
    store = QueueStore(hass)
    with pytest.raises((HomeAssistantError, NotImplementedError, ValueError)):
        await store.async_load()
