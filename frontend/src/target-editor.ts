// Adapted from ha-shabbat-scheduler frontend/src/target-editor.ts (no defaults inheritance).
import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Hass } from './types';

/**
 * An action's target, on Home Assistant's own target selector.
 *
 * Deliberately `<ha-selector>` with `{target: {}}` rather than
 * `<ha-target-picker>`: on a dashboard the picker is NOT pre-registered,
 * while `ha-selector` always is and dynamically imports whatever
 * sub-selector it is handed (verified in ha-shabbat-scheduler).
 */
@customElement('seq-target-editor')
export class SeqTargetEditor extends LitElement {
  @property({ attribute: false }) hass: Hass | null = null;
  @property({ attribute: false }) value: Record<string, unknown> = {};
  @property({ type: Boolean }) disabled = false;

  static override styles = css`
    :host {
      display: block;
    }
  `;

  override render() {
    return html`<ha-selector
      .hass=${this.hass}
      .selector=${{ target: {} }}
      .value=${this.value}
      .disabled=${this.disabled}
      @value-changed=${this._onChange}
    ></ha-selector>`;
  }

  private _onChange = (event: CustomEvent) => {
    // `ha-selector` emits `undefined` when the last target is removed.
    const value = (event.detail?.value ?? {}) as Record<string, unknown>;
    this.dispatchEvent(new CustomEvent('target-changed', { detail: { value } }));
  };
}
