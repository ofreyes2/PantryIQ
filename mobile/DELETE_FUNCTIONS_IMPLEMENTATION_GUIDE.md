// Reusable Delete Confirmation Modal Component
// Location: src/components/DeleteConfirmationModal.tsx

import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Colors, BorderRadius } from '@/constants/theme';

interface DeleteConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  itemName?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DeleteConfirmationModal({
  visible,
  title,
  message,
  itemName,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isDestructive = true,
  onConfirm,
  onCancel,
  isLoading = false,
}: DeleteConfirmationModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
        }}
      >
        <View
          style={{
            backgroundColor: Colors.navyCard,
            borderRadius: BorderRadius.lg,
            padding: 24,
            width: '100%',
            maxWidth: 320,
          }}
        >
          <Text
            style={{
              fontFamily: 'DMSans_700Bold',
              fontSize: 18,
              color: Colors.textPrimary,
              marginBottom: 12,
            }}
          >
            {title}
          </Text>

          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 14,
              color: Colors.textSecondary,
              marginBottom: itemName ? 4 : 20,
              lineHeight: 20,
            }}
          >
            {message}
          </Text>

          {itemName && (
            <Text
              style={{
                fontFamily: 'DMSans_700Bold',
                fontSize: 14,
                color: Colors.textPrimary,
                marginBottom: 20,
              }}
            >
              "{itemName}"
            </Text>
          )}

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              onPress={onCancel}
              disabled={isLoading}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: BorderRadius.md,
                borderWidth: 1,
                borderColor: Colors.border,
                alignItems: 'center',
              }}
              testID="delete-modal-cancel-btn"
            >
              <Text
                style={{
                  fontFamily: 'DMSans_600SemiBold',
                  fontSize: 14,
                  color: Colors.textSecondary,
                }}
              >
                {cancelText}
              </Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              disabled={isLoading}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: BorderRadius.md,
                backgroundColor: isDestructive ? Colors.error : Colors.green,
                alignItems: 'center',
                opacity: isLoading ? 0.6 : 1,
              }}
              testID="delete-modal-confirm-btn"
            >
              <Text
                style={{
                  fontFamily: 'DMSans_600SemiBold',
                  fontSize: 14,
                  color: '#fff',
                }}
              >
                {isLoading ? 'Deleting...' : confirmText}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

---

// Success Toast Helper
// Location: src/lib/toastHelper.ts

import { Toast } from '@/components/Toast';

export const showDeleteSuccessToast = (itemType: string, itemName?: string) => {
  const message = itemName
    ? `${itemType} "${itemName}" deleted`
    : `${itemType} deleted`;

  Toast.show({
    type: 'success',
    text1: 'Deleted',
    text2: message,
    duration: 2000,
  });
};

export const showClearSuccessToast = (message: string) => {
  Toast.show({
    type: 'success',
    text1: 'Cleared',
    text2: message,
    duration: 2000,
  });
};

---

// IMPLEMENTATION EXAMPLES FOR EACH FEATURE

// 1. MEAL ENTRY DELETE WITH CONFIRMATION
// Location: src/app/(tabs)/meals.tsx - Update FoodItemRow component

function FoodItemRow({ entry, onDelete, onToggleFavorite }: {
  entry: FoodEntry;
  onDelete: () => void;
  onToggleFavorite: () => void;
}) {
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const swipeRef = useRef<Swipeable>(null);

  const handleDeletePress = () => {
    setDeleteConfirmVisible(true);
    swipeRef.current?.close();
  };

  const handleConfirmDelete = () => {
    onDelete();
    setDeleteConfirmVisible(false);
    showDeleteSuccessToast('Meal', entry.name);
  };

  const renderRightActions = () => (
    <Pressable
      onPress={handleDeletePress}
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
      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 10, color: '#fff', marginTop: 2 }}>
        Delete
      </Text>
    </Pressable>
  );

  return (
    <>
      <Swipeable ref={swipeRef} renderRightActions={renderRightActions} friction={2} overshootRight={false}>
        {/* ... existing content ... */}
      </Swipeable>

      <DeleteConfirmationModal
        visible={deleteConfirmVisible}
        title="Delete Meal?"
        message="This meal entry will be permanently removed. Linked pantry items will be restocked."
        itemName={entry.name}
        confirmText="Delete Meal"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmVisible(false)}
        testID="delete-meal-modal"
      />
    </>
  );
}

