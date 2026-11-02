/**
 * Student Intelligence — academic resource catalogue (DATA ONLY).
 * Deterministic per-course resources (books, slides, notes, workbooks).
 * The university engine attaches each course's resources to its detail
 * view and exposes the full catalogue for the Academics Resources tab.
 */

export const academicResources = [
  { id: 'ar1', course: 'CS501', title: 'CLRS — Introduction to Algorithms, 4th Ed.', type: 'Book', size: '—', updated: 'Jul 2026', color: '#6366f1' },
  { id: 'ar2', course: 'CS501', title: 'Lecture slides — Module 3 (Graphs)', type: 'PDF', size: '4.2 MB', updated: 'Jul 24, 2026', color: '#6366f1' },
  { id: 'ar3', course: 'CS501', title: 'Graph algorithms cheat sheet', type: 'PDF', size: '840 KB', updated: 'Jul 20, 2026', color: '#6366f1' },
  { id: 'ar4', course: 'CS502', title: 'DBMS — Transactions & Concurrency notes', type: 'Notes', size: '1.1 MB', updated: 'Aug 2, 2026', color: '#14b8a6' },
  { id: 'ar5', course: 'CS502', title: 'SQL query optimization workbook', type: 'PDF', size: '2.6 MB', updated: 'Jul 28, 2026', color: '#14b8a6' },
  { id: 'ar6', course: 'CS503', title: 'OS — Memory management slides', type: 'PDF', size: '3.4 MB', updated: 'Jul 30, 2026', color: '#f59e0b' },
  { id: 'ar7', course: 'CS504', title: 'TCP/IP illustrated (excerpts)', type: 'Book', size: '—', updated: 'Jun 2026', color: '#f43f5e' },
  { id: 'ar8', course: 'CS504', title: 'Networks previous year midsems 2019–2024', type: 'Zip', size: '12 MB', updated: 'Jul 31, 2026', color: '#f43f5e' },
  { id: 'ar9', course: 'CS505', title: 'ML — evaluation metrics cheatsheet', type: 'PDF', size: '620 KB', updated: 'Aug 1, 2026', color: '#8b5cf6' },
  { id: 'ar10', course: 'CS506', title: 'ToC — automata workbook', type: 'Notes', size: '1.8 MB', updated: 'Jul 22, 2026', color: '#0ea5e9' },
  { id: 'ar11', course: 'CS501', title: 'Contest archive — past 5 years', type: 'Zip', size: '18 MB', updated: 'Jul 15, 2026', color: '#6366f1' },
  { id: 'ar12', course: 'CS505', title: 'Lecture slides — Neural Networks module', type: 'PDF', size: '5.1 MB', updated: 'Jul 29, 2026', color: '#8b5cf6' },
]

export default { academicResources }
