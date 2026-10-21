def sign_in(page, live_server, username, password):
    page.goto(f"{live_server}/login")
    page.get_by_label("Username").fill(username)
    page.get_by_label("Password", exact=True).fill(password)
    page.get_by_role("button", name="Sign in").click()
    page.wait_for_url("**/dashboard")
