# Sequence Scheduler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A HACS integration plus Lovelace card for queuing one-off sequences of Home Assistant actions. You write one-line text entries such as `kids 01:00 1h 25`, and each refers to a template you set up beforehand.

**Architecture:**
- **Backend (Python custom component `sequence_scheduler`).** It has two persistent stores: templates and the queue. Pure modules handle parsing and preview (text in, resolved rows out). An engine schedules each queued step with `async_track_point_in_time`, runs its actions through `async_call_from_config`, and handles catch-up after a restart. A websocket API, admin only, connects all of this to the card.
- **Card.** The card bundle ships inside the integration, the same way ha-shabbat-scheduler does it.
- **The backend owns parsing and validation.** The card asks it for previews, so what you queue is exactly what you saw in the readback.

**Tech Stack:**
- Backend: Python 3.14 with `uv`, Home Assistant 2026.9, pytest, pytest-homeassistant-custom-component, freezegun (`freezer` fixture).
- Card: Lit 3 + TypeScript, built with rollup, tested with vitest + happy-dom.
- e2e: playwright against a dev Home Assistant in docker.

**Spec:** `docs/superpowers/specs/2026-11-07-sequence-scheduler-design.md`. Read it before starting any task.

**Sibling project used as reference:** `~/ha-shabbat-scheduler`. Wherever a task says "copy from shabbat", copy that file's approach and add a one-line comment naming the origin, e.g. `# Adapted from ha-shabbat-scheduler <file>`. Do not import from it.

## Global Constraints

- Domain `sequence_scheduler`. Display name "Sequence Scheduler". Repo `elazarcoh/ha-sequence-scheduler`, private.
- `requires-python = ">=3.14.2"`. `hacs.json` sets `"homeassistant": "2026.9.0"`. The dev container image is `ghcr.io/home-assistant/home-assistant:2026.9.0`, `TZ: Asia/Jerusalem`, port `8125`. 8124 is taken by shabbat's dev container.
- Copy pyproject's pytest settings verbatim from shabbat: `asyncio_mode=auto`, `addopts="-p no:aiohttp"`, `timeout=60`, `timeout_method="signal"`, `testpaths=["tests","e2e"]`. Copy the dev dependency list with its comments.
- Version `0.1.0`, kept in sync in `manifest.json`, `CARD_VERSION` in `frontend.py`, and `frontend/src/version.ts`. A test enforces this.
- Admin only: every websocket command uses `@websocket_api.require_admin`.
- Grace window: config entry option `grace_minutes`, default `10`, range 1–120. Starts and ends follow the same rule.
- Retries: `RETRY_ATTEMPTS = 3`, `RETRY_DELAY_SECONDS = 30` (same values as shabbat).
- Time: steps are stored as tz-aware UTC datetimes. Wall-clock input is interpreted in `dt_util.get_default_time_zone()`.
- Template keys are compared with `str.casefold()`. Select values are compared case-insensitively, and the stored value uses the option's canonical spelling.
- Card strings are English only, collected in `frontend/src/strings.ts`. User content such as Hebrew names is shown as typed, with `dir="auto"` on every text element that displays user content.
- Storage keys: `sequence_scheduler.templates` and `sequence_scheduler.queue`. Both start at `STORAGE_VERSION = 1`, and both refuse to load a version they don't know (same pattern as shabbat `_MigratingStore`).

## Review Focus

1. **Crossing midnight between preview and queue.** You preview at 23:59 and press Queue at 00:01. The queue call reuses the preview's `now`, so the times you saw don't move. A step whose time is already in the past when you queue is refused for that line (`already_past`). It is never run immediately and never moved to tomorrow. *Test owned by Task 7.*
2. **Daylight saving changes.** Israel's DST ends on the last Sunday of October, when 01:00–02:00 happens twice. `01:30` resolves to the first occurrence after `now`. Durations are real elapsed time, so `1h` means 60 minutes even across the change. *Test owned by Task 3.*
3. **A device is unavailable when its step fires** (the AC is offline). That action fails after its retries and the failure is logged. The step's other actions still run, and the block's end stays scheduled. *Test owned by Task 5.*
4. **Hebrew or mixed-case input.** `מזגן 01:00 1h 25 Silent` matches a template with key `מזגן` and a select option `silent`. The card shows Hebrew names right-to-left without scrambling the time column. *Tests owned by Task 3 (parse) and Task 4 (select casing).*
5. **A template edited or deleted while its blocks are queued.** The queued blocks run with their frozen actions, and the queue view still shows the stored template name. *Test owned by Task 5.*

---

## File map

```
custom_components/sequence_scheduler/
  __init__.py        setup/unload; wires stores, engine, websocket, frontend, logbook
  manifest.json  const.py  config_flow.py  strings.json  translations/en.json
  models.py          dataclasses (Action, Placeholder, Template, Step, Block) + to/from dict
  template_schema.py validate_template(raw) -> Template
  store.py           TemplateStore, QueueStore
  parse.py           text -> ParsedLine | LineError; durations; next_occurrence
  preview.py         ParsedLine + templates + hass -> PreviewRow; token; rows_to_blocks
  engine.py          SequenceEngine: schedule, run, retry, catch-up, cancel
  logbook.py         describes the two events
  websocket_api.py   admin-only commands
  frontend.py        serve + register card (copied from shabbat)
  www/sequence-scheduler-card.js   committed bundle
frontend/ src/{card,api,types,strings,version,hints,queue-entry,queue-list,template-list,template-dialog,placeholder-editor,target-editor,service-editor,kinds}.ts, test/*.test.ts
tests/  one test_<module>.py per module, plus conftest.py
e2e/    conftest.py (copied from shabbat, port 8125), test_card_e2e.py
dev/    docker-compose.yml, seed.py
```

