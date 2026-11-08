"""Constants for Sequence Scheduler."""

DOMAIN = "sequence_scheduler"
TITLE = "Sequence Scheduler"

CONF_GRACE_MINUTES = "grace_minutes"
DEFAULT_GRACE_MINUTES = 10
MIN_GRACE_MINUTES = 1
MAX_GRACE_MINUTES = 120

# Same values as ha-shabbat-scheduler's engine.
RETRY_ATTEMPTS = 3
RETRY_DELAY_SECONDS = 30

EVENT_STEP_DUE = "sequence_scheduler_step_due"
EVENT_STEP_RESULT = "sequence_scheduler_step_result"
SIGNAL_QUEUE_CHANGED = "sequence_scheduler_queue_changed"
