import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Api } from './api';
import './placeholder-editor';
import './service-editor';
import { S } from './strings';
import './target-editor';
import type { ActionData, Hass, Placeholder, Template } from './types';

type Section = 'start' | 'end';

const emptyAction = (target: Record<string, unknown> = {}): ActionData => ({ action: '', target: { ...target }, data: {} });
const clone = (a: ActionData): ActionData => ({ action: a.action, target: { ...a.target }, data: { ...a.data } });

/** Create or edit one template. Emits `saved` and `closed`. */
@customElement('seq-template-dialog')
export class SeqTemplateDialog extends LitElement {
  @property({ attribute: false }) hass: Hass | null = null;
  @property({ attribute: false }) template: Template | null = null;

  @state() private _key = '';
  @state() private _name = '';
  @state() private _start: ActionData[] = [emptyAction()];
  @state() private _end: ActionData[] = [emptyAction()];
  @state() private _noEnd = false;
  @state() private _placeholders: Placeholder[] = [];
  @state() private _error = '';
  @state() private _busy = false;
  private _loaded: Template | null | undefined = undefined;

  static override styles = css`
    .form {
      border: 1px solid var(--divider-color);
      border-radius: 10px;
      padding: 12px;
      margin: 8px 0;
    }
    label {
      display: block;
      font-size: 0.85em;
      color: var(--secondary-text-color);
      margin-top: 8px;
    }
    input[type='text'] {
      width: 100%;
      box-sizing: border-box;
      font: inherit;
      padding: 6px;
      border-radius: 6px;
      border: 1px solid var(--divider-color);
      background: var(--card-background-color);
      color: var(--primary-text-color);
    }
    h4 {
      margin: 14px 0 4px;
    }
    .action {
      border-left: 3px solid var(--divider-color);
      padding-left: 8px;
      margin: 8px 0;
    }
    button {
      font: inherit;
      background: none;
      border: 1px solid var(--divider-color);
      border-radius: 6px;
      color: var(--primary-text-color);
      padding: 4px 10px;
      cursor: pointer;
    }
    button.save {
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
      border: none;
    }
    .buttons {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 12px;
    }
    .error {
      color: var(--error-color, #c62828);
      margin-top: 8px;
    }
  `;

  override willUpdate() {
    if (this._loaded === this.template) return;
    this._loaded = this.template;
    const t = this.template;
    if (!t) return;
    this._key = t.key;
    this._name = t.name;
    this._start = t.start.length ? t.start.map(clone) : [emptyAction()];
    this._end = t.end.length ? t.end.map(clone) : [emptyAction(this._start[0].target)];
    this._noEnd = t.end.length === 0;
    this._placeholders = t.placeholders.map((p) => ({ ...p }));
  }

  private _list(section: Section) {
    return section === 'start' ? this._start : this._end;
  }

  private _set(section: Section, actions: ActionData[]) {
    if (section === 'start') {
      // An untouched end follows the start's target, so the AC is picked once.
      const end0 = this._end[0];
      const untouched = this._end.length === 1 && !end0.action && Object.keys(end0.target).length === 0;
      this._start = actions;
      if (untouched && actions[0]) this._end = [emptyAction(actions[0].target)];
    } else {
      this._end = actions;
    }
  }

  private _patch(section: Section, index: number, patch: Partial<ActionData>) {
    this._set(section, this._list(section).map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  private _add(section: Section) {
    const list = this._list(section);
    const previous = list[list.length - 1] ?? this._start[this._start.length - 1];
    this._set(section, [...list, emptyAction(previous?.target ?? {})]);
  }

  private _remove(section: Section, index: number) {
    const list = this._list(section).filter((_, i) => i !== index);
    this._set(section, list.length ? list : [emptyAction()]);
  }

  private _onService(section: Section, index: number, e: CustomEvent) {
    const patch: Partial<ActionData> = { action: e.detail.action };
    if (e.detail.data !== undefined) patch.data = e.detail.data;
    else if (e.detail.action !== this._list(section)[index].action) patch.data = {};
    this._patch(section, index, patch);
  }

  private async _save() {
    this._busy = true;
    this._error = '';
    const payload: Partial<Template> = {
      ...(this.template ? { id: this.template.id } : {}),
      key: this._key.trim(),
      name: this._name.trim() || this._key.trim(),
      start: this._start.map(clone),
      end: this._noEnd ? [] : this._end.map(clone),
      placeholders: this._placeholders,
    };
    try {
      const saved = await new Api(this.hass!).saveTemplate(payload);
      this.dispatchEvent(new CustomEvent('saved', { detail: { template: saved } }));
    } catch (err: any) {
      this._error = err?.message ?? String(err);
    } finally {
      this._busy = false;
    }
  }

  private _section(section: Section, title: string) {
    return html`<div class=${section}>
      <h4>${title}</h4>
      ${this._list(section).map(
        (a, i) => html`<div class="action">
          <seq-target-editor
            .hass=${this.hass}
            .value=${a.target}
            @target-changed=${(e: CustomEvent) => this._patch(section, i, { target: e.detail.value })}
          ></seq-target-editor>
          <seq-service-editor
            .hass=${this.hass}
            .action=${a.action}
            .target=${a.target}
            .data=${a.data}
            @service-changed=${(e: CustomEvent) => this._onService(section, i, e)}
          ></seq-service-editor>
          ${this._list(section).length > 1
            ? html`<button class="remove-action" @click=${() => this._remove(section, i)}>${S.removeAction}</button>`
            : nothing}
        </div>`,
      )}
      <button class="add-action" @click=${() => this._add(section)}>${S.addAction}</button>
    </div>`;
  }

  override render() {
    const actions = [...this._start, ...(this._noEnd ? [] : this._end)];
    return html`<div class="form">
      <label>${S.shortName}
        <input type="text" class="key" dir="auto" .value=${this._key}
          @input=${(e: Event) => (this._key = (e.target as HTMLInputElement).value)} />
      </label>
      <label>${S.displayName}
        <input type="text" class="name" dir="auto" .value=${this._name}
          @input=${(e: Event) => (this._name = (e.target as HTMLInputElement).value)} />
      </label>
      ${this._section('start', S.start)}
      <h4>${S.end}</h4>
      <label class="inline">
        <input type="checkbox" class="no-end" .checked=${this._noEnd}
          @change=${(e: Event) => (this._noEnd = (e.target as HTMLInputElement).checked)} />
        ${S.noEnd}
      </label>
      ${this._noEnd ? nothing : this._section('end', '')}
      <h4>${S.placeholders}</h4>
      <seq-placeholder-editor
        .hass=${this.hass}
        .actions=${actions}
        .value=${this._placeholders}
        @placeholders-changed=${(e: CustomEvent) => (this._placeholders = e.detail.value)}
      ></seq-placeholder-editor>
      ${this._error ? html`<div class="error" dir="auto">${this._error}</div>` : nothing}
      <div class="buttons">
        <button class="close" @click=${() => this.dispatchEvent(new CustomEvent('closed'))}>${S.close}</button>
        <button class="save" ?disabled=${this._busy} @click=${this._save}>${S.save}</button>
      </div>
    </div>`;
  }
}
