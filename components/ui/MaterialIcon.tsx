'use client'

interface MaterialIconProps {
  name: string
  size?: number
  className?: string
  filled?: boolean
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700
}

export default function MaterialIcon({
  name,
  size = 24,
  className = '',
  filled = false,
  weight = 400,
}: MaterialIconProps) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${size}`,
      }}
    >
      {name}
    </span>
  )
}
