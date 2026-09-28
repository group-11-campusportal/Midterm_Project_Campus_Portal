import EmptyState from './EmptyState'

// A reusable table driven by props:
//   columns: [{ key, label, render? }]
//   rows:    array of objects that each contain a unique `id`
// The row key is always the record `id`, never the array index.
function DataTable({ columns, rows, emptyTitle, emptyMessage }) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />
  }

  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable
