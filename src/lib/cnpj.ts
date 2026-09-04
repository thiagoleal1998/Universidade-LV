// Máscara/validação de CNPJ — client-safe (sem 'use server'), usado tanto no
// formulário de cadastro quanto na edição de perfil. Validação é só de
// FORMATO (14 dígitos), não o algoritmo oficial de dígito verificador — o
// admin já revisa o cadastro manualmente antes de aprovar, então o objetivo
// aqui é só pegar erro de digitação óbvio (dígito faltando/sobrando), não
// certificar que o CNPJ existe de verdade.

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

// Formata progressivamente enquanto o usuário digita (00.000.000/0000-00) —
// funciona também com colagem de um CNPJ já formatado (só re-mascara).
export function formatCnpj(value: string): string {
  const digits = onlyDigits(value).slice(0, 14)
  let out = digits
  if (digits.length > 2) out = `${digits.slice(0, 2)}.${digits.slice(2)}`
  if (digits.length > 5) out = `${out.slice(0, 6)}.${digits.slice(5)}`
  if (digits.length > 8) out = `${out.slice(0, 10)}/${digits.slice(8)}`
  if (digits.length > 12) out = `${out.slice(0, 15)}-${digits.slice(12)}`
  return out
}

export function isValidCnpjFormat(value: string): boolean {
  return onlyDigits(value).length === 14
}
