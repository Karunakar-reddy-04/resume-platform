export interface StructuredResume {
  name?: string
  email?: string
  phone?: string
  location?: string
  summary?: string
  skills: string[]
  experience: WorkExperience[]
  education: Education[]
  certifications: string[]
  tools: string[]
  languages: string[]
  visaStatus?: string
  clearance?: string
  rawText: string
}

export interface WorkExperience {
  title: string
  company: string
  duration?: string
  years?: number
  bullets: string[]
}

export interface Education {
  degree: string
  school: string
  year?: string
  field?: string
}

export interface StructuredJD {
  title: string
  company?: string
  location?: string
  requiredSkills: string[]
  preferredSkills: string[]
  requiredQualifications: string[]
  preferredQualifications: string[]
  experienceRequired?: number
  tools: string[]
  keywords: string[]
  visaRequirement?: string
  securityClearance?: string
  roleFamily: string
  subRole: string
  seniorityLevel: string
  rawText: string
}

export interface ScoreResult {
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
  scoreBreakdown: ScoreBreakdown
}

export interface ScoreBreakdown {
  keyword: { score: number; weight: number; matched: string[]; missing: string[] }
  semantic: { score: number; weight: number; topMatches: string[] }
  qualification: { score: number; weight: number; met: string[]; missing: string[] }
  experience: { score: number; weight: number; yearsFound: number; yearsRequired: number }
  context: { score: number; weight: number; signals: string[] }
  penalties: { reason: string; deduction: number }[]
}

export interface RoleBucketWithResumes {
  id: string
  roleName: string
  description: string | null
  color: string
  createdAt: Date
  resumes: ResumeWithVersion[]
}

export interface ResumeWithVersion {
  id: string
  displayName: string
  focusLabel: string | null
  activeVersionId: string | null
  status: string
  createdAt: Date
  versions: {
    id: string
    versionNumber: number
    fileName: string
    fileType: string
    createdAt: Date
  }[]
}

export interface JDWithResults {
  id: string
  title: string | null
  company: string | null
  location: string | null
  sourceUrl: string | null
  roleFamily: string | null
  subRole: string | null
  status: string
  createdAt: Date
  matchResults: MatchResultSummary[]
}

export interface MatchResultSummary {
  id: string
  overallScore: number
  atsScore: number
  resumeId: string
  resumeVersionId: string
  resume: { displayName: string; focusLabel: string | null; bucket: { roleName: string } }
  createdAt: Date
}
