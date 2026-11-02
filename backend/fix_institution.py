"""
One-time fix: move all students/batches from the 'jupiter' institution
to the correct institution (inst_mit_p) that faculty and admin belong to.

Run once from the backend/ directory:
    python fix_institution.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import text, select
from app.db.session import SessionLocal, ensure_schema
from app.models.identity import Institution

CORRECT_INSTITUTION_ID = "inst_mit_p"
OLD_SLUG = "jupiter"

def main():
    ensure_schema()
    with SessionLocal() as db:
        # Check correct institution exists
        correct = db.get(Institution, CORRECT_INSTITUTION_ID)
        if not correct:
            print(f"ERROR: Institution '{CORRECT_INSTITUTION_ID}' not found in DB!")
            sys.exit(1)
        print(f"Correct institution: '{correct.name}' ({correct.id})")

        # Find old jupiter institution
        old = db.scalars(select(Institution).where(Institution.slug == OLD_SLUG)).first()
        if not old:
            print(f"No '{OLD_SLUG}' institution found — nothing to migrate.")
            # Still verify counts under correct institution
            from sqlalchemy import func
            from app.models.people import StudentProfile
            count = db.scalar(
                select(func.count()).select_from(StudentProfile)
                .where(StudentProfile.institution_id == CORRECT_INSTITUTION_ID)
            )
            print(f"Students already under '{CORRECT_INSTITUTION_ID}': {count}")
            return

        if old.id == CORRECT_INSTITUTION_ID:
            print("Old and correct institution are the same — nothing to migrate.")
            return

        print(f"Migrating from '{old.name}' ({old.id}) → '{correct.name}' ({correct.id})")

        r1 = db.execute(text("UPDATE edux.student_profiles SET institution_id = :new WHERE institution_id = :old"),
                        {"new": CORRECT_INSTITUTION_ID, "old": old.id}).rowcount
        r2 = db.execute(text("UPDATE edux.batches SET institution_id = :new WHERE institution_id = :old"),
                        {"new": CORRECT_INSTITUTION_ID, "old": old.id}).rowcount
        r3 = db.execute(text("UPDATE edux.users SET institution_id = :new WHERE institution_id = :old"),
                        {"new": CORRECT_INSTITUTION_ID, "old": old.id}).rowcount
        r4 = db.execute(text("UPDATE edux.user_roles SET institution_id = :new WHERE institution_id = :old"),
                        {"new": CORRECT_INSTITUTION_ID, "old": old.id}).rowcount

        db.commit()
        print(f"  student_profiles : {r1} rows updated")
        print(f"  batches          : {r2} rows updated")
        print(f"  users            : {r3} rows updated")
        print(f"  user_roles       : {r4} rows updated")

        # Verify
        from sqlalchemy import func
        from app.models.people import StudentProfile
        count = db.scalar(
            select(func.count()).select_from(StudentProfile)
            .where(StudentProfile.institution_id == CORRECT_INSTITUTION_ID)
        )
        print(f"\nTotal students now under '{CORRECT_INSTITUTION_ID}': {count}")
        print("Done! Restart the backend server now.")

if __name__ == "__main__":
    main()
