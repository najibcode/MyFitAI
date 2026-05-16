import { useState } from 'react';
import { useFitnessContext, type MealType } from '../context/FitnessContext';
import { INDIAN_DISHES, CATEGORIES, type IndianDish } from '../data/indianDishes';
import { NUTRITION_FOODS, FOOD_CATEGORIES, type NutritionFood } from '../data/nutritionFoods';
import { useToast } from '../context/ToastContext';

export default function NutritionPlanner() {
  const { profile, dailyStats, logActivity, todaysMeals, logMeal, deleteMeal, supplements, toggleSupplement, addSupplement, removeSupplement, groceryItems, addGroceryItem, removeGroceryItem, toggleGroceryItem, clearCheckedGroceries } = useFitnessContext();
  const { showToast } = useToast();
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedDish, setSelectedDish] = useState<IndianDish | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickCal, setQuickCal] = useState('');
  const [quickP, setQuickP] = useState('');
  const [quickC, setQuickC] = useState('');
  const [quickF, setQuickF] = useState('');
  const [quickType, setQuickType] = useState<MealType>('Lunch');
  const [logMealType, setLogMealType] = useState<MealType | null>(null);
  const [newSupName, setNewSupName] = useState('');
  const [newSupTime, setNewSupTime] = useState('');
  const [showAddSup, setShowAddSup] = useState(false);
  const [showAddGrocery, setShowAddGrocery] = useState(false);
  const [newGroceryName, setNewGroceryName] = useState('');
  const [newGroceryCat, setNewGroceryCat] = useState('Proteins');
  // Food browser state
  const [selectedFood, setSelectedFood] = useState<NutritionFood | null>(null);
  const [foodGrams, setFoodGrams] = useState<number>(100);
  const [foodSearch, setFoodSearch] = useState('');
  const [foodCatFilter, setFoodCatFilter] = useState<string>('All');

  const hydrationGoal = profile.dailyWaterGoal;
  const hydrationLogged = dailyStats.water;
  const remainingKcal = Math.max(0, profile.dailyCalorieGoal - dailyStats.caloriesConsumed);
  const pGoal = Math.round(profile.dailyCalorieGoal * 0.3 / 4);
  const cGoal = Math.round(profile.dailyCalorieGoal * 0.4 / 4);
  const fGoal = Math.round(profile.dailyCalorieGoal * 0.3 / 9);

  const addHydration = () => {
    logActivity({ type: 'Water', value: 0.25 });
    showToast('+0.25L Water Logged!', 'success');
  };

  const handleQuickAdd = () => {
    const cal = parseInt(quickCal);
    if (!quickName.trim() || !cal || cal <= 0) return;
    logMeal({ name: quickName.trim(), mealType: quickType, calories: cal, protein: parseInt(quickP) || 0, carbs: parseInt(quickC) || 0, fat: parseInt(quickF) || 0 });
    showToast(`${quickName} logged! (+${cal} kcal)`, 'success');
    setQuickName(''); setQuickCal(''); setQuickP(''); setQuickC(''); setQuickF('');
    setShowQuickAdd(false);
  };

  const handleLogRecipe = (dish: IndianDish, type: MealType) => {
    logMeal({ name: dish.name, mealType: type, calories: dish.calories, protein: dish.protein, carbs: dish.carbs, fat: dish.fat });
    showToast(`${dish.name} logged as ${type}! (+${dish.calories} kcal)`, 'success');
    setLogMealType(null);
  };

  const handleAddSupplement = () => {
    if (!newSupName.trim()) return;
    addSupplement(newSupName.trim(), newSupTime.trim() || 'Anytime');
    setNewSupName(''); setNewSupTime(''); setShowAddSup(false);
    showToast('Supplement added!', 'success');
  };

  const handleAddGrocery = () => {
    if (!newGroceryName.trim()) return;
    addGroceryItem(newGroceryName.trim(), newGroceryCat);
    setNewGroceryName('');
    setShowAddGrocery(false);
    showToast('Item added!', 'success');
  };

  const shareGroceryList = () => {
    const cats = [...new Set(groceryItems.map(g => g.category))];
    const list = cats.map(c => `${c}: ${groceryItems.filter(g => g.category === c && !g.checked).map(g => g.name).join(', ')}`).filter(l => l.split(': ')[1]).join('\n');
    navigator.clipboard.writeText(list || 'No items');
    showToast('Grocery list copied!', 'success');
  };

  const handleLogFood = (food: NutritionFood, type: MealType) => {
    const mult = foodGrams / 100;
    logMeal({
      name: `${food.emoji} ${food.name} (${foodGrams}g)`,
      mealType: type,
      calories: Math.round(food.calories * mult),
      protein: Math.round(food.protein * mult),
      carbs: Math.round(food.carbs * mult),
      fat: Math.round(food.fat * mult),
    });
    showToast(`${food.name} logged as ${type}! (+${Math.round(food.calories * mult)} kcal)`, 'success');
    setSelectedFood(null);
  };

  const filteredFoods = NUTRITION_FOODS.filter(f => {
    const matchCat = foodCatFilter === 'All' || f.category === foodCatFilter;
    const matchSearch = f.name.toLowerCase().includes(foodSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  const filteredDishes = INDIAN_DISHES.filter(dish => {
    const matchesCat = activeCategory === 'All' || dish.tags.includes(activeCategory);
    const matchesSearch = dish.name.toLowerCase().includes(searchQuery.toLowerCase()) || dish.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const mealTypeIcons: Record<MealType, string> = { Breakfast: 'egg_alt', Lunch: 'lunch_dining', Dinner: 'dinner_dining', Snack: 'cookie' };
  const mealTypeColors: Record<MealType, string> = { Breakfast: '#ff9800', Lunch: '#6FFB85', Dinner: '#60A5FA', Snack: '#fab0ff' };
  const grouped = (['Breakfast','Lunch','Dinner','Snack'] as MealType[]).map(t => ({ type: t, meals: todaysMeals.filter(m => m.mealType === t) })).filter(g => g.meals.length > 0);

  return (
    <main className="pt-6 pb-32 px-4 max-w-[430px] mx-auto space-y-6 min-h-screen">
      {/* Calorie Dashboard */}
      <section className="bg-[var(--color-surface-container)] rounded-[2rem] p-6 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[100px]" />
        <p className="font-label text-on-surface-variant tracking-[0.2em] uppercase text-[10px] mb-1 relative z-10">Calories Remaining</p>
        <div className="flex items-end gap-3 relative z-10">
          <h1 className="font-headline font-extrabold text-6xl leading-none tracking-tighter text-primary">{remainingKcal}</h1>
          <span className="font-headline text-sm font-bold text-on-surface-variant mb-2">of {profile.dailyCalorieGoal} kcal</span>
        </div>
        <div className="h-2.5 w-full bg-[var(--color-surface-container-highest)] rounded-full overflow-hidden mt-4 relative z-10">
          <div className="h-full bg-primary rounded-full transition-all" style={{width:`${Math.min(100,(dailyStats.caloriesConsumed/profile.dailyCalorieGoal)*100)}%`}} />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5 relative z-10">
          {[{l:'Protein',v:dailyStats.protein,g:pGoal,c:'#FF4D4D'},{l:'Carbs',v:dailyStats.carbs,g:cGoal,c:'#6FFB85'},{l:'Fat',v:dailyStats.fat,g:fGoal,c:'#fab0ff'}].map(m=>(
            <div key={m.l} className="text-center">
              <div className="h-1.5 bg-[var(--color-surface-container-highest)] rounded-full overflow-hidden mb-2">
                <div className="h-full rounded-full transition-all" style={{width:`${Math.min(100,(m.v/m.g)*100)}%`,backgroundColor:m.c}} />
              </div>
              <p className="font-headline font-bold text-sm">{m.v}<span className="text-on-surface-variant font-normal text-xs">/{m.g}g</span></p>
              <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-bold">{m.l}</p>
            </div>
          ))}
        </div>
        <button onClick={()=>setShowQuickAdd(!showQuickAdd)} className="w-full mt-5 bg-primary text-black font-headline font-bold py-3 rounded-2xl text-sm flex items-center justify-center gap-2 active:scale-95 transition-all relative z-10">
          <span className="material-symbols-outlined text-lg">add_circle</span>Log a Meal
        </button>
      </section>

      {/* Quick Add Form */}
      {showQuickAdd && (
        <section className="bg-[var(--color-surface-container)] rounded-[2rem] p-6 space-y-4 border border-primary/20 animate-[slideUp_0.3s_ease-out]">
          <h3 className="font-headline font-bold text-base flex items-center gap-2"><span className="material-symbols-outlined text-primary text-lg">edit_note</span>Quick Add Meal</h3>
          <input value={quickName} onChange={e=>setQuickName(e.target.value)} placeholder="Meal name..." className="w-full bg-[var(--color-surface)] rounded-xl px-4 py-3 text-sm outline-none border border-white/10 focus:border-primary transition-colors" />
          <div className="flex gap-2">
            {(['Breakfast','Lunch','Dinner','Snack'] as MealType[]).map(t=>(
              <button key={t} onClick={()=>setQuickType(t)} className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${quickType===t?'bg-primary text-black':'bg-[var(--color-surface)] text-on-surface-variant border border-white/10'}`}>{t}</button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2">
            <input value={quickCal} onChange={e=>{if(/^\d*$/.test(e.target.value))setQuickCal(e.target.value)}} placeholder="Kcal*" inputMode="numeric" className="bg-[var(--color-surface)] rounded-xl px-3 py-3 text-sm outline-none border border-white/10 focus:border-primary text-center font-bold" />
            <input value={quickP} onChange={e=>{if(/^\d*$/.test(e.target.value))setQuickP(e.target.value)}} placeholder="P (g)" inputMode="numeric" className="bg-[var(--color-surface)] rounded-xl px-3 py-3 text-sm outline-none border border-white/10 focus:border-[#FF4D4D] text-center" />
            <input value={quickC} onChange={e=>{if(/^\d*$/.test(e.target.value))setQuickC(e.target.value)}} placeholder="C (g)" inputMode="numeric" className="bg-[var(--color-surface)] rounded-xl px-3 py-3 text-sm outline-none border border-white/10 focus:border-[#6FFB85] text-center" />
            <input value={quickF} onChange={e=>{if(/^\d*$/.test(e.target.value))setQuickF(e.target.value)}} placeholder="F (g)" inputMode="numeric" className="bg-[var(--color-surface)] rounded-xl px-3 py-3 text-sm outline-none border border-white/10 focus:border-[#fab0ff] text-center" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleQuickAdd} disabled={!quickName.trim()||!quickCal||parseInt(quickCal)<=0} className="flex-1 bg-primary text-black font-bold py-3 rounded-xl text-sm active:scale-95 disabled:opacity-40">Add Meal</button>
            <button onClick={()=>setShowQuickAdd(false)} className="px-5 py-3 rounded-xl text-sm text-on-surface-variant bg-[var(--color-surface)] border border-white/10">Cancel</button>
          </div>
        </section>
      )}

      {/* Today's Meals */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-headline font-bold text-lg">Today's Meals</h2>
          <span className="text-xs text-on-surface-variant font-medium">{dailyStats.caloriesConsumed} kcal consumed</span>
        </div>
        {grouped.length === 0 ? (
          <div className="bg-[var(--color-surface-container)] rounded-2xl p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-2 block">restaurant</span>
            <p className="text-on-surface-variant text-sm">No meals logged yet today</p>
            <p className="text-on-surface-variant/50 text-xs mt-1">Tap "Log a Meal" or browse recipes below</p>
          </div>
        ) : grouped.map(g=>(
          <div key={g.type} className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2" style={{color:mealTypeColors[g.type]}}><span className="material-symbols-outlined text-sm" style={{fontVariationSettings:"'FILL' 1"}}>{mealTypeIcons[g.type]}</span>{g.type}</p>
            {g.meals.map(meal=>(
              <div key={meal.id} className="bg-[var(--color-surface-container)] rounded-2xl px-4 py-3 flex items-center gap-3 group">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{meal.name}</p>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">P:{meal.protein}g · C:{meal.carbs}g · F:{meal.fat}g</p>
                </div>
                <span className="font-headline font-bold text-sm text-primary whitespace-nowrap">{meal.calories}</span>
                <button onClick={()=>{deleteMeal(meal.id);showToast('Meal removed','info')}} className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant/40 hover:text-[#FF4D4D] hover:bg-[#FF4D4D]/10 transition-colors opacity-0 group-hover:opacity-100">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            ))}
          </div>
        ))}
      </section>
      {/* Hydration */}
      <section className="bg-[var(--color-surface-container)] rounded-2xl p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#00b4d8]/10 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-[#00b4d8] text-xl" style={{fontVariationSettings:"'FILL' 1"}}>water_drop</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline mb-1.5">
            <span className="font-headline font-bold text-sm">Hydration</span>
            <span className="text-xs text-on-surface-variant">{hydrationLogged.toFixed(1)}L / {hydrationGoal}L</span>
          </div>
          <div className="h-2 bg-[var(--color-surface-container-highest)] rounded-full overflow-hidden">
            <div className="h-full bg-[#00b4d8] rounded-full transition-all" style={{width:`${Math.min(100,(hydrationLogged/hydrationGoal)*100)}%`}} />
          </div>
        </div>
        <button onClick={addHydration} className="w-10 h-10 rounded-xl bg-[#00b4d8]/10 flex items-center justify-center text-[#00b4d8] hover:bg-[#00b4d8]/20 active:scale-90 transition-all flex-shrink-0">
          <span className="material-symbols-outlined text-lg">add</span>
        </button>
      </section>

      {/* Daily Nutrition Insights — computed from real data */}
      <section className="bg-[var(--color-surface-container)] rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-[#ff9800] text-lg" style={{fontVariationSettings:"'FILL' 1"}}>lightbulb</span>
          <h3 className="font-headline font-bold text-sm">Nutrition Insights</h3>
        </div>
        {(() => {
          const tips: {icon:string;text:string;color:string}[] = [];
          const pPct = Math.round((dailyStats.protein / pGoal) * 100);
          const cPct = Math.round((dailyStats.caloriesConsumed / profile.dailyCalorieGoal) * 100);
          const hPct = Math.round((hydrationLogged / hydrationGoal) * 100);
          if (pPct < 30 && todaysMeals.length > 0) tips.push({icon:'fitness_center',text:`Protein at ${pPct}% — add a high-protein meal to hit your target.`,color:'#FF4D4D'});
          else if (pPct >= 80) tips.push({icon:'verified',text:`Great protein intake at ${pPct}%! Muscle recovery on track.`,color:'#6FFB85'});
          if (cPct > 90) tips.push({icon:'warning',text:`You've used ${cPct}% of your calorie budget. Go easy on snacks!`,color:'#ff9800'});
          if (hPct < 40) tips.push({icon:'water_drop',text:`Only ${hPct}% hydrated — drink more water to boost metabolism.`,color:'#00b4d8'});
          else if (hPct >= 100) tips.push({icon:'check_circle',text:'Hydration goal met! Great job staying hydrated.',color:'#6FFB85'});
          if (todaysMeals.length === 0) tips.push({icon:'restaurant',text:'No meals logged today. Start tracking to see your macros!',color:'#fab0ff'});
          if (tips.length === 0) tips.push({icon:'emoji_events',text:'You\'re doing great! Keep up the balanced nutrition.',color:'#6FFB85'});
          return tips.map((t,i)=>(
            <div key={i} className="flex items-start gap-3 py-1">
              <span className="material-symbols-outlined text-base mt-0.5" style={{color:t.color,fontVariationSettings:"'FILL' 1"}}>{t.icon}</span>
              <p className="text-xs text-on-surface-variant leading-relaxed">{t.text}</p>
            </div>
          ));
        })()}
      </section>

      {/* Supplements — Firebase persistent */}
      <section className="bg-[var(--color-surface-container)] rounded-[2rem] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-xl" style={{fontVariationSettings:"'FILL' 1"}}>medication</span>
            <h2 className="font-headline font-bold text-base">Supplements</h2>
          </div>
          <button onClick={()=>setShowAddSup(!showAddSup)} className="text-xs text-primary font-bold flex items-center gap-1 hover:opacity-70">
            <span className="material-symbols-outlined text-sm">add</span>Add
          </button>
        </div>
        {showAddSup && (
          <div className="flex gap-2">
            <input value={newSupName} onChange={e=>setNewSupName(e.target.value)} placeholder="Name" className="flex-1 bg-[var(--color-surface)] rounded-xl px-3 py-2.5 text-sm outline-none border border-white/10 focus:border-primary" />
            <input value={newSupTime} onChange={e=>setNewSupTime(e.target.value)} placeholder="Time" className="w-24 bg-[var(--color-surface)] rounded-xl px-3 py-2.5 text-sm outline-none border border-white/10 focus:border-primary" />
            <button onClick={handleAddSupplement} className="px-4 bg-primary text-black rounded-xl font-bold text-sm active:scale-95">+</button>
          </div>
        )}
        <div className="space-y-2">
          {supplements.map(s=>(
            <div key={s.id} className="flex items-center gap-3 group cursor-pointer" onClick={()=>toggleSupplement(s.id)}>
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${s.done?'border-secondary bg-secondary/10':'border-[var(--color-outline)]'}`}>
                {s.done && <span className="material-symbols-outlined text-secondary text-xs" style={{fontVariationSettings:"'FILL' 1"}}>check</span>}
              </div>
              <span className={`flex-1 text-sm font-medium ${s.done?'line-through text-on-surface-variant':''}`}>{s.name}</span>
              <span className="text-[9px] text-on-surface-variant uppercase tracking-wider font-bold">{s.time}</span>
              <button onClick={e=>{e.stopPropagation();removeSupplement(s.id);showToast('Removed','info')}} className="opacity-0 group-hover:opacity-100 text-on-surface-variant/40 hover:text-[#FF4D4D] transition-all">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          ))}
          {supplements.length===0 && <p className="text-on-surface-variant text-sm text-center py-4">No supplements added yet</p>}
        </div>
      </section>

      {/* Grocery List — Firebase persistent, fully editable */}
      <section className="bg-[var(--color-surface-container)] rounded-[2rem] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-xl" style={{fontVariationSettings:"'FILL' 1"}}>shopping_cart</span>
            <h2 className="font-headline font-bold text-base">Grocery List</h2>
            <span className="text-[9px] text-on-surface-variant font-bold bg-[var(--color-surface)] px-2 py-0.5 rounded-full">{groceryItems.filter(g=>!g.checked).length} items</span>
          </div>
          <div className="flex items-center gap-2">
            {groceryItems.some(g=>g.checked) && (
              <button onClick={()=>{clearCheckedGroceries();showToast('Checked items cleared','info')}} className="text-[10px] text-[#FF4D4D] font-bold flex items-center gap-0.5 hover:opacity-70">
                <span className="material-symbols-outlined text-xs">delete_sweep</span>Clear
              </button>
            )}
            <button onClick={shareGroceryList} className="text-[10px] text-primary font-bold flex items-center gap-0.5 hover:opacity-70">
              <span className="material-symbols-outlined text-xs">share</span>Copy
            </button>
            <button onClick={()=>setShowAddGrocery(!showAddGrocery)} className="text-[10px] text-primary font-bold flex items-center gap-0.5 hover:opacity-70">
              <span className="material-symbols-outlined text-xs">add</span>Add
            </button>
          </div>
        </div>
        {showAddGrocery && (
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <input value={newGroceryName} onChange={e=>setNewGroceryName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')handleAddGrocery()}} placeholder="Item name..." className="w-full bg-[var(--color-surface)] rounded-xl px-3 py-2.5 text-sm outline-none border border-white/10 focus:border-primary transition-colors" autoFocus />
            </div>
            <select value={newGroceryCat} onChange={e=>setNewGroceryCat(e.target.value)} className="bg-[var(--color-surface)] rounded-xl px-3 py-2.5 text-sm outline-none border border-white/10 text-on-surface-variant appearance-none cursor-pointer">
              <option value="Proteins">🥩 Proteins</option>
              <option value="Carbs">🍚 Carbs</option>
              <option value="Veggies">🥦 Veggies</option>
              <option value="Dairy">🥛 Dairy</option>
              <option value="Snacks">🍪 Snacks</option>
              <option value="Other">📦 Other</option>
            </select>
            <button onClick={handleAddGrocery} className="px-4 py-2.5 bg-primary text-black rounded-xl font-bold text-sm active:scale-95">+</button>
          </div>
        )}
        {(() => {
          const catColors: Record<string,string> = { Proteins:'#FF4D4D', Carbs:'#ff9800', Veggies:'#6FFB85', Dairy:'#60A5FA', Snacks:'#fab0ff', Other:'#9ca3af' };
          const categories = [...new Set(groceryItems.map(g=>g.category))];
          return categories.length === 0 ? (
            <div className="text-center py-6">
              <span className="material-symbols-outlined text-3xl text-on-surface-variant/30 block mb-2">shopping_cart</span>
              <p className="text-on-surface-variant text-sm">No items yet. Tap Add to start your list.</p>
            </div>
          ) : categories.map(cat => {
            const items = groceryItems.filter(g=>g.category===cat);
            const color = catColors[cat] || '#9ca3af';
            return (
              <div key={cat}>
                <p className="text-[9px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{color}}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{backgroundColor:color}} />{cat}
                </p>
                {items.map(item=>(
                  <div key={item.id} className="flex items-center gap-3 py-1.5 group cursor-pointer" onClick={()=>toggleGroceryItem(item.id)}>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${item.checked?'border-primary bg-primary/10':'border-[var(--color-outline)]'}`}>
                      {item.checked && <span className="material-symbols-outlined text-primary text-xs">check</span>}
                    </div>
                    <span className={`flex-1 text-sm ${item.checked?'text-on-surface-variant/50 line-through':'text-on-surface-variant hover:text-on-surface'}`}>{item.name}</span>
                    <button onClick={e=>{e.stopPropagation();removeGroceryItem(item.id);showToast('Removed','info')}} className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full flex items-center justify-center text-on-surface-variant/40 hover:text-[#FF4D4D] hover:bg-[#FF4D4D]/10 transition-all">
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                ))}
              </div>
            );
          });
        })()}
      </section>

      {/* ── Food Database — Nutrition Info & Meal Logging ── */}
      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6FFB85] to-[#00b4d8] flex items-center justify-center shadow-[0_4px_20px_rgba(0,180,216,0.25)]">
            <span className="material-symbols-outlined text-[#fff] text-lg" style={{fontVariationSettings:"'FILL' 1"}}>nutrition</span>
          </div>
          <div>
            <h2 className="font-headline text-xl font-bold">Food Database</h2>
            <p className="text-[9px] text-on-surface-variant uppercase tracking-widest font-bold">{NUTRITION_FOODS.length} foods · tap to log</p>
          </div>
        </div>
        {/* Search */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-lg">search</span>
          <input value={foodSearch} onChange={e=>setFoodSearch(e.target.value)} placeholder="Search foods..." className="w-full bg-[var(--color-surface-container)] rounded-2xl pl-11 pr-4 py-3 text-sm outline-none border border-white/5 focus:border-primary/40 transition-colors" />
        </div>
        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {FOOD_CATEGORIES.map(cat=>(
            <button key={cat} onClick={()=>setFoodCatFilter(cat)} className={`px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide whitespace-nowrap transition-all ${foodCatFilter===cat?'bg-primary text-black shadow-[0_2px_12px_rgba(255,122,0,0.3)]':'bg-[var(--color-surface-container)] text-on-surface-variant hover:text-on-surface'}`}>{cat}</button>
          ))}
        </div>
        {/* Food grid */}
        <div className="grid grid-cols-2 gap-3">
          {filteredFoods.slice(0,20).map(food=>(
            <button key={food.id} onClick={()=>{setSelectedFood(food);setFoodGrams(food.servingSize)}} className="bg-[var(--color-surface-container)] rounded-2xl p-4 text-left hover:ring-1 hover:ring-primary/30 transition-all active:scale-[0.97] space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{food.emoji}</span>
                <span className="text-sm font-bold leading-tight truncate">{food.name}</span>
              </div>
              <div className="flex justify-between text-[10px] text-on-surface-variant">
                <span className="font-bold text-primary">{Math.round(food.calories*food.servingSize/100)} kcal</span>
                <span>{food.servingLabel}</span>
              </div>
              <div className="flex gap-1.5">
                <span className="text-[8px] font-bold bg-[#FF4D4D]/15 text-[#FF4D4D] px-1.5 py-0.5 rounded-full">P {Math.round(food.protein*food.servingSize/100)}g</span>
                <span className="text-[8px] font-bold bg-[#ff9800]/15 text-[#ff9800] px-1.5 py-0.5 rounded-full">C {Math.round(food.carbs*food.servingSize/100)}g</span>
                <span className="text-[8px] font-bold bg-[#fab0ff]/15 text-[#fab0ff] px-1.5 py-0.5 rounded-full">F {Math.round(food.fat*food.servingSize/100)}g</span>
              </div>
            </button>
          ))}
        </div>
        {filteredFoods.length > 20 && <p className="text-center text-xs text-on-surface-variant">Showing 20 of {filteredFoods.length} · search to find more</p>}
        {filteredFoods.length === 0 && <p className="text-center text-sm text-on-surface-variant py-4">No foods match your search</p>}
      </section>

      {/* ── Food Detail Modal ── */}
      {selectedFood && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={()=>setSelectedFood(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div onClick={e=>e.stopPropagation()} className="relative bg-[var(--color-surface-container)] rounded-t-[2rem] w-full max-w-[430px] p-6 pb-10 space-y-5 animate-slide-up max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{selectedFood.emoji}</span>
                <div>
                  <h3 className="font-headline font-bold text-lg">{selectedFood.name}</h3>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">{selectedFood.category}</p>
                </div>
              </div>
              <button onClick={()=>setSelectedFood(null)} className="w-8 h-8 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Benefits */}
            <div className="bg-[var(--color-surface)]/50 rounded-xl p-3 flex gap-2.5 items-start">
              <span className="material-symbols-outlined text-[#6FFB85] text-base mt-0.5" style={{fontVariationSettings:"'FILL' 1"}}>eco</span>
              <p className="text-xs text-on-surface-variant leading-relaxed">{selectedFood.benefits}</p>
            </div>

            {/* Amount in Grams */}
            <div>
              <p className="text-[9px] text-on-surface-variant uppercase tracking-widest font-bold mb-2">Amount (Grams)</p>
              <div className="flex items-center gap-3 bg-[var(--color-surface)] rounded-xl p-3">
                <input 
                  type="number" 
                  inputMode="numeric"
                  value={foodGrams || ''} 
                  onChange={e => setFoodGrams(Math.max(0, parseInt(e.target.value) || 0))} 
                  className="flex-1 bg-transparent font-headline font-bold text-2xl text-center outline-none"
                />
                <span className="text-sm text-on-surface-variant font-bold pr-4">g</span>
              </div>
              <p className="text-center text-[10px] text-on-surface-variant mt-2">
                Standard serving: {selectedFood.servingSize}g ({selectedFood.servingLabel})
              </p>
            </div>

            {/* Macro breakdown */}
            <div>
              <p className="text-[9px] text-on-surface-variant uppercase tracking-widest font-bold mb-2">Nutrition for {foodGrams}g</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label:'Calories', val:Math.round(selectedFood.calories*foodGrams/100), unit:'kcal', color:'#ff9800' },
                  { label:'Protein', val:Math.round(selectedFood.protein*foodGrams/100), unit:'g', color:'#FF4D4D' },
                  { label:'Carbs', val:Math.round(selectedFood.carbs*foodGrams/100), unit:'g', color:'#ff9800' },
                  { label:'Fat', val:Math.round(selectedFood.fat*foodGrams/100), unit:'g', color:'#fab0ff' },
                ].map((m,i)=>(
                  <div key={i} className="bg-[var(--color-surface)] rounded-xl p-3 text-center">
                    <p className="font-headline font-bold text-lg" style={{color:m.color}}>{m.val}</p>
                    <p className="text-[9px] text-on-surface-variant">{m.unit}</p>
                    <p className="text-[8px] text-on-surface-variant/60 uppercase tracking-wider mt-0.5">{m.label}</p>
                  </div>
                ))}
              </div>
              {/* Fiber if present */}
              {selectedFood.fiber > 0 && (
                <div className="mt-2 flex items-center gap-2 bg-[var(--color-surface)] rounded-xl px-3 py-2">
                  <span className="material-symbols-outlined text-[#6FFB85] text-sm" style={{fontVariationSettings:"'FILL' 1"}}>grass</span>
                  <span className="text-xs text-on-surface-variant">Fiber: <span className="font-bold text-on-surface">{Math.round(selectedFood.fiber*foodGrams/100)}g</span></span>
                </div>
              )}
            </div>

            {/* Per 100g reference */}
            <div className="bg-[var(--color-surface)]/30 rounded-xl p-3">
              <p className="text-[9px] text-on-surface-variant/60 uppercase tracking-widest font-bold mb-1.5">Per 100g reference</p>
              <div className="flex justify-between text-xs text-on-surface-variant">
                <span>{selectedFood.calories} kcal</span>
                <span>P: {selectedFood.protein}g</span>
                <span>C: {selectedFood.carbs}g</span>
                <span>F: {selectedFood.fat}g</span>
              </div>
            </div>

            {/* Goal tags */}
            {selectedFood.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedFood.tags.map(tag=>{
                  const tagLabels: Record<string,string> = {'weight-loss':'🏋️ Weight Loss','muscle-gain':'💪 Muscle Gain','skin-hair':'✨ Skin & Hair','energy':'⚡ Energy'};
                  return <span key={tag} className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold">{tagLabels[tag]||tag}</span>;
                })}
              </div>
            )}

            {/* Log as meal buttons */}
            <div>
              <p className="text-[9px] text-on-surface-variant uppercase tracking-widest font-bold mb-2">Log this food as</p>
              <div className="grid grid-cols-4 gap-2">
                {(['Breakfast','Lunch','Dinner','Snack'] as MealType[]).map(type=>(
                  <button key={type} onClick={()=>handleLogFood(selectedFood,type)} className="py-3 rounded-xl bg-primary text-black font-bold text-xs active:scale-95 transition-transform hover:shadow-[0_4px_20px_rgba(255,122,0,0.3)]">
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fuel Kitchen — Recipes */}
      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-[#FF4D4D] flex items-center justify-center shadow-[0_4px_20px_rgba(255,122,0,0.25)]">
            <span className="material-symbols-outlined text-[#fff] text-lg" style={{fontVariationSettings:"'FILL' 1"}}>restaurant</span>
          </div>
          <div>
            <h2 className="font-headline text-xl font-bold">Fuel Kitchen</h2>
            <p className="text-[9px] text-on-surface-variant uppercase tracking-widest font-bold">{INDIAN_DISHES.length} Recipes</p>
          </div>
        </div>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-lg">search</span>
          <input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search recipes..." className="w-full bg-[var(--color-surface-container)] border border-[var(--color-outline)] rounded-2xl py-3.5 pl-11 pr-4 text-sm outline-none focus:border-primary/50 transition-colors" />
        </div>
        <div className="flex overflow-x-auto gap-2 pb-1 [scrollbar-width:none]">
          {CATEGORIES.map(cat=>(
            <button key={cat} onClick={()=>setActiveCategory(cat)} className={`whitespace-nowrap px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 border ${activeCategory===cat?'bg-primary text-black border-primary':'bg-[var(--color-surface-container)] text-on-surface-variant border-[var(--color-outline)]'}`}>{cat}</button>
          ))}
        </div>
        <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Showing {filteredDishes.length} dishes</p>
        <div className="flex flex-col gap-5">
          {filteredDishes.map(dish=>(
            <div key={dish.id} onClick={()=>setSelectedDish(dish)} className="bg-[var(--color-surface-container)] rounded-[2rem] overflow-hidden group hover:bg-[var(--color-surface-container-high)] transition-all cursor-pointer hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)] hover:-translate-y-1 duration-300">
              <div className="h-44 relative overflow-hidden">
                <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={dish.name} src={dish.image} loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute top-3 left-3"><span className="bg-[#00000099] backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-bold text-[#fff] uppercase tracking-wider">{dish.prepTime}</span></div>
                <div className="absolute top-3 right-3"><span className="bg-primary/90 px-3 py-1 rounded-lg text-[10px] font-bold text-black uppercase tracking-wider">{dish.calories} KCAL</span></div>
              </div>
              <div className="p-5 space-y-3">
                <h3 className="font-headline font-bold text-lg tracking-tight group-hover:text-primary transition-colors">{dish.name}</h3>
                <p className="text-on-surface-variant text-xs leading-relaxed line-clamp-2">{dish.description}</p>
                <div className="pt-3 border-t border-[var(--color-outline-variant)]/30 flex justify-between items-center">
                  <div className="flex gap-4">
                    <div className="text-center"><p className="text-[9px] text-on-surface-variant uppercase font-bold">Protein</p><p className="font-headline font-bold text-sm text-primary">{dish.protein}g</p></div>
                    <div className="text-center"><p className="text-[9px] text-on-surface-variant uppercase font-bold">Carbs</p><p className="font-headline font-bold text-sm text-secondary">{dish.carbs}g</p></div>
                    <div className="text-center"><p className="text-[9px] text-on-surface-variant uppercase font-bold">Fat</p><p className="font-headline font-bold text-sm text-[#fab0ff]">{dish.fat}g</p></div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><span className="material-symbols-outlined text-primary text-sm">arrow_forward</span></div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {filteredDishes.length===0 && (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/20 mb-3 block">search_off</span>
            <p className="font-headline text-lg font-bold text-on-surface-variant/50">No dishes found</p>
          </div>
        )}
      </section>
      {/* Recipe Detail Modal */}
      {selectedDish && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-lg flex items-start justify-center overflow-y-auto p-4" onClick={()=>{setSelectedDish(null);setLogMealType(null)}}>
          <div className="bg-[var(--color-surface)] rounded-[2rem] max-w-2xl w-full my-4 overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.6)] border border-white/5" onClick={e=>e.stopPropagation()}>
            <div className="relative h-56 overflow-hidden">
              <img className="w-full h-full object-cover" alt={selectedDish.name} src={selectedDish.image} />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface)] via-transparent to-transparent" />
              <button onClick={()=>{setSelectedDish(null);setLogMealType(null)}} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[#00000099] backdrop-blur-md flex items-center justify-center text-[#fff]">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
              <div className="absolute bottom-4 left-6 right-6">
                <span className="bg-[#ff9800]/90 px-3 py-1 rounded-lg text-[10px] font-bold text-black uppercase tracking-wider">{selectedDish.category}</span>
                <h2 className="font-headline font-black text-2xl tracking-tight mt-2 text-[#fff] drop-shadow-lg">{selectedDish.name}</h2>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-5 gap-2">
                {[{l:'Calories',v:selectedDish.calories,u:'kcal',c:'#FF7A00'},{l:'Protein',v:selectedDish.protein,u:'g',c:'#FF4D4D'},{l:'Carbs',v:selectedDish.carbs,u:'g',c:'#6FFB85'},{l:'Fat',v:selectedDish.fat,u:'g',c:'#fab0ff'},{l:'Fiber',v:selectedDish.fiber,u:'g',c:'#ff9800'}].map((s,i)=>(
                  <div key={i} className="bg-[var(--color-surface-container)] rounded-xl p-2 text-center border border-white/5">
                    <p className="text-[7px] uppercase tracking-wider font-bold mb-0.5" style={{color:s.c}}>{s.l}</p>
                    <p className="font-headline font-black text-base leading-none">{s.v}<span className="text-[8px] text-on-surface-variant ml-0.5">{s.u}</span></p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <div className="flex-1 bg-[var(--color-surface-container)] rounded-xl p-3 flex items-center gap-3 border border-white/5">
                  <span className="material-symbols-outlined text-primary">timer</span>
                  <div><p className="text-[8px] text-on-surface-variant uppercase tracking-widest font-bold">Prep</p><p className="font-headline font-bold text-sm">{selectedDish.prepTime}</p></div>
                </div>
                <a href={selectedDish.youtubeUrl} target="_blank" rel="noopener noreferrer" className="flex-1 bg-[#FF0000]/10 rounded-xl p-3 flex items-center gap-3 border border-[#FF0000]/20 hover:border-[#FF0000]/40 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-[#FF0000] flex items-center justify-center shadow-[0_4px_15px_rgba(255,0,0,0.3)]"><span className="material-symbols-outlined text-white text-base" style={{fontVariationSettings:"'FILL' 1"}}>play_arrow</span></div>
                  <div><p className="text-[8px] text-[#FF0000] uppercase tracking-widest font-bold">Video</p><p className="font-headline font-bold text-xs">{selectedDish.youtubeChannel}</p></div>
                </a>
              </div>
              <div><h3 className="font-headline font-bold text-xs uppercase tracking-widest text-primary mb-2">About</h3><p className="text-on-surface-variant text-sm leading-relaxed">{selectedDish.description}</p></div>
              <div><h3 className="font-headline font-bold text-xs uppercase tracking-widest text-secondary mb-2">Ingredients ({selectedDish.ingredients.length})</h3>
                <div className="grid grid-cols-1 gap-1.5">{selectedDish.ingredients.map((item,i)=>(
                  <div key={i} className="flex items-center gap-2 py-1.5 px-3 bg-[var(--color-surface-container)] rounded-xl border border-white/5">
                    <span className="text-[10px] font-bold text-secondary w-4">{i+1}</span><span className="text-sm text-on-surface">{item}</span>
                  </div>
                ))}</div>
              </div>
              <div><h3 className="font-headline font-bold text-xs uppercase tracking-widest text-[#ff9800] mb-2">Steps</h3>
                <div className="space-y-2">{selectedDish.steps.map((step,i)=>(
                  <div key={i} className="flex gap-3 p-3 bg-[var(--color-surface-container)] rounded-xl border border-white/5">
                    <div className="w-6 h-6 rounded-full bg-[#ff9800]/10 flex items-center justify-center flex-shrink-0"><span className="font-headline font-black text-[10px] text-[#ff9800]">{i+1}</span></div>
                    <p className="text-sm text-on-surface-variant leading-relaxed">{step}</p>
                  </div>
                ))}</div>
              </div>
              {/* Log This Meal */}
              <div className="border-t border-[var(--color-outline-variant)]/30 pt-4 space-y-3">
                <h3 className="font-headline font-bold text-xs uppercase tracking-widest text-primary flex items-center gap-2"><span className="material-symbols-outlined text-sm">add_circle</span>Log This Meal</h3>
                {logMealType === null ? (
                  <div className="grid grid-cols-4 gap-2">
                    {(['Breakfast','Lunch','Dinner','Snack'] as MealType[]).map(t=>(
                      <button key={t} onClick={()=>handleLogRecipe(selectedDish,t)} className="py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-[var(--color-surface-container)] border border-white/10 hover:border-primary hover:text-primary transition-all active:scale-95 flex flex-col items-center gap-1">
                        <span className="material-symbols-outlined text-base" style={{color:mealTypeColors[t],fontVariationSettings:"'FILL' 1"}}>{mealTypeIcons[t]}</span>{t}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-secondary font-bold text-sm py-2">✓ Logged as {logMealType}</p>
                )}
              </div>
              <div className="flex gap-3">
                <a href={selectedDish.youtubeUrl} target="_blank" rel="noopener noreferrer" className="flex-1 bg-[#FF0000] text-white py-3.5 rounded-2xl font-bold text-sm text-center flex items-center justify-center gap-2 active:scale-95 transition-all">
                  <span className="material-symbols-outlined text-base" style={{fontVariationSettings:"'FILL' 1"}}>play_circle</span>Watch
                </a>
                <button onClick={()=>{setSelectedDish(null);setLogMealType(null)}} className="px-6 py-3.5 bg-[var(--color-surface-container-high)] rounded-2xl font-bold text-sm text-on-surface-variant border border-[var(--color-outline)] active:scale-95">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
