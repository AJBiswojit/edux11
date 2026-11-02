/**
 * Deterministic AI tutor reply engine (prototype intelligence).
 *
 * Contextual, hand-authored responses used by:
 *   · POST /ai/tutor/respond (see ./assistant.js)
 *   · the chat UI fallback path, so a tutor surface never shows an
 *     "offline" state (Phase 27.1) — exposed to the UI through
 *     `services/ai-assistant.js`, never imported from a route module.
 *
 * CURRENT: deterministic prototype replies · FUTURE: backend LLM service.
 */


/* Exported so UI chat surfaces can fall back to the deterministic contextual
   engine instead of ever showing an "offline" state (Phase 27.1). */
export function generateTutorReply(question) {
  const q = question.toLowerCase()
  if (q.includes('dijkstra') || q.includes('shortest path')) {
    return 'Let’s work through Dijkstra together.\n\n**Intuition:** Dijkstra is *weighted BFS* — BFS spreads uniformly, Dijkstra always extends the currently-shortest known route (a min-heap does this in O(log V) per step).\n\n**Worked trace (A→E):**\n1. Settle A (0). Relax B:4, C:2.\n2. Settle C (2). Relax B:3 (improved!), D:10, E:12.\n3. Settle B (3). Relax D:8 (improved).\n4. Settle D (8). Relax E:10 (improved via D).\n5. Settle E (10). Done.\n\n**Key insight:** notice how B and E both *improved* — the algorithm never settles a node until its distance is final, which is exactly why negative edges break it.\n\n**Self-check:** why does a negative edge break “settle first”? *(Answer: a settled distance could later improve through the negative edge — the greedy invariant fails.)*\n\nWant 3 practice problems at your level?'
  }
  if (q.includes('tcp') || q.includes('congestion')) {
    return 'TCP congestion control — the AIMD “sawtooth” in one picture:\n\n- **Additive increase:** +1 MSS per RTT while no loss (slowly probe capacity).\n- **Multiplicative decrease:** ×½ on loss (react fast to congestion).\n- **Why half?** TCP can’t tell how severe congestion is, so it compromises — aggressive enough to relieve it, gentle enough to keep throughput.\n- **Modern variants:** CUBIC (Linux default) recovers faster on high-BDP links; BBR estimates bandwidth instead of reacting to loss.\n\n**Quick table:**\n| Variant | Growth | Response to loss |\n|---|---|---|\n| Reno | Linear | Halve |\n| CUBIC | Cubic | Halve |\n| BBR | Model-based | None (estimation) |\n\nI can draw the sawtooth step-by-step or quiz you — your call.'
  }
  if (q.includes('isolation') || q.includes('transaction')) {
    return 'Isolation levels, demystified:\n\n- **READ UNCOMMITTED** — dirty reads allowed (rarely used).\n- **READ COMMITTED** — only committed data; two reads may differ (non-repeatable read).\n- **REPEATABLE READ** — your reads are stable; phantom rows can still appear.\n- **SERIALIZABLE** — full isolation, usually via locks or snapshotting.\n\n**Memory hook:** each level removes exactly one anomaly (dirty read → non-repeatable → phantom). PostgreSQL’s REPEATABLE READ is stricter than the standard (snapshots prevent phantoms too).\n\nWant a 5-question quiz with explanations?'
  }
  if (q.includes('bias') || q.includes('variance')) {
    return 'Bias-variance with the dartboard analogy:\n\n- **High bias** — consistent but off-target aim (underfitting; linear model on curved data).\n- **High variance** — scattered throws (overfitting; deep tree that changes with any data wiggle).\n- **Total error** = bias² + variance + irreducible noise.\n\n**How to reduce:**\n- High bias → more features, more capacity, fewer constraints.\n- High variance → more data, regularisation, ensembles (bagging).\n- Find the sweet spot with **cross-validation**.\n\n**Hook:** BIAS = BLUNT aim; VARIANCE = VOLATILE results.'
  }
  if (q.includes('quiz') || q.includes('test me')) {
    return 'Here’s a 3-question mini-quiz on your current weak areas (Networks & DSA):\n\n**Q1.** In TCP, after a loss event, Reno sets cwnd to… *(a) 1 MSS (b) half — ✓ (c) unchanged (d) double)*\n\n**Q2.** Edmonds–Karp uses which traversal for augmenting paths? *(a) DFS (b) BFS — ✓ (c) Topological (d) Random)*\n\n**Q3.** Which isolation level permits phantoms? *(a) Serializable (b) Repeatable Read — ✓ (c) None (d) Read Uncommitted)*\n\nTell me your answers and I’ll grade with explanations — then we’ll target the one you miss.'
  }
  if (q.includes('plan') || q.includes('revision') || q.includes('midsem')) {
    return 'Here’s a **5-day midsem revision plan** tuned to your gaps (Networks 69, ToC 64):\n\n**Day 1 — Networks foundation (2 hrs):** TCP/IP stack, congestion control. *Goal: close the biggest gap first.*\n**Day 2 — DSA (2 hrs):** Graph algorithms sprint — Dijkstra, MST, flows. 20 problems on the coding lab.\n**Day 3 — ToC (1.5 hrs):** Pumping lemma proofs with worked examples; 10 drills.\n**Day 4 — DBMS + OS (2 hrs):** Transactions/isolation + scheduling; flashcards review.\n**Day 5 — Full mock (3 hrs):** Timed mock test, then targeted fixes.\n\nI’ve added these to your planner — say “adjust” to change any slot.'
  }
  if (q.includes('recursion')) {
    return 'Recursion — the mirror analogy:\n\nA function that calls itself is a mirror facing a mirror: each call is a *smaller* version of the same problem, until the base case ends the reflection.\n\n**The three laws:**\n1. **Base case** — the mirror stops (else: infinite loop).\n2. **Smaller step** — each call shrinks the problem.\n3. **Combine** — results build back up as calls return.\n\n**Worked example — factorial:**\n`fact(4) = 4 × fact(3) = 4 × 3 × fact(2) = 4 × 3 × 2 × fact(1) = 4 × 3 × 2 × 1`\n\nThe call stack is the mechanism: each call frames a shelf; the answer assembles as the shelves collapse.\n\nTry this: write `sum(n)` recursively for 1..n, then trace it for n=3. I’ll check your trace!'
  }
  return 'Great question — let’s unpack it step by step.\n\n**What we know:** I can see your recent performance data, so I’ll connect the concept to your current weak areas rather than giving a generic textbook answer.\n\n**Core explanation:** Let’s start with the intuition — the *why* behind the concept — then formalise it, then apply it to a concrete example you’ve seen in class.\n\n**Connecting to your profile:** your mastery data suggests this topic overlaps with areas you’ve flagged (Networks 69%, ToC 64%) — so I’ll keep the notation light and the examples heavy.\n\n**Where would you like to go from here?**\n1. Deeper explanation with a worked example\n2. A practice question to test understanding\n3. How this connects to the midsem syllabus\n4. A simpler / different analogy'
}
