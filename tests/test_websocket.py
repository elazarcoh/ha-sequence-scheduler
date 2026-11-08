"""Admin-only websocket API for the card."""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from pytest_homeassistant_custom_component.common import async_fire_time_changed, async_mock_service

from custom_components.sequence_scheduler.const import DOMAIN

TZ = ZoneInfo("Asia/Jerusalem")

KIDS = {
    "key": "kids",
    "name": "Kids AC",
    "start": [{"action": "climate.set_temperature", "target": {"entity_id": ["climate.kids"]},
               "data": {"hvac_mode": "cool", "temperature": 26, "fan_mode": "silent"}}],
    "end": [{"action": "climate.turn_off", "target": {"entity_id": ["climate.kids"]}, "data": {}}],
    "placeholders": [
        {"key": "temp", "field": "temperature", "kind": "number", "default": 26, "min": 16, "max": 30},
        {"key": "fan", "field": "fan_mode", "kind": "select", "default": "silent"},
    ],
}

ALL_TYPES = {
    "sequence_scheduler/templates/list": {},
    "sequence_scheduler/templates/save": {"template": KIDS},
    "sequence_scheduler/templates/delete": {"template_id": "x"},
    "sequence_scheduler/preview": {"text": "kids 01:00"},
    "sequence_scheduler/queue": {"text": "kids 01:00", "now": "2026-11-07T21:00:00+02:00", "token": "x"},
    "sequence_scheduler/queue/list": {},
    "sequence_scheduler/queue/cancel": {"block_id": "x", "run_end": False},
    "sequence_scheduler/queue/subscribe": {},
}


@pytest.fixture
async def ws(hass, jerusalem, freezer, setup_integration, hass_ws_client):
    hass.states.async_set("climate.kids", "off", {"fan_modes": ["auto", "quiet", "silent", "high"]})
    async_mock_service(hass, "climate", "set_temperature")
    async_mock_service(hass, "climate", "turn_off")
    entry = await setup_integration()
    # Authenticate on the real clock: a token checked against a frozen
    # clock in the past reads as not yet valid.
    client = await hass_ws_client(hass)
    freezer.move_to(datetime(2026, 11, 7, 21, 0, tzinfo=TZ))
    yield client
    await hass.data[DOMAIN][entry.entry_id]["engine"].async_stop()


async def call(client, type_, **payload):
    await client.send_json_auto_id({"type": type_, **payload})
    return await client.receive_json()


async def test_non_admin_rejected_for_every_command(hass, setup_integration, hass_ws_client, hass_read_only_access_token):
    await setup_integration()
    client = await hass_ws_client(hass, access_token=hass_read_only_access_token)
    for type_, payload in ALL_TYPES.items():
        msg = await call(client, type_, **payload)
        assert not msg["success"], type_
        assert msg["error"]["code"] == "unauthorized", type_


async def test_template_crud(ws):
    msg = await call(ws, "sequence_scheduler/templates/save", template=KIDS)
    assert msg["success"]
    tid = msg["result"]["template"]["id"]
    listed = (await call(ws, "sequence_scheduler/templates/list"))["result"]["templates"]
    assert [t["key"] for t in listed] == ["kids"]
    assert listed[0]["placeholders"][1]["resolved_options"] == ["auto", "quiet", "silent", "high"]
    assert listed[0]["placeholders"][0]["resolved_options"] is None
    bad = await call(ws, "sequence_scheduler/templates/save", template={**KIDS, "key": "two words"})
    assert bad["error"]["code"] == "template_invalid" and "empty_key" in bad["error"]["message"]
    dup = await call(ws, "sequence_scheduler/templates/save", template=KIDS)
    assert dup["error"]["code"] == "template_invalid" and "duplicate_key" in dup["error"]["message"]
    assert (await call(ws, "sequence_scheduler/templates/delete", template_id=tid))["success"]
    gone = await call(ws, "sequence_scheduler/templates/delete", template_id=tid)
    assert gone["error"]["code"] == "not_found"


