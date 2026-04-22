'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/ui/Sidebar'
import { ScoreRing, ScoreBadge, ScoreLabel } from '@/components/ui/ScoreRing'
import { KeywordCloud } from '@/components/ui/KeywordPill'
import {
  ArrowLeft, Loader2, ExternalLink, AlertTriangle,
  Shield, ChevronDown, ChevronUp, Trophy, Tag
} from 'lucide-react'

interface MatchResult {
  id: string
  overallScore: number
  atsScore: number
  keywordScore: number
  semanticScore: number
  qualificationScore: number
  experienceScore: number
  contextScore: number
  matchedKeywords: string[]
  missingKeywords: string[]
  matchedSkills: string[]
  missingSkills: string[]
  visaFlag: string | null
  securityFlag: string | null
  scoreBreakdown: {
    keyword: { score: number; weight: number; matched: string[]; missing: string[] }
    semantic: { score: number; weight: number; topMatches: string[] }
    qualification: { score: number; weight: number; met: string[]; missing: string[] }
    experience: { score: number; weight: number; yearsFound: number; yearsRequired: number }
    context: { score: number; weight: number; signals: string[] }
    penalties: { reason: string; deduction: number }[]
  }
  resume: {
    displayName: string
    focusLabel: string | null
    bucket: { roleName: string; color: string }
  }
  resumeVersion: { versionNumber: number; fileName: string }
}

interface JDDetail {
  id: string
  title: string | null
  company: string | null
  location: string | null
  sourceUrl: string | null
  roleFamily: string | null
  subRole: string | null
  createdAt: string
  extractedJson: {
    requiredSkills: string[]
    preferredSkills: string[]
    experienceRequired: number
    seniorityLevel: string
    visaRequirement?: string
    securityClearance?: string
  } | null
  matchResults: MatchResult[]
}

