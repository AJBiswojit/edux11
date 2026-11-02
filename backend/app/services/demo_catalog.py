"""Demo people/catalog ported from the SPA mock directory (users.js + faculty students-directory)."""

from __future__ import annotations

import re

DEMO_INSTITUTION_ID = "inst_mit_p"
DEMO_PASSWORD = "aurora123"  # stored only as PBKDF2 hash on users.password_hash

DEPARTMENTS = [
    {"id": "dept_cse", "code": "CSE", "name": "Computer Science & Engineering", "hod": "Dr. Meera Krishnan"},
    {"id": "dept_ece", "code": "ECE", "name": "Electronics & Communication", "hod": "Prof. Vikram Rao"},
    {"id": "dept_me", "code": "ME", "name": "Mechanical Engineering", "hod": "Prof. Sunita Bose"},
    {"id": "dept_ee", "code": "EE", "name": "Electrical Engineering", "hod": "Dr. Farhan Ali"},
    {"id": "dept_ce", "code": "CE", "name": "Civil Engineering", "hod": "Prof. James Thomas"},
    {"id": "dept_math", "code": "MATH", "name": "Mathematics & Sciences", "hod": "Dr. Priya Nair"},
    {"id": "dept_mba", "code": "MBA", "name": "School of Business", "hod": "Dr. Ritu Agarwal"},
    {"id": "dept_des", "code": "DES", "name": "School of Design & Media", "hod": "Prof. Aditi Sen"},
]

FACULTY = [
    {"id": "u_fac_001", "email": "meera.krishnan@medixoedux.edu", "full_name": "Dr. Meera Krishnan", "first_name": "Meera", "dept": "CSE", "designation": "Professor & Head, CSE", "specialization": "Algorithms, Machine Learning", "phone": "+91 98220 11456", "employee_no": "FAC-CSE-001"},
    {"id": "u_fac_002", "email": "vikram.rao@medixoedux.edu", "full_name": "Prof. Vikram Rao", "first_name": "Vikram", "dept": "ECE", "designation": "Associate Professor", "specialization": "VLSI Design, Embedded Systems", "phone": None, "employee_no": "FAC-ECE-001"},
    {"id": "u_fac_003", "email": "priya.nair@medixoedux.edu", "full_name": "Dr. Priya Nair", "first_name": "Priya", "dept": "MATH", "designation": "Assistant Professor", "specialization": "Discrete Mathematics, Probability", "phone": None, "employee_no": "FAC-MATH-001"},
    {"id": "u_fac_004", "email": "arvind.kulkarni@medixoedux.edu", "full_name": "Dr. Arvind Kulkarni", "first_name": "Arvind", "dept": "CSE", "designation": "Professor", "specialization": "Computer Science", "phone": None, "employee_no": "FAC-CSE-002"},
    {"id": "u_fac_005", "email": "sunita.bose@medixoedux.edu", "full_name": "Prof. Sunita Bose", "first_name": "Sunita", "dept": "ME", "designation": "Associate Professor", "specialization": "Mechanical Engineering", "phone": None, "employee_no": "FAC-ME-001"},
    {"id": "u_fac_006", "email": "farhan.ali@medixoedux.edu", "full_name": "Dr. Farhan Ali", "first_name": "Farhan", "dept": "EE", "designation": "Professor", "specialization": "Electrical Engineering", "phone": None, "employee_no": "FAC-EE-001"},
    {"id": "u_fac_007", "email": "ritu.agarwal@medixoedux.edu", "full_name": "Dr. Ritu Agarwal", "first_name": "Ritu", "dept": "MBA", "designation": "Associate Professor", "specialization": "Business", "phone": None, "employee_no": "FAC-MBA-001"},
    {"id": "u_fac_008", "email": "james.thomas@medixoedux.edu", "full_name": "Prof. James Thomas", "first_name": "James", "dept": "CE", "designation": "Assistant Professor", "specialization": "Civil Engineering", "phone": None, "employee_no": "FAC-CE-001"},
    {"id": "u_fac_009", "email": "aditi.sen@medixoedux.edu", "full_name": "Prof. Aditi Sen", "first_name": "Aditi", "dept": "DES", "designation": "Professor", "specialization": "Design & Media", "phone": None, "employee_no": "FAC-DES-001"},
    {"id": "u_fac_010", "email": "sunil.verma@medixoedux.edu", "full_name": "Dr. Sunil Verma", "first_name": "Sunil", "dept": "CSE", "designation": "Assistant Professor", "specialization": "Computer Science", "phone": None, "employee_no": "FAC-CSE-003"},
]

