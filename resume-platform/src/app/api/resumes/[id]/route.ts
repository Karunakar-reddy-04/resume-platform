import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await req.json()
  const resume = await prisma.resume.updateMany({
    where: { id: params.id, bucket: { userId: session.user.id } },
    data: { displayName: data.displayName, focusLabel: data.focusLabel },
  })
  return NextResponse.json(resume)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.resume.updateMany({
    where: { id: params.id, bucket: { userId: session.user.id } },
    data: { status: 'deleted' },
  })
  return NextResponse.json({ success: true })
}
