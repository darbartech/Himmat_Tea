import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'
import { ensureUniqueSlug, slugify } from '@/lib/slug'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isAdminView = searchParams.get('admin') === 'true'

    const where: any = {}
    if (!isAdminView) {
      where.isPublished = true
    }

    const posts = await prisma.blogPost.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })
    return createResponse(posts)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await getCurrentAdmin()
    if (!adminUser) {
      return createErrorResponse('Unauthorized - admin only', 401)
    }
    const body = await request.json()
    if (typeof body.title !== 'string' || !body.title.trim()) {
      return createErrorResponse('Title is required', 400)
    }

    const safeData: Record<string, any> = {
      title: body.title.trim(),
    }
    if (typeof body.excerpt === 'string') safeData.excerpt = body.excerpt
    if (typeof body.category === 'string') safeData.category = body.category
    if (typeof body.image === 'string') safeData.image = body.image
    if (typeof body.readTime === 'string') safeData.readTime = body.readTime
    if (typeof body.author === 'string') safeData.author = body.author
    if (typeof body.tags === 'string') safeData.tags = body.tags
    if (typeof body.content === 'string') safeData.content = body.content
    if (typeof body.body !== 'undefined' && body.body !== null) safeData.body = body.body
    if (typeof body.isPublished === 'boolean') safeData.isPublished = body.isPublished

    if (typeof body.date === 'string' && body.date) {
      const d = new Date(body.date)
      if (!isNaN(d.getTime())) safeData.date = d
    }

    const slugInput =
      typeof body.slug === 'string' && body.slug.trim()
        ? body.slug.trim()
        : body.title
    safeData.slug = await ensureUniqueSlug(slugInput, async (c) => {
      const exists = await prisma.blogPost.findUnique({ where: { slug: c }, select: { id: true } })
      return !!exists
    })

    const post = await prisma.blogPost.create({ data: safeData as any })
    return createResponse(post, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
