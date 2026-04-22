import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const jd = await prisma.jobDescription.findFirst({
    where: { id: params.id, batch: { userId: session.user.id } },
    include: {
      matchResults: {
        include: {
          resume: {
            select: {
              displayName: true,
              focusLabel: true,
              bucket: { select: { roleName: true, color: true } },
            },
          },
          resumeVersion: { select: { versionNumber: true, fileName: true } },
        },
        orderBy: { overallScore: 'desc' },
      },
    },
  })

  if (!jd) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(jd)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.jobDescription.deleteMany({
    where: { id: params.id, batch: { userId: session.user.id } },
  })
  return NextResponse.json({ success: true })
}
