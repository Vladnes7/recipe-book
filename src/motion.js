/** Keep the full title accessible while its visual ink appears letter by letter. */
export function prepareRecipeTitle(heading, reducedMotion) {
  if (!heading || reducedMotion.matches) return;
  const text = heading.textContent;
  heading.setAttribute("aria-label", text);
  const visual = document.createElement("span");
  visual.className = "typed-title";
  visual.setAttribute("aria-hidden", "true");
  visual.style.setProperty(
    "--typing-step",
    `${Math.min(24, 820 / Math.max(text.length, 1))}ms`,
  );
  let index = 0;
  for (const word of text.split(/(\s+)/u)) {
    if (/^\s+$/u.test(word)) {
      visual.append(document.createTextNode(word));
      continue;
    }
    const group = document.createElement("span");
    group.className = "type-word";
    for (const letter of Array.from(word)) {
      const character = document.createElement("span");
      character.className = "type-char";
      character.textContent = letter;
      character.style.setProperty("--char-index", index++);
      group.append(character);
    }
    visual.append(group);
  }
  heading.replaceChildren(visual);
}

export function updateReadingProgress() {
  const progress = document.querySelector(".reading-progress > span");
  if (!progress) return;
  const distance = document.documentElement.scrollHeight - innerHeight;
  const fraction =
    distance > 0 ? Math.max(0, Math.min(1, scrollY / distance)) : 0;
  progress.style.transform = `scaleX(${fraction})`;
}
