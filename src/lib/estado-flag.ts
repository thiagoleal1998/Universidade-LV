const ESTADO_FILES: Record<string, string> = {
  AC: 'Bandeira_do_Acre.svg',
  AL: 'Bandeira_de_Alagoas.svg',
  AP: 'Bandeira_do_Amapá.svg',
  AM: 'Bandeira_do_Amazonas.svg',
  BA: 'Bandeira_da_Bahia.svg',
  CE: 'Bandeira_do_Ceará.svg',
  DF: 'Bandeira_do_Distrito_Federal_(Brasil).svg',
  ES: 'Bandeira_do_Espírito_Santo.svg',
  GO: 'Bandeira_de_Goiás.svg',
  MA: 'Bandeira_do_Maranhão.svg',
  MT: 'Bandeira_de_Mato_Grosso.svg',
  MS: 'Bandeira_de_Mato_Grosso_do_Sul.svg',
  MG: 'Bandeira_de_Minas_Gerais.svg',
  PA: 'Bandeira_do_Pará.svg',
  PB: 'Bandeira_da_Paraíba.svg',
  PR: 'Bandeira_do_Paraná.svg',
  PE: 'Bandeira_de_Pernambuco.svg',
  PI: 'Bandeira_do_Piauí.svg',
  RN: 'Bandeira_do_Rio_Grande_do_Norte.svg',
  RS: 'Bandeira_do_Rio_Grande_do_Sul.svg',
  RO: 'Bandeira_de_Rondônia.svg',
  RR: 'Bandeira_de_Roraima.svg',
  SC: 'Bandeira_de_Santa_Catarina.svg',
  SP: 'Bandeira_do_estado_de_São_Paulo.svg',
  SE: 'Bandeira_de_Sergipe.svg',
  TO: 'Bandeira_do_Tocantins.svg',
}

// Normaliza removendo acentos e colocando em minúsculas
function norm(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()
}

// Mapeamento de nomes completos de estados (normalizados) → sigla
const NOME_PARA_SIGLA: Record<string, string> = {
  'acre': 'AC',
  'alagoas': 'AL',
  'amapa': 'AP',
  'amazonas': 'AM',
  'bahia': 'BA',
  'ceara': 'CE',
  'distrito federal': 'DF',
  'espirito santo': 'ES',
  'goias': 'GO',
  'maranhao': 'MA',
  'mato grosso do sul': 'MS',
  'mato grosso': 'MT',
  'minas gerais': 'MG',
  'para': 'PA',
  'paraiba': 'PB',
  'parana': 'PR',
  'pernambuco': 'PE',
  'piaui': 'PI',
  'rio grande do norte': 'RN',
  'rio grande do sul': 'RS',
  'rondonia': 'RO',
  'roraima': 'RR',
  'santa catarina': 'SC',
  'sao paulo': 'SP',
  'sergipe': 'SE',
  'tocantins': 'TO',
}

/**
 * Detecta a sigla do estado BR a partir de strings como:
 * "Guarujá, SP" · "Santos-SP" · "Santos / SP" · "SP" · "São Paulo" · "Paraná"
 */
export function detectEstadoBR(text: string): string | null {
  const trimmed = text.trim()
  const n = norm(trimmed)

  // 1. Nome completo do estado — testa os mais longos primeiro (evita "para" colidir com "parana")
  const nomes = Object.keys(NOME_PARA_SIGLA).sort((a, b) => b.length - a.length)
  for (const nome of nomes) {
    if (n === nome || n.endsWith(nome)) {
      return NOME_PARA_SIGLA[nome]
    }
  }

  // 2. Sigla de 2 letras separada por vírgula, traço, barra ou espaço no fim
  //    ex: "Santos, SP" · "Santos-SP" · "Santos/SP" · "Santos SP"
  const m = trimmed.match(/[,\-/\s]\s*([A-Za-z]{2})\s*$/)
  if (m) {
    const sigla = m[1].toUpperCase()
    if (ESTADO_FILES[sigla]) return sigla
  }

  // 3. Apenas a sigla (texto inteiro)
  const upper = trimmed.toUpperCase()
  if (/^[A-Z]{2}$/.test(upper) && ESTADO_FILES[upper]) return upper

  return null
}

/** URL da bandeira do estado via Wikimedia Commons. */
export function estadoFlagUrl(sigla: string): string {
  const file = ESTADO_FILES[sigla.toUpperCase()]
  if (!file) return ''
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}`
}
