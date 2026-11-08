import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Api } from './api';
import { hhmm } from './format';
import { S } from './strings';
import type { Block, Hass } from './types';

/** What is queued, with a cancel button per block. */
@customElement('seq-queue-list')
export class SeqQueueList extends LitElement {
  @property({ attribute: false }) hass: Hass | null = null;
  @state() private _blocks: Block[] | null = null;
  @state() private _asking: string | null = null;
  @state() private _error = '';

  private _unsub: (() => void | Promise<void>) | null = null;
  private _subscribedTo: Hass | null = null;

  static override styles = css`
    .block {
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 8px;
      margin: 6px 0;
    }
    .head {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .line {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      flex: 1;
    }
    .steps,
    .name {
      color: var(--secondary-text-color);
      font-size: 0.9em;
    }
    .steps {
      font-variant-numeric: tabular-nums;
    }
    .ask {
      margin-top: 6px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }
    button {
      font: inherit;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid var(--divider-color);
      background: none;
      color: var(--primary-text-color);
      cursor: pointer;
    }
    .empty,
    .error {
      color: var(--secondary-text-color);
      padding: 8px 0;
    }
  `;

  override updated() {
    if (this.hass && this.isConnected && this._subscribedTo !== this.hass && !this._unsub) {
      this._subscribedTo = this.hass;
      this._subscribe();
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    if (this.hass && !this._unsub) this._subscribe();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    const unsub = this._unsub;
    this._unsub = null;
    this._subscribedTo = null;
    if (unsub) void unsub();
  }

  private async _subscribe() {
    this._subscribedTo = this.hass;
    try {
      const unsub = await new Api(this.hass!).subscribeQueue((blocks) => (this._blocks = blocks));
      if (this.isConnected) this._unsub = unsub;
      else void unsub();
    } catch (err: any) {
      this._error = err?.message ?? String(err);
    }
  }

  /** What to say about a start that is done, for a block whose end is pending. */
  private _startState(block: Block): string {
    const detail = block.start_detail ? `: ${block.start_detail}` : '';
    if (block.start_outcome === 'failed') return `${S.startFailed}${detail}`;
    if (block.start_outcome?.startsWith('skipped')) return `${S.startSkipped}${detail}`;
    return S.running;
  }

  private _isRunning(block: Block) {
    return !block.steps.some((s) => s.phase === 'start') && block.steps.some((s) => s.phase === 'end');
  }

  private _onCancel(block: Block) {
    if (this._isRunning(block)) this._asking = block.id;
    else void this._cancel(block.id, false);
  }

  private async _cancel(blockId: string, runEnd: boolean) {
    this._asking = null;
    try {
      await new Api(this.hass!).cancel(blockId, runEnd);
    } catch (err: any) {
      this._error = err?.message ?? String(err);
    }
  }

  private _steps(block: Block) {
    const tz = this.hass?.config?.time_zone;
    const running = this._isRunning(block) ? `${this._startState(block)} · ` : '';
    return (
      running +
      block.steps
        .map((s) => `${s.phase === 'start' ? 'start' : 'end'} ${hhmm(s.at, tz)}${s.state === 'in_progress' ? ` (${S.running})` : ''}`)
        .join(' · ')
    );
  }

  private _block(block: Block) {
    return html`<div class="block">
      <div class="head">
        <span class="line" dir="auto">${block.line}</span>
        <button class="cancel" @click=${() => this._onCancel(block)}>${S.cancel}</button>
      </div>
      <div class="name" dir="auto">${block.template_name}</div>
      <div class="steps" dir="ltr">${this._steps(block)}</div>
      ${this._asking === block.id
        ? html`<div class="ask">
            <span>${S.turnOffNow}</span>
            <button class="run-end" @click=${() => this._cancel(block.id, true)}>${S.runEndNow}</button>
            <button class="just-cancel" @click=${() => this._cancel(block.id, false)}>${S.justCancel}</button>
            <button class="keep" @click=${() => (this._asking = null)}>${S.keepIt}</button>
          </div>`
        : nothing}
    </div>`;
  }

  override render() {
    return html`<div class="list">
      ${this._error ? html`<div class="error">${this._error}</div>` : nothing}
      ${this._blocks === null
        ? nothing
        : this._blocks.length === 0
          ? html`<div class="empty">${S.nothingQueued}</div>`
          : this._blocks.map((b) => this._block(b))}
    </div>`;
  }
}
