/** Every websocket call the card makes. Mirrors websocket_api.py. */
import type { Block, Hass, Issue, Preview, Template } from './types';

export class Api {
  constructor(private readonly hass: Hass) {}

  async listTemplates(): Promise<Template[]> {
    const r = await this.hass.callWS<{ templates: Template[] }>({
      type: 'sequence_scheduler/templates/list',
    });
    return r.templates;
  }

  async saveTemplate(template: Partial<Template>): Promise<Template> {
    const r = await this.hass.callWS<{ template: Template }>({
      type: 'sequence_scheduler/templates/save',
      template,
    });
    return r.template;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await this.hass.callWS({ type: 'sequence_scheduler/templates/delete', template_id: templateId });
  }

  preview(text: string): Promise<Preview> {
    return this.hass.callWS<Preview>({ type: 'sequence_scheduler/preview', text });
  }

  queue(
    text: string,
    now: string,
    token: string,
  ): Promise<{ queued: number; refused?: { lineno: number; raw: string; errors: Issue[] }[] }> {
    return this.hass.callWS({ type: 'sequence_scheduler/queue', text, now, token });
  }

  async cancel(blockId: string, runEnd: boolean): Promise<void> {
    await this.hass.callWS({
      type: 'sequence_scheduler/queue/cancel',
      block_id: blockId,
      run_end: runEnd,
    });
  }

  subscribeQueue(cb: (blocks: Block[]) => void): Promise<() => void | Promise<void>> {
    return this.hass.connection.subscribeMessage<{ blocks: Block[] }>(
      (msg) => cb(msg.blocks),
      { type: 'sequence_scheduler/queue/subscribe' },
    );
  }
}
