"""Text lines -> ParsedLine or LineError, plus wall-clock time resolution.

Grammar, one block per line:  <key> <HH:MM> [<duration>] [<values...>]
Values are positional, or named as key=value; positional must come first.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, time, timedelta

from homeassistant.util import dt as dt_util

_TIME = re.compile(r"^([01]?\d|2[0-3]):([0-5]\d)$")
_DUR_HOURS = re.compile(r"^(\d+(?:\.\d+)?)h$")
_DUR_MINUTES = re.compile(r"^(\d+)m$")
_DUR_HM = re.compile(r"^(\d+)h(\d{1,2})m?$")


@dataclass(frozen=True)
class ParsedLine:
    lineno: int
    raw: str
    key: str
    hour: int
    minute: int
    duration: timedelta | None
    positional: tuple[str, ...]
    named: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class LineError:
    lineno: int
    raw: str
    code: str
    detail: str


def parse_duration(token: str) -> timedelta | None:
    """The duration a token spells, or None when it is not a duration token."""
    token = token.casefold()
    if m := _DUR_HOURS.match(token):
        return timedelta(hours=float(m.group(1)))
    if m := _DUR_MINUTES.match(token):
        return timedelta(minutes=int(m.group(1)))
    if m := _DUR_HM.match(token):
        return timedelta(hours=int(m.group(1)), minutes=int(m.group(2)))
    return None


def _parse_line(lineno: int, raw: str) -> ParsedLine | LineError:
    tokens = raw.split()
    key = tokens[0]
    if len(tokens) < 2:
        return LineError(lineno, raw, "missing_time", "add a time like 01:00")
    m = _TIME.match(tokens[1])
    if not m:
        return LineError(lineno, raw, "bad_time", f"{tokens[1]!r} is not a time like 01:00")
    rest = tokens[2:]
    duration = None
    if rest and (d := parse_duration(rest[0])) is not None:
        if d <= timedelta(0):
            return LineError(lineno, raw, "bad_duration", f"{rest[0]!r} is zero")
        duration = d
        rest = rest[1:]
    positional: list[str] = []
    named: dict[str, str] = {}
    for token in rest:
        if "=" in token:
            k, v = token.split("=", 1)
            named[k] = v
        elif named:
            return LineError(
                lineno, raw, "positional_after_named",
                f"{token!r} comes after a named value; put plain values first",
            )
        else:
            positional.append(token)
    return ParsedLine(
        lineno, raw, key, int(m.group(1)), int(m.group(2)), duration, tuple(positional), named
    )


def parse_text(text: str) -> list[ParsedLine | LineError]:
    out: list[ParsedLine | LineError] = []
    for i, line in enumerate(text.splitlines(), start=1):
        raw = line.strip()
        if not raw or raw.startswith("#"):
            continue
        out.append(_parse_line(i, raw))
    return out


def _wall(day: date, hour: int, minute: int, tz, fold: int) -> datetime:
    """A wall-clock time as a real UTC instant (normalises DST gaps)."""
    return datetime.combine(day, time(hour, minute, fold=fold), tzinfo=tz).astimezone(UTC)


def next_occurrence(hour: int, minute: int, now: datetime) -> datetime:
    """The first instant strictly after `now` showing HH:MM on the local clock.

    Local means Home Assistant's configured time zone. On a fall-back day
    the repeated wall time has two instants; the earlier one still ahead
    of `now` wins.
    """
    tz = dt_util.get_default_time_zone()
    local_today = now.astimezone(tz).date()
    now_utc = now.astimezone(UTC)
    for offset in range(0, 3):
        day = local_today + timedelta(days=offset)
        candidates = sorted({_wall(day, hour, minute, tz, 0), _wall(day, hour, minute, tz, 1)})
        for candidate in candidates:
            if candidate > now_utc:
                return candidate
    raise AssertionError("unreachable: some day ahead always has HH:MM")
