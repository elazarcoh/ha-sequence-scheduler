import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import './queue-entry';
import './queue-list';
import './template-list';
import { S } from './strings';
import type { Hass } from './types';
import { CARD_VERSION } from './version';

interface CardConfig {
  type: string;
}

@customElement('sequence-scheduler-card')
export class SequenceSchedulerCard extends LitElement {
  @property({ attribute: false }) hass: Hass | null = null;
  @state() private _tab: 'queue' | 'templates' = 'queue';

  setConfig(_config: CardConfig) {}

  getCardSize() {
    return 6;
  }

  static getStubConfig() {
    return {};
  }

  static override styles = css`
    .tabs {
      display: flex;
      gap: 4px;
      padding: 8px 16px 0;
    }
    .tabs button {
      flex: 1;
      padding: 8px;
      border: none;
      border-bottom: 2px solid transparent;
      background: none;
      color: var(--primary-text-color);
      font: inherit;
      cursor: pointer;
    }
    .tabs button[aria-selected='true'] {
      border-bottom-color: var(--primary-color);
      font-weight: 600;
    }
    .body {
      padding: 12px 16px 16px;
    }
    .note {
      padding: 16px;
      color: var(--secondary-text-color);
    }
  `;

  override render() {
    if (this.hass?.user && this.hass.user.is_admin === false) {
      return html`<ha-card .header=${S.title}><div class="note">${S.notAdmin}</div></ha-card>`;
    }
    return html`
      <ha-card .header=${S.title}>
        <div class="tabs" role="tablist">
          ${this._tabButton('queue', S.tabQueue)} ${this._tabButton('templates', S.tabTemplates)}
        </div>
        <div class="body">
          ${this._tab === 'queue'
            ? html`<seq-queue-entry .hass=${this.hass}></seq-queue-entry>
                <seq-queue-list .hass=${this.hass}></seq-queue-list>`
            : html`<seq-template-list .hass=${this.hass}></seq-template-list>`}
        </div>
      </ha-card>
    `;
  }

  private _tabButton(tab: 'queue' | 'templates', label: string) {
    return html`<button
      role="tab"
      aria-selected=${this._tab === tab ? 'true' : 'false'}
      @click=${() => (this._tab = tab)}
    >
      ${label}
    </button>`;
  }
}

(window as any).customCards = (window as any).customCards ?? [];
(window as any).customCards.push({
  type: 'sequence-scheduler-card',
  name: 'Sequence Scheduler',
  description: 'Queue one-off sequences of actions from short text lines.',
});

console.info(`sequence-scheduler-card ${CARD_VERSION}`);

