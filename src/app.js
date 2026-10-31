import {
  categories,
  filterRecipes,
  recipeCount,
  parseRoute,
  coverPhoto,
} from "./recipes.js";

const app = document.querySelector("#app");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const favoriteKey = "la-cucina:favorites";
let recipes = [];
let photos = {};
let category = "all";
let search = "";
let observer;
let toastTimeout;
const ingredientChecks = new Map();
let favorites = new Set();
try {
  const saved = JSON.parse(localStorage.getItem(favoriteKey) || "[]");
  if (Array.isArray(saved))
    favorites = new Set(saved.filter((slug) => typeof slug === "string"));
} catch {
  /* The book remains usable when storage is disabled. */
}

const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );
const icon = (name, className = "") => {
  const paths = {
    arrow: '<path d="M4 12h16M13 5l7 7-7 7"/>',
    diagonal: '<path d="M6 18 18 6M6 6h12v12"/>',
    down: '<path d="M12 4v16M5 13l7 7 7-7"/>',
    heart:
      '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    people:
      '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 4a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-4-5.7"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    book: '<path d="M12 5v16M12 5C8 2 3 3 2 4v16c3-2 7-2 10 1 3-3 7-3 10-1V4c-3-2-7-2-10 1Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3M4.2 4.2l2.1 2.1m11.4 11.4 2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  };
  return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.arrow}</svg>`;
};
const href = (recipe, variant) =>
  `#/recipes/${encodeURIComponent(recipe.slug)}${variant ? `?v=${encodeURIComponent(variant)}` : ""}`;
const image = (path, alt, attrs = "") =>
  `<img src="./${escape(path)}" alt="${escape(alt)}" ${attrs}>`;

function header(detail = false) {
  return `<header class="site-header ${detail ? "site-header--detail" : ""}">
    <a class="brand" href="#/recipes" aria-label="La cucina — на главную"><span class="brand-script" lang="it">La cucina</span><span class="brand-sub">КНИГА РЕЦЕПТОВ</span></a>
    <nav class="desktop-nav" aria-label="Основная навигация">
      <a href="#toc" data-scroll="toc" data-category="all">Коллекция рецептов</a>
      <a href="#philosophy" data-scroll="philosophy">Немного Италии</a>
    </nav>
    <div class="nav-actions"><button class="nav-saved" data-scroll="toc" data-category="favorites" aria-label="Избранные рецепты">${icon("heart")}<span class="saved-count">${favorites.size || ""}</span></button>
    <a class="nav-cta" href="#toc" data-scroll="toc" data-category="all">К рецептам ${icon("diagonal")}</a></div>
  </header>`;
}

function footer() {
  return `<footer class="site-footer"><div><a class="footer-brand" href="#/recipes" lang="it">La cucina</a><p>Личная книга. Большая любовь к еде.</p></div>
    <p class="footer-note"><span lang="it">Dalla cucina, con amore.</span><br>Из кухни, с любовью.</p>
    <a class="back-top" href="#top" data-top>Наверх ${icon("arrow")}</a></footer>`;
}

function renderHome() {
  document.body.classList.remove("detail-page");
  document.title = "La cucina — книга рецептов";
  app.innerHTML = `${header()}<main id="main" tabindex="-1">
    <section class="hero" id="top" aria-labelledby="hero-title">
      <picture><source media="(max-width: 900px)" srcset="./assets/como-dinner-mobile.jpg">${image("assets/como-dinner.jpg", "Мужчина и женщина за ужином с пастой и пиццей на террасе виллы у озера Комо", 'class="hero-photo" fetchpriority="high" width="1672" height="941"')}</picture>
      <div class="hero-shade"></div>
      <div class="hero-content"><p class="eyebrow hero-eyebrow">МАЛЕНЬКИЕ РАДОСТИ. БОЛЬШАЯ ЛЮБОВЬ К ЖИЗНИ.</p>
        <h1 id="hero-title" class="hero-title" lang="it">La dolce vita</h1>
        <p class="hero-subtitle">Готовить с любовью.<br>Жить со вкусом.</p>
        <p class="hero-description">Любимые рецепты, простые ингредиенты<br class="desktop-break"> и немного Италии в каждом дне.</p>
        <a class="button button--cream" href="#toc" data-scroll="toc" data-category="all">Открыть книгу рецептов ${icon("arrow")}</a>
      </div>
      <div class="hero-bottom"><a class="scroll-cue" href="#toc" data-scroll="toc">${icon("down")}<span>Листайте. Вдохновляйтесь. Готовьте.</span></a>
        <p class="location"><span class="location-dot"></span> LAGO DI COMO, ITALIA <span>45°59′ N · 9°15′ E</span></p></div>
      <div class="hero-edition"><span>LA NOSTRA</span><span class="edition-script" lang="it">bella vita</span><span>ЛИЧНАЯ КОЛЛЕКЦИЯ</span></div>
    </section>
    <div class="ritual-strip"><span>Простые ингредиенты</span><span aria-hidden="true">✳</span><span>Еда в удовольствие</span><span aria-hidden="true">✳</span><span lang="it">Fatto con amore</span><span aria-hidden="true">✳</span><span>Время для себя</span></div>
    <section class="collection section-wrap" id="toc" aria-labelledby="collection-title">
      <div class="collection-heading reveal"><div><p class="eyebrow">COLLEZIONE DI RICETTE · ЛИЧНАЯ КОЛЛЕКЦИЯ</p><h2 id="collection-title">У хорошего дня<br>есть свой рецепт.</h2></div>
        <div class="collection-aside"><span class="script" lang="it">Buon appetito!</span><p>Для неспешных завтраков,<br>уютных ужинов и всего между ними.</p></div></div>
      <div class="catalog-tools"><div class="category-list" role="group" aria-label="Категории рецептов">${categories.map((c) => `<button class="category ${category === c.id ? "is-active" : ""}" data-filter="${c.id}" aria-pressed="${category === c.id}">${c.id === "favorites" ? icon("heart") : ""}${c.label}</button>`).join("")}</div>
        <div class="search-field">${icon("search")}<input type="search" id="recipe-search" value="${escape(search)}" placeholder="Рецепт или ингредиент" aria-label="Найти рецепт или ингредиент" autocomplete="off"><button type="button" data-clear-search aria-label="Очистить поиск" ${search ? "" : "hidden"}>${icon("close")}</button></div></div>
      <div class="results-line"><p id="results-count" role="status" aria-live="polite"></p><span>ВЫБЕРИТЕ ТО, ЧТО ПО ДУШЕ</span></div>
      <div id="recipe-grid" class="recipe-grid"></div>
    </section>
    <section class="philosophy" id="philosophy" aria-labelledby="philosophy-title"><div class="philosophy-image">${image("assets/como-dinner.jpg", "Солнечный ужин на террасе над озером Комо", 'loading="lazy" width="1672" height="941"')}<span class="photo-caption">UN GIORNO, A COMO.</span></div>
      <div class="philosophy-copy reveal"><p class="eyebrow">LA FILOSOFIA · МАЛЕНЬКАЯ ФИЛОСОФИЯ</p>${icon("sun", "philosophy-sun")}<h2 id="philosophy-title">Италия начинается<br>с настроения.</h2><p>Сесть за стол без спешки. Выбрать то, что любишь. Приготовить что-то простое и разделить этот момент с близким человеком.</p><p>Эта книга — о любимой еде и заботе о себе. А Италия — о мечте, к которой можно становиться ближе каждый день.</p><span class="script" lang="it">La vita è bella.</span></div>
    </section>
  </main>${footer()}`;
  updateGrid();
  reveal();
  updateHeader();
}

function favoriteButton(recipe, extraClass = "") {
  const selected = favorites.has(recipe.slug);
  return `<button class="favorite ${selected ? "is-saved" : ""} ${extraClass}" data-favorite="${recipe.slug}" aria-label="${selected ? "Убрать из избранного" : "Добавить в избранное"}: ${escape(recipe.title)}" aria-pressed="${selected}">${icon("heart")}</button>`;
}

function card(recipe, index) {
  const variant = recipe.variants[0];
  return `<article class="recipe-card reveal" style="--delay:${(index % 3) * 65}ms">
    <div class="card-media"><a href="${href(recipe)}" tabindex="-1" aria-hidden="true">${image(coverPhoto(recipe, variant, photos), recipe.title, `loading="lazy" width="600" height="750" style="object-position:${escape(variant.focus || "center")}"`)}</a>
      <span class="card-number">${String(recipes.indexOf(recipe) + 1).padStart(2, "0")}</span>${favoriteButton(recipe)}</div>
    <div class="card-content"><p class="card-category">${escape(recipe.category)}</p><h3><a href="${href(recipe)}">${escape(recipe.title)}</a></h3><p class="card-tagline">${escape(recipe.tagline)}</p>
      <div class="card-bottom"><span>${icon("clock")}${escape(variant.time)}</span><a class="card-arrow" href="${href(recipe)}" aria-label="Открыть рецепт: ${escape(recipe.title)}">${icon("diagonal")}</a></div>
    </div></article>`;
}

function updateGrid() {
  const grid = document.querySelector("#recipe-grid");
  if (!grid) return;
  const filtered = filterRecipes(recipes, category, search, favorites);
  document.querySelector("#results-count").textContent = recipeCount(
    filtered.length,
  );
  grid.innerHTML = filtered.length
    ? filtered.map(card).join("")
    : `<div class="empty-state">${icon(category === "favorites" ? "heart" : "search")}<h3>${category === "favorites" && !search ? "Здесь будут ваши любимые рецепты" : "Пока ничего не нашлось"}</h3><p>${category === "favorites" && !search ? "Нажмите на сердечко у блюда, чтобы сохранить его в свою коллекцию." : "Попробуйте другой ингредиент или откройте всю коллекцию."}</p><button class="button" data-reset>Все рецепты ${icon("arrow")}</button></div>`;
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === category);
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.filter === category),
    );
  });
  document.querySelector("[data-clear-search]").hidden = !search;
  reveal();
}

