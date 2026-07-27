'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Menu } from 'lucide-react'
import { ManualToc, type TocEntry } from '@/components/members/manual-toc'
import { ManualSection, type ManualSectionData } from '@/components/members/manual-section'
import { ModuleCompletionBanner } from '@/components/members/module-certificate'
import { ImageLightbox } from '@/components/ui/image-lightbox'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { manualSectionId, normalizeSearch } from '@/lib/manual'

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Mutação direta no DOM injetado (dangerouslySetInnerHTML) pra envolver
// ocorrências do termo buscado em <mark>. É seguro porque o __html de cada
// seção nunca é re-renderizado pelo React depois do mount (o innerHTML
// pristine é sempre restaurado a partir de `originalHtml` antes de aplicar
// um novo destaque, então a mutação nunca "acumula").
function highlightInElement(root: HTMLElement, query: string) {
  const re = new RegExp(escapeRegExp(query), 'gi')
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []
  let node: Node | null
  while ((node = walker.nextNode())) textNodes.push(node as Text)

  for (const textNode of textNodes) {
    const text = textNode.textContent ?? ''
    re.lastIndex = 0
    if (!re.test(text)) continue
    re.lastIndex = 0
    const frag = document.createDocumentFragment()
    let lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) {
      if (m.index > lastIndex) frag.appendChild(document.createTextNode(text.slice(lastIndex, m.index)))
      const mark = document.createElement('mark')
      mark.className = 'manual-hit'
      mark.textContent = m[0]
      frag.appendChild(mark)
      lastIndex = m.index + m[0].length
    }
    if (lastIndex < text.length) frag.appendChild(document.createTextNode(text.slice(lastIndex)))
    textNode.parentNode?.replaceChild(frag, textNode)
  }
}

