import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { Api } from './api';
import { dayLabel, formatValues, hhmm } from './format';
import { hintFor } from './hints';
import { S } from './strings';
import type { Hass, Preview, PreviewRow, Template } from './types';

const DEBOUNCE_MS = 300;

/** The 1-minute part: type lines, read them back, queue them. */
@customElement('seq-queue-entry')
export class SeqQueueEntry extends LitElement {
  @property({ attribute: false }) hass: Hass | null = null;
  @state() private _text = '';
  @state() private _preview: Preview | null = null;
  @state() private _templates: Template[] = [];
  @state() private _hint: string | null = null;
  @state() private _message = '';
  @state() private _busy = false;
  @query('textarea') private _textarea!: HTMLTextAreaElement;

  private _timer: ReturnType<typeof setTimeout> | null = null;
  private _seq = 0;
  private _loadedFor: Hass | null = null;

  static override styles = css`
    textarea {
      width: 100%;
      box-sizing: border-box;
      min-height: 7em;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 15px;
      padding: 8px;
      border-radius: 8px;
      border: 1px solid var(--divider-color);
      background: var(--card-background-color);
      color: var(--primary-text-color);
    }
    .hint {
      min-height: 1.4em;
      font-size: 0.85em;
      color: var(--secondary-text-color);
      margin: 4px 0 8px;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 8px;
      padding: 6px 8px;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      margin: 4px 0;
    }
    .time {
      font-variant-numeric: tabular-nums;
      font-weight: 600;
      min-width: 6.5em;
    }
    .day,
    .values {
      color: var(--secondary-text-color);
      font-size: 0.9em;
    }
    .ok {
      color: var(--success-color, #2e7d32);
    }
    .error {
      color: var(--error-color, #c62828);
      flex-basis: 100%;
      font-size: 0.9em;
    }
    .warning {
      color: var(--warning-color, #b26a00);
      flex-basis: 100%;
      font-size: 0.9em;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      margin-top: 8px;
    }
    button.queue {
      padding: 8px 14px;
      border: none;
      border-radius: 8px;
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    button.queue[disabled] {
      opacity: 0.5;
      cursor: default;
    }
    .message {
      color: var(--secondary-text-color);
    }
  `;

  override firstUpdated() {
    this._textarea.addEventListener('input', (e) => this._onInput(e));
    this._textarea.addEventListener('click', () => this._updateHint());
    this._textarea.addEventListener('keyup', () => this._updateHint());
  }

  override updated() {
    if (this.hass && this._loadedFor !== this.hass && this._templates.length === 0) {
      this._loadedFor = this.hass;
      this._loadTemplates();
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    if (this._timer) clearTimeout(this._timer);
  }

  private async _loadTemplates() {
    try {
      this._templates = await new Api(this.hass!).listTemplates();
      this._updateHint();
    } catch {
      /* hints are optional; the preview still validates */
    }
  }

  private _onInput(e: Event) {
    this._text = (e.target as HTMLTextAreaElement).value;
    this._message = '';
    this._updateHint();
    if (this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(() => this._runPreview(), DEBOUNCE_MS);
  }

  private _updateHint() {
    const ta = this._textarea;
    const pos = ta?.selectionStart ?? this._text.length;
    const before = this._text.slice(0, pos);
    const lineStart = before.lastIndexOf('\n') + 1;
    const lineEnd = this._text.indexOf('\n', pos);
    const line = this._text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    this._hint = hintFor(line, this._templates);
  }

  private async _runPreview() {
    this._timer = null;
    const seq = ++this._seq;
    if (!this._text.trim()) {
      this._preview = null;
      return;
    }
    try {
      const preview = await new Api(this.hass!).preview(this._text);
      if (seq === this._seq) this._preview = preview;
    } catch (err: any) {
      if (seq === this._seq) this._message = err?.message ?? String(err);
    }
  }

  private get _counts() {
    const rows = this._preview?.rows ?? [];
    return { ok: rows.filter((r) => r.ok).length, bad: rows.filter((r) => !r.ok).length };
  }

  private async _queue() {
    const preview = this._preview;
    if (!preview || this._busy) return;
    this._busy = true;
    try {
      const { queued } = await new Api(this.hass!).queue(this._text, preview.now, preview.token);
      this._text = '';
      this._preview = null;
      this._hint = null;
      if (this._textarea) this._textarea.value = '';
      this._message = S.queued(queued);
    } catch (err: any) {
      if (err?.code === 'preview_changed') {
        await this._runPreview();
        this._message = S.previewChanged;
      } else {
        this._message = err?.message ?? String(err);
      }
    } finally {
      this._busy = false;
    }
  }

  private _row(row: PreviewRow) {
    const tz = this.hass?.config?.time_zone;
    const now = this._preview!.now;
    const time = row.start_at
      ? row.end_at
        ? `${hhmm(row.start_at, tz)}–${hhmm(row.end_at, tz)}`
        : hhmm(row.start_at, tz)
      : '--:--';
    return html`<div class="row">
      <span class="time" dir="ltr">${time}</span>
      ${row.start_at ? html`<span class="day">${dayLabel(row.start_at, now, tz)}</span>` : nothing}
      <span class="name" dir="auto">${row.template_name ?? row.raw}</span>
      <span class="values" dir="auto">${formatValues(row.values)}</span>
      ${row.ok ? html`<span class="ok">✓</span>` : nothing}
      ${row.errors.map((i) => html`<span class="error" dir="auto">${i.detail}</span>`)}
      ${row.warnings.map((i) => html`<span class="warning" dir="auto">${i.detail}</span>`)}
    </div>`;
  }

  override render() {
    const { ok, bad } = this._counts;
    const label = bad ? `${S.queueN(ok)} · ${S.fixM(bad)}` : S.queueN(ok);
    return html`
      <!-- No Lit bindings on the textarea: listeners are attached in
           firstUpdated and the value is read and cleared on the element. -->
      <textarea dir="auto" spellcheck="false" autocapitalize="off" placeholder="kids 01:00 1h 25"></textarea>
      <div class="hint" dir="auto">${this._hint ?? ''}</div>
      <div class="rows">${this._preview ? this._preview.rows.map((r) => this._row(r)) : nothing}</div>
      <div class="actions">
        <span class="message">${this._message}</span>
        <button class="queue" ?disabled=${ok === 0 || this._busy} @click=${this._queue}>${label}</button>
      </div>
    `;
  }
}
