'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/ui/Sidebar'
import { ScoreBadge, ScoreLabel } from '@/components/ui/ScoreRing'
import { Loader2, Briefcase, ChevronRight, Trash2, ExternalLink, Search, Filter } from 'lucide-react'

interface JDResult {
  id: string
  title: string | null
  company: string | null
  location: string | null
  sourceUrl: string | null
  roleFamily: string | null
  subRole: string | null
  status: string
  createdAt: string
  matchResults: {
    id: string
    overallScore: number
    atsScore: number
    resume: { displayName: string; focusLabel: string | null; bucket: { roleName: string } }
  }[]
}

export default function JobsPage() {
  const router = useRouter()
  const [jds, setJds] = useState<JDResult[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')

  useEffect(() => { fetchJDs() }, [])

  async function fetchJDs() {
    setLoading(true)
    try {
      const res = await fetch('/api/jds')
      if (res.ok) setJds(await res.json())
    } finally { setLoading(false) }
  }

  async function deleteJD(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Delete this job analysis?')) return
    await fetch(`/api/jds/${id}`, { method: 'DELETE' })
    setJds(j => j.filter(x => x.id !== id))
  }

  const filtered = jds.filter(jd => {
    const topScore = jd.matchResults[0]?.overallScore || 0
    const matchesSearch = !search || [jd.title, jd.company, jd.roleFamily]
      .some(f => f?.toLowerCase().includes(search.toLowerCase()))
    const matchesFilter = filter === 'all'
      || (filter === 'high' && topScore >= 70)
      || (filter === 'medium' && topScore >= 40 && topScore < 70)
      || (filter === 'low' && topScore < 40)
    return matchesSearch && matchesFilter
  })

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-5xl mx-auto">

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Job Results</h1>
              <p className="text-gray-500 text-sm mt-1">{jds.length} job description{jds.length !== 1 ? 's' : ''} analyzed</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="input pl-9"
                placeholder="Search by title, company, role..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <Filter className="w-3.5 h-3.5 text-gray-400 ml-1" />
              {(['all', 'high', 'medium', 'low'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all capitalize ${
                    filter === f ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'high' ? '70%+' : f === 'medium' ? '40–69%' : '<40%'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="card p-12 text-center text-gray-400">
              <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{search || filter !== 'all' ? 'No results match your filter' : 'No JDs analyzed yet'}</p>
              <p className="text-sm mt-1">
                {!search && filter === 'all' && 'Go to the Dashboard and paste a job description to get started'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(jd => {
                const top = jd.matchResults[0]
                const topScore = top?.overallScore || 0
                return (
                  <div
                    key={jd.id}
                    onClick={() => router.push(`/jobs/${jd.id}`)}
                    className="card p-5 cursor-pointer hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-5">
                      {/* Score */}
                      <div className="flex-shrink-0 text-center">
                        <div className={`text-2xl font-bold ${
                          topScore >= 70 ? 'text-green-600' : topScore >= 40 ? 'text-amber-600' : 'text-red-600'
                        }`}>{topScore}<span className="text-sm font-normal">%</span></div>
                        <div className="text-xs text-gray-400">best match</div>
                      </div>

                      <div className="w-px h-10 bg-gray-100 flex-shrink-0" />

                      {/* JD info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-gray-900">{jd.title || 'Untitled Position'}</div>
                            <div className="text-sm text-gray-500">
                              {jd.company || '—'}
                              {jd.location && <span> · {jd.location}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {jd.sourceUrl && (
                              <a href={jd.sourceUrl} target="_blank" rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-gray-400 hover:text-[#1A56A0]">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            <button onClick={e => deleteJD(jd.id, e)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                          </div>
                        </div>

                        {/* Tags and matches */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {jd.roleFamily && (
                            <span className="badge bg-blue-50 text-blue-700">{jd.roleFamily}</span>
                          )}
                          {jd.subRole && jd.subRole !== 'General' && (
                            <span className="badge bg-purple-50 text-purple-700">{jd.subRole}</span>
                          )}
                          <span className="text-xs text-gray-400">
                            {jd.matchResults.length} resume{jd.matchResults.length !== 1 ? 's' : ''} scored
                          </span>
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-400">{new Date(jd.createdAt).toLocaleDateString()}</span>
                        </div>

                        {/* Top 3 resume scores */}
                        {jd.matchResults.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            {jd.matchResults.slice(0, 3).map((r, i) => (
                              <div key={r.id} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1">
                                <span className="text-xs text-gray-400">#{i + 1}</span>
                                <ScoreBadge score={r.overallScore} />
                                <span className="text-xs text-gray-600 max-w-[120px] truncate">{r.resume.displayName}</span>
                              </div>
                            ))}
                            {jd.matchResults.length > 3 && (
                              <span className="text-xs text-gray-400">+{jd.matchResults.length - 3} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
