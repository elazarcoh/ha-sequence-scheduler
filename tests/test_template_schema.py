"""validate_template turns raw dicts into Templates or a coded TemplateError."""

import copy

import pytest

from custom_components.sequence_scheduler.template_schema import (
    TemplateError,
    validate_template,
)

RAW = {
    "id": "t1",
    "key": "kids",
    "name": "Kids AC",
    "start": [
        {
            "action": "climate.set_temperature",
            "target": {"entity_id": ["climate.kids"]},
            "data": {"hvac_mode": "cool", "temperature": 26, "fan_mode": "silent"},
        }
    ],
    "end": [{"action": "climate.turn_off", "target": {"entity_id": ["climate.kids"]}, "data": {}}],
    "placeholders": [
        {"key": "temp", "field": "temperature", "kind": "number", "default": 26, "min": 16, "max": 30},
        {"key": "fan", "field": "fan_mode", "kind": "select", "default": "silent"},
    ],
}


def raw(**changes):
    r = copy.deepcopy(RAW)
    r.update(changes)
    return r


def code_of(r):
    with pytest.raises(TemplateError) as err:
        validate_template(r)
    return err.value.code


def test_valid_template():
    t = validate_template(raw())
    assert t.key == "kids" and len(t.placeholders) == 2


def test_missing_id_gets_generated():
    r = raw()
    del r["id"]
    assert len(validate_template(r).id) == 32


def test_validate_accepts_start_only_template():
    assert validate_template(raw(end=[], placeholders=[])).end == ()


def test_validate_rejects_empty_key():
    assert code_of(raw(key="")) == "empty_key"
    assert code_of(raw(key="kids ac")) == "empty_key"


def test_validate_rejects_empty_start():
    assert code_of(raw(start=[])) == "empty_start"


def test_validate_rejects_duplicate_placeholder():
    ph = RAW["placeholders"][0]
    assert code_of(raw(placeholders=[ph, dict(ph)])) == "duplicate_placeholder"


def test_validate_rejects_unbound_placeholder():
    ph = {"key": "b", "field": "brightness_pct", "kind": "percent", "default": 50}
    assert code_of(raw(placeholders=[ph])) == "unbound_placeholder"


def test_validate_rejects_bad_default():
    ph = {"key": "temp", "field": "temperature", "kind": "number", "default": "warm"}
    assert code_of(raw(placeholders=[ph])) == "bad_default"
    ph = {"key": "temp", "field": "temperature", "kind": "number", "default": 40, "max": 30}
    assert code_of(raw(placeholders=[ph])) == "bad_default"
    ph = {"key": "m", "field": "hvac_mode", "kind": "select", "default": "dry", "options": ["cool", "heat"]}
    assert code_of(raw(placeholders=[ph])) == "bad_default"


def test_validate_rejects_bad_kind():
    ph = {"key": "temp", "field": "temperature", "kind": "colour", "default": 1}
    assert code_of(raw(placeholders=[ph])) == "bad_kind"
