"""Resolve parsed lines against templates and live device state.

The backend owns this so the readback the card shows is exactly what gets
queued (spec anti-goal 3): the queue call re-runs this with the same `now`
and compares tokens.
"""

from __future__ import annotations

import hashlib
import json
import uuid
from collections.abc import Iterable
from dataclasses import dataclass, field, replace
from datetime import datetime, timedelta
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers import target as target_helper

from .models import Action, Block, Placeholder, Step, Template
from .parse import LineError, ParsedLine, next_occurrence, parse_text
from .store import QueueStore, TemplateStore

FAR_FUTURE = timedelta(hours=12)
_POINT = timedelta(microseconds=1)


@dataclass(frozen=True)
class Issue:
    code: str
    detail: str

    def to_dict(self) -> dict:
        return {"code": self.code, "detail": self.detail}


@dataclass
class PreviewRow:
    lineno: int
    raw: str
    ok: bool = False
    errors: list[Issue] = field(default_factory=list)
    warnings: list[Issue] = field(default_factory=list)
    template_id: str | None = None
    template_name: str | None = None
    values: dict = field(default_factory=dict)
    start_at: datetime | None = None
    end_at: datetime | None = None
    entity_ids: list[str] = field(default_factory=list)
    start_actions: list[Action] = field(default_factory=list)
    end_actions: list[Action] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "lineno": self.lineno,
            "raw": self.raw,
            "ok": self.ok,
            "errors": [i.to_dict() for i in self.errors],
            "warnings": [i.to_dict() for i in self.warnings],
            "template_id": self.template_id,
            "template_name": self.template_name,
            "values": dict(self.values),
            "start_at": self.start_at.isoformat() if self.start_at else None,
            "end_at": self.end_at.isoformat() if self.end_at else None,
            "entity_ids": list(self.entity_ids),
            "start_actions": [a.to_dict() for a in self.start_actions],
            "end_actions": [a.to_dict() for a in self.end_actions],
        }


def expand_entities(hass: HomeAssistant, actions: Iterable[Action]) -> list[str]:
    """Every existing entity the actions' targets cover, sorted.

    Uses the same helper as ha-shabbat-scheduler's `_resolver`: `referenced`
    holds entities named outright, `indirectly_referenced` what areas,
    devices, floors and labels expand into. Entities without a state (a
    deleted or misspelt id) are dropped so `no_entities` can catch them.
    """
    found: set[str] = set()
    for action in actions:
        if not action.target:
            continue
        selection = target_helper.TargetSelection(dict(action.target))
        selected = target_helper.async_extract_referenced_entity_ids(hass, selection)
        found |= selected.referenced | selected.indirectly_referenced
    return sorted(e for e in found if hass.states.get(e) is not None)


def select_options(
    hass: HomeAssistant, placeholder: Placeholder, entity_ids: list[str]
) -> list[str] | None:
    """Allowed values for a select placeholder; None means "anything".

    Static options win. Otherwise every entity exposing `<field>s` (e.g.
    `fan_modes` for `fan_mode`) contributes, and only options all of them
    support survive, in the first entity's order.
    """
    if placeholder.options is not None:
        return list(placeholder.options)
    attr = f"{placeholder.field}s"
    lists = []
    for entity_id in entity_ids:
        state = hass.states.get(entity_id)
        value = state.attributes.get(attr) if state else None
        if isinstance(value, (list, tuple)):
            lists.append([str(v) for v in value])
    if not lists:
        return None
    rest = [set(o) for o in lists[1:]]
    return [o for o in lists[0] if all(o in s for s in rest)]


def _coerce(
    hass: HomeAssistant, p: Placeholder, raw: Any, entity_ids: list[str]
) -> tuple[Any, Issue | None]:
    if p.kind in ("number", "percent"):
        text = str(raw).strip()
        if p.kind == "percent" and text.endswith("%"):
            text = text[:-1]
        try:
            number = float(text)
        except ValueError:
            return None, Issue("bad_value", f"{p.key}: {raw!r} is not a number")
        lo, hi = (0, 100) if p.kind == "percent" else (p.min, p.max)
        if (lo is not None and number < lo) or (hi is not None and number > hi):
            span = f"{_fmt(lo)}–{_fmt(hi)}" if lo is not None and hi is not None else (
                f"at least {_fmt(lo)}" if lo is not None else f"at most {_fmt(hi)}")
            return None, Issue("bad_value", f"{p.key}: {raw} is outside {span}")
        if p.kind == "percent" and not number.is_integer():
            return None, Issue("bad_value", f"{p.key}: use a whole percentage")
        return (int(number) if number.is_integer() else number), None
    if p.kind == "select":
        options = select_options(hass, p, entity_ids)
        text = str(raw)
        if options is None:
            return text, None
        for option in options:
            if option.casefold() == text.casefold():
                return option, None
        valid = ", ".join(options) if options else "none (the devices share no options)"
        return None, Issue("not_an_option", f"{p.key}: {text!r} is not one of {valid}")
    return str(raw), None


def _fmt(n: float | None) -> str:
    return "" if n is None else (str(int(n)) if float(n).is_integer() else str(n))