---

### Task 1: Scaffold + config flow

**Files:**
- Create: `pyproject.toml`, `hacs.json`, `.gitignore` (ignore `node_modules/`, `__pycache__/`, `.venv/`, `dev/config/`, `.superpowers/`).
- Create: `custom_components/sequence_scheduler/{__init__.py,manifest.json,const.py,config_flow.py,strings.json,translations/en.json}`.
- Test: `tests/conftest.py`, `tests/test_config_flow.py`, `tests/test_packaging.py`.

**Interfaces:**
- Produces:
  - `const.DOMAIN = "sequence_scheduler"`, `CONF_GRACE_MINUTES = "grace_minutes"`, `DEFAULT_GRACE_MINUTES = 10`, `RETRY_ATTEMPTS`, `RETRY_DELAY_SECONDS`.
  - `EVENT_STEP_DUE = "sequence_scheduler_step_due"`, `EVENT_STEP_RESULT = "sequence_scheduler_step_result"`, `SIGNAL_QUEUE_CHANGED = "sequence_scheduler_queue_changed"`.
  - `tests/conftest.py` fixtures `setup_integration(hass) -> MockConfigEntry` (sets up `lovelace`, adds and sets up the entry, blocks till done) and `auto_enable_custom_integrations` (autouse).
- `manifest.json`: `config_flow: true`, `dependencies: ["http","lovelace","logbook"]`, `iot_class: "local_push"`, `requirements: []`, `version: "0.1.0"`, `single_config_entry: true`.

- [ ] **Step 1:** Write the tests:
  - `test_user_flow_creates_entry`: an empty form creates an entry titled "Sequence Scheduler".
  - `test_second_entry_aborts`: aborts with reason `single_instance_allowed`.
  - `test_options_flow_sets_grace`: setting 15 saves `entry.options["grace_minutes"] == 15`. Values 0 and 121 are rejected by the schema.
  - `test_pytest_timeout_registered`: copy from shabbat `tests/test_packaging.py`.
- [ ] **Step 2:** Run `uv sync && uv run pytest tests/test_config_flow.py -v`. Expect FAIL (module not found).
- [ ] **Step 3:** Implement the config flow. The user step takes no input. Use `OptionsFlowWithReload`, with `grace_minutes` as a `NumberSelector` (min 1, max 120, mode box, unit "min"). `async_setup_entry` and `async_unload_entry` return True for now.
- [ ] **Step 4:** Run `uv run pytest -v`. Expect PASS (e2e skipped).
- [ ] **Step 5:** Commit `chore: scaffold integration and config flow`.

---

### Task 2: Models, template validation, stores

**Files:**
- Create: `models.py`, `template_schema.py`, `store.py`.
- Test: `tests/test_models.py`, `tests/test_template_schema.py`, `tests/test_store.py`.

**Interfaces:**
- Produces, in `models.py`. All classes are dataclasses, and each has `to_dict()` and `@classmethod from_dict(d)`. Datetimes are serialized as ISO-8601 UTC strings.
  ```python
  Kind = Literal["number", "percent", "select", "text"]
  @dataclass(frozen=True) class Action: action: str; target: dict; data: dict
  @dataclass(frozen=True) class Placeholder:
      key: str; field: str; kind: Kind; default: Any
      min: float | None = None; max: float | None = None
      options: tuple[str, ...] | None = None   # static options; None for select = read from entities
  @dataclass(frozen=True) class Template:
      id: str; key: str; name: str
      start: tuple[Action, ...]; end: tuple[Action, ...]; placeholders: tuple[Placeholder, ...]
  StepState = Literal["pending", "in_progress"]
  @dataclass class Step: id: str; phase: Literal["start", "end"]; at: datetime; actions: list[Action]; state: StepState = "pending"
  @dataclass class Block: id: str; line: str; template_name: str; values: dict; entity_ids: list[str]; created_at: datetime; steps: list[Step]
  ```
- Produces, in `template_schema.py`:
  - `class TemplateError(Exception)` with attributes `code: str` and `detail: str`.
  - `validate_template(raw: dict) -> Template`. `raw` has the shape of `Template.to_dict()`. A missing `id` gets a new `uuid4().hex`.
  - Error codes:
    - `empty_key`: key is empty or contains whitespace.
    - `empty_start`
    - `duplicate_placeholder`
    - `unbound_placeholder`: the field doesn't appear in the data of any start or end action.
    - `bad_default`: the default isn't valid for its kind.
    - `bad_kind`
