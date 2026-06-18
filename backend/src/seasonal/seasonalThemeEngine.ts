export type SeasonalEffect = 'football' | 'snow' | 'flowers' | 'fireworks' | 'none';

export type SeasonalTheme = {
  id: string;
  name: string;
  enabled: boolean;
  startDate: string;
  endDate: string;
  priority: number;
  effect: SeasonalEffect;
  variant: string;
  message: Record<'pt' | 'en' | 'es', string>;
  colors: string[];
  countries?: string[];
  metadata: {
    event: 'world_cup' | 'christmas' | 'mothers_day' | 'new_year' | 'custom';
    phase?: 'general' | 'opening' | 'group_stage' | 'knockout' | 'final' | 'champion';
    country?: string;
    matchDay?: boolean;
  };
};

type WorldCupMatch = {
  id: string;
  date: string;
  countries: string[];
  phase: 'group_stage' | 'knockout' | 'final';
};

export type SeasonalThemeResolution = {
  active: boolean;
  source: 'backend';
  theme: (Omit<SeasonalTheme, 'message'> & { message: string }) | null;
};

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);
const normalizeCountry = (country?: string) => country?.trim().toUpperCase() || 'GLOBAL';
const normalizeLang = (lang?: string): 'pt' | 'en' | 'es' => {
  const value = lang?.trim().toLowerCase();
  return value === 'pt' || value === 'en' || value === 'es' ? value : 'en';
};
const isInRange = (dateKey: string, start: string, end: string) => dateKey >= start && dateKey <= end;

// Phase 2: configurable schedule. Replace these sample rows with official/curated event data later.
const worldCupMatches: WorldCupMatch[] = [
  { id: 'sample_br_group_01', date: '2026-06-15', countries: ['BR'], phase: 'group_stage' },
  { id: 'sample_us_group_01', date: '2026-06-16', countries: ['US'], phase: 'group_stage' },
  { id: 'sample_nl_group_01', date: '2026-06-17', countries: ['NL'], phase: 'group_stage' },
  { id: 'sample_knockout_01', date: '2026-07-04', countries: ['BR', 'US', 'NL', 'ES'], phase: 'knockout' },
  { id: 'sample_final', date: '2026-07-19', countries: ['GLOBAL'], phase: 'final' }
];

const seasonalThemes: SeasonalTheme[] = [
  {
    id: 'world_cup_general',
    name: 'World Cup Mode',
    enabled: true,
    startDate: '2026-06-01',
    endDate: '2026-07-31',
    priority: 10,
    effect: 'football',
    variant: 'general',
    message: {
      pt: 'Astra.ai está em modo Copa do Mundo.',
      en: 'Astra.ai is in World Cup Mode.',
      es: 'Astra.ai está en modo Copa del Mundo.'
    },
    colors: ['#22C55E', '#FACC15', '#2563EB', '#7C3AED', '#00F5FF'],
    metadata: { event: 'world_cup', phase: 'general' }
  },
  {
    id: 'world_cup_final',
    name: 'World Cup Final Mode',
    enabled: true,
    startDate: '2026-07-15',
    endDate: '2026-07-19',
    priority: 45,
    effect: 'fireworks',
    variant: 'final',
    message: {
      pt: 'Semana da final. A Astra.ai está em modo decisão.',
      en: 'Final week. Astra.ai is in decisive mode.',
      es: 'Semana de la final. Astra.ai está en modo decisión.'
    },
    colors: ['#FACC15', '#FFFFFF', '#00F5FF', '#7C3AED'],
    metadata: { event: 'world_cup', phase: 'final' }
  }
];

function buildMatchDayTheme(match: WorldCupMatch, country: string): SeasonalTheme {
  const isBrazil = country === 'BR';
  return {
    id: `world_cup_${country.toLowerCase()}_match_day`,
    name: `${country} Match Day Mode`,
    enabled: true,
    startDate: match.date,
    endDate: match.date,
    priority: match.phase === 'final' ? 90 : 80,
    effect: match.phase === 'final' ? 'fireworks' : 'football',
    variant: 'match_day',
    message: {
      pt: isBrazil ? 'Hoje é dia de Brasil. Vamos estudar como campeões.' : 'Hoje é dia de jogo. Estude com energia de campeão.',
      en: 'It is match day. Study with champion energy.',
      es: 'Hoy es día de partido. Estudia con energía de campeón.'
    },
    colors: isBrazil ? ['#16A34A', '#FACC15', '#2563EB', '#FFFFFF'] : ['#00F5FF', '#7C3AED', '#FACC15', '#FFFFFF'],
    countries: match.countries,
    metadata: { event: 'world_cup', phase: match.phase, country, matchDay: true }
  };
}

export function resolveSeasonalTheme(input: { date?: Date; country?: string; lang?: string } = {}): SeasonalThemeResolution {
  const dateKey = toDateKey(input.date || new Date());
  const country = normalizeCountry(input.country);
  const lang = normalizeLang(input.lang);

  const staticThemes = seasonalThemes.filter((theme) => {
    const countryMatches = !theme.countries || theme.countries.includes('GLOBAL') || theme.countries.includes(country);
    return theme.enabled && countryMatches && isInRange(dateKey, theme.startDate, theme.endDate);
  });

  const matchThemes = worldCupMatches
    .filter((match) => match.date === dateKey)
    .filter((match) => match.countries.includes('GLOBAL') || match.countries.includes(country))
    .map((match) => buildMatchDayTheme(match, country));

  const theme = [...staticThemes, ...matchThemes].sort((a, b) => b.priority - a.priority)[0];
  return theme
    ? { active: true, source: 'backend', theme: { ...theme, message: theme.message[lang] } }
    : { active: false, source: 'backend', theme: null };
}
