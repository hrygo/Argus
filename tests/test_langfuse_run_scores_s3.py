from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "services" / "eval-runner"))

from app.db_models import LangfuseRunScoreTaskRecord, LangfuseSyncTaskRecord  # noqa: E402
from app.langfuse_run_scores import LangfuseRunScoreSyncer  # noqa: E402
from app.result_snapshots import create_result_snapshot  # noqa: E402
from test_run_result_s3 import _create_completed_launch  # noqa: E402


class FakeLangfuse:
    def __init__(self):
        self.scores = []
        self.flushed = 0

    def create_score(self, **kwargs):
        self.scores.append(kwargs)

    def flush(self):
        self.flushed += 1


def test_run_scores_are_linked_to_dataset_run_with_stable_ids(setup_runtime):
    db_mgr, _, _, _, _, _ = setup_runtime
    launch_id = _create_completed_launch(db_mgr)
    with db_mgr.get_session() as session:
        launch = session.get(__import__("app.db_models", fromlist=["ExperimentLaunchRecord"]).ExperimentLaunchRecord, launch_id)
        launch.manifest["dataset"]["source"] = "langfuse"
        snapshot = create_result_snapshot(session, launch)
        item_id = session.query(__import__("app.db_models", fromlist=["ExperimentItemExecutionRecord"]).ExperimentItemExecutionRecord).filter_by(
            launch_id=launch_id, dataset_item_id="case-1"
        ).one().id
        session.add(LangfuseSyncTaskRecord(
            id="item-sync-1",
            launch_id=launch_id,
            item_id=item_id,
            dataset_item_id="case-1",
            dataset_version="2026-09-28T00:00:00+00:00",
            dispatch_generation=1,
            trace_id="trace-1",
            dataset_run_name="run",
            scores_payload={"_dataset_run_id": "dataset-run-1"},
            status="SYNCED",
        ))
        session.commit()
        snapshot_id = snapshot.id

    client = FakeLangfuse()
    syncer = LangfuseRunScoreSyncer(db_mgr, client)
    assert syncer.process_batch() == 1
    assert len(client.scores) >= 3
    assert all(score["dataset_run_id"] == "dataset-run-1" for score in client.scores)
    assert all(score["score_id"].startswith("argus-run-") for score in client.scores)
    assert client.flushed == 1
    with db_mgr.get_session() as session:
        task = session.query(LangfuseRunScoreTaskRecord).filter_by(snapshot_id=snapshot_id).one()
        assert task.status == "SYNCED"


def test_seed_source_run_scores_are_skipped(setup_runtime):
    db_mgr, _, _, _, _, _ = setup_runtime
    launch_id = _create_completed_launch(db_mgr)
    with db_mgr.get_session() as session:
        launch = session.get(__import__("app.db_models", fromlist=["ExperimentLaunchRecord"]).ExperimentLaunchRecord, launch_id)
        snapshot = create_result_snapshot(session, launch)
        session.commit()
        snapshot_id = snapshot.id

    assert LangfuseRunScoreSyncer(db_mgr, FakeLangfuse()).process_batch() == 1
    with db_mgr.get_session() as session:
        task = session.query(LangfuseRunScoreTaskRecord).filter_by(snapshot_id=snapshot_id).one()
        assert task.status == "SKIPPED"
