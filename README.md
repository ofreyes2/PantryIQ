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
│   ├── meal-type-detail.tsx      # Meal type detail view (clickable from meals tab, full item list & edit)
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
│   ├── MealConfirmationModal.tsx # Meal type/date selection modal
│   ├── QuickLogSheet.tsx        # Quick Log bottom sheet (recent meals, favorites)
│   ├── RecipeCaptureCard.tsx    # Recipe save card that appears in Chef Claude chat
│   └── RecipeCreationModal.tsx  # Recipe/tip editor with auto-filled fields from conversation
├── constants/
│   └── theme.ts                 # Colors, spacing, typography, shadows
├── lib/
    ├── storage.ts               # Typed AsyncStorage wrapper
    ├── storageKeys.ts           # Centralized AsyncStorage key constants
    ├── toastHelper.ts           # Toast helper functions for delete/clear operations
    ├── personalityModes.ts      # Chef Claude personality mode definitions and utilities
    ├── mealAnalysis.ts          # Meal detection patterns and analysis utilities
    ├── foodExplorationUtil.ts   # Food exploration triggers, ingredient extraction, positive response detection
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
        ├── recipesStore.ts      # Recipe box, ChefTip interface, Herbed Cream Cheese seed recipe
        ├── chefPreferencesStore.ts # Learned food preferences, exploration mode, conversation context
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
- **Phase 9** (complete): Chef Claude Natural Food Conversation & Recipe Capture (Batch 5, Feature 11)
  - **Part 1 - Exploration Mode**: Recognizes food pairing/elevation questions, cross-references pantry items, builds context for intelligent suggestions with low-carb awareness
  - **Part 2 - Recipe Capture from Conversation**: RecipeCaptureCard appears when user responds positively to suggestions, pre-fills recipe modal with name/ingredients/instructions/nutrition auto-extracted from chat
  - **Part 3 - Mid-Conversation Save**: Bookmark icons on Chef Claude messages enable saving any suggestion mid-conversation without waiting for end
  - **Part 4 - Photo to Recipe Flow**: Vision API ready to identify food in photos and offer exploration chips (What pairs well, How do I elevate, Make it a meal, Log this, Add to pantry)
  - **Part 5 - Saved Tips Section**: ChefTip interface for shorter advice cards, tips section in Recipes tab, dual save options (Full Recipe vs Quick Tip)
  - **Part 6 - Conversation to Shopping List**: Inline [+ Add to List] buttons appear next to ingredients user doesn't have, adds to shopping list with toast confirmation
  - **Part 7 - Remembered Preferences**: Learns from conversations (flavor preferences, ingredient affinities, brand preferences), stored in AsyncStorage, included in system prompt for personalization
  - **Part 8 - Pre-built Herbed Cream Cheese Recipe**: Zero-carb Italian dip recipe ready in Recipe Box as demo + reference
