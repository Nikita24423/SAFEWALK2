export const THEME_STORAGE_KEY = "safewalk_theme";

/** Индекс картинки на странице /map (0…n-1). */
export const MAP_IMAGE_INDEX_KEY = "safewalk_map_image_index";

/** @type {readonly ["green", "ocean", "violet", "amber"]} */
export const THEMES = ["green", "ocean", "violet", "amber"];

/** @param {string} theme */
export function applyThemeToDocument(theme) {
  if (typeof document === "undefined") return;
  if (theme === "green" || !THEMES.includes(theme)) {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}
