import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CommunityPostView } from '@/components/members/community-post-view'
import { buttonVariants } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function PostPage({
  params,
}: {
  params: Promise<{ courseId: string; postId: string }>
}) {
  const { courseId, postId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: postData },
    { data: repliesData },
    { data: profileData },
    { data: courseData },
    { data: pollData },
  ] = await Promise.all([
    supabase
      .from('community_posts')
      .select('id, title, body, is_pinned, is_locked, created_at, user_id, course_id, profiles(full_name, role)')
      .eq('id', postId)
      .single(),
    supabase
      .from('community_replies')
      .select('id, body, created_at, user_id, profiles(full_name, role)')
      .eq('post_id', postId)
      .order('created_at'),
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('courses').select('name').eq('id', courseId).single(),
    supabase
      .from('community_polls')
      .select('id, question, options, ends_at')
      .eq('post_id', postId)
      .maybeSingle(),
  ])

  if (!postData || postData.course_id !== courseId) notFound()

  const isAdmin = profileData?.role === 'admin'

  let pollVotes: { option_index: number; user_id: string }[] = []
  if (pollData) {
    const { data: votes } = await supabase
      .from('community_poll_votes')
      .select('option_index, user_id')
      .eq('poll_id', pollData.id)
    pollVotes = votes ?? []
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-2">
        <Link href={`/dashboard/comunidade/${courseId}`} className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <p className="text-xs text-muted-foreground">{courseData?.name} · Comunidade</p>
        </div>
      </div>

      <CommunityPostView
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        post={postData as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        replies={(repliesData ?? []) as any}
        courseId={courseId}
        currentUserId={user.id}
        isAdmin={isAdmin}
        poll={pollData ? { ...pollData, options: pollData.options as string[] } : null}
        pollVotes={pollVotes}
      />
    </div>
  )
}
