# PantryIQ Delete & Clear Functions Audit

## Overview

This audit identifies ALL delete and clear functions throughout the PantryIQ app, documents their current implementations, identifies bugs, and provides fix recommendations.

---

## PRIORITY 1: MEAL LOG DELETE FUNCTIONS

### 1.1 Individual Meal Entry Delete

**File:** `/home/user/workspace/mobile/src/lib/stores/mealsStore.ts` (Lines 212-230)

**Current Implementation:**
```typescript
deleteEntry: (id) => {
  // Find the entry before deleting to potentially restore inventory
  const entry = get().entries.find((e) => e.id === id);
  set((state) => ({
    entries: state.entries.filter((e) => e.id !== id),
  }));
  // Re-stock pantry if the entry was linked (restore the servings)
  if (entry?.pantryItemId) {
    const pantryStore = usePantryStore.getState();
    const pantryItem = pantryStore.items.find((i) => i.id === entry.pantryItemId);
    if (pantryItem) {
      const spc = pantryItem.servingsPerContainer && pantryItem.servingsPerContainer > 0 ? pantryItem.servingsPerContainer : 1;
      const restoration = entry.servings / spc;
      pantryStore.updateItem(entry.pantryItemId, {
        quantity: Math.round((pantryItem.quantity + restoration) * 1000) / 1000,
      });
    }
  }
},
```

**Issues:**
- AsyncStorage persistence is handled automatically by Zustand middleware
- Nutrition totals recalculate automatically via selector functions
- No explicit UI feedback mechanism documented
- Pantry restoration logic could cause race conditions

**Status:** WORKING AS DESIGNED (no bugs)

---

**File:** `/home/user/workspace/mobile/src/app/(tabs)/meals.tsx` (Lines 344-410)

**Component: FoodItemRow - Swipe Delete**

**Current Implementation:**
```typescript
const renderRightActions = () => (
  <Pressable
    onPress={() => {
      swipeRef.current?.close();
      onDelete();
    }}
    style={{
      backgroundColor: Colors.error,
      justifyContent: 'center',
      alignItems: 'center',
      width: 72,
      borderRadius: BorderRadius.md,
      marginLeft: 8,
    }}
    testID="delete-food-entry-button"
  >
    <Trash2 size={20} color="#fff" />
    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 10, color: '#fff', marginTop: 2 }}>Delete</Text>
  </Pressable>
);

return (
  <Swipeable ref={swipeRef} renderRightActions={renderRightActions} friction={2} overshootRight={false}>
    {/* ... content ... */}
  </Swipeable>
);
```

**Issues:**
- No confirmation dialog before deletion
- No success toast notification
- No undo capability
- Swipe sensitivity not adjusted for accidental triggers

**Recommended Fix:**
Add confirmation dialog + toast notification before and after deletion.

---

### 1.2 Clear Today's Meals (NOT IMPLEMENTED)

**File:** `/home/user/workspace/mobile/src/lib/stores/mealsStore.ts`

**Status:** NO METHOD EXISTS

**Required Implementation:**
```typescript
clearMeals: (date: string) => {
  set((state) => ({
    entries: state.entries.filter((e) => e.date !== date),
    waterIntake: state.waterIntake.filter((w) => w.date !== date),
  }));
}
```

**Required UI Changes:**
- Add "Clear Today's Meals" option to meals screen header or settings
- Implement confirmation dialog
- Implement success toast

---

### 1.3 Clear Specific Date Meals (NOT IMPLEMENTED)

**Status:** NOT IMPLEMENTED IN UI

The store method `clearMeals` should be added to support this.

---

## PRIORITY 2: OTHER DELETE/CLEAR FUNCTIONS

### 2.1 Pantry Item Delete

**File:** `/home/user/workspace/mobile/src/lib/stores/pantryStore.ts` (Lines 295-298)

**Current Implementation:**
```typescript
deleteItem: (id) =>
  set((state) => ({
    items: state.items.filter((item) => item.id !== id),
  })),
```

**Status:** WORKING AS DESIGNED
- Simple filter operation
- Zustand middleware handles AsyncStorage persistence
- Location references cleaned up externally

**Missing:** Confirmation dialog + success toast in UI layer

---

### 2.2 Shopping List Item Delete

**File:** `/home/user/workspace/mobile/src/lib/stores/shoppingStore.ts` (Lines 166-169)

