import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'
import { ensureUniqueSlug } from '@/lib/slug'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const byId = await prisma.blogPost.findUnique({ where: { id } })
    if (byId) return createResponse(byId)
    const bySlug = await prisma.blogPost.findUnique({ where: { slug: id } })
    if (bySlug) return createResponse(bySlug)
    return createErrorResponse('Blog post not found', 404)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const adminUser = await getCurrentAdmin()
    if (!adminUser) {
      return createErrorResponse('Unauthorized - admin only', 401)
    }
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.blogPost.findUnique({ where: { id } })
    if (!existing) {
      return createErrorResponse('Blog post not found', 404)
    }

    const safeData: Record<string, any> = {}
    if (typeof body.title === 'string' && body.title.trim()) safeData.title = body.title.trim()
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

    if (typeof body.slug === 'string' || typeof safeData.title === 'string') {
      const slugInput =
        typeof body.slug === 'string' && body.slug.trim()
          ? body.slug.trim()
          : (safeData.title || existing.title)
      const candidate = slugInput === existing.slug ? existing.slug : await ensureUniqueSlug(slugInput, async (c) => {
        const taken = await prisma.blogPost.findUnique({ where: { slug: c }, select: { id: true } })
        return !!taken && taken.id !== id
      })
      safeData.slug = candidate
    }

    const post = await prisma.blogPost.update({ where: { id }, data: safeData })
    return createResponse(post)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const adminUser = await getCurrentAdmin()
    if (!adminUser) {
      return createErrorResponse('Unauthorized - admin only', 401)
    }
    const { id } = await params

    const existing = await prisma.blogPost.findUnique({ where: { id } })
    if (!existing) {
      return createErrorResponse('Blog post not found', 404)
    }

    await prisma.blogPost.delete({ where: { id } })
    return createResponse({ message: 'Blog post deleted successfully' })
  } catch (error) {
    return handleApiError(error)
  }
}