def _apply(actions: Iterable[Action], template: Template, values: dict) -> list[Action]:
    out = []
    for action in actions:
        data = dict(action.data)
        for p in template.placeholders:
            if p.field in data:
                data[p.field] = values[p.key]
        out.append(replace(action, data=data))
    return out


def _resolve(
    hass: HomeAssistant, templates: TemplateStore, parsed: ParsedLine, now: datetime
) -> PreviewRow:
    row = PreviewRow(parsed.lineno, parsed.raw)
    template = templates.get_by_key(parsed.key)
    if template is None:
        row.errors.append(Issue("unknown_template", f"no template called {parsed.key!r}"))
        return row
    row.template_id, row.template_name = template.id, template.name
    row.entity_ids = expand_entities(hass, (*template.start, *template.end))
    if not row.entity_ids:
        row.errors.append(Issue("no_entities", "the template's targets match no existing entity"))

    placeholders = list(template.placeholders)
    if len(parsed.positional) > len(placeholders):
        expected = ", ".join(p.key for p in placeholders) or "no values"
        row.errors.append(Issue("too_many_values", f"{template.key} takes {expected}"))
        return row
    given: dict[str, Any] = {p.key: v for p, v in zip(placeholders, parsed.positional)}
    by_key = {p.key.casefold(): p for p in placeholders}
    for key, value in parsed.named.items():
        p = by_key.get(key.casefold())
        if p is None:
            row.errors.append(Issue("unknown_placeholder", f"{template.key} has no {key!r}"))
            continue
        given[p.key] = value
    for p in placeholders:
        value, issue = _coerce(hass, p, given.get(p.key, p.default), row.entity_ids)
        if issue:
            row.errors.append(issue)
        else:
            row.values[p.key] = value

    row.start_at = next_occurrence(parsed.hour, parsed.minute, now)
    if parsed.duration is not None and not template.end:
        row.errors.append(Issue("duration_without_end", f"{template.key} has no end to schedule"))
    elif parsed.duration is not None:
        row.end_at = row.start_at + parsed.duration
    elif template.end:
        row.warnings.append(Issue("no_duration", "no duration given: only the start is queued"))
    if row.start_at - now > FAR_FUTURE:
        row.warnings.append(Issue("far_future", "more than 12 hours from now"))

    if not row.errors:
        row.ok = True
        row.start_actions = _apply(template.start, template, row.values)
        row.end_actions = _apply(template.end, template, row.values) if row.end_at else []
    return row


def _span(start: datetime, end: datetime | None) -> tuple[datetime, datetime]:
    return start, (end if end is not None else start + _POINT)


def _block_span(block: Block) -> tuple[datetime, datetime]:
    starts = [s.at for s in block.steps if s.phase == "start"]
    ends = [s.at for s in block.steps if s.phase == "end"]
    if starts:
        return _span(starts[0], ends[0] if ends else None)
    # Already running: only its end is left.
    return datetime.min.replace(tzinfo=ends[0].tzinfo), ends[0]


def _overlaps(a: tuple[datetime, datetime], b: tuple[datetime, datetime]) -> bool:
    return a[0] < b[1] and b[0] < a[1]


def _add_overlap_warnings(rows: list[PreviewRow], queue: QueueStore) -> None:
    ok = [r for r in rows if r.ok]
    for row in ok:
        mine = _span(row.start_at, row.end_at)
        for other in ok:
            if other is row or not set(row.entity_ids) & set(other.entity_ids):
                continue
            if _overlaps(mine, _span(other.start_at, other.end_at)):
                row.warnings.append(Issue("overlap", f"overlaps line {other.lineno} on the same device"))
        for block in queue.blocks:
            if set(row.entity_ids) & set(block.entity_ids) and _overlaps(mine, _block_span(block)):
                row.warnings.append(Issue("overlap", f"overlaps queued {block.line!r}"))


def build_preview(
    hass: HomeAssistant, templates: TemplateStore, queue: QueueStore, text: str, now: datetime
) -> list[PreviewRow]:
    rows: list[PreviewRow] = []
    for parsed in parse_text(text):
        if isinstance(parsed, LineError):
            rows.append(PreviewRow(parsed.lineno, parsed.raw, errors=[Issue(parsed.code, parsed.detail)]))
        else:
            rows.append(_resolve(hass, templates, parsed, now))
    _add_overlap_warnings(rows, queue)
    return rows


def preview_token(rows: list[PreviewRow]) -> str:
    payload = json.dumps([r.to_dict() for r in rows if r.ok], sort_keys=True, default=str)
    return hashlib.sha256(payload.encode()).hexdigest()


def rows_to_blocks(rows: list[PreviewRow], created_at: datetime) -> list[Block]:
    blocks = []
    for row in rows:
        if not row.ok:
            continue
        steps = [Step(uuid.uuid4().hex, "start", row.start_at, list(row.start_actions))]
        if row.end_at is not None:
            steps.append(Step(uuid.uuid4().hex, "end", row.end_at, list(row.end_actions)))
        blocks.append(Block(
            id=uuid.uuid4().hex, line=row.raw, template_name=row.template_name or "",
            values=dict(row.values), entity_ids=list(row.entity_ids),
            created_at=created_at, steps=steps,
        ))
    return blocks