**Current Implementation:**
```typescript
deleteItem: (id) =>
  set((state) => ({
    items: state.items.filter((item) => item.id !== id),
  })),
```

**Status:** WORKING AS DESIGNED
- Simple filter operation
- Zustand middleware handles AsyncStorage persistence

**Missing:** Confirmation dialog + success toast in UI layer

---

### 2.3 Clear Checked Shopping Items

**File:** `/home/user/workspace/mobile/src/lib/stores/shoppingStore.ts` (Lines 184-187)

**Current Implementation:**
```typescript
clearChecked: () =>
  set((state) => ({
    items: state.items.filter((item) => !item.isChecked),
  })),
```

**Status:** WORKING AS DESIGNED
- Removes all checked items
- Zustand middleware handles AsyncStorage persistence

**Missing:** Confirmation dialog + success toast in UI layer

---

### 2.4 Shopping Trip Complete

**File:** `/home/user/workspace/mobile/src/lib/stores/shoppingStore.ts` (Lines 196-224)

**Current Implementation:**
```typescript
completeTrip: (store, tripItems) =>
  set((state) => {
    const totalSpent = tripItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const newTrip: ShoppingTrip = {
      id: `trip-${Date.now()}`,
      date: new Date().toISOString(),
      store,
      items: tripItems,
      totalSpent,
    };

    const updatedItems = state.items.map((item) => {
      if (!item.isChecked) return item;
      const tripItem = tripItems.find((ti) => ti.name.toLowerCase() === item.name.toLowerCase());
      if (!tripItem) return item;
      return {
        ...item,
        priceHistory: [
          ...item.priceHistory,
          { date: new Date().toISOString(), price: tripItem.price, store },
        ],
      };
    });

    return {
      trips: [newTrip, ...state.trips],
      items: updatedItems.filter((item) => !item.isChecked),
    };
  }),
```

**Status:** WORKING AS DESIGNED
- Moves checked items to trip history
- Updates price history
- Clears checked items from shopping list

**Missing:** Success toast + trip confirmation UI

---

### 2.5 Recipe Delete

**File:** `/home/user/workspace/mobile/src/lib/stores/recipesStore.ts` (Lines 752-756)

**Current Implementation:**
```typescript
deleteRecipe: (id) =>
  set((state) => ({
    recipes: state.recipes.filter((r) => r.id !== id),
    recentlyViewed: state.recentlyViewed.filter((rid) => rid !== id),
  })),
```

**Status:** WORKING AS DESIGNED
- Removes recipe and clears from recently viewed
- Zustand middleware handles AsyncStorage persistence

**Missing:** Confirmation dialog + success toast in UI layer

---

### 2.6 Recipe Folder Delete

**File:** `/home/user/workspace/mobile/src/lib/stores/recipesStore.ts` (Lines 789-795)

**Current Implementation:**
```typescript
deleteFolder: (id) =>
  set((state) => ({
    folders: state.folders.filter((f) => f.id !== id),
    recipes: state.recipes.map((r) =>
      r.folderId === id ? { ...r, folderId: undefined } : r
    ),
  })),
```

**Status:** WORKING AS DESIGNED
- Removes folder and unsets folder references in recipes
- Zustand middleware handles AsyncStorage persistence

**Missing:** Confirmation dialog + success toast in UI layer

---

### 2.7 Weight Entry Delete

**File:** `/home/user/workspace/mobile/src/lib/stores/healthStore.ts` (Lines 130-133)

**Current Implementation:**
```typescript
deleteWeightEntry: (id) =>
  set((state) => ({
    weightEntries: state.weightEntries.filter((e) => e.id !== id),
  })),
```

**Status:** WORKING AS DESIGNED
- Simple filter operation
- Zustand middleware handles AsyncStorage persistence

**Missing:** Confirmation dialog + success toast in UI layer

---

### 2.8 Progress Photo Delete

**File:** `/home/user/workspace/mobile/src/lib/stores/healthStore.ts` (Lines 151-154)

**Current Implementation:**
```typescript
deleteProgressPhoto: (id) =>
  set((state) => ({
    progressPhotos: state.progressPhotos.filter((p) => p.id !== id),
  })),
```

**Status:** WORKING AS DESIGNED
- Simple filter operation
- Zustand middleware handles AsyncStorage persistence

