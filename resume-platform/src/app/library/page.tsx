'use client'
import { useState, useEffect, useRef } from 'react'
import { Sidebar } from '@/components/ui/Sidebar'
import {
  Plus, Upload, Trash2, Loader2, FileText, Edit2,
  Check, X, ChevronDown, ChevronRight, FolderOpen, Tag
} from 'lucide-react'

interface ResumeVersion {
  id: string; versionNumber: number; fileName: string; fileType: string; createdAt: string
}
interface Resume {
  id: string; displayName: string; focusLabel: string | null
  activeVersionId: string | null; status: string; createdAt: string
  versions: ResumeVersion[]
  bucket: { roleName: string; color: string }
}
interface Bucket {
  id: string; roleName: string; description: string | null; color: string; createdAt: string
  resumes: Resume[]
}

const COLORS = ['#1A56A0','#0891b2','#059669','#7c3aed','#dc2626','#d97706','#db2777','#374151']

export default function LibraryPage() {
  const [buckets, setBuckets] = useState<Bucket[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedBuckets, setExpandedBuckets] = useState<Set<string>>(new Set())
  const [uploadingTo, setUploadingTo] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showNewBucket, setShowNewBucket] = useState(false)
  const [newBucket, setNewBucket] = useState({ roleName: '', description: '', color: COLORS[0] })
  const [creatingBucket, setCreatingBucket] = useState(false)
  const [editingResume, setEditingResume] = useState<{ id: string; displayName: string; focusLabel: string } | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => { fetchBuckets() }, [])

  async function fetchBuckets() {
    setLoading(true)
    try {
      const res = await fetch('/api/buckets')
      if (res.ok) {
        const data = await res.json()
        setBuckets(data)
        // Auto-expand all buckets
        setExpandedBuckets(new Set(data.map((b: Bucket) => b.id)))
      }
    } finally { setLoading(false) }
  }

  async function createBucket() {
    if (!newBucket.roleName.trim()) return
    setCreatingBucket(true)
    try {
      const res = await fetch('/api/buckets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBucket),
      })
      if (res.ok) {
        setShowNewBucket(false)
        setNewBucket({ roleName: '', description: '', color: COLORS[0] })
        await fetchBuckets()
      }
    } finally { setCreatingBucket(false) }
  }

  async function deleteBucket(id: string) {
    if (!confirm('Delete this bucket and all its resumes?')) return
    await fetch(`/api/buckets/${id}`, { method: 'DELETE' })
    await fetchBuckets()
  }

  async function uploadResume(bucketId: string, file: File) {
    setUploadingTo(bucketId)
    try {
      const displayName = prompt('Resume display name:', file.name.replace(/\.[^.]+$/, ''))
      if (!displayName) return
      const focusLabel = prompt('Focus label (optional, e.g. "AWS Focus"):') || ''
      const fd = new FormData()
      fd.append('file', file)
      fd.append('bucketId', bucketId)
      fd.append('displayName', displayName)
      if (focusLabel) fd.append('focusLabel', focusLabel)
      const res = await fetch('/api/resumes', { method: 'POST', body: fd })
      if (res.ok) await fetchBuckets()
      else alert('Upload failed — check file type (PDF or DOCX only)')
    } finally { setUploadingTo(null) }
  }

  async function deleteResume(id: string) {
    if (!confirm('Remove this resume?')) return
    setDeletingId(id)
    try {
      await fetch(`/api/resumes/${id}`, { method: 'DELETE' })
      await fetchBuckets()
    } finally { setDeletingId(null) }
  }

  async function saveResumeEdit() {
    if (!editingResume) return
    await fetch(`/api/resumes/${editingResume.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: editingResume.displayName, focusLabel: editingResume.focusLabel }),
    })
    setEditingResume(null)
    await fetchBuckets()
  }

  function toggleBucket(id: string) {
    setExpandedBuckets(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const totalResumes = buckets.reduce((s, b) => s + b.resumes.length, 0)

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Resume Library</h1>
              <p className="text-gray-500 text-sm mt-1">
                {buckets.length} buckets · {totalResumes} resume{totalResumes !== 1 ? 's' : ''}
              </p>
            </div>
            <button onClick={() => setShowNewBucket(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Bucket
            </button>
          </div>

          {/* New bucket form */}
          {showNewBucket && (
            <div className="card p-5 mb-6 border-[#1A56A0] border">
              <h3 className="font-semibold text-gray-900 mb-4">Create Role Bucket</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Role Name *</label>
                  <input className="input" placeholder="e.g. Backend Developer" value={newBucket.roleName}
                    onChange={e => setNewBucket(b => ({ ...b, roleName: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <input className="input" placeholder="Optional description" value={newBucket.description}
                    onChange={e => setNewBucket(b => ({ ...b, description: e.target.value }))} />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-2">Color</label>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setNewBucket(b => ({ ...b, color: c }))}
                      className="w-7 h-7 rounded-full border-2 transition-all"
                      style={{ backgroundColor: c, borderColor: newBucket.color === c ? '#111' : 'transparent' }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={createBucket} disabled={!newBucket.roleName.trim() || creatingBucket} className="btn-primary flex items-center gap-2">
                  {creatingBucket ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Create Bucket
                </button>
                <button onClick={() => setShowNewBucket(false)} className="btn-secondary flex items-center gap-2">
                  <X className="w-4 h-4" /> Cancel
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
          ) : buckets.length === 0 ? (
            <div className="card p-12 text-center text-gray-400">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No buckets yet</p>
              <p className="text-sm mt-1">Create a role bucket to start organizing your resumes</p>
            </div>
          ) : (
            <div className="space-y-4">
              {buckets.map(bucket => {
                const expanded = expandedBuckets.has(bucket.id)
                return (
                  <div key={bucket.id} className="card overflow-hidden">
                    {/* Bucket header */}
                    <div
                      className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleBucket(bucket.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: bucket.color }} />
                        {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                        <div>
                          <div className="font-semibold text-gray-900">{bucket.roleName}</div>
                          {bucket.description && <div className="text-xs text-gray-400">{bucket.description}</div>}
                        </div>
                        <span className="badge bg-gray-100 text-gray-600 ml-1">
                          {bucket.resumes.length} resume{bucket.resumes.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        {/* Upload button */}
                        <input
                          type="file"
                          accept=".pdf,.docx"
                          className="hidden"
                          ref={el => { fileInputRefs.current[bucket.id] = el }}
                          onChange={e => { const f = e.target.files?.[0]; if (f) uploadResume(bucket.id, f); e.target.value = '' }}
                        />
                        <button
                          onClick={() => fileInputRefs.current[bucket.id]?.click()}
                          disabled={uploadingTo === bucket.id}
                          className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
                        >
                          {uploadingTo === bucket.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Upload className="w-3 h-3" />}
                          Upload
                        </button>
                        <button onClick={() => deleteBucket(bucket.id)} className="text-gray-400 hover:text-red-500 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Resumes list */}
                    {expanded && (
                      <div className="border-t border-gray-100">
                        {bucket.resumes.length === 0 ? (
                          <div
                            className="py-8 text-center text-gray-400 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => fileInputRefs.current[bucket.id]?.click()}
                          >
                            <Upload className="w-6 h-6 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">Click to upload a resume (PDF or DOCX)</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-50">
                            {bucket.resumes.map(resume => (
                              <div key={resume.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 group">
                                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <FileText className="w-4 h-4 text-[#1A56A0]" />
                                </div>

                                {editingResume?.id === resume.id ? (
                                  <div className="flex-1 flex items-center gap-2">
                                    <input
                                      className="input text-sm py-1"
                                      value={editingResume.displayName}
                                      onChange={e => setEditingResume(r => r ? { ...r, displayName: e.target.value } : r)}
                                    />
                                    <input
                                      className="input text-sm py-1 w-40"
                                      placeholder="Focus label"
                                      value={editingResume.focusLabel}
                                      onChange={e => setEditingResume(r => r ? { ...r, focusLabel: e.target.value } : r)}
                                    />
                                    <button onClick={saveResumeEdit} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
                                    <button onClick={() => setEditingResume(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                                  </div>
                                ) : (
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-gray-800">{resume.displayName}</span>
                                      {resume.focusLabel && (
                                        <span className="inline-flex items-center gap-1 badge bg-blue-50 text-blue-700">
                                          <Tag className="w-2.5 h-2.5" />{resume.focusLabel}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      v{resume.versions[0]?.versionNumber || 1} · {resume.versions[0]?.fileName || 'No file'}
                                      · {new Date(resume.createdAt).toLocaleDateString()}
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => setEditingResume({ id: resume.id, displayName: resume.displayName, focusLabel: resume.focusLabel || '' })}
                                    className="p-1.5 text-gray-400 hover:text-[#1A56A0] rounded"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => deleteResume(resume.id)}
                                    disabled={deletingId === resume.id}
                                    className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                                  >
                                    {deletingId === resume.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
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