- **Binding rule.** This is the planner's call: a placeholder sets `data[field]` in every start and end action whose `data` already contains `field`.
- Produces, in `store.py`:
  ```python
  class TemplateStore:
      def __init__(self, hass): ...
      async def async_load(self) -> None
      @property templates -> list[Template]
      def get_by_key(self, key: str) -> Template | None          # casefold
      async def async_save(self, template: Template) -> Template # TemplateError("duplicate_key") if another id has the same casefolded key
      async def async_delete(self, template_id: str) -> None     # KeyError if missing
  class QueueStore:
      def __init__(self, hass): ...
      async def async_load(self) -> None
      @property blocks -> list[Block]                             # sorted by first step's `at`
      def get(self, block_id: str) -> Block | None
      async def async_add(self, blocks: list[Block]) -> None
      async def async_set_state(self, block_id: str, step_id: str, state: StepState) -> None
      async def async_remove_step(self, block_id: str, step_id: str) -> None  # removes the block when its last step goes
      async def async_remove_block(self, block_id: str) -> None
  ```
  Every `QueueStore` mutation awaits `self._store.async_save(...)` before returning. Use a direct save, not a delayed save, so the in-progress marker reaches disk before an action is called. Every mutation also sends `SIGNAL_QUEUE_CHANGED`.

- [ ] **Step 1:** Write the tests:
  - `test_template_roundtrip`: `Template.from_dict(t.to_dict()) == t`.
  - `test_block_roundtrip_keeps_utc`.
  - `test_validate_rejects_*`: one test per error code.
  - `test_validate_accepts_start_only_template`: `end=()`.
  - `test_template_store_duplicate_key_casefold`: saving `"Kids"` after `"kids"` raises `duplicate_key`.
  - `test_get_by_key_hebrew`: `get_by_key("מזגן")` finds it.
  - `test_queue_store_persists_across_reload`, using `flush_store` and then a fresh `QueueStore`.
  - `test_remove_last_step_removes_block`.
  - `test_unknown_storage_version_refuses`.
- [ ] **Step 2:** Run `uv run pytest tests/test_models.py tests/test_template_schema.py tests/test_store.py -v`. Expect FAIL.
- [ ] **Step 3:** Implement the three modules.
- [ ] **Step 4:** Run the same command. Expect PASS.
- [ ] **Step 5:** Commit `feat: models, template validation and stores`.

---

### Task 3: Line parser and time resolution

**Files:**
- Create: `parse.py`.
- Test: `tests/test_parse.py`.

**Interfaces:**
- Produces:
  ```python
  @dataclass(frozen=True) class ParsedLine:
      lineno: int; raw: str; key: str; hour: int; minute: int
      duration: timedelta | None; positional: tuple[str, ...]; named: dict[str, str]
  @dataclass(frozen=True) class LineError: lineno: int; raw: str; code: str; detail: str
  def parse_text(text: str) -> list[ParsedLine | LineError]   # skips blank lines and lines starting with '#'; lineno is 1-based over the original text
  def parse_duration(token: str) -> timedelta | None           # None = not a duration token
  def next_occurrence(hour: int, minute: int, now: datetime) -> datetime  # returns tz-aware UTC
  ```
- Grammar:
  - Tokens are split on whitespace.
  - Token 1 is the key.
  - Token 2 must match `^([01]?\d|2[0-3]):[0-5]\d$`. Otherwise the error is `bad_time`, or `missing_time` if there is no token 2.
  - Token 3 is a duration if it matches one of these, with the hours part allowing decimals: `^\d+(\.\d+)?h$`, `^\d+m$`, `^\d+h\d{1,2}m?$`. A zero duration is `bad_duration`.
  - Every remaining token containing `=` is named (`key=value`, split on the first `=`). Every other token is positional, in order.
  - A positional token after any named token is `positional_after_named`.
- `next_occurrence`:
  - Convert `now` to the default zone.
  - Build today's wall time with `dt_util` in that zone.
  - If it is `<= now`, use tomorrow's.
  - Return it as UTC.
  - For an ambiguous wall time (DST fall-back), pick the earliest instant after `now`.

- [ ] **Step 1:** Write the tests:
  - `test_basic_line`: `kids 01:00 1h 25` gives key, 1:00, 1h, `("25",)`.
  - `test_durations`: `1h`=60m, `1.5h`=90m, `90m`, `1h30`=90m, `1h30m`=90m, `0m` gives `bad_duration`.
  - `test_named_and_positional`: `salon 13:00 2h fan=low` and `kids 01:00 25 fan=silent`.
  - `test_positional_after_named_errors`.
  - `test_bad_and_missing_time`: `25:00`, `1:5`, `kids`.
  - `test_comments_and_blank_lines_keep_line_numbers`.
  - `test_hebrew_key`: `מזגן 01:00 1h 25 Silent` gives key `מזגן`, positional `("25","Silent")`.
  - `test_next_occurrence_tonight_vs_tomorrow`: at 22:30 local, 01:00 gives tomorrow and 23:00 gives today. At exactly 01:00, 01:00 gives tomorrow.
  - `test_next_occurrence_dst_fallback` (Review Focus 2): with `freezer` at 2026-10-25 00:30 Asia/Jerusalem, `01:30` gives the first 01:30, which is +03:00. `next + 1h` is 60 real minutes later.
- [ ] **Step 2:** Run `uv run pytest tests/test_parse.py -v`. Expect FAIL.
- [ ] **Step 3:** Implement `parse.py`.
- [ ] **Step 4:** Run the same command. Expect PASS.
- [ ] **Step 5:** Commit `feat: line parser and time resolution`.

---

