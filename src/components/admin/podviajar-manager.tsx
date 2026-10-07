'use client'

import { useState, useTransition, useRef } from 'react'
import { savePodviajar } from '@/app/actions/marketing-settings'
import { uploadMarketingFile, fetchYoutubeEpisodeMetadata } from '@/app/actions/marketing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SimpleDatePicker } from '@/components/ui/simple-date-picker'
import { toast } from 'sonner'
import { Headphones, Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Upload, X, SquarePlay, Loader2, Lock, ImageIcon, ChevronLeft, ChevronRight, Video } from 'lucide-react'

type Episode = {
  title: string
  description: string
  url: string
  date: string
  cover_url: string
  duration: string
  // Bastidores — fotos e vídeos extras do episódio, independentes do vídeo
  // principal (`url`). Mesmo conceito já usado em Famtour/Evento
  // (`TripGallery`/`TripVideo`), mas aqui tudo vive dentro do MESMO blob
  // JSON do episódio (sem tabela filha nem migração): a foto enviada já
  // vira uma URL, e a ordem/remoção é só estado local até o "Salvar
  // PodViajar" de sempre persistir o episódio inteiro de uma vez.
  photos: string[]
  video_urls: string[]
}

type PodviajarData = {
  active: boolean
  title: string
  description: string
  image_url: string
  spotify_url: string
  youtube_url: string
  episodes: Episode[]
}

const EMPTY_EPISODE: Episode = { title: '', description: '', url: '', date: '', cover_url: '', duration: '', photos: [], video_urls: [] }

function parse(raw: string): PodviajarData {
  try {
    const p = JSON.parse(raw)
    return {
      active: p.active ?? false,
      title: p.title ?? 'PodViajar',
      description: p.description ?? '',
      image_url: p.image_url ?? '',
      spotify_url: p.spotify_url ?? '',
      youtube_url: p.youtube_url ?? '',
      episodes: Array.isArray(p.episodes)
        ? p.episodes.map((ep: Partial<Episode>) => ({
            ...ep,
            photos: Array.isArray(ep.photos) ? ep.photos : [],
            video_urls: Array.isArray(ep.video_urls) ? ep.video_urls : [],
          }))
        : [],
    }
  } catch {
    return { active: false, title: 'PodViajar', description: '', image_url: '', spotify_url: '', youtube_url: '', episodes: [] }
  }
}

