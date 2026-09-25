from app.models.asset import Asset


def test_assets_default_pagination_returns_twenty_and_total(client, db_session) -> None:
    # Arrange
    db_session.add_all([
        Asset(id=f"a{i}", title=f"作品 {i}", asset_type="image", status="ready", tags=["精选"], size_bytes=i)
        for i in range(25)
    ])
    db_session.commit()

    # Act
    response = client.get("/api/assets")

    # Assert
    data = response.json()["data"]
    assert response.status_code == 200
    assert len(data["items"]) == 20
    assert data["total"] == 25


def test_assets_filters_keyword_case_insensitively(client, db_session) -> None:
    # Arrange
    db_session.add_all([
        Asset(id="a1", title="Summer Film", asset_type="video", status="ready", tags=["精选"], size_bytes=1),
        Asset(id="a2", title="Winter Film", asset_type="video", status="ready", tags=["精选"], size_bytes=2),
    ])
    db_session.commit()

    # Act
    response = client.get("/api/assets", params={"keyword": "summer", "asset_type": "video"})

    # Assert
    data = response.json()["data"]
    assert data["total"] == 1
    assert data["items"][0]["id"] == "a1"


def test_assets_invalid_page_size_returns_1001(client) -> None:
    # Arrange / Act
    response = client.get("/api/assets", params={"page_size": 0})

    # Assert
    assert response.status_code == 422
    assert response.json()["code"] == 1001
