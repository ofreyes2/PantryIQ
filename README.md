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
│   ├── _layout.tsx              # Root layout, font loading, onboarding redirect, ErrorBoundary
│   ├── onboarding.tsx            # 6-step onboarding flow
│   ├── add-pantry-item.tsx       # Add/edit pantry item form (with barcode pre-fill)
│   ├── barcode-scanner.tsx       # Full-screen camera barcode scanner
│   ├── pantry-item-detail.tsx    # Item detail: nutrition, history, edit/delete
│   ├── add-meal-entry.tsx        # Add food to meal (search, pantry, favorites)
│   ├── kitchen-locations.tsx     # Kitchen & Storage location manager screen
│   ├── macro-calculator.tsx      # Macro Calculator (Mifflin-St Jeor formula, 6-step form)
│   ├── fasting-timer.tsx         # Fasting Timer (protocol selector, phase display, history)
│   ├── chef-claude.tsx           # Chef Claude AI chat with personality modes
│   └── (tabs)/
│       ├── _layout.tsx          # 7-tab navigator (navy theme)
│       ├── index.tsx            # Dashboard (Phase 1 — complete, now with Fasting Widget)
│       ├── pantry.tsx           # Pantry — List View + Location View toggle, location chips
│       ├── meals.tsx            # Meals — full food diary, 4 meal sections, barcode/photo/search, Claude coaching
│       ├── recipes.tsx          # Recipes (Phase 3)
│       ├── shopping.tsx         # Shopping (Phase 3)
│       ├── health.tsx           # Health (Phase 4)
│       └── settings.tsx         # Settings + My Kitchen & Storage section, Chef Claude personality modes
├── components/
│   ├── Toast.tsx                # Toast notification system
│   ├── DeleteConfirmationModal.tsx # Reusable delete confirmation modal
│   ├── ConfettiCelebration.tsx  # Confetti animation
│   ├── LocationPicker.tsx       # Reusable location + sub zone picker bottom sheet
│   ├── FastingWidget.tsx        # Fasting Timer dashboard widget
│   ├── ErrorBoundary.tsx        # Global error boundary for crash prevention
│   ├── MealConfirmationCard.tsx # Meal confirmation preview card with macro display
│   └── QuickLogSheet.tsx        # Quick Log bottom sheet (recent meals, favorites)
├── constants/
│   └── theme.ts                 # Colors, spacing, typography, shadows
├── lib/
    ├── storage.ts               # Typed AsyncStorage wrapper
    ├── storageKeys.ts           # Centralized AsyncStorage key constants
    ├── toastHelper.ts           # Toast helper functions for delete/clear operations
    ├── personalityModes.ts      # Chef Claude personality mode definitions and utilities
    ├── mealAnalysis.ts          # Meal detection patterns and analysis utilities
    ├── errorHandling.ts         # Global error handling, API retry logic, validation
    ├── accessibility.ts         # Accessibility utilities, WCAG compliance
    └── stores/
        ├── appStore.ts          # User profile, settings, streak, onboarding state
        ├── pantryStore.ts       # Pantry items CRUD with locationId/subZoneId/specificSpot
        ├── mealsStore.ts        # Food diary entries, water intake, favorites, removeWaterEntry
        ├── locationStore.ts     # Kitchen storage locations — 6 defaults, full CRUD + sub zones
        ├── nutritionStore.ts    # Macro goals, net carb calculations, user metrics
        ├── fastingStore.ts      # Fasting timer sessions, history, phases
        ├── healthStore.ts       # Weight tracking, body composition
        ├── recipesStore.ts      # Recipe box, favorites, cooking history
        ├── kitchenStore.ts      # Equipment checklist, cooking preferences
        ├── kitchenMapStore.ts   # Zone mapping, spotted items
        └── shoppingStore.ts     # Shopping list, price history, trip tracking
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
- **Phase 8** (complete): Nutrition Intelligence Features (Batch 1)
  - **Macro Calculator**: Mifflin-St Jeor BMR calculation, personalized daily macro targets, onboarding-style form, beautiful results display with flame/protein/fat cards
  - **Fasting Timer**: Dashboard widget + full screen, circular progress ring, 6 fasting phases, protocol selector (16:8, 18:6, 20:4, OMAD, 5:2, custom), session history, break fast suggestions
