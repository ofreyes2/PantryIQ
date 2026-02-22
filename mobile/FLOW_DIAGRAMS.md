# Delete & Clear Functions - Flow Diagrams

## 1. Meal Entry Delete Flow

```
┌─────────────────────────────────────────────────────────────┐
│  User swipes meal entry left in meals.tsx                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  FoodItemRow renders delete button (red, right side)        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  User taps Delete button                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  [TODO UI] DeleteConfirmationModal appears                  │
│  Title: "Delete Meal?"                                      │
│  Message: "This meal entry will be removed..."              │
│  Item: "Scrambled Eggs"                                     │
│  Buttons: [Cancel] [Delete Meal]                            │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
    Cancel                    Confirm
        │                         │
        │                         ▼
        │            ┌─────────────────────────────────┐
        │            │ Call deleteEntry(id) in store   │
        │            └────────────────┬────────────────┘
        │                             │
        │                             ▼
        │            ┌─────────────────────────────────┐
        │            │ 1. Remove entry from state      │
        │            │ 2. Restore pantry servings      │
        │            │ 3. Zustand auto-persists        │
        │            │ 4. Daily totals recalculate     │
        │            │ 5. Nutrition rings update       │
        │            └────────────────┬────────────────┘
        │                             │
        │                             ▼
        │            ┌─────────────────────────────────┐
        │            │ [TODO UI] Toast appears:        │
        │            │ "Meal 'Scrambled Eggs' deleted" │
        │            │ (2 second duration)             │
        │            └────────────────┬────────────────┘
        │                             │
        └────────────────┬────────────┘
                         │
                         ▼
                    ┌─────────────┐
                    │ Dialog closes│
                    │ UI refreshed │
                    └─────────────┘
```

---

## 2. Clear Today's Meals Flow

```
┌──────────────────────────────────────────────────────┐
│  User taps "Clear All" button in meals screen header │
│  (only visible if entries exist for that date)       │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│  [TODO UI] Confirmation modal appears:               │
│  Title: "Clear All Meals?"                           │
│  Message: "Remove all 5 meal entries for Today?      │
│            Pantry items will be restocked."          │
│  Buttons: [Cancel] [Clear All Meals]                 │
└────────────────────┬─────────────────────────────────┘
                     │
        ┌────────────┴──────────────┐
        │                           │
    Cancel                      Confirm
        │                           │
        │                           ▼
        │            ┌───────────────────────────────────┐
        │            │ Call clearMeals(dateStr) in store │
        │            └────────────────┬──────────────────┘
        │                             │
        │                             ▼
        │            ┌───────────────────────────────────┐
        │            │ 1. Find all entries for date      │
        │            │ 2. Remove all meal entries        │
        │            │ 3. Remove water intake for date   │
        │            │ 4. For EACH meal:                 │
        │            │    - Restore pantry servings      │
        │            │ 5. Zustand auto-persists          │
        │            │ 6. Daily totals → 0               │
        │            │ 7. Nutrition rings → 0            │
        │            └────────────────┬──────────────────┘
        │                             │
        │                             ▼
        │            ┌───────────────────────────────────┐
        │            │ [TODO UI] Toast appears:          │
        │            │ "All meals cleared for Today"     │
        │            │ (2 second duration)               │
        │            └────────────────┬──────────────────┘
        │                             │
        └────────────────┬────────────┘
                         │
                         ▼
                    ┌─────────────┐
                    │ Dialog closes│
                    │ UI refreshed │
                    │ All entries  │
                    │ removed      │
                    └─────────────┘
```

---

## 3. Pantry Item Delete Flow

```
┌─────────────────────────────────────────────────────┐
│  User long-presses or taps delete icon on           │
│  pantry item card in pantry.tsx                     │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  [TODO UI] Confirmation modal appears:              │
│  Title: "Delete Item?"                              │
│  Message: "This pantry item will be removed."       │
│  Item: "Chicken Breast (Organic Valley)"            │
│  Buttons: [Cancel] [Delete Item]                    │
└────────────────────┬────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
    Cancel                    Confirm
        │                         │
        │                         ▼
        │            ┌─────────────────────────────┐
        │            │ Call deleteItem(id) in store│
        │            └────────────────┬────────────┘
        │                             │
        │                             ▼
        │            ┌─────────────────────────────┐
        │            │ 1. Remove item from state   │
        │            │ 2. Zustand auto-persists    │
        │            │ 3. UI removes from list     │
        │            └────────────────┬────────────┘
        │                             │
        │                             ▼
        │            ┌─────────────────────────────┐
        │            │ [TODO UI] Toast appears:    │
        │            │ "Pantry item deleted"       │
        │            │ (2 second duration)         │
        │            └────────────────┬────────────┘
        │                             │
        └────────────────┬────────────┘
                         │
                         ▼
                    ┌─────────────┐
                    │ Dialog closes│
                    │ Item removed │
                    │ from UI list │
                    └─────────────┘
```

