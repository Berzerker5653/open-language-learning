/**
 * U05: what the placement pass declined to ask, in the engine's own words.
 * A rubric with no low-stakes auto-runner is reported, never presented as a
 * runnable question; the status and reason strings travel from
 * `placement_coverage` unchanged — this component only groups and labels.
 *
 * Extracted from App.tsx (APP-SPLIT-001): zero behavior change.
 */
export function PlacementCoverageNote({
  rows,
}: {
  rows: { assessment_id: string; goal_id: string; status: string; reason?: string }[];
}) {
  if (rows.length === 0) return null;
  const planned = rows.filter((r) => r.status === "planned").length;
  const declined = rows.filter((r) => r.status !== "planned");
  const COPY: Record<string, string> = {
    "no-runner": "that skill cannot be practiced in the app yet",
    "no-content": "no content at the right level can serve that rubric",
    "modality-unsupported": "that kind of question is not available yet",
  };
  const byStatus = new Map<string, { n: number; sample?: string }>();
  for (const r of declined) {
    const g = byStatus.get(r.status) ?? { n: 0, sample: r.reason };
    g.n += 1;
    byStatus.set(r.status, g);
  }
  return (
    <div className="field" data-testid="placement-coverage">
      <p>
        {planned} question{planned === 1 ? "" : "s"} ready
        {declined.length > 0 ? `, ${declined.length} rubrics the engine will not fake` : ""}.
      </p>
      {declined.length > 0 && (
        <ul>
          {[...byStatus.entries()].map(([status, g]) => (
            <li key={status}>
              {g.n} · {COPY[status] ?? status}
              {g.sample && (
                <details>
                  <summary>engine reason</summary>
                  <code>{g.sample}</code>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
