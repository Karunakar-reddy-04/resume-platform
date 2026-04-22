import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { extractTextFromBuffer, parseResume } from '@/lib/parser/resume-parser'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const bucketId = searchParams.get('bucketId')

  const where: Record<string, unknown> = { status: 'active', bucket: { userId: session.user.id } }
  if (bucketId) where.bucketId = bucketId

  const resumes = await prisma.resume.findMany({
    where,
    include: {
      versions: { orderBy: { versionNumber: 'desc' } },
      bucket: { select: { roleName: true, color: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(resumes)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const bucketId = formData.get('bucketId') as string
    const displayName = formData.get('displayName') as string
    const focusLabel = formData.get('focusLabel') as string | null

    if (!file || !bucketId || !displayName)
      return NextResponse.json({ error: 'file, bucketId, displayName required' }, { status: 400 })

    // Verify bucket belongs to user
    const bucket = await prisma.roleBucket.findFirst({
      where: { id: bucketId, userId: session.user.id },
    })
    if (!bucket) return NextResponse.json({ error: 'Bucket not found' }, { status: 404 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const mimeType = file.type || 'application/octet-stream'

    // Extract text
    const extractedText = await extractTextFromBuffer(buffer, mimeType)
    const structured = parseResume(extractedText)

    // Store file as base64 in DB (works for Vercel serverless — no filesystem)
    const fileUrl = `data:${mimeType};base64,${buffer.toString('base64')}`

    // Check if resume with same name exists in bucket (new version)
    const existing = await prisma.resume.findFirst({
      where: { bucketId, displayName, status: 'active' },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    })

    if (existing) {
      const nextVersion = (existing.versions[0]?.versionNumber || 0) + 1
      const version = await prisma.resumeVersion.create({
        data: {
          resumeId: existing.id,
          versionNumber: nextVersion,
          fileUrl,
          fileName: file.name,
          fileType: mimeType,
          extractedText,
          structuredJson: structured as object,
        },
      })
      await prisma.resume.update({
        where: { id: existing.id },
        data: { activeVersionId: version.id },
      })
      return NextResponse.json({ ...existing, activeVersionId: version.id, newVersion: nextVersion })
    }

    // New resume
    const resume = await prisma.resume.create({
      data: { bucketId, displayName, focusLabel, status: 'active' },
    })
    const version = await prisma.resumeVersion.create({
      data: {
        resumeId: resume.id,
        versionNumber: 1,
        fileUrl,
        fileName: file.name,
        fileType: mimeType,
        extractedText,
        structuredJson: structured as object,
      },
    })
    await prisma.resume.update({
      where: { id: resume.id },
      data: { activeVersionId: version.id },
    })

    return NextResponse.json({ ...resume, activeVersionId: version.id })
  } catch (e) {
    console.error('Resume upload error:', e)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
