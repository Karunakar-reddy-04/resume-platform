'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/ui/Sidebar'
import { ScoreBadge } from '@/components/ui/ScoreRing'
import {
  Plus, Send, Trash2, Loader2, ExternalLink,
  ClipboardPaste, ChevronRight, AlertCircle, CheckCircle2,
  Briefcase, FileText, TrendingUp, Calendar, Building2,
  Tag, ArrowUpDown, ArrowUp, ArrowDown, Search, X
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

type SortKey = 'date' | 'company' | 'role' | 'score'
type SortDir = 'asc' | 'desc'

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function formatDateGroup(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  })
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
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { fetchResults() }, [])

  async function fetchResults() {
    setLoadingResults(true)
    try {
      const res = await fetch('/api/jds')
      if (res.ok) setResults(await res.json())
    } finally { setLoadingResults(false) }
  }

  function addToBatch() {
    if (!jdText.trim()) return
    setBatch(b => [...b, {
      id: Math.random().toString(36).slice(2),
      rawText: jdText.trim(),
      title: jdTitle || 'Untitled Position',
      company: jdCompany || 'Unknown Company',
      url: jdUrl,
    }])
    setJdText(''); setJdTitle(''); setJdCompany(''); setJdUrl('')
    textRef.current?.focus()
  }

  async function sendBatch() {
    if (!batch.length) return
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/jds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch.map(i => ({ rawText: i.rawText, sourceUrl: i.url || undefined, title: i.title, company: i.company }))),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); return }
      setSuccessMsg(`✓ Processed ${data.processed} JD${data.processed !== 1 ? 's' : ''}`)
      setBatch([])
      setTimeout(() => setSuccessMsg(''), 4000)
      await fetchResults()
    } catch { setError('Network error') }
    finally { setSubmitting(false) }
  }

  async function analyzeNow() {
    if (!jdText.trim()) return
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/jds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ rawText: jdText.trim(), sourceUrl: jdUrl || undefined, title: jdTitle || undefined, company: jdCompany || undefined }]),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); return }
      setJdText(''); setJdTitle(''); setJdCompany(''); setJdUrl('')
      await fetchResults()
      if (data.results?.[0]?.jdId) router.push(`/jobs/${data.results[0].jdId}`)
    } catch { setError('Network error') }
    finally { setSubmitting(false) }
  }

  async function deleteJD(id: string, e?: React.MouseEvent) {
    e?.stopPropagation()
    setDeletingId(id)
    try {
      await fetch(`/api/jds/${id}`, { method: 'DELETE' })
      setResults(r => r.filter(x => x.id !== id))
      setSelectedIds(s => { const n = new Set(s); n.delete(id); return n })
    } finally { setDeletingId(null) }
  }

  async function deleteSelected() {
    if (!selectedIds.size || !confirm(`Delete ${selectedIds.size} JD${selectedIds.size !== 1 ? 's' : ''}?`)) return
    setBulkDeleting(true)
    try {
      await Promise.all([...selectedIds].map(id => fetch(`/api/jds/${id}`, { method: 'DELETE' })))
      setResults(r => r.filter(x => !selectedIds.has(x.id)))
      setSelectedIds(new Set())
    } finally { setBulkDeleting(false) }
  }

  function toggleSelect(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setSelectedIds(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir(key === 'date' ? 'desc' : 'asc') }
  }

  const filtered = results
    .filter(jd => {
      if (!search) return true
      const q = search.toLowerCase()
      return [jd.title, jd.company, jd.roleFamily, jd.location, jd.subRole].some(f => f?.toLowerCase().includes(q))
    })
    .sort((a, b) => {
      let av: string | number = 0, bv: string | number = 0
      if (sortKey === 'date') { av = a.createdAt; bv = b.createdAt }
      if (sortKey === 'company') { av = (a.company || '').toLowerCase(); bv = (b.company || '').toLowerCase() }
      if (sortKey === 'role') { av = (a.roleFamily || '').toLowerCase(); bv = (b.roleFamily || '').toLowerCase() }
      if (sortKey === 'score') { av = a.matchResults[0]?.overallScore || 0; bv = b.matchResults[0]?.overallScore || 0 }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  // Date grouping (only when sorted by date)
  const showGroups = sortKey === 'date' && !search
  type Group = { label: string; items: JDResult[] }
  const groups: Group[] = []
  if (showGroups) {
    for (const jd of filtered) {
      const label = formatDateGroup(jd.createdAt)
      const last = groups[groups.length - 1]
      if (last && last.label === label) last.items.push(jd)
      else groups.push({ label, items: [jd] })
    }
  } else {
    groups.push({ label: '', items: filtered })
  }

  const stats = {
    total: results.length,
    avgScore: results.length ? Math.round(results.reduce((s, r) => s + (r.matchResults[0]?.overallScore || 0), 0) / results.length) : 0,
    highMatches: results.filter(r => (r.matchResults[0]?.overallScore || 0) >= 70).length,
  }

  function SortBtn({ k, label, icon: Icon }: { k: SortKey; label: string; icon: React.ElementType }) {
    const active = sortKey === k
    return (
      <button
        onClick={() => handleSort(k)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
          active ? 'bg-[#1A56A0] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        <Icon className="w-3 h-3" />
        {label}
        {active
          ? sortDir === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
          : <ArrowUpDown className="w-3 h-3 opacity-40" />}
      </button>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-gray-50">
        <div className="p-8 max-w-7xl mx-auto">

          {/* Page header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Analyze job descriptions and track all your results in one place</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: 'JDs Analyzed', value: stats.total, icon: Briefcase, color: 'text-blue-600 bg-blue-50' },
              { label: 'High Matches (70%+)', value: stats.highMatches, icon: TrendingUp, color: 'text-green-600 bg-green-50' },
              { label: 'Avg Best Score', value: `${stats.avgScore}%`, icon: FileText, color: 'text-purple-600 bg-purple-50' },
            ].map(s => (
              <div key={s.label} className="card p-5 flex items-center gap-4">
                <div className={`p-3 rounded-xl ${s.color}`}><s.icon className="w-5 h-5" /></div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-6">

            {/* ── LEFT: JD input panel ── */}
            <div className="col-span-2 space-y-4">
              <div className="card p-5">
                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <ClipboardPaste className="w-4 h-4 text-[#1A56A0]" />
                  Add Job Description
                </h2>
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Job Title</label>
                    <input className="input" placeholder="e.g. Senior Backend Engineer" value={jdTitle} onChange={e => setJdTitle(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
                    <input className="input" placeholder="e.g. Amazon" value={jdCompany} onChange={e => setJdCompany(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Job URL</label>
                    <input className="input" placeholder="https://..." value={jdUrl} onChange={e => setJdUrl(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Job Description Text <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      ref={textRef}
                      className="input resize-none font-mono text-xs leading-relaxed"
                      rows={10}
                      placeholder="Paste the full job description here..."
                      value={jdText}
                      onChange={e => setJdText(e.target.value)}
                    />
                    <div className="text-xs text-gray-400 mt-1">{jdText.length} characters</div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg mb-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                  </div>
                )}
                {successMsg && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded-lg mb-3">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />{successMsg}
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={analyzeNow} disabled={!jdText.trim() || submitting}
                    className="btn-primary flex items-center gap-2 flex-1 justify-center py-2.5">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                    Analyze Now
                  </button>
                  <button onClick={addToBatch} disabled={!jdText.trim() || submitting}
                    className="btn-secondary flex items-center gap-1.5 px-3">
                    <Plus className="w-4 h-4" /> Batch
                  </button>
                </div>
              </div>

              {/* Batch queue */}
              {batch.length > 0 && (
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm text-gray-900">
                      Batch Queue <span className="text-gray-400 font-normal">({batch.length})</span>
                    </h3>
                    <button onClick={sendBatch} disabled={submitting}
                      className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3">
                      {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      Send All
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {batch.map(item => (
                      <div key={item.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-800 truncate">{item.title}</div>
                          <div className="text-xs text-gray-400">{item.company}</div>
                        </div>
                        <button onClick={() => setBatch(b => b.filter(i => i.id !== item.id))}
                          className="text-gray-400 hover:text-red-500 flex-shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extension tip */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <ExternalLink className="w-4 h-4 text-[#1A56A0] mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-[#1A56A0]">Chrome Extension</div>
                    <div className="text-xs text-blue-600 mt-0.5">Capture JDs from any job site — no copy-paste needed.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT: Results table ── */}
            <div className="col-span-3">
              <div className="card overflow-hidden">

                {/* Table header */}
                <div className="px-5 pt-5 pb-4 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h2 className="font-semibold text-gray-900 text-base">All Analyzed JDs</h2>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                        {search && ` for "${search}"`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {selectedIds.size > 0 && (
                        <button onClick={deleteSelected} disabled={bulkDeleting}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors">
                          {bulkDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          Delete {selectedIds.size}
                        </button>
                      )}
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          className="pl-8 pr-7 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#1A56A0] w-44"
                          placeholder="Search title, company, role..."
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                        />
                        {search && (
                          <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sort buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-gray-400 font-medium">Sort:</span>
                    <SortBtn k="date" label="Date" icon={Calendar} />
                    <SortBtn k="company" label="Company" icon={Building2} />
                    <SortBtn k="role" label="Role" icon={Tag} />
                    <SortBtn k="score" label="Score" icon={TrendingUp} />
                  </div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-gray-50 max-h-[580px] overflow-y-auto">
                  {loadingResults ? (
                    <div className="flex justify-center py-14"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
                  ) : filtered.length === 0 ? (
                    <div className="text-center py-14 text-gray-400">
                      <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">{search ? 'No results match your search' : 'No JDs analyzed yet'}</p>
                      <p className="text-xs mt-1 text-gray-300">{!search ? 'Paste a job description on the left to get started' : ''}</p>
                    </div>
                  ) : (
                    groups.map((group, gi) => (
                      <div key={gi}>
                        {/* Date group label */}
                        {showGroups && group.label && (
                          <div className="sticky top-0 z-10 px-5 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{group.label}</span>
                            <span className="text-xs text-gray-400 ml-1">· {group.items.length} JD{group.items.length !== 1 ? 's' : ''}</span>
                          </div>
                        )}

                        {group.items.map(jd => {
                          const top = jd.matchResults[0]
                          const topScore = top?.overallScore || 0
                          const isSelected = selectedIds.has(jd.id)

                          return (
                            <div
                              key={jd.id}
                              onClick={() => router.push(`/jobs/${jd.id}`)}
                              className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors group ${isSelected ? 'bg-blue-50 hover:bg-blue-50' : ''}`}
                            >
                              {/* Checkbox */}
                              <div
                                onClick={e => toggleSelect(jd.id, e)}
                                className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center cursor-pointer transition-colors ${
                                  isSelected ? 'bg-[#1A56A0] border-[#1A56A0]' : 'border-gray-300 hover:border-[#1A56A0]'
                                }`}
                              >
                                {isSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                              </div>

                              {/* Score column */}
                              <div className={`text-base font-bold w-12 text-right flex-shrink-0 ${
                                topScore >= 70 ? 'text-green-600'
                                : topScore >= 40 ? 'text-amber-500'
                                : topScore > 0 ? 'text-red-500'
                                : 'text-gray-300'
                              }`}>
                                {topScore > 0 ? `${topScore}%` : '—'}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                {/* Title row */}
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-semibold text-gray-900 truncate leading-tight">
                                    {jd.title || 'Untitled Position'}
                                  </span>
                                  {jd.sourceUrl && (
                                    <a href={jd.sourceUrl} target="_blank" rel="noopener noreferrer"
                                      onClick={e => e.stopPropagation()}
                                      className="text-gray-300 hover:text-[#1A56A0] flex-shrink-0 transition-colors">
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>

                                {/* Meta row */}
                                <div className="flex items-center gap-3 flex-wrap">
                                  {jd.company && (
                                    <span className="flex items-center gap-1 text-xs text-gray-600 font-medium">
                                      <Building2 className="w-3 h-3 text-gray-400" />
                                      {jd.company}
                                    </span>
                                  )}
                                  {jd.roleFamily && (
                                    <span className="flex items-center gap-1 text-xs text-gray-400">
                                      <Tag className="w-3 h-3" />
                                      {jd.roleFamily}
                                      {jd.subRole && jd.subRole !== 'General' ? ` · ${jd.subRole}` : ''}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1 text-xs text-gray-400">
                                    <Calendar className="w-3 h-3" />
                                    {formatDateTime(jd.createdAt)}
                                  </span>
                                </div>

                                {/* Best match row */}
                                {top && (
                                  <div className="flex items-center gap-1.5 mt-1.5">
                                    <span className="text-xs text-gray-400">Best match:</span>
                                    <ScoreBadge score={top.overallScore} />
                                    <span className="text-xs text-gray-500 truncate max-w-[120px]">{top.resume.displayName}</span>
                                    {jd.matchResults.length > 1 && (
                                      <span className="text-xs text-gray-400">+{jd.matchResults.length - 1} more</span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Row actions */}
                              <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={e => deleteJD(jd.id, e)}
                                  disabled={deletingId === jd.id}
                                  title="Delete"
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  {deletingId === jd.id
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <Trash2 className="w-3.5 h-3.5" />}
                                </button>
                                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#1A56A0]" />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                {filtered.length > 0 && (
                  <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    <button onClick={() => setSelectedIds(s => s.size === filtered.length ? new Set() : new Set(filtered.map(r => r.id)))}
                      className="text-xs text-gray-500 hover:text-[#1A56A0] font-medium transition-colors">
                      {selectedIds.size === filtered.length && filtered.length > 0 ? 'Deselect all' : 'Select all'}
                    </button>
                    <span className="text-xs text-gray-400">
                      {selectedIds.size > 0 ? `${selectedIds.size} selected · ` : ''}{filtered.length} total JD{filtered.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
