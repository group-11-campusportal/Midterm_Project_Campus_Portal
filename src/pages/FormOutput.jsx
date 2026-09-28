import { useLocation } from 'react-router-dom'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'

const enrollmentColumns = [
  {
    key: 'course',
    label: 'Course',
    render: (row) => (
      <>
        <span className="table__strong">{row.courseCode}</span>
        <span className="table__muted">{row.courseTitle}</span>
      </>
    ),
  },
  { key: 'term', label: 'Term' },
  { key: 'credits', label: 'Credits' },
  { key: 'enrolledAt', label: 'Submitted' },
  {
    key: 'status',
    label: 'Status',
    render: (row) => <StatusBadge status={row.status} />,
  },
]

const gradeColumns = [
  {
    key: 'student',
    label: 'Student',
    render: (row) => (
      <>
        <span className="table__strong">{row.studentName}</span>
        <span className="table__muted">{row.studentId}</span>
      </>
    ),
  },
  {
    key: 'course',
    label: 'Course',
    render: (row) => (
      <>
        <span className="table__strong">{row.courseCode}</span>
        <span className="table__muted">{row.courseTitle}</span>
      </>
    ),
  },
  { key: 'term', label: 'Term' },
  { key: 'score', label: 'Score' },
  {
    key: 'grade',
    label: 'Grade',
    render: (row) => (
      <>
        <span className="table__strong">{row.letter}</span>
        <span className="table__muted">{row.points.toFixed(1)} pts</span>
      </>
    ),
  },
]

// The "form output" page. It reads the shared state that lives in App,
// so every record added on the form page shows up here — newest first.
function FormOutput({ user, enrollments, grades }) {
  const location = useLocation()
  const successMessage = location.state?.success
  const isAdministrator = user.role === 'administrator'

  const rows = isAdministrator
    ? [...grades].reverse()
    : enrollments
        .filter((enrollment) => enrollment.studentId === user.studentId)
        .reverse()

  return (
    <>
      <h1 className="page-title">
        {isAdministrator ? 'Grade Records' : 'My Submissions'}
      </h1>
      <p className="page-subtitle">
        {isAdministrator
          ? 'Every grade recorded through the form, newest first.'
          : 'Every enrollment request you submitted, newest first.'}
      </p>

      {successMessage ? (
        <p className="alert alert--success" role="status">
          {successMessage}
        </p>
      ) : null}

      <section className="card">
        <div className="section-head">
          <h2 className="section-head__title">Form Output</h2>
          <span className="section-head__count">{rows.length} records</span>
        </div>

        {isAdministrator ? (
          <DataTable
            columns={gradeColumns}
            rows={rows}
            emptyTitle="No grades recorded yet"
            emptyMessage="Grades you record on the form page will be listed here."
          />
        ) : (
          <DataTable
            columns={enrollmentColumns}
            rows={rows}
            emptyTitle="No submissions yet"
            emptyMessage="Enrollment requests you submit on the form page will be listed here."
          />
        )}
      </section>
    </>
  )
}

export default FormOutput