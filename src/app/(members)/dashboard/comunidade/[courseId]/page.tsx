import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CommunityPosts } from '@/components/members/community-posts'
import { buttonVariants } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

type Post = {
  id: string
  title: string
  body: string
  is_pinned: boolean
  is_locked: boolean
  is_hidden: boolean
  created_at: string
  user_id: string
  profiles: {
    full_name: string
    role: string
  } | null
  reply_count: { count: number }[]
  polls: {
    id: string
    question: string
    options: string[]
    ends_at: string | null
    votes: {
      option_index: number
      user_id: string
    }[]
  }[]
}
export default async function CourseComunidadePage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: courseData }, { data: profileData }, { data: postsData }, { count: courseCount }] = await Promise.all([
    supabase.from('courses').select('id, name').eq('id', courseId).eq('is_published', true).single(),
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase
      .from('community_posts')
      .select('id, title, body, is_pinned, is_locked, is_hidden, created_at, user_id, profiles(full_name, role), reply_count:community_replies(count), polls:community_polls(id, question, options, ends_at, votes:community_poll_votes(option_index, user_id))')
      .eq('course_id', courseId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('courses').select('*', { count: 'exact', head: true }).eq('is_published', true),
  ])

  if (!courseData) notFound()

  const isAdmin = profileData?.role === 'admin'
  const backHref = isAdmin ? '/admin' : (courseCount ?? 0) > 1 ? '/dashboard/comunidade' : '/dashboard'
  const posts = (postsData ?? []) as unknown as Post[]

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-2">
        <Link href={backHref} className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">{courseData.name}</h1>
          <p className="text-xs text-muted-foreground">Comunidade</p>
        </div>
      </div>

      <CommunityPosts
        posts={posts}
        courseId={courseId}
        currentUserId={user.id}
        isAdmin={isAdmin}
      />
    </div>
  )
}