### Task 4: Preview (resolve lines against templates and devices)

**Files:**
- Create: `preview.py`.
- Test: `tests/test_preview.py`.

**Interfaces:**
- Consumes: `parse_text` and `next_occurrence` (Task 3), `TemplateStore` and `QueueStore` (Task 2), models.
- Produces:
  ```python
  @dataclass(frozen=True) class Issue: code: str; detail: str
  @dataclass class PreviewRow:
      lineno: int; raw: str; ok: bool; errors: list[Issue]; warnings: list[Issue]
      template_id: str | None; template_name: str | None; values: dict
      start_at: datetime | None; end_at: datetime | None; entity_ids: list[str]
      start_actions: list[Action]; end_actions: list[Action]
      def to_dict(self) -> dict
  def build_preview(hass, templates: TemplateStore, queue: QueueStore, text: str, now: datetime) -> list[PreviewRow]
  def select_options(hass, placeholder: Placeholder, entity_ids: list[str]) -> list[str] | None
  def preview_token(rows: list[PreviewRow]) -> str
  def rows_to_blocks(rows: list[PreviewRow], created_at: datetime) -> list[Block]
  ```
- `preview_token` is the sha256 hex digest of the canonical JSON of the ok rows' `to_dict()`, with sorted keys.
- `rows_to_blocks` only uses the ok rows. Each gives one start step and one end step, or just a start step when `end_at` is None.
- **Entity expansion.** Use `homeassistant.helpers.target` the same way shabbat `websocket_api._resolver` does: read its docstring and copy the approach. Take the union over all start and end actions, sorted.
- **Option intersection.** `select_options` returns:
  1. the placeholder's static `options` if they are set;
  2. otherwise, the intersection of each entity's `state.attributes[f"{field}s"]` over every entity that has that attribute, in the first entity's order;
  3. `None` if no entity has the attribute, which means any text is accepted.
- **Value rules.** Resolution order: positional values by placeholder order, then named values by key (casefold), then the defaults.
  - `number` uses `float`, stored as `int` when it is integral, and is checked against min and max.
  - `percent` accepts `40` or `40%`, stored as an `int` from 0 to 100.
  - `select` matches options case-insensitively and stores the canonical spelling.
  - `text` is stored as given.
- **Error codes:**
  - From parsing: the `LineError` code.
  - `unknown_template`
  - `too_many_values`
  - `unknown_placeholder`: a named key that doesn't exist.
  - `bad_value`: the detail names the placeholder and the expected value.
  - `not_an_option`: the detail lists the valid options.
  - `duration_without_end`
  - `no_entities`: the target expands to nothing.
  - `already_past`: `start_at <= now`. This can only happen when `now` was supplied by the client, in Task 7.
- **Warning codes:**
  - `no_duration`: the template has an end but the line gave no duration, so `end_at` is None and only the start is queued.
  - `far_future`: `start_at - now > 12h`.
  - `overlap`: the block's interval shares an entity with another ok row, or with an existing queued block. A block's interval is `[start_at, end_at)`. A start-only block counts as the instant `start_at`. The detail names the other line or block.

- [ ] **Step 1:** Write the tests. Use states set with `hass.states.async_set`:
  - `climate.kids` with `fan_modes: ["auto","quiet","silent","high"]`.
  - `climate.salon` with `fan_modes: ["auto","quiet","high"]`.
  - `light.kitchen`.
  - `switch.heater`.

  Use these templates:
  - `kids` and `salon`: `climate.set_temperature`, data `{hvac_mode: cool, temperature: 26, fan_mode: silent|quiet}`, end `climate.turn_off`, placeholders `temp` (number, field `temperature`, 16–30) and `fan` (select, field `fan_mode`, options None).
  - `kitchen`: `light.turn_on` `{brightness_pct: 100}` with percent placeholder `bright`.
  - `heater`: switch on and off, no placeholders.
  - `boiler`: start only.

  The tests:
  - `test_spec_example_lines`: the six spec example lines, at now = 22:30. Expect five ok rows, plus `salon … fan=low` with error `not_an_option` whose detail mentions `auto, quiet, high`. Expect `kids 01:00 1h 25` to give start 01:00 tomorrow, end 02:00, values `{temp: 25, fan: "silent"}`, and start action data `temperature == 25`.
  - `test_select_case_insensitive` (Review Focus 4): `Silent` stores `silent`.
  - `test_percent_accepts_suffix`: `40%` and `40` both give 40. `140` gives `bad_value`.
  - `test_option_intersection_two_entities`: a template targeting both ACs only offers `auto, quiet, high`.
  - `test_duration_on_start_only_errors` and `test_missing_duration_warns`.
  - `test_far_future_warns`: at 06:00, `05:00` warns.
  - `test_overlap_within_text_and_with_queue`.
  - `test_unknown_template`, `test_too_many_values`, `test_unknown_named`.
  - `test_token_stable_and_sensitive`: the same input gives the same token. A different value changes it.
  - `test_rows_to_blocks_skips_errors_and_start_only_has_one_step`.
- [ ] **Step 2:** Run `uv run pytest tests/test_preview.py -v`. Expect FAIL.
- [ ] **Step 3:** Implement `preview.py`.
- [ ] **Step 4:** Run the same command. Expect PASS.
- [ ] **Step 5:** Commit `feat: preview resolves lines against templates and devices`.

