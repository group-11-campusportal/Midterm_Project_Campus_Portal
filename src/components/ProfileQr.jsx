import qrcode from 'qrcode-generator'
import { useMemo } from 'react'

function ProfileQr({ value, size = 168 }) {
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
    <svg width={size} height={size} viewBox={`0 0 ${count} ${count}`} role="img" aria-label="Profile QR code" shapeRendering="crispEdges">
      <rect x="0" y="0" width={count} height={count} fill="#ffffff" />
      <path d={path} fill="#0f172a" />
    </svg>
  )
}

export default ProfileQr
