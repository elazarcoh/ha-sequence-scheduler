"""Text lines -> ParsedLine or LineError, plus wall-clock time resolution.

Grammar, one block per line:  <key> <start>[-<HH:MM>] [<end>] [<values...>]

- start: HH:MM (the next time the clock shows it), +<duration> (that long
  after "now"), or `now`.
- end: a duration after the start, or HH:MM (the first time the clock shows
  it after the start). `<start>-<HH:MM>` gives both in one token.
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
    # A clock start (hour, minute) or a relative one (delay); never both.
    hour: int | None
    minute: int | None
    duration: timedelta | None
    positional: tuple[str, ...]
    named: dict[str, str] = field(default_factory=dict)
    delay: timedelta | None = None
    # A clock end; never set together with duration.
    end_hour: int | None = None
    end_minute: int | None = None


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


_START_HELP = "a time like 01:00, +30m or now"


def _parse_start(token: str) -> tuple[int | None, int | None, timedelta | None] | None:
    """(hour, minute, delay) for a start token, or None when it is not one."""
    if m := _TIME.match(token):
        return int(m.group(1)), int(m.group(2)), None
    if token.casefold() == "now":
        return None, None, timedelta(0)
    if token.startswith("+") and (d := parse_duration(token[1:])) is not None:
        return None, None, d
    return None


def _parse_line(lineno: int, raw: str) -> ParsedLine | LineError:
    tokens = raw.split()
    key = tokens[0]
    if len(tokens) < 2:
        return LineError(lineno, raw, "missing_time", f"add {_START_HELP}")
    start_token, dash, range_end = tokens[1].partition("-")
    start = _parse_start(start_token)
    if start is None:
        return LineError(lineno, raw, "bad_time", f"{start_token!r} is not {_START_HELP}")
    hour, minute, delay = start
    rest = tokens[2:]
    duration = None
    end_hour = end_minute = None
    if dash:
        if not (m := _TIME.match(range_end)):
            return LineError(
                lineno, raw, "bad_end", f"after '-' put a clock time like 02:30, not {range_end!r}"
            )
        end_hour, end_minute = int(m.group(1)), int(m.group(2))
        if rest and (parse_duration(rest[0]) is not None or _TIME.match(rest[0])):
            return LineError(
                lineno, raw, "two_ends", f"{rest[0]!r} is a second end; the range already has one"
            )
    elif rest and (d := parse_duration(rest[0])) is not None:
        if d <= timedelta(0):
            return LineError(lineno, raw, "bad_duration", f"{rest[0]!r} is zero")
        duration = d
        rest = rest[1:]
    elif rest and (m := _TIME.match(rest[0])):
        end_hour, end_minute = int(m.group(1)), int(m.group(2))
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
        lineno, raw, key, hour, minute, duration, tuple(positional), named,
        delay=delay, end_hour=end_hour, end_minute=end_minute,
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


def shows_wall_time(instant: datetime, hour: int, minute: int) -> bool:
    """Does the local clock read HH:MM at this instant?"""
    local = instant.astimezone(dt_util.get_default_time_zone())
    return (local.hour, local.minute) == (hour, minute)


def next_occurrence(hour: int, minute: int, now: datetime) -> datetime:
    """The first instant strictly after `now` showing HH:MM on the local clock.

    Local means Home Assistant's configured time zone. On a fall-back day
    the repeated wall time has two instants; the earlier one still ahead
    of `now` wins. On a spring-forward day HH:MM may not exist at all; then
    the instant just after the jump is used (02:30 -> 03:30), never the
    hour before it, and the caller can tell with `shows_wall_time`.
    """
    tz = dt_util.get_default_time_zone()
    local_today = now.astimezone(tz).date()
    now_utc = now.astimezone(UTC)
    for offset in range(0, 3):
        day = local_today + timedelta(days=offset)
        both = {_wall(day, hour, minute, tz, 0), _wall(day, hour, minute, tz, 1)}
        real = sorted(c for c in both if shows_wall_time(c, hour, minute))
        candidates = real or [max(both)]
        for candidate in candidates:
            if candidate > now_utc:
                return candidate
    raise AssertionError("unreachable: some day ahead always has HH:MM")
