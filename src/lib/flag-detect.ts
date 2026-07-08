const COUNTRY_MAP: [string[], string][] = [
  [['brasil', 'brazil', 'rio de janeiro', 'sao paulo', 'fortaleza', 'florianopolis', 'natal', 'salvador', 'recife', 'maceio', 'porto seguro', 'foz do iguacu'], 'BR'],
  [['argentina', 'buenos aires', 'bariloche', 'mendoza', 'patagonia', 'calafate', 'ushuaia'], 'AR'],
  [['chile', 'santiago', 'atacama', 'valparaiso', 'torres del paine'], 'CL'],
  [['uruguai', 'uruguay', 'montevideo', 'punta del este'], 'UY'],
  [['paraguai', 'paraguay', 'assuncao'], 'PY'],
  [['peru', 'lima', 'machu picchu', 'cusco', 'cuzco', 'arequipa'], 'PE'],
  [['bolivia', 'la paz', 'salar de uyuni', 'uyuni'], 'BO'],
  [['colombia', 'bogota', 'cartagena', 'medellin'], 'CO'],
  [['venezuela', 'caracas', 'isla margarita'], 'VE'],
  [['equador', 'ecuador', 'galapagos', 'quito'], 'EC'],
  [['mexico', 'cancun', 'riviera maya', 'tulum', 'playa del carmen', 'cozumel', 'los cabos', 'puerto vallarta', 'guadalajara'], 'MX'],
  [['estados unidos', 'usa', 'eua', 'orlando', 'miami', 'nova york', 'new york', 'las vegas', 'los angeles', 'chicago', 'san francisco', 'boston', 'washington', 'disney'], 'US'],
  [['canada', 'toronto', 'vancouver', 'montreal', 'quebec'], 'CA'],
  [['reino unido', 'uk', 'england', 'inglaterra', 'london', 'londres', 'edinburgo', 'edinburgh'], 'GB'],
  [['espanha', 'spain', 'barcelona', 'madri', 'madrid', 'ibiza', 'mallorca', 'sevilha', 'sevilla', 'granada', 'valencia'], 'ES'],
  [['portugal', 'lisboa', 'porto', 'algarve', 'acores', 'madeira', 'sintra'], 'PT'],
  [['franca', 'france', 'paris', 'nice', 'bordeaux', 'lyon', 'monte carlo', 'versailles'], 'FR'],
  [['italia', 'italy', 'roma', 'rome', 'veneza', 'venice', 'florenca', 'florence', 'milao', 'milan', 'napoles', 'naples', 'sicilia', 'amalfi', 'toscana', 'tuscany'], 'IT'],
  [['alemanha', 'germany', 'berlin', 'berlim', 'munique', 'munich', 'frankfurt', 'hamburgo'], 'DE'],
  [['holanda', 'netherlands', 'amsterdam', 'rotterdam'], 'NL'],
  [['belgica', 'belgium', 'bruxelas', 'brussels', 'bruges'], 'BE'],
  [['suica', 'switzerland', 'zurique', 'zurich', 'genebra', 'geneva', 'interlaken', 'berna', 'bern', 'lucerna'], 'CH'],
  [['austria', 'viena', 'vienna', 'salzburgo', 'salzburg', 'innsbruck'], 'AT'],
  [['grecia', 'greece', 'atenas', 'athens', 'mykonos', 'santorini', 'rodes', 'rhodes', 'creta', 'crete'], 'GR'],
  [['turquia', 'turkey', 'istanbul', 'capadocia', 'cappadocia', 'antalya', 'bodrum', 'izmir'], 'TR'],
  [['emirados arabes', 'uae', 'dubai', 'abu dhabi', 'abu dabi', 'sharjah'], 'AE'],
  [['egito', 'egypt', 'cairo', 'hurghada', 'sharm', 'luxor', 'assuan', 'aswan'], 'EG'],
  [['marrocos', 'morocco', 'marrakech', 'casablanca', 'fez', 'rabat'], 'MA'],
  [['africa do sul', 'south africa', 'cape town', 'cidade do cabo', 'joanesburgo', 'johannesburg', 'kruger'], 'ZA'],
  [['japao', 'japan', 'tokyo', 'toquio', 'osaka', 'kyoto', 'hiroshima', 'nara'], 'JP'],
  [['china', 'pequim', 'beijing', 'xangai', 'shanghai'], 'CN'],
  [['coreia', 'korea', 'seoul', 'seul', 'busan', 'jeju'], 'KR'],
  [['tailandia', 'thailand', 'bangkok', 'phuket', 'koh samui', 'chiang mai', 'krabi'], 'TH'],
  [['indonesia', 'bali', 'lombok', 'jakarta', 'java', 'komodo'], 'ID'],
  [['filipinas', 'philippines', 'manila', 'palawan', 'boracay', 'cebu', 'bohol'], 'PH'],
  [['india', 'nova deli', 'new delhi', 'mumbai', 'goa', 'agra', 'taj mahal', 'kerala', 'jaipur'], 'IN'],
  [['australia', 'sydney', 'melbourne', 'cairns', 'grande barreira', 'great barrier', 'brisbane', 'gold coast'], 'AU'],
  [['nova zelandia', 'new zealand', 'auckland', 'queenstown', 'rotorua'], 'NZ'],
  [['cuba', 'havana', 'varadero', 'trinidad'], 'CU'],
  [['republica dominicana', 'punta cana', 'la romana', 'bavaro', 'santo domingo'], 'DO'],
  [['panama', 'cidade do panama'], 'PA'],
  [['costa rica'], 'CR'],
  [['israel', 'tel aviv', 'jerusalem', 'terra santa', 'nazareth'], 'IL'],
  [['jordania', 'petra', 'amman', 'wadi rum', 'mar morto', 'dead sea'], 'JO'],
  [['croacia', 'croatia', 'dubrovnik', 'split', 'zagreb', 'hvar'], 'HR'],
  [['hungria', 'hungary', 'budapest'], 'HU'],
  [['polonia', 'poland', 'cracow', 'cracovia', 'varsovia', 'warsaw'], 'PL'],
  [['republica tcheca', 'czech', 'praga', 'prague', 'brno'], 'CZ'],
  [['singapura', 'singapore'], 'SG'],
  [['malasia', 'malaysia', 'kuala lumpur', 'langkawi', 'penang'], 'MY'],
  [['vietna', 'vietnam', 'hanoi', 'ho chi minh', 'hoi an', 'halong', 'danang'], 'VN'],
  [['maldivas', 'maldives'], 'MV'],
  [['sri lanka', 'colombo', 'kandy'], 'LK'],
  [['nepal', 'kathmandu', 'everest', 'pokhara'], 'NP'],
  [['noruega', 'norway', 'oslo', 'bergen', 'fiordos', 'fjords', 'tromso'], 'NO'],
  [['suecia', 'sweden', 'estocolmo', 'stockholm'], 'SE'],
  [['dinamarca', 'denmark', 'copenhague', 'copenhagen'], 'DK'],
  [['finlandia', 'finland', 'helsinki', 'laponia', 'lapland', 'rovaniemi'], 'FI'],
  [['russia', 'moscou', 'moscow', 'sao petersburgo', 'saint petersburg'], 'RU'],
  [['irlanda', 'ireland', 'dublin', 'galway', 'cork'], 'IE'],
  [['monaco'], 'MC'],
  [['kenya', 'nairobi', 'masai mara', 'amboseli', 'mombasa'], 'KE'],
  [['tanzania', 'serengeti', 'zanzibar', 'kilimanjaro'], 'TZ'],
  [['bahamas', 'nassau'], 'BS'],
  [['jamaica', 'kingston', 'montego bay', 'negril', 'ocho rios'], 'JM'],
  [['aruba', 'oranjestad'], 'AW'],
  [['curacao'], 'CW'],
  [['barbados', 'bridgetown'], 'BB'],
  [['cambodja', 'camboja', 'cambodia', 'siem reap', 'angkor', 'phnom penh'], 'KH'],
  [['eslovenia', 'slovenia', 'liubliana', 'bled'], 'SI'],
  [['malta', 'valletta'], 'MT'],
  [['chipre', 'cyprus', 'nicosia', 'paphos'], 'CY'],
]

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

export function detectIso(text: string): string | null {
  const input = normalize(text.trim())
  if (input.length < 3) return null
  for (const [keywords, iso] of COUNTRY_MAP) {
    for (const kw of keywords) {
      const kwNorm = normalize(kw)
      if (input.includes(kwNorm) || kwNorm.includes(input)) {
        return iso
      }
    }
  }
  return null
}

export function flagImgUrl(iso: string, size: '20x15' | '32x24' | '48x36' = '32x24'): string {
  return `https://flagcdn.com/${size}/${iso.toLowerCase()}.png`
}
