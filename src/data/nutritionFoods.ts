// Nutrition database — 50+ whole foods with per-100g macros
export interface NutritionFood {
  id: string;
  name: string;
  emoji: string;
  category: 'Protein' | 'Vegetable' | 'Fruit' | 'Carbs & Fiber' | 'Healthy Fats' | 'Drinks';
  calories: number;   // per 100g
  protein: number;    // g per 100g
  carbs: number;      // g per 100g
  fat: number;        // g per 100g
  fiber: number;      // g per 100g
  servingSize: number; // default serving in grams
  servingLabel: string;
  tags: string[];     // goal tags
  benefits: string;   // short health benefit
}

export const NUTRITION_FOODS: NutritionFood[] = [
  // ── Protein-Rich Foods ──
  { id:'f1', name:'Eggs', emoji:'🥚', category:'Protein', calories:155, protein:13, carbs:1.1, fat:11, fiber:0, servingSize:50, servingLabel:'1 egg', tags:['weight-loss','muscle-gain'], benefits:'Complete protein with all essential amino acids. Rich in choline for brain health.' },
  { id:'f2', name:'Chicken Breast', emoji:'🍗', category:'Protein', calories:165, protein:31, carbs:0, fat:3.6, fiber:0, servingSize:150, servingLabel:'1 breast', tags:['weight-loss','muscle-gain'], benefits:'Lean, high-quality protein. Great for muscle building and repair.' },
  { id:'f3', name:'Turkey Breast', emoji:'🦃', category:'Protein', calories:135, protein:30, carbs:0, fat:1, fiber:0, servingSize:150, servingLabel:'1 serving', tags:['weight-loss','muscle-gain'], benefits:'Ultra-lean protein source. Rich in B vitamins and selenium.' },
  { id:'f4', name:'Salmon', emoji:'🐟', category:'Protein', calories:208, protein:20, carbs:0, fat:13, fiber:0, servingSize:150, servingLabel:'1 fillet', tags:['muscle-gain','skin-hair'], benefits:'Omega-3 fatty acids for heart health, brain function, and inflammation reduction.' },
  { id:'f5', name:'Tuna', emoji:'🐟', category:'Protein', calories:130, protein:29, carbs:0, fat:1, fiber:0, servingSize:100, servingLabel:'1 can', tags:['weight-loss','muscle-gain'], benefits:'Very high protein, low fat. Rich in vitamin D and selenium.' },
  { id:'f6', name:'Prawns', emoji:'🦐', category:'Protein', calories:99, protein:24, carbs:0.2, fat:0.3, fiber:0, servingSize:100, servingLabel:'1 serving', tags:['weight-loss'], benefits:'Very low calorie, high protein. Rich in iodine and zinc.' },
  { id:'f7', name:'Lean Beef', emoji:'🥩', category:'Protein', calories:250, protein:26, carbs:0, fat:15, fiber:0, servingSize:150, servingLabel:'1 serving', tags:['muscle-gain'], benefits:'Iron-rich complete protein. Contains B12, zinc, and creatine.' },
  { id:'f8', name:'Greek Yogurt', emoji:'🥛', category:'Protein', calories:59, protein:10, carbs:3.6, fat:0.4, fiber:0, servingSize:200, servingLabel:'1 cup', tags:['weight-loss','muscle-gain'], benefits:'Probiotics for gut health. High protein, low calorie snack.' },
  { id:'f9', name:'Paneer', emoji:'🧀', category:'Protein', calories:265, protein:18, carbs:1.2, fat:21, fiber:0, servingSize:100, servingLabel:'1 block', tags:['muscle-gain'], benefits:'Calcium-rich vegetarian protein. Good for bones and teeth.' },
  { id:'f10', name:'Tofu', emoji:'🧊', category:'Protein', calories:76, protein:8, carbs:1.9, fat:4.8, fiber:0.3, servingSize:100, servingLabel:'1 block', tags:['weight-loss'], benefits:'Plant-based complete protein. Contains isoflavones for heart health.' },
  { id:'f11', name:'Tempeh', emoji:'🫘', category:'Protein', calories:192, protein:20, carbs:7.6, fat:11, fiber:0, servingSize:100, servingLabel:'1 serving', tags:['muscle-gain'], benefits:'Fermented soy with probiotics. Higher protein than tofu.' },
  { id:'f12', name:'Lentils', emoji:'🫘', category:'Protein', calories:116, protein:9, carbs:20, fat:0.4, fiber:8, servingSize:100, servingLabel:'½ cup cooked', tags:['weight-loss','energy'], benefits:'High fiber and protein. Stabilizes blood sugar and aids digestion.' },
  { id:'f13', name:'Chickpeas', emoji:'🫘', category:'Protein', calories:164, protein:8.9, carbs:27, fat:2.6, fiber:7.6, servingSize:100, servingLabel:'½ cup cooked', tags:['weight-loss','energy'], benefits:'Excellent plant protein and fiber. Keeps you full longer.' },
  { id:'f14', name:'Kidney Beans', emoji:'🫘', category:'Protein', calories:127, protein:8.7, carbs:22, fat:0.5, fiber:6.4, servingSize:100, servingLabel:'½ cup cooked', tags:['weight-loss'], benefits:'Rich in iron and folate. Great source of slow-digesting carbs.' },
  { id:'f15', name:'Edamame', emoji:'🫛', category:'Protein', calories:121, protein:12, carbs:9, fat:5, fiber:5, servingSize:100, servingLabel:'1 cup', tags:['muscle-gain'], benefits:'Complete plant protein with all essential amino acids.' },

  // ── Vegetables ──
  { id:'f16', name:'Spinach', emoji:'🥬', category:'Vegetable', calories:23, protein:2.9, carbs:3.6, fat:0.4, fiber:2.2, servingSize:100, servingLabel:'2 cups raw', tags:['skin-hair','energy'], benefits:'Iron, vitamin K, and folate powerhouse. Boosts blood health.' },
  { id:'f17', name:'Broccoli', emoji:'🥦', category:'Vegetable', calories:34, protein:2.8, carbs:7, fat:0.4, fiber:2.6, servingSize:100, servingLabel:'1 cup', tags:['weight-loss'], benefits:'Cancer-fighting sulforaphane. High in vitamin C and fiber.' },
  { id:'f18', name:'Kale', emoji:'🥬', category:'Vegetable', calories:49, protein:4.3, carbs:9, fat:0.9, fiber:3.6, servingSize:67, servingLabel:'1 cup chopped', tags:['skin-hair'], benefits:'One of the most nutrient-dense foods. Rich in vitamins A, K, C.' },
  { id:'f19', name:'Carrots', emoji:'🥕', category:'Vegetable', calories:41, protein:0.9, carbs:10, fat:0.2, fiber:2.8, servingSize:100, servingLabel:'1 medium', tags:['skin-hair'], benefits:'Beta-carotene for eye health and glowing skin.' },
  { id:'f20', name:'Beetroot', emoji:'🫒', category:'Vegetable', calories:43, protein:1.6, carbs:10, fat:0.2, fiber:2.8, servingSize:100, servingLabel:'1 medium', tags:['energy'], benefits:'Nitrates boost blood flow and exercise performance.' },
  { id:'f21', name:'Sweet Potatoes', emoji:'🍠', category:'Vegetable', calories:86, protein:1.6, carbs:20, fat:0.1, fiber:3, servingSize:150, servingLabel:'1 medium', tags:['energy','muscle-gain'], benefits:'Complex carbs for sustained energy. Rich in vitamin A.' },
  { id:'f22', name:'Bell Peppers', emoji:'🫑', category:'Vegetable', calories:31, protein:1, carbs:6, fat:0.3, fiber:2.1, servingSize:120, servingLabel:'1 pepper', tags:['skin-hair'], benefits:'More vitamin C than oranges. Supports immune function.' },
  { id:'f23', name:'Cauliflower', emoji:'🥬', category:'Vegetable', calories:25, protein:1.9, carbs:5, fat:0.3, fiber:2, servingSize:100, servingLabel:'1 cup', tags:['weight-loss'], benefits:'Low-carb versatile veggie. Great rice/pizza substitute.' },
  { id:'f24', name:'Cabbage', emoji:'🥬', category:'Vegetable', calories:25, protein:1.3, carbs:6, fat:0.1, fiber:2.5, servingSize:100, servingLabel:'1 cup shredded', tags:['weight-loss'], benefits:'Anti-inflammatory and gut-friendly. Rich in vitamin C.' },
  { id:'f25', name:'Tomatoes', emoji:'🍅', category:'Vegetable', calories:18, protein:0.9, carbs:3.9, fat:0.2, fiber:1.2, servingSize:100, servingLabel:'1 medium', tags:['skin-hair'], benefits:'Lycopene for heart health and UV skin protection.' },
  { id:'f26', name:'Mushrooms', emoji:'🍄', category:'Vegetable', calories:22, protein:3.1, carbs:3.3, fat:0.3, fiber:1, servingSize:100, servingLabel:'1 cup sliced', tags:['weight-loss'], benefits:'Natural vitamin D source. Supports immune system.' },
  { id:'f27', name:'Green Peas', emoji:'🫛', category:'Vegetable', calories:81, protein:5.4, carbs:14, fat:0.4, fiber:5.7, servingSize:100, servingLabel:'½ cup', tags:['energy'], benefits:'Surprisingly high in protein and fiber for a veggie.' },
  { id:'f28', name:'Pumpkin', emoji:'🎃', category:'Vegetable', calories:26, protein:1, carbs:6.5, fat:0.1, fiber:0.5, servingSize:100, servingLabel:'½ cup', tags:['skin-hair'], benefits:'Beta-carotene rich. Supports vision and immune health.' },
  { id:'f29', name:'Moringa Leaves', emoji:'🌿', category:'Vegetable', calories:64, protein:9.4, carbs:8.3, fat:1.4, fiber:2, servingSize:50, servingLabel:'1 cup', tags:['energy','skin-hair'], benefits:'7x vitamin C of oranges. Anti-inflammatory superfood.' },

  // ── Fruits ──
  { id:'f30', name:'Apple', emoji:'🍎', category:'Fruit', calories:52, protein:0.3, carbs:14, fat:0.2, fiber:2.4, servingSize:182, servingLabel:'1 medium', tags:['weight-loss'], benefits:'Pectin fiber aids digestion. Polyphenols support heart health.' },
  { id:'f31', name:'Banana', emoji:'🍌', category:'Fruit', calories:89, protein:1.1, carbs:23, fat:0.3, fiber:2.6, servingSize:118, servingLabel:'1 medium', tags:['energy'], benefits:'Instant energy from natural sugars. Rich in potassium.' },
  { id:'f32', name:'Orange', emoji:'🍊', category:'Fruit', calories:47, protein:0.9, carbs:12, fat:0.1, fiber:2.4, servingSize:131, servingLabel:'1 medium', tags:['skin-hair'], benefits:'Vitamin C powerhouse. Boosts immunity and collagen production.' },
  { id:'f33', name:'Blueberries', emoji:'🫐', category:'Fruit', calories:57, protein:0.7, carbs:14, fat:0.3, fiber:2.4, servingSize:100, servingLabel:'¾ cup', tags:['skin-hair'], benefits:'Highest antioxidant content of all fruits. Brain-boosting.' },
  { id:'f34', name:'Strawberries', emoji:'🍓', category:'Fruit', calories:32, protein:0.7, carbs:7.7, fat:0.3, fiber:2, servingSize:100, servingLabel:'1 cup', tags:['skin-hair','weight-loss'], benefits:'Low-calorie, high vitamin C. Supports heart health.' },
  { id:'f35', name:'Papaya', emoji:'🥭', category:'Fruit', calories:43, protein:0.5, carbs:11, fat:0.3, fiber:1.7, servingSize:150, servingLabel:'1 cup cubed', tags:['skin-hair'], benefits:'Papain enzyme aids digestion. Rich in vitamin A and C.' },
  { id:'f36', name:'Watermelon', emoji:'🍉', category:'Fruit', calories:30, protein:0.6, carbs:7.6, fat:0.2, fiber:0.4, servingSize:280, servingLabel:'1 wedge', tags:['weight-loss'], benefits:'92% water — great for hydration. Contains citrulline for recovery.' },
  { id:'f37', name:'Pomegranate', emoji:'🫐', category:'Fruit', calories:83, protein:1.7, carbs:19, fat:1.2, fiber:4, servingSize:100, servingLabel:'½ cup seeds', tags:['skin-hair','energy'], benefits:'Powerful antioxidants. Improves blood flow and skin health.' },
  { id:'f38', name:'Avocado', emoji:'🥑', category:'Fruit', calories:160, protein:2, carbs:9, fat:15, fiber:7, servingSize:100, servingLabel:'½ avocado', tags:['skin-hair','muscle-gain'], benefits:'Heart-healthy monounsaturated fats. Great for skin and hair.' },
  { id:'f39', name:'Kiwi', emoji:'🥝', category:'Fruit', calories:61, protein:1.1, carbs:15, fat:0.5, fiber:3, servingSize:76, servingLabel:'1 kiwi', tags:['skin-hair'], benefits:'More vitamin C than oranges. Aids sleep and digestion.' },

  // ── Healthy Carbs & Fiber ──
  { id:'f40', name:'Oats', emoji:'🥣', category:'Carbs & Fiber', calories:389, protein:17, carbs:66, fat:7, fiber:11, servingSize:40, servingLabel:'½ cup dry', tags:['weight-loss','energy'], benefits:'Beta-glucan fiber lowers cholesterol. Slow-release energy.' },
  { id:'f41', name:'Brown Rice', emoji:'🍚', category:'Carbs & Fiber', calories:111, protein:2.6, carbs:23, fat:0.9, fiber:1.8, servingSize:195, servingLabel:'1 cup cooked', tags:['muscle-gain','energy'], benefits:'Whole grain with manganese and magnesium. Sustained energy.' },
  { id:'f42', name:'Quinoa', emoji:'🌾', category:'Carbs & Fiber', calories:120, protein:4.4, carbs:21, fat:1.9, fiber:2.8, servingSize:185, servingLabel:'1 cup cooked', tags:['muscle-gain','energy'], benefits:'Complete plant protein with all 9 essential amino acids.' },
  { id:'f43', name:'Whole Wheat Bread', emoji:'🍞', category:'Carbs & Fiber', calories:247, protein:13, carbs:41, fat:3.4, fiber:7, servingSize:30, servingLabel:'1 slice', tags:['energy'], benefits:'Complex carbs with B vitamins. Better blood sugar control.' },
  { id:'f44', name:'Ragi (Finger Millet)', emoji:'🌾', category:'Carbs & Fiber', calories:328, protein:7.3, carbs:72, fat:1.3, fiber:11, servingSize:30, servingLabel:'¼ cup', tags:['energy'], benefits:'Highest calcium millet. Great for bone health and diabetics.' },
  { id:'f45', name:'Bajra (Pearl Millet)', emoji:'🌾', category:'Carbs & Fiber', calories:378, protein:12, carbs:67, fat:5, fiber:1.2, servingSize:30, servingLabel:'¼ cup', tags:['energy'], benefits:'Iron and zinc rich. Gluten-free ancient grain.' },

  // ── Healthy Fats & Superfoods ──
  { id:'f46', name:'Almonds', emoji:'🌰', category:'Healthy Fats', calories:579, protein:21, carbs:22, fat:50, fiber:12, servingSize:28, servingLabel:'¼ cup', tags:['skin-hair','muscle-gain'], benefits:'Vitamin E for skin. Healthy fats for heart and brain.' },
  { id:'f47', name:'Walnuts', emoji:'🥜', category:'Healthy Fats', calories:654, protein:15, carbs:14, fat:65, fiber:7, servingSize:28, servingLabel:'¼ cup', tags:['skin-hair'], benefits:'Omega-3 rich nut. Supports brain function and reduces inflammation.' },
  { id:'f48', name:'Chia Seeds', emoji:'🫘', category:'Healthy Fats', calories:486, protein:17, carbs:42, fat:31, fiber:34, servingSize:15, servingLabel:'1 tbsp', tags:['weight-loss','energy'], benefits:'34% fiber! Absorbs 10x weight in water for satiety.' },
  { id:'f49', name:'Flax Seeds', emoji:'🫘', category:'Healthy Fats', calories:534, protein:18, carbs:29, fat:42, fiber:27, servingSize:10, servingLabel:'1 tbsp', tags:['skin-hair'], benefits:'Richest plant source of omega-3. Lignans fight inflammation.' },
  { id:'f50', name:'Peanut Butter', emoji:'🥜', category:'Healthy Fats', calories:588, protein:25, carbs:20, fat:50, fiber:6, servingSize:32, servingLabel:'2 tbsp', tags:['muscle-gain'], benefits:'Calorie-dense protein source. Great for bulking and recovery.' },

  // ── Bonus Drinks ──
  { id:'f51', name:'Green Tea', emoji:'🍵', category:'Drinks', calories:1, protein:0, carbs:0, fat:0, fiber:0, servingSize:240, servingLabel:'1 cup', tags:['weight-loss'], benefits:'Catechins boost metabolism. Antioxidants reduce cell damage.' },
  { id:'f52', name:'Coconut Water', emoji:'🥥', category:'Drinks', calories:19, protein:0.7, carbs:3.7, fat:0.2, fiber:1.1, servingSize:240, servingLabel:'1 cup', tags:['energy'], benefits:'Natural electrolyte drink. Rehydrates better than water.' },
  { id:'f53', name:'Buttermilk', emoji:'🥛', category:'Drinks', calories:40, protein:3.3, carbs:4.8, fat:0.9, fiber:0, servingSize:240, servingLabel:'1 glass', tags:['weight-loss'], benefits:'Probiotics for gut health. Cooling and low-calorie.' },
  { id:'f54', name:'Lemon Water', emoji:'🍋', category:'Drinks', calories:4, protein:0.1, carbs:1.3, fat:0, fiber:0.1, servingSize:240, servingLabel:'1 glass', tags:['weight-loss','skin-hair'], benefits:'Vitamin C and hydration. Supports detox and digestion.' },
];

export const FOOD_CATEGORIES = ['All', 'Protein', 'Vegetable', 'Fruit', 'Carbs & Fiber', 'Healthy Fats', 'Drinks'] as const;

export const GOAL_TAGS: Record<string, { label: string; foods: string[] }> = {
  'weight-loss': { label: '🏋️ Weight Loss', foods: ['Oats','Eggs','Broccoli','Apple','Greek Yogurt','Chicken Breast'] },
  'muscle-gain': { label: '💪 Muscle Gain', foods: ['Chicken Breast','Eggs','Paneer','Salmon','Peanut Butter','Brown Rice'] },
  'skin-hair':   { label: '✨ Skin & Hair', foods: ['Avocado','Walnuts','Papaya','Carrots','Flax Seeds'] },
  'energy':      { label: '⚡ Energy & Stamina', foods: ['Banana','Sweet Potatoes','Quinoa','Ragi (Finger Millet)','Beetroot'] },
};
