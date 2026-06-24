'use client'

type Partner = { name: string; logo_url: string }

const ITEM_W = 180  // px por slot de logo
const SPEED  = 55   // px por segundo

export function PartnersCarousel({ partners, title }: { partners: Partner[]; title: string }) {
  if (!partners.length) return null

  // Repetimos o suficiente para que metade da faixa preencha qualquer tela e o loop seja invisível.
  // A animação move exatamente "halfWidth" px para a esquerda e reinicia — as duas metades são idênticas.
  const copiesHalf = partners.length < 5 ? 3 : partners.length < 9 ? 2 : 1
  const items      = Array.from({ length: copiesHalf * 2 }, () => partners).flat()
  const halfWidth  = copiesHalf * partners.length * ITEM_W
  const duration   = Math.round(halfWidth / SPEED)

  return (
    <div className="max-w-full mx-auto">
      {title && (
        <p className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-8">
          {title}
        </p>
      )}

      <style>{`
        @keyframes partners-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-${halfWidth}px); }
        }
        .partners-track {
          animation: partners-scroll ${duration}s linear infinite;
          will-change: transform;
        }
        .partners-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Gradiente nas bordas para fade out suave */}
      <div
        className="overflow-hidden relative"
        style={{
          maskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
        }}
      >
        <div className="partners-track flex items-center">
          {items.map((p, i) => (
            <div
              key={i}
              style={{ width: ITEM_W }}
              className="shrink-0 h-16 flex items-center justify-center px-6"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.logo_url}
                alt={p.name}
                className="h-9 w-auto max-w-[140px] brightness-0 invert opacity-55 hover:brightness-100 hover:invert-0 hover:opacity-100 transition-all duration-500 ease-out"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
