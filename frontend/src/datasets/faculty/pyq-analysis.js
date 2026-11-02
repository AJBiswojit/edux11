/**
 * PYQ (Previous Year Question) Analysis — faculty UI configuration + engine
 * logic (DATA SHELL).
 *
 * Phase 11 (Complete Physical Mock-Shim Removal): the seeded PYQ corpus /
 * uploads / trend analytics / question intelligence / per-subject variants
 * were backend-owned entity data and are REMOVED. The PYQ Analysis page
 * receives its corpus and analysis from the service layer (backend), so no
 * authoritative PYQ records remain in the frontend.
 *
 * What is preserved is legitimate frontend contract/config:
 *   · pyqFilters — the filter cascade metadata (programs / subjects /
 *     chapters / year ranges) the page derives its dropdowns from.
 *   · applyPyqVariant — the deterministic merge logic that folds a
 *     per-subject variant into the base analysis (pure engine logic).
 */

export const pyqAnalysis = {
  overview: {},
  uploads: [],
  trendAnalytics: {},
  questionIntelligence: {},
  difficultyAnalytics: {},
  aiSuggestions: [],
}

export const pyqFilters = {
  programs: ['B.Tech — CSE', 'B.Tech — ECE', 'B.Tech — ME', 'M.Sc — Data Science'],
  subjects: [
    { code: 'CS501', name: 'Data Structures & Algorithms', chapters: ['Graph Algorithms', 'Dynamic Programming', 'Sorting & Searching', 'Trees & Heaps', 'Complexity Analysis', 'String Algorithms'] },
    { code: 'CS502', name: 'Database Management Systems', chapters: ['Relational Design', 'SQL & Query Optimisation', 'Transactions & Concurrency', 'Indexing', 'NoSQL Systems'] },
    { code: 'CS503', name: 'Operating Systems', chapters: ['Processes & Threads', 'CPU Scheduling', 'Memory Management', 'File Systems', 'Synchronisation'] },
    { code: 'CS504', name: 'Computer Networks', chapters: ['Physical & Data Link', 'Network Layer', 'Transport Layer', 'Application Protocols', 'Network Security'] },
    { code: 'CS505', name: 'Machine Learning', chapters: ['Regression', 'Classification', 'Neural Networks', 'Model Evaluation', 'Unsupervised Learning'] },
    { code: 'CS506', name: 'Theory of Computation', chapters: ['Automata', 'Formal Languages', 'Turing Machines', 'Decidability', 'Complexity Classes'] },
  ],
  chapters: {
    'Graph Algorithms': ['Dijkstra & shortest paths', 'MST (Kruskal/Prim)', 'Topological sort', 'Network flows', 'BFS/DFS applications'],
    'Dynamic Programming': ['0/1 Knapsack', 'LCS & edit distance', 'Matrix chain', 'DP on trees'],
    'Sorting & Searching': ['Comparison sorts', 'Linear-time sorts', 'Binary search variants', 'Order statistics'],
    'Trees & Heaps': ['AVL rotations', 'Segment trees', 'Heaps & priority queues', 'B-trees'],
    'Complexity Analysis': ['Big-O analysis', 'Recurrences & Master theorem', 'Amortized analysis'],
    'String Algorithms': ['KMP string matching', 'Rabin-Karp', 'Suffix arrays', 'Tries'],
    'Relational Design': ['Normalisation', 'Functional dependencies', 'ER modelling'],
    'SQL & Query Optimisation': ['Joins & subqueries', 'Query execution plans', 'Indexing strategies'],
    'Transactions & Concurrency': ['ACID properties', 'Isolation levels', '2PL & deadlock handling'],
    Indexing: ['B+ trees', 'Hash indexes', 'Composite indexes'],
    'NoSQL Systems': ['Key-value stores', 'Document stores', 'CAP theorem'],
    'Processes & Threads': ['Process states', 'Thread models', 'Context switching'],
    'CPU Scheduling': ['FCFS/SJF/RR', 'Priority scheduling', 'Multilevel queues'],
    'Memory Management': ['Paging & segmentation', 'Virtual memory', 'Page replacement'],
    'File Systems': ['Inodes', 'Disk allocation', 'Journaling'],
    Synchronisation: ['Semaphores', 'Monitors', 'Deadlock detection', 'Classic problems'],
    'Physical & Data Link': ['Framing & error detection', 'MAC protocols', 'Ethernet & switching'],
    'Network Layer': ['IP addressing & subnetting', 'Routing algorithms', 'ICMP & ARP'],
    'Transport Layer': ['TCP congestion control', 'Flow control', 'UDP vs TCP'],
    'Application Protocols': ['HTTP & DNS', 'Email protocols', 'DHCP'],
    'Network Security': ['Firewalls & NAT', 'TLS basics', 'Common attacks'],
    Regression: ['Linear regression', 'Ridge & Lasso', 'Gradient descent'],
    Classification: ['Logistic regression', 'SVM & kernels', 'Decision trees'],
    'Neural Networks': ['Backpropagation', 'Activation functions', 'Regularisation'],
    'Model Evaluation': ['Cross-validation', 'Metrics (precision/recall/F1)', 'Bias-variance trade-off'],
    'Unsupervised Learning': ['K-means', 'PCA', 'Anomaly detection'],
    Automata: ['DFA/NFA construction', 'Pumping lemma', 'Minimisation'],
    'Formal Languages': ['Regular expressions', 'Context-free grammars', 'CFL properties'],
    'Turing Machines': ['TM design', 'Undecidability', 'Reductions'],
    Decidability: ['Halting problem', 'Rice theorem', 'Decidable languages'],
    'Complexity Classes': ['P vs NP', 'NP-completeness', 'Reductions'],
  },
  yearRanges: [
    { id: 'all', label: 'All years (2011–2025)', from: 2011, to: 2025 },
    { id: 'recent5', label: 'Last 5 years (2021–2025)', from: 2021, to: 2025 },
    { id: 'recent10', label: 'Last 10 years (2016–2025)', from: 2016, to: 2025 },
    { id: 'last3', label: 'Last 3 years (2023–2025)', from: 2023, to: 2025 },
    { id: 'old5', label: '2011–2015', from: 2011, to: 2015 },
    { id: 'mid5', label: '2016–2020', from: 2016, to: 2020 },
  ],
}

export const pyqPatterns = []

export const pyqVariants = {}

/** Per-subject PYQ variant merge (pure logic). */
export function applyPyqVariant(base, variant) {
  if (!variant) return base
  return {
    ...base,
    trendAnalytics: {
      ...base.trendAnalytics,
      chapterWeightage: variant.chapterWeightage ?? base.trendAnalytics.chapterWeightage,
      topicWeightage: variant.topicWeightage ?? base.trendAnalytics.topicWeightage,
      questionFrequency: variant.questionFrequency ?? base.trendAnalytics.questionFrequency,
      subjectWeightage: variant.subjectWeightage ?? base.trendAnalytics.subjectWeightage,
    },
    questionIntelligence: {
      ...base.questionIntelligence,
      mostRepeated: variant.mostRepeated ?? base.questionIntelligence.mostRepeated,
      frequentTopics: variant.frequentTopics ?? base.questionIntelligence.frequentTopics,
      frequentChapters: variant.frequentChapters ?? base.questionIntelligence.frequentChapters,
      importantConcepts: variant.importantConcepts ?? base.questionIntelligence.importantConcepts,
      aiPredictedQuestions: variant.aiPredictedQuestions ?? base.questionIntelligence.aiPredictedQuestions,
    },
    difficultyAnalytics: variant.difficultyAnalytics ?? base.difficultyAnalytics,
  }
}
