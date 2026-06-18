import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchSeasonalTheme, SeasonalTheme } from '../services/seasonalThemeClient';

const STORAGE_KEY = 'astra-seasonal-effects-disabled';

function detectCountryFromLocale() {
  const locale = navigator.language || 'en-US';
  const parts = locale.split('-');
  return parts[1]?.toUpperCase() || 'GLOBAL';
}

export function useSeasonalThemeV2(options: { country?: string; lang?: string; date?: string } = {}) {
  const [activeTheme, setActiveTheme] = useState<SeasonalTheme | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSeasonalEffectsDisabled, setIsSeasonalEffectsDisabled] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  const query = useMemo(() => ({
    country: options.country || detectCountryFromLocale(),
    lang: options.lang || 'en',
    date: options.date
  }), [options.country, options.lang, options.date]);

  const refreshSeasonalTheme = useCallback(async () => {
    if (isSeasonalEffectsDisabled) {
      setActiveTheme(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchSeasonalTheme(query);
      setActiveTheme(result.active ? result.theme : null);
    } catch (err: any) {
      setActiveTheme(null);
      setError(err?.message || 'Failed to load seasonal theme');
    } finally {
      setIsLoading(false);
    }
  }, [isSeasonalEffectsDisabled, query]);

  const toggleSeasonalEffects = useCallback(() => {
    setIsSeasonalEffectsDisabled((current) => {
      const next = !current;
      localStorage.setItem(STORAGE_KEY, String(next));
      if (next) setActiveTheme(null);
      return next;
    });
  }, []);

  useEffect(() => {
    refreshSeasonalTheme();
  }, [refreshSeasonalTheme]);

  return {
    activeTheme,
    hasActiveTheme: Boolean(activeTheme) && !isSeasonalEffectsDisabled,
    isLoading,
    error,
    isSeasonalEffectsDisabled,
    toggleSeasonalEffects,
    refreshSeasonalTheme
  };
}