---

// 2. CLEAR TODAY'S MEALS
// Location: src/app/(tabs)/meals.tsx - Add to MealsScreen component

function MealsScreen() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [clearMealsConfirmVisible, setClearMealsConfirmVisible] = useState(false);

  const clearMeals = useMealsStore((s) => s.clearMeals);
  const getEntriesForDate = useMealsStore((s) => s.getEntriesForDate);

  const dateStr = toDateStr(currentDate);
  const entries = getEntriesForDate(dateStr);

  const handleClearMeals = () => {
    clearMeals(dateStr);
    setClearMealsConfirmVisible(false);
    showClearSuccessToast(`All meals cleared for ${formatDate(currentDate)}`);
  };

  return (
    <>
      {/* Existing content */}

      {/* Add this button to header */}
      {entries.length > 0 && (
        <Pressable
          onPress={() => setClearMealsConfirmVisible(true)}
          testID="clear-meals-btn"
        >
          <Text style={{ color: Colors.error }}>Clear All</Text>
        </Pressable>
      )}

      <DeleteConfirmationModal
        visible={clearMealsConfirmVisible}
        title="Clear All Meals?"
        message={`Remove all ${entries.length} meal entries for ${formatDate(currentDate)}? Linked pantry items will be restocked.`}
        confirmText="Clear All Meals"
        onConfirm={handleClearMeals}
        onCancel={() => setClearMealsConfirmVisible(false)}
        testID="clear-meals-modal"
      />
    </>
  );
}

---

// 3. DELETE PANTRY ITEM
// Location: src/components/PantryItemCard.tsx (or wherever pantry items are displayed)

interface PantryItemCardProps {
  item: PantryItem;
  onDelete: (id: string) => void;
}

function PantryItemCard({ item, onDelete }: PantryItemCardProps) {
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  const handleConfirmDelete = () => {
    onDelete(item.id);
    setDeleteConfirmVisible(false);
    showDeleteSuccessToast('Pantry item', item.name);
  };

  return (
    <>
      <View>
        {/* Item content */}
        <Pressable
          onPress={() => setDeleteConfirmVisible(true)}
          testID={`delete-pantry-${item.id}`}
        >
          <Trash2 size={20} color={Colors.error} />
        </Pressable>
      </View>

      <DeleteConfirmationModal
        visible={deleteConfirmVisible}
        title="Delete Item?"
        message="This pantry item will be permanently removed."
        itemName={item.name}
        confirmText="Delete Item"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmVisible(false)}
        testID={`delete-pantry-modal-${item.id}`}
      />
    </>
  );
}

---

// 4. CLEAR CHECKED SHOPPING ITEMS
// Location: src/app/shopping-list.tsx

function ShoppingListScreen() {
  const items = useShoppingStore((s) => s.items);
  const clearChecked = useShoppingStore((s) => s.clearChecked);
  const [clearCheckedConfirmVisible, setClearCheckedConfirmVisible] = useState(false);

  const checkedCount = items.filter((i) => i.isChecked).length;

  const handleConfirmClearChecked = () => {
    clearChecked();
    setClearCheckedConfirmVisible(false);
    showClearSuccessToast(`${checkedCount} items removed from list`);
  };

  return (
    <>
      {checkedCount > 0 && (
        <Pressable
          onPress={() => setClearCheckedConfirmVisible(true)}
          testID="clear-checked-btn"
        >
          <Text>Clear Checked ({checkedCount})</Text>
        </Pressable>
      )}

      <DeleteConfirmationModal
        visible={clearCheckedConfirmVisible}
        title="Remove Checked Items?"
        message={`Remove ${checkedCount} checked items from your shopping list?`}
        confirmText="Remove Items"
        onConfirm={handleConfirmClearChecked}
        onCancel={() => setClearCheckedConfirmVisible(false)}
        testID="clear-checked-modal"
      />
    </>
  );
}

