ALTER TABLE experiment_item_executions ADD COLUMN langfuse_trace_url VARCHAR(2048);

-- Immutable result snapshots, approved per-environment baselines, and run-score outbox.
CREATE TABLE run_result_snapshots (
    id VARCHAR(64) PRIMARY KEY,
    launch_id VARCHAR(64) NOT NULL REFERENCES experiment_launches(id) ON DELETE CASCADE,
    agent_id VARCHAR(128) NOT NULL,
    revision INTEGER NOT NULL,
    source_result_digest VARCHAR(64) NOT NULL,
    manifest_digest VARCHAR(64) NOT NULL,
    manifest JSON NOT NULL,
    summary JSON NOT NULL,
    items JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_run_result_snapshots_launch_revision UNIQUE (launch_id, revision),
    CONSTRAINT uq_run_result_snapshots_launch_digest UNIQUE (launch_id, source_result_digest)
);
CREATE INDEX idx_run_result_snapshots_agent ON run_result_snapshots(agent_id, created_at);

CREATE TABLE baseline_bindings (
    agent_id VARCHAR(128) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    environment VARCHAR(64) NOT NULL,
    result_snapshot_id VARCHAR(64) NOT NULL REFERENCES run_result_snapshots(id) ON DELETE CASCADE,
    revision INTEGER NOT NULL,
    updated_by VARCHAR(128),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (agent_id, environment)
);

CREATE TABLE langfuse_run_score_tasks (
    id VARCHAR(64) PRIMARY KEY,
    launch_id VARCHAR(64) NOT NULL REFERENCES experiment_launches(id) ON DELETE CASCADE,
    snapshot_id VARCHAR(64) NOT NULL REFERENCES run_result_snapshots(id) ON DELETE CASCADE,
    task_type VARCHAR(32) NOT NULL DEFAULT 'RUN_SUMMARY',
    scores_payload JSON NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    owner_id VARCHAR(128),
    claim_token VARCHAR(64),
    lease_expires_at TIMESTAMP,
    attempts INTEGER NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_langfuse_run_score_snapshot UNIQUE (snapshot_id, task_type)
);
CREATE INDEX idx_langfuse_run_score_retry ON langfuse_run_score_tasks(status, next_retry_at, lease_expires_at);
