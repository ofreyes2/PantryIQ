import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RecipeIngredient {
  name: string;
  quantity: string;
  unit: string;
  optional?: boolean;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  heroImage?: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  netCarbsPerServing: number;
  caloriesPerServing: number;
  proteinPerServing: number;
  fatPerServing: number;
  category: string;
  tags: string[];
  ingredients: RecipeIngredient[];
  instructions: string[];
  notes?: string;
  rating?: number;
  userNotes?: string;
  isFavorite: boolean;
  isUserCreated: boolean;
  sourceUrl?: string;
  folderId?: string;
  dateAdded: string;
  lastViewed?: string;
}

export interface RecipeFolder {
  id: string;
  name: string;
  color: string;
  recipeCount: number;
}

interface RecipesState {
  recipes: Recipe[];
  folders: RecipeFolder[];
  recentlyViewed: string[];
  addRecipe: (recipe: Omit<Recipe, 'id' | 'dateAdded'>) => void;
  updateRecipe: (id: string, updates: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;
  toggleFavorite: (id: string) => void;
  markViewed: (id: string) => void;
  addFolder: (name: string, color: string) => void;
  deleteFolder: (id: string) => void;
  moveToFolder: (recipeId: string, folderId: string) => void;
  getFavorites: () => Recipe[];
  getByFolder: (folderId: string) => Recipe[];
  getRecentlyViewed: () => Recipe[];
}

const generateId = () => `recipe-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const seedFolders: RecipeFolder[] = [
  { id: 'folder-1', name: 'Keto Favorites', color: '#2ECC71', recipeCount: 0 },
  { id: 'folder-2', name: 'Quick Meals', color: '#F39C12', recipeCount: 0 },
  { id: 'folder-3', name: 'Family Dinners', color: '#3498DB', recipeCount: 0 },
];

const seedRecipes: Recipe[] = [
  {
    id: 'seed-r1',
    title: 'Zucchini Noodles with Pesto',
    description: 'Fresh spiralized zucchini tossed in vibrant basil pesto with cherry tomatoes and toasted pine nuts.',
    prepTime: 10,
    cookTime: 5,
    servings: 2,
    difficulty: 2,
    netCarbsPerServing: 8,
    caloriesPerServing: 320,
    proteinPerServing: 12,
    fatPerServing: 26,
    category: 'Lunch',
    tags: ['keto', 'quick', 'vegetarian', 'low-carb'],
    ingredients: [
      { name: 'Zucchini', quantity: '3', unit: 'medium' },
      { name: 'Basil Pesto', quantity: '1/4', unit: 'cup' },
      { name: 'Cherry Tomatoes', quantity: '1', unit: 'cup' },
      { name: 'Pine Nuts', quantity: '2', unit: 'tbsp' },
      { name: 'Parmesan Cheese', quantity: '1/4', unit: 'cup' },
      { name: 'Olive Oil', quantity: '1', unit: 'tbsp' },
      { name: 'Garlic', quantity: '2', unit: 'cloves' },
    ],
    instructions: [
      'Spiralize the zucchini into noodle shapes using a spiralizer or vegetable peeler.',
      'Heat olive oil in a large skillet over medium heat. Add minced garlic and sauté 30 seconds.',
      'Add zucchini noodles and cook 2-3 minutes, tossing gently, until just tender.',
      'Remove from heat and toss with pesto and cherry tomatoes.',
      'Serve topped with toasted pine nuts and grated Parmesan.',
    ],
    notes: 'Do not overcook the zucchini — it gets watery. Salt and drain before cooking for best texture.',
    isFavorite: true,
    isUserCreated: false,
    folderId: 'folder-1',
    dateAdded: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'seed-r2',
    title: 'Butter Chicken (Keto)',
    description: 'Rich and creamy Indian butter chicken with tender pieces of chicken in a fragrant tomato-cream sauce, served over cauliflower rice.',
    prepTime: 15,
    cookTime: 20,
    servings: 4,
    difficulty: 3,
    netCarbsPerServing: 10,
    caloriesPerServing: 480,
    proteinPerServing: 38,
    fatPerServing: 32,
    category: 'Dinner',
    tags: ['keto', 'indian', 'high-protein'],
    ingredients: [
      { name: 'Chicken Thighs', quantity: '2', unit: 'lbs', optional: false },
      { name: 'Butter', quantity: '3', unit: 'tbsp' },
      { name: 'Heavy Cream', quantity: '1/2', unit: 'cup' },
      { name: 'Tomato Sauce', quantity: '1', unit: 'cup' },
      { name: 'Garam Masala', quantity: '2', unit: 'tsp' },
      { name: 'Cumin', quantity: '1', unit: 'tsp' },
      { name: 'Ginger', quantity: '1', unit: 'tsp' },
      { name: 'Garlic', quantity: '4', unit: 'cloves' },
      { name: 'Onion', quantity: '1', unit: 'medium' },
    ],
    instructions: [
      'Cut chicken thighs into bite-sized pieces and season with salt, pepper, and half the garam masala.',
      'Heat butter in a large skillet over medium-high heat. Brown chicken pieces for 3-4 minutes per side.',
      'Remove chicken and in the same pan, sauté diced onion until golden, about 5 minutes.',
      'Add minced garlic and ginger, cook 1 minute until fragrant.',
      'Add remaining spices and tomato sauce. Simmer 5 minutes.',
      'Return chicken to pan, add heavy cream and simmer 10 minutes until sauce thickens.',
      'Serve over cauliflower rice garnished with fresh cilantro.',
    ],
    notes: 'For extra richness, add 2 tbsp cream cheese to the sauce.',
    isFavorite: false,
    isUserCreated: false,
    folderId: 'folder-3',
    dateAdded: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'seed-r3',
    title: 'Avocado Egg Salad',
    description: 'Creamy avocado replaces mayo in this protein-packed egg salad. Perfect for lettuce wraps or eating straight from the bowl.',
    prepTime: 10,
    cookTime: 0,
    servings: 2,
    difficulty: 1,
    netCarbsPerServing: 3,
    caloriesPerServing: 280,
    proteinPerServing: 16,
    fatPerServing: 22,
    category: 'Breakfast',
    tags: ['quick', 'keto', 'breakfast', 'no-cook'],
    ingredients: [
      { name: 'Large Eggs', quantity: '4', unit: 'whole', optional: false },
      { name: 'Avocado', quantity: '1', unit: 'large' },
      { name: 'Lemon Juice', quantity: '1', unit: 'tbsp' },
      { name: 'Dijon Mustard', quantity: '1', unit: 'tsp' },
      { name: 'Fresh Chives', quantity: '2', unit: 'tbsp' },
      { name: 'Salt & Pepper', quantity: '', unit: 'to taste' },
    ],
    instructions: [
      'Hard boil eggs: place in cold water, bring to boil, cook 10 minutes, then cool in ice bath.',
      'Peel and roughly chop the cooled eggs.',
      'Mash avocado with lemon juice and mustard until smooth with some chunks.',
      'Fold in chopped eggs and chives.',
      'Season with salt and pepper. Serve in lettuce cups or on its own.',
    ],
    isFavorite: true,
    isUserCreated: false,
    folderId: 'folder-1',
    dateAdded: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'seed-r4',
    title: 'Cauliflower Fried Rice',
    description: 'A satisfying keto take on fried rice using riced cauliflower, loaded with vegetables and eggs in a savory soy-ginger sauce.',
    prepTime: 10,
    cookTime: 10,
    servings: 3,
    difficulty: 2,
    netCarbsPerServing: 12,
    caloriesPerServing: 220,
    proteinPerServing: 14,
    fatPerServing: 14,
    category: 'Dinner',
    tags: ['keto', 'quick', 'asian', 'vegetarian'],
    ingredients: [
      { name: 'Cauliflower', quantity: '1', unit: 'head' },
      { name: 'Large Eggs', quantity: '3', unit: 'whole' },
      { name: 'Soy Sauce', quantity: '3', unit: 'tbsp' },
      { name: 'Sesame Oil', quantity: '1', unit: 'tbsp' },
      { name: 'Frozen Peas', quantity: '1/2', unit: 'cup', optional: true },
      { name: 'Carrots', quantity: '2', unit: 'medium' },
      { name: 'Green Onions', quantity: '3', unit: 'stalks' },
      { name: 'Garlic', quantity: '3', unit: 'cloves' },
      { name: 'Ginger', quantity: '1', unit: 'tsp' },
    ],
    instructions: [
      'Pulse cauliflower in a food processor until it resembles rice grains.',
      'Heat sesame oil in a large wok or skillet over high heat.',
      'Add garlic and ginger, stir fry 30 seconds.',
      'Add carrots and cook 2 minutes. Push to the side.',
      'Scramble eggs in the center of the wok.',
      'Add cauliflower rice and soy sauce. Stir fry 4-5 minutes until tender.',
      'Fold in peas and green onions. Serve immediately.',
    ],
    isFavorite: false,
    isUserCreated: false,
    folderId: 'folder-2',
    dateAdded: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'seed-r5',
    title: 'Bacon Wrapped Asparagus',
    description: 'Crispy bacon-wrapped asparagus bundles make the perfect keto side dish or appetizer. Ready in under 20 minutes.',
    prepTime: 5,
    cookTime: 15,
    servings: 4,
    difficulty: 1,
    netCarbsPerServing: 4,
    caloriesPerServing: 180,
    proteinPerServing: 10,
    fatPerServing: 14,
    category: 'Side',
    tags: ['keto', 'quick', 'side', 'bacon'],
    ingredients: [
      { name: 'Asparagus', quantity: '1', unit: 'bunch' },
      { name: 'Bacon Strips', quantity: '6', unit: 'strips' },
      { name: 'Olive Oil', quantity: '1', unit: 'tbsp' },
      { name: 'Garlic Powder', quantity: '1/2', unit: 'tsp' },
      { name: 'Black Pepper', quantity: '', unit: 'to taste' },
    ],
    instructions: [
      'Preheat oven to 400°F (200°C). Line a baking sheet with foil.',
      'Trim woody ends from asparagus. Toss with olive oil, garlic powder, and pepper.',
      'Group asparagus into bundles of 4-5 spears.',
      'Wrap each bundle tightly with a strip of bacon, overlapping slightly.',
      'Place on baking sheet and bake 15-18 minutes until bacon is crispy.',
      'Serve immediately while hot and crispy.',
    ],
    isFavorite: true,
    isUserCreated: false,
    folderId: 'folder-1',
    dateAdded: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'seed-r6',
    title: 'Keto Chocolate Mousse',
    description: 'Decadent, airy chocolate mousse that satisfies sweet cravings without the carbs. Ready in 10 minutes.',
    prepTime: 10,
    cookTime: 0,
    servings: 4,
    difficulty: 2,
    netCarbsPerServing: 6,
    caloriesPerServing: 320,
    proteinPerServing: 4,
    fatPerServing: 32,
    category: 'Dessert',
    tags: ['keto', 'dessert', 'no-cook', 'chocolate'],
    ingredients: [
      { name: 'Heavy Whipping Cream', quantity: '2', unit: 'cups' },
      { name: 'Unsweetened Cocoa Powder', quantity: '3', unit: 'tbsp' },
      { name: 'Powdered Erythritol', quantity: '1/4', unit: 'cup' },
      { name: 'Vanilla Extract', quantity: '1', unit: 'tsp' },
      { name: 'Pinch of Salt', quantity: '', unit: 'pinch' },
    ],
    instructions: [
      'Chill a large mixing bowl and whisk attachment in the freezer for 10 minutes.',
      'Sift cocoa powder and erythritol together to remove lumps.',
      'Pour cold heavy cream into the chilled bowl.',
      'Whip on medium-high speed until soft peaks form.',
      'Add vanilla, salt, cocoa mixture, and continue whipping to stiff peaks.',
      'Spoon into glasses and refrigerate until serving. Top with berries if desired.',
    ],
    notes: 'Use Dutch-process cocoa for a richer, darker flavor.',
    isFavorite: false,
    isUserCreated: false,
    folderId: 'folder-1',
    dateAdded: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const useRecipesStore = create<RecipesState>()(
  persist(
    (set, get) => ({
      recipes: seedRecipes,
      folders: seedFolders,
      recentlyViewed: [],

      addRecipe: (recipe) =>
        set((state) => ({
          recipes: [
            ...state.recipes,
            {
              ...recipe,
              id: generateId(),
              dateAdded: new Date().toISOString(),
            },
          ],
        })),

      updateRecipe: (id, updates) =>
        set((state) => ({
          recipes: state.recipes.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        })),

      deleteRecipe: (id) =>
        set((state) => ({
          recipes: state.recipes.filter((r) => r.id !== id),
          recentlyViewed: state.recentlyViewed.filter((rid) => rid !== id),
        })),

      toggleFavorite: (id) =>
        set((state) => ({
          recipes: state.recipes.map((r) =>
            r.id === id ? { ...r, isFavorite: !r.isFavorite } : r
          ),
        })),

      markViewed: (id) =>
        set((state) => {
          const filtered = state.recentlyViewed.filter((rid) => rid !== id);
          return {
            recentlyViewed: [id, ...filtered].slice(0, 10),
            recipes: state.recipes.map((r) =>
              r.id === id ? { ...r, lastViewed: new Date().toISOString() } : r
            ),
          };
        }),

      addFolder: (name, color) =>
        set((state) => ({
          folders: [
            ...state.folders,
            {
              id: `folder-${Date.now()}`,
              name,
              color,
              recipeCount: 0,
            },
          ],
        })),

      deleteFolder: (id) =>
        set((state) => ({
          folders: state.folders.filter((f) => f.id !== id),
          recipes: state.recipes.map((r) =>
            r.folderId === id ? { ...r, folderId: undefined } : r
          ),
        })),

      moveToFolder: (recipeId, folderId) =>
        set((state) => ({
          recipes: state.recipes.map((r) =>
            r.id === recipeId ? { ...r, folderId } : r
          ),
        })),

      getFavorites: () => {
        const { recipes } = get();
        return recipes.filter((r) => r.isFavorite);
      },

      getByFolder: (folderId) => {
        const { recipes } = get();
        return recipes.filter((r) => r.folderId === folderId);
      },

      getRecentlyViewed: () => {
        const { recipes, recentlyViewed } = get();
        return recentlyViewed
          .map((id) => recipes.find((r) => r.id === id))
          .filter((r): r is Recipe => r !== undefined);
      },
    }),
    {
      name: 'pantryiq-recipes-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
