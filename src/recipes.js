/** Pure recipe helpers, shared by the UI and the data-integrity checks. */
export const categories = [
  { id: "all", label: "Все рецепты", italian: "Tutti" },
  { id: "breakfast", label: "Завтраки", italian: "Colazione" },
  { id: "lunch", label: "Обеды и ужины", italian: "Pranzo" },
  { id: "dessert", label: "Десерты", italian: "Dolci" },
  { id: "favorites", label: "Избранное", italian: "Preferiti" },
];

export function belongsTo(recipe, category, favorites = new Set()) {
  if (category === "favorites") return favorites.has(recipe.slug);
  if (category === "breakfast") return /завтрак/i.test(recipe.category);
  if (category === "lunch") return /обед|ужин|хлеба/i.test(recipe.category);
  if (category === "dessert") return /десерт/i.test(recipe.category);
  return true;
}

export function filterRecipes(recipes, category, query, favorites) {
  const normalized = query.trim().toLocaleLowerCase("ru").replaceAll("ё", "е");
  return recipes.filter((recipe) => {
    const haystack = [
      recipe.title,
      recipe.tagline,
      recipe.category,
      ...recipe.variants.flatMap((v) => v.ingredients.map((i) => i.name)),
    ]
      .join(" ")
      .toLocaleLowerCase("ru")
      .replaceAll("ё", "е");
    return (
      belongsTo(recipe, category, favorites) && haystack.includes(normalized)
    );
  });
}

export function recipeCount(count) {
  const last = count % 10;
  const teens = count % 100 >= 11 && count % 100 <= 14;
  return `${count} ${!teens && last === 1 ? "рецепт" : !teens && last >= 2 && last <= 4 ? "рецепта" : "рецептов"}`;
}

export function parseRoute(hash) {
  const [path, query = ""] = hash.replace(/^#/, "").split("?");
  const match = path.match(/^\/recipes\/([^/]+)\/?$/);
  let slug = null;
  try {
    slug = match ? decodeURIComponent(match[1]) : null;
  } catch {
    slug = "__invalid__";
  }
  return { slug, variantId: new URLSearchParams(query).get("v") };
}

export function coverPhoto(recipe, variant, photos) {
  return variant.photos[0] || photos[recipe.slug]?.[variant.id]?.main || "";
}
