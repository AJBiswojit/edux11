/**
 * Faculty · AI Micro-Assessment Studio dataset.
 *
 * This is curated prototype content, not a backend fixture.  The source
 * objects intentionally carry a small, complete contract so the API can be
 * replaced without changing the faculty or student surfaces:
 * source metadata → concepts/opportunities → generated question pool.
 *
 * Domain is canonical and deliberately lower-case:
 *   university                         (examFamily: null)
 *   competitive + examFamily: JEE/NEET
 *
 * There are exactly ten original academic source passages: five University,
 * three JEE and two NEET.  The passages are kept in this domain dataset so
 * the UI never has to infer context from a subject name.
 */

const q = (type, difficulty, concept, question, options, answer, explanation) => ({
  questionType: type,
  difficulty,
  concept,
  question,
  options: options ?? [],
  answer,
  explanation,
})

function buildQuestions(source, rows) {
  return rows.map((row, index) => {
    const options = row.options ?? []
    const correctAnswer = typeof row.answer === 'number' ? options[row.answer] : row.answer
    return {
      id: `${source.id}-q${String(index + 1).padStart(2, '0')}`,
      question: row.question,
      questionType: row.questionType,
      difficulty: row.difficulty,
      chapter: source.chapter,
      topic: source.topic,
      concept: row.concept,
      options,
      correctAnswer,
      answerIndex: typeof row.answer === 'number' ? row.answer : null,
      explanation: row.explanation,
      sourceId: source.id,
    }
  })
}

function buildSource(spec) {
  const wordCount = spec.content.trim().split(/\s+/).filter(Boolean).length
  const source = {
    id: spec.id,
    title: spec.title,
    domain: spec.domain,
    examFamily: spec.examFamily ?? null,
    subject: spec.subject,
    chapter: spec.chapter,
    topic: spec.topic,
    sourceType: spec.sourceType,
    content: spec.content.trim(),
    wordCount,
    estimatedReadingTime: Math.max(1, Math.ceil(wordCount / 200)),
    detectedConcepts: spec.detectedConcepts,
    questionOpportunities: spec.questionOpportunities,
    generatedQuestions: [],
  }
  source.generatedQuestions = buildQuestions(source, spec.questions)
  return source
}

const UNIVERSITY_OPPORTUNITIES = ['Definition', 'Conceptual relationship', 'Application', 'Formula interpretation', 'Statement evaluation']
const COMPETITIVE_OPPORTUNITIES = ['Definition', 'Conceptual relationship', 'Application', 'Formula interpretation', 'Statement evaluation', 'Multi-step reasoning']