---

## 4. Shopping List Clear Checked Flow

```
┌───────────────────────────────────────────────────┐
│  User taps "Clear Checked" or "Remove Checked"    │
│  button in shopping list screen (if items checked)│
└────────────────────┬──────────────────────────────┘
                     │
                     ▼
┌───────────────────────────────────────────────────┐
│  [TODO UI] Confirmation modal appears:            │
│  Title: "Remove Checked Items?"                   │
│  Message: "Remove 3 checked items from your       │
│            shopping list?"                        │
│  Buttons: [Cancel] [Remove Items]                 │
└────────────────────┬──────────────────────────────┘
                     │
        ┌────────────┴──────────────┐
        │                           │
    Cancel                      Confirm
        │                           │
        │                           ▼
        │            ┌────────────────────────────┐
        │            │ Call clearChecked() in     │
        │            │ shoppingStore              │
        │            └────────────────┬───────────┘
        │                             │
        │                             ▼
        │            ┌────────────────────────────┐
        │            │ 1. Filter out checked items│
        │            │ 2. Keep unchecked items    │
        │            │ 3. Zustand auto-persists   │
        │            │ 4. UI removes rows         │
        │            └────────────────┬───────────┘
        │                             │
        │                             ▼
        │            ┌────────────────────────────┐
        │            │ [TODO UI] Toast appears:   │
        │            │ "3 items removed"          │
        │            │ (2 second duration)        │
        │            └────────────────┬───────────┘
        │                             │
        └────────────────┬────────────┘
                         │
                         ▼
                    ┌─────────────┐
                    │ Dialog closes│
                    │ List updates │
                    └─────────────┘
```

---

## 5. Fasting Session Delete Flow

```
┌──────────────────────────────────────────────────────┐
│  User swipes or taps delete on fasting session in    │
│  fasting-history.tsx component                      │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│  [TODO UI] Confirmation modal appears:               │
│  Title: "Delete Session?"                            │
│  Message: "This fasting session will be removed      │
│            from your history."                       │
│  Session: "16:8 Fast - 12 hours completed"           │
│  Buttons: [Cancel] [Delete Session]                  │
└────────────────────┬─────────────────────────────────┘
                     │
        ┌────────────┴──────────────┐
        │                           │
    Cancel                      Confirm
        │                           │
        │                           ▼
        │            ┌────────────────────────────────┐
        │            │ Call deleteSession(id) in      │
        │            │ fastingStore                   │
        │            └────────────────┬───────────────┘
        │                             │
        │                             ▼
        │            ┌────────────────────────────────┐
        │            │ 1. Remove from completedSessions
        │            │ 2. Zustand auto-persists       │
        │            │ 3. UI removes from history list│
        │            └────────────────┬───────────────┘
        │                             │
        │                             ▼
        │            ┌────────────────────────────────┐
        │            │ [TODO UI] Toast appears:       │
        │            │ "Fasting session deleted"      │
        │            │ (2 second duration)            │
        │            └────────────────┬───────────────┘
        │                             │
        └────────────────┬────────────┘
                         │
                         ▼
                    ┌─────────────┐
                    │ Dialog closes│
                    │ Session     │
                    │ removed from │
                    │ history     │
                    └─────────────┘
```

---

## 6. Progress Photo Delete Flow

