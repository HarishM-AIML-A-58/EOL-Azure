"""
Demo account seeding.

Populates `hr_demo_user` with a workload that reads like one engineer's last
three months: lookups clustered into working sessions on weekdays, the same
handful of parts revisited as an investigation develops, and real exported
workbooks on disk behind the Reports page.

Two entry points:

    python seed_demo.py            run it directly against DATA_DIR
    SEED_DEMO_DATA=1               app.py calls seed_if_requested() on startup

Idempotent. It will not touch an account that already has history unless
`--force` (CLI) or `SEED_DEMO_FORCE=1` is given, so a restart on App Service
never duplicates rows or rewrites the reviewer's own work.
"""

from __future__ import annotations

import os
import random
import sys
from datetime import datetime, timedelta
from typing import List, Tuple

from database import SessionLocal, User, SearchHistory, Report, init_db
from auth_utils import hash_password
import demo_data

DEMO_USERNAME = "hr_demo_user"
#: Matches the "Instant demo access" button in frontend/src/components/Login.jsx.
DEMO_PASSWORD = "DemoPassword123!"

#: A deterministic seed keeps the demo identical across hosts, which matters
#: when a screenshot in a report has to match what the reviewer sees.
RANDOM_SEED = 20260726

# Investigations, ordered oldest to newest. Each is a part the engineer worked
# on and the number of times they came back to it — obsolescence work is
# iterative, so the counts are uneven on purpose.
#
# The totals are deliberately kept under the search-history endpoint's 50-row
# limit. Seeding past it would leave the dashboard's "Total lookups" reporting
# the page cap instead of the account's real workload.
INVESTIGATIONS: List[Tuple[str, str, int]] = [
    ("AT89C51-24PC", "Microchip Technology", 4),   # hard obsolete, most revisited
    ("MAX232CPE", "Analog Devices", 3),
    ("LM317T", "Texas Instruments", 4),
    ("EE-SX4070", "Omron Electronics", 2),
    ("PIC16F877A-I/P", "Microchip Technology", 3),
    ("TL074CN", "Texas Instruments", 2),
    ("ULN2003AN", "Texas Instruments", 2),
    ("LM2596S-5.0", "Texas Instruments", 2),
    ("STM32F103C8T6", "STMicroelectronics", 3),
    ("MCP73831T-2ACI/OT", "Microchip Technology", 2),
]

#: Which investigations produced an exported workbook, and how many.
#: Not every lookup ends in an export — that is what makes the ratio credible.
EXPORTED = {
    "AT89C51-24PC": 2,
    "MAX232CPE": 1,
    "LM317T": 2,
    "PIC16F877A-I/P": 1,
    "EE-SX4070": 1,
    "LM2596S-5.0": 1,
    "STM32F103C8T6": 2,
}


def _working_moment(rng: random.Random, day: datetime) -> datetime:
    """A plausible clock time on a working day.

    Weighted to mid-morning and mid-afternoon, avoiding the lunch hour, because
    a history whose timestamps are uniformly spread across 24 hours is the
    first thing that gives seeded data away.
    """
    block = rng.choices(["morning", "afternoon", "evening"], weights=[5, 4, 1])[0]
    if block == "morning":
        hour, minute = rng.randint(9, 11), rng.randint(0, 59)
    elif block == "afternoon":
        hour, minute = rng.randint(14, 16), rng.randint(0, 59)
    else:
        hour, minute = rng.randint(17, 18), rng.randint(0, 59)
    return day.replace(hour=hour, minute=minute, second=rng.randint(0, 59), microsecond=0)


def _weekday_offsets(rng: random.Random, count: int, span_days: int) -> List[int]:
    """`count` distinct weekday offsets within the last `span_days`, newest-biased."""
    today = datetime.utcnow()
    candidates = []
    for offset in range(span_days):
        day = today - timedelta(days=offset)
        if day.weekday() < 5:                      # Mon-Fri only
            candidates.append(offset)
    # Recent weeks carry more weight: current work is denser than old work.
    weights = [max(1, span_days - offset) for offset in candidates]
    chosen: List[int] = []
    pool, pool_weights = list(candidates), list(weights)
    for _ in range(min(count, len(pool))):
        pick = rng.choices(range(len(pool)), weights=pool_weights)[0]
        chosen.append(pool.pop(pick))
        pool_weights.pop(pick)
    return sorted(chosen, reverse=True)            # oldest first


