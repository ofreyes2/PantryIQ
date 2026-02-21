# PantryIQ — Your Kitchen. Your Health. Perfectly Managed.

A premium React Native Expo iOS app for pantry management, meal tracking, and personal health monitoring.

## Tech Stack
- React Native / Expo SDK 53
- Expo Router (file-based navigation)
- Zustand (local state, persisted to AsyncStorage)
- React Native Reanimated (animations)
- NativeWind (Tailwind CSS styling)
- DM Sans + Playfair Display (Google Fonts)
- react-native-svg (charts and progress rings)

## App Structure

```
mobile/src/
├── app/
│   ├── _layout.tsx          # Root layout, font loading, onboarding redirect
│   ├── onboarding.tsx        # 6-step onboarding flow
│   └── (tabs)/
│       ├── _layout.tsx      # 7-tab navigator (navy theme)
│       ├── index.tsx        # Dashboard (Phase 1 — complete)
│       ├── pantry.tsx       # Pantry (Phase 2)
│       ├── meals.tsx        # Meals (Phase 2)
│       ├── recipes.tsx      # Recipes (Phase 3)
│       ├── shopping.tsx     # Shopping (Phase 3)
│       ├── health.tsx       # Health (Phase 4)
│       └── settings.tsx     # Settings (Phase 4)
├── constants/
│   └── theme.ts             # Colors, spacing, typography, shadows
└── lib/
    ├── storage.ts           # Typed AsyncStorage wrapper
    └── stores/
        └── appStore.ts      # Zustand store (profile, settings, streak, onboarding)
```

## Color Theme
- Navy (primary bg): `#0A1628`
- Card surface: `#0F2040`
- Surface: `#162645`
- Green (accent): `#2ECC71`
- Amber (warnings): `#F39C12`
- Error: `#E74C3C`

## Build Phases
- **Phase 1** (complete): Navigation, theme, Dashboard screen, onboarding flow
- **Phase 2**: Pantry (barcode scan, Open Food Facts API, Claude photo ID) + Meals
- **Phase 3**: Recipes (Claude recipe gen, import from URL) + Shopping
- **Phase 4**: Health tracking (weight, body fat, measurements) + Settings + API integrations

## APIs (user-provided keys in Settings)
- Open Food Facts — free, no key
- USDA FoodData Central — user enters key in Settings
- Claude API (claude-sonnet-4-6) — user enters key in Settings
