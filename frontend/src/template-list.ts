import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Api } from './api';
import { S } from './strings';
import './template-dialog';
import type { Hass, Template } from './types';

/** The Templates tab: list, add, edit, delete. */
@customElement('seq-template-list')
export class SeqTemplateList extends LitElement {
  @property({ attribute: false }) hass: Hass | null = null;
  @state() private _templates: Template[] | null = null;
  /** undefined: no dialog; null: a new template; otherwise the one edited. */
  @state() private _editing: Template | null | undefined = undefined;
  @state() private _error = '';
  private _loadedFor: Hass | null = null;

  static override styles = css`
    .template {
      display: flex;
      align-items: center;
      gap: 8px;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 8px;
      margin: 6px 0;
    }
    .text {
      flex: 1;
      min-width: 0;
    }
    .key {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-weight: 600;
    }
    .summary {
      color: var(--secondary-text-color);
      font-size: 0.85em;
      overflow-wrap: anywhere;
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
    .problem {
      color: var(--error-color, #c62828);
      font-size: 0.85em;
      overflow-wrap: anywhere;
    }
    .empty,
    .error {
      color: var(--secondary-text-color);
      padding: 8px 0;
    }
  `;

  override updated() {
    if (this.hass && this._loadedFor !== this.hass && this._templates === null) {
      this._loadedFor = this.hass;
      void this._load();
    }
  }

  private async _load() {
    try {
      this._templates = await new Api(this.hass!).listTemplates();
    } catch (err: any) {
      this._error = err?.message ?? String(err);
    }
  }

  private async _delete(t: Template) {
    if (!window.confirm(S.confirmDelete(t.name))) return;
    try {
      await new Api(this.hass!).deleteTemplate(t.id);
      await this._load();
    } catch (err: any) {
      this._error = err?.message ?? String(err);
    }
  }

  private _summary(t: Template) {
    const names = (list: Template['start']) => list.map((a) => a.action).join(' + ');
    return t.end.length ? `${names(t.start)} → ${names(t.end)}` : names(t.start);
  }

  override render() {
    // One wrapping element: happy-dom drops top-level child-part markers.
    return html`<div class="list">
      ${this._error ? html`<div class="error">${this._error}</div>` : nothing}
      ${this._editing !== undefined
        ? html`<seq-template-dialog
            .hass=${this.hass}
            .template=${this._editing}
            @saved=${async () => {
              this._editing = undefined;
              await this._load();
            }}
            @closed=${() => (this._editing = undefined)}
          ></seq-template-dialog>`
        : html`<button class="add-template" @click=${() => (this._editing = null)}>${S.addTemplate}</button>`}
      ${this._templates?.length === 0 ? html`<div class="empty">${S.noTemplates}</div>` : nothing}
      ${(this._templates ?? []).map(
        (t) => html`<div class="template">
          <div class="text">
            <span class="key" dir="auto">${t.key}</span>
            <span class="name" dir="auto">${t.name}</span>
            <div class="summary">${this._summary(t)}</div>
            ${(t.problems ?? []).map((p) => html`<div class="problem" dir="auto">${p}</div>`)}
          </div>
          <button class="edit" @click=${() => (this._editing = t)}>${S.edit}</button>
          <button class="delete" @click=${() => this._delete(t)}>${S.delete}</button>
        </div>`,
      )}
    </div>`;
  }
}
