// "CLV-0001" — Chamado Litoral Verde. Sempre 4 dígitos no mínimo; números
// maiores (a partir de CLV-10000) simplesmente não truncam.
export function formatTicketNumber(n: number): string {
  return `CLV-${String(n).padStart(4, '0')}`
}