export function PodviajarManager({ raw, canEdit = true }: { raw: string; canEdit?: boolean }) {
  const [data, setData] = useState<PodviajarData>(() => parse(raw))
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const [fetchingIdx, setFetchingIdx] = useState<number | null>(null)
  const [photoUpload, setPhotoUpload] = useState<{ epIdx: number; done: number; total: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleImageUpload(file: File) {
    setIsUploading(true)
    const result = await uploadMarketingFile(file, 'image')
    setIsUploading(false)
    if (result.error) {
      toast.error(result.error)
    } else if (result.url) {
      setData((d) => ({ ...d, image_url: result.url! }))
      toast.success('Imagem enviada!')
    }
  }

  function addEpisode() {
    setData((d) => ({ ...d, episodes: [{ ...EMPTY_EPISODE }, ...d.episodes] }))
  }

  function removeEpisode(idx: number) {
    setData((d) => ({ ...d, episodes: d.episodes.filter((_, i) => i !== idx) }))
  }

  function moveEpisode(idx: number, dir: 1 | -1) {
    setData((d) => {
      const next = [...d.episodes]
      ;[next[idx], next[idx + dir]] = [next[idx + dir], next[idx]]
      return { ...d, episodes: next }
    })
  }

  function updateEpisode(idx: number, field: keyof Episode, value: string) {
    setData((d) => ({
      ...d,
      episodes: d.episodes.map((ep, i) => i === idx ? { ...ep, [field]: value } : ep),
    }))
  }

  // Vídeos de bastidores — mesma lista dinâmica já usada em Famtour/Evento
  // (`video_urls`), só que escopada ao episódio pelo índice.
  function addEpisodeVideoUrl(idx: number) {
    setData((d) => ({
      ...d,
      episodes: d.episodes.map((ep, i) => i === idx ? { ...ep, video_urls: [...ep.video_urls, ''] } : ep),
    }))
  }

  function updateEpisodeVideoUrl(idx: number, videoIdx: number, value: string) {
    setData((d) => ({
      ...d,
      episodes: d.episodes.map((ep, i) => i === idx
        ? { ...ep, video_urls: ep.video_urls.map((v, vi) => vi === videoIdx ? value : v) }
        : ep),
    }))
  }

  function removeEpisodeVideoUrl(idx: number, videoIdx: number) {
    setData((d) => ({
      ...d,
      episodes: d.episodes.map((ep, i) => i === idx
        ? { ...ep, video_urls: ep.video_urls.filter((_, vi) => vi !== videoIdx) }
        : ep),
    }))
  }

  // Fotos de bastidores — sem tabela filha, então remover/reordenar é só
  // mexer no array local (persiste junto com o resto do episódio no
  // "Salvar PodViajar"). Upload em lote é sequencial (nunca Promise.all —
  // várias Server Actions juntas nunca resolvem no cliente nesta versão do
  // Next, bug já documentado no projeto).
  async function handleEpisodePhotosUpload(idx: number, files: File[]) {
    const oversized = files.filter((f) => f.size > 8 * 1024 * 1024)
    if (oversized.length > 0) {
      toast.error(`${oversized.length === files.length ? 'Imagem' : `${oversized.length} imagem(ns)`} muito grande (máx. 8MB) — escolha fotos menores.`)
      return
    }
    setPhotoUpload({ epIdx: idx, done: 0, total: files.length })
    const uploaded: string[] = []
    for (const file of files) {
      try {
        const result = await uploadMarketingFile(file, 'image')
        if (result.error) toast.error(result.error)
        else if (result.url) uploaded.push(result.url)
      } catch {
        toast.error('Não foi possível enviar uma das fotos. Tente novamente com uma imagem menor.')
      }
      setPhotoUpload((p) => p ? { ...p, done: p.done + 1 } : null)
    }
    if (uploaded.length > 0) {
      setData((d) => ({
        ...d,
        episodes: d.episodes.map((ep, i) => i === idx ? { ...ep, photos: [...ep.photos, ...uploaded] } : ep),
      }))
      toast.success(uploaded.length === 1 ? 'Foto adicionada!' : `${uploaded.length} fotos adicionadas!`)
    }
    setPhotoUpload(null)
  }

  function removeEpisodePhoto(idx: number, photoIdx: number) {
    setData((d) => ({
      ...d,
      episodes: d.episodes.map((ep, i) => i === idx
        ? { ...ep, photos: ep.photos.filter((_, pi) => pi !== photoIdx) }
        : ep),
    }))
  }

  function moveEpisodePhoto(idx: number, photoIdx: number, dir: -1 | 1) {
    const target = photoIdx + dir
    setData((d) => {
      const ep = d.episodes[idx]
      if (target < 0 || target >= ep.photos.length) return d
      const photos = [...ep.photos]
      ;[photos[photoIdx], photos[target]] = [photos[target], photos[photoIdx]]
      return { ...d, episodes: d.episodes.map((e, i) => i === idx ? { ...e, photos } : e) }
    })
  }

  async function handleFetchFromYoutube(idx: number) {
    const url = data.episodes[idx].url
    if (!url.trim()) {
      toast.error('Cole o link do episódio no YouTube antes de buscar.')
      return
    }
    setFetchingIdx(idx)
    const result = await fetchYoutubeEpisodeMetadata(url)
    setFetchingIdx(null)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    setData((d) => ({
      ...d,
      episodes: d.episodes.map((ep, i) => i === idx ? {
        ...ep,
        title: result.data.title || ep.title,
        description: result.data.description || ep.description,
        cover_url: result.data.cover_url || ep.cover_url,
      } : ep),
    }))
    toast.success('Dados preenchidos a partir do YouTube!')
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData()
    fd.set('podviajar', JSON.stringify(data))
    startTransition(async () => {
      const r = await savePodviajar(fd)
      if (r?.error) toast.error(r.error)
      else toast.success('PodViajar salvo!')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
    {!canEdit && (
      <div className="flex items-center gap-2.5 mb-4 px-4 py-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-sm text-amber-800 dark:text-amber-300">
        <Lock className="w-4 h-4 shrink-0" />
        Sua área não tem permissão para alterar o PodViajar — fale com um admin.
      </div>
    )}
    <fieldset disabled={!canEdit} className="space-y-6 border-0 p-0 m-0">
      {/* Ativar */}
      <div className="bg-card border rounded-xl p-6 flex items-center justify-between">
        <div>
          <p className="font-semibold text-foreground">Exibir PodViajar</p>
          <p className="text-xs text-muted-foreground mt-0.5">Ativa o link no menu lateral e a seção de episódios na home dos membros.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={data.active}
          onClick={() => setData((d) => ({ ...d, active: !d.active }))}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${data.active ? 'bg-primary' : 'bg-input'}`}
        >
          <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${data.active ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      {/* Informações gerais */}
      <div className="bg-card border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Headphones className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Informações do podcast</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Nome do podcast</Label>
            <Input
              className="mt-1"
              value={data.title}
              onChange={(e) => setData((d) => ({ ...d, title: e.target.value }))}
              placeholder="PodViajar"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Descrição</Label>
            <Textarea
              className="mt-1"
              value={data.description}
              onChange={(e) => setData((d) => ({ ...d, description: e.target.value }))}
              rows={3}
              placeholder="O podcast sobre turismo e viagens para agentes de viagem."
            />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label className="text-xs text-muted-foreground">Imagem de capa do podcast</Label>

            {/* Preview */}
            {data.image_url && (
              <div className="relative w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.image_url}
                  alt="Capa do podcast"
                  className="h-32 w-32 rounded-xl object-contain bg-muted/30 border"
                />
                <button
                  type="button"
                  onClick={() => setData((d) => ({ ...d, image_url: '' }))}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
                  title="Remover imagem"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Botão de upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImageUpload(file)
                e.target.value = ''
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="w-3.5 h-3.5" />
              {isUploading ? 'Enviando...' : data.image_url ? 'Trocar imagem' : 'Fazer upload da imagem'}
            </Button>

            {/* URL manual como alternativa */}
            <div>
              <Label className="text-xs text-muted-foreground">Ou cole uma URL</Label>
              <Input
                className="mt-1"
                value={data.image_url}
                onChange={(e) => setData((d) => ({ ...d, image_url: e.target.value }))}
                placeholder="https://..."
                type="url"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Link no Spotify</Label>
            <Input
              className="mt-1"
              value={data.spotify_url}
              onChange={(e) => setData((d) => ({ ...d, spotify_url: e.target.value }))}
              placeholder="https://open.spotify.com/..."
              type="url"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Link no YouTube Podcast</Label>
            <Input
              className="mt-1"
              value={data.youtube_url}
              onChange={(e) => setData((d) => ({ ...d, youtube_url: e.target.value }))}
              placeholder="https://youtube.com/..."
              type="url"
            />
          </div>
        </div>
      </div>

      {/* Episódios */}
      <div className="bg-card border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Episódios</h3>
            <span className="text-xs text-muted-foreground">({data.episodes.length})</span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addEpisode}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Novo episódio
          </Button>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Os 3 primeiros episódios aparecem na home. Adicione o mais recente primeiro.
        </p>

        {data.episodes.length === 0 && (
          <div className="border border-dashed rounded-xl p-8 text-center text-sm text-muted-foreground">
            Nenhum episódio cadastrado ainda.
          </div>
        )}

        {data.episodes.map((ep, idx) => (
          <div key={idx} className="border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Episódio #{idx + 1}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveEpisode(idx, -1)}
                  disabled={idx === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors p-1 rounded"
                  title="Mover para cima"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveEpisode(idx, 1)}
                  disabled={idx === data.episodes.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors p-1 rounded"
                  title="Mover para baixo"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeEpisode(idx)}
                  className="text-muted-foreground hover:text-red-500 transition-colors p-1 rounded"
                  title="Remover episódio"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Link do episódio (Spotify, YouTube…)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={ep.url}
                    onChange={(e) => updateEpisode(idx, 'url', e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    type="url"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={fetchingIdx === idx}
                    onClick={() => handleFetchFromYoutube(idx)}
                    className="gap-1.5 shrink-0"
                  >
                    {fetchingIdx === idx
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <SquarePlay className="w-3.5 h-3.5" />}
                    Buscar do YouTube
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Se o link for do YouTube, preenche automaticamente título, descrição e capa abaixo.
                </p>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Título</Label>
                <Input
                  className="mt-1"
                  value={ep.title}
                  onChange={(e) => updateEpisode(idx, 'title', e.target.value)}
                  placeholder="Título do episódio"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Descrição curta</Label>
                <Textarea
                  className="mt-1"
                  value={ep.description}
                  onChange={(e) => updateEpisode(idx, 'description', e.target.value)}
                  rows={2}
                  placeholder="Resumo do episódio..."
                />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label className="text-xs text-muted-foreground">URL da capa do episódio</Label>
                {ep.cover_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ep.cover_url}
                    alt="Capa do episódio"
                    className="h-20 w-36 rounded-lg object-cover bg-muted/30 border"
                  />
                )}
                <Input
                  value={ep.cover_url}
                  onChange={(e) => updateEpisode(idx, 'cover_url', e.target.value)}
                  placeholder="https://..."
                  type="url"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Data de publicação</Label>
                <SimpleDatePicker
                  className="mt-1"
                  value={ep.date}
                  onChange={(v) => updateEpisode(idx, 'date', v)}
                  placeholder="27 Jun 2026"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Duração (opcional)</Label>
                <Input
                  className="mt-1"
                  value={ep.duration}
                  onChange={(e) => updateEpisode(idx, 'duration', e.target.value)}
                  placeholder="42 min"
                />
              </div>
            </div>

            {/* Vídeos de bastidores — mesmo padrão de Famtour/Evento
                (YouTube/Vimeo/Instagram), independente do vídeo principal
                do episódio acima. */}
            <div className="border-t border-border pt-3 space-y-2">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Video className="w-3.5 h-3.5" /> Vídeos de bastidores (YouTube, Instagram, Vimeo...)
              </Label>
              {ep.video_urls.map((url, vIdx) => (
                <div key={vIdx} className="flex items-center gap-2">
                  <Input
                    type="url"
                    value={url}
                    onChange={(e) => updateEpisodeVideoUrl(idx, vIdx, e.target.value)}
                    placeholder="https://..."
                    className="flex-1"
                  />
                  <button type="button" onClick={() => removeEpisodeVideoUrl(idx, vIdx)} className="text-muted-foreground hover:text-red-500 transition-colors p-1.5 shrink-0" title="Remover">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => addEpisodeVideoUrl(idx)} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Adicionar vídeo
              </Button>
            </div>

            {/* Fotos de bastidores — upload em lote, reorder por setas,
                sem tabela filha (ver comentário de `handleEpisodePhotosUpload`). */}
            <div className="border-t border-border pt-3 space-y-2">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ImageIcon className="w-3.5 h-3.5" /> Fotos de bastidores
              </Label>
              {ep.photos.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {ep.photos.map((url, pIdx) => (
                    <div key={pIdx} className="relative group rounded-lg overflow-hidden border border-border bg-muted/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="Foto de bastidores" className="w-full aspect-square object-cover" />
                      {ep.photos.length > 1 && (
                        <div className="absolute top-1 left-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button type="button" onClick={() => moveEpisodePhoto(idx, pIdx, -1)} disabled={pIdx === 0} className="p-1 rounded-full bg-black/60 text-white hover:bg-black/80 disabled:opacity-30 disabled:pointer-events-none" title="Mover para trás">
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => moveEpisodePhoto(idx, pIdx, 1)} disabled={pIdx === ep.photos.length - 1} className="p-1 rounded-full bg-black/60 text-white hover:bg-black/80 disabled:opacity-30 disabled:pointer-events-none" title="Mover para frente">
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <button type="button" onClick={() => removeEpisodePhoto(idx, pIdx)} className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Excluir foto">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="hidden"
                id={`ep-photos-${idx}`}
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? [])
                  e.target.value = ''
                  if (files.length > 0) handleEpisodePhotosUpload(idx, files)
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!!photoUpload}
                onClick={() => document.getElementById(`ep-photos-${idx}`)?.click()}
                className="gap-1.5"
              >
                {photoUpload?.epIdx === idx ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {photoUpload?.epIdx === idx ? `Enviando ${photoUpload.done + 1} de ${photoUpload.total}...` : 'Adicionar fotos'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Salvando...' : 'Salvar PodViajar'}
        </Button>
      </div>
    </fieldset>
    </form>
  )
}