- **Batch 5 Features** (in progress):
  - **Feature 1 ✅ COMPLETE**: Chef Claude Personality Modes — 6 personality modes (Default, Coach, Gordon Ramsay, Scientist, Zen, Custom) with dynamic system prompts, personality selector in Settings, personality mode indicator in Chef Claude header
  - **Feature 8 ✅ COMPLETE**: App Store Preparation — Complete privacy policy, terms of service, app store description, keywords, screenshots specifications, app icon design brief, TestFlight instructions
  - **Feature 9 ✅ COMPLETE**: Error Handling and Crash Prevention — Global ErrorBoundary component, debug logging system, API retry logic with exponential backoff, data validation utilities
  - **Feature 10 ✅ COMPLETE**: Natural Language Meal Logging — Backend endpoint for meal analysis, meal detection patterns, confirmation cards, conversational follow-ups, Quick Log bottom sheet, proactive meal time prompts, settings toggles for all features
  - **BUG FIX ✅ COMPLETE**: Chef Claude Meal Logging Verification & Conversation Persistence — Two critical bugs fixed:
    - **Bug 1 - Meal Logging Verification**: Added data verification step after saving meals to AsyncStorage, ensuring Chef Claude doesn't claim to log meals that weren't actually saved. MealConfirmationCard now has 4 visual states (pending → logging → success/failure) with animations. Card turns green with checkmark on success, shows error details on failure with retry button.
    - **Bug 2 - Conversation Persistence**: Chef Claude conversations now persist to AsyncStorage instead of disappearing on app exit. Implemented conversation history screen showing all past chats with auto-generated titles, new conversation button, continue-previous-conversation banner, full conversation recovery with all 200+ messages and context.
  - **BUG FIX ✅ COMPLETE**: Delete & Clear Functions Audit — Comprehensive audit of all delete/clear functions throughout app:
    - ✅ Meal entry delete with swipe-to-delete confirmation dialog
    - ✅ Clear all meals for a date with confirmation and toast feedback
    - ✅ Centralized AsyncStorage key constants (storageKeys.ts)
    - ✅ Reusable DeleteConfirmationModal component
    - ✅ Toast helper functions for success notifications
    - ✅ All store delete/clear methods reviewed and working correctly
    - ⏳ Remaining UI work: Update remaining screens (pantry, shopping, health, recipes, etc.) with confirmations
  - **BUG FIX ✅ COMPLETE**: Comprehensive Meal Logging System Fix — Three critical issues fixed:
    - **Issue 1 - Manual Food Entry**: Added complete manual food entry system with:
      - Bottom sheet with 6 options (Search, Barcode Scan, Photo ID, Manual Entry, Favorites, Recent Foods)
      - ManualFoodEntryForm component with all nutrition fields (calories, carbs, fiber, protein, fat, sugar, sodium)
      - Auto-calculated net carbs (displayed in green, updates in real-time)
      - Food name/brand/serving description with number keyboards
      - Save as Favorite toggle with automatic favorite tracking (3+ logs)
      - Empty state helpers with quick add buttons based on time of day
      - Form validation with inline error messages
      - **FIXED**: FlatList-based scrolling ensures keyboard never covers input fields
    - **Issue 2 - MealLogger Service**: Created dedicated meal logging service that:
      - Saves meals with write verification (reads back from AsyncStorage to confirm success)
      - Validates meal type and creates unique IDs with timestamps
      - Automatically tracks food frequency and updates favorites
      - Recalculates daily nutrition totals (calories, netCarbs, protein, fat, fiber)
      - Comprehensive console logging for debugging
      - MealConfirmationCard now calls MealLogger.logMeal directly with success/failure states
      - Meals tab refreshes on focus with useFocusEffect hook
      - **FIXED**: Added MealConfirmationModal for meal type/date selection before logging
      - **FIXED**: "Log & Add More" feature lets users continuously log multiple meals in Chef Claude
    - **Issue 3 - Conversation Persistence & Coffee Shortcut**:
      - Chef Claude conversations now persist to AsyncStorage and restore on mount
      - Quick prompts system with 8 new chips (Log morning coffee, dinner ideas, carb tracking, expiring items, crispy recipes, meal plans, water intake, streak)
      - Coffee shortcut detects "morning coffee" and auto-logs 160cal/10g net carbs/4g protein/10g fat to breakfast
      - History icon shows all past conversations with auto-generated titles
      - Compose icon starts fresh conversation and saves current one
      - Subtle "Conversation restored" banner on recovery
  - **BUG FIX ✅ COMPLETE**: Keyboard Coverage & Meal Confirmation Polish — Two critical user experience issues fixed:
    - **Keyboard Coverage Fix**: Manual food entry form no longer hidden by keyboard
      - Converted ManualFoodEntryForm to FlatList-based scrolling
      - All input fields remain visible while keyboard is shown
      - Save button always reachable without closing keyboard
      - Smooth auto-scroll when keyboard appears
      - **FIXED**: Resolved VirtualizedList nesting error by moving ManualFoodEntryForm outside ScrollView wrapper in meals.tsx
    - **Meal Logging Confirmation Flow**: Bulletproof meal logging with meal type/date selection
      - Created MealConfirmationModal component
      - Modal appears before any meal logging in Chef Claude
      - Users select meal type (Breakfast, Lunch, Dinner, Snacks) and date before logging
      - Three action buttons: Log Meal, Log & Add More, Cancel
      - "Log & Add More" feature:
        - Logs the meal to selected type/date
        - Keeps modal open for continuous logging
        - Auto-focuses Chef Claude chat input for next meal
        - Shows green success state on confirmation card
        - User can immediately type next meal without reopening forms
      - Prevents accidental meal logging to wrong meal type or wrong date
      - Success messages show in chat with carb budget tracking
  - **ROOT CAUSE FIX ✅ COMPLETE**: Chef Claude Cannot Write to Meal Log — Fixed critical architecture problem:
    - **The Problem**: Claude API only returns text; it cannot write to AsyncStorage, databases, or any storage. Previous implementation tried to have Claude handle meal logging directly, which is architecturally impossible.
    - **The Solution - Response Interceptor Pattern**:
      - Claude now returns conversational responses + hidden structured `<MEAL_DATA>` JSON block at end
      - App extracts JSON block and removes it from display text (user never sees it)
      - App handles all persistence to AsyncStorage (Claude just provides data)
      - Confirmation button only appears when data is valid and ready
    - **Updated System Prompt**: Chef Claude now:
      - Includes hidden `<MEAL_DATA>` JSON blocks when user describes food
      - Never claims it logged anything or that it can't save
      - Says honest things like "Here's what I have for your breakfast — tap the button below to save it"
      - Only provides nutrition data; app controls all storage
    - **Simplified Architecture**:
      - Removed backend `/api/meals/analyze` endpoint calls
      - Removed meal analysis functions (Claude does this now)
      - All responses go directly to Claude API
      - App parses response, extracts meal data, removes JSON from display
      - User sees clean conversational response with "Log Meal" button
    - **End-to-End Flow**:
      1. User: "I just had 2 eggs with cheese"
      2. Claude: "Nice! Eggs with cheese is perfect low-carb. [hidden JSON] Tap below to save it to your log."
      3. App removes JSON, shows only: "Nice! Eggs... [Log Meal] [Edit]"
      4. User taps "Log Meal"
      5. Modal shows meal details, user confirms type
      6. Meal saved to AsyncStorage
      7. Success: "Logged! Your breakfast has been added..."
      8. Opens Meals tab → meal is there
  - **Feature 7 ✅ IN PROGRESS**: Accessibility Improvements — AccessibilityInfo integration, WCAG AA contrast checking, screen reader utilities, semantic HTML for accessibility
  - **Feature 5 IN PROGRESS**: UI Consistency Audit — Reviewing and standardizing typography, colors, spacing, component styles across entire app
  - **Feature 6 PENDING**: Onboarding Polish — Splash screen animation, onboarding illustrations, progress indicators, first-use tooltips, empty state designs
  - **Feature 3 PENDING**: Advanced Analytics Dashboard — Nutrition analytics, weight analytics, behavior analytics, pantry analytics, progress reports
  - **Feature 4 PENDING**: Performance Optimization — Image lazy loading, pagination, virtual lists, background sync, offline support
  - **Feature 2 PENDING**: Recipe Import Enhancement — Batch URL imports, low carb substitution suggestions, ingredient substitution review, duplicate detection