- **Batch 5 Features** (in progress):
  - **Feature 1 ✅ COMPLETE**: Chef Claude Personality Modes — 6 personality modes (Default, Coach, Gordon Ramsay, Scientist, Zen, Custom) with dynamic system prompts, personality selector in Settings, personality mode indicator in Chef Claude header
  - **Feature 8 ✅ COMPLETE**: App Store Preparation — Complete privacy policy, terms of service, app store description, keywords, screenshots specifications, app icon design brief, TestFlight instructions
  - **Feature 9 ✅ COMPLETE**: Error Handling and Crash Prevention — Global ErrorBoundary component, debug logging system, API retry logic with exponential backoff, data validation utilities
  - **Feature 10 ✅ COMPLETE**: Natural Language Meal Logging — Backend endpoint for meal analysis, meal detection patterns, confirmation cards, conversational follow-ups, Quick Log bottom sheet, proactive meal time prompts, settings toggles for all features
  - **BUG FIX ✅ IN PROGRESS**: Chef Claude Meal Logging Recovery — Fixing critical issue where meal confirmation cards stopped appearing:
    - **Root Cause**: Claude API not consistently including required `<MEAL_DATA>` JSON block despite system prompt instructions
    - **Solution Implemented**:
      1. **Enhanced System Prompt**: Made MEAL_DATA instructions more explicit with concrete example showing exact format Claude must follow
      2. **Improved Extraction Logging**: Added console logs to track MEAL_DATA extraction success/failure with detailed error messages
      3. **Fallback Detection**: Implemented `detectMealFromConversation()` function using regex patterns to detect meals from conversational responses when JSON extraction fails
      4. **Dependency Updates**: Added detectMealFromConversation to useCallback dependencies
    - **How It Works**: When user describes food, app first tries to extract <MEAL_DATA> JSON block. If Claude didn't include it, fallback pattern matching detects meal mentions. Either way, confirmation card appears (high confidence if JSON found, low confidence if fallback triggered)
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
  - **ENHANCEMENT ✅ COMPLETE**: Meal Entry Management & JARVIS Voice Mode — Comprehensive meal editing system plus AI voice assistant:
    - **Meal Entry Editing & Moving**:
      - ✅ Swipe left on any meal entry to reveal Edit (blue) and Delete (red) action buttons
      - ✅ Long-press any meal entry for context menu (Edit, Move, Delete, Duplicate, Favorite)
      - ✅ Always-visible edit pencil button for discoverability
      - ✅ EditEntrySheet component with all editable fields (name, quantity, unit, meal type, nutrition)
      - ✅ MoveToMealSheet for moving entries between meal types with smooth animations
      - ✅ MealLogger service methods: moveEntry(), editEntry(), deleteEntry(), checkForDuplicate(), validateEntry()
    - **Chef Claude Move/Edit/Delete Interceptor**:
      - ✅ Extended MEAL_DATA JSON block to support "move", "edit", "delete" actions
      - ✅ Natural language detection for: "move to", "change to", "update", "fix", "delete", "remove"
      - ✅ MealUpdateConfirmationCard (purple-tinted) shows pending move/edit/delete operations
      - ✅ User confirms or cancels changes before they're applied
      - ✅ Seamless integration with existing meal logging system
    - **Duplicate Detection & Nutrition Validation**:
      - ✅ Yellow warning card shows when logging duplicate entries in same meal type
      - ✅ Options: "Log Again", "Update Existing", or "Cancel"
      - ✅ Nutrition data validation badges on entries missing calorie/carb/protein data
      - ✅ Warning prompts users to add missing nutrition info
    - **Meal Section Context Menus**:
      - ✅ Three-dot menu on each meal section (Breakfast, Lunch, Dinner, Snacks)
      - ✅ Options: Add Food, Clear Section (with confirmation), Move All to (meal type selector)
      - ✅ Smooth animations and toast confirmations for all actions
    - **JARVIS Voice Mode**:
      - ✅ Microphone button in Chef Claude header to toggle JARVIS voice mode
      - ✅ JARVIS personality mode: Formal British tone, precision focus, confident delivery
      - ✅ Auto-speak Claude responses using expo-speech (British English, lower pitch, deliberate pace)
      - ✅ Dark blue visual theme when voice mode active ("JARVIS — ONLINE" header)
      - ✅ Haptic feedback and button highlighting for voice mode toggle
      - ✅ Works with any personality mode, designed specifically for JARVIS character
  - **CRITICAL FIX ✅ COMPLETE**: Daily Reset and Date Awareness System
    - **Part 1 - Daily Reset on App Open**: Detects new day on app start and background/foreground transitions, initializes fresh meal logs and daily totals for today, preserves yesterday's data for history
    - **Part 2 - New Day Greeting Card**: Displays morning/afternoon/evening greeting with yesterday's summary and today's goals, auto-dismisses after 4 seconds or on user tap
    - **Part 3 - Date Navigation in Meals Tab**: Defaults to today on tab open, large centered date display (Today/Yesterday/Full date), left/right arrows for date navigation (right arrow disabled on today), "Today" button always visible to jump back to today from any past date
    - **Part 4 - Meals Tab Today Empty State**: Shows clean empty state for each meal section (Breakfast, Lunch, Dinner, Snacks) when no entries exist, with time-appropriate messaging and quick add buttons
    - **Part 5 - Chef Claude Date Awareness**: System prompt includes current date, time of day, and yesterday's log reference, never confuses dates when logging meals, confirms date context if ambiguous
    - **Part 6 - Dashboard Daily Reset Display**: Nutrition rings reset to zero every new day, only show today's data, Dashboard always shows today's date, never carries over previous day data
    - **Part 7 - Date-Based Storage**: All data stored with consistent YYYY-MM-DD date keys, utility functions for consistent date handling throughout app, prevents yesterday's data bleeding into today
    - **Part 8 - History Access for Past Dates**: Calendar navigation to view any past date, left/right arrows for day-by-day navigation, past date visual treatment (dimmed interface, subtle Past Date banner), all past dates fully editable with changes updating correctly