---

// 5. DELETE PROGRESS PHOTO WITH FILE CLEANUP
// Location: src/lib/stores/healthStore.ts - Update deleteProgressPhoto

import * as FileSystem from 'expo-file-system';

deleteProgressPhoto: (id) => {
  const photo = get().progressPhotos.find((p) => p.id === id);

  // Clean up photo file from device storage
  if (photo?.uri) {
    FileSystem.deleteAsync(photo.uri, { idempotent: true }).catch((err) => {
      console.warn('Failed to delete photo file:', err);
    });
  }

  set((state) => ({
    progressPhotos: state.progressPhotos.filter((p) => p.id !== id),
  }));
},

---

// 6. CLEAR FASTING HISTORY WITH CONFIRMATION
// Location: src/app/fasting-history.tsx

function FastingHistoryScreen() {
  const clearFastingHistory = useFastingStore((s) => s.clearFastingHistory);
  const [clearAllConfirmVisible, setClearAllConfirmVisible] = useState(false);

  const handleConfirmClearAll = () => {
    clearFastingHistory();
    setClearAllConfirmVisible(false);
    showClearSuccessToast('All fasting history cleared');
  };

  return (
    <>
      <Pressable
        onPress={() => setClearAllConfirmVisible(true)}
        testID="clear-fasting-history-btn"
      >
        <Text>Clear All History</Text>
      </Pressable>

      <DeleteConfirmationModal
        visible={clearAllConfirmVisible}
        title="Clear All History?"
        message="This will permanently delete all fasting session records. This cannot be undone."
        confirmText="Clear All History"
        onConfirm={handleConfirmClearAll}
        onCancel={() => setClearAllConfirmVisible(false)}
        testID="clear-fasting-history-modal"
      />
    </>
  );
}

---

// 7. CLEAR MACRO GOALS WITH CONFIRMATION
// Location: src/app/nutrition-setup.tsx

function NutritionSetupScreen() {
  const clearMacroGoals = useNutritionStore((s) => s.clearMacroGoals);
  const [clearGoalsConfirmVisible, setClearGoalsConfirmVisible] = useState(false);

  const handleConfirmClear = () => {
    clearMacroGoals();
    setClearGoalsConfirmVisible(false);
    showClearSuccessToast('Nutrition goals cleared');
  };

  return (
    <>
      <Pressable
        onPress={() => setClearGoalsConfirmVisible(true)}
        testID="clear-macro-goals-btn"
      >
        <Text>Clear All Goals</Text>
      </Pressable>

      <DeleteConfirmationModal
        visible={clearGoalsConfirmVisible}
        title="Clear Nutrition Goals?"
        message="This will remove your macro goals and user metrics. You can set new ones anytime."
        confirmText="Clear Goals"
        onConfirm={handleConfirmClear}
        onCancel={() => setClearGoalsConfirmVisible(false)}
        testID="clear-macro-goals-modal"
      />
    </>
  );
}

---

## KEY IMPLEMENTATION NOTES

1. **Confirmation Dialogs:**
   - Always require confirmation before destructive actions
   - Include item name when available
   - Explain consequences (e.g., "Pantry will be restocked")

2. **Toast Notifications:**
   - Show success toast immediately after deletion
   - Include item name and type
   - Duration: 2000ms (2 seconds)

3. **Loading States:**
   - Disable buttons during async operations
   - Show "Deleting..." text
   - Important for file cleanup operations

4. **Date Handling:**
   - Use YYYY-MM-DD format consistently
   - Use helper function: `toDateStr(new Date())`
   - All meal entries include date for clearing by date

5. **Pantry Restoration:**
   - Always restore pantry inventory when deleting meals
   - Handle fractional servings correctly
   - Update both deleteEntry and clearMeals

6. **File Cleanup:**
   - Use expo-file-system for photo deletion
   - Use idempotent: true to avoid errors
   - Wrap in try-catch to prevent crashes

7. **Testing:**
   - Use testID props on all interactive elements
   - Test both confirm and cancel paths
   - Verify data is actually deleted from store
