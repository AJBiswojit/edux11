/**
 * Faculty — Student / Batch directory fixture (Phase 11: Complete Physical
 * Mock-Shim Removal).
 *
 * This deliberately small, deterministic directory replaces the previously
 * backend-owned seeded STUDENT_ROSTER / faculty directory data. It contains
 * ONLY the students / batches the engine tests need. It is test-only data —
 * never imported by production. Every value is a plain fixture (no PRNG, no
 * date derivation) so the engines produce stable, reproducible results.
 */

export const batches = [
  {
    id: 'batch_uni_cse_a', name: 'CSE-2026-A', domain: 'University', examFamily: null,
    academicSession: '2026–27', program: 'B.Tech — CSE', course: 'Data Structures & Algorithms',
    courseCode: 'CS501', semester: 'VI', section: 'A', facultyIds: ['fac_meera_krishnan'], status: 'Active',
  },
  {
    id: 'batch_jee_2027_a', name: 'JEE-2027-A', domain: 'Competitive', examFamily: 'JEE', examLabel: 'JEE Main',
    academicSession: '2026–27', program: 'B.Tech — CSE', course: null, courseCode: null,
    semester: null, section: null, facultyIds: ['fac_meera_krishnan'], status: 'Active',
  },
  {
    id: 'batch_neet_2027_a', name: 'NEET-2027-A', domain: 'Competitive', examFamily: 'NEET', examLabel: 'NEET UG',
    academicSession: '2026–27', program: 'B.Tech — CSE', course: null, courseCode: null,
    semester: null, section: null, facultyIds: ['fac_meera_krishnan'], status: 'Active',
  },
]

export const students = [
  { id: 'fs_jee_a_03', roll: 'J24-103', name: 'Aarav Sharma', batchId: 'batch_jee_2027_a', domain: 'Competitive', examFamily: 'JEE', status: 'Enrolled' },
  { id: 'fs_neet_a_04', roll: 'N24-104', name: 'Rohan Verma', batchId: 'batch_neet_2027_a', domain: 'Competitive', examFamily: 'NEET', status: 'Enrolled' },
  /* University batch A roster-style identities */
  { id: 'fs_s2', roll: '21CS101', name: 'Ishita Gupta', batchId: 'batch_uni_cse_a', domain: 'University', examFamily: null, status: 'Enrolled' },
  { id: 'fs_s3', roll: '21CS102', name: 'Rohan Verma', batchId: 'batch_uni_cse_a', domain: 'University', examFamily: null, status: 'Enrolled' },
  { id: 'fs_s4', roll: '21CS103', name: 'Sneha Patil', batchId: 'batch_uni_cse_a', domain: 'University', examFamily: null, status: 'Enrolled' },
  { id: 'fs_s5', roll: '21CS104', name: 'Karan Mehta', batchId: 'batch_uni_cse_a', domain: 'University', examFamily: null, status: 'Enrolled' },
  { id: 'fs_s6', roll: '21CS105', name: 'Divya Krishnan', batchId: 'batch_uni_cse_a', domain: 'University', examFamily: null, status: 'Enrolled' },
  { id: 'fs_s7', roll: '21CS106', name: 'Aditya Singh', batchId: 'batch_uni_cse_a', domain: 'University', examFamily: null, status: 'Enrolled' },
  { id: 'fs_s8', roll: '21CS107', name: 'Pooja Reddy', batchId: 'batch_uni_cse_a', domain: 'University', examFamily: null, status: 'Enrolled' },
  { id: 'fs_s9', roll: '21CS108', name: 'Nikhil Joshi', batchId: 'batch_uni_cse_a', domain: 'University', examFamily: null, status: 'Enrolled' },
  { id: 'fs_uni_a_17', roll: '21CS117', name: 'Farhan Khan', batchId: 'batch_uni_cse_a', domain: 'University', examFamily: null, status: 'Enrolled' },
  { id: 'fs_uni_a_18', roll: '21CS118', name: 'Meera Bose', batchId: 'batch_uni_cse_a', domain: 'University', examFamily: null, status: 'Enrolled' },
]

export const batchById = Object.fromEntries(batches.map((b) => [b.id, b]))
export const studentById = Object.fromEntries(students.map((s) => [s.id, s]))

/**
 * Get the fixture student for a given id. Production no longer owns any
 * directory; tests supply their own directory data.
 */
export function getFixtureStudent(id) {
  return studentById[id] ?? null
}

export default { batches, students, batchById, studentById, getFixtureStudent }