def _build_history(rng: random.Random) -> List[Tuple[str, str, datetime]]:
    """(part_number, manufacturer, searched_at) for the whole account."""
    today = datetime.utcnow()
    rows: List[Tuple[str, str, datetime]] = []

    # One session per investigation-visit, spread over ~11 weeks of weekdays.
    total_visits = sum(count for _, _, count in INVESTIGATIONS)
    offsets = _weekday_offsets(rng, total_visits, span_days=77)

    visits: List[Tuple[str, str]] = []
    for part, manufacturer, count in INVESTIGATIONS:
        visits.extend([(part, manufacturer)] * count)

    # Keep each investigation's visits in ascending time but interleave the
    # investigations, which is how parallel work actually lands in a log.
    rng.shuffle(visits)

    for (part, manufacturer), offset in zip(visits, offsets):
        day = today - timedelta(days=offset)
        moment = _working_moment(rng, day)
        rows.append((part, manufacturer, moment))

        # A session is rarely one lookup: an engineer checks the candidate they
        # were given, or re-runs the same part after changing the weighting.
        if rng.random() < 0.35:
            follow_up = moment + timedelta(minutes=rng.randint(3, 40))
            if follow_up < today:
                neighbour = rng.choice(INVESTIGATIONS)
                if rng.random() < 0.5:
                    rows.append((part, manufacturer, follow_up))
                else:
                    rows.append((neighbour[0], neighbour[1], follow_up))

    # Guarantee the dashboard's seven-day activity chart has something to draw
    # on several distinct days, including today.
    for days_ago in (0, 0, 1, 2, 3, 4, 6):
        day = today - timedelta(days=days_ago)
        part, manufacturer, _ = rng.choice(INVESTIGATIONS)
        moment = _working_moment(rng, day)
        if moment > today:                          # never seed the future
            moment = today - timedelta(minutes=rng.randint(5, 90))
        rows.append((part, manufacturer, moment))

    rows.sort(key=lambda row: row[2])
    return rows


def _write_workbook(part_number: str, path: str, generated_at: datetime) -> bool:
    """Generate a real colour-coded workbook for `part_number`.

    Uses the product's own writer, so a seeded download is byte-for-byte the
    kind of file the export step produces — not a placeholder.
    """
    merged = demo_data.resolve_merged(part_number, limit=5)
    if not merged:
        return False

    from excelwriter import ExcelWriter
    temp_path = path.replace(".xlsx", "_seed_temp.xlsx")
    ExcelWriter().create_comparison(
        parts_data=merged,
        filename=temp_path,
        original_part=part_number,
        generated_at=generated_at,
    )

    try:
        from colour_azure import apply_color_coding_to_excel
        apply_color_coding_to_excel(temp_path, path)
    except Exception as exc:                        # noqa: BLE001 - colour is optional
        print(f"[seed] colour coding skipped for {part_number}: {exc}")
        os.replace(temp_path, path)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
    return os.path.isfile(path)


