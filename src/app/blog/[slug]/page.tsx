import { Metadata } from 'next';
import BlogPost from '@/app/pages/BlogPost';
import { prisma } from '@/lib/prisma';
import { buildMetadata, notFoundMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  const post = await prisma.blogPost.findUnique({
    where: { slug },
    select: { title: true, excerpt: true, image: true },
  });

  if (!post) return notFoundMetadata('Article');

  return buildMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${slug}`,
    image: post.image,
    type: 'article',
  });
}

export default function BlogPostPage() {
  return <BlogPost />;
}
