"use strict";

// ═════════════ Karty do druku (strona admina) ═════════════
// Dane kart: pytania z questions.js + poprawki zapisane w tej przeglądarce (localStorage).
// Wydruk: strony na przemian PRZÓD / TYŁ. Tył jest ułożony lustrzanie, żeby po druku
// dwustronnym każdy tył wypadł dokładnie za swoim przodem.

const KLUCZ_POPRAWEK = "fcf-karty-poprawki";
const KLUCZ_USTAWIEN = "fcf-karty-ustawienia";
const PAPIER = { w: 210, h: 297 };           // A4, mm
const MIN_MARGINES = 8;                       // mm – drukarki zwykle nie drukują przy samej krawędzi
const ROZMIARY = {
  poker:  { label: "Pokerowe 63 × 88 mm", w: 63, h: 88 },
  bridge: { label: "Brydżowe 57 × 89 mm", w: 57, h: 89 },
  duze:   { label: "Duże 70 × 120 mm",     w: 70, h: 120 },
};
const POZIOMY = { latwy: "Łatwy", normalny: "Normalny", trudny: "Trudny" };
const POLA = ["poziom", "prawda", "autor", "handle", "tekst", "obrazek", "zrodlo", "wyjasnienie", "link"];

const DOMYSLNE = {
  styl: "gra", rozmiar: "poker", odwracanie: "dluga", przesX: 0, przesY: 0, odstep: 0,
  znaczniki: true, ramka: true, zdjecia: true, tyly: true,
  powerupy: true, kopiePU: 2,
};

const A = {
  tab: "cards",
  poprawki: wczytaj(KLUCZ_POPRAWEK, {}),     // nr -> {pola} albo {usunieta:true}; własne karty mają nr "W…"
  ust: { ...DOMYSLNE, ...wczytaj(KLUCZ_USTAWIEN, {}) },
  wybrane: null,                             // Set nr; null = wszystkie
  filtr: { poziom: "all", typ: "all", szukaj: "" },
  edytowana: null,                           // kopia edytowanej karty
  test: false,                               // strona testowa do kalibracji
};

// ═════════════ Pomocnicze ═════════════
function wczytaj(k, def) { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } }
function zapisz(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const WERSJA_ZDJEC = 3;
function imgSrc(name) {
  if (!name) return "";
  // ?v=… – po podmianie zdjęć (te same nazwy plików) przeglądarka pobierze nowe zamiast starych z pamięci
  return /^(https?:)?\/\//.test(name) || name.includes("/") ? name : "img/" + name + "?v=" + WERSJA_ZDJEC;
}
function domena(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}
let toastTimer;
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}
function pobierzPlik(nazwa, tresc, typ) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([tresc], { type: typ }));
  a.download = nazwa;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// Wszystkie karty z poprawkami (bez usuniętych).
function karty() {
  const baza = PYTANIA.map(q => ({ ...q, ...(A.poprawki[q.nr] || {}) }));
  const wlasne = Object.entries(A.poprawki).filter(([nr, p]) => p.wlasna).map(([nr, p]) => ({ nr, ...p }));
  return [...baza, ...wlasne].filter(k => !k.usunieta);
}
function czyZmieniona(k) {
  const p = A.poprawki[k.nr];
  return !!p && !p.wlasna && Object.keys(p).length > 0;
}
function widoczne() {
  const f = A.filtr, s = f.szukaj.trim().toLowerCase();
  return karty().filter(k =>
    (f.poziom === "all" || k.poziom === f.poziom) &&
    (f.typ === "all" || (f.typ === "prawda") === !!k.prawda) &&
    (!s || `${k.nr} ${k.tekst} ${k.wyjasnienie}`.toLowerCase().includes(s)));
}
function czyWybrana(nr) { return A.wybrane === null || A.wybrane.has(nr); }
function wybraneKarty() { return karty().filter(k => czyWybrana(k.nr)); }