ADMINS = [
    {
        "id": "u_adm_001",
        "email": "ananya.iyer@medixoedux.edu",
        "full_name": "Ananya Iyer",
        "first_name": "Ananya",
        "phone": "+91 99870 55678",
        "designation": "Director, Digital Learning & Registrar (Systems)",
    }
]

PARENTS = [
    {
        "id": "u_par_001",
        "email": "rajesh.sharma@medixoedux.edu",
        "full_name": "Rajesh Sharma",
        "first_name": "Rajesh",
        "phone": "+91 98111 22334",
        "ward_id": "u_stu_001",
        "relationship": "father",
        "occupation": "Sr. Engineering Manager, Infosys",
        "city": "Indore, Madhya Pradesh",
    }
]

# SPA STUDENT_ROSTER — first university batch A identities (Aarav keeps login id u_stu_001).
ROSTER = [
    {"id": "u_stu_001", "name": "Aarav Sharma", "roll": "21CS114", "email": "aarav.sharma@medixoedux.edu", "cgpa": 8.72, "attendance": 92.4, "internal_marks": 87, "status": "Good", "account_status": "active", "phone": "+91 98765 43210"},
    {"id": "fs_s2", "name": "Ishita Gupta", "roll": "21CS101", "email": "ishita.gupta@medixoedux.edu", "cgpa": 9.1, "attendance": 96.8, "internal_marks": 91, "status": "Excellent", "account_status": "active"},
    {"id": "fs_s3", "name": "Rohan Verma", "roll": "21CS102", "email": "rohan.verma@medixoedux.edu", "cgpa": 7.4, "attendance": 84.2, "internal_marks": 72, "status": "At Risk", "account_status": "suspended"},
    {"id": "fs_s4", "name": "Sneha Patil", "roll": "21CS103", "email": "sneha.patil@medixoedux.edu", "cgpa": 8.9, "attendance": 94.1, "internal_marks": 88, "status": "Excellent", "account_status": "active"},
    {"id": "fs_s5", "name": "Karan Mehta", "roll": "21CS104", "email": "karan.mehta@medixoedux.edu", "cgpa": 6.8, "attendance": 78.5, "internal_marks": 65, "status": "At Risk", "account_status": "pending"},
    {"id": "fs_s6", "name": "Divya Krishnan", "roll": "21CS105", "email": "divya.krishnan@medixoedux.edu", "cgpa": 9.3, "attendance": 98.2, "internal_marks": 94, "status": "Excellent", "account_status": "active"},
    {"id": "fs_s7", "name": "Aditya Singh", "roll": "21CS106", "email": "aditya.singh@medixoedux.edu", "cgpa": 7.9, "attendance": 88.9, "internal_marks": 79, "status": "Good", "account_status": "active"},
    {"id": "fs_s8", "name": "Pooja Reddy", "roll": "21CS107", "email": "pooja.reddy@medixoedux.edu", "cgpa": 8.4, "attendance": 91.3, "internal_marks": 84, "status": "Good", "account_status": "active"},
    {"id": "fs_s9", "name": "Nikhil Joshi", "roll": "21CS108", "email": "nikhil.joshi@medixoedux.edu", "cgpa": 6.2, "attendance": 74.6, "internal_marks": 58, "status": "At Risk", "account_status": "suspended"},
    {"id": "fs_s10", "name": "Ananya Desai", "roll": "21CS109", "email": "ananya.desai@medixoedux.edu", "cgpa": 8.8, "attendance": 93.7, "internal_marks": 89, "status": "Excellent", "account_status": "active"},
    {"id": "fs_s11", "name": "Vivek Kumar", "roll": "21CS110", "email": "vivek.kumar@medixoedux.edu", "cgpa": 7.1, "attendance": 81.2, "internal_marks": 70, "status": "Good", "account_status": "active"},
    {"id": "fs_s12", "name": "Ritika Sharma", "roll": "21CS111", "email": "ritika.sharma@medixoedux.edu", "cgpa": 8.1, "attendance": 89.8, "internal_marks": 82, "status": "Good", "account_status": "active"},
    {"id": "fs_s13", "name": "Arjun Nair", "roll": "21CS112", "email": "arjun.nair@medixoedux.edu", "cgpa": 7.6, "attendance": 86.4, "internal_marks": 76, "status": "Good", "account_status": "active"},
    {"id": "fs_s14", "name": "Neha Kulkarni", "roll": "21CS113", "email": "neha.kulkarni@medixoedux.edu", "cgpa": 8.5, "attendance": 92.0, "internal_marks": 85, "status": "Good", "account_status": "active"},
    {"id": "fs_s15", "name": "Sanjay Patel", "roll": "21CS115", "email": "sanjay.patel@medixoedux.edu", "cgpa": 6.9, "attendance": 79.8, "internal_marks": 66, "status": "At Risk", "account_status": "active"},
    {"id": "fs_s16", "name": "Kavya Menon", "roll": "21CS116", "email": "kavya.menon@medixoedux.edu", "cgpa": 9.0, "attendance": 95.5, "internal_marks": 90, "status": "Excellent", "account_status": "active"},
]

