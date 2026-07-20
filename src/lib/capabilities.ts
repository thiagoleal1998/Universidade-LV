// Capacidades que uma área de colaborador pode ter. O enum é fixo em código;
// as ÁREAS (e quais capacidades cada uma tem) são configuráveis pelo admin em
// Admin → Membros → Áreas de Colaborador (tabela collaborator_areas).
// Client-safe: sem imports de servidor.

export const CAPABILITIES = ['courses', 'trainings', 'marketing', 'comercial', 'aereo', 'famtours', 'grupos'] as const
export type Capability = (typeof CAPABILITIES)[number]

export const CAPABILITY_LABELS: Record<Capability, string> = {
  courses: 'Cursos',
  trainings: 'Treinamentos',
  marketing: 'Marketing',
  comercial: 'Condições Comerciais',
  aereo: 'Bloqueios Aéreos',
  famtours: 'Famtours',
  grupos: 'Grupos',
}

// Sidebar admin: href → capacidades que liberam o item para colaborador.
// Hrefs ausentes daqui são admin-only.
export const NAV_CAPABILITIES: Record<string, Capability[]> = {
  '/admin/cursos': ['courses'],
  '/admin/marketing': ['trainings', 'marketing', 'comercial', 'aereo', 'famtours', 'grupos'],
}

export const MARKETING_CAPABILITIES: Capability[] = ['trainings', 'marketing', 'comercial', 'aereo', 'famtours', 'grupos']

// Categoria de marketing_items → capacidade exigida para mexer nela.
// Premiação/PodViajar gravam settings globais e ficam admin-only (não mapeiam
// para capacidade nenhuma de colaborador).
export function capabilityForMarketingCategory(category: string): Capability {
  if (category === 'aereo') return 'aereo'
  if (category === 'comercial') return 'comercial'
  return 'marketing'
}