// ═════════════ Projekty kart ═════════════
// Na przodzie kart pełny napis zamiast logo (logo zostaje na tyłach).
function tytulKarty() {
  return `<span class="c-title"><span class="f">FAKE</span> <span class="czy">czy</span> <span class="t">FAKT?</span></span>`;
}
function logoMini() {
  return `<span class="c-logo">FAK<span class="c-frac"><i class="e">E</i><b></b><i class="t">T</i></span></span>`;
}
function kropki(poziom) {
  const n = { latwy: 1, normalny: 2, trudny: 3 }[poziom] || 1;
  return `<span class="c-lvl" title="${POZIOMY[poziom] || ""}">${[1, 2, 3].map(i => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}</span>`;
}

const PODPIS = `by <b>UNSEEN</b> · ZSTiO Jarosław`;
function styl() { return A.ust.styl === "jasny" ? "light" : "dark"; }

function przodPytania(k) {
  const img = A.ust.zdjecia && k.obrazek;
  const autor = k.autor
    ? `<div class="c-author"><span class="c-av" style="background:${kolor(k.autor)}">${esc(k.autor.trim()[0])}</span><span class="c-who"><b>${esc(k.autor)}</b>${k.handle ? `<small>${esc(k.handle)}</small>` : ""}</span></div>`
    : "";
  return `<div class="card q-front ${styl()} ${img ? "" : "no-img"}">
    <div class="c-top">${tytulKarty()}</div>
    <div class="c-post">
      ${autor}
      <div class="c-text fit" data-max="12.5" data-min="7">${esc(k.tekst)}</div>
      ${img ? `<div class="c-img"><img src="${esc(imgSrc(k.obrazek))}" alt=""></div>` : ""}
    </div>
    <div class="c-ask"><span class="f">FAKE</span><span class="czy">czy</span><span class="r">PRAWDA</span></div>
    <div class="c-foot">${kropki(k.poziom)}<span>${POZIOMY[k.poziom] || ""}</span><span class="c-credit">${PODPIS}</span></div>
  </div>`;
}

function tylPytania(k) {
  const zrodlo = domena(k.link) || (k.zrodlo || "").replace(/^Zweryfikuj:\s*/, "");
  return `<div class="card q-back ${styl()} ${k.prawda ? "real" : "fake"}">
    <div class="c-top">${logoMini()}</div>
    <div class="b-stamp">${k.prawda ? "PRAWDA" : "FAKE"}</div>
    <div class="b-panel">
      <div class="b-text fit" data-max="9.5" data-min="5.5"><b>Dlaczego?</b> ${esc(k.wyjasnienie)}</div>
      ${zrodlo ? `<div class="b-src">Źródło: ${esc(zrodlo)}</div>` : ""}
    </div>
    <div class="c-foot"><span class="c-credit">${PODPIS}</span></div>
  </div>`;
}

function przodPU(key) {
  const d = POWERUPY[key];
  return `<div class="card pu-front ${styl()} ${d.typ}">
    <div class="c-top">${tytulKarty()}<span class="c-nr">POWER-UP</span></div>
    <div class="pu-panel">
      <div class="pu-ico">${d.ikona}</div>
      <div class="pu-nm">${esc(d.nazwa)}</div>
      <div class="pu-ds fit" data-max="10" data-min="6.5">${esc(d.opis)}</div>
      <div class="pu-tp">${d.typ === "atak" ? "Atak na innego gracza" : "Pomoc dla Ciebie"}</div>
    </div>
    <div class="c-foot"><span class="c-credit">${PODPIS}</span></div>
  </div>`;
}

function tylPU() {
  return `<div class="card pu-back ${styl()}"><div class="pb-in"><span>⚡</span><b>POWER-UP</b>${logoMini()}<i class="c-credit">${PODPIS}</i></div></div>`;
}

function kartaTestowa(i, tyl) {
  return `<div class="card test ${tyl ? "back" : ""}"><span class="cross"></span><b>${tyl ? "TYŁ" : "PRZÓD"} ${i + 1}</b></div>`;
}

