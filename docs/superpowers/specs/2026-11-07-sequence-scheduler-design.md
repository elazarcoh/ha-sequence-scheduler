# Sequence Scheduler: design

Status: draft for review, 2026-11-07
Owner: the user (elazarcoh). Repo: `~/ha-sequence-scheduler`, GitHub `elazarcoh/ha-sequence-scheduler` (private).

Each decision below is labelled with who made it:

- **[user]**: the user decided it in the brainstorming conversation.
- **[Claude's call]**: proposed by Claude and not objected to. The user should check these while reading.
- **[builder]**: left open for whoever implements this.

## 1. Intent

The user often wants to schedule a one-off sequence of device actions for later, usually the same night. The canonical example:

> Start the kids' AC at 01:00 and turn it off after 1h. Start it again at 05:00 and turn it off after 1.5h.

Home Assistant has no friendly way to do this:

- **Automations** are permanent objects. Making one for a single night and deleting it the next morning is tedious.
- **Scripts with `delay`** die on restart and leave devices on.
- **The calendar and the HACS scheduler card** both think in terms of recurring time-of-day schedules, not "this plan, once".

The user also owns `ha-shabbat-scheduler`. It runs fixed rules inside the Shabbat window, which is a different problem from this one.

**What the user wants:** templates set up once, plus a 1-minute way to queue tonight's plan from home. The templates are named actions with placeholders, for example "Kids AC on: cool, {temp=26}, fan {fan=silent}". Queuing means typing a few short lines that reference the templates, adjusting placeholder values on the spot, checking a readback, and pressing Queue. **[user]**

AC was only the example. Lights, smart plugs and switches have to work just as well. **[user]**

**Success** means the user can type tonight's plan on their phone in about a minute and then forget about it. Each step fires once at its exact time and never repeats. A restart doesn't cancel it or leave a device stuck on.

## 2. Goals

1. **Templates.** A template has:
   - a short name (any language, Hebrew included) **[Claude's call]**;
   - a display name;
   - a **start** made of one or more Home Assistant actions;
   - an optional **end** made of one or more actions;
   - an ordered list of **placeholders**.

   Each placeholder has a key, a default and a type. Placeholders can be used in any start or end action of that template. **[user: templates + placeholders changed right before scheduling; Claude's call: the exact structure]**

   A start or end can contain several actions in a row, like a script. A template with no end is a "start only" template, for example a boiler with its own timer. **[Claude's call, shown in mockup, user said "looks good"]**

2. **Text entry (option C).** One line per block **[user picked C]**, with this grammar:

   ```
   <name> <time> [<duration>] [<values…>]
   ```

   - **Values** are positional, in the template's placeholder order, or named as `key=value`. Positional and named values can be mixed. Anything missing uses the template's default.
   - **Time** is `HH:MM`, meaning the next occurrence after "now". So 01:00 typed at 22:30 means tomorrow 01:00, and 22:00 typed at 21:00 means today. **[Claude's call]**
   - **Duration** accepts `1h`, `1.5h`, `90m` and `1h30`. **[Claude's call]**
   - A duration on a template with no end is an error. A missing duration on a template that has an end means only the start is queued, and the readback shows a warning. **[Claude's call]**

   Examples:

   ```
   kids 01:00 1h 25
   kids 05:00 1.5h 24
   kitchen 22:00 30m 40%
   heater 06:00 45m
   boiler 05:30
   salon 13:00 2h fan=low
   ```

3. **Typing hints.** While the user types, the card shows what the current template expects next, for example `temp (26) · fan (silent: auto / quiet / silent / high)`. It also completes template names.

4. **Readback before queuing.** Every line is shown as a resolved row with:
   - the absolute start and end time, labelled today or tomorrow;
   - the template display name;
   - the resolved values.

   Errors stop that line from being queued: an unknown template, a bad time, a value of the wrong type, or a select value that isn't valid for the target device (for example `low` on an AC with no `low` fan mode). Warnings don't block. They cover overlapping blocks on the same entity, a missing duration on a template that has an end, and a time more than 12h away (to catch "05:00" when the user meant "17:00"). **[user approved the mockup; Claude's call: the 12h warning]** The Queue button queues only the valid lines, and its label says how many will be queued and how many need fixing.

5. **One-off execution.**
   - Each step (a block's start, and its end if any) runs exactly once at its scheduled time and is then removed. **[user]**
   - Manual changes to devices are ignored: no backtracking or reconciliation. An end still fires if someone already turned the device off by hand, and later blocks still run. **[user]**

6. **Restart safety.**
   - The queue is persisted, so a restart doesn't lose or cancel anything.
   - When Home Assistant starts, steps that came due while it was down run in their original order if they are within the **grace window** (default 10 minutes, configurable). Older ones are skipped, and the skip is logged. **[user agreed to the behaviour; Claude's call: the 10-minute default]**
   - The rule is the same for starts and ends. An end that is overdue by more than the grace window is skipped even if its start ran, so a long outage can leave a device on. The skip is logged. **[user, asked explicitly: "No" to always running overdue ends]**
   - Conflicts between catch-up steps (for example a skipped start alongside a run end) are rare enough to ignore. No special handling. **[user]**
   - **Crash during a step.** If Home Assistant dies between calling an action and recording that the step is done, the next startup re-runs the step if it is an end (turning off twice is harmless) and does not re-run it if it is a start. Implementation: mark a step "in progress" in the store before calling, and "done" after. **[Claude's call]**

7. **Queue view.**
   - The card lists upcoming steps grouped by the line that created them.
   - Each group has a cancel button.
   - Cancelling a block that is currently running (start done, end pending) asks whether to run its end now or just drop it.

   **[Claude's call, user said "ok"]**

8. **Logbook.** Every step that runs, fails or is skipped gets a logbook line naming the template and values, in the same style as ha-shabbat-scheduler's logbook. Device state changes are attributed to the step, the same way automations are attributed. **[Claude's call, user said "ok"]**

9. **Users.** Only the owner uses it. Every websocket command requires an HA admin, and the card does not need a reduced, non-admin mode. **[user: "Me"; Claude's call: admin-only]**

10. **Templates and queued blocks.** A queued block stores a frozen copy of its fully resolved actions (targets and data) taken when it was queued. Later edits to the template, or deleting it, do not change blocks that are already queued, and the queue view still shows them using the stored display name. **[Claude's call; follows anti-goal 3]**

11. **Targets.** A template's target can be anything HA's target picker allows: entities, devices, areas, several at once. When the line is queued, targets are expanded to entity ids, and that list is what's stored, used for the overlap warning, and called. For select placeholders, the allowed choices are the options that every targeted entity supports (the intersection). An empty intersection is a template-editor error. **[Claude's call]**

12. **Distribution.** HACS integration. The card ships inside the integration, as in ha-shabbat-scheduler, because HACS allows one category per repo. **[Claude's call]**

## 3. Non-goals

- Recurring or weekly schedules. Automations, the calendar and the Shabbat scheduler already cover them.
- Reacting to device state: conditions, "only if still on", reconciling manual changes. **[user: "every action is one off, no backtracking"]**
- Relative times (`+30m`) and chaining ("1h after the previous line"). They could come later.
- A service or voice entry point for queuing text. It could come later, and the parser should not prevent it.
- A shared core library with ha-shabbat-scheduler. Code is copied, with a comment noting its origin. A library gets extracted only if a third consumer appears or the same bug keeps being fixed twice. **[user asked, agreed with Claude's recommendation]**

## 4. Anti-goals (failing even if it "works")

- A device left running because of a restart, a crash or a half-done catch-up that happens *within* the grace window. Outages longer than the window are accepted as losing their steps (see §2.6). Within the window, an end that is due is the most important thing to get right.
- A step firing twice, for example a catch-up followed by the original timer.
- Queuing something different from what the readback showed.
- Taking more than about a minute for the common case (a couple of AC blocks) on a phone.
- Being AC-shaped. Light, switch and plug templates must be first-class.

## 5. Constraints and environment

- Production is Home Assistant 2026.9 on a separate box (ssh alias `ha`, 192.168.1.14). The entities present include 3 `climate`, 66 `switch`, lights and more.
- Real devices for testing:
  - kids' room AC `climate.aux_cloud_e87072dbfee2_ac`. Its start is a single `climate.set_temperature` call with `hvac_mode: cool, temperature: 26, fan_mode: silent`.
  - living room AC `climate.air_conditioner_2`, fan mode `quiet`.
  - kitchen light `light.kitchen_mpsq_khkm_tvrt_mtbkh_mrkzyt`.
- Development machine: Raspberry Pi 4 with limited RAM. Stop the dev Home Assistant container when it isn't in use.
- Same stack as ha-shabbat-scheduler: a Python custom component (`uv`, pytest, Python 3.14) and a Lit 3 + TypeScript card built with rollup. Tests use vitest + happy-dom. The bundle is committed, with a test that checks it matches the sources. e2e runs against a dev Home Assistant in docker.

## 6. How it fits together (decided parts)

- **Domain:** `sequence_scheduler`. **Name:** "Sequence Scheduler". **[Claude's call; the user can rename]**
- **Backend:**
  - The integration owns the template store and the queue store (HA `Store`, versioned so it can be migrated later).
  - It schedules each pending step with `async_track_point_in_time` and executes actions with `async_call_from_config`, as ha-shabbat-scheduler's engine does.
  - It exposes a websocket API for the card: templates CRUD, parse/preview text, queue, list queue, cancel.
- **Parsing and validation live in the backend.** The card sends text and receives the resolved preview, so the readback is exactly what will be queued (anti-goal 3). The queue call submits the preview's resolved rows, or re-parses with the same `now`, and refuses if anything differs. **[Claude's call; builder picks which mechanism]**
- **Template editor in the card:**
  - It uses Home Assistant's own pickers. Reuse/copy ha-shabbat-scheduler's `target-editor.ts` (`ha-selector` with `{target:{}}`) and `service-editor.ts` (`ha-service-control`, with its target row hidden; read that file's header comment before touching it).
  - No YAML authoring is required.
- **Placeholder types** come from the service field's selector: number, select or percentage. Select choices come from the target entity's attributes where they exist (for example `fan_modes`, `hvac_modes`, `preset_modes`), so validation follows the real device.

## 7. Left to the builder

- How a data field gets marked as a placeholder in the template editor (for example a "set when scheduling" toggle per field that asks for a key and default), and how placeholders that appear in several actions are linked.
- The exact token rules: how quotes or spaces in values are handled, `%` on brightness, case-insensitivity of select values, Hebrew template names next to Latin values.
- How to label "today / tomorrow" around midnight in the readback.
- Retry policy for a failing action call. Suggestion: copy ha-shabbat-scheduler's 3-retry behaviour. Every failure is logged either way.
- Whether to expose sensors (for example "next step", "queue length"). Not required.
- The visual design of the card, beyond the agreed mockups in `/home/rpi4/claude-wd/sequence-scheduler-brainstorm/.superpowers/brainstorm/*/content/` (`templates-and-text.html` is the agreed one; `queue-night-plan.html` shows the rejected A/B options).
- Release mechanics. Mirror ha-shabbat-scheduler: the version is kept in manifest.json, frontend.py and version.ts, and must stay in sync.
