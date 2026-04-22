import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_: Request, { params }: { params: { resultId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await prisma.matchResult.findFirst({
    where: {
      id: params.resultId,
      resume: { bucket: { userId: session.user.id } },
    },
    include: {
      resume: {
        select: {
          displayName: true,
          focusLabel: true,
          bucket: { select: { roleName: true, color: true } },
        },
      },
      resumeVersion: { select: { versionNumber: true, fileName: true, structuredJson: true } },
      jd: { select: { title: true, company: true, location: true, sourceUrl: true, extractedJson: true } },
    },
  })

  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(result)
}
