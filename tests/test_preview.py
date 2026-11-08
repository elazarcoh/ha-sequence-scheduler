"""build_preview resolves text lines against templates and live device state."""

from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest

from custom_components.sequence_scheduler.models import Action, Block, Placeholder, Step, Template
from custom_components.sequence_scheduler.preview import (
    build_preview,
    expand_entities,
    preview_token,
    rows_to_blocks,
    select_options,
)
from custom_components.sequence_scheduler.store import QueueStore, TemplateStore

TZ = ZoneInfo("Asia/Jerusalem")
NOW = datetime(2026, 11, 7, 21, 0, tzinfo=TZ)

SPEC_LINES = """kids 01:00 1h 25
kids 05:00 1.5h 24
kitchen 22:00 30m 40%
heater 06:00 45m
boiler 05:30
salon 13:00 2h fan=low
"""


def ac(id_, key, entity, fan):
    tgt = {"entity_id": [entity]} if isinstance(entity, str) else {"entity_id": entity}
    return Template(
        id=id_, key=key, name=f"{key} AC",
        start=(Action("climate.set_temperature", tgt, {"hvac_mode": "cool", "temperature": 26, "fan_mode": fan}),),
        end=(Action("climate.turn_off", tgt, {}),),
        placeholders=(
            Placeholder("temp", "temperature", "number", 26, min=16, max=30),
            Placeholder("fan", "fan_mode", "select", fan),
        ),
    )


@pytest.fixture
async def env(jerusalem):
    hass = jerusalem
    hass.states.async_set("climate.kids", "off", {"fan_modes": ["auto", "quiet", "silent", "high"]})
    hass.states.async_set("climate.salon", "off", {"fan_modes": ["auto", "quiet", "high"]})
    hass.states.async_set("light.kitchen", "off")
    hass.states.async_set("switch.heater", "off")
    hass.states.async_set("switch.boiler", "off")
    templates = TemplateStore(hass)
    await templates.async_load()
    await templates.async_save(ac("t-kids", "kids", "climate.kids", "silent"))
    await templates.async_save(ac("t-salon", "salon", "climate.salon", "quiet"))
    await templates.async_save(ac("t-both", "both", ["climate.kids", "climate.salon"], "quiet"))
    await templates.async_save(Template(
        "t-kitchen", "kitchen", "Kitchen light",
        (Action("light.turn_on", {"entity_id": "light.kitchen"}, {"brightness_pct": 100}),),
        (Action("light.turn_off", {"entity_id": "light.kitchen"}, {}),),
        (Placeholder("bright", "brightness_pct", "percent", 100),),
    ))
    sw = {"entity_id": "switch.heater"}
    await templates.async_save(Template(
        "t-heater", "heater", "Heater plug",
        (Action("switch.turn_on", sw, {}),), (Action("switch.turn_off", sw, {}),), (),
    ))
    await templates.async_save(Template(
        "t-boiler", "boiler", "Boiler",
        (Action("switch.turn_on", {"entity_id": "switch.boiler"}, {}),), (), (),
    ))
    queue = QueueStore(hass)
    await queue.async_load()
    return hass, templates, queue


def codes(issues):
    return [i.code for i in issues]


async def test_spec_example_lines(env):
    hass, templates, queue = env
    rows = build_preview(hass, templates, queue, SPEC_LINES, NOW)
    assert [r.ok for r in rows] == [True, True, True, True, True, False]
    kids = rows[0]
    assert kids.start_at == datetime(2026, 11, 8, 1, 0, tzinfo=TZ)
    assert kids.end_at == datetime(2026, 11, 8, 2, 0, tzinfo=TZ)
    assert kids.values == {"temp": 25, "fan": "silent"}
    assert kids.start_actions[0].data["temperature"] == 25
    assert kids.start_actions[0].data["hvac_mode"] == "cool"
    assert kids.end_actions[0].action == "climate.turn_off"
    assert kids.template_name == "kids AC"
    assert kids.entity_ids == ["climate.kids"]
    assert rows[1].end_at - rows[1].start_at == timedelta(minutes=90)
    assert rows[2].values == {"bright": 40}
    assert rows[2].start_at == datetime(2026, 11, 7, 22, 0, tzinfo=TZ)
    assert rows[4].end_at is None and rows[4].end_actions == []
    salon = rows[5]
    assert codes(salon.errors) == ["not_an_option"]
    assert "auto, quiet, high" in salon.errors[0].detail


async def test_select_case_insensitive(env):
    rows = build_preview(*env, "kids 01:00 1h 25 Silent", NOW)
    assert rows[0].ok and rows[0].values["fan"] == "silent"


async def test_hebrew_template_key(env):
    hass, templates, queue = env
    await templates.async_save(ac("t-he", "מזגן", "climate.kids", "silent"))
    rows = build_preview(hass, templates, queue, "מזגן 01:00 1h 25 Silent", NOW)
    assert rows[0].ok and rows[0].values == {"temp": 25, "fan": "silent"}


async def test_percent_accepts_suffix(env):
    rows = build_preview(*env, "kitchen 22:00 30m 40%\nkitchen 22:00 30m 40\nkitchen 22:00 30m 140", NOW)
    assert rows[0].values == {"bright": 40} and rows[1].values == {"bright": 40}
    assert codes(rows[2].errors) == ["bad_value"]