function renderRecipe(recipe, variantId) {
  const variant =
    recipe.variants.find((v) => v.id === variantId) || recipe.variants[0];
  const next = recipes[(recipes.indexOf(recipe) + 1) % recipes.length];
  const nutrition = variant.nutrition;
  const checkKey = `${recipe.slug}/${variant.id}`;
  const checked = ingredientChecks.get(checkKey) || new Set();
  document.body.classList.add("detail-page");
  document.title = `${recipe.title} — La cucina`;
  app.innerHTML = `${header(true)}<main id="main" tabindex="-1">
    <div class="breadcrumbs section-wrap"><a href="#/recipes">Книга рецептов</a><span>/</span><span>${escape(recipe.category)}</span></div>
    <section class="recipe-hero section-wrap"><div class="recipe-cover">${image(coverPhoto(recipe, variant, photos), recipe.title, `fetchpriority="high" width="800" height="900" style="object-position:${escape(variant.focus || "center")}"`)}<span class="cover-caption" lang="it">Cucinare con amore</span></div>
      <div class="recipe-heading"><p class="eyebrow">RICETTA ${String(recipes.indexOf(recipe) + 1).padStart(2, "0")} · ${escape(recipe.category)}</p><h1>${escape(recipe.title)}</h1><p class="recipe-tagline">${escape(recipe.tagline)}</p><div class="recipe-facts"><span>${icon("clock")}${escape(variant.time)}</span><span>${icon("people")}${escape(variant.servings)}</span></div>
      ${recipe.variants.length > 1 ? `<div class="variant-tabs" role="group" aria-label="Вариант рецепта">${recipe.variants.map((v) => `<a href="${href(recipe, v.id)}" class="${variant.id === v.id ? "is-active" : ""}" ${variant.id === v.id ? 'aria-current="true"' : ""}>${escape(v.label)}<small>${escape(v.hint)}</small></a>`).join("")}</div>` : ""}
      <p class="recipe-intro">${escape(variant.intro)}</p><div class="recipe-save">${favoriteButton(recipe, "favorite--inline")}<span>${favorites.has(recipe.slug) ? "В вашей коллекции" : "Сохранить на потом"}</span></div>
      ${nutrition ? `<div class="nutrition"><p>НА ${escape(nutrition.per || "порцию")}</p><div><span><b>${escape(nutrition.kcal)}</b>ккал</span><span><b>${escape(nutrition.protein)} г</b>белки</span><span><b>${escape(nutrition.fat)} г</b>жиры</span><span><b>${escape(nutrition.carbs)} г</b>углеводы</span></div></div>` : ""}</div>
    </section>
    <section class="recipe-body section-wrap"><aside class="ingredients"><div class="ingredients-sticky"><p class="eyebrow">01 · INGREDIENTI</p><h2>Что понадобится</h2><p class="ingredients-hint">Отмечайте то, что уже приготовили</p><ul>${variant.ingredients.map((item, i) => `<li><label class="ingredient ${checked.has(i) ? "is-checked" : ""}"><input type="checkbox" data-ingredient="${i}" data-check-key="${checkKey}" ${checked.has(i) ? "checked" : ""}><span class="ingredient-name">${escape(item.name)}</span><span class="ingredient-amount">${escape(item.amount)}</span></label></li>`).join("")}</ul>
    ${variant.source?.url ? `<a class="source-link" href="${escape(variant.source.url)}" target="_blank" rel="noopener noreferrer">Источник: ${escape(variant.source.site)} ${icon("diagonal")}</a>` : variant.source ? `<p class="source-link">Источник: ${escape(variant.source.site)}</p>` : ""}</div></aside>
    <div class="method"><p class="eyebrow">02 · PREPARAZIONE</p><h2>Готовим с удовольствием</h2><ol class="steps">${variant.steps.map((step, i) => `<li class="step reveal"><span class="step-number">${String(i + 1).padStart(2, "0")}</span><div>${step.title ? `<h3>${escape(step.title)}</h3>` : ""}<p>${escape(step.text)}</p>${photos[recipe.slug]?.[variant.id]?.[i + 1] ? `<figure>${image(photos[recipe.slug][variant.id][i + 1], `${recipe.title}, шаг ${i + 1}`, 'loading="lazy" width="800" height="600"')}<figcaption>ШАГ ${String(i + 1).padStart(2, "0")}</figcaption></figure>` : ""}</div></li>`).join("")}</ol>
    ${variant.tips.length ? `<div class="recipe-tips reveal"><p class="eyebrow">PICCOLI SEGRETI · НА ЗАМЕТКУ</p>${variant.tips.map((tip) => `<h3>${escape(tip.title)}</h3><p>${escape(tip.text)}</p>`).join("")}</div>` : ""}
    ${recipe.cutting.length ? `<details class="cutting-notes"><summary>Заметки для сушки <span>+</span></summary><ul>${recipe.cutting.map((note) => `<li>${escape(note)}</li>`).join("")}</ul><p>Личные заметки; в оригинальных рецептах их нет.</p></details>` : ""}
    ${
      variant.photos.length > 1
        ? `<div class="extra-photos">${variant.photos
            .slice(1)
            .map((path) =>
              image(
                path,
                `${recipe.title}, дополнительное фото`,
                'loading="lazy" width="800" height="900"',
              ),
            )
            .join("")}</div>`
        : ""
    }
    <p class="method-signoff script" lang="it">Buon appetito!</p></div></section>
    <a class="next-recipe" href="${href(next)}"><div><p class="eyebrow">СЛЕДУЮЩАЯ СТРАНИЦА КНИГИ</p><h2>${escape(next.title)}</h2><span>Открыть рецепт ${icon("arrow")}</span></div>${image(coverPhoto(next, next.variants[0], photos), "", 'loading="lazy" width="600" height="500"')}</a>
  </main>${footer()}`;
  reveal();
  updateHeader();
}

