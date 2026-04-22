import { StructuredResume, WorkExperience, Education } from '@/types'

// ── Text extraction ──────────────────────────────────────────────────────────

export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (mimeType === 'application/pdf' || mimeType.includes('pdf')) {
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)
    return data.text
  }
  if (
    mimeType.includes('word') ||
    mimeType.includes('docx') ||
    mimeType.includes('openxmlformats')
  ) {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }
  // plain text fallback
  return buffer.toString('utf-8')
}

// ── Skill taxonomy ───────────────────────────────────────────────────────────

const SKILL_KEYWORDS = [
  // Languages
  'javascript','typescript','python','java','kotlin','swift','go','golang','rust',
  'c++','c#','ruby','php','scala','r','matlab','bash','shell','perl','haskell',
  // Frontend
  'react','angular','vue','next.js','nextjs','nuxt','svelte','html','css','sass',
  'less','tailwind','bootstrap','webpack','vite','redux','mobx','graphql','rest',
  // Backend
  'node.js','nodejs','express','fastapi','django','flask','spring','springboot',
  'spring boot','rails','laravel','asp.net','.net','nestjs','koa','hapi',
  // Data / AI
  'sql','postgresql','mysql','mongodb','redis','elasticsearch','cassandra',
  'dynamodb','sqlite','oracle','firebase','supabase','neo4j','influxdb',
  'pandas','numpy','scikit-learn','tensorflow','pytorch','keras','spark','hadoop',
  'kafka','airflow','dbt','snowflake','bigquery','redshift','databricks',
  // Cloud / DevOps
  'aws','azure','gcp','docker','kubernetes','k8s','terraform','ansible','jenkins',
  'github actions','circleci','travis','helm','istio','prometheus','grafana',
  'cloudformation','pulumi','nginx','apache','linux','unix',
  // Testing
  'jest','pytest','junit','selenium','cypress','playwright','mocha','chai',
  'testing library','postman','jmeter','gatling','sonarqube',
  // Tools / Practices
  'git','jira','confluence','agile','scrum','kanban','ci/cd','devops',
  'microservices','monorepo','tdd','bdd','rest api','grpc','graphql',
  // Certs / Clearances
  'aws certified','azure certified','gcp certified','cissp','ceh','pmp',
  // Misc
  'machine learning','deep learning','nlp','computer vision','data engineering',
  'data science','data analysis','business intelligence','etl','api design',
]

const VISA_PATTERNS = [
  /us\s*citizen/i, /security\s*clearance/i, /secret\s*clearance/i,
  /top\s*secret/i, /ts\/sci/i, /public\s*trust/i,
  /authorized\s*to\s*work/i, /green\s*card/i, /h1b/i, /h-1b/i,
  /ead/i, /opt/i, /stem\s*opt/i, /visa\s*sponsorship/i,
]

const CLEARANCE_PATTERNS = [
  /secret/i, /top\s*secret/i, /ts\/sci/i, /sci/i,
  /confidential/i, /public\s*trust/i, /dod\s*clearance/i,
]

// ── Section detection ────────────────────────────────────────────────────────

function splitSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {}
  const lines = text.split('\n')
  let current = 'header'
  let buffer: string[] = []

  const SECTION_HEADERS: Record<string, string> = {
    'experience': 'experience',
    'work experience': 'experience',
    'professional experience': 'experience',
    'employment': 'experience',
    'employment history': 'experience',
    'education': 'education',
    'academic': 'education',
    'skills': 'skills',
    'technical skills': 'skills',
    'core competencies': 'skills',
    'competencies': 'skills',
    'technologies': 'skills',
    'summary': 'summary',
    'professional summary': 'summary',
    'objective': 'summary',
    'profile': 'summary',
    'certifications': 'certifications',
    'certificates': 'certifications',
    'awards': 'certifications',
    'projects': 'projects',
    'key projects': 'projects',
  }

  for (const line of lines) {
    const trimmed = line.trim().toLowerCase().replace(/[:\-–]+$/, '').trim()
    if (SECTION_HEADERS[trimmed]) {
      if (buffer.length) sections[current] = buffer.join('\n')
      current = SECTION_HEADERS[trimmed]
      buffer = []
    } else {
      buffer.push(line)
    }
  }
  if (buffer.length) sections[current] = buffer.join('\n')
  return sections
}

// ── Field extractors ─────────────────────────────────────────────────────────

function extractEmail(text: string): string | undefined {
  const m = text.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i)
  return m?.[0]
}

function extractPhone(text: string): string | undefined {
  const m = text.match(/(\+?1?\s?)?(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})/);
  return m?.[0]?.trim()
}

