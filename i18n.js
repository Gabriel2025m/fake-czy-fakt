"use strict";

// ═════════════ Języki: polski, angielski, niemiecki ═════════════
// Teksty w kodzie są po polsku i przechodzą przez t("…"): polski tekst jest kluczem,
// a słowniki niżej (i18n-en.js, i18n-de.js) podają jego tłumaczenie. {0}, {1}… to wstawiane wartości.
// Pytania tłumaczy się po numerze (nr) w PYTANIA_TLUM[jezyk], power-upy po kluczu w POWERUPY_TLUM[jezyk].
// Brak tłumaczenia = zostaje tekst polski. Ten plik ładuje się przed słownikami, a one dopisują się do obiektów niżej.
const JEZYKI = {
  pl: { nazwa: "Polski",  skrot: "PL" },
  en: { nazwa: "English", skrot: "EN" },
  de: { nazwa: "Deutsch", skrot: "DE" },
};
const SLOWNIK = {};        // jezyk -> { "polski tekst": "tłumaczenie" }
const PYTANIA_TLUM = {};   // jezyk -> { nr: { tekst, zrodlo, wyjasnienie } }
const POWERUPY_TLUM = {};  // jezyk -> { klucz: { nazwa, opis, opisKarty } }

let LANG = (() => {
  const z = new URLSearchParams(location.search).get("lang");
  if (z && JEZYKI[z]) return z;
  try { const s = localStorage.getItem("fcf-lang"); if (s && JEZYKI[s]) return s; } catch {}
  const nav = (navigator.language || "pl").slice(0, 2).toLowerCase();
  return JEZYKI[nav] ? nav : "pl";
})();
document.documentElement.lang = LANG;

function t(pl, ...args) {
  const s = (LANG !== "pl" && SLOWNIK[LANG]?.[pl]) || pl;
  return args.length ? s.replace(/\{(\d+)\}/g, (m, i) => args[i] ?? m) : s;
}

// Komunikat jako tablica [szablon, ...wartości] – tak host wysyła go graczom, a każdy tłumaczy u siebie.
// Wartość "pu:klucz" zamienia się na ikonę i nazwę power-upu.
function tm(m) {
  if (!Array.isArray(m)) return t(String(m ?? ""));
  return t(m[0], ...m.slice(1).map(a => typeof a === "string" && a.startsWith("pu:") ? puLabel(a.slice(3)) : a));
}

function tq(q) {
  if (!q || LANG === "pl") return q;
  const tr = PYTANIA_TLUM[LANG]?.[q.nr];
  return tr ? { ...q, ...tr } : q;
}

function tpu(k) {
  const d = POWERUPY[k];
  const tr = LANG !== "pl" && POWERUPY_TLUM[LANG]?.[k];
  return tr ? { ...d, ...tr } : d;
}

function puLabel(k) {
  const d = tpu(k);
  return `${d.ikona} ${d.nazwa}`;
}

function setLang(l) {
  if (!JEZYKI[l] || l === LANG) return;
  LANG = l;
  document.documentElement.lang = l;
  try { localStorage.setItem("fcf-lang", l); } catch {}
  const u = new URL(location.href);
  if (u.searchParams.has("lang")) { u.searchParams.set("lang", l); history.replaceState(null, "", u); }
  document.dispatchEvent(new CustomEvent("jezyk", { detail: l }));
}

// Przełącznik w prawym górnym rogu.
function przelacznikJezyka(el) {
  const draw = () => {
    el.innerHTML = Object.entries(JEZYKI).map(([k, j]) =>
      `<button type="button" class="lang-btn ${k === LANG ? "on" : ""}" data-lang="${k}" title="${j.nazwa}" aria-pressed="${k === LANG}">${j.skrot}</button>`).join("");
  };
  el.classList.add("lang-switch");
  el.setAttribute("role", "group");
  el.setAttribute("aria-label", "Język / Language / Sprache");
  // Na wąskim ekranie widać tylko bieżący język; kliknięcie go rozwija listę.
  el.addEventListener("click", e => {
    const b = e.target.closest("[data-lang]");
    if (!b) return;
    if (b.dataset.lang === LANG) { el.classList.toggle("open"); return; }
    el.classList.remove("open");
    setLang(b.dataset.lang);
  });
  document.addEventListener("click", e => { if (!el.contains(e.target)) el.classList.remove("open"); });
  document.addEventListener("jezyk", draw);
  draw();
}