function kolor(s) {
  let h = 0;
  for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h} 55% 45%)`;
}

// ═════════════ Układ arkuszy ═════════════
function siatka() {
  const r = ROZMIARY[A.ust.rozmiar], g = Math.max(0, +A.ust.odstep || 0);
  const cols = Math.max(1, Math.floor((PAPIER.w - 2 * MIN_MARGINES + g) / (r.w + g)));
  const rows = Math.max(1, Math.floor((PAPIER.h - 2 * MIN_MARGINES + g) / (r.h + g)));
  const gridW = cols * r.w + (cols - 1) * g, gridH = rows * r.h + (rows - 1) * g;
  return { ...r, g, cols, rows, per: cols * rows, x0: (PAPIER.w - gridW) / 2, y0: (PAPIER.h - gridH) / 2, gridW, gridH };
}

// Lista par [przód, tył] do wydruku.
function talia() {
  if (A.test) {
    const s = siatka();
    return Array.from({ length: s.per }, (_, i) => [kartaTestowa(i, false), kartaTestowa(i, true)]);
  }
  const out = wybraneKarty().map(k => [przodPytania(k), tylPytania(k)]);
  if (A.ust.powerupy) {
    const n = Math.max(0, Math.min(10, +A.ust.kopiePU || 0));
    for (const key of Object.keys(POWERUPY)) for (let i = 0; i < n; i++) out.push([przodPU(key), tylPU()]);
  }
  return out;
}

function arkusz(komorki, s, tyl, nrStrony, wszystkie) {
  const off = tyl ? `transform: translate(${+A.ust.przesX || 0}mm, ${+A.ust.przesY || 0}mm);` : "";
  const cells = komorki.map(({ html, r, c }) =>
    `<div class="cell" style="left:${s.x0 + c * (s.w + s.g)}mm; top:${s.y0 + r * (s.h + s.g)}mm; width:${s.w}mm; height:${s.h}mm">${html}</div>`).join("");
  return `<div class="sheet ${A.ust.ramka ? "outline" : ""}" data-label="Strona ${nrStrony} · ${tyl ? "TYŁ" : "PRZÓD"}">
    <div class="sheet-in" style="${off}">${cells}${A.ust.znaczniki ? znaczniki(s) : ""}</div>
    <div class="sheet-foot" style="left:${s.x0 + 3}mm">Strona ${nrStrony} / ${wszystkie} · ${tyl ? "TYŁ" : "PRZÓD"}</div>
  </div>`;
  // Stopka stoi pod pierwszą kolumną kart, między znacznikami cięcia, więc nigdy na nie nie wchodzi.
}

// Znaczniki cięcia na marginesach, w miejscach linii cięcia.
function znaczniki(s) {
  const xs = new Set(), ys = new Set();
  for (let c = 0; c < s.cols; c++) { xs.add(s.x0 + c * (s.w + s.g)); xs.add(s.x0 + c * (s.w + s.g) + s.w); }
  for (let r = 0; r < s.rows; r++) { ys.add(s.y0 + r * (s.h + s.g)); ys.add(s.y0 + r * (s.h + s.g) + s.h); }
  const len = 5, out = [];
  for (const x of xs) {
    out.push(`<i class="mark v" style="left:${x}mm; top:${s.y0 - len - 1}mm; height:${len}mm"></i>`);
    out.push(`<i class="mark v" style="left:${x}mm; top:${s.y0 + s.gridH + 1}mm; height:${len}mm"></i>`);
  }
  for (const y of ys) {
    out.push(`<i class="mark h" style="top:${y}mm; left:${s.x0 - len - 1}mm; width:${len}mm"></i>`);
    out.push(`<i class="mark h" style="top:${y}mm; left:${s.x0 + s.gridW + 1}mm; width:${len}mm"></i>`);
  }
  return out.join("");
}

function arkusze() {
  const s = siatka(), lista = talia(), html = [];
  const naArkusz = (A.ust.tyly || A.test) ? 2 : 1;
  const wszystkie = Math.ceil(lista.length / s.per) * naArkusz;
  let strona = 1;
  for (let i = 0; i < lista.length; i += s.per) {
    const czesc = lista.slice(i, i + s.per);
    const przody = czesc.map(([f], j) => ({ html: f, r: Math.floor(j / s.cols), c: j % s.cols }));
    html.push(arkusz(przody, s, false, strona++, wszystkie));
    if (A.ust.tyly || A.test) {
      // Lustro: przy obracaniu przez długą krawędź zamieniają się kolumny, przez krótką – wiersze.
      const tyly = czesc.map(([, b], j) => {
        const r = Math.floor(j / s.cols), c = j % s.cols;
        return A.ust.odwracanie === "dluga" ? { html: b, r, c: s.cols - 1 - c } : { html: b, r: s.rows - 1 - r, c };
      });
      html.push(arkusz(tyly, s, true, strona++, wszystkie));
    }
  }
  return { html: html.join(""), strony: html.length, karty: lista.length, s };
}

// Dopasowanie wielkości tekstu do miejsca na karcie (zmniejsza czcionkę, aż tekst się zmieści).
function dopasujTeksty(root) {
  root.querySelectorAll(".fit").forEach(el => {
    const max = +el.dataset.max || 12, min = +el.dataset.min || 6;
    let size = max;
    el.style.fontSize = size + "pt";
    while (size > min && el.scrollHeight > el.clientHeight + 1) {
      size -= 0.25;
      el.style.fontSize = size + "pt";
    }
  });
}

// ═════════════ Widoki ═════════════
function renderSide() {
  const u = A.ust;
  const opt = (obj, val) => Object.entries(obj).map(([k, o]) => `<option value="${k}" ${k === val ? "selected" : ""}>${o.label || o}</option>`).join("");
  const s = siatka();
  document.getElementById("side").innerHTML = `
    <h2>Druk</h2>
    <label class="fld">Wygląd kart
      <select data-u="styl">
        <option value="gra" ${u.styl !== "jasny" ? "selected" : ""}>Jak w grze (ciemne tło)</option>
        <option value="jasny" ${u.styl === "jasny" ? "selected" : ""}>Oszczędny (białe tło, mniej tuszu)</option>
      </select>
    </label>
    <label class="fld">Rozmiar karty<select data-u="rozmiar">${opt(ROZMIARY, u.rozmiar)}</select></label>
    <p class="hint">${s.per} kart na stronie A4 (${s.cols} × ${s.rows}).</p>
    <label class="fld">Druk dwustronny – obracanie
      <select data-u="odwracanie">
        <option value="dluga" ${u.odwracanie === "dluga" ? "selected" : ""}>Przez długą krawędź (domyślne)</option>
        <option value="krotka" ${u.odwracanie === "krotka" ? "selected" : ""}>Przez krótką krawędź</option>
      </select>
    </label>
    <div class="row2">
      <label class="fld">Przesunięcie tyłu X (mm)<input type="number" step="0.5" data-u="przesX" value="${u.przesX}"></label>
      <label class="fld">Przesunięcie tyłu Y (mm)<input type="number" step="0.5" data-u="przesY" value="${u.przesY}"></label>
    </div>
    <p class="hint">Kalibracja: wydrukuj dwustronnie „Stronę testową” i obejrzyj stronę TYŁ pod światło. Jeśli czerwony krzyżyk jest o 2 mm na prawo od czarnego, wpisz X = -2; jeśli 1 mm niżej, wpisz Y = -1.</p>
    <label class="fld">Odstęp między kartami (mm)<input type="number" min="0" max="10" step="1" data-u="odstep" value="${u.odstep}"></label>
    <label class="chk"><input type="checkbox" data-u="znaczniki" ${u.znaczniki ? "checked" : ""}> Znaczniki cięcia</label>
    <label class="chk"><input type="checkbox" data-u="ramka" ${u.ramka ? "checked" : ""}> Cienka ramka wokół kart</label>
    <label class="chk"><input type="checkbox" data-u="zdjecia" ${u.zdjecia ? "checked" : ""}> Zdjęcia na kartach</label>
    <label class="chk"><input type="checkbox" data-u="tyly" ${u.tyly ? "checked" : ""}> Drukuj tyły (odpowiedzi)</label>
    <label class="chk"><input type="checkbox" data-u="powerupy" ${u.powerupy ? "checked" : ""}> Karty power-upów</label>
    ${u.powerupy ? `<label class="fld inline">Kopii każdego power-upu<input type="number" min="1" max="10" data-u="kopiePU" value="${u.kopiePU}"></label>` : ""}
    <div class="btns">
      <button class="btn primary" data-a="print">Drukuj</button>
      <button class="btn" data-a="test">Strona testowa</button>
    </div>
    <h2>Dane</h2>
    <div class="btns col">
      <button class="btn" data-a="new">+ Nowa karta</button>
      <button class="btn" data-a="export">Eksportuj poprawki (JSON)</button>
      <button class="btn" data-a="import">Importuj poprawki</button>
      <button class="btn" data-a="questions">Pobierz questions.js do gry</button>
      <button class="btn danger" data-a="reset">Usuń wszystkie poprawki</button>
    </div>
    <p class="hint">Poprawki zapisują się w tej przeglądarce. Żeby trafiły do gry online, pobierz questions.js i podmień plik w repozytorium.</p>`;
}

function renderCards() {
  const lista = widoczne();
  const wszystkie = karty();
  const ileWyb = wszystkie.filter(k => czyWybrana(k.nr)).length;
  const sel = (val, obj) => Object.entries(obj).map(([k, v]) => `<option value="${k}" ${A.filtr[val] === k ? "selected" : ""}>${v}</option>`).join("");
  document.getElementById("tab-cards").innerHTML = `
    <div class="filters">
      <input type="search" id="szukaj" placeholder="Szukaj w kartach…" value="${esc(A.filtr.szukaj)}">
      <select data-f="poziom">${sel("poziom", { all: "Wszystkie poziomy", ...POZIOMY })}</select>
      <select data-f="typ">${sel("typ", { all: "Prawda i fake", prawda: "Tylko prawda", fake: "Tylko fake" })}</select>
      <span class="count">Do druku: <b>${ileWyb}</b> z ${wszystkie.length}</span>
      <button class="btn small" data-a="sel-all">Zaznacz widoczne</button>
      <button class="btn small" data-a="sel-none">Odznacz widoczne</button>
    </div>
    <div class="grid">${lista.map(k => `
      <article class="item ${czyWybrana(k.nr) ? "" : "off"}">
        <label class="pick"><input type="checkbox" data-pick="${esc(k.nr)}" ${czyWybrana(k.nr) ? "checked" : ""}></label>
        <div class="mini" data-a="edit" data-nr="${esc(k.nr)}">
          ${k.obrazek ? `<img src="${esc(imgSrc(k.obrazek))}" alt="" loading="lazy">` : `<div class="noimg">brak zdjęcia</div>`}
        </div>
        <div class="meta">
          <div class="tags"><span class="nr">${esc(k.nr)}</span><span class="tag ${k.prawda ? "real" : "fake"}">${k.prawda ? "PRAWDA" : "FAKE"}</span><span class="tag">${POZIOMY[k.poziom] || ""}</span>${czyZmieniona(k) ? `<span class="tag edit">zmieniona</span>` : ""}${A.poprawki[k.nr]?.wlasna ? `<span class="tag edit">własna</span>` : ""}</div>
          <p class="tx">${esc(k.tekst)}</p>
          <button class="btn small" data-a="edit" data-nr="${esc(k.nr)}">Edytuj</button>
        </div>
      </article>`).join("") || `<p class="empty">Brak kart dla tych filtrów.</p>`}</div>`;
}

function renderPreview() {
  const { html, strony, karty: ile, s } = arkusze();
  document.getElementById("preview-bar").innerHTML = `
    ${A.test ? `<b class="testinfo">Strona testowa.</b>` : ""}
    <span>${ile} kart · ${strony} ${strony === 1 ? "strona" : strony < 5 ? "strony" : "stron"} A4 · ${s.cols} × ${s.rows} na stronie</span>
    <span class="hint">Drukuj w skali 100% („rzeczywisty rozmiar”), bez dopasowania do strony, dwustronnie: ${A.ust.odwracanie === "dluga" ? "obracanie przez długą krawędź" : "obracanie przez krótką krawędź"}.</span>
    ${A.test ? `<button class="btn small" data-a="test-off">Wróć do kart</button>` : ""}
    <button class="btn primary small" data-a="print">Drukuj</button>`;
  const box = document.getElementById("sheets");
  box.innerHTML = html;
  requestAnimationFrame(() => dopasujTeksty(box));
  // po wczytaniu zdjęć układ może się zmienić – dopasuj ponownie
  box.querySelectorAll("img").forEach(img => { if (!img.complete) img.addEventListener("load", () => dopasujTeksty(img.closest(".card")), { once: true }); });
}

function render() {
  document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === A.tab));
  document.getElementById("tab-cards").hidden = A.tab !== "cards";
  document.getElementById("tab-preview").hidden = A.tab !== "preview";
  renderSide();
  if (A.tab === "cards") renderCards(); else renderPreview();
}

// ═════════════ Edytor karty ═════════════
function otworzEdytor(nr) {
  const k = karty().find(x => x.nr === nr);
  if (!k) return;
  A.edytowana = { ...k };
  renderEdytor();
  document.getElementById("editor").showModal();
  podgladEdytora();   // dopiero teraz okno ma wymiary, więc tekst da się dopasować
}

function nowaKarta() {
  let i = 1;
  while (A.poprawki["W" + i] || PYTANIA.some(q => q.nr === "W" + i)) i++;
  A.edytowana = { nr: "W" + i, poziom: "normalny", prawda: false, tekst: "", wyjasnienie: "", zrodlo: "", link: "", obrazek: "", autor: "", handle: "", nowa: true };
  renderEdytor();
  document.getElementById("editor").showModal();
  podgladEdytora();   // dopiero teraz okno ma wymiary, więc tekst da się dopasować
}

function renderEdytor() {
  const k = A.edytowana;
  const oryginal = PYTANIA.find(q => q.nr === k.nr);
  const pole = (name, label, typ = "text", extra = "") =>
    `<label class="fld">${label}<input type="${typ}" data-e="${name}" value="${esc(k[name] ?? "")}" ${extra}></label>`;
  const obszar = (name, label, rows) =>
    `<label class="fld">${label}<textarea data-e="${name}" rows="${rows}">${esc(k[name] ?? "")}</textarea></label>`;
  document.getElementById("editor").innerHTML = `
    <form method="dialog" class="ed">
      <div class="ed-form">
        <h2>Karta ${esc(k.nr)}${k.nowa ? " (nowa)" : ""}</h2>
        <h3>Przód</h3>
        ${obszar("tekst", "Treść posta (nagłówek)", 3)}
        <div class="row2">
          ${pole("autor", "Autor (puste = bez nagłówka)")}
          ${pole("handle", "Podpis pod autorem")}
        </div>
        ${pole("obrazek", "Zdjęcie: plik z folderu img/ albo link")}
        <div class="row2">
          <label class="fld">Poziom<select data-e="poziom">${Object.entries(POZIOMY).map(([v, l]) => `<option value="${v}" ${k.poziom === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
          <label class="fld">Odpowiedź<select data-e="prawda"><option value="1" ${k.prawda ? "selected" : ""}>PRAWDA</option><option value="0" ${!k.prawda ? "selected" : ""}>FAKE</option></select></label>
        </div>
        <h3>Tył</h3>
        ${obszar("wyjasnienie", "Wyjaśnienie (Dlaczego?)", 5)}
        ${pole("link", "Link do źródła (na karcie widać domenę)")}
        ${pole("zrodlo", "Podpowiedź pod lupą (w grze)")}
        <div class="ed-btns">
          ${oryginal && czyZmieniona(k) ? `<button type="button" class="btn" data-a="ed-restore">Przywróć oryginał</button>` : ""}
          ${!oryginal && !k.nowa ? `<button type="button" class="btn danger" data-a="ed-delete">Usuń kartę</button>` : ""}
          ${oryginal ? `<button type="button" class="btn danger ghost" data-a="ed-hide">Usuń z talii</button>` : ""}
          <span class="sp"></span>
          <button type="button" class="btn" data-a="ed-cancel">Anuluj</button>
          <button type="button" class="btn primary" data-a="ed-save">Zapisz</button>
        </div>
      </div>
      <div class="ed-prev">
        <div class="pv"><div class="pv-label">Przód</div><div class="pv-card" id="pv-front"></div></div>
        <div class="pv"><div class="pv-label">Tył</div><div class="pv-card" id="pv-back"></div></div>
      </div>
    </form>`;
  podgladEdytora();
}

function podgladEdytora() {
  const k = A.edytowana, r = ROZMIARY[A.ust.rozmiar];
  for (const [id, html] of [["pv-front", przodPytania(k)], ["pv-back", tylPytania(k)]]) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.style.width = r.w + "mm";
    el.style.height = r.h + "mm";
    el.innerHTML = html;
    dopasujTeksty(el);
  }
}

