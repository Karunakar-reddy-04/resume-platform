import { StructuredResume, StructuredJD, ScoreResult, ScoreBreakdown } from '@/types'
import { getTotalYears } from '@/lib/parser/resume-parser'

// ── Weights ────────────────────────────────────────────────────────────────

const WEIGHTS = {
  keyword: 0.35,
  semantic: 0.25,
  qualification: 0.20,
  experience: 0.10,
  context: 0.10,
}

// ── Component 1: Keyword & Skill Match (35%) ─────────────────────────────────

function scoreKeywords(resume: StructuredResume, jd: StructuredJD) {
  const resumeSkillsLower = resume.skills.map(s => s.toLowerCase())
  const resumeText = resume.rawText.toLowerCase()

  const matched: string[] = []
  const missing: string[] = []

  for (const kw of jd.keywords) {
    const kwLower = kw.toLowerCase()
    if (resumeSkillsLower.includes(kwLower) || resumeText.includes(kwLower)) {
      matched.push(kw)
    } else {
      missing.push(kw)
    }
  }

  const total = jd.keywords.length || 1
  const score = Math.min((matched.length / total) * 100, 100)

  return { score, matched, missing }
}

// ── Component 2: Semantic Similarity (25%) ───────────────────────────────────
// TF-IDF cosine similarity — no external vector DB needed

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2)
}

function tfIdf(tokens: string[], allTokens: string[][]): Map<string, number> {
  const N = allTokens.length
  const tf = new Map<string, number>()
  const docFreq = new Map<string, number>()

  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1)

  const allUnique = new Set(allTokens.flat())
  for (const term of allUnique) {
    const df = allTokens.filter(doc => doc.includes(term)).length
    docFreq.set(term, df)
  }

  const result = new Map<string, number>()
  for (const [term, count] of tf) {
    const idf = Math.log((N + 1) / ((docFreq.get(term) || 0) + 1)) + 1
    result.set(term, (count / tokens.length) * idf)
  }
  return result
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, normA = 0, normB = 0
  for (const [term, val] of a) {
    dot += val * (b.get(term) || 0)
    normA += val * val
  }
  for (const val of b.values()) normB += val * val
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

function scoreSemantic(resume: StructuredResume, jd: StructuredJD) {
  const resumeTokens = tokenize(resume.rawText.slice(0, 3000))
  const jdTokens = tokenize(jd.rawText.slice(0, 3000))

  const allDocs = [resumeTokens, jdTokens]
  const resumeVec = tfIdf(resumeTokens, allDocs)
  const jdVec = tfIdf(jdTokens, allDocs)

  const sim = cosineSimilarity(resumeVec, jdVec)
  const score = Math.min(sim * 200, 100) // Scale: cosine 0.5 = 100

  // Find top semantic matches (terms in both)
  const topMatches: string[] = []
  for (const [term, val] of jdVec) {
    if (resumeVec.has(term) && val > 0.1 && term.length > 3) {
      topMatches.push(term)
    }
  }

  return { score, topMatches: topMatches.slice(0, 10) }
}

// ── Component 3: Qualification Fit (20%) ─────────────────────────────────────

// Core qualifications that should always be checked from JD text directly
const CORE_QUAL_PATTERNS = [
  { label: 'Java proficiency', pattern: /\bjava\b/i, resumePattern: /\bjava\b/i },
  { label: 'Spring Boot', pattern: /spring\s*boot/i, resumePattern: /spring\s*boot/i },
  { label: 'Spring MVC', pattern: /spring\s*mvc/i, resumePattern: /spring\s*mvc/i },
  { label: 'Spring Framework', pattern: /spring\s*(framework|core|mvc|boot)/i, resumePattern: /spring/i },
  { label: 'REST API development', pattern: /rest(ful)?\s*api/i, resumePattern: /rest(ful)?\s*api/i },
  { label: 'OOP / Object-Oriented', pattern: /object.oriented|\boop\b|oops/i, resumePattern: /object.oriented|\boop\b|oops/i },
  { label: 'Multithreading', pattern: /multithreading|multi-threading/i, resumePattern: /multithreading|concurrent/i },
  { label: 'Design patterns', pattern: /design\s*pattern/i, resumePattern: /design\s*pattern/i },
  { label: 'Exception handling', pattern: /exception\s*handling/i, resumePattern: /exception|error\s*handling/i },
  { label: 'Microservices', pattern: /microservice/i, resumePattern: /microservice/i },
  { label: 'Hibernate / JPA', pattern: /hibernate|\bjpa\b/i, resumePattern: /hibernate|\bjpa\b/i },
  { label: 'SQL / Database', pattern: /\bsql\b|database/i, resumePattern: /\bsql\b|database|postgresql|oracle|mysql/i },
  { label: 'Docker / Kubernetes', pattern: /docker|kubernetes/i, resumePattern: /docker|kubernetes/i },
  { label: 'AWS / Cloud', pattern: /\baws\b|cloud/i, resumePattern: /\baws\b|cloud|azure|gcp/i },
  { label: 'CI/CD', pattern: /ci\/cd|jenkins|github\s*actions/i, resumePattern: /ci\/cd|jenkins|github\s*actions|gitlab/i },
  { label: 'Swagger / OpenAPI', pattern: /swagger|openapi/i, resumePattern: /swagger|openapi/i },
  { label: 'Dependency Injection', pattern: /dependency\s*injection|\bioc\b/i, resumePattern: /dependency\s*injection|spring|ioc/i },
  { label: 'Postman / API Testing', pattern: /postman|rest\s*assured|api\s*testing/i, resumePattern: /postman|rest\s*assured|junit|mockito/i },
  { label: 'Git', pattern: /\bgit\b/i, resumePattern: /\bgit\b/i },
  { label: 'Agile / Scrum', pattern: /agile|scrum/i, resumePattern: /agile|scrum/i },
]

