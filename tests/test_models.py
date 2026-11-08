"""Models round-trip through their dict form."""

from datetime import UTC, datetime, timedelta, timezone

from custom_components.sequence_scheduler.models import (
    Action,
    Block,
    Placeholder,
    Step,
    Template,
)

KIDS = Template(
    id="t1",
    key="kids",
    name="Kids AC",
    start=(
        Action(
            action="climate.set_temperature",
            target={"entity_id": ["climate.kids"]},
            data={"hvac_mode": "cool", "temperature": 26, "fan_mode": "silent"},
        ),
    ),
    end=(Action("climate.turn_off", {"entity_id": ["climate.kids"]}, {}),),
    placeholders=(
        Placeholder(key="temp", field="temperature", kind="number", default=26, min=16, max=30),
        Placeholder(key="fan", field="fan_mode", kind="select", default="silent"),
    ),
)


def test_template_roundtrip():
    assert Template.from_dict(KIDS.to_dict()) == KIDS


def test_placeholder_static_options_roundtrip():
    p = Placeholder("mode", "hvac_mode", "select", "cool", options=("cool", "heat"))
    assert Placeholder.from_dict(p.to_dict()) == p


def test_block_roundtrip_keeps_utc():
    at = datetime(2026, 11, 8, 1, 0, tzinfo=timezone(timedelta(hours=2)))
    block = Block(
        id="b1",
        line="kids 01:00 1h 25",
        template_name="Kids AC",
        values={"temp": 25, "fan": "silent"},
        entity_ids=["climate.kids"],
        created_at=at - timedelta(hours=3),
        steps=[Step("s1", "start", at, [KIDS.start[0]]), Step("s2", "end", at + timedelta(hours=1), [KIDS.end[0]], "in_progress")],
    )
    d = block.to_dict()
    assert d["steps"][0]["at"] == "2026-11-07T23:00:00+00:00"
    back = Block.from_dict(d)
    assert back == block
    assert back.steps[0].at.tzinfo == UTC
    assert back.steps[1].state == "in_progress"
