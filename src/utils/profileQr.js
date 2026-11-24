// Plain identity string a registrar can scan (no token, no password).
// Same format as the phone app (mobile-app/src/components/ProfileQr.js).
export function profileQrText(user) {
  if (!user) return ''
  const id = user.role === 'administrator' ? user.staffId : user.studentId
  const role = user.role === 'administrator' ? 'STAFF' : 'STUDENT'
  return `CAMPUS-PORTAL:${role}:${id || user.username}:${user.name || ''}`
}