def seed(force: bool = False, reports_dir: str | None = None) -> dict:
    """Create the demo account and its workload. Returns a summary dict."""
    init_db()
    rng = random.Random(RANDOM_SEED)

    if reports_dir is None:
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        reports_dir = os.getenv("REPORTS_DIR") or os.path.join(backend_dir, "reports")
    os.makedirs(reports_dir, exist_ok=True)

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == DEMO_USERNAME).first()
        created_user = False
        if not user:
            user = User(
                username=DEMO_USERNAME,
                password_hash=hash_password(DEMO_PASSWORD),
                created_at=datetime.utcnow() - timedelta(days=84),
                last_login=datetime.utcnow(),
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            created_user = True

        existing = db.query(SearchHistory).filter(SearchHistory.user_id == user.id).count()
        if existing and not force:
            return {
                "seeded": False,
                "reason": f"{DEMO_USERNAME} already has {existing} lookups; pass force to replace",
                "created_user": created_user,
            }

        if force:
            db.query(SearchHistory).filter(SearchHistory.user_id == user.id).delete()
            for record in db.query(Report).filter(Report.user_id == user.id).all():
                stale = os.path.join(reports_dir, record.filename)
                if os.path.isfile(stale):
                    os.remove(stale)
                db.delete(record)
            db.commit()

        # An account that has been in use for a while, last seen just now.
        user.created_at = datetime.utcnow() - timedelta(days=84)
        user.last_login = datetime.utcnow() - timedelta(minutes=7)

        history = _build_history(rng)
        for part_number, manufacturer, searched_at in history:
            db.add(SearchHistory(
                user_id=user.id,
                part_number=part_number,
                manufacturer=manufacturer,
                searched_at=searched_at,
            ))
        db.commit()

        # Reports: anchor each export to a real lookup of that part, a few
        # minutes after it, so the two pages tell a consistent story.
        lookups_by_part: dict[str, List[datetime]] = {}
        for part_number, _mfr, searched_at in history:
            lookups_by_part.setdefault(part_number, []).append(searched_at)

        manufacturers = {part: mfr for part, mfr, _ in INVESTIGATIONS}
        written = 0
        for part_number, wanted in EXPORTED.items():
            moments = sorted(lookups_by_part.get(part_number, []), reverse=True)[:wanted]
            for moment in moments:
                created_at = moment + timedelta(minutes=rng.randint(4, 25))
                safe_part = "".join(
                    c if c.isalnum() or c in "-_." else "-" for c in part_number
                )
                filename = (
                    f"EOL_Alternatives_{safe_part}_"
                    f"{created_at.strftime('%Y%m%d_%H%M%S')}.xlsx"
                )
                path = os.path.join(reports_dir, filename)
                if not _write_workbook(part_number, path, created_at):
                    continue
                db.add(Report(
                    user_id=user.id,
                    filename=filename,
                    part_number=part_number,
                    manufacturer=manufacturers.get(part_number),
                    created_at=created_at,
                ))
                written += 1
        db.commit()

        return {
            "seeded": True,
            "created_user": created_user,
            "username": DEMO_USERNAME,
            "lookups": len(history),
            "distinct_parts": len({row[0] for row in history}),
            "workbooks": written,
            "reports_dir": reports_dir,
            "span_days": (history[-1][2] - history[0][2]).days if history else 0,
        }
    finally:
        db.close()


def seed_if_requested() -> None:
    """Startup hook. Seeds only when SEED_DEMO_DATA is set to a truthy value.

    App Service runs uvicorn with two workers, so this executes once per worker,
    concurrently, against one SQLite file. An exclusive-create lock file decides
    which worker owns the seeding; the other returns immediately rather than
    racing it into a UNIQUE violation on the username and half-seeding the
    account.
    """
    flag = (os.getenv("SEED_DEMO_DATA") or "").strip().lower()
    if flag not in {"1", "true", "yes", "on"}:
        return
    force = (os.getenv("SEED_DEMO_FORCE") or "").strip().lower() in {"1", "true", "yes", "on"}

    from database import DATA_DIR
    lock_path = os.path.join(DATA_DIR, ".seed.lock")
    try:
        # O_EXCL is the atomic part: exactly one worker can create this.
        fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        print("[seed] another worker holds the seed lock; skipping", flush=True)
        return
    except OSError as exc:
        print(f"[seed] could not take the seed lock ({exc}); skipping", flush=True)
        return

    try:
        os.write(fd, f"{os.getpid()} {datetime.utcnow().isoformat()}\n".encode())
        os.close(fd)
        summary = seed(force=force)
        print(f"[seed] {summary}", flush=True)
    except Exception as exc:                        # noqa: BLE001 - never block boot
        import traceback
        print(f"[seed] demo seeding failed: {exc}", flush=True)
        traceback.print_exc()
        sys.stdout.flush()
    finally:
        # The lock is per-boot, not a permanent marker: seed() is idempotent on
        # its own, and leaving the file behind would block a later intentional
        # re-seed via SEED_DEMO_FORCE.
        try:
            os.remove(lock_path)
        except OSError:
            pass


if __name__ == "__main__":
    result = seed(force="--force" in sys.argv)
    for key, value in result.items():
        print(f"{key:16} {value}")
