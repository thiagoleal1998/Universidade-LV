'use client'

import { useState, useTransition } from 'react'
import { savePodviajar } from '@/app/actions/marketing-settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Headphones, Plus, Trash2, GripVertical } from 'lucide-react'

type Episode = {
  title: string
  description: string
  url: string
  date: string
  cover_url: string
  duration: string
}

type PodviajarData = {
  active: boolean
  title: string
  description: string
  image_url: string
  spotify_url: string
  apple_url: string
  episodes: Episode[]
}

const EMPTY_EPISODE: Episode = { title: '', description: '', url: '', date: '', cover_url: '', duration: '' }

function parse(raw: string): PodviajarData {
  try {
    const p = JSON.parse(raw)
    return {
      active: p.active ?? false,
      title: p.title ?? 'PodViajar',
      description: p.description ?? '',
      image_url: p.image_url ?? '',
      spotify_url: p.spotify_url ?? '',
      apple_url: p.apple_url ?? '',
      episodes: Array.isArray(p.episodes) ? p.episodes : [],
    }
  } catch {
    return { active: false, title: 'PodViajar', description: '', image_url: '', spotify_url: '', apple_url: '', episodes: [] }
  }
}

export function PodviajarManager({ raw }: { raw: string }) {
  const [data, setData] = useState<PodviajarData>(() => parse(raw))
  const [isPending, startTransition] = useTransition()

  function addEpisode() {
    setData((d) => ({ ...d, episodes: [{ ...EMPTY_EPISODE }, ...d.episodes] }))
  }

  function removeEpisode(idx: number) {
    setData((d) => ({ ...d, episodes: d.episodes.filter((_, i) => i !== idx) }))
  }

  function updateEpisode(idx: number, field: keyof Episode, value: string) {
    setData((d) => ({
      ...d,
      episodes: d.episodes.map((ep, i) => i === idx ? { ...ep, [field]: value } : ep),
    }))
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
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Ativar */}
      <div className="bg-card border rounded-xl p-6 flex items-center justify-between">
        <div>
          <p className="font-semibold text-foreground">Exibir PodViajar</p>
          <p className="text-xs text-muted-foreground mt-0.5">Ativa o link no menu lateral e a seção de episódios na home dos membros.</p>
        </div>
        <Switch
          checked={data.active}
          onCheckedChange={(v) => setData((d) => ({ ...d, active: v }))}
        />
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
          <div className="sm:col-span-2">
            <Label className="text-xs text-muted-foreground">URL da imagem de capa</Label>
            <Input
              className="mt-1"
              value={data.image_url}
              onChange={(e) => setData((d) => ({ ...d, image_url: e.target.value }))}
              placeholder="https://..."
              type="url"
            />
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
            <Label className="text-xs text-muted-foreground">Link no Apple Podcasts</Label>
            <Input
              className="mt-1"
              value={data.apple_url}
              onChange={(e) => setData((d) => ({ ...d, apple_url: e.target.value }))}
              placeholder="https://podcasts.apple.com/..."
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
              <button
                type="button"
                onClick={() => removeEpisode(idx)}
                className="text-muted-foreground hover:text-red-500 transition-colors p-1 rounded"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
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
              <div>
                <Label className="text-xs text-muted-foreground">Link do episódio (Spotify, YouTube…)</Label>
                <Input
                  className="mt-1"
                  value={ep.url}
                  onChange={(e) => updateEpisode(idx, 'url', e.target.value)}
                  placeholder="https://..."
                  type="url"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">URL da capa do episódio</Label>
                <Input
                  className="mt-1"
                  value={ep.cover_url}
                  onChange={(e) => updateEpisode(idx, 'cover_url', e.target.value)}
                  placeholder="https://..."
                  type="url"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Data de publicação</Label>
                <Input
                  className="mt-1"
                  value={ep.date}
                  onChange={(e) => updateEpisode(idx, 'date', e.target.value)}
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
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Salvando...' : 'Salvar PodViajar'}
        </Button>
      </div>
    </form>
  )
}