function scoreQualifications(resume: StructuredResume, jd: StructuredJD) {
  const resumeText = resume.rawText.toLowerCase()
  const jdText = jd.rawText.toLowerCase()
  const met: string[] = []
  const missingQuals: string[] = []

  // First: check bullet-point extracted requirements (if any exist)
  for (const req of jd.requiredQualifications) {
    const reqLower = req.toLowerCase()
    const words = reqLower.split(/\s+/).filter(w => w.length > 4)
    const matchCount = words.filter(w => resumeText.includes(w)).length
    if (matchCount >= Math.ceil(words.length * 0.5)) {
      met.push(req.slice(0, 60))
    } else {
      missingQuals.push(req.slice(0, 60))
    }
  }

  // Second: always run core pattern matching against JD text (catches non-bulleted JDs)
  // Only add patterns that are actually mentioned in the JD
  for (const qual of CORE_QUAL_PATTERNS) {
    if (!qual.pattern.test(jdText)) continue // JD doesn't require this — skip
    const alreadyCovered = met.some(m => m.toLowerCase().includes(qual.label.toLowerCase().split('/')[0].trim()))
    if (alreadyCovered) continue
    if (qual.resumePattern.test(resumeText)) {
      met.push(qual.label)
    } else {
      missingQuals.push(qual.label)
    }
  }

  // Education match
  const hasDegree = resume.education.length > 0
  const jdWantsDegree = /bachelor|master|degree|\bbs\b|\bms\b|phd/i.test(jd.rawText)
  if (jdWantsDegree && hasDegree) met.push('Degree requirement met')
  else if (jdWantsDegree && !hasDegree) missingQuals.push('Degree may be required')

  const total = Math.max(met.length + missingQuals.length, 1)
  const score = Math.min((met.length / total) * 100, 100)

  return { score, met, missing: missingQuals }
}

// ── Component 4: Experience Alignment (10%) ───────────────────────────────────

function scoreExperience(resume: StructuredResume, jd: StructuredJD) {
  const yearsFound = getTotalYears(resume)
  const yearsRequired = jd.experienceRequired || 0

  let score: number
  if (yearsRequired === 0) {
    score = 75 // No requirement stated — assume partial match
  } else if (yearsFound >= yearsRequired) {
    score = 100
  } else if (yearsFound >= yearsRequired * 0.7) {
    score = 75
  } else if (yearsFound >= yearsRequired * 0.5) {
    score = 50
  } else {
    score = 25
  }

  // Bonus for role count breadth
  if (resume.experience.length >= 3) score = Math.min(score + 5, 100)

  return { score, yearsFound, yearsRequired }
}

// ── Component 5: Context & Domain Fit (10%) ───────────────────────────────────

function scoreContext(resume: StructuredResume, jd: StructuredJD) {
  const signals: string[] = []
  const resumeLower = resume.rawText.toLowerCase()
  const jdLower = jd.rawText.toLowerCase()

  // Industry signals
  const industries = ['fintech', 'healthcare', 'e-commerce', 'saas', 'enterprise', 'startup',
    'banking', 'insurance', 'retail', 'logistics', 'edtech', 'govtech', 'defense']
  for (const ind of industries) {
    if (jdLower.includes(ind) && resumeLower.includes(ind)) signals.push(`Industry match: ${ind}`)
  }

  // Deployment context
  const contexts = ['microservices', 'cloud-native', 'distributed', 'high availability',
    'real-time', 'big data', 'ai/ml', 'event-driven']
  for (const ctx of contexts) {
    if (jdLower.includes(ctx) && resumeLower.includes(ctx)) signals.push(`Context match: ${ctx}`)
  }

  // Seniority alignment
  const jdSeniority = jd.seniorityLevel.toLowerCase()
  if (jdSeniority === 'senior' && resume.experience.length >= 3) signals.push('Seniority match: Senior')
  if (jdSeniority === 'junior' && resume.experience.length <= 2) signals.push('Seniority match: Junior')
  if (jdSeniority === 'lead' && resume.experience.length >= 4) signals.push('Seniority match: Lead')

  const score = Math.min(50 + signals.length * 15, 100)
  return { score, signals }
}