---

### Task 5: Engine (scheduling, execution, retries, catch-up, cancel)

**Files:**
- Create: `engine.py`.
- Modify: `__init__.py`. Setup loads both stores, creates the engine with `grace=timedelta(minutes=option)`, and calls `await engine.async_start()` inside `async_at_started`. Unload calls `async_stop`.
- Test: `tests/test_engine.py`.

**Interfaces:**
- Consumes: `QueueStore`, `Block`, `Step`, `Action`, constants.
- Produces:
  ```python
  class SequenceEngine:
      def __init__(self, hass, queue: QueueStore, grace: timedelta): ...
      async def async_start(self) -> None        # catch-up, then arm a timer per pending step
      async def async_stop(self) -> None         # cancel timers
      async def async_enqueue(self, blocks: list[Block]) -> None   # persist + arm
      async def async_cancel(self, block_id: str, run_end: bool) -> None  # KeyError if unknown
  ```
  `hass.data[DOMAIN][entry_id]` becomes the dict `{"templates": TemplateStore, "queue": QueueStore, "engine": SequenceEngine}`.

**Running a step.** This order is the core of anti-goals 1 and 2:
1. `async_set_state(..., "in_progress")`. This is persisted.
2. Fire `EVENT_STEP_DUE` with `{block_id, step_id, phase, template_name, values, entity_ids}`. Keep its `context`.
3. Run each action in order with `async_call_from_config(hass, {"action":…, "target":…, "data":…}, blocking=True, context=Context(parent_id=due_context.id))`. An exception is retried up to `RETRY_ATTEMPTS` times, `RETRY_DELAY_SECONDS` apart. An action that fails all its attempts is recorded, and the remaining actions still run.
4. `async_remove_step`.
5. Fire `EVENT_STEP_RESULT` with the step-due payload plus `outcome` (`"ran"`, or `"failed"` if any action failed) and `detail` (the error strings).

Use a per-step guard: a set of step ids currently running. A step id in the set is never started twice, which keeps the catch-up path and the timer path from both running it.

**Catch-up in `async_start`.** Process steps in order of `at`.
- **An in-progress step** was interrupted by a crash.
  - If it's an end, re-run it.
  - If it's a start, remove it and fire a result with `outcome="skipped_maybe_ran"`.
- **A pending step with `at <= now`:**
  - If `now - at <= grace`, run it.
  - Otherwise remove it and fire `outcome="skipped"` with detail `"overdue by <N> min"`.
- **A pending step in the future:** arm a timer for it.

**Cancel.**
- Remove the block's timers.
- If `run_end` is set, the block's start is already gone (so it ran), and an end is pending, run the end now through the normal path.
- Then call `async_remove_block` and fire `outcome="cancelled"` for each step that didn't run.

- [ ] **Step 1:** Write the tests. Use `freezer`, `async_fire_time_changed`, and `async_mock_service` for `climate.set_temperature`, `climate.turn_off` and `switch.turn_on`. Patch `RETRY_DELAY_SECONDS` to 0 in the engine module, as shabbat does.
  - `test_step_runs_once_at_time`: nothing before 01:00. At 01:00 exactly one call with the frozen data. The step is removed from the store.
  - `test_end_runs_even_if_device_already_off`: set state `off`, and the turn_off call still happens.
  - `test_block_removed_after_last_step`.
  - `test_failing_action_does_not_stop_others_or_end` (Review Focus 3): the first action raises every time and the second succeeds. Expect 3 attempts, the second action called, `outcome="failed"`, and the end still armed and run.
  - `test_catch_up_within_grace_runs_in_order`: the start is due 5 min ago and the end 1 min ago. Both run, start first.
  - `test_catch_up_past_grace_skips_both`: the end is due 40 min ago with grace 10. Expect no call and a `skipped` result. This is the user's decision, not a bug.
  - `test_in_progress_end_reruns_start_does_not`.
  - `test_no_double_run_catch_up_vs_timer`: a step due exactly at startup runs once.
  - `test_queued_block_survives_template_delete` (Review Focus 5): queue a block, delete its template from `TemplateStore`, advance time, and the call happens with the frozen data.
  - `test_cancel_running_block_with_and_without_run_end`.
  - `test_reload_rearms_timers`: unload, set up again, advance time, and the step runs.
- [ ] **Step 2:** Run `uv run pytest tests/test_engine.py -v`. Expect FAIL.
- [ ] **Step 3:** Implement `engine.py` and the `__init__.py` wiring.
- [ ] **Step 4:** Run `uv run pytest -v`. Expect PASS.
- [ ] **Step 5:** Commit `feat: engine runs one-off steps with catch-up and cancel`.

---

### Task 6: Logbook

**Files:**
- Create: `logbook.py`.
- Test: `tests/test_logbook.py`.

**Interfaces:**
- Produces: `async_describe_events(hass, async_describe_event)`, describing `EVENT_STEP_DUE` and `EVENT_STEP_RESULT`.
- Copy the defensive style from shabbat `logbook.py`, including its header comment about why there are two events. Every read uses `.get`, and a describer must never raise.
- Messages, exactly:
  - Step due: `"<template_name> <start|end> due"`.
  - Step result:
    - `ran` gives `"<template_name> <phase> ran (<values>)"`.
    - `failed` gives `"… failed: <detail>"`.
    - `skipped` gives `"… skipped: <detail>"`.
    - `skipped_maybe_ran` gives `"… not re-run after restart (may already have run)"`.
    - `cancelled` gives `"… cancelled"`.
  - `<values>` is `k=v` joined by `", "`. Leave out the parentheses when there are no values.
