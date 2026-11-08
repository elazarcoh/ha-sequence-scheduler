"""Line grammar, durations and next-occurrence time resolution."""

from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest

from custom_components.sequence_scheduler.parse import (
    LineError,
    ParsedLine,
    next_occurrence,
    parse_duration,
    parse_text,
)

TZ = ZoneInfo("Asia/Jerusalem")


def one(text):
    [result] = parse_text(text)
    return result


def test_basic_line():
    p = one("kids 01:00 1h 25")
    assert isinstance(p, ParsedLine)
    assert (p.key, p.hour, p.minute) == ("kids", 1, 0)
    assert p.duration == timedelta(hours=1)
    assert p.positional == ("25",)
    assert p.named == {}


@pytest.mark.parametrize(
    "token,minutes",
    [("1h", 60), ("1.5h", 90), ("90m", 90), ("1h30", 90), ("1h30m", 90), ("2h05", 125)],
)
def test_durations(token, minutes):
    assert parse_duration(token) == timedelta(minutes=minutes)


@pytest.mark.parametrize("token", ["25", "silent", "fan=low", "1:30", "h", "1.5m"])
def test_non_duration_tokens(token):
    assert parse_duration(token) is None


def test_zero_duration_is_an_error():
    e = one("kids 01:00 0m")
    assert isinstance(e, LineError) and e.code == "bad_duration"


def test_named_and_positional():
    p = one("salon 13:00 2h fan=low")
    assert p.named == {"fan": "low"} and p.positional == ()
    p = one("kids 01:00 25 fan=silent")
    assert p.duration is None and p.positional == ("25",) and p.named == {"fan": "silent"}


def test_named_value_may_contain_equals():
    assert one("x 01:00 a=b=c").named == {"a": "b=c"}


def test_positional_after_named_errors():
    e = one("kids 01:00 fan=silent 25")
    assert isinstance(e, LineError) and e.code == "positional_after_named"


@pytest.mark.parametrize("text,code", [("x 25:00", "bad_time"), ("x 1:5", "bad_time"), ("kids", "missing_time")])
def test_bad_and_missing_time(text, code):
    e = one(text)
    assert isinstance(e, LineError) and e.code == code


def test_single_digit_hour_ok():
    assert one("x 5:30").hour == 5


def test_comments_and_blank_lines_keep_line_numbers():
    results = parse_text("# plan\n\nkids 01:00 1h\n   \nheater 06:00 45m\n")
    assert [r.lineno for r in results] == [3, 5]
    assert results[0].raw == "kids 01:00 1h"


def test_hebrew_key():
    p = one("מזגן 01:00 1h 25 Silent")
    assert p.key == "מזגן" and p.positional == ("25", "Silent")


async def test_next_occurrence_tonight_vs_tomorrow(jerusalem):
    now = datetime(2026, 11, 7, 22, 30, tzinfo=TZ)
    assert next_occurrence(1, 0, now) == datetime(2026, 11, 8, 1, 0, tzinfo=TZ)
    assert next_occurrence(23, 0, now) == datetime(2026, 11, 7, 23, 0, tzinfo=TZ)
    exactly = datetime(2026, 11, 8, 1, 0, tzinfo=TZ)
    assert next_occurrence(1, 0, exactly) == datetime(2026, 11, 9, 1, 0, tzinfo=TZ)
    assert next_occurrence(1, 0, now).tzinfo == UTC


async def test_next_occurrence_dst_fallback(jerusalem):
    # 2026-10-25: Israel falls back 02:00 -> 01:00, so 01:00-02:00 happens twice.
    now = datetime(2026, 10, 25, 0, 30, tzinfo=TZ)
    first = next_occurrence(1, 30, now)
    assert first == datetime(2026, 10, 24, 22, 30, tzinfo=UTC)  # 01:30 +03:00
    # Inside the repeated hour, after the first 01:30 has passed: the second one.
    later = datetime(2026, 10, 24, 22, 45, tzinfo=UTC)  # 01:45 +03:00
    assert next_occurrence(1, 30, later) == datetime(2026, 10, 24, 23, 30, tzinfo=UTC)
    # Durations are elapsed time.
    assert (first + timedelta(hours=1)) - first == timedelta(minutes=60)


async def test_next_occurrence_spring_forward_gap(jerusalem):
    """Final review #3: 2027-03-26 02:00 jumps to 03:00; 02:30 does not exist."""
    now = datetime(2027, 3, 25, 22, 0, tzinfo=TZ)
    got = next_occurrence(2, 30, now)
    assert got == datetime(2027, 3, 26, 3, 30, tzinfo=TZ)  # after the jump, never 01:30
    assert next_occurrence(1, 30, now) == datetime(2027, 3, 26, 1, 30, tzinfo=TZ)
