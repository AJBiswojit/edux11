"""
Seed Script: Insert 103 NEET + 98 JEE students into inst_mit_p.

Run from backend/ with venv active:
    python seed_students.py

Uses the existing NEET/JEE batches already in the DB:
    NEET → batch_neet_2027_a (first 52) + batch_neet_2027_b (remaining 51)
    JEE  → batch_jee_2027_a  (first 49) + batch_jee_2027_b  (remaining 49)

Students login with roll number (e.g. 260074) + password Jupiter@123
Re-running is safe — existing roll numbers are skipped.
"""

import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import select, text
from app.db.session import SessionLocal, ensure_schema
from app.core.security import hash_password
from app.models.identity import Institution, Role, User, UserRole
from app.models.people import StudentProfile
from app.models.catalog import Batch

# ── Fixed IDs — already confirmed in DB ───────────────────────────────────────
INSTITUTION_ID  = "inst_mit_p"
DEFAULT_PASSWORD = "Jupiter@123"

# Existing batch IDs confirmed by check_db.py
NEET_BATCH_A = "batch_neet_2027_a"
NEET_BATCH_B = "batch_neet_2027_b"
JEE_BATCH_A  = "batch_jee_2027_a"
JEE_BATCH_B  = "batch_jee_2027_b"

# ── NEET Students (103) ────────────────────────────────────────────────────────
NEET_STUDENTS = [
    # NEET BATCH-1  → batch_neet_2027_a
    {"roll_no": "260203", "name": "ABHIPSA SWAIN",                "batch": "a"},
    {"roll_no": "260204", "name": "ABHIPSA TRIPATHY",             "batch": "a"},
    {"roll_no": "260211", "name": "ANKITA MEHER",                 "batch": "a"},
    {"roll_no": "260212", "name": "ANKITA PATTANAIK",             "batch": "a"},
    {"roll_no": "260214", "name": "ANSHUMAN MISHRA",              "batch": "a"},
    {"roll_no": "260215", "name": "Anwesha Hota",                 "batch": "a"},
    {"roll_no": "260216", "name": "ARIYA PRIYADARSHINI",          "batch": "a"},
    {"roll_no": "260217", "name": "ARPIT MOHANTY",                "batch": "a"},
    {"roll_no": "260218", "name": "ARPITA MALIK",                 "batch": "a"},
    {"roll_no": "260224", "name": "AYUSH BAL",                    "batch": "a"},
    {"roll_no": "260226", "name": "BHAKTI P.DAS",                 "batch": "a"},
    {"roll_no": "260227", "name": "BIBHU PRASAD PRADHAN",         "batch": "a"},
    {"roll_no": "260235", "name": "GOBINDA CHANDRA MAJHI",        "batch": "a"},
    {"roll_no": "260236", "name": "GYANENDRA PATRA",              "batch": "a"},
    {"roll_no": "260237", "name": "Harekrushana Parida",          "batch": "a"},
    {"roll_no": "260240", "name": "JANBHI ROUT",                  "batch": "a"},
    {"roll_no": "260242", "name": "JEEBAN GHOSH",                 "batch": "a"},
    {"roll_no": "260244", "name": "JYOTI PRAKASH BEHERA",         "batch": "a"},
    {"roll_no": "260246", "name": "KASISH ROUT",                  "batch": "a"},
    {"roll_no": "260247", "name": "KOUSHIK SWAIN",                "batch": "a"},
    {"roll_no": "260249", "name": "LOPAMUDRA MISHRA",             "batch": "a"},
    {"roll_no": "260252", "name": "MOHIT MAHALLIK",               "batch": "a"},
    {"roll_no": "260052", "name": "NIKHILESH NAYAK",              "batch": "a"},
    {"roll_no": "260256", "name": "OM PRAKASH DUTTA",             "batch": "a"},
    {"roll_no": "260257", "name": "OM PRASAD SINGH",              "batch": "a"},
    {"roll_no": "260258", "name": "OMM PRAKASH JENA",             "batch": "a"},
    {"roll_no": "260260", "name": "PINAKI PRITAM MALLICK",        "batch": "a"},
    {"roll_no": "260058", "name": "PRACHURYA MAHARANA",           "batch": "a"},
    {"roll_no": "260269", "name": "Rudra p. pradhan",             "batch": "a"},
    {"roll_no": "260278", "name": "SAMIR MOHANTY",                "batch": "a"},
    {"roll_no": "260279", "name": "SAROJ KUMAR MANGARAJ",         "batch": "a"},
    {"roll_no": "260280", "name": "SATWIK SUBHODAYA SAHOO",       "batch": "a"},
    {"roll_no": "260287", "name": "SOUMYA RANJAN NAYAK",          "batch": "a"},
    {"roll_no": "260288", "name": "SOUMYA RANJAN SAHU",           "batch": "a"},
    {"roll_no": "260290", "name": "SUBHAM KUMAR RAY",             "batch": "a"},
    # NEET BATCH-2  → batch_neet_2027_a (continued)
    {"roll_no": "260201", "name": "AAHANA PATTANAIK",             "batch": "a"},
    {"roll_no": "260202", "name": "ABHIJIT RAYATSINGH",           "batch": "a"},
    {"roll_no": "260205", "name": "ADITI PANIGRAHI",              "batch": "a"},
    {"roll_no": "260206", "name": "ADYASHA MISHRA",               "batch": "a"},
    {"roll_no": "260207", "name": "ADYASHA PRIYADARSHINI",        "batch": "a"},
    {"roll_no": "260208", "name": "ADYASHREE PRADHAN",            "batch": "a"},
    {"roll_no": "260209", "name": "AMRITA SENAPATI",              "batch": "a"},
    {"roll_no": "260210", "name": "ANGELIN BERO",                 "batch": "a"},
    {"roll_no": "260213", "name": "ANSHIKA ADITI SINGH",          "batch": "a"},
    {"roll_no": "260219", "name": "ASHIRWAD SHRIVASTAVA",         "batch": "a"},
    {"roll_no": "260220", "name": "ASHREEBAD SAMANTARAY",         "batch": "a"},
    {"roll_no": "260221", "name": "ASHUTOSH PANDA",               "batch": "a"},
    {"roll_no": "260222", "name": "ATIA ALMAS",                   "batch": "a"},
    {"roll_no": "260223", "name": "AYESHA JAGADEV",               "batch": "a"},
    {"roll_no": "260225", "name": "AYUSH BEHERA",                 "batch": "a"},
    {"roll_no": "260228", "name": "BISHAL PRADHAN",               "batch": "a"},
    {"roll_no": "260229", "name": "BISWA PRAKASH DASH",           "batch": "a"},
    # NEET BATCH-2 cont → batch_neet_2027_b
    {"roll_no": "260230", "name": "BISWAJIT SAMANTARAY",          "batch": "b"},
    {"roll_no": "260231", "name": "DEBASIS BALIARASINGH",         "batch": "b"},
    {"roll_no": "260232", "name": "DIBYAJYOTI MAHAKUD",           "batch": "b"},
    {"roll_no": "260233", "name": "DIPTIMAYEE SAHU",              "batch": "b"},
    {"roll_no": "260234", "name": "GAYATRI PANDA",                "batch": "b"},
    {"roll_no": "260238", "name": "HIMANSHU PRADHAN",             "batch": "b"},
    {"roll_no": "260239", "name": "IPSITA PRIYADARSHINI",         "batch": "b"},
    {"roll_no": "260253", "name": "NIRMALA MOHAPATRA",            "batch": "b"},
    {"roll_no": "260255", "name": "OM PRAKASH BHUJABAL",          "batch": "b"},
    {"roll_no": "260259", "name": "P. UTKARSH SAHOO",             "batch": "b"},
    {"roll_no": "260267", "name": "Ritesh DAS",                   "batch": "b"},
    {"roll_no": "260271", "name": "SADASIV BEHERA",               "batch": "b"},
    {"roll_no": "260277", "name": "SAMIKSHA PRIYADARSHINEE",      "batch": "b"},
    {"roll_no": "260281", "name": "SATYABRATA ROIUTRAY",          "batch": "b"},
    {"roll_no": "260291", "name": "SUBHAM MARTHA",                "batch": "b"},
    {"roll_no": "260294", "name": "SUPRAV RANJAN MAHAPATRA",      "batch": "b"},
    {"roll_no": "260300", "name": "SWAYAMJIT RANJIT",             "batch": "b"},
    {"roll_no": "260301", "name": "SWOYAM SOURAV YADAV",          "batch": "b"},
    # NEET BATCH-3  → batch_neet_2027_b
    {"roll_no": "260008", "name": "ADYASHA MAHAPATRA",            "batch": "b"},
    {"roll_no": "260243", "name": "Jignasa Priyadrishini",        "batch": "b"},
    {"roll_no": "260245", "name": "JYOTIRMAYEE MOHANTY",          "batch": "b"},
    {"roll_no": "260248", "name": "KUMARI SANJANA PARIDA",        "batch": "b"},
    {"roll_no": "260250", "name": "LOWRENS MITH MAHANTA",         "batch": "b"},
    {"roll_no": "260251", "name": "MAHIMA MALLIK",                "batch": "b"},
    {"roll_no": "260254", "name": "NIYATI AGRAWAL",               "batch": "b"},
    {"roll_no": "260261", "name": "PRACHI OJHA",                  "batch": "b"},
    {"roll_no": "260262", "name": "PRAPTI PRIYADARSHINI BEHERA",  "batch": "b"},
    {"roll_no": "260263", "name": "PRATEEKSHYA SAHOO",            "batch": "b"},
    {"roll_no": "260264", "name": "PRATYUSHA PRADHAN",            "batch": "b"},
    {"roll_no": "260265", "name": "PRIYANKA MURMU",               "batch": "b"},
    {"roll_no": "260266", "name": "RAEENA PRIYADARSHINI SAHOO",   "batch": "b"},
    {"roll_no": "260268", "name": "RITI RAJANADINI",              "batch": "b"},
    {"roll_no": "260270", "name": "S. MANASVEE",                  "batch": "b"},
    {"roll_no": "260272", "name": "SAI DEEPTI UPADHAYA",          "batch": "b"},
    {"roll_no": "260273", "name": "SAI SUBHADARSHINI PARIDA",     "batch": "b"},
    {"roll_no": "260274", "name": "SAISHREETAM MAHUNTA",          "batch": "b"},
    {"roll_no": "260275", "name": "SAISREE NAYAK",                "batch": "b"},
    {"roll_no": "260276", "name": "SAMBITAA NATH",                "batch": "b"},
    {"roll_no": "260282", "name": "SIBANGI DAS",                  "batch": "b"},
    {"roll_no": "260283", "name": "SMRUTIREKHA BEHERA",           "batch": "b"},
    {"roll_no": "260284", "name": "SNEHA SHREE BISOI",            "batch": "b"},
    {"roll_no": "260286", "name": "SOUMYA PRIYADARSHINI",         "batch": "b"},
    {"roll_no": "260289", "name": "SRUTI REKHA HEMBRAM",          "batch": "b"},
    {"roll_no": "260292", "name": "SUBHASHREE BEHERA",            "batch": "b"},
    {"roll_no": "260293", "name": "Sukanya Mohanty",              "batch": "b"},
    {"roll_no": "260295", "name": "SUSHRI SREYANSI PATTANAIK",    "batch": "b"},
    {"roll_no": "260296", "name": "SWATALAXMI PRUSTY",            "batch": "b"},
    {"roll_no": "260297", "name": "SWATI SNIGDHA NAYAK",          "batch": "b"},
    {"roll_no": "260298", "name": "SWATILIPSA PAHADASINGH",       "batch": "b"},
    {"roll_no": "260299", "name": "SWAYAM PRABHA DEVI",           "batch": "b"},
    {"roll_no": "260302", "name": "TULASI PARIDA",                "batch": "b"},
]