- Name: `"Sequence Scheduler"`.

- [ ] **Step 1:** Write the tests:
  - `test_describes_each_outcome`: one assertion per message above.
  - `test_describer_survives_missing_fields`: an event with `{}` data returns a message without raising.
  - `test_device_change_attributed`: an end step's `turn_off` produces a state change whose `context.parent_id` equals the step-due event's context id.
- [ ] **Step 2:** Run `uv run pytest tests/test_logbook.py -v`. Expect FAIL.
- [ ] **Step 3:** Implement `logbook.py`.
- [ ] **Step 4:** Run the same command. Expect PASS.
- [ ] **Step 5:** Commit `feat: logbook entries for steps`.

---

### Task 7: Websocket API

**Files:**
- Create: `websocket_api.py`.
- Modify: `__init__.py` to register it.
- Test: `tests/test_websocket.py`.

**Interfaces:**
- Consumes: the stores, `build_preview`, `preview_token`, `rows_to_blocks`, `SequenceEngine`, and `validate_template`.
- Produces the commands below. Every command uses `@websocket_api.require_admin` and `@websocket_api.async_response`. Datetimes are ISO strings.

| type | payload | result |
|---|---|---|
| `sequence_scheduler/templates/list` | – | `{templates: [Template.to_dict() + {"placeholders":[…, "resolved_options": list[str] \| None]}]}`, where `resolved_options` comes from `select_options` against the template's expanded entities |
| `sequence_scheduler/templates/save` | `{template: dict}` | `{template}`; error code `template_invalid` carrying the `TemplateError` code and detail |
| `sequence_scheduler/templates/delete` | `{template_id}` | `{}`; error `not_found` |
| `sequence_scheduler/preview` | `{text}` | `{now, rows: [PreviewRow.to_dict()], token}` |
| `sequence_scheduler/queue` | `{text, now, token}` | `{queued: int}`; error `preview_changed` if the re-preview with the given `now` gives a different token |
| `sequence_scheduler/queue/list` | – | `{blocks: [Block.to_dict()]}` |
| `sequence_scheduler/queue/cancel` | `{block_id, run_end: bool}` | `{}`; error `not_found` |
| `sequence_scheduler/queue/subscribe` | – | subscription. Sends `{blocks}` immediately and again on every `SIGNAL_QUEUE_CHANGED` |

**Queue rule.**
1. Re-preview with the client's `now`. Reject a `now` more than 10 minutes in the past, or in the future, with error `stale_preview`.
2. Compare tokens.
3. Then re-check `already_past` against the real current time for each ok row (Review Focus 1). Rows that are now past become errors and are not queued.
4. If no rows remain, return `{queued: 0}` with error `nothing_to_queue`.

- [ ] **Step 1:** Write the tests, using `hass_ws_client` and `hass_admin_user`. Use `hass_read_only_access_token` for the non-admin case.
  - `test_non_admin_rejected_for_every_command`: loop over all types, expect `unauthorized`.
  - `test_template_crud`.
  - `test_preview_then_queue_roundtrip`: `queued == 2` and `queue/list` shows the blocks.
  - `test_queue_refuses_changed_preview`: preview, then edit the template default, then queue gives `preview_changed`.
  - `test_midnight_crossing_already_past` (Review Focus 1): preview at 23:59 with the line `x 00:00 1h`, move the clock to 00:01, then queue. Expect `nothing_to_queue` and no step stored.
  - `test_subscribe_pushes_on_change`.
  - `test_cancel_not_found`.
- [ ] **Step 2:** Run `uv run pytest tests/test_websocket.py -v`. Expect FAIL.
- [ ] **Step 3:** Implement the commands and register them in setup.
- [ ] **Step 4:** Run `uv run pytest -v`. Expect PASS.
- [ ] **Step 5:** Commit `feat: admin-only websocket API`.

---

### Task 8: Card scaffold + serving

**Files:**
- Create: `frontend/{package.json,tsconfig.json,rollup.config.js,vitest.config.ts,bundle-manifest.mjs}`. Copy these from shabbat, changing names and the output path to `custom_components/sequence_scheduler/www/sequence-scheduler-card.js`.
- Create: `frontend/src/{card.ts,api.ts,types.ts,strings.ts,version.ts}`.
- Create: `custom_components/sequence_scheduler/frontend.py`, copied from shabbat with `CARD_FILENAME = "sequence-scheduler-card.js"`.
- Modify: `__init__.py`, registering the frontend at setup and unregistering it at unload.
- Test: `tests/test_frontend.py`, copied from shabbat: registration, version sync across the three files, and the bundle matching its sources. Also `frontend/test/version.test.ts`.

