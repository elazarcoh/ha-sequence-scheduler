"""Persistence for templates and the queue."""

from __future__ import annotations

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.storage import Store

from .const import SIGNAL_QUEUE_CHANGED
from .models import Block, StepState, Template
from .template_schema import TemplateError

STORAGE_VERSION = 1
TEMPLATES_KEY = "sequence_scheduler.templates"
QUEUE_KEY = "sequence_scheduler.queue"


class _RefusingStore(Store):
    """Refuse any stored version we do not know.

    Adapted from ha-shabbat-scheduler store.py `_MigratingStore`: loading
    unknown data as if it were current and writing it back would destroy
    it silently. A future version bump adds its migration branch here.
    """

    def __init__(self, hass: HomeAssistant, key: str) -> None:
        super().__init__(hass, STORAGE_VERSION, key)

    async def _async_migrate_func(self, old_major_version, old_minor_version, old_data):
        raise HomeAssistantError(
            f"{self.key} is at version {old_major_version}.{old_minor_version}, "
            f"which this version of sequence_scheduler cannot read."
        )


class TemplateStore:
    def __init__(self, hass: HomeAssistant) -> None:
        self._store = _RefusingStore(hass, TEMPLATES_KEY)
        self._templates: list[Template] = []

    async def async_load(self) -> None:
        data = await self._store.async_load() or {}
        self._templates = [Template.from_dict(t) for t in data.get("templates", [])]

    @property
    def templates(self) -> list[Template]:
        return list(self._templates)

    def get(self, template_id: str) -> Template | None:
        return next((t for t in self._templates if t.id == template_id), None)

    def get_by_key(self, key: str) -> Template | None:
        folded = key.casefold()
        return next((t for t in self._templates if t.key.casefold() == folded), None)

    async def async_save(self, template: Template) -> Template:
        clash = self.get_by_key(template.key)
        if clash is not None and clash.id != template.id:
            raise TemplateError("duplicate_key", f"{template.key!r} is already used")
        for i, existing in enumerate(self._templates):
            if existing.id == template.id:
                self._templates[i] = template
                break
        else:
            self._templates.append(template)
        await self._persist()
        return template

    async def async_delete(self, template_id: str) -> None:
        if self.get(template_id) is None:
            raise KeyError(template_id)
        self._templates = [t for t in self._templates if t.id != template_id]
        await self._persist()

    async def _persist(self) -> None:
        await self._store.async_save({"templates": [t.to_dict() for t in self._templates]})


class QueueStore:
    """The queue. Every mutation is written to disk before it returns.

    A direct save, not a delayed one: the engine relies on "in_progress"
    being on disk before it calls any action (crash safety, spec §2.6).
    """

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass
        self._store = _RefusingStore(hass, QUEUE_KEY)
        self._blocks: list[Block] = []

    async def async_load(self) -> None:
        data = await self._store.async_load() or {}
        self._blocks = [Block.from_dict(b) for b in data.get("blocks", [])]

    @property
    def blocks(self) -> list[Block]:
        return sorted(
            (b for b in self._blocks if b.steps), key=lambda b: min(s.at for s in b.steps)
        )

    def get(self, block_id: str) -> Block | None:
        return next((b for b in self._blocks if b.id == block_id), None)

    def _require(self, block_id: str) -> Block:
        block = self.get(block_id)
        if block is None:
            raise KeyError(block_id)
        return block

    async def async_add(self, blocks: list[Block]) -> None:
        self._blocks.extend(blocks)
        await self._persist()

    async def async_set_state(self, block_id: str, step_id: str, state: StepState) -> None:
        block = self._require(block_id)
        step = next(s for s in block.steps if s.id == step_id)
        step.state = state
        await self._persist()

    async def async_remove_step(
        self, block_id: str, step_id: str, outcome: str | None = None, detail: str = ""
    ) -> None:
        block = self._require(block_id)
        if outcome is not None and any(s.id == step_id and s.phase == "start" for s in block.steps):
            block.start_outcome, block.start_detail = outcome, detail
        block.steps = [s for s in block.steps if s.id != step_id]
        if not block.steps:
            self._blocks = [b for b in self._blocks if b.id != block_id]
        await self._persist()

    async def async_remove_block(self, block_id: str) -> None:
        self._require(block_id)
        self._blocks = [b for b in self._blocks if b.id != block_id]
        await self._persist()

    async def _persist(self) -> None:
        await self._store.async_save({"blocks": [b.to_dict() for b in self._blocks]})
        async_dispatcher_send(self._hass, SIGNAL_QUEUE_CHANGED)
