import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json()
    if (!email || !password || !name)
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing)
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })

    const hashed = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({ data: { email, password: hashed, name } })

    // Create default role buckets
    const defaultBuckets = [
      { roleName: 'Software Engineer', color: '#1A56A0' },
      { roleName: 'Frontend Developer', color: '#0891b2' },
      { roleName: 'Backend Developer', color: '#059669' },
      { roleName: 'Full Stack Developer', color: '#7c3aed' },
      { roleName: 'Java Developer', color: '#dc2626' },
      { roleName: 'Python Developer', color: '#d97706' },
    ]
    await prisma.roleBucket.createMany({
      data: defaultBuckets.map(b => ({ ...b, userId: user.id })),
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