function extractSkills(text: string): string[] {
  const lower = text.toLowerCase()
  return SKILL_KEYWORDS.filter(sk => {
    const escaped = sk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`\\b${escaped}\\b`).test(lower)
  })
}

function extractVisaStatus(text: string): string | undefined {
  for (const p of VISA_PATTERNS) {
    const m = text.match(p)
    if (m) return m[0]
  }
}

function extractClearance(text: string): string | undefined {
  for (const p of CLEARANCE_PATTERNS) {
    const m = text.match(p)
    if (m) return m[0]
  }
}

function extractYearsOfExperience(text: string): number {
  const patterns = [
    /(\d+)\+?\s*years?\s*of\s*(professional\s*)?experience/i,
    /(\d+)\+?\s*years?\s*in\s*(the\s*)?industry/i,
    /experience\s*of\s*(\d+)\+?\s*years?/i,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) return parseInt(m[1])
  }
  return 0
}

function parseExperience(text: string): WorkExperience[] {
  const jobs: WorkExperience[] = []
  if (!text) return jobs

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  let current: WorkExperience | null = null

  const datePattern = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)?\s*\d{4}\s*([-–]\s*(present|current|\d{4}))?\b/i
  const bulletPattern = /^[•\-\*\u2022\u2013]|^\d+\./

  for (const line of lines) {
    if (line.length < 5) continue
    const hasDate = datePattern.test(line)

    if (hasDate && line.length < 120) {
      if (current) jobs.push(current)
      const titleMatch = line.match(/^([A-Za-z\s,\/\-|]+?)(?:\s+at\s+|\s*[|,]\s*|\s{2,})/)
      const companyMatch = line.match(/(?:at\s+|[|,]\s*)([A-Za-z0-9\s,\.&]+?)(?:\s{2,}|\s+\d{4}|$)/)
      current = {
        title: titleMatch?.[1]?.trim() || line.split(/\s{2,}|\|/)[0]?.trim() || 'Unknown Title',
        company: companyMatch?.[1]?.trim() || line.split(/\s{2,}|\|/)[1]?.trim() || 'Unknown Company',
        duration: line.match(datePattern)?.[0],
        bullets: [],
      }
    } else if (current && (bulletPattern.test(line) || line.length > 40)) {
      const cleaned = line.replace(/^[•\-\*\u2022\u2013]\s*/, '').trim()
      if (cleaned.length > 10) current.bullets.push(cleaned)
    }
  }
  if (current) jobs.push(current)
  return jobs
}

function parseEducation(text: string): Education[] {
  if (!text) return []
  const results: Education[] = []
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5)
  const degreePattern = /\b(bachelor|master|phd|doctorate|associate|b\.?s|m\.?s|m\.?b\.?a|b\.?e|b\.?tech|m\.?tech|b\.?sc|m\.?sc)\b/i
  const yearPattern = /\b(19|20)\d{2}\b/

  for (const line of lines) {
    if (degreePattern.test(line)) {
      results.push({
        degree: line.match(degreePattern)?.[0] || 'Degree',
        school: line.replace(degreePattern, '').replace(yearPattern, '').replace(/[,\-|]/g, ' ').trim(),
        year: line.match(yearPattern)?.[0],
        field: line.match(/in\s+([A-Za-z\s]+)/i)?.[1]?.trim(),
      })
    }
  }
  return results
}

// ── Main export ──────────────────────────────────────────────────────────────

export function parseResume(rawText: string): StructuredResume {
  const sections = splitSections(rawText)
  const fullText = rawText

  const skills = extractSkills(
    (sections.skills || '') + ' ' + (sections.experience || '') + ' ' + (sections.projects || '')
  )

  return {
    name: fullText.split('\n').find(l => l.trim().length > 2 && l.trim().length < 50 && /^[A-Z]/.test(l.trim()))?.trim(),
    email: extractEmail(fullText),
    phone: extractPhone(fullText),
    summary: sections.summary?.trim().slice(0, 600),
    skills: [...new Set(skills)],
    experience: parseExperience(sections.experience || ''),
    education: parseEducation(sections.education || ''),
    certifications: sections.certifications
      ? sections.certifications.split('\n').map(l => l.trim()).filter(l => l.length > 3)
      : [],
    tools: skills.filter(s => ['git','jira','confluence','postman','figma','docker'].includes(s.toLowerCase())),
    languages: [],
    visaStatus: extractVisaStatus(fullText),
    clearance: extractClearance(fullText),
    rawText,
  }
}

export function getTotalYears(resume: StructuredResume): number {
  const fromText = extractYearsOfExperience(resume.rawText)
  if (fromText > 0) return fromText
  // Estimate from number of jobs * avg 2 years
  return Math.min(resume.experience.length * 2, 15)
}
