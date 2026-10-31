import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import {
  categories,
  filterRecipes,
  recipeCount,
  parseRoute,
  coverPhoto,
} from "../src/recipes.js";

const root = new URL("../", import.meta.url);
const recipes = JSON.parse(readFileSync(new URL("data/recipes.json", root)));
const photos = JSON.parse(readFileSync(new URL("data/step-photos.json", root)));

test("all 12 original recipes and every nested field survive migration unchanged", () => {
  const bundle = readFileSync(new URL("assets/book-C2y7187q.js", root), "utf8");
  const start = bundle.indexOf("pr=[") + 3;
  const end = bundle.indexOf(",mr=e=>", start);
  const original = vm.runInNewContext(
    `const fr=e=>({id:'recept',label:'Рецепт',hint:'',...e}); (${bundle.slice(start, end)})`,
  );
  assert.deepEqual(recipes, JSON.parse(JSON.stringify(original)));
  assert.equal(recipes.length, 12);
  assert.equal(new Set(recipes.map((r) => r.slug)).size, 12);
});

test("every recipe cover and all 63 mapped photos exist in the deployable directory", () => {
  let mapped = 0;
  for (const recipe of recipes) {
    for (const variant of recipe.variants) {
      const cover = coverPhoto(recipe, variant, photos);
      assert.ok(cover, `${recipe.slug} cover missing`);
      for (const path of [...variant.photos, cover]) {
        assert.ok(existsSync(new URL(path, root)), `${path} missing`);
      }
      for (const [key, path] of Object.entries(
        photos[recipe.slug]?.[variant.id] || {},
      )) {
        assert.ok(existsSync(new URL(path, root)), `${path} missing`);
        if (key !== "main") assert.ok(Number(key) <= variant.steps.length);
        mapped++;
      }
    }
  }
  assert.equal(mapped, 63);
});

test("search finds recipe ingredients in every variant and normalizes Russian ё", () => {
  assert.deepEqual(
    filterRecipes(recipes, "all", "  СПАРЖА ", new Set()).map((r) => r.slug),
    ["salmon-foil"],
  );
  assert.deepEqual(
    filterRecipes(recipes, "all", "лепешка", new Set()).map((r) => r.slug),
    ["cottage-flatbread"],
  );
  assert.equal(
    filterRecipes(recipes, "all", "невозможный ингредиент", new Set()).length,
    0,
  );
});

test("category and favorites filters compose with search without changing original ordering", () => {
  assert.equal(filterRecipes(recipes, "breakfast", "", new Set()).length, 4);
  assert.equal(filterRecipes(recipes, "dessert", "", new Set()).length, 4);
  const saved = new Set(["salmon-foil", "protein-bowl"]);
  assert.deepEqual(
    filterRecipes(recipes, "favorites", "", saved).map((r) => r.slug),
    ["protein-bowl", "salmon-foil"],
  );
  assert.deepEqual(
    filterRecipes(recipes, "favorites", "лимон", saved).map((r) => r.slug),
    ["salmon-foil"],
  );
  assert.equal(filterRecipes(recipes, "favorites", "", new Set()).length, 0);
  for (const recipe of recipes)
    assert.ok(
      categories.some(
        (c) =>
          c.id !== "all" &&
          c.id !== "favorites" &&
          filterRecipes([recipe], c.id, "", new Set()).length,
      ),
    );
});

test("original hash links preserve recipe slug and variant, including malformed input", () => {
  assert.deepEqual(parseRoute("#/recipes/protein-bowl?v=porciya"), {
    slug: "protein-bowl",
    variantId: "porciya",
  });
  assert.equal(parseRoute("#/recipes/poke/").slug, "poke");
  assert.equal(parseRoute("#/recipes").slug, null);
  assert.equal(parseRoute("#/recipes/%E0%A4%A").slug, "__invalid__");
});

test("recipe counter uses correct Russian plural forms", () => {
  assert.deepEqual([0, 1, 2, 4, 5, 11, 12, 21, 22].map(recipeCount), [
    "0 рецептов",
    "1 рецепт",
    "2 рецепта",
    "4 рецепта",
    "5 рецептов",
    "11 рецептов",
    "12 рецептов",
    "21 рецепт",
    "22 рецепта",
  ]);
});
