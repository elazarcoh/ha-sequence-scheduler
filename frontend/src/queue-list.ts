import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Hass } from './types';

/** Placeholder; filled in by a later task of the plan. */
@customElement('seq-queue-list')
export class SeqQueueList extends LitElement {
  @property({ attribute: false }) hass: Hass | null = null;

  override render() {
    return html``;
  }
}