function zapiszEdycje() {
  const k = A.edytowana;
  if (!String(k.tekst || "").trim()) { toast("Treść posta nie może być pusta."); return; }
  const oryginal = PYTANIA.find(q => q.nr === k.nr);
  if (oryginal) {
    // zapisujemy tylko pola różne od oryginału
    const diff = {};
    for (const f of POLA) if ((k[f] ?? "") !== (oryginal[f] ?? "")) diff[f] = k[f];
    if (Object.keys(diff).length) A.poprawki[k.nr] = diff; else delete A.poprawki[k.nr];
  } else {
    const dane = { wlasna: true };
    for (const f of POLA) dane[f] = k[f] ?? "";
    A.poprawki[k.nr] = dane;
    if (A.wybrane) A.wybrane.add(k.nr);
  }
  zapisz(KLUCZ_POPRAWEK, A.poprawki);
  document.getElementById("editor").close();
  toast(`Zapisano kartę ${k.nr}.`);
  render();
}

// ═════════════ Eksport / import ═════════════
function eksportQuestions() {
  const lista = karty().map(k => {
    const o = {};
    for (const f of ["nr", "poziom", "prawda", "tekst", "zrodlo", "link", "wyjasnienie", "obrazek", "obrazekZrodlo", "autor", "handle"]) {
      if (k[f] !== undefined && k[f] !== "") o[f] = k[f];
    }
    return o;
  });
  const naglowek = PYTANIA_NAGLOWEK;
  const tresc = naglowek + "const PYTANIA = [\n" + lista.map(o => "  " + JSON.stringify(o) + ",").join("\n") + "\n];\n";
  pobierzPlik("questions.js", tresc, "text/javascript");
  toast("Pobrano questions.js – podmień nim plik w repozytorium gry.");
}
const PYTANIA_NAGLOWEK = `// Baza pytań – wygenerowana na stronie z kartami (admin.html).
// Pola: nr, poziom (latwy/normalny/trudny), prawda, tekst, zrodlo, link, wyjasnienie,
//       obrazek (plik z img/ albo link), obrazekZrodlo, autor, handle.

`;

