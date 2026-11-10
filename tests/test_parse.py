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


# --- relative starts and clock-time ends ----------------------------------


@pytest.mark.parametrize(
    "token,minutes", [("+30m", 30), ("+1h30", 90), ("+1.5h", 90), ("now", 0), ("NOW", 0), ("+0m", 0)]
)
def test_relative_start(token, minutes):
    p = one(f"kids {token} 1h 25")
    assert isinstance(p, ParsedLine)
    assert p.delay == timedelta(minutes=minutes)
    assert p.hour is None and p.minute is None
    assert p.duration == timedelta(hours=1) and p.positional == ("25",)


def test_clock_start_has_no_delay():
    p = one("kids 01:00 1h")
    assert p.delay is None and (p.end_hour, p.end_minute) == (None, None)


def test_clock_end():
    p = one("kids 01:00 02:30 25")
    assert (p.hour, p.minute, p.end_hour, p.end_minute) == (1, 0, 2, 30)
    assert p.duration is None and p.positional == ("25",)


@pytest.mark.parametrize(
    "text,start,delay,end",
    [
        ("kids 01:00-02:30 25", (1, 0), None, (2, 30)),
        ("kids +10m-03:00", (None, None), timedelta(minutes=10), (3, 0)),
        ("kids now-6:05", (None, None), timedelta(0), (6, 5)),
    ],
)
def test_range_token(text, start, delay, end):
    p = one(text)
    assert isinstance(p, ParsedLine)
    assert (p.hour, p.minute) == start and p.delay == delay
    assert (p.end_hour, p.end_minute) == end and p.duration is None


@pytest.mark.parametrize(
    "text,code",
    [
        ("kids 01:00-1h", "bad_end"),
        ("kids 01:00-", "bad_end"),
        ("kids 01:00-02:00 1h", "two_ends"),
        ("kids 01:00-02:00 03:00", "two_ends"),
        ("kids +30 1h", "bad_time"),
        ("kids +0:30 1h", "bad_time"),
        ("kids soon 1h", "bad_time"),
    ],
)
def test_range_and_relative_errors(text, code):
    e = one(text)
    assert isinstance(e, LineError) and e.code == code, e


# --- compact (2200) and 12-hour (10pm) clock times --------------------------


@pytest.mark.parametrize(
    "token,hm",
    [
        ("2200", (22, 0)), ("0130", (1, 30)), ("0000", (0, 0)), ("2359", (23, 59)), ("930", (9, 30)),
        ("10pm", (22, 0)), ("10PM", (22, 0)), ("10am", (10, 0)), ("10:30pm", (22, 30)),
        ("1030pm", (22, 30)), ("12am", (0, 0)), ("12pm", (12, 0)), ("12:15am", (0, 15)),
        ("1am", (1, 0)), ("9:05Am", (9, 5)),
    ],
)
def test_compact_and_12h_start(token, hm):
    p = one(f"kids {token} 1h 25")
    assert isinstance(p, ParsedLine), p
    assert (p.hour, p.minute) == hm and p.delay is None
    assert p.duration == timedelta(hours=1) and p.positional == ("25",)


@pytest.mark.parametrize(
    "token", ["2400", "2260", "99", "12345", "0pm", "13pm", "10:60pm", "10 pm", "10p", "1:5pm", "pm"]
)
def test_bad_compact_and_12h_start(token):
    e = one(f"kids {token} 1h")
    assert isinstance(e, LineError) and e.code in ("bad_time", "missing_time"), e


@pytest.mark.parametrize(
    "text,start,end",
    [
        ("kids 2200-0130 25", (22, 0), (1, 30)),
        ("kids 10pm-1:30am 25", (22, 0), (1, 30)),
        ("kids 22:00-6am 25", (22, 0), (6, 0)),
        ("kids 930pm-2300 25", (21, 30), (23, 0)),
    ],
)
def test_compact_and_12h_ranges(text, start, end):
    p = one(text)
    assert isinstance(p, ParsedLine), p
    assert (p.hour, p.minute) == start and (p.end_hour, p.end_minute) == end
    assert p.duration is None and p.positional == ("25",)


def test_12h_standalone_end():
    p = one("kids 10pm 1:30am 25")
    assert (p.hour, p.minute, p.end_hour, p.end_minute) == (22, 0, 1, 30)
    assert p.positional == ("25",)


def test_bare_number_after_start_stays_a_value():
    """A standalone end needs ':' or am/pm; plain digits there are template values (100%, 2000K)."""
    p = one("kitchen 2200 100 2000")
    assert (p.hour, p.minute) == (22, 0)
    assert (p.end_hour, p.end_minute) == (None, None) and p.duration is None
    assert p.positional == ("100", "2000")


def test_range_then_12h_end_is_two_ends():
    e = one("kids 2200-0100 3am")
    assert isinstance(e, LineError) and e.code == "two_ends"