// ── ATS Score (bonus output) ─────────────────────────────────────────────────

function scoreATS(resume: StructuredResume, jd: StructuredJD): number {
  let score = 0

  // Standard sections present
  if (resume.skills.length > 0) score += 20
  if (resume.experience.length > 0) score += 20
  if (resume.education.length > 0) score += 15
  if (resume.email) score += 10
  if (resume.phone) score += 5
  if (resume.summary) score += 10

  // Keyword density
  const matched = resume.skills.filter(s => jd.keywords.includes(s.toLowerCase()))
  score += Math.min((matched.length / Math.max(jd.keywords.length, 1)) * 20, 20)

  return Math.min(score, 100)
}

// ── Visa / Security Flags ────────────────────────────────────────────────────

function checkFlags(
  resume: StructuredResume,
  jd: StructuredJD
): { visaFlag: string | null; securityFlag: string | null; penalties: { reason: string; deduction: number }[] } {
  const penalties: { reason: string; deduction: number }[] = []
  let visaFlag: string | null = null
  let securityFlag: string | null = null

  if (jd.visaRequirement) {
    visaFlag = `JD requires: "${jd.visaRequirement}"`
    if (!resume.visaStatus) {
      visaFlag += ' — Not found in resume'
      penalties.push({ reason: 'Visa/work authorization not confirmed in resume', deduction: 10 })
    } else {
      visaFlag += ` — Resume mentions: "${resume.visaStatus}"`
    }
  }

  if (jd.securityClearance) {
    securityFlag = `JD requires: "${jd.securityClearance}"`
    if (!resume.clearance) {
      securityFlag += ' — Not found in resume'
      penalties.push({ reason: 'Security clearance not found in resume', deduction: 15 })
    } else {
      securityFlag += ` — Resume mentions: "${resume.clearance}"`
    }
  }

  return { visaFlag, securityFlag, penalties }
}

// ── Main scorer ──────────────────────────────────────────────────────────────

export function scoreResumeAgainstJD(
  resume: StructuredResume,
  jd: StructuredJD
): ScoreResult {
  const keyword = scoreKeywords(resume, jd)
  const semantic = scoreSemantic(resume, jd)
  const qualification = scoreQualifications(resume, jd)
  const experience = scoreExperience(resume, jd)
  const context = scoreContext(resume, jd)
  const { visaFlag, securityFlag, penalties } = checkFlags(resume, jd)

  // Weighted overall
  let overall =
    keyword.score * WEIGHTS.keyword +
    semantic.score * WEIGHTS.semantic +
    qualification.score * WEIGHTS.qualification +
    experience.score * WEIGHTS.experience +
    context.score * WEIGHTS.context

  // Apply penalties
  for (const p of penalties) overall = Math.max(0, overall - p.deduction)
  overall = Math.round(Math.min(overall, 100))

  const breakdown: ScoreBreakdown = {
    keyword: {
      score: Math.round(keyword.score),
      weight: WEIGHTS.keyword,
      matched: keyword.matched,
      missing: keyword.missing,
    },
    semantic: {
      score: Math.round(semantic.score),
      weight: WEIGHTS.semantic,
      topMatches: semantic.topMatches,
    },
    qualification: {
      score: Math.round(qualification.score),
      weight: WEIGHTS.qualification,
      met: qualification.met,
      missing: qualification.missing,
    },
    experience: {
      score: Math.round(experience.score),
      weight: WEIGHTS.experience,
      yearsFound: experience.yearsFound,
      yearsRequired: experience.yearsRequired,
    },
    context: {
      score: Math.round(context.score),
      weight: WEIGHTS.context,
      signals: context.signals,
    },
    penalties,
  }

  return {
    overallScore: overall,
    atsScore: Math.round(scoreATS(resume, jd)),
    keywordScore: Math.round(keyword.score),
    semanticScore: Math.round(semantic.score),
    qualificationScore: Math.round(qualification.score),
    experienceScore: Math.round(experience.score),
    contextScore: Math.round(context.score),
    matchedKeywords: keyword.matched,
    missingKeywords: keyword.missing,
    matchedSkills: resume.skills.filter(s =>
      jd.keywords.map(k => k.toLowerCase()).includes(s.toLowerCase())
    ),
    missingSkills: jd.requiredSkills.filter(s =>
      !resume.skills.map(r => r.toLowerCase()).includes(s.toLowerCase())
    ),
    visaFlag,
    securityFlag,
    scoreBreakdown: breakdown,
  }
}

// ── Batch scorer: score and rank multiple resumes ────────────────────────────

export function rankResumesForJD(
  resumes: { id: string; versionId: string; parsed: StructuredResume }[],
  jd: StructuredJD
): { resumeId: string; versionId: string; result: ScoreResult }[] {
  return resumes
    .map(r => ({ resumeId: r.id, versionId: r.versionId, result: scoreResumeAgainstJD(r.parsed, jd) }))
    .sort((a, b) => b.result.overallScore - a.result.overallScore)
}