function ScoreBar({ label, score, weight, color = '#1A56A0' }: { label: string; score: number; weight: number; color?: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600">{label} <span className="text-gray-400">({Math.round(weight * 100)}%)</span></span>
        <span className="font-semibold" style={{ color }}>{score}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function ResultCard({ result, rank, expanded, onToggle }: {
  result: MatchResult; rank: number; expanded: boolean; onToggle: () => void
}) {
  const bd = result.scoreBreakdown
  const scoreColor = result.overallScore >= 80 ? '#16a34a' : result.overallScore >= 60 ? '#d97706' : result.overallScore >= 40 ? '#ea580c' : '#dc2626'

  return (
    <div className={`card overflow-hidden transition-all ${rank === 1 ? 'border-2 border-[#1A56A0]' : ''}`}>
      {rank === 1 && (
        <div className="bg-[#1A56A0] text-white text-xs font-semibold px-4 py-1.5 flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5" /> Best Match
        </div>
      )}

      {/* Card header - always visible */}
      <div
        className="flex items-center gap-5 p-5 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        {/* Score ring */}
        <ScoreRing score={result.overallScore} size="lg" />

        {/* Resume info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-gray-900 text-lg">{result.resume.displayName}</span>
            {result.resume.focusLabel && (
              <span className="inline-flex items-center gap-1 badge bg-blue-50 text-blue-700 text-xs">
                <Tag className="w-2.5 h-2.5" />{result.resume.focusLabel}
              </span>
            )}
            <span className="badge text-xs" style={{ backgroundColor: result.resume.bucket.color + '20', color: result.resume.bucket.color }}>
              {result.resume.bucket.roleName}
            </span>
          </div>
          <div className="text-sm text-gray-500 mb-3">
            v{result.resumeVersion.versionNumber} · {result.resumeVersion.fileName}
          </div>

          {/* Score pills row */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-1.5">
              <span className="text-xs text-gray-500">ATS</span>
              <ScoreBadge score={result.atsScore} />
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-1.5">
              <span className="text-xs text-gray-500">Keywords</span>
              <ScoreBadge score={result.keywordScore} />
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-1.5">
              <span className="text-xs text-gray-500">Semantic</span>
              <ScoreBadge score={result.semanticScore} />
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-1.5">
              <span className="text-xs text-gray-500">Quals</span>
              <ScoreBadge score={result.qualificationScore} />
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-1.5">
              <span className="text-xs text-gray-500">Experience</span>
              <ScoreBadge score={result.experienceScore} />
            </div>
          </div>

          {/* Flags */}
          {(result.visaFlag || result.securityFlag) && (
            <div className="flex flex-wrap gap-2 mt-2">
              {result.visaFlag && (
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  <span className="text-xs text-amber-700 font-medium">Visa Flag</span>
                </div>
              )}
              {result.securityFlag && (
                <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1">
                  <Shield className="w-3 h-3 text-red-600" />
                  <span className="text-xs text-red-700 font-medium">Clearance Flag</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <ScoreLabel score={result.overallScore} />
          {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-6">

          {/* Score breakdown bars */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Score Breakdown</h4>
            <div className="space-y-3">
              <ScoreBar label="Keyword & Skill Match" score={bd.keyword.score} weight={bd.keyword.weight} color="#1A56A0" />
              <ScoreBar label="Semantic Similarity" score={bd.semantic.score} weight={bd.semantic.weight} color="#7c3aed" />
              <ScoreBar label="Qualification Fit" score={bd.qualification.score} weight={bd.qualification.weight} color="#059669" />
              <ScoreBar label="Experience Alignment" score={bd.experience.score} weight={bd.experience.weight} color="#d97706" />
              <ScoreBar label="Context & Domain" score={bd.context.score} weight={bd.context.weight} color="#0891b2" />
            </div>
          </div>

          {/* Experience */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Experience</div>
            <div className="text-sm text-gray-700">
              Found <span className="font-semibold text-gray-900">{bd.experience.yearsFound} year{bd.experience.yearsFound !== 1 ? 's' : ''}</span> in resume
              {bd.experience.yearsRequired > 0 && (
                <span> · JD requires <span className="font-semibold">{bd.experience.yearsRequired}+ years</span></span>
              )}
            </div>
          </div>

          {/* Penalties */}
          {bd.penalties.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <div className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">Penalties Applied</div>
              <div className="space-y-1">
                {bd.penalties.map((p, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-red-700">{p.reason}</span>
                    <span className="text-red-600 font-semibold">−{p.deduction}pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flags detail */}
          {result.visaFlag && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-800">Visa / Work Authorization</span>
              </div>
              <p className="text-sm text-amber-700">{result.visaFlag}</p>
            </div>
          )}
          {result.securityFlag && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-red-600" />
                <span className="text-sm font-semibold text-red-800">Security Clearance</span>
              </div>
              <p className="text-sm text-red-700">{result.securityFlag}</p>
            </div>
          )}

          {/* Keywords */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Keywords — {result.matchedKeywords.length} matched, {result.missingKeywords.length} missing
            </div>
            <KeywordCloud matched={result.matchedKeywords} missing={result.missingKeywords} />
          </div>

          {/* Qualifications */}
          {(bd.qualification.met.length > 0 || bd.qualification.missing.length > 0) && (
            <div className="grid grid-cols-2 gap-4">
              {bd.qualification.met.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-green-600 mb-2">✓ Requirements Met</div>
                  <ul className="space-y-1">
                    {bd.qualification.met.map((q, i) => (
                      <li key={i} className="text-xs text-gray-600 bg-green-50 px-2 py-1 rounded">{q}</li>
                    ))}
                  </ul>
                </div>
              )}
              {bd.qualification.missing.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-red-600 mb-2">✗ Missing Requirements</div>
                  <ul className="space-y-1">
                    {bd.qualification.missing.map((q, i) => (
                      <li key={i} className="text-xs text-gray-600 bg-red-50 px-2 py-1 rounded">{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Semantic matches */}
          {bd.semantic.topMatches.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Top Semantic Signals</div>
              <div className="flex flex-wrap gap-1.5">
                {bd.semantic.topMatches.map(m => (
                  <span key={m} className="badge bg-purple-50 text-purple-700 text-xs">{m}</span>
                ))}
              </div>
            </div>
          )}

          {/* Context signals */}
          {bd.context.signals.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Context Signals</div>
              <div className="flex flex-wrap gap-1.5">
                {bd.context.signals.map(s => (
                  <span key={s} className="badge bg-cyan-50 text-cyan-700 text-xs">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [jd, setJd] = useState<JDDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch(`/api/jds/${params.id}`)
      .then(r => r.json())
      .then(data => { setJd(data); if (data.matchResults?.[0]) setExpandedResults(new Set([data.matchResults[0].id])) })
      .finally(() => setLoading(false))
  }, [params.id])

  function toggleResult(id: string) {
    setExpandedResults(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (loading) return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </main>
    </div>
  )

  if (!jd) return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 flex items-center justify-center text-gray-500">JD not found</main>
    </div>
  )

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-4xl mx-auto">

          {/* Back + header */}
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="card p-6 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{jd.title || 'Untitled Position'}</h1>
                <div className="text-gray-500 mt-1">
                  {jd.company && <span>{jd.company}</span>}
                  {jd.location && <span> · {jd.location}</span>}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  {jd.roleFamily && <span className="badge bg-blue-50 text-blue-700">{jd.roleFamily}</span>}
                  {jd.subRole && jd.subRole !== 'General' && <span className="badge bg-purple-50 text-purple-700">{jd.subRole}</span>}
                  {jd.extractedJson?.seniorityLevel && (
                    <span className="badge bg-gray-100 text-gray-600">{jd.extractedJson.seniorityLevel}</span>
                  )}
                  {jd.extractedJson?.experienceRequired && jd.extractedJson.experienceRequired > 0 && (
                    <span className="badge bg-gray-100 text-gray-600">{jd.extractedJson.experienceRequired}+ yrs required</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {jd.sourceUrl && (
                  <a href={jd.sourceUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary flex items-center gap-1.5 text-xs">
                    <ExternalLink className="w-3.5 h-3.5" /> View JD
                  </a>
                )}
              </div>
            </div>

            {/* Required skills from JD */}
            {jd.extractedJson?.requiredSkills && jd.extractedJson.requiredSkills.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">JD Required Skills</div>
                <div className="flex flex-wrap gap-1.5">
                  {jd.extractedJson.requiredSkills.map(s => (
                    <span key={s} className="badge bg-blue-50 text-blue-700 text-xs">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">
              {jd.matchResults.length} Resume{jd.matchResults.length !== 1 ? 's' : ''} Scored
              <span className="text-gray-400 font-normal text-sm ml-2">ranked by overall score</span>
            </h2>
            <button
              onClick={() => {
                const allIds = new Set(jd.matchResults.map(r => r.id))
                setExpandedResults(expandedResults.size === jd.matchResults.length ? new Set() : allIds)
              }}
              className="text-xs text-[#1A56A0] hover:underline"
            >
              {expandedResults.size === jd.matchResults.length ? 'Collapse all' : 'Expand all'}
            </button>
          </div>

          {jd.matchResults.length === 0 ? (
            <div className="card p-10 text-center text-gray-400">
              <p className="font-medium">No resumes were matched</p>
              <p className="text-sm mt-1">Upload resumes to the relevant role bucket and re-analyze this JD</p>
            </div>
          ) : (
            <div className="space-y-4">
              {jd.matchResults.map((result, i) => (
                <ResultCard
                  key={result.id}
                  result={result}
                  rank={i + 1}
                  expanded={expandedResults.has(result.id)}
                  onToggle={() => toggleResult(result.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
