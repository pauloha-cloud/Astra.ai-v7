import { api } from '../lib/api';

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
  message: string;
  colors: string[];
  countries?: string[];
  metadata?: {
    event?: string;
    phase?: string;
    country?: string;
    matchDay?: boolean;
  };
};

export type SeasonalThemeApiResponse = {
  active: boolean;
  source: 'backend';
  theme: SeasonalTheme | null;
};

export async function fetchSeasonalTheme(params: { country?: string; lang?: string; date?: string } = {}) {
  const response = await api.get<SeasonalThemeApiResponse>('/seasonal-theme', { params });
  return response.data;
}
