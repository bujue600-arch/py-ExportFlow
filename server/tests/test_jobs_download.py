from app.models.export_job import ExportJob
from app.services import job_service


def test_download_non_done_returns_state_conflict(client) -> None:
    # Arrange
    response = client.post(
        "/api/export-jobs",
        json={"mode": "SELECTED_IDS", "selected_ids": ["a1"], "format": "csv"},
        headers={"Idempotency-Key": "download-1"},
    )
    job_id = response.json()["data"]["id"]

    # Act
    download = client.get(f"/api/export-jobs/{job_id}/download")

    # Assert
    assert download.status_code == 409
    assert download.json()["code"] == 2002


def test_download_done_returns_file(client, db_session, tmp_path, monkeypatch) -> None:
    # Arrange
    monkeypatch.setattr("app.api.jobs_download.EXPORT_DIR", tmp_path)
    path = tmp_path / "export.csv"
    path.write_text("id,title\na1,作品\n", encoding="utf-8")
    job = ExportJob(id="job-download", format="csv", mode="SELECTED_IDS", selected_ids=["a1"], idempotency_key="download-2", payload_hash="hash")
    db_session.add(job)
    db_session.commit()
    job_service.complete_job(db_session, job, file_name=path.name, file_size=path.stat().st_size, total=1)

    # Act
    response = client.get("/api/export-jobs/job-download/download")

    # Assert
    assert response.status_code == 200
    assert "attachment" in response.headers["content-disposition"]
    assert "id,title" in response.text


def test_download_done_without_file_returns_4001(client, db_session, tmp_path, monkeypatch) -> None:
    # Arrange
    monkeypatch.setattr("app.api.jobs_download.EXPORT_DIR", tmp_path)
    job = ExportJob(
        id="job-expired", format="csv", mode="SELECTED_IDS", selected_ids=["a1"],
        idempotency_key="download-expired", payload_hash="hash",
    )
    db_session.add(job)
    db_session.commit()
    job_service.complete_job(db_session, job, file_name="missing.csv", file_size=10, total=1)

    # Act
    response = client.get("/api/export-jobs/job-expired/download")

    # Assert
    assert response.status_code == 410
    assert response.json()["code"] == 4001