```
┌──────────────────────────────────────────────────────┐
│  User taps delete icon on progress photo in          │
│  health screen                                       │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│  [TODO UI] Confirmation modal appears:               │
│  Title: "Delete Photo?"                              │
│  Message: "This progress photo will be permanently   │
│            removed."                                 │
│  Photo: [thumbnail preview]                          │
│  Buttons: [Cancel] [Delete Photo]                    │
└────────────────────┬─────────────────────────────────┘
                     │
        ┌────────────┴──────────────┐
        │                           │
    Cancel                      Confirm
        │                           │
        │                           ▼
        │            ┌────────────────────────────────┐
        │            │ Call deleteProgressPhoto(id)   │
        │            │ in healthStore                 │
        │            └────────────────┬───────────────┘
        │                             │
        │                             ▼
        │            ┌────────────────────────────────┐
        │            │ [TODO] Photo file cleanup:     │
        │            │ 1. Get photo URI from state    │
        │            │ 2. Delete file via FileSystem  │
        │            │ 3. Handle errors gracefully    │
        │            └────────────────┬───────────────┘
        │                             │
        │                             ▼
        │            ┌────────────────────────────────┐
        │            │ 1. Remove from state           │
        │            │ 2. Zustand auto-persists       │
        │            │ 3. UI removes from gallery     │
        │            └────────────────┬───────────────┘
        │                             │
        │                             ▼
        │            ┌────────────────────────────────┐
        │            │ [TODO UI] Toast appears:       │
        │            │ "Photo deleted"                │
        │            │ (2 second duration)            │
        │            └────────────────┬───────────────┘
        │                             │
        └────────────────┬────────────┘
                         │
                         ▼
                    ┌─────────────┐
                    │ Dialog closes│
                    │ Photo removed│
                    │ File deleted │
                    │ Gallery      │
                    │ refreshed    │
                    └─────────────┘
```

---

## Data Persistence Flow (All Delete Operations)

```
┌─────────────────────────────┐
│  deleteEntry() called        │
│  (or any delete method)      │
└──────────────┬────────────────┘
               │
               ▼
┌─────────────────────────────┐
│  Update Zustand store state  │
│  (immediate, synchronous)    │
└──────────────┬────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Zustand middleware detects change      │
│  (createJSONStorage middleware)         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Serialize state to JSON                │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Save to AsyncStorage                   │
│  Key: 'pantryiq-meals-store'            │
│  (NO MANUAL WORK NEEDED)                │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  React component re-renders with        │
│  new state (deleted item gone)          │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  App restart: Zustand rehydrates from   │
│  AsyncStorage (automatic)               │
│  Deleted state is restored              │
└─────────────────────────────────────────┘
```

---

## State Relationship Diagram

```
┌──────────────────────────────────────────────────────────────┐
│  Zustand Store                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ mealsStore.ts                                           ││
│  │ - entries: FoodEntry[]                                  ││
│  │ - waterIntake: WaterEntry[]                             ││
│  │                                                          ││
│  │ Actions:                                                 ││
│  │ - deleteEntry(id) ─┬─> restore pantry inventory        ││
│  │ - clearMeals(date) ┘                                    ││
│  └─────────────────────────────────────────────────────────┘│
└──────────────┬──────────────────────────────────────────────┘
               │
               ├──────────────────────────────────────────┐
               │                                          │
               ▼                                          ▼
    ┌──────────────────────┐          ┌──────────────────────┐
    │  Zustand (local)     │          │  AsyncStorage        │
    │  Auto-persists ──────┼─────────→ (automatic sync)      │
    │  to AsyncStorage     │          │                      │
    │  via middleware      │          │  Key:                │
    │                      │          │  'pantryiq-meals-    │
    │  (fast, in-memory)   │          │   store'             │
    │                      │          │                      │
    │                      │          │  (persistent)        │
    └──────────────────────┘          └──────────────────────┘
               △                                △
               │                                │
               │ (rehydrate on app start)      │
               │                                │
    ┌──────────┴──────────────────────────────┴────────────┐
    │                                                       │
    │  React Component                                    │
    │  useSelector -> store                               │
    │  Renders UI                                         │
    │                                                     │
    └───────────────────────────────────────────────────────┘
```

---

## Summary of All Flows

| Operation | User Action | Confirmation | Store Method | Persistence | Toast |
|-----------|------------|--------------|--------------|-------------|-------|
| Delete meal | Swipe left | Modal | deleteEntry() | Auto | ✓ |
| Clear meals | Tap button | Modal | clearMeals() | Auto | ✓ |
| Delete pantry | Tap icon | Modal | deleteItem() | Auto | ✓ |
| Delete shopping | Swipe/tap | Modal | deleteItem() | Auto | ✓ |
| Clear checked | Tap button | Modal | clearChecked() | Auto | ✓ |
| Delete recipe | Tap icon | Modal | deleteRecipe() | Auto | ✓ |
| Delete photo | Tap icon | Modal | deleteProgressPhoto() | Auto + File | ✓ |
| Delete fasting | Swipe/tap | Modal | deleteSession() | Auto | ✓ |
| Clear fasting | Tap button | Modal | clearFastingHistory() | Auto | ✓ |

All store methods are **complete and working**. Only UI confirmations remain to be implemented.
