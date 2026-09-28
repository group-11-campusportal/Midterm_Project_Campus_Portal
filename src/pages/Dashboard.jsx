import { useEffect, useState } from 'react'
import StatCard from '../components/StatCard'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import Spinner from '../components/Spinner'
import { computeGpa } from '../utils/grade'

const enrollmentColumns = [
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
  {
    key: 'status',
    label: 'Status',
    render: (row) => <StatusBadge status={row.status} />,
  },
]

const myEnrollmentColumns = [
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
  {
    key: 'status',
    label: 'Status',
    render: (row) => <StatusBadge status={row.status} />,
  },
]

const gradeColumns = [
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

function Dashboard({ user, courses, enrollments, grades }) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulated data fetch so the loading state is visible.
    const timer = window.setTimeout(() => setIsLoading(false), 600)
    return () => window.clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Loading your information…</p>
        <Spinner label="Fetching records…" />
      </>
    )
  }

  if (user.role === 'administrator') {
    const studentCount = new Set(
      enrollments.map((enrollment) => enrollment.studentId),
    ).size
    const pendingCount = enrollments.filter(
      (enrollment) => enrollment.status === 'pending',
    ).length

    return (
      <>
        <section className="welcome">
          <h1 className="welcome__title">Welcome back, {user.name}</h1>
          <p className="welcome__text">
            Overview of enrollment and grading across the university.
          </p>
        </section>

        <div className="stats-grid">
          <StatCard label="Course Offerings" value={courses.length} />
          <StatCard label="Students" value={studentCount} />
          <StatCard label="Total Enrollments" value={enrollments.length} />
          <StatCard
            label="Pending Approvals"
            value={pendingCount}
            hint={pendingCount > 0 ? 'Needs review' : undefined}
          />
        </div>

        <section className="card">
          <div className="section-head">
            <h2 className="section-head__title">All Enrollments</h2>
            <span className="section-head__count">
              {enrollments.length} records
            </span>
          </div>

          <DataTable
            columns={enrollmentColumns}
            rows={enrollments}
            emptyTitle="No enrollments yet"
            emptyMessage="Enrollment requests submitted by students will appear here."
          />
        </section>
      </>
    )
  }

  const myEnrollments = enrollments.filter(
    (enrollment) => enrollment.studentId === user.studentId,
  )
  const myGrades = grades.filter((grade) => grade.studentId === user.studentId)
  const approvedCount = myEnrollments.filter(
    (enrollment) => enrollment.status === 'approved',
  ).length
  const pendingCount = myEnrollments.filter(
    (enrollment) => enrollment.status === 'pending',
  ).length
  const gpa = computeGpa(myGrades)

  return (
    <>
      <section className="welcome">
        <h1 className="welcome__title">Welcome back, {user.name}</h1>
        <p className="welcome__text">
          Your enrollment summary and grades for this term.
        </p>
      </section>

      <div className="dashboard-grid">
        <section className="card">
          <h2 className="section-head__title">My Profile</h2>
          <dl className="profile-list">
            <div>
              <dt>Name</dt>
              <dd>{user.name}</dd>
            </div>
            <div>
              <dt>Student ID</dt>
              <dd>{user.studentId}</dd>
            </div>
            <div>
              <dt>Program</dt>
              <dd>{user.program}</dd>
            </div>
            <div>
              <dt>Year</dt>
              <dd>Year {user.year}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>
                <span className="badge">{user.role}</span>
              </dd>
            </div>
          </dl>
        </section>

        <div>
          <div className="stats-grid stats-grid--compact">
            <StatCard label="Enrolled" value={myEnrollments.length} />
            <StatCard label="Approved" value={approvedCount} />
            <StatCard label="Pending" value={pendingCount} />
            <StatCard
              label="GPA"
              value={gpa > 0 ? gpa.toFixed(2) : '—'}
              hint={myGrades.length === 0 ? 'No grades yet' : undefined}
            />
          </div>

          <section className="card">
            <div className="section-head">
              <h2 className="section-head__title">My Grades</h2>
              <span className="section-head__count">
                {myGrades.length} records
              </span>
            </div>

            <DataTable
              columns={gradeColumns}
              rows={myGrades}
              emptyTitle="No grades yet"
              emptyMessage="Grades will appear here once the registrar records them."
            />
          </section>

          <section className="card card--spaced">
            <div className="section-head">
              <h2 className="section-head__title">My Enrollments</h2>
              <span className="section-head__count">
                {myEnrollments.length} records
              </span>
            </div>

            <DataTable
              columns={myEnrollmentColumns}
              rows={myEnrollments}
              emptyTitle="No courses enrolled"
              emptyMessage="You have not enrolled in any course yet. Use the Enroll in Course page to get started."
            />
          </section>
        </div>
      </div>
    </>
  )
}

export default Dashboard
