import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { kindFor } from './kinds';
import { S } from './strings';
import type { ActionData, Hass, Placeholder } from './types';

const blank = (): Placeholder => ({
  key: '', field: '', kind: 'text', default: '', min: null, max: null, options: null,
});

/** Rows of key / field / kind / default. Emits `placeholders-changed`. */
@customElement('seq-placeholder-editor')
export class SeqPlaceholderEditor extends LitElement {
  @property({ attribute: false }) hass: Hass | null = null;
  @property({ attribute: false }) actions: ActionData[] = [];
  @property({ attribute: false }) value: Placeholder[] = [];

  static override styles = css`
    .row {
      display: grid;
      grid-template-columns: 1fr 1.3fr auto 1fr auto;
      gap: 6px;
      align-items: center;
      margin: 4px 0;
    }
    input,
    select {
      font: inherit;
      min-width: 0;
      padding: 4px;
      border-radius: 6px;
      border: 1px solid var(--divider-color);
      background: var(--card-background-color);
      color: var(--primary-text-color);
    }
    .kind {
      color: var(--secondary-text-color);
      font-size: 0.85em;
    }
    button {
      font: inherit;
      background: none;
      border: 1px solid var(--divider-color);
      border-radius: 6px;
      color: var(--primary-text-color);
      padding: 4px 8px;
      cursor: pointer;
    }
  `;

  private get _fields(): string[] {
    const seen: string[] = [];
    for (const a of this.actions) for (const k of Object.keys(a.data ?? {})) if (!seen.includes(k)) seen.push(k);
    return seen;
  }

  private _emit(value: Placeholder[]) {
    this.dispatchEvent(new CustomEvent('placeholders-changed', { detail: { value } }));
  }

  private _update(index: number, patch: Partial<Placeholder>) {
    this._emit(this.value.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  private _onField(index: number, field: string) {
    const action = this.actions.find((a) => a.data && field in a.data);
    const info = action ? kindFor(this.hass, action.action, field) : { kind: 'text' as const };
    const raw = action?.data[field];
    const current = this.value[index];
    this._update(index, {
      field,
      key: current.key || field,
      kind: info.kind,
      min: info.min ?? null,
      max: info.max ?? null,
      options: info.options ?? null,
      default: info.kind === 'number' || info.kind === 'percent' ? Number(raw) : raw === undefined ? '' : String(raw),
    });
  }

  private _onDefault(index: number, text: string) {
    const p = this.value[index];
    this._update(index, { default: p.kind === 'number' || p.kind === 'percent' ? Number(text) : text });
  }

  override render() {
    const fields = this._fields;
    // One wrapping element: happy-dom drops top-level child-part markers.
    return html`<div class="rows">
      ${this.value.map(
        (p, i) => html`<div class="row">
          <input class="key" dir="auto" .value=${p.key} placeholder=${S.key}
            @change=${(e: Event) => this._update(i, { key: (e.target as HTMLInputElement).value.trim() })} />
          <select class="field" @change=${(e: Event) => this._onField(i, (e.target as HTMLSelectElement).value)}>
            <option value="" ?selected=${!p.field}>${S.field}</option>
            ${fields.map((f) => html`<option value=${f} ?selected=${f === p.field}>${f}</option>`)}
          </select>
          <span class="kind">${p.kind}</span>
          <input class="default" dir="auto" .value=${String(p.default ?? '')} placeholder=${S.defaultValue}
            @change=${(e: Event) => this._onDefault(i, (e.target as HTMLInputElement).value)} />
          <button class="remove" @click=${() => this._emit(this.value.filter((_, j) => j !== i))}>×</button>
        </div>`,
      )}
      <button class="add" @click=${() => this._emit([...this.value, blank()])}>${S.addPlaceholder}</button>
    </div>`;
  }
}
