"""Runs queued steps: once each, at their time, surviving restarts.

Order inside a step is what anti-goals 1 and 2 rest on: the step is marked
in_progress ON DISK before any action is called, and removed after. On
startup an in_progress end is re-run (turning off twice is harmless) and an
in_progress start is not (it may already have run).
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta

from homeassistant.const import STATE_UNAVAILABLE
from homeassistant.core import CALLBACK_TYPE, Context, HomeAssistant
from homeassistant.helpers import target as target_helper
from homeassistant.helpers.event import async_track_point_in_time
from homeassistant.helpers.service import async_call_from_config
from homeassistant.util import dt as dt_util

from .const import EVENT_STEP_DUE, EVENT_STEP_RESULT, RETRY_ATTEMPTS, RETRY_DELAY_SECONDS
from .models import Action, Block, Step
from .store import QueueStore

_LOGGER = logging.getLogger(__name__)


class SequenceEngine:
    def __init__(self, hass: HomeAssistant, queue: QueueStore, grace: timedelta) -> None:
        self.hass = hass
        self.queue = queue
        self.grace = grace
        self._timers: dict[str, CALLBACK_TYPE] = {}
        # Step ids currently executing. A step in here is never started
        # again, so the catch-up path and a timer cannot both run it.
        self._running: set[str] = set()
        # Set by async_stop. A stopped engine arms nothing, starts nothing
        # and writes nothing: after a reload the NEW engine owns the queue
        # (final review #2).
        self._stopped = False
        self._tasks: set[asyncio.Task] = set()

    # --- lifecycle ---------------------------------------------------------

    async def async_start(self) -> None:
        self._track_current_task()
        now = dt_util.utcnow()
        work = sorted(
            ((b.id, s.id, s.at) for b in self.queue.blocks for s in b.steps),
            key=lambda item: item[2],
        )
        for block_id, step_id, _ in work:
            if self._stopped:
                return
            found = self._find(block_id, step_id)
            if found is None:
                continue
            block, step = found
            if step.state == "in_progress":
                if step.phase == "end":
                    await self._async_run(block_id, step_id)
                else:
                    await self._async_drop(block, step, "skipped_maybe_ran", "")
            elif step.at <= now:
                late = now - step.at
                if late <= self.grace:
                    await self._async_run(block_id, step_id)
                else:
                    minutes = int(late.total_seconds() // 60)
                    await self._async_drop(block, step, "skipped", f"overdue by {minutes} min")
            else:
                self._arm(block.id, step)

    async def async_stop(self) -> None:
        self._stopped = True
        for unsub in self._timers.values():
            unsub()
        self._timers.clear()
        current = asyncio.current_task()
        pending = [t for t in self._tasks if t is not current and not t.done()]
        for task in pending:
            task.cancel()
        if pending:
            await asyncio.gather(*pending, return_exceptions=True)

    def _track_current_task(self) -> None:
        task = asyncio.current_task()
        if task is not None and task not in self._tasks:
            self._tasks.add(task)
            task.add_done_callback(self._tasks.discard)

    async def async_enqueue(self, blocks: list[Block]) -> None:
        await self.queue.async_add(blocks)
        for block in blocks:
            for step in block.steps:
                self._arm(block.id, step)

    async def async_cancel(self, block_id: str, run_end: bool) -> None:
        block = self.queue.get(block_id)
        if block is None:
            raise KeyError(block_id)
        for step in block.steps:
            if unsub := self._timers.pop(step.id, None):
                unsub()
        started = not any(s.phase == "start" for s in block.steps)
        end = next((s for s in block.steps if s.phase == "end"), None)
        if run_end and started and end is not None and end.id not in self._running:
            await self._async_run(block_id, end.id)
        block = self.queue.get(block_id)
        if block is None:
            return
        for step in block.steps:
            if step.id not in self._running:
                self._fire_result(block, step, "cancelled", "")
        await self.queue.async_remove_block(block_id)

    # --- internals ---------------------------------------------------------

    def _find(self, block_id: str, step_id: str) -> tuple[Block, Step] | None:
        block = self.queue.get(block_id)
        if block is None:
            return None
        step = next((s for s in block.steps if s.id == step_id), None)
        return (block, step) if step is not None else None

    def _arm(self, block_id: str, step: Step) -> None:
        if self._stopped:
            return
        step_id = step.id
        if old := self._timers.pop(step_id, None):
            old()

        async def _due(_now: datetime) -> None:
            self._timers.pop(step_id, None)
            await self._async_run(block_id, step_id)

        self._timers[step_id] = async_track_point_in_time(self.hass, _due, step.at)

    def _payload(self, block: Block, step: Step) -> dict:
        return {
            "block_id": block.id,
            "step_id": step.id,
            "phase": step.phase,
            "template_name": block.template_name,
            "values": dict(block.values),
            "entity_ids": list(block.entity_ids),
            "line": block.line,
        }

    def _fire_result(self, block: Block, step: Step, outcome: str, detail: str, context: Context | None = None) -> None:
        self.hass.bus.async_fire(
            EVENT_STEP_RESULT,
            {**self._payload(block, step), "outcome": outcome, "detail": detail},
            context=context,
        )

    async def _async_drop(self, block: Block, step: Step, outcome: str, detail: str) -> None:
        if self._stopped:
            return
        _LOGGER.warning("%s %s %s %s", block.template_name, step.phase, outcome, detail)
        await self.queue.async_remove_step(block.id, step.id)
        self._fire_result(block, step, outcome, detail)

    async def _async_run(self, block_id: str, step_id: str) -> None:
        if step_id in self._running or self._stopped:
            return
        self._track_current_task()
        found = self._find(block_id, step_id)
        if found is None:
            return
        block, step = found
        self._running.add(step_id)
        try:
            await self.queue.async_set_state(block_id, step_id, "in_progress")
            # The same context on the event and on every call is how Home
            # Assistant's logbook attributes the device changes to this step,
            # exactly as it does for automations.
            context = Context()
            self.hass.bus.async_fire(EVENT_STEP_DUE, self._payload(block, step), context=context)
            errors = []
            for action in step.actions:
                error = await self._async_call(action, context)
                if error:
                    errors.append(error)
            if self._stopped:
                return
            if self.queue.get(block_id) is not None:
                await self.queue.async_remove_step(block_id, step_id)
            self._fire_result(
                block, step, "failed" if errors else "ran", "; ".join(errors), context
            )
        finally:
            self._running.discard(step_id)

    def _unavailable(self, action: Action) -> list[str]:
        """Targeted entities that are missing or unavailable right now.

        Home Assistant drops unavailable entities from an entity service
        call WITHOUT raising, so without this an offline AC's "off" would
        be logged as ran (final review #1). Only `unavailable` counts:
        `unknown` is the normal state of buttons, scripts and the like.
        """
        if not action.target:
            return []
        selection = target_helper.TargetSelection(dict(action.target))
        selected = target_helper.async_extract_referenced_entity_ids(self.hass, selection)
        out = []
        for entity_id in sorted(selected.referenced | selected.indirectly_referenced):
            state = self.hass.states.get(entity_id)
            if state is None or state.state == STATE_UNAVAILABLE:
                out.append(entity_id)
        return out

    async def _async_call(self, action: Action, context: Context) -> str | None:
        config: dict = {"action": action.action, "data": dict(action.data)}
        if action.target:
            config["target"] = dict(action.target)
        for attempt in range(1, RETRY_ATTEMPTS + 1):
            missing = self._unavailable(action)
            if missing:
                if attempt == RETRY_ATTEMPTS:
                    reason = ", ".join(f"{e} unavailable" for e in missing)
                    _LOGGER.error("%s: %s after %s attempts", action.action, reason, RETRY_ATTEMPTS)
                    return f"{action.action}: {reason}"
                await asyncio.sleep(RETRY_DELAY_SECONDS)
                continue
            try:
                await async_call_from_config(
                    self.hass, config, blocking=True, validate_config=True, context=context
                )
                return None
            except Exception as err:  # noqa: BLE001 - reported in the logbook, never swallowed
                reason = f"{type(err).__name__}: {err}" if str(err) else type(err).__name__
                if attempt == RETRY_ATTEMPTS:
                    _LOGGER.error(
                        "%s failed after %s attempts: %s", action.action, RETRY_ATTEMPTS, reason
                    )
                    return f"{action.action}: {reason}"
                await asyncio.sleep(RETRY_DELAY_SECONDS)
        return None
