import { StructuredJD } from '@/types'

// ── Role taxonomy ─────────────────────────────────────────────────────────────

const ROLE_FAMILIES: Record<string, { keywords: string[]; subRoles: string[] }> = {
  'Software Engineer': {
    keywords: ['software engineer', 'software developer', 'swe', 'software development'],
    subRoles: ['Full Stack', 'Backend', 'Frontend', 'Mobile', 'Embedded'],
  },
  'Frontend Developer': {
    keywords: ['frontend', 'front-end', 'front end', 'ui developer', 'react developer', 'angular developer', 'vue developer'],
    subRoles: ['React', 'Angular', 'Vue', 'UI/UX', 'Web'],
  },
  'Backend Developer': {
    keywords: ['backend', 'back-end', 'back end', 'api developer', 'server-side'],
    subRoles: ['Node.js', 'Java', 'Python', 'Go', '.NET'],
  },
  'Full Stack Developer': {
    keywords: ['full stack', 'fullstack', 'full-stack'],
    subRoles: ['MERN', 'MEAN', 'LAMP', 'Django', 'Rails'],
  },
  'Java Developer': {
    keywords: ['java developer', 'java engineer', 'j2ee', 'spring developer'],
    subRoles: ['Spring Boot', 'Microservices', 'Enterprise', 'Android'],
  },
  'Python Developer': {
    keywords: ['python developer', 'python engineer', 'django developer', 'flask developer'],
    subRoles: ['Django', 'FastAPI', 'Flask', 'Data Engineering', 'ML'],
  },
  'DevOps Engineer': {
    keywords: ['devops', 'site reliability', 'sre', 'platform engineer', 'infrastructure engineer'],
    subRoles: ['Kubernetes', 'AWS', 'GCP', 'Azure', 'CI/CD'],
  },
  'Data Engineer': {
    keywords: ['data engineer', 'data pipeline', 'etl developer', 'big data'],
    subRoles: ['Spark', 'Kafka', 'Airflow', 'dbt', 'Snowflake'],
  },
  'Data Scientist': {
    keywords: ['data scientist', 'machine learning engineer', 'ml engineer', 'ai engineer'],
    subRoles: ['ML', 'NLP', 'Computer Vision', 'Deep Learning'],
  },
  'QA Engineer': {
    keywords: ['qa engineer', 'quality assurance', 'test engineer', 'automation engineer', 'sdet'],
    subRoles: ['Automation', 'Manual', 'Performance', 'Security'],
  },
  'Cloud Engineer': {
    keywords: ['cloud engineer', 'cloud architect', 'aws engineer', 'azure engineer'],
    subRoles: ['AWS', 'Azure', 'GCP', 'Multi-Cloud'],
  },
}

const SENIORITY_MAP: Record<string, string> = {
  'intern': 'Intern', 'junior': 'Junior', 'entry': 'Junior', 'associate': 'Junior',
  'mid': 'Mid', 'intermediate': 'Mid',
  'senior': 'Senior', 'sr.': 'Senior', 'lead': 'Lead', 'staff': 'Staff',
  'principal': 'Principal', 'architect': 'Architect',
  'manager': 'Manager', 'director': 'Director', 'vp': 'VP',
}

const VISA_PATTERNS = [
  /must\s+be\s+authorized/i, /must\s+be\s+eligible/i, /authorized\s+to\s+work/i,
  /no\s+visa\s+sponsorship/i, /will\s+not\s+sponsor/i, /cannot\s+sponsor/i,
  /us\s*citizen/i, /permanent\s*resident/i, /green\s*card/i,
  /must\s+hold\s+.*\s+clearance/i,
]

const SECURITY_PATTERNS = [
  /secret\s+clearance/i, /top\s+secret/i, /ts\/sci/i, /sci\s+clearance/i,
  /dod\s+clearance/i, /public\s+trust/i, /security\s+clearance\s+required/i,
]

const REQUIREMENT_SECTIONS = [
  'requirements', 'required qualifications', 'must have', 'mandatory',
  'what you need', 'what we need', 'basic qualifications',
]
const PREFERRED_SECTIONS = [
  'preferred', 'nice to have', 'bonus', 'desired', 'plus',
  'preferred qualifications', 'additional qualifications',
]

// ── Keyword extraction ───────────────────────────────────────────────────────

const ALL_TECH_KEYWORDS = [
  'javascript','typescript','python','java','kotlin','go','golang','rust','c++','c#','ruby','php','scala',
  'react','angular','vue','next.js','nextjs','html','css','tailwind','bootstrap','webpack','redux','graphql',
  'node.js','nodejs','express','fastapi','django','flask','spring','spring boot','rails','asp.net','.net','nestjs',
  'sql','postgresql','mysql','mongodb','redis','elasticsearch','cassandra','dynamodb','sqlite','firebase',
  'pandas','numpy','scikit-learn','tensorflow','pytorch','spark','kafka','airflow','dbt','snowflake','bigquery',
  'aws','azure','gcp','docker','kubernetes','k8s','terraform','ansible','jenkins','github actions','helm',
  'jest','pytest','junit','selenium','cypress','playwright','jmeter',
  'git','jira','agile','scrum','ci/cd','devops','microservices','tdd','rest api','grpc',
  'machine learning','deep learning','nlp','data engineering','etl','api design','linux','unix',
]

function extractKeywords(text: string): string[] {
  const lower = text.toLowerCase()
  return ALL_TECH_KEYWORDS.filter(kw => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`\\b${escaped}\\b`).test(lower)
  })
}