function reveal() {
  observer?.disconnect();
  const items = document.querySelectorAll(".reveal:not(.is-visible)");
  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.06, rootMargin: "0px 0px -18px 0px" },
  );
  items.forEach((item) => observer.observe(item));
}

function route({ scroll = true } = {}) {
  const { slug, variantId } = parseRoute(location.hash);
  if (!slug) renderHome();
  else {
    const recipe = recipes.find((r) => r.slug === slug);
    if (recipe) renderRecipe(recipe, variantId);
    else {
      document.body.classList.add("detail-page");
      document.title = "Рецепт не найден — La cucina";
      app.innerHTML = `${header(true)}<main id="main" class="not-found" tabindex="-1"><span class="script" lang="it">Mamma mia!</span><h1>Такой страницы пока нет в книге</h1><a class="button" href="#/recipes">Вернуться к рецептам ${icon("arrow")}</a></main>${footer()}`;
    }
  }
  if (scroll) {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.querySelector("#main")?.focus({ preventScroll: true });
  }
}

function updateHeader() {
  document
    .querySelector(".site-header")
    ?.classList.toggle("is-scrolled", scrollY > 50);
}

function showToast(message) {
  clearTimeout(toastTimeout);
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimeout = setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

function toggleFavorite(slug) {
  const selected = !favorites.has(slug);
  if (selected) favorites.add(slug);
  else favorites.delete(slug);
  let persisted = true;
  try {
    localStorage.setItem(favoriteKey, JSON.stringify([...favorites]));
  } catch {
    persisted = false;
  }
  document.querySelectorAll(`[data-favorite="${slug}"]`).forEach((button) => {
    button.classList.toggle("is-saved", selected);
    button.setAttribute("aria-pressed", String(selected));
    button.setAttribute(
      "aria-label",
      `${selected ? "Убрать из избранного" : "Добавить в избранное"}: ${recipes.find((r) => r.slug === slug).title}`,
    );
  });
  document.querySelector(".saved-count").textContent = favorites.size || "";
  const label = document.querySelector(".recipe-save > span");
  if (label)
    label.textContent = selected ? "В вашей коллекции" : "Сохранить на потом";
  if (category === "favorites") updateGrid();
  showToast(
    selected
      ? `Рецепт ${persisted ? "сохранён в избранном" : "сохранён на время просмотра"}`
      : "Рецепт убран из избранного",
  );
}

function scrollToSection(id) {
  document.querySelector(`#${id}`)?.scrollIntoView({
    behavior: reducedMotion.matches ? "instant" : "smooth",
    block: "start",
  });
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button, a");
  if (!button) return;
  if (button.classList.contains("skip-link")) {
    event.preventDefault();
    document.querySelector("#main").focus();
    return;
  }
  if (
    button.getAttribute("href") === "#/recipes" &&
    !parseRoute(location.hash).slug
  ) {
    event.preventDefault();
    category = "all";
    search = "";
    renderHome();
    window.scrollTo({ top: 0, behavior: "instant" });
    return;
  }
  if (button.dataset.favorite) return toggleFavorite(button.dataset.favorite);
  if (button.dataset.filter) {
    category = button.dataset.filter;
    updateGrid();
    return;
  }
  if (
    button.hasAttribute("data-clear-search") ||
    button.hasAttribute("data-reset")
  ) {
    search = "";
    if (button.hasAttribute("data-reset")) category = "all";
    document.querySelector("#recipe-search").value = "";
    updateGrid();
    document.querySelector("#recipe-search").focus({ preventScroll: true });
    return;
  }
  if (button.hasAttribute("data-top")) {
    event.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: reducedMotion.matches ? "instant" : "smooth",
    });
    return;
  }
  if (button.dataset.scroll) {
    event.preventDefault();
    if (button.dataset.category) {
      category = button.dataset.category;
      search = "";
    }
    if (parseRoute(location.hash).slug) {
      history.pushState(null, "", "#/recipes");
      renderHome();
    } else if (button.dataset.category) {
      document.querySelector("#recipe-search").value = "";
      updateGrid();
    }
    scrollToSection(button.dataset.scroll);
  }
});
document.addEventListener("input", (event) => {
  if (event.target.id === "recipe-search") {
    search = event.target.value;
    updateGrid();
  }
});
document.addEventListener("change", (event) => {
  if (!event.target.matches("[data-ingredient]")) return;
  const input = event.target;
  const checks = ingredientChecks.get(input.dataset.checkKey) || new Set();
  const index = Number(input.dataset.ingredient);
  if (input.checked) checks.add(index);
  else checks.delete(index);
  ingredientChecks.set(input.dataset.checkKey, checks);
  input.closest(".ingredient").classList.toggle("is-checked", input.checked);
});
window.addEventListener("scroll", updateHeader, { passive: true });
window.addEventListener("hashchange", () => route());
reducedMotion.addEventListener("change", reveal);

async function loadBook() {
  try {
    const responses = await Promise.all(
      ["recipes", "step-photos"].map((name) =>
        fetch(new URL(`../data/${name}.json`, import.meta.url)),
      ),
    );
    if (responses.some((response) => !response.ok))
      throw new Error("Book data could not be loaded");
    [recipes, photos] = await Promise.all(
      responses.map((response) => response.json()),
    );
    // Ignore stale favorite IDs from an earlier edition of the collection.
    favorites = new Set(
      [...favorites].filter((slug) =>
        recipes.some((recipe) => recipe.slug === slug),
      ),
    );
    route({ scroll: false });
  } catch (error) {
    console.error("La cucina:", error);
    app.innerHTML =
      '<main class="not-found"><h1>Не удалось открыть книгу</h1><p>Проверьте подключение и попробуйте ещё раз.</p><button class="button" id="retry-load">Попробовать снова</button></main>';
    document.querySelector("#retry-load").addEventListener("click", loadBook);
  }
}
loadBook();