**Interfaces:**
- `types.ts` mirrors the Python `to_dict` shapes: `Template`, `Placeholder` (+`resolved_options`), `PreviewRow`, `Issue`, `Block`, `Step`.
- `api.ts` provides `class Api { constructor(hass); listTemplates(); saveTemplate(t); deleteTemplate(id); preview(text): Promise<{now:string; rows:PreviewRow[]; token:string}>; queue(text, now, token): Promise<{queued:number}>; cancel(blockId, runEnd); subscribeQueue(cb: (blocks: Block[]) => void): Promise<() => void> }`. It uses `hass.callWS` and `hass.connection.subscribeMessage`.
- `card.ts` is `<sequence-scheduler-card>` with two tabs, "Queue" and "Templates". It renders `<queue-entry>` and `<queue-list>` on the first tab and `<template-list>` on the second. For now these are empty placeholder elements; later tasks fill them in. Register it in `window.customCards`.

- [ ] **Step 1:** Write `tests/test_frontend.py` (copy and adapt) and `version.test.ts`.
- [ ] **Step 2:** Run `uv run pytest tests/test_frontend.py -v`. Expect FAIL.
- [ ] **Step 3:** Implement. Run `cd frontend && npm install && npm run build`.
- [ ] **Step 4:** Run `uv run pytest -v && (cd frontend && npm test && npm run typecheck)`. Expect PASS.
- [ ] **Step 5:** Commit `feat: card scaffold served by the integration` (including the built bundle).

---

### Task 9: Queue entry: text box, hints, readback

**Files:**
- Create: `frontend/src/hints.ts`, `frontend/src/queue-entry.ts`.
- Test: `frontend/test/hints.test.ts`, `frontend/test/queue-entry.test.ts`.

**Interfaces:**
- Consumes: `Api`, `Template`, `PreviewRow`.
- Produces: `hintFor(line: string, templates: Template[]): string | null`, a pure function that looks at the line being edited.
  - With no space typed yet: template keys starting with the typed prefix (casefold), e.g. `"kids · kitchen"`.
  - After the key and time, and an optional duration-shaped token: the remaining placeholders as `"temp (26) · fan (silent: auto / quiet / silent / high)"`. Options come from `resolved_options ?? options`. Placeholders already given by position or by name are left out.
  - For an unknown key: `"unknown template"`.
  - Otherwise `null`.

**`<queue-entry>` behaviour:**
- **The text box** is a `<textarea dir="auto">` with a monospace font.
- **The hint line** sits under it. It is computed for the line the cursor is on.
- **Preview requests** go out 300 ms after you stop typing, and only the latest response is kept.
- **The readback list** has one row per preview row:
  - The time range: `HH:MM–HH:MM`, or just `HH:MM`, plus a `today`/`tomorrow` label computed from `start_at` against `now` in the HA time zone (`hass.config.time_zone`).
  - The template name, with `dir="auto"`.
  - The values.
  - A ✓, or the red error details, or the amber warning details.
  - The time column is a separate, `dir="ltr"` element, so Hebrew names don't reorder it (Review Focus 4).
- **The Queue button** is labelled `Queue N` or `Queue N · fix M`, and is disabled when N is 0. It sends the `text`, `now` and `token` from the last preview.
  - On success it clears the text box and shows `Queued N`.
  - On `preview_changed` it previews again and shows `Something changed. Check the list and queue again.`

- [ ] **Step 1:** Write the tests:
  - `hintFor` cases: prefix completion, the full placeholder hint, a positional value removing `temp`, `fan=` named removing `fan`, Hebrew key, unknown key.
  - queue-entry, using a fake `Api` and fake timers:
    - typing triggers exactly one preview after 300 ms;
    - the button label shows `Queue 5 · fix 1` for the spec example fixture;
    - queue sends the last preview's token;
    - `preview_changed` triggers a re-preview and shows the message.
- [ ] **Step 2:** Run `cd frontend && npx vitest run test/hints.test.ts test/queue-entry.test.ts`. Expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm test && npm run typecheck && npm run build`. Expect PASS. Then `uv run pytest tests/test_frontend.py`. Expect PASS.
- [ ] **Step 5:** Commit `feat: text entry with hints and readback`.

---

### Task 10: Queue list + cancel

**Files:**
- Create: `frontend/src/queue-list.ts`.
- Test: `frontend/test/queue-list.test.ts`.

**Interfaces:**
- Consumes: `Api.subscribeQueue` and `Api.cancel`.

**Behaviour:**
- **A row per block**, ordered by its first remaining step. Each row shows:
  - the block's `line`;
  - its `template_name` (`dir="auto"`);
  - the remaining steps, e.g. `on 01:00 · off 02:00`. A step marked in progress shows "running".
  - a Cancel button.
- **Cancelling** a block whose start is gone and whose end is pending opens a dialog: `Turn it off now?` with the buttons `Run the end now`, `Just cancel` and `Keep it`, mapping to `run_end` true, false, or no call. Otherwise the block is cancelled straight away with `run_end=false`.
- **Empty state:** `Nothing queued.`
- **Unsubscribe** when the element is disconnected.

- [ ] **Step 1:** Write the tests:
  - renders blocks from a subscription push;
  - cancel on a not-started block calls `cancel(id, false)` with no dialog;
  - cancel on a running block shows the dialog, and each button maps as above;
  - disconnecting unsubscribes.
- [ ] **Step 2:** Run `npx vitest run test/queue-list.test.ts`. Expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm test && npm run typecheck && npm run build`. Expect PASS.
- [ ] **Step 5:** Commit `feat: queue list with cancel`.

---

