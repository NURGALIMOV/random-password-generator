import en from "./locales/en.js";

const locales = { en };
let currentLang = 'en';

export function setLang(lang) {
  currentLang = 'en';
}

export function getCurrentLang() {
  return 'en';
}

export function t(key) {
  return locales['en'][key] || key;
} 