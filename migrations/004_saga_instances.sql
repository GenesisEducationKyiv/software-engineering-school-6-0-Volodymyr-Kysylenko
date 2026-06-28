CREATE TABLE IF NOT EXISTS saga_instances (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correlation_id UUID NOT NULL UNIQUE,
    type           TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'started'
                     CHECK (status IN ('started', 'completed', 'failed')),
    payload        JSONB NOT NULL,
    last_error     TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS saga_instances_status_idx
    ON saga_instances (status)
    WHERE status = 'started';