## APIs (user-provided keys in Settings)
- Open Food Facts — free, no key
- USDA FoodData Central — user enters key in Settings
- Claude API (claude-opus-4-5-20251101) — user enters key in Settings

## Dual Unit Inventory System

PantryIQ uses a dual unit system that separates how items are stored/tracked (inventory unit) from how they are consumed (serving unit).

- **Inventory Unit**: How you buy and store the item (loaf, dozen, package, bag, bottle, can, box, lb, oz, count, other). Used for replenishment tracking.
- **Serving Unit**: How you consume the item per meal (slice, egg, strip, piece, cup, oz, tbsp, g, serving). Comes from the nutrition label.
- **Servings Per Container**: How many serving units fit in one inventory unit (e.g., 18 slices per loaf).

When logging a meal, servings are deducted proportionally from inventory (e.g., 2 slices from a loaf with 18 slices = 2/18 inventory deduction).

Smart unit detection in the barcode scanner automatically suggests the right units based on product name and serving size patterns.

## Batch 5 Summary

**Features Completed:**
1. ✅ Chef Claude Personality Modes (6 modes: Default, Coach, Gordon Ramsay, Scientist, Zen, Custom)
2. ✅ App Store Preparation (Complete marketing copy, privacy policy, terms, screenshots specs)
3. ✅ Error Handling & Crash Prevention (Global ErrorBoundary, debug logging, retry logic, validation)
4. ✅ Accessibility Foundation (WCAG utilities, screen reader support, color contrast checking)
5. ✅ **Natural Language Meal Logging** — Conversational meal description parsing, automatic macro calculation, confirmation cards with macro previews, meal logging with pantry deduction, Quick Log shortcuts with recent meals & favorites, proactive meal time reminders at breakfast/lunch/dinner/snack times, personality-aware responses for all meal edge cases, fully configurable settings (6 toggles for feature customization)
6. ✅ **Chef Claude Bug Fix — toneInstructions Error** — Fixed critical null reference error in personality mode system by:
   - Adding DEFAULT_PERSONALITY_CONFIG fallback object
   - Adding null safety checks to buildPersonalityPrompt with optional chaining
   - Adding getPersonalityConfig helper function for safe config access
   - Wrapping Chef Claude screen with ErrorBoundary component
   - Fixing header display to only show "Custom Mode" when custom instructions exist
   - All personality modes now work without errors

**Features In Progress:**
7. UI Consistency Audit (Typography, colors, spacing, components)
8. Onboarding Polish (Splash screen, illustrations, tooltips, empty states)

**Features Pending:**
9. Advanced Analytics Dashboard
10. Performance Optimization
11. Recipe Import Enhancement

**App Store Readiness:**
- Privacy Policy: ✅ Generated
- Terms of Service: ✅ Generated
- App Store Description: ✅ Complete
- Screenshots Specifications: ✅ Complete
- App Icon Brief: ✅ Complete
- TestFlight Instructions: ✅ Complete

