// Helpers do formato "Manual interativo" (segundo layout de curso — ver
// docs/historico-tecnico.md). Módulo neutro, sem 'use server': um arquivo
// 'use server' só pode exportar função async, e COURSE_LAYOUTS é uma
// constante consumida tanto por Server Components quanto por Client
// Components (mesmo motivo de src/lib/comments.ts).

export type CourseLayout = 'padrao' | 'manual'

export const COURSE_LAYOUTS: { value: CourseLayout; label: string; hint: string }[] = [
  {
    value: 'padrao',
    label: 'Aulas (padrão)',
    hint: 'Cada aula é uma página própria, com vídeo, anotações e navegação entre aulas.',
  },
  {
    value: 'manual',
    label: 'Manual interativo',
    hint: 'O módulo inteiro vira uma página de leitura contínua, com menu lateral e busca. Cada aula vira uma seção.',
  },
]

// Âncora estável de cada seção do manual — usa o id da aula (não o título,
// que pode mudar ou se repetir) e é a mesma chave usada pelo redirect de
// /dashboard/aulas/[id] para um curso manual.
export function manualSectionId(lessonId: string): string {
  return `aula-${lessonId}`
}

export function manualHref(moduleId: string, lessonId?: string): string {
  return lessonId ? `/dashboard/modulos/${moduleId}?aula=${lessonId}` : `/dashboard/modulos/${moduleId}`
}

// Mesma lógica de `stripHtml` em study-interface.tsx — extraído aqui pra
// poder rodar no servidor (índice de busca pré-computado, ver ModuleManual)
// sem duplicar a regex nos dois lugares.
export function stripHtmlToText(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim()
}

// Busca sem acento é obrigatória em pt-BR ("comissao" precisa achar "comissão").
export function normalizeSearch(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}
