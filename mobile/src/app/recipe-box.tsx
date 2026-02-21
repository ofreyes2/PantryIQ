import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Plus, Clock, Heart, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useRecipesStore, Recipe, RecipeFolder } from '@/lib/stores/recipesStore';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORY_GRADIENTS: Record<string, [string, string]> = {
  Breakfast: ['#F39C12', '#E67E22'],
  Lunch: ['#27AE60', '#2ECC71'],
  Dinner: ['#2C3E50', '#3498DB'],
  Snack: ['#8E44AD', '#9B59B6'],
  Dessert: ['#E74C3C', '#C0392B'],
  Side: ['#16A085', '#1ABC9C'],
  default: ['#0F2040', '#162645'],
};

function getCategoryGradient(category: string): [string, string] {
  return CATEGORY_GRADIENTS[category] ?? CATEGORY_GRADIENTS.default;
}

const SORT_OPTIONS = ['Newest', 'A-Z', 'Lowest Carbs', 'Favorites'] as const;
type SortOption = typeof SORT_OPTIONS[number];

const FOLDER_COLORS = ['#2ECC71', '#F39C12', '#3498DB', '#E74C3C', '#9B59B6', '#1ABC9C'];

function RecipeGridCard({ recipe, onPress, onLongPress }: { recipe: Recipe; onPress: () => void; onLongPress: () => void }) {
  const gradColors = getCategoryGradient(recipe.category);
  const cardWidth = (SCREEN_WIDTH - Spacing.md * 2 - 12) / 2;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={{ width: cardWidth, height: 180, borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: 12 }}
      testID={`recipe-grid-card-${recipe.id}`}
    >
      <LinearGradient colors={gradColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 }}
        />
        {recipe.isFavorite ? (
          <View style={{ position: 'absolute', top: 8, right: 8 }}>
            <Heart size={14} color="#E74C3C" fill="#E74C3C" />
          </View>
        ) : null}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10 }}>
          <Text
            style={{ fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.textPrimary, marginBottom: 4 }}
            numberOfLines={2}
          >
            {recipe.title}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Clock size={9} color="rgba(255,255,255,0.6)" />
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>
                {recipe.prepTime + recipe.cookTime}m
              </Text>
            </View>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>
              {recipe.netCarbsPerServing}g carbs
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export default function RecipeBoxScreen() {
  const router = useRouter();
  const recipes = useRecipesStore((s) => s.recipes);
  const folders = useRecipesStore((s) => s.folders);
  const addFolder = useRecipesStore((s) => s.addFolder);
  const deleteFolder = useRecipesStore((s) => s.deleteFolder);
  const deleteRecipe = useRecipesStore((s) => s.deleteRecipe);
  const moveToFolder = useRecipesStore((s) => s.moveToFolder);

  const [activeFolder, setActiveFolder] = useState<string>('All');
  const [sortBy, setSortBy] = useState<SortOption>('Newest');
  const [newFolderModalVisible, setNewFolderModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFolderColor, setSelectedFolderColor] = useState(FOLDER_COLORS[0]);
  const [longPressRecipe, setLongPressRecipe] = useState<Recipe | null>(null);
  const [moveFolderModalVisible, setMoveFolderModalVisible] = useState(false);

  const filteredRecipes = React.useMemo(() => {
    let list = activeFolder === 'All'
      ? recipes
      : recipes.filter((r) => r.folderId === activeFolder);

    switch (sortBy) {
      case 'A-Z':
        list = [...list].sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'Lowest Carbs':
        list = [...list].sort((a, b) => a.netCarbsPerServing - b.netCarbsPerServing);
        break;
      case 'Favorites':
        list = [...list].sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));
        break;
      case 'Newest':
      default:
        list = [...list].sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
        break;
    }
    return list;
  }, [recipes, activeFolder, sortBy]);

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    addFolder(newFolderName.trim(), selectedFolderColor);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNewFolderName('');
    setNewFolderModalVisible(false);
  };

  const handleDeleteRecipe = (id: string) => {
    Alert.alert('Delete Recipe', 'Remove this recipe from your box?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteRecipe(id);
          setLongPressRecipe(null);
        },
      },
    ]);
  };

  const getRecipeCountForFolder = (folderId: string) =>
    recipes.filter((r) => r.folderId === folderId).length;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.navy }} testID="recipe-box-screen">
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: Spacing.md,
            paddingVertical: 14,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable
              onPress={() => router.back()}
              style={{
                width: 40,
                height: 40,
                borderRadius: BorderRadius.full,
                backgroundColor: Colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14,
                borderWidth: 1,
                borderColor: Colors.border,
              }}
              testID="back-button"
            >
              <ArrowLeft size={20} color={Colors.textPrimary} />
            </Pressable>
            <Text style={{ fontFamily: 'PlayfairDisplay_700Bold', fontSize: 24, color: Colors.textPrimary }}>
              Recipe Box
            </Text>
          </View>
          <Pressable
            onPress={() => setNewFolderModalVisible(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: Colors.greenMuted,
              borderRadius: BorderRadius.full,
              paddingHorizontal: 14,
              paddingVertical: 8,
              gap: 6,
              borderWidth: 1,
              borderColor: 'rgba(46,204,113,0.3)',
            }}
            testID="new-folder-button"
          >
            <Plus size={14} color={Colors.green} />
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.green }}>
              New Folder
            </Text>
          </Pressable>
        </View>

        {/* Folder Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 12, gap: 8 }}
        >
          {/* All tab */}
          <Pressable
            onPress={() => setActiveFolder('All')}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: BorderRadius.full,
              backgroundColor: activeFolder === 'All' ? Colors.green : Colors.surface,
              borderWidth: 1,
              borderColor: activeFolder === 'All' ? Colors.green : Colors.border,
            }}
            testID="folder-all"
          >
            <Text
              style={{
                fontFamily: 'DMSans_700Bold',
                fontSize: 13,
                color: activeFolder === 'All' ? Colors.navy : Colors.textSecondary,
              }}
            >
              All ({recipes.length})
            </Text>
          </Pressable>

          {folders.map((folder) => {
            const count = getRecipeCountForFolder(folder.id);
            const isActive = activeFolder === folder.id;
            return (
              <Pressable
                key={folder.id}
                onPress={() => setActiveFolder(folder.id)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: BorderRadius.full,
                  backgroundColor: isActive ? folder.color : Colors.surface,
                  borderWidth: 1,
                  borderColor: isActive ? folder.color : Colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
                testID={`folder-tab-${folder.id}`}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: isActive ? Colors.navy : folder.color,
                  }}
                />
                <Text
                  style={{
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 13,
                    color: isActive ? Colors.navy : Colors.textSecondary,
                  }}
                >
                  {folder.name} ({count})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Sort Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 12, gap: 6 }}
        >
          {SORT_OPTIONS.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => setSortBy(opt)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: BorderRadius.full,
                backgroundColor: sortBy === opt ? Colors.surface : 'transparent',
                borderWidth: 1,
                borderColor: sortBy === opt ? Colors.border : 'transparent',
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 12,
                  color: sortBy === opt ? Colors.textPrimary : Colors.textTertiary,
                }}
              >
                {opt}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Recipe Grid */}
        <FlatList
          data={filteredRecipes}
          numColumns={2}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: Spacing.md }}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: Colors.textTertiary }}>
                No recipes in this folder yet
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <RecipeGridCard
              recipe={item}
              onPress={() => router.push(`/recipe-detail?id=${item.id}`)}
              onLongPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setLongPressRecipe(item);
              }}
            />
          )}
        />

        {/* New Folder Modal */}
        <Modal
          visible={newFolderModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setNewFolderModalVisible(false)}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
            onPress={() => setNewFolderModalVisible(false)}
          >
            <View
              style={{
                backgroundColor: Colors.navyCard,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: Spacing.lg,
                paddingBottom: 40,
                borderWidth: 1,
                borderColor: Colors.border,
              }}
            >
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 20 }} />
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.textPrimary, marginBottom: 16 }}>
                New Folder
              </Text>
              <TextInput
                value={newFolderName}
                onChangeText={setNewFolderName}
                placeholder="Folder name..."
                placeholderTextColor={Colors.textTertiary}
                style={{
                  backgroundColor: Colors.surface,
                  borderRadius: BorderRadius.md,
                  padding: Spacing.md,
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 15,
                  color: Colors.textPrimary,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  marginBottom: 16,
                }}
                autoFocus
                testID="folder-name-input"
              />
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textSecondary, marginBottom: 10 }}>
                Color
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                {FOLDER_COLORS.map((color) => (
                  <Pressable
                    key={color}
                    onPress={() => setSelectedFolderColor(color)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: BorderRadius.full,
                      backgroundColor: color,
                      borderWidth: selectedFolderColor === color ? 3 : 0,
                      borderColor: Colors.textPrimary,
                    }}
                  />
                ))}
              </View>
              <Pressable
                onPress={handleCreateFolder}
                style={{
                  backgroundColor: Colors.green,
                  borderRadius: BorderRadius.md,
                  padding: 14,
                  alignItems: 'center',
                }}
                testID="create-folder-button"
              >
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.navy }}>
                  Create Folder
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        {/* Long Press Options Modal */}
        <Modal
          visible={longPressRecipe !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setLongPressRecipe(null)}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
            onPress={() => setLongPressRecipe(null)}
          >
            <View
              style={{
                backgroundColor: Colors.navyCard,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: Spacing.lg,
                paddingBottom: 40,
                borderWidth: 1,
                borderColor: Colors.border,
              }}
            >
              {longPressRecipe ? (
                <>
                  <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 16 }} />
                  <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary, marginBottom: 16 }} numberOfLines={1}>
                    {longPressRecipe.title}
                  </Text>

                  <Pressable
                    onPress={() => {
                      setLongPressRecipe(null);
                      setMoveFolderModalVisible(true);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: Spacing.md,
                      borderRadius: BorderRadius.md,
                      backgroundColor: Colors.surface,
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: Colors.textPrimary }}>
                      Move to Folder
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => longPressRecipe && handleDeleteRecipe(longPressRecipe.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: Spacing.md,
                      borderRadius: BorderRadius.md,
                      backgroundColor: Colors.errorMuted,
                      borderWidth: 1,
                      borderColor: 'rgba(231,76,60,0.3)',
                    }}
                  >
                    <Trash2 size={16} color={Colors.error} />
                    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: Colors.error, marginLeft: 10 }}>
                      Delete Recipe
                    </Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          </Pressable>
        </Modal>

        {/* Move to Folder Modal */}
        <Modal
          visible={moveFolderModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMoveFolderModalVisible(false)}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
            onPress={() => setMoveFolderModalVisible(false)}
          >
            <View
              style={{
                backgroundColor: Colors.navyCard,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: Spacing.lg,
                paddingBottom: 40,
                borderWidth: 1,
                borderColor: Colors.border,
              }}
            >
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 20 }} />
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 18, color: Colors.textPrimary, marginBottom: 16 }}>
                Move to Folder
              </Text>
              {folders.map((folder: RecipeFolder) => (
                <Pressable
                  key={folder.id}
                  onPress={() => {
                    if (longPressRecipe) {
                      moveToFolder(longPressRecipe.id, folder.id);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setMoveFolderModalVisible(false);
                    setLongPressRecipe(null);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: Spacing.md,
                    borderRadius: BorderRadius.md,
                    backgroundColor: Colors.surface,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: Colors.border,
                  }}
                >
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: folder.color, marginRight: 12 }} />
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: Colors.textPrimary }}>
                    {folder.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </View>
  );
}
