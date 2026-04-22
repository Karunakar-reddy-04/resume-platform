import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseJD, getRoleBucketsForJD } from '@/lib/parser/jd-parser'
import { parseResume } from '@/lib/parser/resume-parser'
import { rankResumesForJD } from '@/lib/scorer/scoring-engine'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const jds = await prisma.jobDescription.findMany({
    where: { batch: { userId: session.user.id } },
    include: {
      matchResults: {
        include: {
          resume: { select: { displayName: true, focusLabel: true, bucket: { select: { roleName: true } } } },
        },
        orderBy: { overallScore: 'desc' },
        take: 5,
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(jds)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    // Supports single JD or array
    const items: { rawText: string; sourceUrl?: string; title?: string; company?: string; location?: string }[] =
      Array.isArray(body) ? body : [body]

    if (!items.length || !items[0].rawText)
      return NextResponse.json({ error: 'rawText required' }, { status: 400 })

    // Create batch
    const batch = await prisma.jobBatch.create({
      data: { userId: session.user.id, status: 'processing' },
    })

    // Process each JD
    const results = []
    for (const item of items) {
      const parsed = parseJD(item.rawText, item.sourceUrl)
      const targetBuckets = getRoleBucketsForJD(parsed)

      // Save JD
      const jd = await prisma.jobDescription.create({
        data: {
          batchId: batch.id,
          sourceUrl: item.sourceUrl,
          title: item.title || parsed.title,
          company: item.company || parsed.company,
          location: item.location || parsed.location,
          rawText: item.rawText,
          extractedJson: parsed as object,
          roleFamily: parsed.roleFamily,
          subRole: parsed.subRole,
          status: 'processing',
        },
      })

      // Fetch relevant resumes from matched buckets
      const resumes = await prisma.resume.findMany({
        where: {
          status: 'active',
          bucket: {
            userId: session.user.id,
            roleName: { in: targetBuckets },
          },
        },
        include: {
          versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
          bucket: { select: { roleName: true } },
        },
      })

      // Parse and score
      type ResumeWithVersion = typeof resumes[number]
      const toScore = resumes
        .filter((r: ResumeWithVersion) => r.versions[0])
        .map((r: ResumeWithVersion) => ({
          id: r.id,
          versionId: r.versions[0].id,
          parsed: parseResume(r.versions[0].extractedText),
        }))

      const ranked = rankResumesForJD(toScore, parsed)

      // Save all match results
      for (const { resumeId, versionId, result } of ranked) {
        await prisma.matchResult.create({
          data: {
            jdId: jd.id,
            resumeId,
            resumeVersionId: versionId,
            overallScore: result.overallScore,
            atsScore: result.atsScore,
            keywordScore: result.keywordScore,
            semanticScore: result.semanticScore,
            qualificationScore: result.qualificationScore,
            experienceScore: result.experienceScore,
            contextScore: result.contextScore,
            matchedKeywords: result.matchedKeywords,
            missingKeywords: result.missingKeywords,
            matchedSkills: result.matchedSkills,
            missingSkills: result.missingSkills,
            visaFlag: result.visaFlag,
            securityFlag: result.securityFlag,
            flagsJson: { visa: result.visaFlag, security: result.securityFlag },
            scoreBreakdown: result.scoreBreakdown as object,
          },
        })
      }

      await prisma.jobDescription.update({ where: { id: jd.id }, data: { status: 'completed' } })
      results.push({ jdId: jd.id, title: parsed.title, matched: ranked.length })
    }

    await prisma.jobBatch.update({ where: { id: batch.id }, data: { status: 'completed' } })
    return NextResponse.json({ batchId: batch.id, processed: results.length, results })
  } catch (e) {
    console.error('JD intake error:', e)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
