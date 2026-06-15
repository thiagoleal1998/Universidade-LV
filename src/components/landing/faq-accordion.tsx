'use client'

import { useState } from 'react'
import { FaqItem } from './faq-item'

type FaqEntry = { question: string; answer: string }

export function FaqAccordion({ items }: { items: FaqEntry[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="space-y-3">
      {items.map((f, i) => (
        <FaqItem
          key={i}
          question={f.question}
          answer={f.answer}
          open={openIndex === i}
          onToggle={() => setOpenIndex(openIndex === i ? null : i)}
        />
      ))}
    </div>
  )
}
