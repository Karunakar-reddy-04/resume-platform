interface KeywordPillProps {
  word: string
  variant: 'matched' | 'missing' | 'neutral'
}

export function KeywordPill({ word, variant }: KeywordPillProps) {
  const styles = {
    matched: 'bg-green-50 text-green-700 border border-green-200',
    missing: 'bg-red-50 text-red-700 border border-red-200',
    neutral: 'bg-gray-100 text-gray-600 border border-gray-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[variant]}`}>
      {variant === 'matched' && <span className="mr-1">✓</span>}
      {variant === 'missing' && <span className="mr-1">✗</span>}
      {word}
    </span>
  )
}

export function KeywordCloud({
  matched,
  missing,
}: {
  matched: string[]
  missing: string[]
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {matched.map(k => <KeywordPill key={k} word={k} variant="matched" />)}
      {missing.map(k => <KeywordPill key={k} word={k} variant="missing" />)}
    </div>
  )
}
