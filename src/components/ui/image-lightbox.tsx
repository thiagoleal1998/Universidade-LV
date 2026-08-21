'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

export function ImageLightbox({
  images,
  index,
  onClose,
  onNavigate,
}: {
  images: { url: string }[]
  index: number
  onClose: () => void
  onNavigate: (index: number) => void
}) {
  const current = images[index]

  useEffect(() => {
    if (!current) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onNavigate((index + 1) % images.length)
      if (e.key === 'ArrowLeft') onNavigate((index - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, index, images.length, onClose, onNavigate])

  if (!current) return null

  const lightbox = (
    // z-[10000], não z-[9999]: empatar com o sino de notificações
    // (`notification-bell.tsx`, também z-[9999]) deixava a ordem de pintura
    // decidida pela posição no DOM — hoje este lightbox é renderizado dentro
    // do <main> (depois da sidebar), então ganhava por acaso. Um lightbox
    // sempre precisa cobrir o sino; sem o valor maior, mover a chamada pra
    // outro ponto da árvore reintroduziria o CLV-0116 em silêncio.
    <div
      className="fixed inset-0 z-[10000] bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
        aria-label="Fechar"
      >
        <X className="w-7 h-7" />
      </button>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onNavigate((index - 1 + images.length) % images.length) }}
            className="absolute left-4 text-white/80 hover:text-white transition-colors"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-9 h-9" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onNavigate((index + 1) % images.length) }}
            className="absolute right-4 text-white/80 hover:text-white transition-colors"
            aria-label="Próxima"
          >
            <ChevronRight className="w-9 h-9" />
          </button>
        </>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current.url}
        alt="Anexo"
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )

  // Bug real corrigido: quando chamado de dentro do modal de um chamado de
  // Feedback (`feedback-panel.tsx`), este componente era renderizado como
  // filho comum de `DialogContent` — que é `fixed` + `translate(-50%,-50%)`
  // pra centralizar (`dialog.tsx`). Um ancestral com `transform` vira o
  // "containing block" de qualquer descendente `fixed` (regra do CSS), então
  // o `inset-0` deste lightbox passava a resolver contra a CAIXA PEQUENA do
  // modal, não a viewport inteira — a imagem "vazava" pra fora do modal e
  // ficava atrás dele. `z-index` maior não resolve isso (não é uma disputa
  // de z-index, é containing block errado). Portal direto pro `document.body`
  // — mesmo padrão já usado no painel do sino (`notification-bell.tsx`) —
  // sempre resolve `fixed` contra a viewport de verdade, não importa de
  // dentro de qual Dialog/card o lightbox foi aberto.
  return typeof document !== 'undefined' ? createPortal(lightbox, document.body) : null
}
