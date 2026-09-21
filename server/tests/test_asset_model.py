from sqlmodel import select

from app.models.asset import Asset


def test_asset_model_insert_and_filter_by_type(db_session) -> None:
    # Arrange
    assets = [
        Asset(id="a1", title="图一", asset_type="image", status="ready", tags=["精选"], size_bytes=1),
        Asset(id="a2", title="视频一", asset_type="video", status="draft", tags=["素材"], size_bytes=2),
        Asset(id="a3", title="图二", asset_type="image", status="failed", tags=["教程"], size_bytes=3),
    ]
    db_session.add_all(assets)
    db_session.commit()

    # Act
    result = db_session.exec(select(Asset).where(Asset.asset_type == "image")).all()

    # Assert
    assert len(result) == 2
    assert {item.id for item in result} == {"a1", "a3"}
    assert result[0].to_dto()["tags"]
