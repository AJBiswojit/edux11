"""
Diagnostic: check what institutions, batches, and students exist in the DB.
Run from backend/: python check_db.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import func, select, text
from app.db.session import SessionLocal, ensure_schema
from app.models.identity import Institution, User
from app.models.people import StudentProfile
from app.models.catalog import Batch

def main():
    ensure_schema()
    with SessionLocal() as db:
        print("=== INSTITUTIONS ===")
        insts = db.scalars(select(Institution)).all()
        for i in insts:
            cnt = db.scalar(select(func.count()).select_from(StudentProfile).where(StudentProfile.institution_id == i.id)) or 0
            print(f"  id={i.id}  slug={i.slug}  name={i.name}  students={cnt}")

        print("\n=== BATCHES (all) ===")
        batches = db.scalars(select(Batch)).all()
        for b in batches:
            cnt = db.scalar(select(func.count()).select_from(StudentProfile).where(StudentProfile.batch_id == b.id)) or 0
            print(f"  id={b.id}  code={b.code}  exam_mode={b.exam_mode}  exam_family={b.exam_family}  institution={b.institution_id}  students={cnt}")

        print("\n=== STUDENT_PROFILES total per institution ===")
        rows = db.execute(
            text("SELECT institution_id, COUNT(*) FROM edux.student_profiles GROUP BY institution_id")
        ).all()
        for r in rows:
            print(f"  institution_id={r[0]}  count={r[1]}")

        print("\n=== SAMPLE ROLL NUMBERS (first 10) ===")
        samples = db.scalars(select(StudentProfile.roll_no).limit(10)).all()
        for r in samples:
            print(f"  roll_no={r}")

        print("\n=== CHECK roll_no 260074 ===")
        p = db.scalars(select(StudentProfile).where(StudentProfile.roll_no == "260074")).first()
        if p:
            u = db.get(User, p.user_id)
            print(f"  FOUND: user_id={p.user_id}  institution_id={p.institution_id}  batch_id={p.batch_id}")
            print(f"  User: email={u.email if u else 'NOT FOUND'}  status={u.status if u else '?'}")
        else:
            print("  NOT FOUND in student_profiles")

if __name__ == "__main__":
    main()