const sourceSpecs = [
  /* ------------------------------------------------------------------ */
  /* 1 · University · Computer Science · Data Structures                 */
  /* ------------------------------------------------------------------ */
  {
    id: 'mas-uni-cs-graph-traversal',
    title: 'Graph Traversal: Visiting Structure Without Repetition',
    domain: 'university',
    examFamily: null,
    subject: 'Computer Science',
    chapter: 'Data Structures',
    topic: 'Graph Traversal',
    sourceType: 'Textbook',
    content: `Graph traversal is the systematic process of visiting vertices and edges in a graph. Two fundamental traversals are breadth-first search and depth-first search. Breadth-first search explores all vertices at distance one from a starting vertex before moving to distance two. It therefore uses a queue and is useful for finding shortest paths in an unweighted graph. Depth-first search follows one branch as far as possible before backtracking; a stack, either explicit or provided by recursion, records the frontier. A visited set is essential in both algorithms because graphs may contain cycles and may have several paths to the same vertex. With an adjacency-list representation, each traversal runs in O(V + E) time, where V is the number of vertices and E is the number of edges. The same framework supports practical tasks such as connected-component detection, cycle detection, topological ordering, and reachability queries. For directed graphs, the meaning of an edge direction must be respected when a neighbor is added to the frontier. Traversal order is not always unique: it depends on the starting vertex and the order in which adjacent vertices are stored.`,
    detectedConcepts: ['Breadth-first search', 'Depth-first search', 'Queue and stack frontier', 'Visited set', 'Graph complexity'],
    questionOpportunities: UNIVERSITY_OPPORTUNITIES,
    questions: [
      q('Direct MCQ', 'Easy', 'Breadth-first search', 'Which data structure normally stores the frontier in breadth-first search?', ['Queue', 'Stack', 'Priority queue', 'Hash table'], 0, 'BFS processes vertices in layers, so a first-in, first-out queue preserves that order.'),
      q('Conceptual', 'Medium', 'Depth-first search', 'Why can depth-first search be implemented with ordinary recursion?', ['The call stack stores the unexplored frontier', 'Recursion sorts all vertices by degree', 'The graph becomes acyclic', 'Each edge is visited only once by definition'], 0, 'Recursive calls provide the stack behaviour needed to return to the most recent unfinished branch.'),
      q('Application Based', 'Medium', 'Breadth-first search', 'A campus map is modelled as an unweighted graph. Which traversal should find a route with the fewest edges from a source building?', ['Breadth-first search', 'Depth-first search', 'A traversal that ignores visited vertices', 'Random walk'], 0, 'BFS discovers vertices by increasing edge distance in an unweighted graph.'),
      q('Statement Based', 'Medium', 'Visited set', 'Statement: A visited set is unnecessary when a graph is guaranteed to be a tree. This statement is:', ['Generally true for a connected tree traversal', 'False because every tree has a cycle', 'True only for directed cyclic graphs', 'False because queues cannot traverse trees'], 0, 'A tree has a unique path between vertices and no cycles, although implementations may still keep a visited set for safety.'),
      q('Fill in the Blank', 'Easy', 'Graph complexity', 'With an adjacency-list representation, BFS and DFS have time complexity ______.', [], 'O(V + E)', 'Each vertex and each adjacency-list edge is examined at most a constant number of times.'),
      q('Short Answer', 'Medium', 'Depth-first search', 'State one task, other than reachability, for which depth-first search is commonly useful.', [], 'cycle detection', 'DFS supports cycle detection, topological ordering, connected components and related graph analyses.'),
      q('Why / Reasoning', 'Hard', 'Visited set', 'Why can omitting the visited set make a traversal fail on a cyclic graph?', ['The frontier can repeatedly re-add vertices around a cycle', 'The graph loses all edge weights', 'The queue can only store one vertex', 'Cycles change O(V + E) into O(1)'], 0, 'Without visited tracking, a cycle can cause the same vertices to be enqueued or pushed indefinitely.'),
      q('Multiple Statement', 'Hard', 'Graph complexity', 'Which statements are correct? I. BFS uses a queue. II. DFS can use a stack. III. Both are O(V + E) with adjacency lists.', ['I, II and III', 'I and II only', 'II and III only', 'I and III only'], 0, 'All three statements follow from the standard implementations and adjacency-list analysis.'),
      q('Match the Following', 'Medium', 'Queue and stack frontier', 'Match the traversal with its usual frontier structure: BFS — ?; DFS — ?', ['Queue; stack', 'Stack; queue', 'Priority queue; queue', 'Hash table; stack'], 0, 'BFS is layer-oriented and uses a queue; DFS is branch-oriented and uses a stack.'),
      q('Direct MCQ', 'Easy', 'Depth-first search', 'In depth-first search, backtracking occurs when:', ['The current vertex has no unvisited neighbor', 'The queue becomes full', 'The graph has an even number of edges', 'Every vertex has degree two'], 0, 'DFS returns to the previous frontier vertex after exhausting the current branch.'),
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 2 · University · Computer Science · Database Systems                 */
  /* ------------------------------------------------------------------ */
  {
    id: 'mas-uni-cs-normalization',
    title: 'Normalization: Designing Relations That Preserve Meaning',
    domain: 'university',
    examFamily: null,
    subject: 'Computer Science',
    chapter: 'Database Systems',
    topic: 'Normalization',
    sourceType: 'Lecture Notes',
    content: `Database normalization organizes relational data so that each fact is stored in an appropriate place and dependencies are represented clearly. The process begins by identifying attributes, candidate keys, and functional dependencies. A relation is in first normal form when its attributes contain atomic values rather than repeating groups. Second normal form additionally requires that every non-key attribute depend on the whole candidate key, which matters when a relation has a composite key. Third normal form removes transitive dependencies: a non-key attribute should not depend on another non-key attribute. Boyce–Codd normal form is stricter and requires every determinant to be a candidate key. Decomposition can reduce update, insertion, and deletion anomalies, but a sound decomposition should be lossless so that joining the decomposed relations reconstructs the original information. Dependency preservation is also desirable because constraints can then be checked without recombining every relation. Normalization is not a rule to split tables endlessly. A designer balances redundancy reduction, integrity, query cost, and the needs of the workload. Surrogate keys do not automatically remove a dependency; the business meaning of attributes and the actual determinants still need to be examined.`,
    detectedConcepts: ['Functional dependency', 'Candidate key', 'First normal form', 'Second and third normal form', 'Lossless decomposition'],
    questionOpportunities: UNIVERSITY_OPPORTUNITIES,
    questions: [
      q('Direct MCQ', 'Easy', 'Functional dependency', 'If X functionally determines Y, which notation expresses the dependency?', ['X → Y', 'Y → X', 'X ∩ Y', 'X ⊂ Y'], 0, 'The arrow means that each X value is associated with one Y value.'),
      q('Conceptual', 'Medium', 'First normal form', 'What problem does first normal form primarily address?', ['Non-atomic or repeating attribute values', 'Every transitive dependency', 'All join costs', 'Foreign-key indexing'], 0, '1NF requires attributes to hold atomic values and removes repeating groups.'),
      q('Application Based', 'Hard', 'Second and third normal form', 'An enrollment relation has key (StudentId, CourseId) and stores StudentName, which depends only on StudentId. Which decomposition is indicated?', ['Move StudentName to a Student relation', 'Move CourseId to a Student relation', 'Remove the candidate key', 'Duplicate StudentName in every table'], 0, 'StudentName depends on part of the composite key, so separating student facts addresses a 2NF violation.'),
      q('Statement Based', 'Medium', 'Lossless decomposition', 'Statement: A decomposition is automatically lossless whenever it creates more tables. This statement is:', ['False; a join condition must preserve the original tuples', 'True for every decomposition', 'True only when tables have no keys', 'False because lossless designs use one table'], 0, 'More tables alone do not guarantee that joining them reconstructs the original relation.'),
      q('Fill in the Blank', 'Easy', 'First normal form', 'A relation in first normal form stores ______ attribute values.', [], 'atomic', 'Atomic values are indivisible for the purposes of the relation and do not form repeating groups.'),
      q('Short Answer', 'Medium', 'Candidate key', 'What is a candidate key?', [], 'a minimal attribute set that uniquely identifies a tuple', 'A candidate key is unique and minimal: no proper subset of it is still unique.'),
      q('Why / Reasoning', 'Hard', 'Second and third normal form', 'Why can normalization reduce update anomalies?', ['A fact is updated in one appropriate relation instead of many repeated rows', 'It makes every query use a full table scan', 'It removes all foreign keys', 'It forces every relation to have a composite key'], 0, 'Reducing repeated facts means one change does not have to be synchronised across multiple copies.'),
      q('Multiple Statement', 'Hard', 'Lossless decomposition', 'Which goals are associated with a good normalized decomposition? I. Lossless join. II. Useful dependency preservation. III. Fewer unnecessary anomalies.', ['I, II and III', 'I and II only', 'I and III only', 'II and III only'], 0, 'A practical decomposition aims for all three while considering query and workload costs.'),
      q('Match the Following', 'Medium', 'Second and third normal form', 'Match the normal form with its focus: 1NF — ?; 2NF — ?; 3NF — ?', ['Atomic values; whole-key dependence; no transitive non-key dependence', 'Whole-key dependence; atomic values; no foreign keys', 'No transitive dependence; atomic values; whole-key dependence', 'Indexes; joins; transactions'], 0, 'The progression addresses repeating values, partial dependencies, then transitive dependencies.'),
      q('Direct MCQ', 'Easy', 'Candidate key', 'A candidate key must be:', ['Unique and minimal', 'Unique but necessarily composite', 'Non-unique and indexed', 'A foreign key in another relation'], 0, 'Minimality distinguishes candidate keys from superkeys that contain unnecessary attributes.'),
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 3 · University · Mechanical Engineering · Thermodynamics            */
  /* ------------------------------------------------------------------ */
  {
    id: 'mas-uni-me-thermodynamics',
    title: 'First Law of Thermodynamics: Accounting for Energy',
    domain: 'university',
    examFamily: null,
    subject: 'Mechanical Engineering',
    chapter: 'Thermodynamics',
    topic: 'First Law of Thermodynamics',
    sourceType: 'Textbook',
    content: `The first law of thermodynamics is an energy-accounting principle: energy is conserved, although it may cross a system boundary as heat or work. For a closed system, using the convention that work done by the system is positive, the change in internal energy is written as ΔU = Q − W. Internal energy is a state function, so its change depends only on the initial and final states, whereas heat and work are path functions. During a cyclic process the system returns to its initial state and therefore has zero net change in internal energy; the net heat supplied equals the net work delivered. In a steady-flow control volume, enthalpy is often used with kinetic and potential energy terms to describe devices such as turbines, compressors, pumps, boilers, and nozzles. The first law alone does not determine whether a process is possible or the direction in which it proceeds; that role belongs to the second law. It also does not assign a unique value to absolute internal energy, only differences between states. Careful definition of the system, sign convention, and boundary work is therefore essential before applying an energy balance.`,
    detectedConcepts: ['Energy conservation', 'Internal energy as a state function', 'Heat and work', 'Cyclic process', 'Steady-flow energy balance'],
    questionOpportunities: UNIVERSITY_OPPORTUNITIES,
    questions: [
      q('Direct MCQ', 'Easy', 'Energy conservation', 'For a closed system with work done by the system taken as positive, the first-law relation is:', ['ΔU = Q − W', 'ΔU = Q + W', 'ΔU = W − Q', 'ΔU = QW'], 0, 'With this convention, heat entering raises internal energy and work leaving lowers it.'),
      q('Conceptual', 'Medium', 'Internal energy as a state function', 'Which quantity is a state function?', ['Internal energy', 'Heat supplied', 'Work done', 'Path length'], 0, 'Internal energy depends only on the state, not the path used to reach it.'),
      q('Application Based', 'Medium', 'Cyclic process', 'A gas completes a cycle and receives 500 kJ of net heat. How much net work does it deliver?', ['500 kJ', '0 kJ', '−500 kJ', '250 kJ'], 0, 'For a cycle ΔU = 0, so Qnet = Wnet under the stated sign convention.'),
      q('Statement Based', 'Medium', 'Heat and work', 'Statement: Heat and work are properties stored inside a system. This statement is:', ['False; they are modes of energy transfer', 'True for a closed system only', 'True at equilibrium', 'False because energy cannot cross a boundary'], 0, 'Heat and work describe energy crossing a boundary, whereas internal energy is stored in the system.'),
      q('Fill in the Blank', 'Easy', 'Cyclic process', 'For a complete thermodynamic cycle, the net change in internal energy is ______.', [], 'zero', 'The final state equals the initial state, and internal energy is a state function.'),
      q('Short Answer', 'Medium', 'Steady-flow energy balance', 'Name one device commonly analysed with a steady-flow energy balance.', [], 'turbine', 'Turbines, compressors, pumps, boilers and nozzles are standard steady-flow devices.'),
      q('Why / Reasoning', 'Hard', 'Internal energy as a state function', 'Why can heat and work have different values for two paths between the same states?', ['They are path functions, while the internal-energy change is fixed by the endpoints', 'They are both state functions', 'The first law applies only to cycles', 'The system has no internal energy'], 0, 'Different paths can transfer different amounts of heat and work even though their difference gives the same ΔU.'),
      q('Multiple Statement', 'Hard', 'Energy conservation', 'Which statements are correct? I. The first law expresses energy conservation. II. It gives the direction of every process. III. It can be applied to closed systems.', ['I and III only', 'I and II only', 'II and III only', 'I, II and III'], 0, 'The first law conserves energy and applies to closed systems, but process direction requires the second law.'),
      q('Match the Following', 'Medium', 'Heat and work', 'Match the term with its description: internal energy — ?; heat — ?; work — ?', ['State property; boundary transfer due to temperature difference; boundary transfer by force/displacement', 'Path function; stored energy; temperature', 'Temperature; state property; volume'], 0, 'The distinction between state properties and transfer modes is central to the first law.'),
      q('Direct MCQ', 'Easy', 'Cyclic process', 'In a cyclic process, the first law requires that net heat be equal to:', ['Net work', 'The final internal energy', 'The absolute temperature', 'Zero in every case'], 0, 'Since ΔU is zero over a cycle, Qnet − Wnet = 0.'),
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 4 · University · Electrical Engineering · Digital Electronics        */
  /* ------------------------------------------------------------------ */
  {
    id: 'mas-uni-ee-logic-gates',
    title: 'Logic Gates: Building Decisions from Boolean Signals',
    domain: 'university',
    examFamily: null,
    subject: 'Electrical Engineering',
    chapter: 'Digital Electronics',
    topic: 'Logic Gates',
    sourceType: 'Lecture Notes',
    content: `Digital logic represents information with discrete signal levels, commonly interpreted as binary zero and one. A logic gate maps one or more input signals to an output according to a Boolean rule. An AND gate produces one only when every input is one, while an OR gate produces one when at least one input is one. A NOT gate complements a single input. NAND and NOR are universal gates because any Boolean function can be constructed using only gates of either type. XOR produces one when its inputs are different, which makes it useful in adders and parity circuits; XNOR produces one when the inputs are equal. Truth tables enumerate all input combinations and are a direct way to verify a Boolean expression. De Morgan’s laws connect complemented sums and products: the complement of an AND is equivalent to the OR of complemented inputs, and the complement of an OR is equivalent to the AND of complemented inputs. Real circuits also have propagation delay, fan-in limits, and noise margins, so an ideal truth table is a logical abstraction rather than a complete physical specification.`,
    detectedConcepts: ['Boolean signals', 'AND/OR/NOT behaviour', 'Universal NAND and NOR gates', 'XOR and XNOR', 'Truth tables and De Morgan laws'],
    questionOpportunities: UNIVERSITY_OPPORTUNITIES,
    questions: [
      q('Direct MCQ', 'Easy', 'AND/OR/NOT behaviour', 'What is the output of a two-input AND gate when the inputs are 1 and 0?', ['0', '1', 'Undefined', 'It alternates'], 0, 'AND requires every input to be one, so a zero input makes the output zero.'),
      q('Conceptual', 'Easy', 'XOR and XNOR', 'An XOR gate outputs one when its inputs are:', ['Different', 'Both zero', 'Both one only', 'Disconnected'], 0, 'XOR represents inequality for two binary inputs.'),
      q('Application Based', 'Medium', 'XOR and XNOR', 'Which gate is most directly useful for detecting whether two binary inputs are equal?', ['XNOR', 'XOR', 'OR', 'NAND'], 0, 'XNOR outputs one for equal input pairs and zero for unequal pairs.'),
      q('Statement Based', 'Medium', 'Universal NAND and NOR gates', 'Statement: NAND alone can be used to construct any Boolean function. This statement is:', ['True; NAND is functionally complete', 'False; only AND is universal', 'True only with analogue signals', 'False because NAND has two inputs'], 0, 'NAND is a universal gate and can implement NOT, AND and OR combinations.'),
      q('Fill in the Blank', 'Easy', 'Boolean signals', 'A NOT gate produces the ______ of its input.', [], 'complement', 'NOT changes one to zero and zero to one.'),
      q('Short Answer', 'Medium', 'Truth tables and De Morgan laws', 'What does a truth table list for a Boolean circuit?', [], 'all input combinations and their corresponding outputs', 'A truth table exhaustively records output values for every possible input combination.'),
      q('Why / Reasoning', 'Hard', 'Truth tables and De Morgan laws', 'Why are truth tables useful when checking a proposed Boolean simplification?', ['They compare the outputs for every possible input combination', 'They eliminate propagation delay physically', 'They change binary signals into analogue signals', 'They prove a circuit has no power consumption'], 0, 'Equivalent expressions must produce the same output for every input row.'),
      q('Multiple Statement', 'Hard', 'Universal NAND and NOR gates', 'Which statements are correct? I. NAND is universal. II. NOR is universal. III. XOR is one when two inputs differ.', ['I, II and III', 'I and II only', 'I and III only', 'II and III only'], 0, 'All three are standard properties of these gates.'),
      q('Diagram Based', 'Medium', 'AND/OR/NOT behaviour', 'A circuit symbol has two inputs entering an AND-shaped gate followed by a small inversion bubble. Which operation does it represent?', ['NAND', 'NOR', 'XOR', 'XNOR'], 0, 'An inversion bubble after an AND operation makes the output NAND.'),
      q('Direct MCQ', 'Easy', 'Universal NAND and NOR gates', 'Which pair contains only universal gates?', ['NAND and NOR', 'AND and OR', 'XOR and XNOR', 'NOT and XOR'], 0, 'NAND and NOR can each implement a complete Boolean basis.'),
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 5 · University · Physics · Quantum Mechanics                         */
  /* ------------------------------------------------------------------ */
  {
    id: 'mas-uni-physics-wave-particle',
    title: 'Wave–Particle Duality: Two Complementary Descriptions',
    domain: 'university',
    examFamily: null,
    subject: 'Physics',
    chapter: 'Quantum Mechanics',
    topic: 'Wave-Particle Duality',
    sourceType: 'Textbook',
    content: `Wave–particle duality describes the observation that electromagnetic radiation and matter can display both wave-like and particle-like behaviour. The photoelectric effect shows that light transfers energy in discrete quanta: the energy of one photon is E = hν, and emission requires the photon frequency to exceed a material-dependent threshold. Increasing intensity above threshold increases the number of emitted electrons, whereas increasing frequency changes their maximum kinetic energy. Louis de Broglie proposed that a particle with momentum p has an associated wavelength λ = h/p. Electron diffraction later confirmed that matter can produce interference patterns under suitable conditions. These results do not mean that a classical object simply changes between two everyday identities. Rather, quantum experiments are described by a state and by measurement probabilities; the setup determines which observable can be revealed. The uncertainty principle limits the simultaneous precision with which conjugate quantities such as position and momentum can be known. A wavefunction is used to calculate probabilities, while a measurement yields a definite recorded outcome. The dual description is therefore a central feature of quantum theory, not a failure to choose a classical model.`,
    detectedConcepts: ['Photon energy', 'Photoelectric threshold', 'de Broglie wavelength', 'Electron diffraction', 'Measurement and uncertainty'],
    questionOpportunities: UNIVERSITY_OPPORTUNITIES,
    questions: [
      q('Direct MCQ', 'Easy', 'Photon energy', 'The energy of a photon of frequency ν is:', ['hν', 'h/ν', 'ν/h', 'mc²ν'], 0, 'Planck’s relation gives photon energy as E = hν.'),
      q('Conceptual', 'Medium', 'Photoelectric threshold', 'In the photoelectric effect, increasing light frequency above threshold primarily increases the:', ['Maximum kinetic energy of emitted electrons', 'Number of photons only, at fixed intensity', 'Electron rest mass', 'Threshold frequency of the material'], 0, 'The maximum kinetic energy depends on photon energy and therefore on frequency.'),
      q('Application Based', 'Medium', 'de Broglie wavelength', 'If a particle’s momentum is doubled, its de Broglie wavelength becomes:', ['Half as large', 'Twice as large', 'Unchanged', 'Four times as large'], 0, 'Because λ = h/p, wavelength is inversely proportional to momentum.'),
      q('Statement Based', 'Medium', 'Electron diffraction', 'Statement: Electron diffraction is evidence that matter can show wave-like behaviour. This statement is:', ['True', 'False; electrons are always classical particles', 'True only for photons', 'False; diffraction is a thermal effect'], 0, 'Diffraction and interference are characteristic wave phenomena.'),
      q('Fill in the Blank', 'Easy', 'de Broglie wavelength', 'The de Broglie wavelength of a particle is λ = ______.', [], 'h/p', 'The wavelength is Planck’s constant divided by the particle momentum.'),
      q('Short Answer', 'Medium', 'Measurement and uncertainty', 'Name the pair of conjugate quantities commonly used to illustrate the uncertainty principle.', [], 'position and momentum', 'Position and momentum cannot both be assigned arbitrarily precise simultaneous values.'),
      q('Why / Reasoning', 'Hard', 'Photoelectric threshold', 'Why does light below a metal’s threshold frequency fail to eject electrons even when its intensity is increased?', ['Each photon lacks the minimum energy required for emission', 'Intensity changes the value of Planck’s constant', 'Electrons stop having charge', 'The wavelength becomes zero'], 0, 'Increasing intensity supplies more low-energy photons, but does not raise the energy of each photon.'),
      q('Multiple Statement', 'Hard', 'Photon energy', 'Which statements are correct? I. Photon energy is proportional to frequency. II. Matter can diffract. III. λ = h/p.', ['I, II and III', 'I and II only', 'II and III only', 'I and III only'], 0, 'These are the central experimental and theoretical statements in the passage.'),
      q('Match the Following', 'Medium', 'Photoelectric threshold', 'Match the quantity with its relation: photon energy — ?; de Broglie wavelength — ?; threshold frequency — ?', ['hν; h/p; minimum frequency for emission', 'h/p; hν; maximum intensity', 'mc²; p/h; minimum wavelength only'], 0, 'Each relation connects an observable quantity with the relevant quantum condition.'),
      q('Direct MCQ', 'Easy', 'Measurement and uncertainty', 'A wavefunction is primarily used to calculate:', ['Measurement probabilities', 'A particle’s exact classical path at all times', 'The material’s threshold work function without data', 'The speed of light in vacuum'], 0, 'The wavefunction encodes probability amplitudes from which measurable probabilities are obtained.'),
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 6 · Competitive · JEE · Physics · Rotational Motion                  */
  /* ------------------------------------------------------------------ */
  {
    id: 'mas-jee-physics-rotational-motion',
    title: 'Rotational Motion: Torque, Inertia and Angular Momentum',
    domain: 'competitive',
    examFamily: 'JEE',
    subject: 'Physics',
    chapter: 'Rotational Motion',
    topic: 'Torque and Angular Momentum',
    sourceType: 'NCERT / Study Material',
    content: `Rotational motion is described with angular displacement, angular velocity, and angular acceleration. The rotational analogue of Newton’s second law is τ = Iα, where torque τ produces angular acceleration α and the moment of inertia I measures resistance to a change in rotation. For a point mass, I = mr², so moving mass farther from the axis increases rotational inertia. Torque is the vector product r × F; only the component of force perpendicular to the position vector contributes to its magnitude. Angular momentum is L = Iω for a rigid body rotating about a fixed axis, and an external net torque changes it according to τext = dL/dt. If external torque is negligible, angular momentum remains conserved even when the moment of inertia changes. A spinning skater therefore rotates faster while drawing in the arms. Rolling without slipping combines translation and rotation through v = Rω, while the total kinetic energy includes both centre-of-mass translation and rotation about the centre of mass. The parallel-axis theorem, I = Icm + Md², shifts a known moment of inertia to a parallel axis and is often needed in composite-body problems.`,
    detectedConcepts: ['Torque and lever arm', 'Moment of inertia', 'Angular momentum conservation', 'Rolling without slipping', 'Parallel-axis theorem'],
    questionOpportunities: COMPETITIVE_OPPORTUNITIES,
    questions: [
      q('Direct MCQ', 'Easy', 'Torque and lever arm', 'The magnitude of torque due to a force F applied at perpendicular distance r is:', ['rF', 'r/F', 'F/r', 'r + F'], 0, 'For a perpendicular force, τ = rF.'),
      q('Conceptual', 'Medium', 'Moment of inertia', 'For the same mass and angular speed, which change increases a body’s rotational kinetic energy?', ['Increasing its moment of inertia', 'Reducing its moment of inertia to zero', 'Changing only the angle unit', 'Removing the axis'], 0, 'Rotational kinetic energy is one-half Iω².'),
      q('Application Based', 'Hard', 'Angular momentum conservation', 'A skater reduces her moment of inertia to half while no external torque acts. Her angular speed becomes:', ['Twice the original value', 'Half the original value', 'Unchanged', 'Four times the original value'], 0, 'Conservation of Iω gives Iω = (I/2)ωnew, hence ωnew = 2ω.'),
      q('Statement Based', 'Medium', 'Torque and lever arm', 'Statement: A force directed exactly along the position vector produces maximum torque. This statement is:', ['False; its perpendicular component is zero', 'True for every force', 'True only for a point mass', 'False because torque has no direction'], 0, 'The angle between r and F is zero, so rF sinθ vanishes.'),
      q('Fill in the Blank', 'Easy', 'Rolling without slipping', 'For rolling without slipping, the centre-of-mass speed is v = ______.', [], 'Rω', 'The point of contact is instantaneously at rest, giving v = Rω.'),
      q('Short Answer', 'Medium', 'Parallel-axis theorem', 'Write the parallel-axis theorem for a mass M whose axis is distance d from the centre-of-mass axis.', [], 'I = Icm + Md²', 'The theorem adds the translational contribution Md² to the centre-of-mass value.'),
      q('Why / Reasoning', 'Hard', 'Moment of inertia', 'Why does moving mass away from the rotation axis make a body harder to angularly accelerate?', ['Its moment of inertia increases because the contribution contains r²', 'Torque becomes independent of distance', 'Angular momentum becomes zero', 'The mass loses inertia'], 0, 'For point masses I contains mr², so distant mass contributes disproportionately to rotational inertia.'),
      q('Multiple Statement', 'Hard', 'Angular momentum conservation', 'Which statements are correct? I. Zero external torque implies angular-momentum conservation. II. τ = Iα for a fixed-axis rigid body. III. Rolling without slipping gives v = Rω.', ['I, II and III', 'I and II only', 'II and III only', 'I and III only'], 0, 'All three relations are part of the rotational-motion model used here.'),
      q('Match the Following', 'Medium', 'Torque and lever arm', 'Match the rotational quantity with its relation: torque — ?; angular momentum — ?; rotational kinetic energy — ?', ['r × F; Iω; ½Iω²', 'Iα; mr²; mgh', 'F/r; I/ω; Iω'], 0, 'These are the vector and scalar relations connecting force, rotation and energy.'),
      q('Direct MCQ', 'Easy', 'Moment of inertia', 'The moment of inertia of a point mass m at distance r from an axis is:', ['mr²', 'm/r²', 'm + r²', 'm²r'], 0, 'The point-mass definition is I = mr².'),
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 7 · Competitive · JEE · Chemistry · Chemical Equilibrium             */
  /* ------------------------------------------------------------------ */
  {
    id: 'mas-jee-chem-equilibrium',
    title: 'Chemical Equilibrium: Reading the Equilibrium Constant',
    domain: 'competitive',
    examFamily: 'JEE',
    subject: 'Chemistry',
    chapter: 'Chemical Equilibrium',
    topic: 'Equilibrium Constant',
    sourceType: 'Study Material',
    content: `A reversible reaction reaches dynamic equilibrium in a closed system when the forward and reverse reaction rates become equal. The concentrations of reactants and products then remain constant with time, although molecules continue to react. For a reaction aA + bB ⇌ cC + dD, the concentration equilibrium constant is Kc = [C]^c[D]^d / ([A]^a[B]^b), with each concentration interpreted relative to a standard state. Pure solids and pure liquids are omitted from this expression because their activities are effectively constant. The reaction quotient Qc has the same form but uses concentrations at any instant. Comparing Qc with Kc predicts the direction of net change: Qc < Kc favours products, while Qc > Kc favours reactants. Changing temperature changes the value of K because it changes the thermodynamic balance of the reaction; a catalyst changes the rates of both directions and does not change K. Pressure or concentration changes can shift the equilibrium composition, but they do not alter K at fixed temperature. When a reaction equation is reversed, its equilibrium constant becomes the reciprocal; multiplying the equation by n raises K to the nth power.`,
    detectedConcepts: ['Dynamic equilibrium', 'Kc expression', 'Reaction quotient Qc', 'Effect of catalysts and temperature', 'Changing reaction equations'],
    questionOpportunities: COMPETITIVE_OPPORTUNITIES,
    questions: [
      q('Direct MCQ', 'Easy', 'Dynamic equilibrium', 'At dynamic equilibrium, the forward and reverse reaction rates are:', ['Equal', 'Both zero', 'Always unequal', 'Infinite'], 0, 'Dynamic equilibrium is defined by equal opposing rates, not by stopped molecular motion.'),
      q('Conceptual', 'Medium', 'Kc expression', 'Why are pure solids omitted from a concentration-based equilibrium expression?', ['Their activity is treated as constant', 'They never participate in reactions', 'They have zero concentration', 'They always have Kc equal to zero'], 0, 'A pure solid has effectively constant activity, so it is absorbed into the constant.'),
      q('Application Based', 'Hard', 'Reaction quotient Qc', 'For a reaction, Qc is smaller than Kc. What is the initial direction of the net reaction?', ['Towards products', 'Towards reactants', 'No net change is possible', 'It depends only on a catalyst'], 0, 'The system must increase Qc until it reaches Kc, so products form overall.'),
      q('Statement Based', 'Medium', 'Effect of catalysts and temperature', 'Statement: A catalyst changes the equilibrium constant at a fixed temperature. This statement is:', ['False; it changes rates, not K', 'True for an exothermic reaction only', 'True for every reversible reaction', 'False because catalysts stop the reverse reaction'], 0, 'A catalyst lowers activation barriers for both directions and leaves the equilibrium composition unchanged.'),
      q('Fill in the Blank', 'Easy', 'Kc expression', 'For aA + bB ⇌ cC + dD, the powers in Kc are the reaction ______.', [], 'stoichiometric coefficients', 'The balanced coefficients become exponents in the concentration expression.'),
      q('Short Answer', 'Medium', 'Changing reaction equations', 'What happens to K when a reaction is written in the reverse direction?', [], 'It becomes the reciprocal', 'Reversing reactants and products changes K to 1/K.'),
      q('Why / Reasoning', 'Hard', 'Effect of catalysts and temperature', 'Why does increasing temperature alter K whereas adding a catalyst does not?', ['Temperature changes the energy balance; a catalyst changes the pathway and rates', 'A catalyst changes enthalpy but temperature does not', 'Both always alter K equally', 'Temperature only affects solids'], 0, 'K reflects thermodynamic favourability at a temperature, while a catalyst affects kinetics.'),
      q('Multiple Statement', 'Hard', 'Dynamic equilibrium', 'Which statements are correct? I. Equilibrium is dynamic. II. Qc can predict the direction of shift. III. K is fixed when temperature is fixed.', ['I, II and III', 'I and II only', 'II and III only', 'I and III only'], 0, 'All three describe the equilibrium framework in the source.'),
      q('Match the Following', 'Medium', 'Changing reaction equations', 'Match the equation change with its effect on K: reverse reaction — ?; multiply coefficients by n — ?; add reactions — ?', ['Reciprocal; K raised to n; product of constants', 'K raised to n; reciprocal; sum of constants'], 0, 'Equilibrium constants transform algebraically with the way balanced equations are combined.'),
      q('Direct MCQ', 'Easy', 'Reaction quotient Qc', 'If Qc = Kc for a reaction mixture, the mixture is:', ['At equilibrium', 'Certain to be all products', 'Certain to be all reactants', 'At absolute zero'], 0, 'Equality of reaction quotient and equilibrium constant indicates no net composition change.'),
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 8 · Competitive · JEE · Mathematics · Definite Integration           */
  /* ------------------------------------------------------------------ */
  {
    id: 'mas-jee-math-definite-integrals',
    title: 'Definite Integration: Symmetry, Bounds and Area',
    domain: 'competitive',
    examFamily: 'JEE',
    subject: 'Mathematics',
    chapter: 'Definite Integration',
    topic: 'Properties of Definite Integrals',
    sourceType: 'Study Material',
    content: `A definite integral assigns a signed accumulation to a function over a closed interval. If F is an antiderivative of f, the fundamental theorem gives ∫a^b f(x) dx = F(b) − F(a). Several properties make competitive problems shorter than direct antiderivative work. Reversing the limits changes the sign, and splitting an interval at c preserves the total integral. A function symmetric about the origin is even when f(−x) = f(x) and odd when f(−x) = −f(x). On a symmetric interval [−a, a], the integral of an odd function is zero, while the integral of an even function is twice the integral from zero to a. Substitution can map an interval onto itself and reveal a relation between f(x) and f(a + b − x), often allowing two copies of the same integral to be combined. An integral represents signed area; geometric area requires attention to where the graph lies below the axis. Comparison, positivity, and bounds can also establish whether an answer is plausible before calculating it. The integrand must be integrable on the interval, and a visual symmetry argument is valid only when the stated interval and transformation genuinely preserve the domain.`,
    detectedConcepts: ['Fundamental theorem', 'Limit reversal and interval splitting', 'Even and odd functions', 'Symmetry substitution', 'Signed area and bounds'],
    questionOpportunities: COMPETITIVE_OPPORTUNITIES,
    questions: [
      q('Direct MCQ', 'Easy', 'Even and odd functions', 'If f is odd and integrable, then ∫−a^a f(x) dx equals:', ['0', '2a', 'a²', 'The value of f(a)'], 0, 'Values at symmetric points cancel for an odd function.'),
      q('Conceptual', 'Medium', 'Limit reversal and interval splitting', 'What happens when the limits of a definite integral are reversed?', ['The integral changes sign', 'The integral is always doubled', 'The integrand becomes even', 'The integral becomes undefined'], 0, '∫b^a f(x)dx = −∫a^b f(x)dx.'),
      q('Application Based', 'Hard', 'Even and odd functions', 'Evaluate ∫−2^2 (x³ + 4x²) dx using parity without finding a full antiderivative.', ['64/3', '0', '32/3', '16'], 0, 'The odd x³ part integrates to zero; 4x² contributes 4·(2·8/3) = 64/3.'),
      q('Statement Based', 'Medium', 'Signed area and bounds', 'Statement: A definite integral always equals the geometric area between a curve and the x-axis. This statement is:', ['False; portions below the axis contribute negatively', 'True for every continuous function', 'True only for odd functions', 'False because integrals never represent area'], 0, 'The definite integral is signed area; absolute or split integrals may be needed for geometric area.'),
      q('Fill in the Blank', 'Easy', 'Fundamental theorem', 'If F′(x) = f(x), then ∫a^b f(x) dx = ______.', [], 'F(b) − F(a)', 'The fundamental theorem evaluates a definite integral using endpoint values of an antiderivative.'),
      q('Short Answer', 'Medium', 'Even and odd functions', 'State the defining relation for an even function.', [], 'f(−x) = f(x)', 'An even function has reflection symmetry about the y-axis.'),
      q('Why / Reasoning', 'Hard', 'Symmetry substitution', 'Why can a substitution x ↦ a + b − x simplify an integral over [a, b]?', ['It maps the interval to itself and can pair complementary values', 'It always makes the derivative zero', 'It removes the limits from every integral', 'It applies only to discontinuous functions'], 0, 'The transformation reverses the interval, allowing related integrand values to be added or compared.'),
      q('Multiple Statement', 'Hard', 'Limit reversal and interval splitting', 'Which properties are correct? I. An interval may be split at an interior point. II. Reversing limits changes sign. III. A constant may be taken outside the integral.', ['I, II and III', 'I and II only', 'II and III only', 'I and III only'], 0, 'All are standard linearity and interval properties of definite integrals.'),
      q('Match the Following', 'Medium', 'Even and odd functions', 'Match the function property with its symmetric-interval result: odd — ?; even — ?', ['Integral zero; twice the integral from 0 to a', 'Twice the integral from 0 to a; integral zero'], 0, 'Odd cancellation and even doubling are the two basic parity shortcuts.'),
      q('Direct MCQ', 'Easy', 'Limit reversal and interval splitting', 'Which equality is valid for an integrable f and a point c between a and b?', ['∫a^b f = ∫a^c f + ∫c^b f', '∫a^b f = ∫a^c f − ∫c^b f always', '∫a^b f = ∫b^a f', '∫a^b f = f(b) − f(a)'], 0, 'Additivity over adjacent intervals preserves the accumulated signed area.'),
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 9 · Competitive · NEET · Biology · Human Physiology                  */
  /* ------------------------------------------------------------------ */
  {
    id: 'mas-neet-biology-cardiac-cycle',
    title: 'Cardiac Cycle: Coordinating Chambers, Valves and Flow',
    domain: 'competitive',
    examFamily: 'NEET',
    subject: 'Biology',
    chapter: 'Human Physiology',
    topic: 'Cardiac Cycle',
    sourceType: 'NCERT',
    content: `The human heart maintains one-directional blood flow through coordinated contraction and relaxation of its chambers. A cardiac cycle includes atrial systole, ventricular systole, and a period of joint diastole. During atrial systole, the atria contract and complete the filling of the ventricles through the atrioventricular valves. Ventricular systole begins when the ventricles contract; rising pressure closes the atrioventricular valves and prevents backflow into the atria. When ventricular pressure exceeds the pressure in the pulmonary artery and aorta, the semilunar valves open and blood is ejected. During ventricular diastole, pressure falls, the semilunar valves close, and the ventricles fill again. The familiar first heart sound is associated mainly with closure of the atrioventricular valves, and the second sound with closure of the semilunar valves. Cardiac output is the volume pumped by one ventricle per minute and equals heart rate multiplied by stroke volume. The right side sends deoxygenated blood to the lungs through pulmonary circulation, while the left side sends oxygenated blood to the body through systemic circulation. Septa keep the oxygenated and deoxygenated streams separate in the normal heart.`,
    detectedConcepts: ['Atrial and ventricular systole', 'Atrioventricular valves', 'Semilunar valves', 'Heart sounds', 'Cardiac output and circulation'],
    questionOpportunities: COMPETITIVE_OPPORTUNITIES,
    questions: [
      q('Direct MCQ', 'Easy', 'Atrioventricular valves', 'Which valves close mainly at the beginning of ventricular systole?', ['Atrioventricular valves', 'Semilunar valves', 'Only the pulmonary valve', 'No valves'], 0, 'Ventricular pressure rises above atrial pressure and closes the AV valves.'),
      q('Conceptual', 'Medium', 'Cardiac output and circulation', 'Cardiac output is calculated as:', ['Heart rate × stroke volume', 'Heart rate ÷ stroke volume', 'Stroke volume ÷ blood pressure', 'Atrial pressure × valve area'], 0, 'Each minute, the number of beats is multiplied by the volume ejected per beat.'),
      q('Application Based', 'Medium', 'Semilunar valves', 'If ventricular pressure becomes greater than aortic pressure, which event follows on the left side?', ['The aortic semilunar valve opens and blood is ejected', 'The mitral valve opens immediately', 'The septum dissolves', 'The pulmonary vein closes'], 0, 'A pressure gradient from the ventricle to the aorta opens the aortic valve.'),
      q('Statement Based', 'Medium', 'Heart sounds', 'Statement: The second heart sound is associated mainly with closure of the atrioventricular valves. This statement is:', ['False; it is associated mainly with semilunar-valve closure', 'True in every phase', 'True only during atrial systole', 'False because valves do not produce sounds'], 0, 'The second sound follows ventricular ejection as the semilunar valves close.'),
      q('Fill in the Blank', 'Easy', 'Atrial and ventricular systole', 'The relaxation phase of a chamber is called ______.', [], 'diastole', 'Diastole is the relaxation and filling phase, contrasted with systole.'),
      q('Short Answer', 'Medium', 'Cardiac output and circulation', 'Which side of the heart pumps deoxygenated blood to the lungs?', [], 'the right side', 'The right ventricle sends deoxygenated blood through the pulmonary artery.'),
      q('Why / Reasoning', 'Hard', 'Atrioventricular valves', 'Why do atrioventricular valves close during ventricular systole?', ['Ventricular pressure exceeds atrial pressure and would otherwise cause backflow', 'Atrial pressure becomes infinite', 'The semilunar valves pull them shut by a tendon', 'Blood stops moving in the ventricle'], 0, 'Pressure reversal across the AV valves prevents regurgitation into the atria.'),
      q('Multiple Statement', 'Hard', 'Cardiac output and circulation', 'Which statements are correct? I. Cardiac output equals heart rate times stroke volume. II. The right side serves pulmonary circulation. III. Septa help separate blood streams.', ['I, II and III', 'I and II only', 'II and III only', 'I and III only'], 0, 'Each statement describes a core feature of normal cardiac function.'),
      q('Diagram Based', 'Medium', 'Cardiac output and circulation', 'In a simplified heart diagram, an arrow leaves the right ventricle and enters the pulmonary artery. What does that arrow represent?', ['Deoxygenated blood moving toward the lungs', 'Oxygenated blood moving to the body', 'Blood returning from the lungs to the left atrium', 'Blood entering the right atrium from the vena cava'], 0, 'The pulmonary artery carries deoxygenated blood from the right ventricle to the lungs.'),
      q('Direct MCQ', 'Easy', 'Semilunar valves', 'The semilunar valves close primarily when:', ['Ventricular pressure falls below arterial pressure', 'Atrial pressure exceeds ventricular pressure before filling', 'Heart rate becomes zero', 'The septum opens'], 0, 'A brief reverse pressure gradient closes the aortic and pulmonary valves.'),
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 10 · Competitive · NEET · Chemistry · Coordination Compounds        */
  /* ------------------------------------------------------------------ */
  {
    id: 'mas-neet-chem-coordination',
    title: 'Coordination Compounds: Ligands, Number and Geometry',
    domain: 'competitive',
    examFamily: 'NEET',
    subject: 'Chemistry',
    chapter: 'Coordination Compounds',
    topic: 'Coordination Number and Ligands',
    sourceType: 'NCERT',
    content: `A coordination compound contains a central metal atom or ion surrounded by ions or molecules called ligands. A ligand donates a lone pair to the metal centre to form a coordinate bond. The coordination number is the number of donor atoms directly attached to the central metal, not simply the number of ligand molecules. Thus, a bidentate ligand contributes two donor atoms, while a monodentate ligand contributes one. The coordination sphere is written inside square brackets, and ions outside the brackets are counter ions that balance charge. Common geometries include octahedral, tetrahedral, and square planar arrangements, although the actual structure depends on the metal, oxidation state, ligand size, and electronic configuration. Ligands may be neutral, such as NH3 and H2O, or negatively charged, such as Cl− and CN−. Ambidentate ligands can attach through different donor atoms, creating linkage isomerism. Chelating ligands bind through multiple donor atoms and often form more stable complexes because a ring is produced with the metal centre. To name a complex, ligands are identified before the metal and prefixes indicate their numbers; oxidation state is then specified for the metal. Charge balance and donor-atom counting should be performed separately.`,
    detectedConcepts: ['Central metal and coordinate bond', 'Monodentate and bidentate ligands', 'Coordination number', 'Coordination sphere and counter ions', 'Chelation and nomenclature'],
    questionOpportunities: COMPETITIVE_OPPORTUNITIES,
    questions: [
      q('Direct MCQ', 'Easy', 'Coordination number', 'The coordination number counts the number of:', ['Donor atoms directly attached to the metal', 'Ligand molecules outside the brackets', 'Counter ions only', 'All atoms in the formula'], 0, 'Coordination number is based on metal–donor-atom attachments.'),
      q('Conceptual', 'Medium', 'Monodentate and bidentate ligands', 'A bidentate ligand contributes how many donor atoms to a coordination sphere?', ['Two', 'One', 'Zero', 'The total charge only'], 0, 'Bi means two; a bidentate ligand binds through two donor atoms.'),
      q('Application Based', 'Hard', 'Coordination number', 'What is the coordination number of the metal in [Co(en)3]3+, where en is bidentate?', ['6', '3', '9', '2'], 0, 'Three ethylenediamine ligands each contribute two donor atoms, giving six.'),
      q('Statement Based', 'Medium', 'Coordination sphere and counter ions', 'Statement: Ions outside square brackets belong to the coordination sphere. This statement is:', ['False; they are counter ions outside the sphere', 'True for every salt', 'True only for neutral ligands', 'False because square brackets have no chemical meaning'], 0, 'The bracketed portion is the coordination sphere; external ions balance its charge.'),
      q('Fill in the Blank', 'Easy', 'Central metal and coordinate bond', 'A ligand donates a ______ pair to the central metal.', [], 'lone', 'A coordinate bond forms when the ligand supplies both bonding electrons.'),
      q('Short Answer', 'Medium', 'Chelation and nomenclature', 'What is a chelating ligand?', [], 'a ligand that binds through two or more donor atoms', 'Multiple donor atoms allow one ligand to form a ring with the metal centre.'),
      q('Why / Reasoning', 'Hard', 'Chelation and nomenclature', 'Why are chelate complexes often more stable than comparable complexes with separate monodentate ligands?', ['One ligand makes multiple attachments and forms a stabilising chelate ring', 'Chelating ligands never have lone pairs', 'The metal loses all charge', 'Counter ions enter the coordination sphere automatically'], 0, 'Multiple donor attachments and ring formation contribute to the chelate effect.'),
      q('Multiple Statement', 'Hard', 'Coordination sphere and counter ions', 'Which statements are correct? I. NH3 is a neutral ligand. II. CN− is negatively charged. III. Coordination number counts donor atoms.', ['I, II and III', 'I and II only', 'II and III only', 'I and III only'], 0, 'All three are basic coordination-compound conventions.'),
      q('Match the Following', 'Medium', 'Monodentate and bidentate ligands', 'Match the ligand description: monodentate — ?; bidentate — ?; ambidentate — ?', ['One donor atom; two donor atoms; alternative donor atoms', 'Two donor atoms; one donor atom; no donor atom'], 0, 'Dentate describes donor-atom count, while ambidentate ligands offer alternative attachment sites.'),
      q('Direct MCQ', 'Easy', 'Coordination sphere and counter ions', 'In a formula written as [M(L)2]Cl2, the chloride ions are generally:', ['Counter ions outside the coordination sphere', 'Bidentate ligands inside the sphere', 'The central metal', 'Donor atoms of L'], 0, 'The bracket boundary places chloride outside the coordination sphere.'),
    ],
  },
]

export const microAssessmentSources = sourceSpecs.map(buildSource)

export const MICRO_ASSESSMENT_SOURCE_TYPES = [
  'Textbook',
  'NCERT',
  'Lecture Notes',
  'PDF',
  'Faculty Notes',
  'Custom Text',
  'NCERT / Study Material',
  'Study Material',
]

export const MICRO_ASSESSMENT_DOMAINS = ['university', 'competitive']
export const MICRO_ASSESSMENT_EXAM_FAMILIES = ['JEE', 'NEET']

export const microAssessmentDataset = {
  sources: microAssessmentSources,
  sourceTypes: MICRO_ASSESSMENT_SOURCE_TYPES,
  domains: MICRO_ASSESSMENT_DOMAINS,
  examFamilies: MICRO_ASSESSMENT_EXAM_FAMILIES,
}

export default microAssessmentDataset
