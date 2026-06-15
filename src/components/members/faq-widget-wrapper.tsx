'use client'

import { usePathname } from 'next/navigation'
import { MemberFaqChat } from '@/components/members/member-faq-chat'
import type { FaqItem } from '@/app/actions/faq'

type Props = {
  items: FaqItem[]
  assistantName?: string
  assistantSubtitle?: string
}

export function FaqWidgetWrapper({ items, assistantName, assistantSubtitle }: Props) {
  const pathname = usePathname()

  // Oculta dentro do visualizador de aulas
  if (pathname.startsWith('/dashboard/aulas/')) return null

  return (
    <MemberFaqChat
      items={items}
      assistantName={assistantName}
      assistantSubtitle={assistantSubtitle}
    />
  )
}
