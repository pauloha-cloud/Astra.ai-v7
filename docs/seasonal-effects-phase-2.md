# Astra.ai Seasonal Effects — Phase 2

## Goal

Phase 2 evolves the simple frontend-only seasonal effects into a backend-driven Seasonal Effects Engine.

The main use case is World Cup Mode with smarter activation rules, such as:

- general tournament period;
- opening week;
- match day for selected countries;
- knockout stage;
- final week;
- champion celebration;
- manual overrides for marketing campaigns.

This phase keeps the visual layer lightweight, but moves the decision logic away from hardcoded frontend dates.

## Why Phase 2

Phase 1 is good for static dates such as Christmas, New Year, Mother's Day and World Cup general mode.

Phase 2 is better when Astra.ai needs temporary effects based on dynamic context:

- country or region;
- event phase;
- match day;
- campaign priority;
- admin or environment override;
- future integration with an official sports/event API.

## Proposed architecture

```text
Browser
  ↓
useSeasonalThemeV2 hook
  ↓
GET /api/seasonal-theme?country=BR&lang=pt
  ↓
Backend Seasonal Theme Engine
  ↓
Returns active theme, priority, phase, colors, message and metadata
```

## Backend endpoint

```http
GET /api/seasonal-theme?country=BR&lang=pt
```

Example response:

```json
{
  "active": true,
  "source": "backend",
  "theme": {
    "id": "world_cup_brazil_match_day",
    "name": "Brazil Match Day Mode",
    "effect": "football",
    "variant": "match_day",
    "priority": 80,
    "message": "Hoje é dia de jogo. Estude com energia de campeão.",
    "colors": ["#16A34A", "#FACC15", "#2563EB", "#FFFFFF"],
    "metadata": {
      "event": "world_cup",
      "phase": "group_stage",
      "country": "BR",
      "matchDay": true
    }
  }
}
```

## Files added in this phase

```text
backend/src/seasonal/seasonalThemeEngine.ts
backend/src/seasonal/registerSeasonalThemeRoutes.ts
frontend/src/services/seasonalThemeClient.ts
frontend/src/hooks/useSeasonalThemeV2.ts
```

## Integration steps

### 1. Register the backend route

In `backend/src/index.ts`, after `app.use(express.json())`, add:

```ts
import { registerSeasonalThemeRoutes } from './seasonal/registerSeasonalThemeRoutes';

// inside startServer(), after app.use(express.json())
registerSeasonalThemeRoutes(app);
```

### 2. Use the frontend hook

In `frontend/src/App.tsx`, import:

```ts
import { useSeasonalThemeV2 } from './hooks/useSeasonalThemeV2';
```

Inside the `App` component:

```ts
const seasonal = useSeasonalThemeV2({ country: 'BR', lang: currentLang });
```

Then pass `seasonal.activeTheme` to the seasonal visual components created in Phase 1.

### 3. Keep Phase 1 fallback

If `/api/seasonal-theme` fails, the frontend should keep the default Astra.ai experience or fall back to the static Phase 1 configuration.

## Phase 2 rules

- Backend chooses the active theme.
- Frontend only renders the returned visual effect.
- Highest priority wins when multiple campaigns match.
- Match-day themes should override general World Cup themes.
- Manual campaigns should be able to override everything by priority.
- The user must still be able to disable seasonal effects via localStorage.
- Accessibility must respect `prefers-reduced-motion`.

## Prompt for Google AI Studio

```text
Implement Phase 2 of the Astra.ai Seasonal Effects system.

Context:
Astra.ai is a React + Vite frontend with a Node.js + Express + TypeScript backend.
Phase 1 created frontend-only seasonal effects.
Phase 2 must move the seasonal decision logic to the backend while keeping the visual rendering in the frontend.

Goal:
Create a backend-driven Seasonal Effects Engine that returns the active theme based on date, country, event phase, campaign priority and World Cup match-day rules.

Backend requirements:
- Create backend/src/seasonal/seasonalThemeEngine.ts.
- Create backend/src/seasonal/registerSeasonalThemeRoutes.ts.
- Add GET /api/seasonal-theme.
- The endpoint must accept optional query params: country, lang and date.
- It must return active=false when no theme is active.
- It must return the highest-priority active theme when multiple themes match.
- Add World Cup theme rules for general mode, opening, match day, knockout, final and champion celebration.
- Keep the match schedule configurable in code for now.
- Do not call an external API yet.
- Add clear TODO comments for future integration with an official World Cup/event API.

Frontend requirements:
- Create frontend/src/services/seasonalThemeClient.ts.
- Create frontend/src/hooks/useSeasonalThemeV2.ts.
- The hook must call GET /api/seasonal-theme.
- The hook must store the user preference to disable effects in localStorage.
- The hook must expose activeTheme, hasActiveTheme, isLoading, error, isSeasonalEffectsDisabled, toggleSeasonalEffects and refreshSeasonalTheme.
- If the backend fails, fail gracefully without breaking the app.

Visual requirements:
- Do not redesign the UI in this phase.
- Do not add heavy dependencies.
- Keep the Astra.ai identity unique.
- Do not copy Google branding, Google Doodles, logos, text, or characters.

Expected result:
Astra.ai should be ready to activate seasonal effects dynamically from the backend, especially World Cup match-day themes, while preserving performance, accessibility and clean architecture.
```