async def test_number_out_of_range_and_not_a_number(env):
    rows = build_preview(*env, "kids 01:00 1h 40\nkids 01:00 1h warm", NOW)
    assert codes(rows[0].errors) == ["bad_value"] and codes(rows[1].errors) == ["bad_value"]
    assert "16" in rows[0].errors[0].detail


async def test_option_intersection_two_entities(env):
    hass, templates, _ = env
    both = templates.get_by_key("both")
    assert select_options(hass, both.placeholders[1], ["climate.kids", "climate.salon"]) == ["auto", "quiet", "high"]
    rows = build_preview(*env, "both 01:00 1h 25 silent", NOW)
    assert codes(rows[0].errors) == ["not_an_option"]


async def test_select_without_attribute_accepts_anything(env):
    hass, templates, _ = env
    p = Placeholder("fan", "fan_mode", "select", "x")
    assert select_options(hass, p, ["light.kitchen"]) is None


async def test_static_options_win(env):
    hass, _, _ = env
    p = Placeholder("m", "hvac_mode", "select", "cool", options=("cool", "heat"))
    assert select_options(hass, p, ["climate.kids"]) == ["cool", "heat"]


async def test_duration_on_start_only_errors(env):
    rows = build_preview(*env, "boiler 05:30 1h", NOW)
    assert codes(rows[0].errors) == ["duration_without_end"]


async def test_missing_duration_warns(env):
    rows = build_preview(*env, "kids 01:00 25", NOW)
    assert rows[0].ok and codes(rows[0].warnings) == ["no_duration"]
    assert rows[0].end_at is None


async def test_far_future_warns(env):
    at_six = datetime(2026, 11, 8, 6, 0, tzinfo=TZ)
    rows = build_preview(*env, "heater 05:00 1h", at_six)
    assert rows[0].ok and codes(rows[0].warnings) == ["far_future"]


async def test_overlap_within_text_and_with_queue(env):
    hass, templates, queue = env
    rows = build_preview(hass, templates, queue, "kids 01:00 1h\nkids 01:30 1h\nkids 02:00 1h", NOW)
    assert codes(rows[0].warnings) == ["overlap"] and "line 2" in rows[0].warnings[0].detail
    assert codes(rows[1].warnings) == ["overlap", "overlap"]
    assert codes(rows[2].warnings) == ["overlap"]  # 01:30-02:30 overlaps 02:00-03:00
    blocks = rows_to_blocks(rows[:1], NOW)
    await queue.async_add(blocks)
    again = build_preview(hass, templates, queue, "kids 01:30 1h", NOW)
    assert codes(again[0].warnings) == ["overlap"] and "queued" in again[0].warnings[0].detail


async def test_back_to_back_is_not_overlap(env):
    rows = build_preview(*env, "kids 01:00 1h\nkids 02:00 1h", NOW)
    assert rows[0].warnings == [] and rows[1].warnings == []


async def test_unknown_template(env):
    rows = build_preview(*env, "nope 01:00", NOW)
    assert codes(rows[0].errors) == ["unknown_template"]


async def test_too_many_values(env):
    rows = build_preview(*env, "kids 01:00 1h 25 silent extra", NOW)
    assert codes(rows[0].errors) == ["too_many_values"]


async def test_unknown_named(env):
    rows = build_preview(*env, "kids 01:00 1h colour=red", NOW)
    assert codes(rows[0].errors) == ["unknown_placeholder"]


async def test_parse_error_becomes_row(env):
    rows = build_preview(*env, "kids 25:00", NOW)
    assert not rows[0].ok and codes(rows[0].errors) == ["bad_time"] and rows[0].lineno == 1


async def test_no_entities(env):
    hass, templates, queue = env
    await templates.async_save(Template(
        "t-gone", "gone", "Gone", (Action("switch.turn_on", {"entity_id": "switch.missing"}, {}),), (), (),
    ))
    rows = build_preview(hass, templates, queue, "gone 01:00", NOW)
    assert codes(rows[0].errors) == ["no_entities"]


async def test_expand_entities_area_and_entity(env):
    hass, _, _ = env
    acts = [Action("x.y", {"entity_id": ["switch.heater", "climate.kids"]}, {}), Action("x.y", {"entity_id": "switch.heater"}, {})]
    assert expand_entities(hass, acts) == ["climate.kids", "switch.heater"]


async def test_token_stable_and_sensitive(env):
    a = preview_token(build_preview(*env, SPEC_LINES, NOW))
    b = preview_token(build_preview(*env, SPEC_LINES, NOW))
    c = preview_token(build_preview(*env, SPEC_LINES.replace(" 25", " 24", 1), NOW))
    assert a == b and a != c


async def test_rows_to_blocks_skips_errors_and_start_only_has_one_step(env):
    rows = build_preview(*env, SPEC_LINES, NOW)
    blocks = rows_to_blocks(rows, NOW)
    assert len(blocks) == 5
    assert [len(b.steps) for b in blocks] == [2, 2, 2, 2, 1]
    kids = blocks[0]
    assert kids.line == "kids 01:00 1h 25" and kids.template_name == "kids AC"
    assert [s.phase for s in kids.steps] == ["start", "end"]
    assert kids.steps[0].at == datetime(2026, 11, 7, 23, 0, tzinfo=UTC)
    assert kids.steps[0].actions[0].data["temperature"] == 25
    assert len({b.id for b in blocks}) == 5
