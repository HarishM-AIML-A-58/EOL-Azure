import io
import re

import openpyxl
from playwright.sync_api import Page, expect

from ui_helpers import sign_in


def test_login_page_renders(page: Page, live_server):
    page.goto(f"{live_server}/login")

    expect(page.get_by_role("heading", name="Sign in")).to_be_visible()
    expect(page.get_by_label("Username")).to_be_visible()
    expect(page.get_by_label("Password", exact=True)).to_be_visible()
    expect(page.get_by_role("button", name="Instant demo access")).to_be_visible()


def test_protected_page_redirects_to_login(page: Page, live_server):
    page.goto(f"{live_server}/analysis")

    page.wait_for_url("**/login")
    expect(page.get_by_role("heading", name="Sign in")).to_be_visible()


def test_wrong_password_shows_an_alert_and_stays_on_login(page: Page, live_server, account):
    username, _ = account
    page.goto(f"{live_server}/login")

    page.get_by_label("Username").fill(username)
    page.get_by_label("Password", exact=True).fill("definitely-wrong")
    page.get_by_role("button", name="Sign in").click()

    expect(page.get_by_role("alert")).to_contain_text("Invalid username or password")
    expect(page).to_have_url(re.compile(r"/login$"))


def test_register_then_sign_in_lands_on_dashboard(page: Page, live_server):
    username = f"ui_reg_{page.context.browser.version.replace('.', '')[-4:]}{id(page) % 10000}"
    password = "Str0ng-pass-123"

    page.goto(f"{live_server}/register")
    page.get_by_label("Username").fill(username)
    page.get_by_label("Password", exact=True).fill(password)
    page.get_by_label("Confirm password").fill(password)
    page.get_by_role("button", name="Create account").click()

    page.wait_for_url("**/login")
    sign_in(page, live_server, username, password)
    expect(page.get_by_role("heading", name=f"Welcome back, {username}")).to_be_visible()


def test_register_rejects_mismatched_passwords_client_side(page: Page, live_server):
    page.goto(f"{live_server}/register")
    page.get_by_label("Username").fill("mismatch_user")
    page.get_by_label("Password", exact=True).fill("Str0ng-pass-123")
    page.get_by_label("Confirm password").fill("Str0ng-pass-124")
    page.get_by_role("button", name="Create account").click()

    expect(page.get_by_role("alert")).to_contain_text("do not match")
    expect(page).to_have_url(re.compile(r"/register$"))


def test_full_analysis_flow_lookup_alternatives_export(page: Page, live_server, account):
    username, password = account
    sign_in(page, live_server, username, password)

    page.goto(f"{live_server}/analysis")
    page.get_by_role("button", name="LM317 regulator").click()

    status = page.get_by_role("status")
    expect(status).to_contain_text(re.compile(r"Loaded \d+ parameters for LM317T"))
    expect(page.get_by_text("Under analysis")).to_be_visible()

    # Step 2: weighting controls are on the page and respond.
    first_radio = page.get_by_role("radio", name="P1").first
    first_radio.click()
    expect(first_radio).to_have_attribute("aria-checked", "true")

    # Step 3: cross-referenced alternatives from the offline catalogue.
    page.get_by_role("button", name="Find alternatives").click()
    expect(status).to_contain_text(re.compile(r"Found \d+ candidates"))
    expect(page.get_by_text("LM317EMP/NOPB")).to_be_visible()

    # Step 4: the export is a real workbook.
    with page.expect_download() as download_info:
        page.get_by_role("button", name="Export workbook").click()
    download = download_info.value
    assert download.suggested_filename.startswith("FFF_Report_LM317T_")
    assert download.suggested_filename.endswith(".xlsx")

    # Playwright saves the download under a name with no extension, and
    # openpyxl checks the extension, so hand it the bytes instead.
    workbook = openpyxl.load_workbook(io.BytesIO(download.path().read_bytes()), read_only=True)
    cells = [str(c) for sheet in workbook.worksheets for row in sheet.iter_rows(values_only=True) for c in row if c]
    assert any("LM317T" in c for c in cells)

    expect(status).to_contain_text("Workbook downloaded")

    # The export and the lookup are visible on their own pages.
    page.goto(f"{live_server}/reports")
    expect(page.get_by_text(re.compile(r"EOL_Alternatives_LM317T_.*\.xlsx"))).to_be_visible()

    page.goto(f"{live_server}/history")
    expect(page.get_by_role("heading", name="Lookup history")).to_be_visible()
    expect(page.get_by_text("LM317T", exact=True).first).to_be_visible()


def test_sign_out_ends_the_session(page: Page, live_server, account):
    username, password = account
    sign_in(page, live_server, username, password)

    page.get_by_role("button", name="Sign out").first.click()

    page.wait_for_url("**/login")
    page.goto(f"{live_server}/dashboard")
    page.wait_for_url("**/login")
