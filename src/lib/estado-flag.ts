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

/** Extrai a sigla do estado de strings como "Guarujá, SP" ou "SP". */
export function detectEstadoBR(text: string): string | null {
  const m = text.match(/,\s*([A-Za-z]{2})\s*$/) ?? text.match(/^\s*([A-Za-z]{2})\s*$/)
  if (!m) return null
  const sigla = m[1].toUpperCase()
  return ESTADO_FILES[sigla] ? sigla : null
}

/** URL da bandeira do estado via Wikimedia Commons. */
export function estadoFlagUrl(sigla: string): string {
  const file = ESTADO_FILES[sigla.toUpperCase()]
  if (!file) return ''
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}`
}
