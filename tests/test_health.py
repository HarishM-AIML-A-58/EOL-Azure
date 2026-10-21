def test_health_reports_ok_with_no_sources_configured(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "lt-core"
    assert body["time"].endswith("Z")
    # The test environment blanks every key, so every source must read false.
    assert body["sources"] == {
        "octopart": False,
        "digikey": False,
        "mouser": False,
        "azure_openai": False,
    }


def test_session_status_mirrors_health_sources(client):
    response = client.get("/api/v1/session_status")

    assert response.status_code == 200
    body = response.json()
    assert body["valid"] is True
    assert all(value is False for value in body["configured_apis"].values())


def test_unknown_api_path_is_404_not_spa_shell(client):
    response = client.get("/api/does-not-exist")

    assert response.status_code == 404
