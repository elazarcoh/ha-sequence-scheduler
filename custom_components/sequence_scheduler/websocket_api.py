"""Websocket commands for the card. Transport only; logic lives elsewhere.

Every command is admin-only (spec §2.9: one user, an HA admin).
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.util import dt as dt_util

from .const import DOMAIN, SIGNAL_QUEUE_CHANGED
from .preview import (
    Issue,
    action_problem,
    build_preview,
    expand_entities,
    preview_token,
    rows_to_blocks,
    select_options,
    target_problem,
)
from .target_filter import async_load_descriptions
from .template_schema import TemplateError, validate_template

STALE_AFTER = timedelta(minutes=10)
_REGISTERED = f"{DOMAIN}_ws_registered"


def _entry_data(hass: HomeAssistant) -> dict | None:
    entries = list(hass.data.get(DOMAIN, {}).values())
    return entries[0] if entries else None


def _not_set_up(connection, msg) -> None:
    connection.send_error(msg["id"], "not_set_up", "Sequence Scheduler is not set up")


def _template_payload(hass: HomeAssistant, template) -> dict:
    out = template.to_dict()
    entity_ids = expand_entities(hass, (*template.start, *template.end))
    for raw, p in zip(out["placeholders"], template.placeholders):
        raw["resolved_options"] = (
            select_options(hass, p, entity_ids) if p.kind == "select" else None
        )
    # Saved before this check existed, or outside the editor: say so on the list.
    out["problems"] = [
        issue.detail for a in (*template.start, *template.end)
        if (issue := target_problem(hass, a))
    ]
    return out


def _blocks_payload(data: dict) -> dict:
    return {"blocks": [b.to_dict() for b in data["queue"].blocks]}


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): "sequence_scheduler/templates/list"})
@websocket_api.async_response
async def ws_templates_list(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    if (data := _entry_data(hass)) is None:
        return _not_set_up(connection, msg)
    await async_load_descriptions(hass)
    connection.send_result(
        msg["id"],
        {"templates": [_template_payload(hass, t) for t in data["templates"].templates]},
    )


@websocket_api.require_admin
@websocket_api.websocket_command(
    {vol.Required("type"): "sequence_scheduler/templates/save", vol.Required("template"): dict}
)
@websocket_api.async_response
async def ws_templates_save(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    if (data := _entry_data(hass)) is None:
        return _not_set_up(connection, msg)
    await async_load_descriptions(hass)
    try:
        template = validate_template(msg["template"])
        for action in (*template.start, *template.end):
            if issue := action_problem(hass, action):
                raise TemplateError(issue.code, issue.detail)
        await data["templates"].async_save(template)
    except TemplateError as err:
        connection.send_error(msg["id"], "template_invalid", f"{err.code}: {err.detail}")
        return
    connection.send_result(msg["id"], {"template": _template_payload(hass, template)})


@websocket_api.require_admin
@websocket_api.websocket_command(
    {vol.Required("type"): "sequence_scheduler/templates/delete", vol.Required("template_id"): str}
)
@websocket_api.async_response
async def ws_templates_delete(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    if (data := _entry_data(hass)) is None:
        return _not_set_up(connection, msg)
    try:
        await data["templates"].async_delete(msg["template_id"])
    except KeyError:
        connection.send_error(msg["id"], "not_found", "No such template")
        return
    connection.send_result(msg["id"], {})


@websocket_api.require_admin
@websocket_api.websocket_command(
    {vol.Required("type"): "sequence_scheduler/preview", vol.Required("text"): str}
)
@websocket_api.async_response
async def ws_preview(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    if (data := _entry_data(hass)) is None:
        return _not_set_up(connection, msg)
    await async_load_descriptions(hass)
    now = dt_util.now()
    rows = build_preview(hass, data["templates"], data["queue"], msg["text"], now)
    connection.send_result(
        msg["id"],
        {"now": now.isoformat(), "rows": [r.to_dict() for r in rows], "token": preview_token(rows)},
    )


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): "sequence_scheduler/queue",
        vol.Required("text"): str,
        vol.Required("now"): str,
        vol.Required("token"): str,
    }
)
@websocket_api.async_response
async def ws_queue(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    if (data := _entry_data(hass)) is None:
        return _not_set_up(connection, msg)
    await async_load_descriptions(hass)
    real_now = dt_util.now()
    try:
        then = datetime.fromisoformat(msg["now"])
    except ValueError:
        connection.send_error(msg["id"], "stale_preview", "Preview again")
        return
    if then.tzinfo is None or then > real_now or real_now - then > STALE_AFTER:
        connection.send_error(msg["id"], "stale_preview", "The preview is too old. Preview again.")
        return
    rows = build_preview(hass, data["templates"], data["queue"], msg["text"], then)
    if preview_token(rows) != msg["token"]:
        connection.send_error(
            msg["id"], "preview_changed", "Something changed since the preview. Check and queue again."
        )
        return
    # A relative start (+30m, now) counts from this press, not from the
    # preview: re-resolve just those lines at the real time. Clock-time
    # lines keep exactly the times the readback showed.
    if any(r.relative for r in rows):
        at_press = build_preview(hass, data["templates"], data["queue"], msg["text"], real_now)
        rows = [fresh if old.relative else old for old, fresh in zip(rows, at_press, strict=True)]
    # Review Focus 1: the times shown stay put, but a step whose time has
    # passed since the preview is refused - never run late, never moved.
    for row in rows:
        if row.ok and not row.relative and row.start_at <= real_now:
            row.ok = False
            row.errors.append(Issue("already_past", f"line {row.lineno}: its time has passed"))
    blocks = rows_to_blocks(rows, real_now)
    if not blocks:
        details = "; ".join(f"{i.code}: {i.detail}" for r in rows for i in r.errors)
        connection.send_error(msg["id"], "nothing_to_queue", details or "No valid lines")
        return
    await data["engine"].async_enqueue(blocks)
    # Every line not queued goes back, so the card can keep it on screen
    # rather than let it vanish with a bare count (final review #5).
    refused = [
        {"lineno": r.lineno, "raw": r.raw, "errors": [i.to_dict() for i in r.errors]}
        for r in rows
        if not r.ok
    ]
    connection.send_result(msg["id"], {"queued": len(blocks), "refused": refused})


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): "sequence_scheduler/queue/list"})
@callback
def ws_queue_list(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    if (data := _entry_data(hass)) is None:
        return _not_set_up(connection, msg)
    connection.send_result(msg["id"], _blocks_payload(data))


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): "sequence_scheduler/queue/cancel",
        vol.Required("block_id"): str,
        vol.Required("run_end"): bool,
    }
)
@websocket_api.async_response
async def ws_queue_cancel(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    if (data := _entry_data(hass)) is None:
        return _not_set_up(connection, msg)
    try:
        await data["engine"].async_cancel(msg["block_id"], msg["run_end"])
    except KeyError:
        connection.send_error(msg["id"], "not_found", "No such queued block")
        return
    connection.send_result(msg["id"], {})


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): "sequence_scheduler/queue/subscribe"})
@callback
def ws_queue_subscribe(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    if _entry_data(hass) is None:
        return _not_set_up(connection, msg)

    @callback
    def _forward() -> None:
        # Resolved per push, never captured: the subscription outlives an
        # entry reload (same reasoning as ha-shabbat-scheduler's subscribe).
        current = _entry_data(hass)
        if current is not None:
            connection.send_message(websocket_api.event_message(msg["id"], _blocks_payload(current)))

    connection.subscriptions[msg["id"]] = async_dispatcher_connect(
        hass, SIGNAL_QUEUE_CHANGED, _forward
    )
    connection.send_result(msg["id"])
    _forward()


@callback
def async_register(hass: HomeAssistant) -> None:
    if hass.data.get(_REGISTERED):
        return
    hass.data[_REGISTERED] = True
    for handler in (
        ws_templates_list,
        ws_templates_save,
        ws_templates_delete,
        ws_preview,
        ws_queue,
        ws_queue_list,
        ws_queue_cancel,
        ws_queue_subscribe,
    ):
        websocket_api.async_register_command(hass, handler)