BATCHES = [
    {"id": "batch_uni_cse_a", "code": "CSE-2026-A", "name": "CSE-2026-A", "exam_mode": "university", "exam_family": None, "section": "A", "course": "Data Structures & Algorithms", "course_code": "CS501", "semester": "VI"},
    {"id": "batch_uni_cse_b", "code": "CSE-2026-B", "name": "CSE-2026-B", "exam_mode": "university", "exam_family": None, "section": "B", "course": "Operating Systems", "course_code": "CS503", "semester": "VI"},
    {"id": "batch_uni_cse_c", "code": "CSE-2026-C", "name": "CSE-2026-C", "exam_mode": "university", "exam_family": None, "section": "C", "course": "Machine Learning", "course_code": "CS505", "semester": "VI"},
    {"id": "batch_jee_2027_a", "code": "JEE-2027-A", "name": "JEE-2027-A", "exam_mode": "competitive", "exam_family": "jee", "section": None, "course": None, "course_code": None, "semester": None},
    {"id": "batch_jee_2027_b", "code": "JEE-2027-B", "name": "JEE-2027-B", "exam_mode": "competitive", "exam_family": "jee", "section": None, "course": None, "course_code": None, "semester": None},
    {"id": "batch_neet_2027_a", "code": "NEET-2027-A", "name": "NEET-2027-A", "exam_mode": "competitive", "exam_family": "neet", "section": None, "course": None, "course_code": None, "semester": None},
    {"id": "batch_neet_2027_b", "code": "NEET-2027-B", "name": "NEET-2027-B", "exam_mode": "competitive", "exam_family": "neet", "section": None, "course": None, "course_code": None, "semester": None},
]

STUDENTS_PER_BATCH = 18
FIRST = ["Aarav", "Ishita", "Rohan", "Sneha", "Karan", "Divya", "Aditya", "Pooja", "Nikhil", "Ananya", "Vivek", "Ritika", "Arjun", "Neha", "Sanjay", "Kavya", "Farhan", "Meera", "Tanvi", "Rahul", "Simran", "Yash", "Priyanka", "Om", "Sara", "Dev", "Naina", "Ravi", "Zoya", "Ibrahim"]
LAST = ["Sharma", "Gupta", "Verma", "Patil", "Mehta", "Krishnan", "Singh", "Reddy", "Joshi", "Desai", "Kumar", "Nair", "Kulkarni", "Menon", "Patel", "Iyer", "Khan", "Bose", "Chopra", "Das", "Mishra", "Rao", "Pillai", "Agarwal", "Shetty", "Gill", "Bhat", "Kapoor", "Saxena", "Naidu"]

