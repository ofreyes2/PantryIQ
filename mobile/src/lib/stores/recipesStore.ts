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
  crispinessRating?: 1 | 2 | 3 | 4 | 5;
  cookingMethod?: string;
  equipmentNeeded?: string[];
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
  { id: 'folder-4', name: 'Crispy Collection', color: '#E67E22', recipeCount: 0 },
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
    crispinessRating: 2,
    cookingMethod: 'Stovetop',
    equipmentNeeded: ['Non-stick Pan'],
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
    crispinessRating: 2,
    cookingMethod: 'Stovetop',
    equipmentNeeded: ['Large Skillet'],
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
    crispinessRating: 1,
    cookingMethod: 'No Cook',
    equipmentNeeded: [],
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
    crispinessRating: 2,
    cookingMethod: 'Stovetop',
    equipmentNeeded: ['Wok or Large Skillet'],
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
    crispinessRating: 4,
    cookingMethod: 'Oven Roasted',
    equipmentNeeded: ['Standard Oven'],
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
    crispinessRating: 1,
    cookingMethod: 'No Cook',
    equipmentNeeded: ['Stand Mixer or Hand Mixer'],
  },
  // ─── Crispy Collection ────────────────────────────────────────────────────
  {
    id: 'crispy-r1',
    title: 'Pork Rind Crusted Chicken Thighs',
    description: "Zero-carb pork rind coating creates the most insanely crispy chicken you've ever tasted. The coating shatters when you bite in.",
    prepTime: 15,
    cookTime: 12,
    servings: 4,
    difficulty: 2,
    netCarbsPerServing: 1,
    caloriesPerServing: 380,
    proteinPerServing: 42,
    fatPerServing: 22,
    category: 'Dinner',
    tags: ['keto', 'crispy', 'low-carb', 'high-protein', 'deep-fried'],
    ingredients: [
      { name: 'Chicken thighs boneless', quantity: '2', unit: 'lbs' },
      { name: 'Pork rinds', quantity: '3', unit: 'oz crushed' },
      { name: 'Garlic powder', quantity: '1', unit: 'tsp' },
      { name: 'Onion powder', quantity: '1', unit: 'tsp' },
      { name: 'Smoked paprika', quantity: '1', unit: 'tsp' },
      { name: 'Cayenne pepper', quantity: '1/4', unit: 'tsp' },
      { name: 'Salt & pepper', quantity: '', unit: 'to taste' },
      { name: 'Avocado oil for frying', quantity: '', unit: 'as needed' },
    ],
    instructions: [
      'Crush pork rinds in a food processor or zip bag until fine crumbs. Mix with garlic powder, onion powder, smoked paprika, cayenne, salt, and pepper.',
      'Pat chicken thighs completely dry with paper towels — moisture is the enemy of crunch.',
      'Heat deep fryer to 325°F. Press pork rind coating firmly onto both sides of each thigh.',
      'Fry at 325°F for 8 minutes until cooked through. Remove and rest on a wire rack for 3 minutes.',
      'Raise oil temperature to 375°F. Fry again for 3-4 minutes until the coating is deep golden and shattering crispy.',
      'Drain on wire rack (not paper towels — steam kills the crunch). Serve immediately.',
    ],
    notes: 'The double-fry technique is the secret. First fry cooks through, second fry creates the crunch. Do NOT skip the rest between fries.',
    isFavorite: false,
    isUserCreated: false,
    folderId: 'folder-4',
    dateAdded: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    crispinessRating: 5,
    cookingMethod: 'Deep Fried',
    equipmentNeeded: ['Deep Fryer'],
  },
  {
    id: 'crispy-r2',
    title: 'Parmesan Crusted Salmon',
    description: 'Screaming hot cast iron + a parmesan crust = restaurant-quality salmon that\'s crispy on the outside and buttery inside.',
    prepTime: 5,
    cookTime: 10,
    servings: 2,
    difficulty: 2,
    netCarbsPerServing: 1,
    caloriesPerServing: 420,
    proteinPerServing: 44,
    fatPerServing: 26,
    category: 'Dinner',
    tags: ['keto', 'crispy', 'low-carb', 'high-protein', 'cast-iron'],
    ingredients: [
      { name: 'Salmon fillets skin-on', quantity: '2', unit: '6oz' },
      { name: 'Parmesan grated', quantity: '1/2', unit: 'cup' },
      { name: 'Garlic powder', quantity: '1/2', unit: 'tsp' },
      { name: 'Lemon zest', quantity: '1', unit: 'tsp' },
      { name: 'Butter', quantity: '1', unit: 'tbsp' },
      { name: 'Avocado oil', quantity: '1', unit: 'tbsp' },
      { name: 'Salt & pepper', quantity: '', unit: 'to taste' },
    ],
    instructions: [
      'Press grated parmesan, garlic powder, and lemon zest firmly onto the flesh side of each salmon fillet.',
      'Heat cast iron skillet over high heat for 3 minutes until smoking hot. Add avocado oil.',
      'Place salmon parmesan-side DOWN. Do not move. Cook 3-4 minutes until the crust is deep golden and releases easily.',
      'Flip gently. Add butter to pan. Cook 2-3 more minutes basting with butter.',
      'The parmesan crust should be a hard, lacquered shell. Serve immediately.',
    ],
    notes: 'Get the pan SCREAMING hot before the salmon goes in. A lukewarm pan steams fish. Hot pan sears and crisps.',
    isFavorite: false,
    isUserCreated: false,
    folderId: 'folder-4',
    dateAdded: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    crispinessRating: 4,
    cookingMethod: 'Cast Iron',
    equipmentNeeded: ['Cast Iron Skillet'],
  },
  {
    id: 'crispy-r3',
    title: 'Double Fried Buffalo Wings',
    description: 'The double-fry method produces wings so crispy they shatter. No coating needed — just time, temperature, and technique.',
    prepTime: 10,
    cookTime: 25,
    servings: 4,
    difficulty: 2,
    netCarbsPerServing: 2,
    caloriesPerServing: 460,
    proteinPerServing: 38,
    fatPerServing: 32,
    category: 'Snack',
    tags: ['keto', 'crispy', 'low-carb', 'high-protein', 'deep-fried', 'buffalo'],
    ingredients: [
      { name: 'Chicken wings separated', quantity: '3', unit: 'lbs' },
      { name: 'Salt', quantity: '2', unit: 'tsp' },
      { name: 'Baking powder', quantity: '1', unit: 'tbsp' },
      { name: 'Garlic powder', quantity: '1', unit: 'tsp' },
      { name: 'Buffalo sauce', quantity: '1/2', unit: 'cup' },
      { name: 'Butter', quantity: '2', unit: 'tbsp' },
    ],
    instructions: [
      'Pat wings completely dry. Toss with salt, baking powder, and garlic powder. Let air dry uncovered in fridge for at least 1 hour (overnight is best).',
      'Heat deep fryer to 250°F. Fry wings in batches for 20-25 minutes. They will look pale — that is correct.',
      'Remove and rest on a wire rack for 10 minutes. This lets the steam escape.',
      'Raise oil to 400°F. Fry wings again for 5-7 minutes until crackling crispy and deep golden brown.',
      'Toss immediately in warm buffalo sauce mixed with melted butter.',
      'Serve within 5 minutes for maximum crunch.',
    ],
    notes: 'Baking powder in the dry rub is the pro trick — it raises the pH of the skin and makes it bubble and crackle. Do NOT use baking soda.',
    isFavorite: false,
    isUserCreated: false,
    folderId: 'folder-4',
    dateAdded: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    crispinessRating: 5,
    cookingMethod: 'Deep Fried',
    equipmentNeeded: ['Deep Fryer'],
  },
  {
    id: 'crispy-r4',
    title: 'Instant Pot then Air Fry Pulled Pork',
    description: 'The 8qt Instant Pot makes the most tender pulled pork in 90 minutes. Finish in the air fryer for incredible crispy burnt ends.',
    prepTime: 15,
    cookTime: 110,
    servings: 8,
    difficulty: 2,
    netCarbsPerServing: 3,
    caloriesPerServing: 390,
    proteinPerServing: 44,
    fatPerServing: 22,
    category: 'Dinner',
    tags: ['keto', 'low-carb', 'high-protein', 'instant-pot', 'crispy'],
    ingredients: [
      { name: 'Pork shoulder', quantity: '4', unit: 'lbs boneless' },
      { name: 'Smoked paprika', quantity: '2', unit: 'tbsp' },
      { name: 'Cumin', quantity: '1', unit: 'tsp' },
      { name: 'Garlic powder', quantity: '2', unit: 'tsp' },
      { name: 'Onion powder', quantity: '1', unit: 'tsp' },
      { name: 'Salt', quantity: '2', unit: 'tsp' },
      { name: 'Black pepper', quantity: '1', unit: 'tsp' },
      { name: 'Chicken broth', quantity: '1', unit: 'cup' },
      { name: 'Apple cider vinegar', quantity: '2', unit: 'tbsp' },
    ],
    instructions: [
      'Mix all dry spices together. Rub all over pork shoulder on every surface.',
      'Add broth and vinegar to Instant Pot 8qt. Add pork shoulder.',
      'Seal lid. Set to Pressure Cook HIGH for 90 minutes. Natural release 15 minutes, then quick release.',
      'Remove pork and shred with two forks. The meat should fall apart effortlessly.',
      'Spread shredded pork in a single layer in air fryer basket. Air fry at 400°F for 8-10 minutes, tossing halfway, until the edges are caramelized and crispy.',
      'The result: tender juicy pork with irresistibly crispy burnt ends throughout.',
    ],
    notes: 'Use the 8qt Instant Pot for a 4lb shoulder. While the pork rests after pressure cooking, use the 3qt Instant Pot to make a side dish simultaneously.',
    isFavorite: false,
    isUserCreated: false,
    folderId: 'folder-4',
    dateAdded: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    crispinessRating: 4,
    cookingMethod: 'Instant Pot',
    equipmentNeeded: ['Instant Pot 8qt', 'Air Fryer'],
  },
  {
    id: 'crispy-r5',
    title: 'Crispy Bacon Wrapped Jalapeño Poppers',
    description: 'Cream cheese stuffed jalapeños wrapped in bacon, oven-roasted then finished under the broiler for lacquer-crispy bacon.',
    prepTime: 15,
    cookTime: 20,
    servings: 6,
    difficulty: 2,
    netCarbsPerServing: 2,
    caloriesPerServing: 280,
    proteinPerServing: 14,
    fatPerServing: 24,
    category: 'Snack',
    tags: ['keto', 'crispy', 'low-carb', 'bacon', 'spicy', 'broiled'],
    ingredients: [
      { name: 'Jalapeños large', quantity: '12', unit: 'whole' },
      { name: 'Cream cheese softened', quantity: '8', unit: 'oz' },
      { name: 'Sharp cheddar shredded', quantity: '1/2', unit: 'cup' },
      { name: 'Garlic powder', quantity: '1/2', unit: 'tsp' },
      { name: 'Bacon strips', quantity: '12', unit: 'strips' },
      { name: 'Toothpicks', quantity: '', unit: 'as needed' },
    ],
    instructions: [
      'Preheat oven to 375°F.',
      'Cut jalapeños in half lengthwise. Remove seeds and membranes (wear gloves).',
      'Mix cream cheese, cheddar, and garlic powder. Fill each jalapeño half with the mixture.',
      'Wrap each filled jalapeño with a half-strip of bacon. Secure with a toothpick.',
      'Bake on a wire rack over a baking sheet for 18-20 minutes until bacon is cooked.',
      'Switch oven to BROIL. Broil 2-3 minutes until bacon is crackling crispy and slightly charred on edges.',
      'Cool 2 minutes before serving — the filling is lava hot.',
    ],
    notes: 'The broiler finish is mandatory for proper crispy bacon. The wire rack allows air circulation so the bottom bacon crisps too.',
    isFavorite: false,
    isUserCreated: false,
    folderId: 'folder-4',
    dateAdded: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    crispinessRating: 4,
    cookingMethod: 'Broiled',
    equipmentNeeded: ['Standard Oven', 'Broiler'],
  },
  {
    id: 'crispy-r6',
    title: 'Pork Belly Burnt Ends',
    description: 'Instant Pot renders the pork belly tender in 20 minutes, then the deep fryer creates an impossibly crispy bark. Best of both worlds.',
    prepTime: 10,
    cookTime: 40,
    servings: 4,
    difficulty: 3,
    netCarbsPerServing: 2,
    caloriesPerServing: 580,
    proteinPerServing: 28,
    fatPerServing: 52,
    category: 'Dinner',
    tags: ['keto', 'crispy', 'low-carb', 'pork', 'deep-fried', 'instant-pot'],
    ingredients: [
      { name: 'Pork belly skin-off', quantity: '2', unit: 'lbs cut into 1.5 inch cubes' },
      { name: 'Smoked paprika', quantity: '1', unit: 'tsp' },
      { name: 'Garlic powder', quantity: '1', unit: 'tsp' },
      { name: 'Salt', quantity: '1', unit: 'tsp' },
      { name: 'Black pepper', quantity: '1/2', unit: 'tsp' },
      { name: 'Chicken broth', quantity: '1/2', unit: 'cup' },
      { name: 'Avocado oil for frying', quantity: '', unit: 'as needed' },
    ],
    instructions: [
      'Season pork belly cubes with paprika, garlic powder, salt, and pepper.',
      'Add broth to Instant Pot. Add seasoned pork belly.',
      'Pressure cook HIGH for 20 minutes. Quick release.',
      'Remove pork belly. Pat dry THOROUGHLY with paper towels. Let cool and dry on a wire rack 10 minutes.',
      'Heat deep fryer to 375°F. Fry pork belly cubes in batches for 5-7 minutes until the exterior is golden, crunchy, and irresistible.',
      'Season with finishing salt immediately out of the fryer.',
    ],
    notes: 'The drying step after Instant Pot is critical. Any moisture on the surface will cause oil to splatter and prevents the crunch.',
    isFavorite: false,
    isUserCreated: false,
    folderId: 'folder-4',
    dateAdded: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    crispinessRating: 5,
    cookingMethod: 'Instant Pot',
    equipmentNeeded: ['Instant Pot 6qt or 8qt', 'Deep Fryer'],
  },
  {
    id: 'crispy-r7',
    title: 'Almond Flour Fried Shrimp',
    description: 'Almond flour creates a light, golden, genuinely crunchy coating on shrimp that rivals any seafood restaurant\'s fried shrimp.',
    prepTime: 15,
    cookTime: 8,
    servings: 4,
    difficulty: 2,
    netCarbsPerServing: 3,
    caloriesPerServing: 320,
    proteinPerServing: 32,
    fatPerServing: 20,
    category: 'Dinner',
    tags: ['keto', 'crispy', 'low-carb', 'seafood', 'deep-fried'],
    ingredients: [
      { name: 'Large shrimp peeled deveined', quantity: '2', unit: 'lbs' },
      { name: 'Almond flour', quantity: '1', unit: 'cup' },
      { name: 'Garlic powder', quantity: '1', unit: 'tsp' },
      { name: 'Old Bay seasoning', quantity: '1', unit: 'tsp' },
      { name: 'Salt', quantity: '1/2', unit: 'tsp' },
      { name: 'Cayenne', quantity: '1/4', unit: 'tsp' },
      { name: 'Eggs', quantity: '2', unit: 'large' },
      { name: 'Avocado oil for frying', quantity: '', unit: 'as needed' },
    ],
    instructions: [
      'Mix almond flour, garlic powder, Old Bay, salt, and cayenne in a shallow bowl.',
      'Beat eggs in another bowl.',
      'Pat shrimp completely dry. Dip each in egg, then press firmly into almond flour coating.',
      'Heat deep fryer to 375°F.',
      'Fry in small batches (do not crowd) for 2-3 minutes until golden and floating.',
      'Drain on wire rack immediately. Do NOT stack — trapped steam kills the crunch.',
      'Serve within 5 minutes for maximum crispiness.',
    ],
    notes: 'Small batches are crucial — adding too many shrimp drops the oil temperature and you get greasy breading instead of crispy.',
    isFavorite: false,
    isUserCreated: false,
    folderId: 'folder-4',
    dateAdded: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    crispinessRating: 4,
    cookingMethod: 'Deep Fried',
    equipmentNeeded: ['Deep Fryer'],
  },
  {
    id: 'crispy-r8',
    title: 'Crispy Parmesan Zucchini Fries',
    description: 'The parmesan-almond flour coating bakes into a golden, shatteringly crispy crust that makes zucchini taste like the best fries you\'ve ever had.',
    prepTime: 10,
    cookTime: 20,
    servings: 4,
    difficulty: 1,
    netCarbsPerServing: 4,
    caloriesPerServing: 160,
    proteinPerServing: 8,
    fatPerServing: 12,
    category: 'Side',
    tags: ['keto', 'crispy', 'low-carb', 'vegetarian', 'oven-roasted'],
    ingredients: [
      { name: 'Zucchini', quantity: '3', unit: 'medium cut into sticks' },
      { name: 'Parmesan finely grated', quantity: '1', unit: 'cup' },
      { name: 'Almond flour', quantity: '1/4', unit: 'cup' },
      { name: 'Garlic powder', quantity: '1', unit: 'tsp' },
      { name: 'Italian seasoning', quantity: '1', unit: 'tsp' },
      { name: 'Eggs', quantity: '2', unit: 'large' },
      { name: 'Salt & pepper', quantity: '', unit: 'to taste' },
    ],
    instructions: [
      'Preheat oven to 425°F. Line two baking sheets with parchment.',
      'Cut zucchini into fry-shaped sticks, about 3 inches long and 1/2 inch thick.',
      'Salt zucchini sticks and let sit 5 minutes. Pat DRY with paper towels — this removes moisture that causes sogginess.',
      'Mix parmesan, almond flour, garlic powder, Italian seasoning, salt, and pepper.',
      'Dip each zucchini stick in beaten egg, then press firmly into the parmesan coating.',
      'Place on baking sheets with space between each fry. Bake 18-20 minutes until deeply golden.',
      'Switch to broil for final 2 minutes for maximum crisp. Watch closely.',
      'Serve immediately with marinara or ranch.',
    ],
    notes: 'The salt + dry step transforms watery zucchini into a fry that can actually get crispy. Never skip it.',
    isFavorite: false,
    isUserCreated: false,
    folderId: 'folder-4',
    dateAdded: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    crispinessRating: 4,
    cookingMethod: 'Oven Roasted',
    equipmentNeeded: ['Standard Oven'],
  },
  {
    id: 'crispy-r9',
    title: 'Korean Style Crispy Chicken',
    description: 'Korean double-fried chicken has the thinnest, most glass-like crunchy coating of any fried chicken style. The almond flour adaptation keeps it keto.',
    prepTime: 20,
    cookTime: 30,
    servings: 4,
    difficulty: 3,
    netCarbsPerServing: 4,
    caloriesPerServing: 480,
    proteinPerServing: 44,
    fatPerServing: 30,
    category: 'Dinner',
    tags: ['keto', 'crispy', 'low-carb', 'asian', 'deep-fried', 'high-protein'],
    ingredients: [
      { name: 'Chicken thighs boneless', quantity: '2', unit: 'lbs cut into pieces' },
      { name: 'Almond flour', quantity: '1/2', unit: 'cup' },
      { name: 'Pork rinds crushed', quantity: '1/2', unit: 'cup' },
      { name: 'Garlic powder', quantity: '1', unit: 'tsp' },
      { name: 'Ginger powder', quantity: '1', unit: 'tsp' },
      { name: 'Salt', quantity: '1', unit: 'tsp' },
      { name: 'Gochugaru Korean chili flakes', quantity: '1', unit: 'tsp', optional: true },
      { name: 'Eggs', quantity: '2', unit: 'large' },
      { name: 'Soy sauce', quantity: '2', unit: 'tbsp' },
      { name: 'Sesame oil', quantity: '1', unit: 'tbsp' },
    ],
    instructions: [
      'Marinate chicken in soy sauce and sesame oil for 15 minutes.',
      'Mix almond flour, crushed pork rinds, garlic powder, ginger, salt, and gochugaru.',
      'Dip marinated chicken in beaten egg, then coat firmly in the almond flour mixture.',
      'FIRST FRY: Heat deep fryer to 325°F. Fry chicken pieces for 10-12 minutes until cooked through but pale. Remove to wire rack.',
      'Let rest 5-10 minutes. This is mandatory.',
      'SECOND FRY: Raise oil to 375°F. Fry again for 4-5 minutes until crackling crispy and deep golden.',
      'Season immediately with finishing salt and optional sesame seeds.',
    ],
    notes: 'Korean chicken technique: the first fry cooks it, the second fry creates the glass-like shatter crust. The wait between fries lets moisture escape from the coating.',
    isFavorite: false,
    isUserCreated: false,
    folderId: 'folder-4',
    dateAdded: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    crispinessRating: 5,
    cookingMethod: 'Deep Fried',
    equipmentNeeded: ['Deep Fryer'],
  },
  {
    id: 'crispy-r10',
    title: 'Pork Rind Nachos',
    description: 'Pork rinds replace tortilla chips with zero carbs and maximum crunch. Loaded with cheese, jalapeños, and sour cream — the ultimate keto nachos.',
    prepTime: 10,
    cookTime: 8,
    servings: 2,
    difficulty: 1,
    netCarbsPerServing: 2,
    caloriesPerServing: 420,
    proteinPerServing: 28,
    fatPerServing: 34,
    category: 'Snack',
    tags: ['keto', 'crispy', 'low-carb', 'quick', 'broiled'],
    ingredients: [
      { name: 'Pork rinds', quantity: '4', unit: 'oz' },
      { name: 'Sharp cheddar shredded', quantity: '1.5', unit: 'cups' },
      { name: 'Pickled jalapeños', quantity: '1/4', unit: 'cup' },
      { name: 'Sour cream', quantity: '1/4', unit: 'cup' },
      { name: 'Guacamole', quantity: '1/2', unit: 'cup' },
      { name: 'Green onions', quantity: '2', unit: 'stalks sliced' },
      { name: 'Black olives sliced', quantity: '', unit: 'optional', optional: true },
    ],
    instructions: [
      'Set oven to BROIL (500°F). Position rack 6 inches from broiler.',
      'Spread pork rinds in a single layer on a rimmed baking sheet.',
      'Cover evenly with shredded cheddar.',
      'Add jalapeños across the top.',
      'Broil for 2-3 minutes until cheese is fully melted and starting to bubble and crisp at the edges. Watch constantly — it happens fast.',
      'Top with sour cream, guacamole, green onions, and olives.',
      'Serve immediately straight from the pan — pork rinds lose crunch fast once cheese is added.',
    ],
    notes: 'Speed is essential. Have all toppings ready before the nachos go under the broiler. The pork rinds stay crunchiest for about 5 minutes after cheese is added.',
    isFavorite: false,
    isUserCreated: false,
    folderId: 'folder-4',
    dateAdded: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    crispinessRating: 5,
    cookingMethod: 'Broiled',
    equipmentNeeded: ['Standard Oven', 'Broiler'],
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
