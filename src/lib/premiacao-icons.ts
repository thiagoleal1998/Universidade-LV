import {
  Car, Bus, Plane, Bed, Ship, Compass, Utensils, Coffee,
  Sparkles, Ticket, Wallet, Shield, Package, Gift, Trophy,
  Landmark, Building2, Star,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const ICON_MAP: { kws: string[]; icon: LucideIcon }[] = [
  { kws: ['transfer', 'traslado', 'translado', 'carro', 'van', 'motorista', 'taxi', 'uber'], icon: Car },
  { kws: ['onibus', 'bus', 'coach', 'rodoviario'], icon: Bus },
  { kws: ['voo', 'passagem', 'aereo', 'aerea', 'ticket aereo', 'bilhete aereo', 'fly'], icon: Plane },
  { kws: ['hotel', 'resort', 'pousada', 'suite', 'quarto', 'acomodacao', 'hospedagem', 'diaria', 'noite'], icon: Bed },
  { kws: ['cruzeiro', 'navio', 'barco', 'ship', 'marina'], icon: Ship },
  { kws: ['passeio', 'tour', 'excursao', 'city tour', 'visita', 'aventura', 'trilha', 'rafting', 'safari'], icon: Compass },
  { kws: ['jantar', 'almoco', 'refeicao', 'restaurante', 'gastronomia', 'degustacao', 'buffet'], icon: Utensils },
  { kws: ['cafe', 'cafe da manha', 'breakfast', 'lanche'], icon: Coffee },
  { kws: ['spa', 'massagem', 'tratamento', 'bem estar', 'relaxamento', 'estetica', 'beleza'], icon: Sparkles },
  { kws: ['ingresso', 'show', 'evento', 'espetaculo', 'teatro', 'parque', 'atracao', 'bilhete'], icon: Ticket },
  { kws: ['dinheiro', 'voucher', 'credito', 'cash', 'valor', 'verba', 'cartao', 'bonus'], icon: Wallet },
  { kws: ['seguro', 'assistencia', 'cobertura'], icon: Shield },
  { kws: ['bagagem', 'mala', 'franquia'], icon: Package },
  { kws: ['presente', 'brinde', 'kit', 'mimo', 'lembranca'], icon: Gift },
  { kws: ['trofeu', 'placa', 'honraria', 'destaque'], icon: Trophy },
  { kws: ['museu', 'cultural', 'cultura', 'galeria', 'patrimonio'], icon: Landmark },
  { kws: ['predio', 'edificio', 'centro', 'headquarter'], icon: Building2 },
]

function norm(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

export function detectPremiacaoIcon(texto: string): LucideIcon {
  const n = norm(texto)
  for (const { kws, icon } of ICON_MAP) {
    if (kws.some((kw) => n.includes(norm(kw)))) return icon
  }
  return Star
}