BATCH_META = [
    {"batch_id": "batch_uni_cse_a", "prefix": "fs_uni_a", "roll_base": 101, "roll_prefix": "21CS", "domain": "University", "exam_family": None},
    {"batch_id": "batch_uni_cse_b", "prefix": "fs_uni_b", "roll_base": 119, "roll_prefix": "21CS", "domain": "University", "exam_family": None},
    {"batch_id": "batch_uni_cse_c", "prefix": "fs_uni_c", "roll_base": 137, "roll_prefix": "21CS", "domain": "University", "exam_family": None},
    {"batch_id": "batch_jee_2027_a", "prefix": "fs_jee_a", "roll_base": 101, "roll_prefix": "J24-", "domain": "Competitive", "exam_family": "JEE"},
    {"batch_id": "batch_jee_2027_b", "prefix": "fs_jee_b", "roll_base": 119, "roll_prefix": "J24-", "domain": "Competitive", "exam_family": "JEE"},
    {"batch_id": "batch_neet_2027_a", "prefix": "fs_neet_a", "roll_base": 101, "roll_prefix": "N24-", "domain": "Competitive", "exam_family": "NEET"},
    {"batch_id": "batch_neet_2027_b", "prefix": "fs_neet_b", "roll_base": 119, "roll_prefix": "N24-", "domain": "Competitive", "exam_family": "NEET"},
]


def _name_for(batch_idx: int, j: int) -> str:
    f = FIRST[(batch_idx * 18 + j) % len(FIRST)]
    l = LAST[(batch_idx * 31 + j * 7) % len(LAST)]
    return f"{f} {l}"


def _email_from_name(name: str, user_id: str) -> str:
    cleaned = re.sub(r"[^a-z ]", "", name.lower())
    cleaned = re.sub(r"^(dr|prof)\.?\s+", "", cleaned).strip().replace(" ", ".")
    if not cleaned:
        cleaned = user_id.replace("_", ".")
    return f"{cleaned}.{user_id.replace('_', '')}@medixoedux.edu"


def _metrics_from_id(user_id: str) -> tuple[float, float, int, str]:
    h = sum(ord(c) for c in user_id)
    cgpa = round(6.2 + (h % 31) / 10, 2)
    attendance = round(74 + (h % 25) + (h % 10) / 10, 1)
    internals = 55 + (h % 40)
    if cgpa >= 8.5:
        label = "Excellent"
    elif cgpa >= 7.5:
        label = "Good"
    else:
        label = "At Risk"
    return cgpa, min(attendance, 99.5), internals, label


def faculty_students() -> list[dict]:
    """Same 126 students as frontend facultyStudents (7 batches × 18)."""
    roster_by_index = ROSTER
    out: list[dict] = []
    for bi, meta in enumerate(BATCH_META):
        for j in range(STUDENTS_PER_BATCH):
            if bi == 0 and j < len(roster_by_index):
                r = roster_by_index[j]
                row = {
                    **r,
                    "batch_id": meta["batch_id"],
                    "domain": meta["domain"],
                    "exam_family": meta["exam_family"],
                    "first_name": r["name"].split()[0],
                    "admission_year": 2024,
                    "program": "B.Tech — Computer Science",
                    "semester": "Semester 5" if meta["domain"] == "University" else None,
                    "section": "A" if meta["batch_id"] == "batch_uni_cse_a" else None,
                }
            else:
                user_id = f"{meta['prefix']}_{str(j + 1).zfill(2)}"
                name = _name_for(bi, j)
                roll = f"{meta['roll_prefix']}{meta['roll_base'] + j}"
                cgpa, attendance, internals, label = _metrics_from_id(user_id)
                row = {
                    "id": user_id,
                    "name": name,
                    "first_name": name.split()[0],
                    "roll": roll,
                    "email": _email_from_name(name, user_id),
                    "cgpa": cgpa,
                    "attendance": attendance,
                    "internal_marks": internals,
                    "status": label,
                    "account_status": "active",
                    "batch_id": meta["batch_id"],
                    "domain": meta["domain"],
                    "exam_family": meta["exam_family"],
                    "admission_year": 2024,
                    "program": "B.Tech — Computer Science",
                    "semester": "VI" if meta["domain"] == "University" else None,
                    "section": BATCHES[bi].get("section"),
                    "phone": None,
                }
            out.append(row)
    return out


AARAV_PROFILE_EXTRA = {
    "lastName": "Sharma",
    "gender": "Male",
    "dateOfBirth": "2004-03-12",
    "bloodGroup": "B+",
    "city": "Pune",
    "state": "Maharashtra",
    "pincode": "411044",
    "country": "India",
    "bio": "CS undergrad passionate about machine learning and system design.",
    "enrollmentNo": "ENR-2024-0147",
    "batchLabel": "2024–2028",
    "avatarGradient": "linear-gradient(135deg, #6366f1, #3b82f6)",
}