# ── JEE Students (98) ─────────────────────────────────────────────────────────
JEE_STUDENTS = [
    # JEE BATCH-1  → batch_jee_2027_a
    {"roll_no": "260001", "name": "AADARSH NATH SHARMA",          "batch": "a"},
    {"roll_no": "260002", "name": "AARUSHI LAXMI BEHURA",         "batch": "a"},
    {"roll_no": "260003", "name": "ADITYA MOHANTY",               "batch": "a"},
    {"roll_no": "260004", "name": "ADITYA P. MARTHA",             "batch": "a"},
    {"roll_no": "260006", "name": "ADYARASHMI SATAPATHI",         "batch": "a"},
    {"roll_no": "260007", "name": "ADYASHA GHADAI",               "batch": "a"},
    {"roll_no": "260009", "name": "ADYASHA MAHAPATRA",            "batch": "a"},
    {"roll_no": "260010", "name": "AKRUTI KHUNTIA",               "batch": "a"},
    {"roll_no": "260011", "name": "AMARJEET RANASINGH",           "batch": "a"},
    {"roll_no": "260014", "name": "ANSHUMAN BALIARSINGH",         "batch": "a"},
    {"roll_no": "260015", "name": "ANSHUMAN SWAIN",               "batch": "a"},
    {"roll_no": "260018", "name": "AROHI PRASHANA PRADHAN",       "batch": "a"},
    {"roll_no": "260024", "name": "AYUS ANSUMAN BISWAL",          "batch": "a"},
    {"roll_no": "260025", "name": "AYUSH MOHANTY",                "batch": "a"},
    {"roll_no": "260027", "name": "BRAHMANANADA SAHU",            "batch": "a"},
    {"roll_no": "260030", "name": "DIBYANSHU MARTHA",             "batch": "a"},
    {"roll_no": "260033", "name": "DWATPAYAN GAURAV JAGDEV",      "batch": "a"},
    {"roll_no": "260038", "name": "JIBAN JYOTI ROUT",             "batch": "a"},
    {"roll_no": "260042", "name": "LIKSAN MAHANTA",               "batch": "a"},
    {"roll_no": "260043", "name": "LOHITAKSHYA PARIDA",           "batch": "a"},
    {"roll_no": "260048", "name": "MOHAMMAD JEEHAN IRSHAD",       "batch": "a"},
    {"roll_no": "260054", "name": "OMKAR SAHOO",                  "batch": "a"},
    {"roll_no": "260060", "name": "RAJ ADITYA MAHAPATRA",         "batch": "a"},
    {"roll_no": "260103", "name": "RITESH BEHERA",                "batch": "a"},
    {"roll_no": "260066", "name": "SAI PRATYUSH PARIDA",          "batch": "a"},
    {"roll_no": "260067", "name": "SAI SWARUP DAS",               "batch": "a"},
    {"roll_no": "260071", "name": "SASWATI S.SAHU",               "batch": "a"},
    {"roll_no": "260072", "name": "SATYA SOHAN NARENDRA RAY",     "batch": "a"},
    {"roll_no": "260087", "name": "SOUMYAJIT PRADHAN",            "batch": "a"},
    {"roll_no": "260089", "name": "SUBHADIP LAYEK",               "batch": "a"},
    {"roll_no": "260092", "name": "SUBRAT NAYAK",                 "batch": "a"},
    {"roll_no": "260096", "name": "SWAYAM MANGARAJ",              "batch": "a"},
    {"roll_no": "260097", "name": "SWAYAM SIBASRITA NAYAK",       "batch": "a"},
    {"roll_no": "260100", "name": "TANMAYA NAYAK",                "batch": "a"},
    {"roll_no": "260101", "name": "TUSHAR RANJAN DAS",            "batch": "a"},
    # JEE BATCH-2  → batch_jee_2027_a (continued)
    {"roll_no": "260005", "name": "ADITYA RATH",                  "batch": "a"},
    {"roll_no": "260012", "name": "AMRITA PATTANAIK",             "batch": "a"},
    {"roll_no": "260013", "name": "ANSHUL SWAYAM SIDDHI SWAIN",   "batch": "a"},
    {"roll_no": "260016", "name": "ARAYANA PRADHAN",              "batch": "a"},
    {"roll_no": "260017", "name": "ARMAN KUMAR SAHU",             "batch": "a"},
    {"roll_no": "260019", "name": "ARYAN DHAL",                   "batch": "a"},
    {"roll_no": "260020", "name": "ASHUTOSH BARIK",               "batch": "a"},
    {"roll_no": "260021", "name": "ASHUTOSH NAYAK",               "batch": "a"},
    {"roll_no": "260022", "name": "ASMIT ARYAN KARMI",            "batch": "a"},
    {"roll_no": "260023", "name": "AVINASH ROUT",                 "batch": "a"},
    {"roll_no": "260026", "name": "AYUSHI DEBATA",                "batch": "a"},
    {"roll_no": "260102", "name": "CAROLINE SHALONI",             "batch": "a"},
    {"roll_no": "260028", "name": "DEBAPRASAD MAITY",             "batch": "a"},
    {"roll_no": "260029", "name": "DIBYAJYOTI SAHOO",             "batch": "a"},
    # JEE BATCH-2 cont → batch_jee_2027_b
    {"roll_no": "260031", "name": "DIBYANSHU PARIDA",             "batch": "b"},
    {"roll_no": "260032", "name": "DIPSHIKHA NAYAK",              "batch": "b"},
    {"roll_no": "260034", "name": "JAGNESH RANJAN OJHA",          "batch": "b"},
    {"roll_no": "260036", "name": "JASHMINE SAHOO",               "batch": "b"},
    {"roll_no": "260040", "name": "KHUSI NAYAK",                  "batch": "b"},
    {"roll_no": "260041", "name": "KRISHNA PANDEY",               "batch": "b"},
    {"roll_no": "260044", "name": "LOPAMUDRA MAHARANA",           "batch": "b"},
    {"roll_no": "260045", "name": "LORIYA ACHARYA",               "batch": "b"},
    {"roll_no": "260046", "name": "MANASWINI MOHANTY",            "batch": "b"},
    {"roll_no": "260049", "name": "MUNMUN SHAH",                  "batch": "b"},
    {"roll_no": "260057", "name": "PRACHI PARAMITA ROUL",         "batch": "b"},
    {"roll_no": "260059", "name": "PRIYADARSHINI SRICHANDAN",     "batch": "b"},
    {"roll_no": "260077", "name": "SIBANI PRIYA DAS",             "batch": "b"},
    {"roll_no": "260080", "name": "Smikita Mohapatra",            "batch": "b"},
    {"roll_no": "260081", "name": "SMRUTI REKHA PANI",            "batch": "b"},
    {"roll_no": "260082", "name": "SMRUTIREKHA BHUYAN",           "batch": "b"},
    {"roll_no": "260083", "name": "SNEHASMITA MANGARAJ",          "batch": "b"},
    {"roll_no": "260090", "name": "SUBHASHREE ROUT",              "batch": "b"},
    {"roll_no": "260091", "name": "SUBHASHREE SAHOO",             "batch": "b"},
    {"roll_no": "260093", "name": "SUGYANI PRADHAN",              "batch": "b"},
    {"roll_no": "260095", "name": "SWAPNA PANDA",                 "batch": "b"},
    # JEE BATCH-3  → batch_jee_2027_b
    {"roll_no": "260035", "name": "JAISUKH DAS",                  "batch": "b"},
    {"roll_no": "260037", "name": "JEET JAY PRAKASH",             "batch": "b"},
    {"roll_no": "260047", "name": "MANJIT MEHER",                 "batch": "b"},
    {"roll_no": "260050", "name": "MURALIDHAR SAHOO",             "batch": "b"},
    {"roll_no": "260051", "name": "NAMAN KUMAR DAS",              "batch": "b"},
    {"roll_no": "260053", "name": "NIRMAL BISOI",                 "batch": "b"},
    {"roll_no": "260055", "name": "PARTHA SARATHI",               "batch": "b"},
    {"roll_no": "260056", "name": "PRABHUDATTA PAIKRAY",          "batch": "b"},
    {"roll_no": "260061", "name": "RAJ BARDHAN MISHRA",           "batch": "b"},
    {"roll_no": "260062", "name": "RUDRA NARAYAN SAHOO",          "batch": "b"},
    {"roll_no": "260063", "name": "RUDRESH PRAHARAJ",             "batch": "b"},
    {"roll_no": "260065", "name": "SAI MEETANSHU DEHURY",         "batch": "b"},
    {"roll_no": "260068", "name": "SAI SWASTIK PAIKARAY",         "batch": "b"},
    {"roll_no": "260069", "name": "SANDEEP JENA",                 "batch": "b"},
    {"roll_no": "260070", "name": "SANGAM RAJ",                   "batch": "b"},
    {"roll_no": "260073", "name": "SHASHANKAR MAJHI",             "batch": "b"},
    {"roll_no": "260074", "name": "SHIVAM KUMAR MANDAL",          "batch": "b"},
    {"roll_no": "260075", "name": "SHREYAS PADHI",                "batch": "b"},
    {"roll_no": "260076", "name": "SHUBHAM SAHOO",                "batch": "b"},
    {"roll_no": "260078", "name": "SITANSHU SEKHAR SWAIN",        "batch": "b"},
    {"roll_no": "260079", "name": "SK Ashfaq Alli",               "batch": "b"},
    {"roll_no": "260084", "name": "SOHAM PATTANAIK",              "batch": "b"},
    {"roll_no": "260085", "name": "SOUMENDRA SAHOO",              "batch": "b"},
    {"roll_no": "260086", "name": "SOUMYA RANJAN MOHAPATRA",      "batch": "b"},
    {"roll_no": "260088", "name": "SRIMAY SATYA SOURAV BEHERA",   "batch": "b"},
    {"roll_no": "260094", "name": "SUJJAL KUMAR NATH",            "batch": "b"},
    {"roll_no": "260098", "name": "TANMAY SAHU",                  "batch": "b"},
    {"roll_no": "260099", "name": "TANMAYA BEHERA",               "batch": "b"},
]

