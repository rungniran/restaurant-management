// A table gets reused by many different customers over a day. Orders and bills
// must only ever reflect the CURRENT customer's session at that table — never a
// previous customer's (already paid & released) visit. `sessionStartedAt` marks
// when the present session began; anything created before that point belongs to
// a past customer and must be excluded from customer-facing queries.

export function sessionCutoff(table) {
  return table.sessionStartedAt || table.createdAt;
}

// Builds a Mongo $or clause that scopes Order queries to each table's own
// current session — needed because merged tables (ต่อโต๊ะ) can each have a
// different session start time.
export function sessionScopedTableFilter(tables) {
  return { $or: tables.map((t) => ({ tableId: t._id, createdAt: { $gte: sessionCutoff(t) } })) };
}
