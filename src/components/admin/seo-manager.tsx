'use client'

import { useState, useTransition } from 'react'
import { saveSeoSettings } from '@/app/actions/seo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Search, Globe, Share2, Bot, CheckCircle2, ExternalLink, Zap, Sparkles } from 'lucide-react'

type Props = {
  seoTitle: string
  seoDescription: string
  seoKeywords: string
  seoOgImage: string
  seoCanonicalUrl: string
  seoGoogleVerification: string
  seoRobots: string
  seoAuthor: string
  siteName: string
  aeoFeaturedSnippet: string
  aeoFaq: string
  geoBusinessDescription: string
  geoTargetAudience: string
  geoKeyFacts: string
}

function SectionCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  )
}

export function SeoManager({
  seoTitle,
  seoDescription,
  seoKeywords,
  seoOgImage,
  seoCanonicalUrl,
  seoGoogleVerification,
  seoRobots,
  seoAuthor,
  siteName,
  aeoFeaturedSnippet,
  aeoFaq,
  geoBusinessDescription,
  geoTargetAudience,
  geoKeyFacts,
}: Props) {
  const [title, setTitle]         = useState(seoTitle)
  const [description, setDesc]    = useState(seoDescription)
  const [isPending, startTransition] = useTransition()

  const titleLen = title.length
  const descLen  = description.length

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const r = await saveSeoSettings(fd)
      if (r?.error) toast.error(r.error)
      else toast.success('Configurações de SEO salvas!')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Google Preview */}
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Prévia no Google</h3>
        </div>
        <div className="border rounded-lg p-4 bg-background font-sans">
          <p className="text-xs text-muted-foreground mb-1">{seoCanonicalUrl || 'https://seusite.com.br'}</p>
          <p className="text-[#1a0dab] dark:text-[#8ab4f8] text-lg font-medium leading-tight hover:underline cursor-pointer line-clamp-1">
            {title || siteName}
          </p>
          <p className="text-sm text-[#4d5156] dark:text-[#bdc1c6] mt-1 line-clamp-2">
            {description || 'Nenhuma descrição configurada.'}
          </p>
        </div>
        <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
          <span className={titleLen > 60 ? 'text-red-500' : titleLen > 50 ? 'text-yellow-500' : 'text-green-600'}>
            Título: {titleLen}/60 chars
          </span>
          <span className={descLen > 160 ? 'text-red-500' : descLen > 140 ? 'text-yellow-500' : 'text-green-600'}>
            Descrição: {descLen}/160 chars
          </span>
        </div>
      </div>

      {/* Básico */}
      <SectionCard icon={Search} title="Informações Básicas">
        <Field label="Título do site (SEO)" hint="Ideal: 50–60 caracteres. Aparece na aba do navegador e resultados do Google.">
          <Input
            name="seo_title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={siteName}
            maxLength={80}
          />
        </Field>
        <Field label="Meta description" hint="Ideal: 140–160 caracteres. Aparece sob o título nos resultados de busca.">
          <Textarea
            name="seo_description"
            value={description}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Descreva o que os visitantes encontrarão no site..."
            rows={3}
            maxLength={200}
          />
        </Field>
        <Field label="Palavras-chave" hint="Separadas por vírgula. Auxiliam motores de busca a categorizar o conteúdo.">
          <Input
            name="seo_keywords"
            defaultValue={seoKeywords}
            placeholder="cursos online, agentes de viagem, turismo..."
          />
        </Field>
        <Field label="Autor / Nome da organização">
          <Input
            name="seo_author"
            defaultValue={seoAuthor}
            placeholder="Universidade LV"
          />
        </Field>
      </SectionCard>

      {/* Open Graph / Redes Sociais */}
      <SectionCard icon={Share2} title="Open Graph (Redes Sociais)">
        <Field
          label="Imagem de compartilhamento (OG Image)"
          hint="URL de uma imagem 1200×630px. Aparece ao compartilhar o link no WhatsApp, Facebook, LinkedIn etc."
        >
          <Input
            name="seo_og_image"
            defaultValue={seoOgImage}
            placeholder="https://seusite.com.br/og-image.jpg"
            type="url"
          />
        </Field>
        {seoOgImage && (
          <div className="rounded-lg overflow-hidden border aspect-video max-w-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={seoOgImage} alt="OG Preview" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-1">
          <p className="font-medium text-foreground text-xs">Dicas para a imagem OG:</p>
          <ul className="text-xs space-y-0.5 list-disc list-inside">
            <li>Dimensão recomendada: 1200 × 630 pixels</li>
            <li>Formato: JPG ou PNG (menos de 1 MB)</li>
            <li>Inclua o logo e nome do site</li>
            <li>Evite texto pequeno — pode ficar ilegível em miniatura</li>
          </ul>
        </div>
      </SectionCard>

      {/* URLs e Canonical */}
      <SectionCard icon={Globe} title="URLs e Indexação">
        <Field
          label="URL canônica do site"
          hint="URL base sem barra no final. Ex: https://universidadelv.com.br — usada no sitemap.xml e nas tags canonical."
        >
          <Input
            name="seo_canonical_url"
            defaultValue={seoCanonicalUrl}
            placeholder="https://universidadelv.com.br"
            type="url"
          />
        </Field>
        <Field label="Indexação (robots)">
          <div className="flex gap-3">
            {(['index,follow', 'noindex,nofollow'] as const).map((val) => (
              <label key={val} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="seo_robots"
                  value={val}
                  defaultChecked={seoRobots === val}
                  className="accent-primary"
                />
                <span className="text-sm text-foreground">
                  {val === 'index,follow' ? 'Indexar (recomendado)' : 'Não indexar (oculto do Google)'}
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            "Não indexar" é útil durante desenvolvimento. Em produção, mantenha "Indexar".
          </p>
        </Field>
        <div className="flex gap-3">
          <a
            href={`${seoCanonicalUrl || '#'}/sitemap.xml`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            Ver sitemap.xml
          </a>
          <a
            href={`${seoCanonicalUrl || '#'}/robots.txt`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            Ver robots.txt
          </a>
        </div>
      </SectionCard>

      {/* Google Search Console */}
      <SectionCard icon={CheckCircle2} title="Verificação — Google Search Console">
        <Field
          label="Código de verificação do Google"
          hint='Cole apenas o valor do atributo content. Ex: se o Google gerar <meta name="google-site-verification" content="ABC123"/>, cole somente "ABC123".'
        >
          <Input
            name="seo_google_verification"
            defaultValue={seoGoogleVerification}
            placeholder="ABC123xyz..."
          />
        </Field>
        <div className="bg-muted/50 rounded-lg p-4 text-xs text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">Como verificar o Google Search Console:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Acesse <span className="font-mono">search.google.com/search-console</span></li>
            <li>Clique em "Adicionar propriedade" e informe a URL do seu site</li>
            <li>Escolha o método "Tag HTML" e copie o valor do atributo <span className="font-mono">content</span></li>
            <li>Cole o valor acima e salve</li>
            <li>Clique em "Verificar" no Google Search Console</li>
          </ol>
        </div>
      </SectionCard>

      {/* IA / LLMs — info */}
      <SectionCard icon={Bot} title="Otimização para IAs (ChatGPT, Perplexity, Gemini)">
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Motores de IA usam os mesmos sinais do Google: <strong className="text-foreground">title, description e dados estruturados (JSON-LD)</strong>.
            Preencher bem as informações acima já otimiza o site para IAs.
          </p>
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="font-medium text-foreground text-xs">Checklist de otimização para IA:</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li>Título claro e descritivo com o nome da organização</li>
              <li>Meta description com proposta de valor explícita</li>
              <li>Palavras-chave relevantes do setor de turismo/viagens</li>
              <li>URL canônica configurada (necessária para o JSON-LD)</li>
              <li>Imagem OG — IAs multimodais como Gemini usam imagens</li>
            </ul>
          </div>
          <p className="text-xs">
            O site já inclui <strong className="text-foreground">JSON-LD</strong> com schema <span className="font-mono">EducationalOrganization</span> — formato preferido pelo Google e lido por IAs para entender o contexto do site.
          </p>
        </div>
      </SectionCard>

      {/* AEO — Answer Engine Optimization */}
      <SectionCard icon={Zap} title="AEO — Otimização para Motores de Resposta">
        <p className="text-xs text-muted-foreground -mt-2 mb-2">
          AEO (<em>Answer Engine Optimization</em>) prepara o site para aparecer como resposta direta em buscadores como Google SGE e Bing Copilot.
        </p>
        <Field
          label="Parágrafo de resposta direta (Featured Snippet)"
          hint="Escreva 2–3 frases respondendo objetivamente: 'O que é a Universidade LV?'. O Google costuma exibir esse parágrafo como caixa de destaque."
        >
          <Textarea
            name="aeo_featured_snippet"
            defaultValue={aeoFeaturedSnippet}
            rows={3}
            placeholder="A Universidade LV é uma plataforma exclusiva de capacitação para agentes de viagem, oferecendo cursos, treinamentos ao vivo, certificados e comunidade especializada no setor de turismo."
          />
        </Field>
        <Field
          label="FAQ para AEO (uma pergunta e resposta por linha, separadas por ›)"
          hint="Formato: Pergunta › Resposta. Cada par em uma linha. Esses dados alimentam o schema FAQ/JSON-LD e aumentam as chances de aparecer nos resultados expandidos."
        >
          <Textarea
            name="aeo_faq"
            defaultValue={aeoFaq}
            rows={6}
            placeholder={`Quem pode usar a Universidade LV? › Agentes de viagem e consultores de turismo cadastrados na plataforma.\nOs cursos têm certificado? › Sim, todos os cursos emitem certificado digital no nome do agente.\nPosso assistir os treinamentos depois? › Sim, todos os replays ficam disponíveis 24h na plataforma.`}
            className="font-mono text-xs"
          />
        </Field>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-400">
          <strong>Dica:</strong> Perguntas curtas e objetivas têm mais chance de virar Featured Snippet. Use perguntas reais que agentes fazem.
        </div>
      </SectionCard>

      {/* GEO — Generative Engine Optimization */}
      <SectionCard icon={Sparkles} title="GEO — Otimização para IA Generativa">
        <p className="text-xs text-muted-foreground -mt-2 mb-2">
          GEO (<em>Generative Engine Optimization</em>) controla como ChatGPT, Gemini, Claude e Perplexity descrevem e recomendam seu negócio quando alguém pergunta sobre capacitação de agentes de viagem.
        </p>
        <Field
          label="Descrição do negócio para IAs"
          hint="Texto conciso e factual. Escreva como se estivesse fornecendo contexto a uma IA: quem você é, o que faz, para quem. Evite adjetivos vazios — prefira dados concretos."
        >
          <Textarea
            name="geo_business_description"
            defaultValue={geoBusinessDescription}
            rows={4}
            placeholder="A Universidade LV é a plataforma de capacitação da Litoral Verde Operadora de Viagens, direcionada exclusivamente a agentes de viagem no Brasil. Oferece cursos on-demand, treinamentos ao vivo semanais, certificados digitais e comunidade profissional. Fundada com o objetivo de qualificar profissionais do turismo."
          />
        </Field>
        <Field
          label="Público-alvo"
          hint="Defina com precisão. As IAs usam isso para recomendar sua plataforma a quem realmente se beneficia."
        >
          <Input
            name="geo_target_audience"
            defaultValue={geoTargetAudience}
            placeholder="Agentes de viagem, consultores de turismo e profissionais do setor travel no Brasil"
          />
        </Field>
        <Field
          label="Fatos-chave (um por linha)"
          hint="Dados objetivos e verificáveis que IAs podem citar: números, diferenciais, certificações, parceiros. Evite superlatives sem respaldo."
        >
          <Textarea
            name="geo_key_facts"
            defaultValue={geoKeyFacts}
            rows={5}
            placeholder={`Plataforma exclusiva para agentes de viagem credenciados\nTreinamentos ao vivo toda semana com especialistas da Litoral Verde\nMais de 200 treinamentos realizados\nCertificados digitais emitidos após conclusão de cada curso\nComunidade TamoJunto LV com agentes de todo o Brasil`}
            className="font-mono text-xs"
          />
        </Field>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-400">
          <strong>Como funciona:</strong> Essas informações são incorporadas ao JSON-LD do site. Quando uma IA rastreia o conteúdo, ela encontra dados estruturados e confiáveis sobre o negócio — aumentando a chance de ser citada com precisão.
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending} size="lg">
          {isPending ? 'Salvando...' : 'Salvar configurações de SEO'}
        </Button>
      </div>
    </form>
  )
}
