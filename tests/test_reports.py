import io
import os

import openpyxl
import pytest

from testenv import PRIORITY_MAP

XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def export(client, part_number: str, manufacturer: str | None = None):
    body = {"eol_part_number": part_number, "priority_map": PRIORITY_MAP}
    if manufacturer:
        body["manufacturer"] = manufacturer
    return client.post("/api/v1/download_report", json=body)


def workbook_text(content: bytes) -> str:
    workbook = openpyxl.load_workbook(io.BytesIO(content), read_only=True)
    cells = []
    for sheet in workbook.worksheets:
        for row in sheet.iter_rows(values_only=True):
            cells.extend(str(value) for value in row if value is not None)
    return "\n".join(cells)


def test_download_report_requires_login(client):
    assert export(client, "LM317T").status_code == 401


def test_export_builds_a_real_workbook_from_the_catalogue(user, app_module):
    response = export(user, "LM317T", manufacturer="Texas Instruments")

    assert response.status_code == 200
    assert response.headers["content-type"] == XLSX
    disposition = response.headers["content-disposition"]
    assert 'filename="EOL_Alternatives_LM317T_' in disposition
    assert disposition.endswith('.xlsx"')

    text = workbook_text(response.content)
    assert "LM317T" in text
    # At least one cross-referenced candidate made it into the comparison.
    assert "LM317EMP/NOPB" in text or "LM1117T-ADJ/NOPB" in text

    # The workbook was kept on disk, and the temp file was cleaned up.
    kept = os.listdir(app_module.REPORTS_DIR)
    assert any(name.startswith("EOL_Alternatives_LM317T_") and name.endswith(".xlsx") for name in kept)
    assert not any(name.endswith("_temp.xlsx") for name in kept)


def test_export_filename_is_filesystem_safe_for_slashed_part_numbers(user):
    response = export(user, "MCP73831T-2ACI/OT")

    assert response.status_code == 200
    disposition = response.headers["content-disposition"]
    assert "/" not in disposition.split("filename=")[1]
    assert "MCP73831T-2ACI-OT" in disposition


def test_export_unknown_part_is_404_without_keys(user):
    response = export(user, "NOT-A-REAL-PART-999")

    assert response.status_code == 404
    assert "Configure the distributor APIs" in response.json()["detail"]


def test_reports_list_and_redownload_are_scoped_to_the_owner(user, make_user):
    other, _, _ = make_user()
    assert user.get("/api/v1/reports").json() == {"success": True, "count": 0, "reports": []}

    first = export(user, "LM317T")
    assert first.status_code == 200

    listing = user.get("/api/v1/reports").json()
    assert listing["count"] == 1
    report = listing["reports"][0]
    assert report["part_number"] == "LM317T"
    assert report["manufacturer"] is None
    assert report["size_bytes"] == len(first.content)
    assert report["filename"].endswith(".xlsx")

    again = user.get(f"/api/v1/reports/{report['filename']}")
    assert again.status_code == 200
    assert again.headers["content-type"] == XLSX
    assert again.content == first.content

    # The other user can neither list nor fetch it.
    assert other.get("/api/v1/reports").json()["count"] == 0
    assert other.get(f"/api/v1/reports/{report['filename']}").status_code == 404


def test_redownload_rejects_unknown_and_traversal_filenames(user):
    assert user.get("/api/v1/reports/does-not-exist.xlsx").status_code == 404
    assert user.get("/api/v1/reports/..%2F..%2Fetc%2Fpasswd").status_code == 404


def test_reports_list_skips_files_removed_from_disk(user, app_module):
    response = export(user, "ULN2003AN")
    assert response.status_code == 200
    filename = user.get("/api/v1/reports").json()["reports"][0]["filename"]

    os.remove(os.path.join(app_module.REPORTS_DIR, filename))

    listing = user.get("/api/v1/reports").json()
    assert filename not in [row["filename"] for row in listing["reports"]]
    assert user.get(f"/api/v1/reports/{filename}").status_code == 404


@pytest.mark.parametrize("limit", [0, 1])
def test_reports_list_honours_limit(user, limit):
    assert export(user, "LM317T").status_code == 200
    assert export(user, "TL074CN").status_code == 200

    listing = user.get("/api/v1/reports", params={"limit": limit}).json()

    assert listing["count"] == limit
