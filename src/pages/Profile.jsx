import { Link } from 'react-router-dom'
import ProfileQr from '../components/ProfileQr'
import { profileQrText } from '../utils/profileQr'
import { computeGpa } from '../utils/grade'

// Feedback opens the user's mail app (Gmail / Outlook) addressed to the team.
const FEEDBACK_URL = 'mailto:01881250031@student.uph.edu?subject=Campus%20Portal%20Feedback'

// Icons used by the Academic Services list (stroke icons, 24x24 grid).
const ICONS = {
  enroll: <><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></>,
  receipt: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
  grades: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  pen: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>,
  spark: <><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1" /><circle cx="12" cy="12" r="2.5" /></>,
  book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>,
  chat: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>,
  teams: <><circle cx="9" cy="7" r="3" /><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /><circle cx="17" cy="9" r="2.5" /><path d="M17 14a3.5 3.5 0 0 1 4 3.5V20" /></>,
  library: <><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="3" y1="9" x2="9" y2="9" /><line x1="3" y1="15" x2="9" y2="15" /></>,
}

function ServiceItem({ to, href, icon, tone, name, desc, badge }) {
  const content = (
    <>
      <div className={`quick-service-icon quick-service-icon--${tone}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" aria-hidden="true">
          {ICONS[icon]}
        </svg>
      </div>
      <div className="quick-service-info">
        <span className="quick-service-name">{name}</span>
        <span className="quick-service-desc">{desc}</span>
      </div>
      {badge ? <span className="service-badge">{badge}</span> : null}
      <svg className="quick-service-arrow" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" aria-hidden="true">
        <polyline points="7 5 12 10 7 15" />
      </svg>
    </>
  )
  return (
    <li>
      {to ? (
        <Link to={to} className="quick-service-item">{content}</Link>
      ) : (
        <a
          href={href}
          className="quick-service-item"
          {...(href.startsWith('mailto:')
            ? { 'aria-label': `${name} (opens your email app)` }
            : { target: '_blank', rel: 'noreferrer', 'aria-label': `${name} (opens in a new tab)` })}
        >
          {content}
        </a>
      )}
    </li>
  )
}

// Profile page: the same facts as the phone's Profile tab (mobile-app/src/app/(tabs)/profile.js),
// plus the Academic Services shortcuts that used to sit on the dashboard.
function Profile({ user, enrollments = [], grades = [] }) {
  const isAdministrator = user.role === 'administrator'
  const initials = (user.name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

  const myGrades = grades.filter((g) => g.studentId === user.studentId)
  const myEnrollments = enrollments.filter((e) => e.studentId === user.studentId)
  const gpa = computeGpa(myGrades)
  const standing = gpa <= 0 ? 'No grades recorded yet'
    : gpa >= 3.5 ? "Dean's List · First Class Standing"
      : gpa >= 3.0 ? 'Good Academic Standing' : 'Satisfactory Standing'
  const approvedCredits = myEnrollments
    .filter((e) => e.status === 'approved')
    .reduce((sum, e) => sum + (e.credits || 0), 0)

  const identityRows = isAdministrator
    ? [['Staff ID', user.staffId], ['Title', user.title], ['Department', user.department],
        ['Email', user.email], ['Username', user.username]]
    : [['Student ID', user.studentId], ['Program', user.program],
        ['Academic Year', user.year ? `Year ${user.year}` : null], ['Campus Email', user.email],
        ['Username', user.username]]

  return (
    <>
      <section className={`hero-card ${isAdministrator ? 'hero-card--admin' : ''}`}>
        <div className="hero-card__deco1" />
        <div className="hero-card__deco2" />
        <div className="hero-card__content">
          <div className="hero-card__top">
            <span className="hero-badge">My Profile</span>
          </div>
          <h1 className="hero-title" style={{ fontSize: '26px' }}>{user.name}</h1>
          <p className="hero-subtitle">
            {isAdministrator
              ? `${user.title || 'Administrator'} · ${user.department || ''}`
              : `${user.program || ''} · ${user.studentId || ''}`}
          </p>
        </div>
      </section>

      <div className="dashboard-grid profile-page">
        <aside className="dashboard-sidebar">
          <section className="card card--elevated profile-card">
            <div className="profile-card__avatar-wrap">
              <div className="profile-card__avatar"><span>{initials}</span></div>
              <h3 className="profile-card__name">{user.name}</h3>
              <p className="profile-card__email">{user.email}</p>
              <span className="profile-card__pill">
                <span>{isAdministrator ? 'Administrator' : 'Student'}</span>
              </span>
            </div>
            <div className="profile-card__body">
              <div className="profile-card__section-head">
                <span className="profile-card__section-title">Identity &amp; Credentials</span>
                <span className="profile-card__section-sub">From your university account</span>
              </div>
              <div className="profile-row-list">
                {identityRows.map(([label, value]) => (
                  <div key={label} className="profile-row">
                    <span className="profile-row__label">{label}</span>
                    <span className="profile-row__val">{value || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <section className="card card--elevated card--spaced profile-qr">
            <h3 className="profile-card__section-title">My Profile QR</h3>
            <p className="profile-card__section-sub">Show it to the registrar to identify yourself.</p>
            <div className="profile-qr__code">
              <ProfileQr value={profileQrText(user)} />
            </div>
            <p className="profile-qr__note">Contains your name and ID only. No password or session token.</p>
          </section>
        </aside>

        <div className="dashboard-main">
          {!isAdministrator ? (
            <section className="card card--elevated profile-summary">
              <div>
                <span className="profile-summary__label">Cumulative GPA</span>
                <span className="profile-summary__value">{gpa > 0 ? gpa.toFixed(2) : '—'}</span>
                <span className="profile-summary__hint">{standing}</span>
              </div>
              <div>
                <span className="profile-summary__label">Graded courses</span>
                <span className="profile-summary__value">{myGrades.length}</span>
                <span className="profile-summary__hint">with a recorded grade</span>
              </div>
              <div>
                <span className="profile-summary__label">Approved study load</span>
                <span className="profile-summary__value">{approvedCredits} SKS</span>
                <span className="profile-summary__hint">
                  {myEnrollments.filter((e) => e.status === 'pending').length} request(s) pending
                </span>
              </div>
            </section>
          ) : null}

          <section className="card card--elevated card--spaced">
            <div className="section-head">
              <div>
                <h2 className="section-head__title">Academic Services</h2>
                <p className="section-head__sub">Campus apps, feedback and collaboration tools. Links open in a new tab; Feedback opens your email app.</p>
              </div>
            </div>

            <h3 className="service-group-title">Campus links &amp; tools</h3>
            <ul className="quick-services-list service-grid">
              <ServiceItem href="https://learn.uph.edu/" icon="book" tone="orange" name="LMS / Moodle" desc="Lecture slides & assignments" badge="External" />
              <ServiceItem href="https://library.uph.edu" icon="library" tone="blue" name="Digital Library" desc="Journals, e-books & research" badge="External" />
              <ServiceItem href={FEEDBACK_URL} icon="chat" tone="green" name="Feedback" desc="Email us to help improve the Campus Portal" badge="Email" />
              <ServiceItem href="https://teams.microsoft.com" icon="teams" tone="purple" name="Collaboration Tools" desc="Collaborate in Microsoft Teams" badge="External" />
            </ul>
          </section>

        </div>
      </div>
    </>
  )
}

export default Profile
