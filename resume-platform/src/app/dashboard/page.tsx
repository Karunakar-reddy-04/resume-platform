'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/ui/Sidebar'
import { ScoreBadge, ScoreLabel } from '@/components/ui/ScoreRing'
import {
  Plus, Send, Trash2, Loader2, ExternalLink,
  ClipboardPaste, ChevronRight, AlertCircle, CheckCircle2,
  Briefcase, FileText, TrendingUp
} from 'lucide-react'

interface BatchItem {
  id: string
  rawText: string
  title: string
  company: string
  url: string
}

interface JDResult {
  id: string
  title: string | null
  company: string | null
  location: string | null
  sourceUrl: string | null
  roleFamily: string | null
  status: string
  createdAt: string
  matchResults: {
    id: string
    overallScore: number
    atsScore: number
    resume: { displayName: string; focusLabel: string | null; bucket: { roleName: string } }
  }[]
}

export default function DashboardPage() {
  const router = useRouter()
  const [batch, setBatch] = useState<BatchItem[]>([])
  const [jdText, setJdText] = useState('')
  const [jdUrl, setJdUrl] = useState('')
  const [jdTitle, setJdTitle] = useState('')
  const [jdCompany, setJdCompany] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<JDResult[]>([])
  const [loadingResults, setLoadingResults] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const textRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { fetchResults() }, [])

  async function fetchResults() {
    setLoadingResults(true)
    try {
      const res = await fetch('/api/jds')
      if (res.ok) setResults(await res.json())
    } finally {
      setLoadingResults(false)
    }
  }

  function addToBatch() {
    if (!jdText.trim()) return
    const item: BatchItem = {
      id: Math.random().toString(36).slice(2),
      rawText: jdText.trim(),
      title: jdTitle || 'Untitled Position',
      company: jdCompany || 'Unknown Company',
      url: jdUrl,
    }
    setBatch(b => [...b, item])
    setJdText(''); setJdTitle(''); setJdCompany(''); setJdUrl('')
    textRef.current?.focus()
  }

  function removeFromBatch(id: string) {
    setBatch(b => b.filter(i => i.id !== id))
  }

  async function sendBatch() {
    if (!batch.length) return
    setSubmitting(true)
    setError('')
    try {
      const payload = batch.map(i => ({
        rawText: i.rawText,
        sourceUrl: i.url || undefined,
        title: i.title,
        company: i.company,
      }))
      const res = await fetch('/api/jds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to process'); return }
      setSuccessMsg(`✓ Processed ${data.processed} job description${data.processed !== 1 ? 's' : ''}`)
      setBatch([])
      setTimeout(() => setSuccessMsg(''), 4000)
      await fetchResults()
    } catch {
      setError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  async function analyzeNow() {
    if (!jdText.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/jds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{
          rawText: jdText.trim(),
          sourceUrl: jdUrl || undefined,
          title: jdTitle || undefined,
          company: jdCompany || undefined,
        }]),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); return }
      setJdText(''); setJdTitle(''); setJdCompany(''); setJdUrl('')
      await fetchResults()
      if (data.results?.[0]?.jdId) router.push(`/jobs/${data.results[0].jdId}`)
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const stats = {
    total: results.length,
    avgScore: results.length
      ? Math.round(results.reduce((s, r) => s + (r.matchResults[0]?.overallScore || 0), 0) / results.length)
      : 0,
    highMatches: results.filter(r => (r.matchResults[0]?.overallScore || 0) >= 70).length,
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Paste job descriptions and score them against your resumes</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: 'JDs Analyzed', value: stats.total, icon: Briefcase, color: 'text-blue-600 bg-blue-50' },
              { label: 'High Matches (70%+)', value: stats.highMatches, icon: TrendingUp, color: 'text-green-600 bg-green-50' },
              { label: 'Avg Best Score', value: `${stats.avgScore}%`, icon: FileText, color: 'text-purple-600 bg-purple-50' },
            ].map(s => (
              <div key={s.label} className="card p-5 flex items-center gap-4">
                <div className={`p-3 rounded-xl ${s.color}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-6">
            {/* Left: JD Input */}
            <div className="col-span-3 space-y-4">
              <div className="card p-6">
                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <ClipboardPaste className="w-4 h-4 text-[#1A56A0]" />
                  Add Job Description
                </h2>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Job Title (optional)</label>
                    <input className="input" placeholder="e.g. Senior Backend Engineer" value={jdTitle} onChange={e => setJdTitle(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Company (optional)</label>
                    <input className="input" placeholder="e.g. Acme Corp" value={jdCompany} onChange={e => setJdCompany(e.target.value)} />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Job URL (optional)</label>
                  <input className="input" placeholder="https://linkedin.com/jobs/..." value={jdUrl} onChange={e => setJdUrl(e.target.value)} />
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Job Description Text <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    ref={textRef}
                    className="input resize-none font-mono text-xs"
                    rows={10}
                    placeholder="Paste the full job description here..."
                    value={jdText}
                    onChange={e => setJdText(e.target.value)}
                  />
                  <div className="text-xs text-gray-400 mt-1">{jdText.length} characters</div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg mb-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
                {successMsg && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded-lg mb-3">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    {successMsg}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={analyzeNow}
                    disabled={!jdText.trim() || submitting}
                    className="btn-primary flex items-center gap-2 flex-1 justify-center"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                    Analyze Now
                  </button>
                  <button
                    onClick={addToBatch}
                    disabled={!jdText.trim() || submitting}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add to Batch
                  </button>
                </div>
              </div>

              {/* Batch queue */}
              {batch.length > 0 && (
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 text-sm">
                      Batch Queue ({batch.length} JD{batch.length !== 1 ? 's' : ''})
                    </h3>
                    <button
                      onClick={sendBatch}
                      disabled={submitting}
                      className="btn-primary flex items-center gap-2 text-xs py-1.5 px-3"
                    >
                      {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      Send Batch
                    </button>
                  </div>
                  <div className="space-y-2">
                    {batch.map(item => (
                      <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-800 truncate">{item.title}</div>
                          <div className="text-xs text-gray-400">{item.company} · {item.rawText.length} chars</div>
                        </div>
                        <button onClick={() => removeFromBatch(item.id)} className="ml-3 text-gray-400 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Recent Results */}
            <div className="col-span-2">
              <div className="card p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Recent Results</h2>
                {loadingResults ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : results.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No JDs analyzed yet</p>
                    <p className="text-xs mt-1">Paste a job description to get started</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {results.map(jd => {
                      const top = jd.matchResults[0]
                      return (
                        <button
                          key={jd.id}
                          onClick={() => router.push(`/jobs/${jd.id}`)}
                          className="w-full text-left bg-gray-50 hover:bg-gray-100 rounded-lg p-3 transition-colors group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-gray-800 truncate">
                                {jd.title || 'Untitled'}
                              </div>
                              <div className="text-xs text-gray-400 truncate">
                                {jd.company || '—'} {jd.location ? `· ${jd.location}` : ''}
                              </div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                {jd.roleFamily} · {jd.matchResults.length} resume{jd.matchResults.length !== 1 ? 's' : ''} scored
                              </div>
                              {top && (
                                <div className="flex items-center gap-2 mt-1.5">
                                  <ScoreBadge score={top.overallScore} />
                                  <span className="text-xs text-gray-500 truncate">{top.resume.displayName}</span>
                                </div>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0 mt-1" />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Chrome Extension tip */}
              <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <ExternalLink className="w-4 h-4 text-[#1A56A0] mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-[#1A56A0]">Chrome Extension</div>
                    <div className="text-xs text-blue-600 mt-0.5">
                      Install the extension to capture JDs directly from LinkedIn, Indeed, Greenhouse, Lever & Workday — no copy-paste needed.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
