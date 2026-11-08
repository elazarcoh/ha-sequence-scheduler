"""Plain data for templates and the queue. No Home Assistant imports."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Literal

Kind = Literal["number", "percent", "select", "text"]
KINDS: tuple[str, ...] = ("number", "percent", "select", "text")
StepState = Literal["pending", "in_progress"]
Phase = Literal["start", "end"]


def _dt_to_str(value: datetime) -> str:
    return value.astimezone(UTC).isoformat()


def _dt_from_str(value: str) -> datetime:
    return datetime.fromisoformat(value).astimezone(UTC)


@dataclass(frozen=True)
class Action:
    action: str
    target: dict
    data: dict

    def to_dict(self) -> dict:
        return {"action": self.action, "target": dict(self.target), "data": dict(self.data)}

    @classmethod
    def from_dict(cls, d: dict) -> Action:
        return cls(
            action=str(d["action"]),
            target=dict(d.get("target") or {}),
            data=dict(d.get("data") or {}),
        )


@dataclass(frozen=True)
class Placeholder:
    key: str
    field: str
    kind: Kind
    default: Any
    min: float | None = None
    max: float | None = None
    # Static options. None on a select means "read them from the entities".
    options: tuple[str, ...] | None = None

    def to_dict(self) -> dict:
        return {
            "key": self.key,
            "field": self.field,
            "kind": self.kind,
            "default": self.default,
            "min": self.min,
            "max": self.max,
            "options": list(self.options) if self.options is not None else None,
        }

    @classmethod
    def from_dict(cls, d: dict) -> Placeholder:
        options = d.get("options")
        return cls(
            key=str(d["key"]),
            field=str(d["field"]),
            kind=d["kind"],
            default=d.get("default"),
            min=d.get("min"),
            max=d.get("max"),
            options=tuple(str(o) for o in options) if options is not None else None,
        )


@dataclass(frozen=True)
class Template:
    id: str
    key: str
    name: str
    start: tuple[Action, ...]
    end: tuple[Action, ...]
    placeholders: tuple[Placeholder, ...]

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "key": self.key,
            "name": self.name,
            "start": [a.to_dict() for a in self.start],
            "end": [a.to_dict() for a in self.end],
            "placeholders": [p.to_dict() for p in self.placeholders],
        }

    @classmethod
    def from_dict(cls, d: dict) -> Template:
        return cls(
            id=str(d["id"]),
            key=str(d["key"]),
            name=str(d.get("name") or d["key"]),
            start=tuple(Action.from_dict(a) for a in d.get("start") or ()),
            end=tuple(Action.from_dict(a) for a in d.get("end") or ()),
            placeholders=tuple(Placeholder.from_dict(p) for p in d.get("placeholders") or ()),
        )


@dataclass
class Step:
    id: str
    phase: Phase
    at: datetime
    actions: list[Action]
    state: StepState = "pending"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "phase": self.phase,
            "at": _dt_to_str(self.at),
            "actions": [a.to_dict() for a in self.actions],
            "state": self.state,
        }

    @classmethod
    def from_dict(cls, d: dict) -> Step:
        return cls(
            id=str(d["id"]),
            phase=d["phase"],
            at=_dt_from_str(d["at"]),
            actions=[Action.from_dict(a) for a in d.get("actions") or ()],
            state=d.get("state", "pending"),
        )


@dataclass
class Block:
    id: str
    line: str
    template_name: str
    values: dict
    entity_ids: list[str]
    created_at: datetime
    steps: list[Step] = field(default_factory=list)
    # How the start went once it is done (ran / failed / skipped /
    # skipped_maybe_ran), so the card never calls a failed start "running".
    start_outcome: str | None = None
    start_detail: str = ""

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "line": self.line,
            "template_name": self.template_name,
            "values": dict(self.values),
            "entity_ids": list(self.entity_ids),
            "created_at": _dt_to_str(self.created_at),
            "steps": [s.to_dict() for s in self.steps],
            "start_outcome": self.start_outcome,
            "start_detail": self.start_detail,
        }

    @classmethod
    def from_dict(cls, d: dict) -> Block:
        return cls(
            id=str(d["id"]),
            line=str(d.get("line", "")),
            template_name=str(d.get("template_name", "")),
            values=dict(d.get("values") or {}),
            entity_ids=list(d.get("entity_ids") or ()),
            created_at=_dt_from_str(d["created_at"]),
            steps=[Step.from_dict(s) for s in d.get("steps") or ()],
            start_outcome=d.get("start_outcome"),
            start_detail=str(d.get("start_detail") or ""),
        )

    def __eq__(self, other: object) -> bool:
        return isinstance(other, Block) and self.to_dict() == other.to_dict()