- **Part 9 - Seed Entry Daily Cleanup ✅ COMPLETE**: Fixed meals tab defaulting to yesterday's entries by:
      - Added `cleanupOldSeedEntries()` method to mealsStore that removes seed entries older than today/yesterday on new day
      - Integrated cleanup into daily reset handler to automatically clean old seed data when date changes
      - Added additional cleanup trigger in meals tab's useFocusEffect to ensure old entries are removed when tab is accessed
      - Seed entries now only persist for today and yesterday, older seed data is purged
      - User-added meals continue to be preserved (only seed meals are cleaned)
    - **Date Display Fix ✅ COMPLETE**: Meals tab now always displays the actual date:
      - Previously showed "Today" without the actual date on current day
      - Now shows "Today" with full date below (e.g., "Today\nWednesday, February 23, 2025")
      - Past dates show "Yesterday/Full Date" label with full date below
      - All dates consistently display the actual calendar date for clarity
    - **Navigation Arrows Fix ✅ COMPLETE**: Fixed left/right arrows in meals tab:
      - Left arrow now correctly goes to previous day
      - Right arrow now correctly goes to next day (disabled on today)
      - Simplified navigation logic using direct date arithmetic instead of complex daysDifference calculations
    - **Meal Confirmation Date Fix ✅ COMPLETE**: Fixed entries being logged with wrong dates:
      - MealConfirmationModal now accepts optional currentDate prop
      - Chef Claude explicitly passes today's date to ensure meals are always logged to today from Claude
      - Improved robustness of seed entry cleanup to preserve all user-created entries regardless of date
  - **BUG FIX ✅ COMPLETE**: Chef Claude Date Intelligence & Multi-Date Meal Management — Comprehensive date handling system:
    - **Part 1 - Date Parsing Rules**: Chef Claude understands natural language date references:
      - "yesterday" → yesterday's date
      - "today" → today's date
      - "this morning" → context-aware (before/after 2pm)
      - "last night" → yesterday
      - Day names (Monday, Tuesday, etc.) → finds most recent occurrence
      - CRITICAL: Always confirms date before logging, never assumes today
    - **Part 2 - MealLogger Date Support**: Enhanced MealLogger service with date-aware methods:
      - `logMealToDate(mealData, targetDate)` - logs meals to any specific date with verification
      - `checkForDuplicate(entryName, date, mealType)` - detects duplicate entries
      - `cleanupDuplicatesForDate(date)` - removes duplicate entries with signature matching
    - **Part 3 - MEAL_DATA Structure**: Extended JSON block includes:
      - `targetDate`: YYYY-MM-DD format (date to log to)
      - `displayDate`: Human-readable date (Today/Yesterday/Monday Feb 24)
      - `needsDateConfirmation`: Boolean flag for confirmation requirement
      - `confirmationMessage`: Clear message showing target date and meal type
    - **Part 4 - Date-Aware Confirmation Cards**: New DateAwareMealConfirmationCard component:
      - Green header for today's entries
      - Amber header with warning for past date entries ("This will update a past date")
      - Prominent date display (e.g., "Sunday, February 23")
      - "Change Date" button to modify target before logging
      - Status states: pending → logging → success/failure
    - **Part 5 - Automatic Duplicate Cleanup**: Runs on app load:
      - Cleans duplicates for today and yesterday automatically
      - Removes entries with same name and calorie signature
      - Fixes current visible duplicate breakfast entry in screenshot
    - **Part 6 - Natural Language Date Commands**: Chef Claude understands:
      - Logging: "Log yesterday's breakfast — I had eggs and bacon"
      - Moving: "Move my breakfast from today to yesterday"
      - Moving meal types: "Move my string cheese from breakfast to snacks"
      - Deleting: "Delete the duplicate eggs from today's breakfast"
    - **Part 7 - Extended MealAnalysis Type**: Updated to track:
      - `targetDate`: specific date for logging
      - `displayDate`: human-readable date format
      - Ensures date information flows through entire logging pipeline
    - **Critical Implementation Fix**: Fixed system prompt using `${dateUtils.yesterday()}` as function call instead of actual date value
      - Now properly shows what "yesterday" and "today" mean to Chef Claude
      - Meals now correctly save to user-specified dates
    - **Favorite Meals System ✅ COMPLETE**: New Zustand store for saving meal templates:
      - `useFavoritesStore` for managing favorite meals
      - Save meals as favorites after logging with single tap
      - Tracks how many times each meal has been logged
      - Retrieve favorites by meal type for quick re-logging
      - Persists favorite meals to AsyncStorage
    - **Favorite Button in Confirmation Modal ✅ COMPLETE**:
      - Heart icon button in meal confirmation modal header
      - Tap to save meal as favorite for future quick-logging
      - Shows filled heart if meal already in favorites
      - Haptic feedback on interaction
      - Automatically extracts food items and nutrition data
    - **Meal Detail Sheet Component ✅ COMPLETE**: New full-screen modal showing:
      - Meal name, date, and meal type (e.g., "Monday, February 23 • Breakfast")
      - Complete nutrition breakdown (calories, carbs, protein, fat, fiber, net carbs)
      - Favorite/unfavorite toggle with heart button
      - Edit button to modify meal details
      - Delete button with confirmation
      - Shows exactly what was logged and when
    - **Success Confirmation Message ✅ COMPLETE**: After logging shows:
      - Date and meal type clearly (e.g., "✅ Logged to Monday, February 23 • Breakfast")
      - Location in Meals tab where meal can be found
      - Carb budget usage feedback
      - Any pantry items that were deducted
    - **Delete Operations ✅ COMPLETE**: Chef Claude can now properly delete meal entries:
      - Detects delete actions with `deleteAll` and `entriesToDelete` formats
      - Searches across all dates (not just today)
      - Shows confirmation card before deleting with clear message
      - Handles bulk deletes (all entries of a meal type) or specific entries
      - Actually removes entries from store (not just logging empty meals)
      - Shows success message with count of deleted entries and calories/carbs removed
    - **Implementation Details**:
      - New `dateUtils.ts` library with 20+ centralized date helper functions
      - New `dailyReset.ts` with daily reset logic and streak validity checking
      - `NewDayGreeting` component that displays on app open when new day detected
      - Updated `_layout.tsx` with AppState listener for background/foreground transitions
      - Meals tab now uses `useFocusEffect` hook to reset to today on tab open
      - Chef Claude system prompt updated with date/time context
      - Dashboard now pulls real today's data from meals store instead of mocks
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
7. **Meal Type Detail Screen** — Clickable meal type tabs (Breakfast, Lunch, Dinner, Snacks) navigate to detailed view with:
   - ✅ Full list of items for selected meal type
   - ✅ Date navigation (prev/next day)
   - ✅ Edit/Delete/Favorite actions for each item
   - ✅ Move item to different meal type
   - ✅ Nutrition totals (calories, net carbs, protein, fat)
   - ✅ Add more items button
   - ✅ Empty state with quick add button
