// Shared pieces for the explainer diagrams.

/** The drawing width inside a 340px explainer with 16px padding either side. */
export const W = 308;

/** The text alternative every diagram carries: a hidden table of what it draws. */
export function SrTable({ caption, columns, rows }: { caption: string; columns: string[]; rows: (string | number)[][] }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c} scope="col">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((cell, k) =>
              k === 0 ? (
                <th key={k} scope="row">
                  {cell}
                </th>
              ) : (
                <td key={k}>{cell}</td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
