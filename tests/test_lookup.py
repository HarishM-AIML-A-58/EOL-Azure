from urllib.parse import quote

import pytest

from testenv import PRIORITY_MAP


def test_lookup_requires_login(client):
    response = client.get("/api/v1/lookup_eol_specs/LM317T")

    assert response.status_code == 401


def test_lookup_known_part_returns_specs_from_catalogue(user):
    response = user.get("/api/v1/lookup_eol_specs/LM317T")

    assert response.status_code == 200
    body = response.json()
    assert body["part_number"] == "LM317T"

    specs = {row["parameter"]: row["value"] for row in body["specs"]}
    assert specs["ManufacturerPartNumber"] == "LM317T"
    assert specs["Manufacturer"]
    assert len(specs) > 10
    # Internal bookkeeping keys must not reach the client.
    assert "_internal_id" not in specs
    assert "_source" not in specs


def test_lookup_is_case_insensitive(user):
    response = user.get("/api/v1/lookup_eol_specs/lm317t")

    assert response.status_code == 200
    specs = {row["parameter"]: row["value"] for row in response.json()["specs"]}
    assert specs["ManufacturerPartNumber"] == "LM317T"


def test_lookup_part_with_slash_in_number(user):
    # Catalogue part numbers can contain '/', which the SPA URL-encodes.
    response = user.get(f"/api/v1/lookup_eol_specs/{quote('MCP73831T-2ACI/OT', safe='')}")

    assert response.status_code == 200
    assert response.json()["part_number"] == "MCP73831T-2ACI/OT"


def test_lookup_unknown_part_is_404(user):
    response = user.get("/api/v1/lookup_eol_specs/NOT-A-REAL-PART-999")

    assert response.status_code == 404
    assert "NOT-A-REAL-PART-999" in response.json()["detail"]


def test_search_history_records_lookups_newest_first_per_user(user, make_user):
    other, _, _ = make_user()

    assert user.get("/api/v1/lookup_eol_specs/LM317T").status_code == 200
    assert (
        user.get("/api/v1/lookup_eol_specs/ULN2003AN", params={"manufacturer": "TI"}).status_code
        == 200
    )

    response = user.get("/api/v1/search-history")
    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 2
    assert [row["part_number"] for row in body["history"]] == ["ULN2003AN", "LM317T"]
    assert body["history"][0]["manufacturer"] == "TI"
    assert body["history"][1]["manufacturer"] is None

    limited = user.get("/api/v1/search-history", params={"limit": 1}).json()
    assert limited["count"] == 1
    assert limited["history"][0]["part_number"] == "ULN2003AN"

    # Another user's history is their own.
    assert other.get("/api/v1/search-history").json()["count"] == 0


def test_search_history_requires_login(client):
    assert client.get("/api/v1/search-history").status_code == 401


def test_failed_lookup_is_not_recorded_in_history(user):
    user.get("/api/v1/lookup_eol_specs/NOT-A-REAL-PART-999")

    assert user.get("/api/v1/search-history").json()["count"] == 0


def test_find_alternatives_excludes_the_original_part(user):
    response = user.post(
        "/api/v1/find_alternatives",
        json={"eol_part_number": "LM317T", "priority_map": PRIORITY_MAP},
    )

    assert response.status_code == 200
    alternatives = response.json()["alternatives"]
    assert len(alternatives) >= 2
    assert all(set(item) == {"mpn", "manufacturer"} for item in alternatives)
    mpns = [item["mpn"] for item in alternatives]
    assert "LM317T" not in mpns
    assert len(mpns) == len(set(mpns)), "duplicate candidates"


def test_find_alternatives_unknown_part_returns_empty_list(user):
    response = user.post(
        "/api/v1/find_alternatives",
        json={"eol_part_number": "NOT-A-REAL-PART-999", "priority_map": []},
    )

    assert response.status_code == 200
    assert response.json() == {"alternatives": []}


@pytest.mark.parametrize(
    "payload",
    [
        {},  # missing everything
        {"eol_part_number": "LM317T"},  # missing priority_map
        {"eol_part_number": "LM317T", "priority_map": [{"parameter": "x"}]},  # missing priority
        {"eol_part_number": "LM317T", "priority_map": [{"parameter": "x", "priority": "high"}]},
    ],
)
def test_find_alternatives_validates_request_body(user, payload):
    response = user.post("/api/v1/find_alternatives", json=payload)

    assert response.status_code == 422