// ═════════════ Zdarzenia ═════════════
const akcje = {
  print: () => {
    A.tab = "preview";
    render();
    document.fonts.ready.then(() => setTimeout(() => { dopasujTeksty(document.getElementById("sheets")); window.print(); }, 300));
  },
  test: () => { A.test = true; A.tab = "preview"; render(); },
  "test-off": () => { A.test = false; render(); },
  new: nowaKarta,
  edit: el => otworzEdytor(el.dataset.nr),
  export: () => {
    pobierzPlik("karty-poprawki.json", JSON.stringify({ poprawki: A.poprawki, ustawienia: A.ust }, null, 2), "application/json");
  },
  import: () => document.getElementById("import-file").click(),
  questions: eksportQuestions,
  reset: () => {
    if (!confirm("Usunąć wszystkie poprawki i własne karty z tej przeglądarki?")) return;
    A.poprawki = {};
    zapisz(KLUCZ_POPRAWEK, A.poprawki);
    render();
    toast("Przywrócono oryginalne karty.");
  },
  "sel-all": () => {
    if (A.wybrane === null) return;
    widoczne().forEach(k => A.wybrane.add(k.nr));
    if (A.wybrane.size >= karty().length) A.wybrane = null;
    render();
  },
  "sel-none": () => {
    if (A.wybrane === null) A.wybrane = new Set(karty().map(k => k.nr));
    widoczne().forEach(k => A.wybrane.delete(k.nr));
    render();
  },
  "ed-save": zapiszEdycje,
  "ed-cancel": () => document.getElementById("editor").close(),
  "ed-restore": () => {
    delete A.poprawki[A.edytowana.nr];
    zapisz(KLUCZ_POPRAWEK, A.poprawki);
    document.getElementById("editor").close();
    toast("Przywrócono oryginał.");
    render();
  },
  "ed-hide": () => {
    A.poprawki[A.edytowana.nr] = { ...(A.poprawki[A.edytowana.nr] || {}), usunieta: true };
    zapisz(KLUCZ_POPRAWEK, A.poprawki);
    document.getElementById("editor").close();
    toast("Karta usunięta z talii (przywrócisz ją przyciskiem „Usuń wszystkie poprawki”).");
    render();
  },
  "ed-delete": () => {
    delete A.poprawki[A.edytowana.nr];
    zapisz(KLUCZ_POPRAWEK, A.poprawki);
    document.getElementById("editor").close();
    render();
  },
};