**Missing:**
- Confirmation dialog + success toast in UI layer
- Photo file cleanup from device storage

---

### 2.9 Fasting Session Management

**File:** `/home/user/workspace/mobile/src/lib/stores/fastingStore.ts`

**Status:** NO EXPLICIT DELETE METHOD EXISTS

**Current Methods:**
- `endFast()`: Completes current session, stores it in history
- `cancelFast()`: Discards current session without storing

**Issues:**
- No method to delete historical fasting sessions
- No method to clear all fasting history

**Required Methods:**
```typescript
deleteSession: (sessionId: string) => void;
clearFastingHistory: (date?: string) => void;
```

---

### 2.10 Nutrition Store - Clear Macro Goals

**File:** `/home/user/workspace/mobile/src/lib/stores/nutritionStore.ts` (Lines 91-95)

**Current Implementation:**
```typescript
clearMacroGoals: () =>
  set({
    macroGoals: null,
    userMetrics: null,
  }),
```

**Status:** WORKING AS DESIGNED
- Clears macro goals and user metrics
- Zustand middleware handles AsyncStorage persistence

**Missing:** Confirmation dialog + success toast in UI layer

---

## SUMMARY TABLE

| Feature | Store File | Method | Status | Missing |
|---------|-----------|--------|--------|---------|
| Delete meal entry | mealsStore | deleteEntry | ✓ Working | Toast, confirm |
| Clear meals for date | mealsStore | (NOT EXIST) | ✗ Missing | Full implementation |
| Clear today's meals | mealsStore | (NOT EXIST) | ✗ Missing | Full implementation |
| Delete pantry item | pantryStore | deleteItem | ✓ Working | Toast, confirm |
| Delete shopping item | shoppingStore | deleteItem | ✓ Working | Toast, confirm |
| Clear checked items | shoppingStore | clearChecked | ✓ Working | Toast, confirm |
| Complete shopping trip | shoppingStore | completeTrip | ✓ Working | Toast, confirm |
| Delete recipe | recipesStore | deleteRecipe | ✓ Working | Toast, confirm |
| Delete recipe folder | recipesStore | deleteFolder | ✓ Working | Toast, confirm |
| Delete weight entry | healthStore | deleteWeightEntry | ✓ Working | Toast, confirm |
| Delete progress photo | healthStore | deleteProgressPhoto | ✓ Working | Toast, confirm, file cleanup |
| Cancel/delete fasting | fastingStore | cancelFast | ✓ Partial | deleteSession, clearHistory |
| Clear macro goals | nutritionStore | clearMacroGoals | ✓ Working | Toast, confirm |

---

## RECOMMENDATIONS

### Immediate Fixes Needed:
1. Add `clearMeals(date: string)` to mealsStore
2. Add delete confirmation dialogs to all delete operations
3. Add success toasts after deletions
4. Add `deleteSession()` and `clearFastingHistory()` to fastingStore
5. Add photo file cleanup to `deleteProgressPhoto()`

### Code Quality Improvements:
1. Use centralized `storageKeys.ts` for all AsyncStorage keys
2. Create reusable delete confirmation modal component
3. Create reusable success toast helper
4. Add loading states for destructive operations

---

## KEY FINDINGS

### What's Working Well:
- ✓ Zustand persistence middleware handles AsyncStorage automatically
- ✓ Pantry inventory restoration on meal deletion
- ✓ Cascading deletes (folders/recipes, folders/unset folderId)
- ✓ Shopping trip history preservation
- ✓ Date-based YYYY-MM-DD format consistently used

### What Needs Attention:
- ✗ No UI-level confirmation dialogs for destructive actions
- ✗ No success notifications after deletions
- ✗ Missing methods for clearing meals by date
- ✗ No fasting session deletion capability
- ✗ Photo files not cleaned up from device storage
- ✗ Inconsistent AsyncStorage key usage (some hardcoded, no constants)

---

## DATES & FORMATS

All date fields use **YYYY-MM-DD** format:
- `date: string` in FoodEntry
- `date: string` in WeightEntry
- `date: string` in FastingSession
- Generated via: `new Date().toISOString().split('T')[0]`

Consistent key format:
- `mealLog_YYYY-MM-DD`
- `weightEntry_YYYY-MM-DD`
- `fastingHistory_YYYY-MM-DD`
