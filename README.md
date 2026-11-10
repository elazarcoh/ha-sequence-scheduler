# Sequence Scheduler

A Home Assistant integration and card for **one-off** plans, such as *"tonight, kids' AC at 01:00 for an
hour, then again at 05:00 for an hour and a half"*. You type a few short lines, check the readback, and
press **Queue**. Each step runs once at its exact time and then disappears. Nothing repeats.

It works for any device or action: AC, lights, smart plugs, switches, scripts.

## How it works

1. **Templates (set up once).** A template has a short name (`kids`), a **start** made of one or more
   actions, an optional **end**, and optional **placeholders**: values you choose each time, each with a
   default. Example: `kids` runs `climate.set_temperature` with cool, {temp=26}, fan {fan=silent}, and
   ends with `climate.turn_off`. You build templates in the card using Home Assistant's own target and
   action pickers.
2. **Queue (the one-minute part).** Write one line per block:

   ```
   <name> <start>[-<clock>] [end] [values...]
   ```

   ```
   kids 01:00 1h 25
   kids 05:00 1.5h 24
   kitchen 22:00 30m 40%
   heater 06:00 45m
   boiler 05:30
   salon 13:00 2h fan=low
   kids 01:00 02:30 25
   kids 01:00-02:30 25
   heater +20m 1h
   heater now-06:00
   kitchen 2200 30m 40%
   kids 10pm-6:30am 25
   ```

   - **Clock times** can be written `22:00`, `2200` (or `930`), `10pm`, `10:30pm` or `1030pm`.
     `12am` is midnight, `12pm` is noon.
   - **Start** is either a clock time or a delay:
     - `01:00` means the next time the clock shows 01:00. Typed at 22:30, that's tonight.
     - `+30m`, `+1h30` or `now` count from the moment you press Queue. The readback marks these
       times with ≈.
   - **End** (optional) is either a duration or a clock time:
     - `1h`, `1.5h`, `90m` or `1h30` count from the start.
     - `02:30` (or `2:30am`) means the first 02:30 after the start. Here the time needs a `:` or
       am/pm: a bare number like `0230` after the start is read as a value.
     - `<start>-<clock>`, for example `01:00-02:30`, `2200-0130`, `10pm-6am` or `now-06:00`, gives
       the start and the end in one go.
   - **Values** go in the template's order, or by name (`fan=low`). Anything left out uses its default.
   - As you type, a hint shows what the template expects next. The readback lists every line with its
     real times and flags mistakes before anything is queued. For example, a fan mode that AC doesn't
     have is flagged, with the modes it does have.

## Behaviour you should know

- **Fixed steps.** Every step is one-off. Manual changes are ignored: an end still runs even if someone
  already switched the device off, and later blocks still run.
- **Restarts.** The queue survives restarts. A step missed while Home Assistant was down still runs if it
  is at most **10 minutes** late (Settings → Devices & services → Sequence Scheduler → Configure). Older
  steps are **skipped, including ends**, so a long outage can leave a device on. Every skip is logged.
- **Crash in the middle of a step.** An interrupted end is run again after a restart (turning off twice is
  harmless). An interrupted start is not, because it may already have run.
- **Actions only reach entities they can act on.** Home Assistant silently skips an entity an action
  can't handle, such as `input_boolean.turn_on` on a switch. The scheduler checks each action's targets
  against Home Assistant's own description of that action: a template that names such an entity can't be
  saved or queued (the message suggests the right action), the Templates tab flags one saved earlier, and
  an already queued step that hits one is logged as failed. Entities an area or label brings in that the
  action can't act on are simply left out.
- **Queued plans keep a frozen copy.** Editing or deleting a template doesn't change plans already queued.
- **Logbook.** Every step that runs, fails, is skipped or is cancelled appears in the logbook, and device
  changes are attributed to the step.
- **Admins only.** All of it requires a Home Assistant admin user.

## Install

1. HACS → ⋮ → *Custom repositories* → add `https://github.com/elazarcoh/ha-sequence-scheduler` as an
   **Integration**, then install **Sequence Scheduler**.
2. Restart Home Assistant, then go to *Settings → Devices & services → Add integration → Sequence Scheduler*.
3. Add the card to a dashboard:

   ```yaml
   type: custom:sequence-scheduler-card
   ```

## Development

```bash
uv sync && uv run pytest              # Python suite (168 passed; e2e skips without the dev container)
cd frontend && npm install && npm test && npm run typecheck && npm run build   # card (Tests  57 passed (57))
```

The built bundle is committed. A test fails if it doesn't match `frontend/src`, so run `npm run build`
after editing the card. For the browser tests against a real Home Assistant, see [dev/README.md](dev/README.md).

Releases: bump the version in `manifest.json`, `CARD_VERSION` in `frontend.py` and `frontend/src/version.ts`
(a test keeps them in sync), rebuild the card, then tag.
