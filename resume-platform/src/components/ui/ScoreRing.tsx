'use client'

interface ScoreRingProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

function getColor(score: number) {
  if (score >= 80) return { stroke: '#16a34a', bg: '#f0fdf4', text: '#15803d' }
  if (score >= 60) return { stroke: '#d97706', bg: '#fffbeb', text: '#b45309' }
  if (score >= 40) return { stroke: '#ea580c', bg: '#fff7ed', text: '#c2410c' }
  return { stroke: '#dc2626', bg: '#fef2f2', text: '#b91c1c' }
}

export function ScoreRing({ score, size = 'md', label }: ScoreRingProps) {
  const dims = { sm: 52, md: 72, lg: 96 }
  const strokes = { sm: 5, md: 6, lg: 7 }
  const dim = dims[size]
  const strokeWidth = strokes[size]
  const r = (dim - strokeWidth * 2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const { stroke, bg, text } = getColor(score)
  const fontSize = size === 'sm' ? 13 : size === 'md' ? 18 : 24

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} className="-rotate-90">
          <circle cx={dim/2} cy={dim/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
          <circle
            cx={dim/2} cy={dim/2} r={r} fill="none"
            stroke={stroke} strokeWidth={strokeWidth}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center font-bold"
          style={{ fontSize, color: text }}
        >
          {score}
        </div>
      </div>
      {label && <div className="text-xs text-gray-500 font-medium text-center">{label}</div>}
    </div>
  )
}

export function ScoreBadge({ score }: { score: number }) {
  const { bg, text } = getColor(score)
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
      style={{ backgroundColor: bg, color: text }}
    >
      {score}%
    </span>
  )
}

export function ScoreLabel({ score }: { score: number }) {
  if (score >= 80) return <span className="text-green-600 font-semibold text-xs">Excellent Match</span>
  if (score >= 60) return <span className="text-amber-600 font-semibold text-xs">Good Match</span>
  if (score >= 40) return <span className="text-orange-600 font-semibold text-xs">Partial Match</span>
  return <span className="text-red-600 font-semibold text-xs">Low Match</span>
}