document.addEventListener("click", e => {
  const tab = e.target.closest("#tabs [data-tab]");
  if (tab) { A.tab = tab.dataset.tab; render(); return; }
  const el = e.target.closest("[data-a]");
  if (el && akcje[el.dataset.a]) { e.preventDefault(); akcje[el.dataset.a](el); }
});

document.addEventListener("input", e => {
  const t = e.target;
  if (t.dataset.u) {
    const v = t.type === "checkbox" ? t.checked : t.type === "number" ? +t.value : t.value;
    A.ust[t.dataset.u] = v;
    zapisz(KLUCZ_USTAWIEN, A.ust);
    if (t.type === "number") { if (A.tab === "preview") renderPreview(); } else render();
  }
  if (t.dataset.e) {
    A.edytowana[t.dataset.e] = t.dataset.e === "prawda" ? t.value === "1" : t.value;
    podgladEdytora();
  }
  if (t.id === "szukaj") {
    A.filtr.szukaj = t.value;
    renderCards();
    const s = document.getElementById("szukaj");
    s.focus();
    s.setSelectionRange(s.value.length, s.value.length);
  }
  if (t.dataset.f) { A.filtr[t.dataset.f] = t.value; renderCards(); }
  if (t.dataset.pick) {
    if (A.wybrane === null) A.wybrane = new Set(karty().map(k => k.nr));
    if (t.checked) A.wybrane.add(t.dataset.pick); else A.wybrane.delete(t.dataset.pick);
    renderCards();
  }
});

document.getElementById("import-file").addEventListener("change", async e => {
  const f = e.target.files[0];
  e.target.value = "";
  if (!f) return;
  try {
    const dane = JSON.parse(await f.text());
    if (!dane || typeof dane.poprawki !== "object") throw new Error();
    A.poprawki = dane.poprawki;
    if (dane.ustawienia) A.ust = { ...DOMYSLNE, ...dane.ustawienia };
    zapisz(KLUCZ_POPRAWEK, A.poprawki);
    zapisz(KLUCZ_USTAWIEN, A.ust);
    render();
    toast("Zaimportowano poprawki.");
  } catch {
    toast("To nie jest plik z poprawkami kart.");
  }
});

window.addEventListener("beforeprint", () => {
  if (A.tab !== "preview") { A.tab = "preview"; render(); }
  dopasujTeksty(document.getElementById("sheets"));
});

render();
document.fonts.ready.then(() => { if (A.tab === "preview") dopasujTeksty(document.getElementById("sheets")); });