export function ModuleManual({
  moduleId,
  moduleTitle,
  moduleDescription,
  isAdmin,
  canModerate,
  currentUserId,
  hasCertificate,
  sections,
  initialCompletedIds,
  initialSectionId,
}: {
  moduleId: string
  moduleTitle: string
  moduleDescription: string
  isAdmin: boolean
  canModerate: boolean
  currentUserId: string
  hasCertificate: boolean
  sections: ManualSectionData[]
  initialCompletedIds: string[]
  initialSectionId?: string | null
}) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set(initialCompletedIds))
  const [activeId, setActiveId] = useState<string | null>(sections[0]?.id ?? null)
  const [query, setQuery] = useState('')
  const [totalMatches, setTotalMatches] = useState(0)
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const [lightbox, setLightbox] = useState<{ images: { url: string }[]; index: number } | null>(null)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [mobileTocOpen, setMobileTocOpen] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const originalHtmlRef = useRef<Map<string, string>>(new Map())
  const suppressObserverRef = useRef(false)

  function handleToggleComplete(lessonId: string, completed: boolean) {
    setCompletedIds((prev) => {
      const next = new Set(prev)
      if (completed) next.add(lessonId)
      else next.delete(lessonId)
      return next
    })
  }

  function handleSelectSection(lessonId: string) {
    suppressObserverRef.current = true
    setActiveId(lessonId)
    document.getElementById(manualSectionId(lessonId))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.history.replaceState(null, '', `#${manualSectionId(lessonId)}`)
    setMobileTocOpen(false)
    setTimeout(() => { suppressObserverRef.current = false }, 700)
  }

  // Scrollspy: o container real de rolagem é o <main> do layout do
  // dashboard (overflow-auto), não a window — window.scrollY é sempre 0
  // aqui, então o observer precisa apontar pra esse ancestral explicitamente.
  useEffect(() => {
    const root = containerRef.current
    const scroller = root?.closest('main')
    if (!root || !scroller) return
    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-manual-section]'))
    if (targets.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (suppressObserverRef.current) return
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length === 0) return
        const top = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b))
        setActiveId(top.target.id.replace(/^aula-/, ''))
      },
      { root: scroller, rootMargin: '-88px 0px -65% 0px', threshold: 0 }
    )
    targets.forEach((t) => observer.observe(t))
    return () => observer.disconnect()
  }, [sections])

  // Rola até a seção pedida por ?aula=<id> (vindo do redirect de
  // /dashboard/aulas/[id] pra um curso manual) assim que a página carrega.
  useEffect(() => {
    if (!initialSectionId) return
    const el = document.getElementById(manualSectionId(initialSectionId))
    if (el) {
      el.scrollIntoView({ block: 'start' })
      window.history.replaceState(null, '', `#${manualSectionId(initialSectionId)}`)
      setActiveId(initialSectionId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Busca: restaura o HTML original de cada seção e reaplica o destaque a
  // cada mudança de termo — nunca acumula sobre uma mutação anterior.
  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    const contentNodes = Array.from(root.querySelectorAll<HTMLElement>('[data-section-content]'))
    contentNodes.forEach((el) => {
      const id = el.dataset.sectionContent!
      if (!originalHtmlRef.current.has(id)) originalHtmlRef.current.set(id, el.innerHTML)
      else el.innerHTML = originalHtmlRef.current.get(id)!
    })

    const q = query.trim()
    if (q.length >= 2) {
      contentNodes.forEach((el) => highlightInElement(el, q))
    }

    const marks = Array.from(root.querySelectorAll<HTMLElement>('mark.manual-hit'))
    setTotalMatches(marks.length)
    setCurrentMatchIndex(0)
    marks.forEach((m, i) => m.classList.toggle('manual-hit-current', i === 0))
    if (marks.length > 0) marks[0].scrollIntoView({ behavior: 'smooth', block: 'center' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  function gotoMatch(targetIndex: number) {
    const root = containerRef.current
    if (!root) return
    const marks = Array.from(root.querySelectorAll<HTMLElement>('mark.manual-hit'))
    if (marks.length === 0) return
    const clamped = ((targetIndex % marks.length) + marks.length) % marks.length
    marks.forEach((m, i) => m.classList.toggle('manual-hit-current', i === clamped))
    marks[clamped].scrollIntoView({ behavior: 'smooth', block: 'center' })
    setCurrentMatchIndex(clamped)
  }

  // Voltar ao topo: mesmo motivo do scrollspy, o scroller real é o <main>.
  useEffect(() => {
    const scroller = containerRef.current?.closest('main')
    if (!scroller) return
    function onScroll() { setShowBackToTop(scroller!.scrollTop > 600) }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [])

  function handleContentClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement
    if (target.tagName !== 'IMG') return
    const imgs = Array.from(containerRef.current?.querySelectorAll<HTMLImageElement>('img') ?? [])
    const index = imgs.indexOf(target as HTMLImageElement)
    if (index === -1) return
    setLightbox({ images: imgs.map((img) => ({ url: img.currentSrc || img.src })), index })
  }

  const normQuery = normalizeSearch(query.trim())
  const tocEntries: TocEntry[] = sections.map((s) => {
    if (!normQuery) {
      return { id: s.id, title: s.title, isCompleted: completedIds.has(s.id), isDraft: s.isDraft, visible: true, matchCount: 0 }
    }
    const titleHits = normalizeSearch(s.title).split(normQuery).length - 1
    const bodyHits = normalizeSearch(s.searchText).split(normQuery).length - 1
    const matchCount = titleHits + bodyHits
    return { id: s.id, title: s.title, isCompleted: completedIds.has(s.id), isDraft: s.isDraft, visible: matchCount > 0, matchCount }
  })

  const totalDone = sections.filter((s) => completedIds.has(s.id)).length
  const pct = sections.length > 0 ? Math.round((totalDone / sections.length) * 100) : 0

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <div>
        <div className="flex items-center justify-between gap-3 mb-1 md:hidden">
          <h1 className="text-xl font-bold text-foreground">{moduleTitle}</h1>
          <Sheet open={mobileTocOpen} onOpenChange={setMobileTocOpen}>
            <Button type="button" variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => setMobileTocOpen(true)}>
              <Menu className="w-3.5 h-3.5" />
              Sumário
            </Button>
            <SheetContent side="left" className="p-4 overflow-y-auto">
              <SheetHeader className="p-0 mb-2">
                <SheetTitle>Sumário</SheetTitle>
              </SheetHeader>
              <ManualToc
                entries={tocEntries}
                activeId={activeId}
                query={query}
                onQueryChange={setQuery}
                onSelect={handleSelectSection}
                matchInfo={query.trim().length >= 2 ? { total: totalMatches, current: currentMatchIndex } : null}
                onPrevMatch={() => gotoMatch(currentMatchIndex - 1)}
                onNextMatch={() => gotoMatch(currentMatchIndex + 1)}
              />
            </SheetContent>
          </Sheet>
        </div>

        <h1 className="hidden md:block text-2xl font-bold text-foreground mb-1">{moduleTitle}</h1>
        {moduleDescription && <p className="text-muted-foreground text-sm">{moduleDescription}</p>}

        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>{totalDone} de {sections.length} seções concluídas</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {sections.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10 bg-card border rounded-xl">
          Nenhuma aula disponível neste módulo.
        </p>
      ) : (
        <div className="grid md:grid-cols-[260px_1fr] gap-8 items-start">
          <aside className="manual-toc hidden md:block">
            <ManualToc
              entries={tocEntries}
              activeId={activeId}
              query={query}
              onQueryChange={setQuery}
              onSelect={handleSelectSection}
              matchInfo={query.trim().length >= 2 ? { total: totalMatches, current: currentMatchIndex } : null}
              onPrevMatch={() => gotoMatch(currentMatchIndex - 1)}
              onNextMatch={() => gotoMatch(currentMatchIndex + 1)}
            />
          </aside>

          <div ref={containerRef} onClick={handleContentClick}>
            {sections.map((section) => (
              <ManualSection
                key={section.id}
                section={section}
                moduleId={moduleId}
                isCompleted={completedIds.has(section.id)}
                onToggleComplete={handleToggleComplete}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                canModerate={canModerate}
              />
            ))}
          </div>
        </div>
      )}

      {!isAdmin && pct === 100 && sections.length > 0 && (
        <ModuleCompletionBanner hasCertificate={hasCertificate} />
      )}

      {showBackToTop && (
        <button
          type="button"
          onClick={() => containerRef.current?.closest('main')?.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-24 right-6 z-40 w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
          title="Voltar ao topo"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onNavigate={(index) => setLightbox((prev) => (prev ? { ...prev, index } : prev))}
        />
      )}
    </div>
  )
}