8. **Dashboard & Meals Tab Critical Fixes ✅ COMPLETE** — Four critical bugs and three key features fixed:
   - **BUG FIX 1 ✅**: Dashboard showing wrong data — Fixed Dashboard to always load today's data on focus using `useFocusEffect` and dynamic key updates. Now correctly shows 0 calories and 0g carbs on fresh days.
   - **BUG FIX 2 ✅**: Dashboard calories/carbs progress bars showing crossed values — Refactored CarbProgressBar into NutritionProgressBars component that properly displays calorie values in calories row and carb values in carbs row (bug was reusing same values for both bars).
   - **BUG FIX 3 ✅**: Missing data badge not tappable — Converted "⚠️ Missing data" badge from View to Pressable component so tapping it opens the edit form to add missing nutrition values.
   - **FEATURE 1 ✅**: Today's Progress card navigation — Wrapped card in Pressable so tapping navigates to Meals tab. Provides quick access from Dashboard to meal logging.
   - **FEATURE 2 ✅**: Meal entry detail sheet — Created MealEntryDetailSheet component showing full nutrition breakdown (2-column layout with calories, net carbs, protein, fat, fiber, total carbs). Shows all entry details, includes Edit/Delete/Move buttons. Opens when tapping meal entry in Meals tab.
   - **FEATURE 3 ✅**: Fixed meal entry name truncation — Removed `numberOfLines={1}` constraint and reduced font size from 14pt to 13pt, allowing meal names to wrap to second line. Full names now visible without ellipsis (e.g., "2 count eggs, 1 oz cheddar cheese" no longer shows as "2 count eggs, 1 oz che…")
   - **Implementation Details**:
     - New `MealEntryDetailSheet.tsx` component with 50-line nutrition breakdown display
     - Added `onShowDetails` callback to `FoodItemRow` → `MealSectionCard` → main Meals screen
     - Modified `NutritionProgressBars` component with separate calorie and carb tracking
     - Dashboard uses `dashboardKey` state to force re-renders on tab focus
9. UI Consistency Audit (Typography, colors, spacing, components)
10. Onboarding Polish (Splash screen, illustrations, tooltips, empty states)


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