### Task 11: Template editor

**Files:**
- Create, copied from shabbat with the element names changed:
  - `frontend/src/target-editor.ts`
  - `frontend/src/service-editor.ts`. Keep the entire header comment, and keep the hidden target row.
- Create: `frontend/src/kinds.ts`, `frontend/src/placeholder-editor.ts`, `frontend/src/template-dialog.ts`, `frontend/src/template-list.ts`.
- Test: `frontend/test/{kinds,placeholder-editor,template-dialog,template-list}.test.ts`, plus the copied editors' tests, adapted.

**Interfaces:**
- Produces: `kindFor(hass, action: string, field: string): {kind: Kind; min?: number; max?: number; options?: string[]}`. It reads `hass.services[domain][service].fields[field].selector`:
  - `number` gives `number` with min and max. If the field name ends in `_pct`, it gives `percent` instead.
  - `select` gives `select` with options taken from the selector, as strings or `{value}`.
  - A field named `<x>_mode` with no static options gives `select` with no options. The backend reads `<x>_modes` from the entities instead.
  - Anything else gives `text`.

**`<template-dialog>`:**
- **Fields:** short name (key), display name.
- **Start section:** a list of actions. Each action has its own target editor and service editor, so a single start can be "light on" plus "plug on". Actions can be added and removed. A new action starts with the previous action's target copied in, so a three-step AC start only needs the AC picked once.
- **End section:** the same, plus a "No end (start only)" toggle.
- **Placeholders section (`<placeholder-editor>`):**
  - Rows of key, field, kind and default.
  - The field dropdown lists the data keys currently set in any start or end action.
  - Choosing a field fills in `kind`, `min`, `max` and `options` from `kindFor`, and fills the default from the action's current value.
- **Save** calls `api.saveTemplate`, and shows a `template_invalid` error inline next to the field it concerns.

**`<template-list>`:**
- Each row shows the key, name and `start → end` summary, with Edit and Delete buttons.
- An "Add template" button opens the dialog.
- Deleting asks `Delete "<name>"? Already queued plans keep running.`

- [ ] **Step 1:** Write the tests:
  - `kindFor` against a fixture `hass.services` with `climate.set_temperature` (temperature is a number selector 7–35, `hvac_mode` is a select, `fan_mode` has no options) and `light.turn_on` (`brightness_pct` 0–100). Expect `temperature` gives number 7–35, `brightness_pct` gives percent, `fan_mode` gives select with no options, and `hvac_mode` gives select with options.
  - placeholder-editor: picking `temperature` sets kind and default 26.
  - template-dialog: save sends the expected `Template` dict for the kids example. The "No end" toggle sends `end: []`. A server error is shown.
  - template-list: delete confirmation text.
- [ ] **Step 2:** Run `npx vitest run test/kinds.test.ts test/placeholder-editor.test.ts test/template-dialog.test.ts test/template-list.test.ts`. Expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm test && npm run typecheck && npm run build && cd .. && uv run pytest tests/test_frontend.py`. Expect PASS.
- [ ] **Step 5:** Commit `feat: template editor`.

---

### Task 12: Dev Home Assistant, e2e, README, push

**Files:**
- Create: `dev/docker-compose.yml`, copied from shabbat with image `2026.9.0`, container name `sequence-scheduler-dev`, port `0.0.0.0:8125:8123`, and the mount `../custom_components/sequence_scheduler`.
- Create: `dev/seed.py`, copied from shabbat's approach. It onboards, adds the integration, creates `input_*`-backed demo entities or template climate/light/switch entities so the example templates have targets, adds a dashboard with the card, and prints a token on its last line.
- Create: `e2e/conftest.py`, copied with `BASE` set to port 8125.
- Create: `e2e/test_card_e2e.py`, `README.md`.

- [ ] **Step 1:** Write `e2e/test_card_e2e.py`, using playwright against the seeded instance:
  - `test_template_then_queue_then_cancel`: create the `kids` template through the dialog; type `kids 01:00 1h 25` and wait for the readback row `01:00–02:00`; press Queue; see the block in the list; cancel it; see `Nothing queued.`
  - `test_hint_visible_while_typing`.
- [ ] **Step 2:** Run `docker compose -f dev/docker-compose.yml up -d && uv run python dev/seed.py` (retry until it prints a token). Then run `HA_DEV_TOKEN=<token> uv run pytest e2e -v`. Expect FAIL until the seeding and selectors line up, then PASS.
- [ ] **Step 3:** Write the README. Cover what it is, installing through HACS as a custom repository, adding the card (`type: custom:sequence-scheduler-card`), the line format with the spec's examples, the grace window and restart behaviour (including that an end overdue beyond the window is skipped), and the test commands with their counts.
- [ ] **Step 4:** Run the full suite: `uv run pytest -v` and `(cd frontend && npm test)`. Expect everything to pass, with e2e passing while the container is up. Then stop the container with `docker compose -f dev/docker-compose.yml down`, to save the Pi's RAM.
- [ ] **Step 5:** Commit `docs: README, dev instance, e2e`.
- [ ] **Step 6:** Create the GitHub repo and push: `gh repo create elazarcoh/ha-sequence-scheduler --private --source . --push`. CI is out of scope: Actions billing is blocked on this account (see the Shelfkeeper notes), so tests run locally.
