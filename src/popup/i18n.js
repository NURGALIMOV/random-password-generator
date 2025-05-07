import en from "./locales/en.js";
import ru from "./locales/ru.js";

const locales = { en, ru };
let currentLang = localStorage.getItem("lang");
if (!currentLang) {
  currentLang = navigator.language.startsWith("ru") ? "ru" : "en";
  localStorage.setItem("lang", currentLang);
}

export function setLang(lang) {
  if (locales[lang]) {
    currentLang = lang;
    localStorage.setItem("lang", lang);
  }
}

export function getCurrentLang() {
  return currentLang;
}

export function t(key) {
  return locales[currentLang][key] || key;
} 