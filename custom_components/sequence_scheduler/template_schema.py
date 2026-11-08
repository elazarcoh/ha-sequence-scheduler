"""Validate a raw template dict into a Template. No Home Assistant imports."""

from __future__ import annotations

import uuid
from typing import Any

from .models import KINDS, Action, Placeholder, Template


class TemplateError(Exception):
    def __init__(self, code: str, detail: str = "") -> None:
        super().__init__(f"{code}: {detail}" if detail else code)
        self.code = code
        self.detail = detail


def _actions(raw: Any, section: str) -> tuple[Action, ...]:
    if raw is None:
        return ()
    if not isinstance(raw, list):
        raise TemplateError("bad_action", f"{section} must be a list")
    out = []
    for item in raw:
        if not isinstance(item, dict) or not isinstance(item.get("action"), str) or "." not in item["action"]:
            raise TemplateError("bad_action", f"{section} has an action without a service")
        out.append(Action.from_dict(item))
    return tuple(out)


def default_is_valid(p: Placeholder) -> bool:
    """Is the placeholder's default a legal value for its own kind?"""
    value = p.default
    if p.kind in ("number", "percent"):
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            return False
        lo, hi = (0, 100) if p.kind == "percent" else (p.min, p.max)
        if lo is not None and value < lo:
            return False
        if hi is not None and value > hi:
            return False
        return True
    if p.kind == "select":
        if not isinstance(value, str) or not value:
            return False
        if p.options is not None:
            return value.casefold() in {o.casefold() for o in p.options}
        return True
    return isinstance(value, str)


def validate_template(raw: dict) -> Template:
    key = str(raw.get("key") or "")
    if not key or any(ch.isspace() for ch in key):
        raise TemplateError("empty_key", "the short name must be one word")
    start = _actions(raw.get("start"), "start")
    if not start:
        raise TemplateError("empty_start", "a template needs at least one start action")
    end = _actions(raw.get("end"), "end")

    placeholders: list[Placeholder] = []
    seen: set[str] = set()
    for item in raw.get("placeholders") or ():
        if item.get("kind") not in KINDS:
            raise TemplateError("bad_kind", f"unknown kind {item.get('kind')!r}")
        p = Placeholder.from_dict(item)
        if not p.key or any(ch.isspace() for ch in p.key):
            raise TemplateError("empty_key", "a placeholder name must be one word")
        folded = p.key.casefold()
        if folded in seen:
            raise TemplateError("duplicate_placeholder", p.key)
        seen.add(folded)
        if not any(p.field in a.data for a in (*start, *end)):
            raise TemplateError(
                "unbound_placeholder", f"{p.key}: no action has a {p.field!r} value"
            )
        if not default_is_valid(p):
            raise TemplateError("bad_default", f"{p.key}: {p.default!r} is not a valid {p.kind}")
        placeholders.append(p)

    return Template(
        id=str(raw.get("id") or uuid.uuid4().hex),
        key=key,
        name=str(raw.get("name") or key),
        start=start,
        end=end,
        placeholders=tuple(placeholders),
    )
