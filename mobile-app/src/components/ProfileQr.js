import qrcode from 'qrcode-generator'
import { useMemo } from 'react'
import Svg, { Path, Rect } from 'react-native-svg'

// What the QR holds: a plain identity string a registrar can scan (no token, no password).
// Same format as the web Profile page (src/components/ProfileQr.jsx).
export function profileQrText(user) {
  if (!user) return ''
  const id = user.role === 'administrator' ? user.staffId : user.studentId
  const role = user.role === 'administrator' ? 'STAFF' : 'STUDENT'
  return `CAMPUS-PORTAL:${role}:${id || user.username}:${user.name || ''}`
}

// Draws the QR as one SVG path, one square per dark module, with a white quiet zone.
export default function ProfileQr({ value, size = 200 }) {
  const { path, count } = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(value)
    qr.make()
    const n = qr.getModuleCount()
    let d = ''
    for (let row = 0; row < n; row += 1) {
      for (let col = 0; col < n; col += 1) {
        if (qr.isDark(row, col)) d += `M${col + 2} ${row + 2}h1v1h-1z`
      }
    }
    return { path: d, count: n + 4 }
  }, [value])

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${count} ${count}`} accessibilityLabel="Profile QR code">
      <Rect x="0" y="0" width={count} height={count} fill="#ffffff" />
      <Path d={path} fill="#0f172a" />
    </Svg>
  )
}