async def test_preview_then_queue_roundtrip(ws):
    await call(ws, "sequence_scheduler/templates/save", template=KIDS)
    text = "kids 01:00 1h 25\nkids 05:00 1.5h 24\nnope 01:00"
    preview = (await call(ws, "sequence_scheduler/preview", text=text))["result"]
    assert [r["ok"] for r in preview["rows"]] == [True, True, False]
    assert preview["rows"][0]["start_at"].startswith("2026-11-07T23:00:00")
    msg = await call(ws, "sequence_scheduler/queue", text=text, now=preview["now"], token=preview["token"])
    assert msg["success"] and msg["result"]["queued"] == 2
    assert [r["raw"] for r in msg["result"]["refused"]] == ["nope 01:00"]
    blocks = (await call(ws, "sequence_scheduler/queue/list"))["result"]["blocks"]
    assert [b["line"] for b in blocks] == ["kids 01:00 1h 25", "kids 05:00 1.5h 24"]
    assert len(blocks[0]["steps"]) == 2


async def test_queue_refuses_changed_preview(ws):
    saved = (await call(ws, "sequence_scheduler/templates/save", template=KIDS))["result"]["template"]
    preview = (await call(ws, "sequence_scheduler/preview", text="kids 01:00 1h"))["result"]
    changed = {**saved, "placeholders": [{**KIDS["placeholders"][0], "default": 22}, KIDS["placeholders"][1]]}
    assert (await call(ws, "sequence_scheduler/templates/save", template=changed))["success"]
    msg = await call(ws, "sequence_scheduler/queue", text="kids 01:00 1h", now=preview["now"], token=preview["token"])
    assert msg["error"]["code"] == "preview_changed"
    assert (await call(ws, "sequence_scheduler/queue/list"))["result"]["blocks"] == []


async def test_queue_refuses_stale_now(ws, freezer):
    await call(ws, "sequence_scheduler/templates/save", template=KIDS)
    preview = (await call(ws, "sequence_scheduler/preview", text="kids 01:00 1h"))["result"]
    freezer.tick(timedelta(minutes=11))
    msg = await call(ws, "sequence_scheduler/queue", text="kids 01:00 1h", now=preview["now"], token=preview["token"])
    assert msg["error"]["code"] == "stale_preview"


async def test_midnight_crossing_already_past(ws, freezer):
    await call(ws, "sequence_scheduler/templates/save", template=KIDS)
    freezer.move_to(datetime(2026, 11, 7, 23, 59, tzinfo=TZ))
    preview = (await call(ws, "sequence_scheduler/preview", text="kids 00:00 1h"))["result"]
    assert preview["rows"][0]["ok"]
    freezer.move_to(datetime(2026, 11, 8, 0, 1, tzinfo=TZ))
    msg = await call(ws, "sequence_scheduler/queue", text="kids 00:00 1h", now=preview["now"], token=preview["token"])
    assert msg["error"]["code"] == "nothing_to_queue"
    assert "already_past" in msg["error"]["message"]
    assert (await call(ws, "sequence_scheduler/queue/list"))["result"]["blocks"] == []


async def test_subscribe_pushes_on_change(ws):
    await call(ws, "sequence_scheduler/templates/save", template=KIDS)
    sub = await call(ws, "sequence_scheduler/queue/subscribe")
    assert sub["success"]
    first = await ws.receive_json()
    assert first["event"] == {"blocks": []}
    preview = (await call(ws, "sequence_scheduler/preview", text="kids 01:00 1h"))["result"]
    await ws.send_json_auto_id({"type": "sequence_scheduler/queue", "text": "kids 01:00 1h", "now": preview["now"], "token": preview["token"]})
    seen = [await ws.receive_json(), await ws.receive_json()]
    pushed = next(m for m in seen if m.get("type") == "event")
    assert len(pushed["event"]["blocks"]) == 1


async def test_cancel(ws):
    await call(ws, "sequence_scheduler/templates/save", template=KIDS)
    preview = (await call(ws, "sequence_scheduler/preview", text="kids 01:00 1h"))["result"]
    await call(ws, "sequence_scheduler/queue", text="kids 01:00 1h", now=preview["now"], token=preview["token"])
    [block] = (await call(ws, "sequence_scheduler/queue/list"))["result"]["blocks"]
    assert (await call(ws, "sequence_scheduler/queue/cancel", block_id=block["id"], run_end=False))["success"]
    assert (await call(ws, "sequence_scheduler/queue/list"))["result"]["blocks"] == []


