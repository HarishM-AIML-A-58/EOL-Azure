"""Environment shared by the API tests and the browser tests."""

from pathlib import Path

API_KEY_VARS = (
    "OCTOPART_CLIENT_ID",
    "OCTOPART_CLIENT_SECRET",
    "DIGIKEY_CLIENT_ID",
    "DIGIKEY_CLIENT_SECRET",
    "MOUSER_API_KEY",
    "AZURE_OPENAI_API_KEY",
    "AZURE_OPENAI_ENDPOINT",
    "AZURE_OPENAI_DEPLOYMENT",
)

PRIORITY_MAP = [
    {"parameter": "Voltage - Output (Max)", "priority": 1},
    {"parameter": "Package / Case", "priority": 3},
]


def prepare_env(data_dir: Path) -> dict:
    """Environment the app should start with for tests.

    Empty strings are falsy for os.getenv() callers, and python-dotenv does
    not override a variable that is already set, so a developer's .env cannot
    leak live keys into a test run.
    """
    env = {
        "DATA_DIR": str(data_dir),
        "REPORTS_DIR": str(data_dir / "reports"),
        "ENV": "development",
    }
    env.update({name: "" for name in API_KEY_VARS})
    return env