function extractExperienceRequired(text: string): number {
  const patterns = [
    /(\d+)\+?\s*years?\s+of\s+(professional\s+)?experience/i,
    /minimum\s+(\d+)\s+years?/i,
    /at\s+least\s+(\d+)\s+years?/i,
    /(\d+)\s*-\s*\d+\s+years?\s+of\s+experience/i,
    /(\d+)\s*\+\s*years?/i,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) return parseInt(m[1])
  }
  return 0
}

function extractSeniority(text: string): string {
  const lower = text.toLowerCase()
  for (const [kw, level] of Object.entries(SENIORITY_MAP)) {
    if (lower.includes(kw)) return level
  }
  return 'Mid'
}

function classifyRole(text: string): { roleFamily: string; subRole: string } {
  const lower = text.toLowerCase()
  let bestFamily = 'Software Engineer'
  let bestScore = 0
  let bestSubRole = 'General'

  for (const [family, config] of Object.entries(ROLE_FAMILIES)) {
    const score = config.keywords.filter(kw => lower.includes(kw)).length
    if (score > bestScore) {
      bestScore = score
      bestFamily = family
      // detect sub-role
      for (const sub of config.subRoles) {
        if (lower.includes(sub.toLowerCase())) {
          bestSubRole = sub
          break
        }
      }
    }
  }
  return { roleFamily: bestFamily, subRole: bestSubRole }
}

function extractRequirements(text: string): { required: string[]; preferred: string[] } {
  const lines = text.split('\n')
  const required: string[] = []
  const preferred: string[] = []
  let mode: 'required' | 'preferred' | null = null

  for (const line of lines) {
    const lower = line.toLowerCase().trim()
    if (REQUIREMENT_SECTIONS.some(s => lower.includes(s))) { mode = 'required'; continue }
    if (PREFERRED_SECTIONS.some(s => lower.includes(s))) { mode = 'preferred'; continue }
    const isBullet = /^[•\-\*\u2022]|\d+\./.test(line.trim())
    if (mode === 'required' && isBullet && line.trim().length > 10) required.push(line.trim().replace(/^[•\-\*\u2022]\s*/, ''))
    if (mode === 'preferred' && isBullet && line.trim().length > 10) preferred.push(line.trim().replace(/^[•\-\*\u2022]\s*/, ''))
  }
  return { required, preferred }
}

function extractVisaRequirement(text: string): string | undefined {
  for (const p of VISA_PATTERNS) {
    const m = text.match(p)
    if (m) return m[0]
  }
}

function extractSecurityClearance(text: string): string | undefined {
  for (const p of SECURITY_PATTERNS) {
    const m = text.match(p)
    if (m) return m[0]
  }
}

function extractTitle(text: string): string {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3 && l.length < 100)
  // First non-empty line that looks like a job title
  const titleLine = lines.find(l =>
    /engineer|developer|analyst|scientist|architect|manager|lead|designer|consultant/i.test(l) &&
    !l.toLowerCase().includes('we are') && !l.toLowerCase().includes('about')
  )
  return titleLine || lines[0] || 'Unknown Position'
}

function extractCompany(text: string): string | undefined {
  const patterns = [
    /(?:at|@|company:|employer:)\s+([A-Z][A-Za-z0-9\s&,\.]+?)(?:\n|,|\s{2})/,
    /^([A-Z][A-Za-z0-9\s&,\.]{2,40})\s+is\s+(looking|hiring|seeking)/m,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) return m[1].trim()
  }
}

// ── Main export ──────────────────────────────────────────────────────────────

export function parseJD(rawText: string, sourceUrl?: string): StructuredJD {
  const { roleFamily, subRole } = classifyRole(rawText)
  const keywords = extractKeywords(rawText)
  const { required, preferred } = extractRequirements(rawText)

  return {
    title: extractTitle(rawText),
    company: extractCompany(rawText),
    location: rawText.match(/(?:location|office|based):\s*([^\n]+)/i)?.[1]?.trim(),
    requiredSkills: keywords.slice(0, 20),
    preferredSkills: preferred.flatMap(p => extractKeywords(p)).slice(0, 10),
    requiredQualifications: required,
    preferredQualifications: preferred,
    experienceRequired: extractExperienceRequired(rawText),
    tools: keywords.filter(k => ['git','jira','confluence','docker','kubernetes'].includes(k)),
    keywords,
    visaRequirement: extractVisaRequirement(rawText),
    securityClearance: extractSecurityClearance(rawText),
    roleFamily,
    subRole,
    seniorityLevel: extractSeniority(rawText),
    rawText,
  }
}

export function getRoleBucketsForJD(jd: StructuredJD): string[] {
  const buckets = new Set<string>()
  buckets.add(jd.roleFamily)

  // Add adjacent families based on keywords
  const lower = jd.rawText.toLowerCase()
  if (lower.includes('full stack') || lower.includes('fullstack')) buckets.add('Full Stack Developer')
  if (lower.includes('frontend') || lower.includes('react') || lower.includes('angular')) buckets.add('Frontend Developer')
  if (lower.includes('backend') || lower.includes('api') || lower.includes('server')) buckets.add('Backend Developer')
  if (lower.includes('java') || lower.includes('spring')) buckets.add('Java Developer')
  if (lower.includes('python') || lower.includes('django') || lower.includes('fastapi')) buckets.add('Python Developer')

  return [...buckets]
}
