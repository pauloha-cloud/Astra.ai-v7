import type { Express, Request, Response } from 'express';
import { resolveSeasonalTheme } from './seasonalThemeEngine';

export function registerSeasonalThemeRoutes(app: Express) {
  app.get('/api/seasonal-theme', (req: Request, res: Response) => {
    const { country, lang, date } = req.query;

    const parsedDate = typeof date === 'string' && date
      ? new Date(`${date}T00:00:00.000Z`)
      : new Date();

    const result = resolveSeasonalTheme({
      date: Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
      country: typeof country === 'string' ? country : undefined,
      lang: typeof lang === 'string' ? lang : undefined
    });

    res.json(result);
  });
}
