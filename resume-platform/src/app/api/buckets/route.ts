import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const buckets = await prisma.roleBucket.findMany({
    where: { userId: session.user.id },
    include: {
      resumes: {
        where: { status: 'active' },
        include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(buckets)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { roleName, description, color } = await req.json()
  if (!roleName) return NextResponse.json({ error: 'roleName required' }, { status: 400 })

  const bucket = await prisma.roleBucket.create({
    data: { userId: session.user.id, roleName, description, color: color || '#1A56A0' },
  })
  return NextResponse.json(bucket)
}
