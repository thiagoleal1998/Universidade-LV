'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveCommercialBanner } from '@/app/actions/marketing-settings'
import { uploadMarketingFile } from '@/app/actions/marketing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { Megaphone, Upload, ImageIcon, Lock, MoveVertical, Leaf } from 'lucide-react'
import { cn } from '@/lib/utils'

type Banner = { active: boolean; image_url: string; image_position: number; lv_conditions: string }

function parse(raw: string): Banner {
  try {
    const p = JSON.parse(raw)
    return {
      active: p?.active === true,
      image_url: typeof p?.image_url === 'string' ? p.image_url : '',
      image_position: typeof p?.image_position === 'number' ? p.image_position : 50,
      lv_conditions: typeof p?.lv_conditions === 'string' ? p.lv_conditions : '',
    }
  } catch {
    return { active: false, image_url: '', image_position: 50, lv_conditions: '' }
  }
}

// Banner grande acima da grade de Condições Comerciais, pra campanhas em
// destaque (pedido do usuário) — separado de `commercial_conditions` de
// propósito: não é um card da grade, é uma peça só, sem título/descrição.
export function CommercialBannerManager({ raw, canEdit = true }: { raw: string; canEdit?: boolean }) {
  const router = useRouter()
  const [data, setData] = useState<Banner>(() => parse(raw))
  const [imagePreview, setImagePreview] = useState<string | null>(() => parse(raw).image_url || null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx. 8MB). Escolha uma foto menor ou comprima antes de enviar.')
      e.target.value = ''
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    startTransition(async () => {
      try {
        let imageUrl = imageFile ? '' : (imagePreview ?? '')
        if (imageFile) {
          const upload = await uploadMarketingFile(imageFile, 'image')
          if (upload.error) { toast.error(upload.error); return }
          imageUrl = upload.url ?? ''
        }
        const next: Banner = { ...data, image_url: imageUrl }
        const fd = new FormData()
        fd.set('commercial_banner', JSON.stringify(next))
        const result = await saveCommercialBanner(fd)
        if (result?.error) toast.error(result.error)
        else {
          setData(next)
          setImageFile(null)
          toast.success('Banner salvo!')
          router.refresh()
        }
      } catch {
        toast.error('Não foi possível salvar o banner. Tente novamente com uma imagem menor.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-5 space-y-4 mb-6">
      {!canEdit && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-sm text-amber-800 dark:text-amber-300">
          <Lock className="w-4 h-4 shrink-0" />
          Sua área não tem permissão para alterar o banner de campanha — fale com um admin.
        </div>
      )}
      <fieldset disabled={!canEdit} className="space-y-4 border-0 p-0 m-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" />
            <p className="font-semibold text-foreground">Banner de campanha</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={data.active}
            onClick={() => setData((d) => ({ ...d, active: !d.active }))}
            className={cn('relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', data.active ? 'bg-primary' : 'bg-input')}
          >
            <span className={cn('pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform', data.active ? 'translate-x-5' : 'translate-x-0')} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Aparece bem grande, acima dos cards de Condições Comerciais — pra campanhas que merecem destaque especial.
        </p>

        <div>
          <Label>Imagem do banner</Label>
          <p className="text-xs text-muted-foreground mt-0.5 mb-2">
            Recomendado: formato bem largo, ex. <strong>1600 × 400px</strong> · JPG, PNG, WebP
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div
              className={cn(
                'relative w-full sm:w-64 aspect-[4/1] rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-primary/50 transition-colors',
                imagePreview && 'border-solid border-border'
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Preview do banner"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    style={{ objectPosition: `center ${data.image_position}%` }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                  <ImageIcon className="w-7 h-7" />
                  <span className="text-xs text-center leading-tight px-2">Clique para<br />fazer upload</span>
                </div>
              )}
            </div>
            <div className="flex flex-col justify-center gap-2 flex-1">
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileChange} className="hidden" />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2 w-fit">
                <Upload className="w-4 h-4" />
                {imagePreview ? 'Trocar imagem' : 'Selecionar imagem'}
              </Button>
              {imagePreview && (
                <button type="button" onClick={() => { setImagePreview(null); setImageFile(null) }} className="text-xs text-muted-foreground hover:text-red-500 transition-colors text-left">
                  Remover imagem
                </button>
              )}
              <p className="text-xs text-muted-foreground">Ou cole uma URL:</p>
              <Input
                type="url"
                value={imageFile ? '' : (imagePreview ?? '')}
                onChange={(e) => { setImageFile(null); setImagePreview(e.target.value || null) }}
                placeholder="https://..."
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>

        {imagePreview && (
          <div>
            <Label htmlFor="cb-position" className="flex items-center gap-1.5">
              <MoveVertical className="w-3.5 h-3.5" />
              Posição vertical da foto
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-2">
              Ajuste se a foto ficar cortada errado no topo ou na base da faixa.
            </p>
            <div className="flex items-center gap-3 max-w-sm">
              <span className="text-xs text-muted-foreground shrink-0">Topo</span>
              <input
                id="cb-position"
                type="range"
                min={0}
                max={100}
                value={data.image_position}
                onChange={(e) => setData((d) => ({ ...d, image_position: Number(e.target.value) }))}
                className="w-full accent-primary"
              />
              <span className="text-xs text-muted-foreground shrink-0">Base</span>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Ao clicar no banner, o aluno é levado para uma página com a lista de parceiros e condições especiais da campanha — configure os parceiros no bloco abaixo.
        </p>

        <div>
          <Label htmlFor="cb-lv-conditions" className="flex items-center gap-1.5">
            <Leaf className="w-3.5 h-3.5" />
            Condições Litoral Verde (opcional)
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5 mb-2">
            Aparece num espaço próprio, em destaque, na página que abre ao clicar no banner — separado da lista de parceiros.
          </p>
          <Textarea
            id="cb-lv-conditions"
            value={data.lv_conditions}
            onChange={(e) => setData((d) => ({ ...d, lv_conditions: e.target.value }))}
            placeholder="Ex.: Reservas feitas até 30/11 garantem tarifa promocional..."
            className="resize-none"
            rows={3}
          />
        </div>

        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={isPending} className="gap-2">
            {isPending ? <Spinner className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
            {isPending ? 'Salvando...' : 'Salvar banner'}
          </Button>
        </div>
      </fieldset>
    </form>
  )
}
