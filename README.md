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
│   ├── _layout.tsx              # Root layout, font loading, onboarding redirect
│   ├── onboarding.tsx            # 6-step onboarding flow
│   ├── add-pantry-item.tsx       # Add/edit pantry item form (with barcode pre-fill)
│   ├── barcode-scanner.tsx       # Full-screen camera barcode scanner
│   ├── pantry-item-detail.tsx    # Item detail: nutrition, history, edit/delete
│   ├── add-meal-entry.tsx        # Add food to meal (search, pantry, favorites)
│   ├── kitchen-locations.tsx     # Kitchen & Storage location manager screen
│   └── (tabs)/
│       ├── _layout.tsx          # 7-tab navigator (navy theme)
│       ├── index.tsx            # Dashboard (Phase 1 — complete)
│       ├── pantry.tsx           # Pantry — List View + Location View toggle, location chips
│       ├── meals.tsx            # Meals — full food diary, 4 meal sections, barcode/photo/search, Claude coaching
│       ├── recipes.tsx          # Recipes (Phase 3)
│       ├── shopping.tsx         # Shopping (Phase 3)
│       ├── health.tsx           # Health (Phase 4)
│       └── settings.tsx         # Settings + My Kitchen & Storage section
├── components/
│   ├── Toast.tsx                # Toast notification system
│   ├── ConfettiCelebration.tsx  # Confetti animation
│   └── LocationPicker.tsx       # Reusable location + sub zone picker bottom sheet
├── constants/
│   └── theme.ts                 # Colors, spacing, typography, shadows
└── lib/
    ├── storage.ts               # Typed AsyncStorage wrapper
    └── stores/
        ├── appStore.ts          # User profile, settings, streak, onboarding state
        ├── pantryStore.ts       # Pantry items CRUD with locationId/subZoneId/specificSpot
        ├── mealsStore.ts        # Food diary entries, water intake, favorites, removeWaterEntry
        └── locationStore.ts     # Kitchen storage locations — 6 defaults, full CRUD + sub zones
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
- **Phase 2** (complete): Pantry (barcode scan, Open Food Facts API, category filter, swipe actions) + Meals (food diary, nutrition tracking, water intake, pantry sync)
- **Phase 3** (complete): Recipes (discovery feed, Claude AI generation, URL import, recipe box, cook-mode pantry deduction) + Shopping (store tabs, low-stock suggestions, price history, trip completion)
- **Phase 4** (complete): Health (weight chart, body fat gauge, measurements, progress photos, milestone confetti, streak heatmap, Claude weekly report) + Settings (profile, API keys, notifications, data export/clear) + Dashboard wired to live data from all stores
- **Phase 5** (complete): Storage Location System (6 default appliance locations, sub zones, location picker, List/Location view toggle in Pantry, My Kitchen & Storage in Settings) + Meals Tab full build (4 meal sections, day navigation, barcode/photo/search add flow, portion selector, favorites, weekly chart, Claude coaching card, water tracker)
- **Phase 6** (complete): Kitchen Map — photo-based zone mapping system (onboarding flow, camera photo session with rule-of-thirds grid, Claude AI zone detection with base64 image analysis, interactive zone overlay on photos, zone map display, spotted items detection, mock fallback when no API key)
- **Phase 7** (complete): Kitchen Equipment Manager + Cooking Intelligence Upgrade — full kitchen equipment checklist (50+ appliances, surfaces, outdoor cooking), cooking preference profile (textures, skill, methods, dietary focus, cuisines), Instant Pot dual-pot strategy, deep fryer crispy techniques, upgraded Chef Claude system prompt with equipment awareness + crispiness priority, recipe card crispiness ratings (🥨 scale), cooking method tags, recipe filter bar (Crispy/Quick/Deep Fried/Instant Pot), 10 new crispy low-carb starter recipes (Crispy Collection folder)

## APIs (user-provided keys in Settings)
- Open Food Facts — free, no key
- USDA FoodData Central — user enters key in Settings
- Claude API (claude-sonnet-4-6) — user enters key in Settings

## Dual Unit Inventory System

PantryIQ uses a dual unit system that separates how items are stored/tracked (inventory unit) from how they are consumed (serving unit).

- **Inventory Unit**: How you buy and store the item (loaf, dozen, package, bag, bottle, can, box, lb, oz, count, other). Used for replenishment tracking.
- **Serving Unit**: How you consume the item per meal (slice, egg, strip, piece, cup, oz, tbsp, g, serving). Comes from the nutrition label.
- **Servings Per Container**: How many serving units fit in one inventory unit (e.g., 18 slices per loaf).

When logging a meal, servings are deducted proportionally from inventory (e.g., 2 slices from a loaf with 18 slices = 2/18 inventory deduction).

Smart unit detection in the barcode scanner automatically suggests the right units based on product name and serving size patterns.