async def test_cancel_not_found(ws):
    msg = await call(ws, "sequence_scheduler/queue/cancel", block_id="nope", run_end=False)
    assert msg["error"]["code"] == "not_found"


async def test_partial_queue_reports_refused_lines(ws, freezer):
    """Final review #5: a line refused as already past must be reported back."""
    await call(ws, "sequence_scheduler/templates/save", template=KIDS)
    freezer.move_to(datetime(2026, 11, 7, 23, 59, tzinfo=TZ))
    text = "kids 00:00 1h\nkids 05:00 1.5h"
    preview = (await call(ws, "sequence_scheduler/preview", text=text))["result"]
    freezer.move_to(datetime(2026, 11, 8, 0, 1, tzinfo=TZ))
    msg = await call(ws, "sequence_scheduler/queue", text=text, now=preview["now"], token=preview["token"])
    assert msg["success"]
    assert msg["result"]["queued"] == 1
    [refused] = msg["result"]["refused"]
    assert refused["lineno"] == 1 and refused["raw"] == "kids 00:00 1h"
    assert refused["errors"][0]["code"] == "already_past"


async def test_relative_start_counts_from_the_queue_press(hass, ws, freezer):
    await call(ws, "sequence_scheduler/templates/save", template=KIDS)
    text = "kids +30m 1h 25\nkids 23:00 1h"
    preview = (await call(ws, "sequence_scheduler/preview", text=text))["result"]
    assert datetime.fromisoformat(preview["rows"][0]["start_at"]) == datetime(2026, 11, 7, 21, 30, tzinfo=TZ)
    assert preview["rows"][0]["relative"] is True
    freezer.tick(timedelta(minutes=4))
    msg = await call(ws, "sequence_scheduler/queue", text=text, now=preview["now"], token=preview["token"])
    assert msg["success"] and msg["result"]["queued"] == 2
    blocks = (await call(ws, "sequence_scheduler/queue/list"))["result"]["blocks"]
    by_line = {b["line"]: [datetime.fromisoformat(s["at"]) for s in b["steps"]] for b in blocks}
    # The relative line moves with the press; the clock line stays as shown.
    assert by_line["kids +30m 1h 25"] == [
        datetime(2026, 11, 7, 21, 34, tzinfo=TZ),
        datetime(2026, 11, 7, 22, 34, tzinfo=TZ),
    ]
    assert by_line["kids 23:00 1h"][0] == datetime(2026, 11, 7, 23, 0, tzinfo=TZ)


async def test_now_start_is_queued_and_runs(hass, ws, freezer):
    calls = async_mock_service(hass, "climate", "set_temperature")
    await call(ws, "sequence_scheduler/templates/save", template=KIDS)
    preview = (await call(ws, "sequence_scheduler/preview", text="kids now 1h 24"))["result"]
    freezer.tick(timedelta(seconds=20))
    msg = await call(ws, "sequence_scheduler/queue", text="kids now 1h 24", now=preview["now"], token=preview["token"])
    assert msg["success"] and msg["result"]["queued"] == 1 and msg["result"]["refused"] == []
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert [c.data["temperature"] for c in calls] == [24]


async def test_save_refuses_a_field_the_action_does_not_take(hass, ws):
    import voluptuous as vol
    from homeassistant.helpers import config_validation as cv

    schema = cv.make_entity_service_schema(
        {vol.Optional("temperature"): vol.Coerce(float), vol.Optional("hvac_mode"): str}
    )
    async_mock_service(hass, "climate", "set_temperature", schema=schema)
    msg = await call(ws, "sequence_scheduler/templates/save", template=KIDS)
    assert msg["error"]["code"] == "template_invalid"
    assert "bad_action" in msg["error"]["message"] and "fan_mode" in msg["error"]["message"]
    unknown = {**KIDS, "key": "x", "start": [{**KIDS["start"][0], "action": "nope.do_it"}], "placeholders": []}
    msg = await call(ws, "sequence_scheduler/templates/save", template=unknown)
    assert "unknown_action" in msg["error"]["message"]
