/** Mirrors the Python `to_dict` shapes. Keep the two in step. */

export type Kind = 'number' | 'percent' | 'select' | 'text';

export interface ActionData {
  action: string; // 'domain.service'
  target: Record<string, unknown>;
  data: Record<string, unknown>;
}

export interface Placeholder {
  key: string;
  field: string;
  kind: Kind;
  default: unknown;
  min: number | null;
  max: number | null;
  options: string[] | null;
  /** Only on templates/list: options read from the live devices. */
  resolved_options?: string[] | null;
}

export interface Template {
  id: string;
  key: string;
  name: string;
  start: ActionData[];
  end: ActionData[];
  placeholders: Placeholder[];
}

export interface Issue {
  code: string;
  detail: string;
}

export interface PreviewRow {
  lineno: number;
  raw: string;
  ok: boolean;
  errors: Issue[];
  warnings: Issue[];
  template_id: string | null;
  template_name: string | null;
  values: Record<string, unknown>;
  start_at: string | null;
  end_at: string | null;
  entity_ids: string[];
  start_actions: ActionData[];
  end_actions: ActionData[];
  /** The start counts from the Queue press (+30m, now), not a clock time. */
  relative: boolean;
}

export interface Preview {
  now: string;
  rows: PreviewRow[];
  token: string;
}

export interface Step {
  id: string;
  phase: 'start' | 'end';
  at: string;
  actions: ActionData[];
  state: 'pending' | 'in_progress';
}

export interface Block {
  id: string;
  line: string;
  template_name: string;
  values: Record<string, unknown>;
  entity_ids: string[];
  created_at: string;
  steps: Step[];
  /** How the start went once done: ran / failed / skipped / skipped_maybe_ran. */
  start_outcome?: string | null;
  start_detail?: string;
}

/** The slice of Home Assistant's frontend `hass` object this card uses. */
export interface Hass {
  callWS<T = any>(msg: Record<string, unknown>): Promise<T>;
  connection: {
    subscribeMessage<T = any>(
      cb: (msg: T) => void,
      msg: Record<string, unknown>,
    ): Promise<() => void | Promise<void>>;
  };
  config?: { time_zone?: string };
  locale?: { language?: string };
  services?: Record<string, Record<string, any>>;
  states?: Record<string, any>;
  user?: { is_admin?: boolean };
  [key: string]: unknown;
}
