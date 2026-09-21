import csv
import json

from app.models.asset import Asset
from app.models.export_job import JOB_DONE, JOB_FAILED
from app.services import job_service
from app.services.export_runner import EXPORT_DIR, execute_export
from app.services.queue_worker import run_once


def test_selected_ids_export_writes_csv(client, db_session, monkeypatch, tmp_path) -> None:
    # Arrange
    monkeypatch.setattr("app.services.export_runner.EXPORT_DIR", tmp_path)
    db_session.add_all([
        Asset(id=f"a{i}", title=f"作品 {i}", asset_type="image", status="ready", tags=["精选"], size_bytes=i)
        for i in range(5)
    ])
    db_session.commit()
    response = client.post(
        "/api/export-jobs",
        json={"mode": "SELECTED_IDS", "selected_ids": [f"a{i}" for i in range(5)], "format": "csv"},
        headers={"Idempotency-Key": "runner-1"},
    )
    job_id = response.json()["data"]["id"]

    # Act
    assert run_once(db_session) is True

    # Assert
    job = db_session.get(type(job_service.get_job), job_id) if False else None
    detail = client.get(f"/api/export-jobs/{job_id}").json()["data"]
    assert detail["status"] == JOB_DONE
    with (tmp_path / detail["file"]["name"]).open(encoding="utf-8-sig", newline="") as handle:
        assert len(list(csv.reader(handle))) == 6


def test_selected_ids_over_limit_fails_with_1002(db_session, monkeypatch, tmp_path) -> None:
    # Arrange
    monkeypatch.setattr("app.services.export_runner.EXPORT_DIR", tmp_path)
    from app.models.export_job import ExportJob

    job = ExportJob(
        id="job-limit", format="csv", mode="SELECTED_IDS", selected_ids=[str(i) for i in range(1001)],
        idempotency_key="limit", payload_hash="hash",
    )
    db_session.add(job)
    db_session.commit()

    # Act
    execute_export(db_session, job)

    # Assert
    assert job.status == JOB_FAILED
    assert job.error_code == "1002"


def test_filter_export_applies_excluded_ids(client, db_session, monkeypatch, tmp_path) -> None:
    # Arrange
    monkeypatch.setattr("app.services.export_runner.EXPORT_DIR", tmp_path)
    db_session.add_all([
        Asset(id=f"f{i}", title=f"作品 {i}", asset_type="video", status="ready", tags=[], size_bytes=i)
        for i in range(4)
    ])
    db_session.commit()
    response = client.post(
        "/api/export-jobs",
        json={
            "mode": "FILTER", "filter": {"asset_type": "video"},
            "excluded_ids": ["f1", "outside-filter"], "format": "json",
        },
        headers={"Idempotency-Key": "runner-filter"},
    )
    job_id = response.json()["data"]["id"]

    # Act
    assert run_once(db_session) is True

    # Assert
    detail = client.get(f"/api/export-jobs/{job_id}").json()["data"]
    assert detail["status"] == JOB_DONE
    payload = json.loads((tmp_path / detail["file"]["name"]).read_text(encoding="utf-8"))
    assert {row["id"] for row in payload} == {"f0", "f2", "f3"}


def test_filter_export_over_limit_reports_3001(client, db_session, tmp_path, monkeypatch) -> None:
    # Arrange
    monkeypatch.setattr("app.services.export_runner.EXPORT_DIR", tmp_path)
    db_session.add_all([
        Asset(id=f"many{i}", title=f"作品 {i}", asset_type="image", status="ready", tags=[], size_bytes=i)
        for i in range(1001)
    ])
    db_session.commit()
    response = client.post(
        "/api/export-jobs",
        json={"mode": "FILTER", "filter": {"asset_type": "image"}, "format": "csv"},
        headers={"Idempotency-Key": "runner-filter-limit"},
    )
    job_id = response.json()["data"]["id"]

    # Act
    assert run_once(db_session) is True

    # Assert
    detail = client.get(f"/api/export-jobs/{job_id}").json()["data"]
    assert detail["status"] == JOB_FAILED
    assert detail["error"]["code"] == "3001"