# ── helpers ───────────────────────────────────────────────────────────────────

def _first_name(full_name: str) -> str:
    parts = full_name.strip().split()
    return parts[0].title() if parts else "Student"


def main():
    print("=" * 55)
    print("  EduX Student Seed")
    print(f"  Institution : {INSTITUTION_ID}")
    print(f"  NEET        : {len(NEET_STUDENTS)} students")
    print(f"  JEE         : {len(JEE_STUDENTS)} students")
    print(f"  Password    : {DEFAULT_PASSWORD}")
    print("=" * 55)

    ensure_schema()
    pw_hash = hash_password(DEFAULT_PASSWORD)

    with SessionLocal() as db:
        # Verify institution exists
        inst = db.get(Institution, INSTITUTION_ID)
        if not inst:
            print(f"ERROR: institution '{INSTITUTION_ID}' not found. Aborting.")
            sys.exit(1)
        print(f"\nInstitution OK: {inst.name}")

        # Verify batches exist
        for bid, label in [
            (NEET_BATCH_A, "NEET-A"), (NEET_BATCH_B, "NEET-B"),
            (JEE_BATCH_A,  "JEE-A"),  (JEE_BATCH_B,  "JEE-B"),
        ]:
            b = db.get(Batch, bid)
            if not b:
                print(f"ERROR: batch '{bid}' ({label}) not found. Aborting.")
                sys.exit(1)
            print(f"Batch OK: {b.code} ({b.exam_family})")

        # Get or create student role
        role = db.scalars(
            select(Role).where(Role.institution_id == INSTITUTION_ID, Role.code == "student")
        ).first()
        if not role:
            role = Role(id=str(uuid4()), institution_id=INSTITUTION_ID, code="student", name="Student")
            db.add(role)
            db.flush()
            print(f"Created student role: {role.id}")
        else:
            print(f"Role OK: student ({role.id})")

        # Load existing roll numbers
        existing_rolls = set(
            db.scalars(
                select(StudentProfile.roll_no).where(StudentProfile.institution_id == INSTITUTION_ID)
            ).all()
        )
        print(f"\nExisting students: {len(existing_rolls)}")

        # ── Extra students (XO-series) ─────────────────────────────────────
        EXTRA_NEET = [
            {"roll_no": "XO009", "name": "ADITYA PRASAD JENA",   "batch": "a"},
            {"roll_no": "XO007", "name": "PRATYSUH MOHAPATRA",    "batch": "a"},
            {"roll_no": "XO008", "name": "SANTOSH KUMAR SINGH",   "batch": "a"},
            {"roll_no": "XO001", "name": "SRIBATSA MOHARANA",     "batch": "b"},
        ]
        EXTRA_JEE = [
            {"roll_no": "XO003", "name": "HARSH VARDHAN SINGH",   "batch": "a"},
            {"roll_no": "XO002", "name": "PRASANT BISWAL",        "batch": "a"},
            {"roll_no": "XO005", "name": "SUCHEITA KRUPALIN",     "batch": "a"},
            {"roll_no": "XO004", "name": "ARNAPURNA BISWAL",      "batch": "b"},
            {"roll_no": "XO006", "name": "BISWOJIT BEHERA",       "batch": "b"},
        ]

        neet_batch_map = {"a": NEET_BATCH_A, "b": NEET_BATCH_B}
        jee_batch_map  = {"a": JEE_BATCH_A,  "b": JEE_BATCH_B}

        neet_added = jee_added = skipped = 0

        for student, batch_map, label in [
            *[(s, neet_batch_map, "NEET") for s in NEET_STUDENTS],
            *[(s, jee_batch_map,  "JEE")  for s in JEE_STUDENTS],
            *[(s, neet_batch_map, "NEET") for s in EXTRA_NEET],
            *[(s, jee_batch_map,  "JEE")  for s in EXTRA_JEE],
        ]:
            roll = str(student["roll_no"]).strip()
            name = student["name"].strip()
            batch_id = batch_map[student["batch"]]

            if roll in existing_rolls:
                skipped += 1
                continue

            # Create user — email must be unique per institution
            user = User(
                id=str(uuid4()),
                institution_id=INSTITUTION_ID,
                email=f"{roll}@edux.local",
                full_name=name,
                first_name=_first_name(name),
                password_hash=pw_hash,
                legacy_role="student",
                status="active",
                email_verified_at=datetime.now(timezone.utc),
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            db.add(user)
            db.flush()

            db.add(StudentProfile(
                user_id=user.id,
                institution_id=INSTITUTION_ID,
                roll_no=roll,
                batch_id=batch_id,
            ))

            db.add(UserRole(
                user_id=user.id,
                role_id=role.id,
                institution_id=INSTITUTION_ID,
            ))

            existing_rolls.add(roll)
            if label == "NEET":
                neet_added += 1
            else:
                jee_added += 1

        db.commit()
        total = neet_added + jee_added
        print(f"\nNEET inserted : {neet_added}")
        print(f"JEE  inserted : {jee_added}")
        print(f"Skipped       : {skipped}")
        print(f"Total new     : {total}")
        print("\nDone! Restart the backend server.")


if __name__ == "__main__":
    main()
