"""The card inside a real Home Assistant (dev container on :8125).

happy-dom proves the elements render in a fake DOM; only this proves they
work in Home Assistant. dev/seed.py seeds a `kids` template against
climate.dev_kids and a dashboard at /sequence-scheduler/0.
"""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from playwright.sync_api import expect

DASHBOARD = "/sequence-scheduler/0"
TZ = ZoneInfo("Asia/Jerusalem")

ACTION_PICKER = "seq-service-editor ha-service-control ha-service-picker"
TARGET_PICKER = "seq-target-editor ha-target-picker"


def _open(page, base_url):
    page.goto(f"{base_url}{DASHBOARD}")
    page.locator("sequence-scheduler-card").wait_for(timeout=30_000)


def _choose(picker, trigger, query, *narrow):
    """Open one of HA's combo-box pickers and choose exactly one row.

    Adapted from ha-shabbat-scheduler e2e: the row must be unique, never `.first`.
    """
    picker.locator(trigger).first.click()
    combo = picker.locator("ha-picker-combo-box")
    combo.locator("input").first.fill(query)
    rows = combo.locator(".combo-box-row")
    for term in narrow:
        rows = rows.filter(has_text=term)
    expect(rows).to_have_count(1, timeout=15_000)
    rows.click()
    expect(combo).to_have_count(0, timeout=15_000)


def test_hint_visible_while_typing(page, base_url):
    _open(page, base_url)
    page.locator("seq-queue-entry textarea").fill("kids 01:00 ")
    expect(page.locator("seq-queue-entry .hint")).to_have_text("temp (26)", timeout=15_000)


def test_queue_then_cancel(page, base_url):
    _open(page, base_url)
    start = (datetime.now(TZ) + timedelta(hours=2)).strftime("%H:%M")
    end = (datetime.now(TZ) + timedelta(hours=3)).strftime("%H:%M")
    page.locator("seq-queue-entry textarea").fill(f"kids {start} 1h 25")
    row = page.locator("seq-queue-entry .row")
    expect(row).to_have_count(1, timeout=15_000)
    expect(row.locator(".time")).to_have_text(f"{start}–{end}")
    button = page.locator("seq-queue-entry button.queue")
    expect(button).to_have_text("Queue 1")
    button.click()
    expect(page.locator("seq-queue-entry .message")).to_have_text("Queued 1", timeout=15_000)
    block = page.locator("seq-queue-list .block")
    expect(block).to_have_count(1, timeout=15_000)
    expect(block).to_contain_text(f"kids {start} 1h 25")
    block.locator("button.cancel").click()
    expect(page.locator("seq-queue-list .empty")).to_have_text("Nothing queued.", timeout=15_000)


def test_bad_line_is_flagged_not_queued(page, base_url):
    _open(page, base_url)
    page.locator("seq-queue-entry textarea").fill("kids 01:00 1h 99\nnope 02:00")
    rows = page.locator("seq-queue-entry .row")
    expect(rows).to_have_count(2, timeout=15_000)
    expect(rows.nth(0).locator(".error")).to_contain_text("outside 14–31")
    expect(rows.nth(1).locator(".error")).to_contain_text("no template called 'nope'")
    expect(page.locator("seq-queue-entry button.queue")).to_be_disabled()


def test_template_created_in_the_editor(page, base_url):
    _open(page, base_url)
    card = page.locator("sequence-scheduler-card")
    card.locator("[role=tab]", has_text="Templates").click()
    page.locator("seq-template-list button.add-template").click()
    dialog = page.locator("seq-template-dialog")
    dialog.locator("input.key").fill("heat")
    dialog.locator("input.name").fill("Kids heater output")
    start = dialog.locator(".start .action").first
    start.locator("seq-target-editor ha-selector").wait_for(timeout=15_000)
    _choose(start.locator(TARGET_PICKER), "ha-generic-picker ha-button", "Thermostat output", "kids")
    _choose(start.locator(ACTION_PICKER), "ha-picker-field", "input_boolean.turn_on", "Turn on")
    dialog.locator("input.no-end").check()
    dialog.locator("button.save").click()
    expect(page.locator("seq-template-list .template", has_text="heat")).to_have_count(1, timeout=15_000)
    # It is usable straight away from the Queue tab.
    card.locator("[role=tab]", has_text="Queue").click()
    page.locator("seq-queue-entry textarea").fill("heat 03:00")
    expect(page.locator("seq-queue-entry .row .ok")).to_have_count(1, timeout=15_000)


def test_action_fields_follow_the_chosen_device(page, base_url):
    """HA's action form needs the target to know the device: without it the
    mode dropdowns are greyed out and set_temperature has no temperature."""
    _open(page, base_url)
    card = page.locator("sequence-scheduler-card")
    card.locator("[role=tab]", has_text="Templates").click()
    page.locator("seq-template-list button.add-template").click()
    dialog = page.locator("seq-template-dialog")
    start = dialog.locator(".start .action").first
    start.locator("seq-target-editor ha-selector").wait_for(timeout=15_000)
    _choose(start.locator(TARGET_PICKER), "ha-generic-picker ha-button", "Dev kids")
    _choose(start.locator(ACTION_PICKER), "ha-picker-field", "climate.set_temperature", "thermostat target temperature")
    control = start.locator("seq-service-editor ha-service-control")
    expect(control.locator("ha-selector-number")).to_have_count(1, timeout=15_000)
    # Set HVAC mode's required mode dropdown is usable, scoped to the device.
    _choose(start.locator(ACTION_PICKER), "ha-picker-field", "climate.set_hvac_mode", "thermostat HVAC mode")
    mode = control.locator("ha-selector-state")
    expect(mode).to_have_count(1, timeout=15_000)
    # The field is optional in HA's schema: tick it to fill it in.
    control.locator("ha-checkbox").first.click()
    assert mode.evaluate("el => el.context && el.context.filter_entity") == ["climate.dev_kids"]
    assert mode.evaluate("el => !el.disabled")
