"use strict";

// ═════════════ Makieta 3D wersji karcianej (CSS 3D, wymiary w mm) ═════════════
// Świat: stół to płaszczyzna XY (x w prawo, y do gracza), z rośnie w górę.
// Używa kart i pudełka z admin.js / dodatki.js, więc makieta zawsze wygląda jak wydruk.

const WIDOKI = [
  { id: "samo",         scena: "samo",    label: "Samo pudełko",       rx: 62, rz: -32, zoom: 1 },
  { id: "samo-tyl",     scena: "samo",    label: "Samo pudełko – tył", rx: 62, rz: 148, zoom: 1 },
  { id: "samo-bok",     scena: "samo",    label: "Samo pudełko – bok", rx: 84, rz: 90,  zoom: 1 },
  { id: "samo-gora",    scena: "samo",    label: "Samo pudełko – góra", rx: 12, rz: -6, zoom: 1 },
  { id: "pudelko",      scena: "pudelko", label: "Pudełko",          rx: 60, rz: -28, zoom: 1 },
  { id: "pudelko-bok",  scena: "pudelko", label: "Pudełko z boku",   rx: 76, rz: 38,  zoom: 1 },
  { id: "pudelko-gora", scena: "pudelko", label: "Pudełko z góry",   rx: 18, rz: -8,  zoom: 1 },
  { id: "stol",         scena: "stol",    label: "Rozgrywka",        rx: 52, rz: -12, zoom: 1 },
  { id: "stol-gora",    scena: "stol",    label: "Stół z góry",      rx: 16, rz: 0,   zoom: 0.86 },
  { id: "stol-bok",     scena: "stol",    label: "Stół z boku",      rx: 70, rz: 34,  zoom: 1 },
];

// Jedna ściana obiektu; transform-origin w lewym górnym rogu.
function sciana(w, h, transform, html = "", cls = "") {
  return `<div class="m-f ${cls}" style="width:${w}mm;height:${h}mm;transform:${transform}">${html}</div>`;
}

// Prostopadłościan w×l×h stojący na stole w punkcie (x, y, z), obrócony o rz wokół środka.
// f: { gora, dol, przod, tyl, lewa, prawa } – HTML ścian; brak klucza = brak ściany.
function bryla({ x = 0, y = 0, z = 0, w, l, h, rz = 0, f, cls = "", klasaScian = "" }) {
  const sc = [];
  if ("dol" in f) sc.push(sciana(w, l, `translateX(${w}mm) rotateY(180deg)`, f.dol, klasaScian));
  if ("przod" in f) sc.push(sciana(w, h, `translate3d(0, ${l}mm, ${h}mm) rotateX(-90deg)`, f.przod, `${klasaScian} sh-p`));
  if ("tyl" in f) sc.push(sciana(w, h, `translate3d(${w}mm, 0, ${h}mm) rotateZ(180deg) rotateX(-90deg)`, f.tyl, `${klasaScian} sh-t`));
  if ("prawa" in f) sc.push(sciana(l, h, `translate3d(${w}mm, ${l}mm, ${h}mm) rotateZ(-90deg) rotateX(-90deg)`, f.prawa, `${klasaScian} sh-r`));
  if ("lewa" in f) sc.push(sciana(l, h, `translate3d(0, 0, ${h}mm) rotateZ(90deg) rotateX(-90deg)`, f.lewa, `${klasaScian} sh-l`));
  if ("gora" in f) sc.push(sciana(w, l, `translateZ(${h}mm)`, f.gora, `top ${klasaScian}`));
  return `<div class="m-o ${cls}" style="width:${w}mm;height:${l}mm;transform:translate3d(${x - w / 2}mm, ${y - l / 2}mm, ${z}mm) rotateZ(${rz}deg)">${sc.join("")}</div>`;
}

// Miękki cień pod obiektem.
function cien(x, y, w, l, rz = 0, mocny = 1) {
  return `<div class="m-shadow" style="width:${w}mm;height:${l}mm;opacity:${0.5 * mocny};transform:translate3d(${x - w / 2}mm, ${y - l / 2}mm, 0.05mm) rotateZ(${rz}deg)"></div>`;
}

// Pojedyncza karta leżąca na stole (grubość 0,3 mm).
function kartaNaStole(x, y, z, rz, gora, dol = "") {
  const r = ROZMIARY[A.ust.rozmiar];
  return bryla({ x, y, z, w: r.w, l: r.h, h: 0.3, rz, f: { gora, dol }, cls: "m-card" });
}

// Talia jako bryła: na wierzchu karta, boki w paski.
function taliaBryla(x, y, z, rz, ile, gora) {
  const r = ROZMIARY[A.ust.rozmiar], h = ile * 0.3, bok = `<div class="m-edge"></div>`;
  return bryla({ x, y, z, w: r.w, l: r.h, h, rz, f: { gora, przod: bok, tyl: bok, lewa: bok, prawa: bok }, cls: "m-card" });
}

// Pudełko: spód + wieczko, z nadrukiem na bokach jak na wydruku.
function pudelkoBryla(x, y, rz, otwarte) {
  const { spod, wieczko } = wymiaryPudelka();
  const bok = (rodzaj, dol) => `<div class="m-boxbg m-wallbox">${bokPudelka(rodzaj, dol)}</div>`;
  const tlo = `<div class="m-boxbg"></div>`;
  const out = [];
  out.push(cien(x, y, wieczko.W + 6, wieczko.L + 6, rz));
  out.push(bryla({ x, y, w: spod.W, l: spod.L, h: spod.H, rz, cls: "m-box",
    f: { dol: tlo, przod: bok("logo", true), tyl: bok("logo", true), lewa: bok("napis", true), prawa: bok("napis", true), ...(otwarte ? {} : { gora: tlo }) },
    klasaScian: "dark bx-p" }));
  if (otwarte) {
    // talia w środku, wystaje trochę ponad brzeg
    const ile = Math.round((spod.H - 4) / 0.3);
    out.push(`<div class="m-o" style="transform:translate3d(${x}mm, ${y}mm, 1mm) rotateZ(${rz}deg)">${taliaBryla(0, 0, 0, 0, ile, przodPytania(probki()[5]))}</div>`);
  } else {
    out.push(wieczkoBryla(x, y, rz, spod.H - wieczko.H + 0.6, false));
  }
  return out.join("");
}

// Wieczko (wierzchem do góry); z = wysokość dolnej krawędzi.
function wieczkoBryla(x, y, rz, z = 0, zCieniem = true) {
  const { wieczko } = wymiaryPudelka();
  const bok = rodzaj => `<div class="m-boxbg m-wallbox">${bokPudelka(rodzaj)}</div>`;
  return (zCieniem ? cien(x, y, wieczko.W + 6, wieczko.L + 6, rz) : "") + bryla({ x, y, z, w: wieczko.W, l: wieczko.L, h: wieczko.H, rz, cls: "m-box",
    f: { gora: gornaPokrywa(), przod: bok("logo"), tyl: bok("logo"), lewa: bok("napis"), prawa: bok("napis") }, klasaScian: "dark bx-p" });
}

// Klepsydra z dwóch skrzyżowanych płaszczyzn, żeby z każdej strony wyglądała na bryłę.
function klepsydra(x, y) {
  const svg = `<svg viewBox="0 0 40 70" class="m-hg"><rect x="2" y="1" width="36" height="5" rx="2" fill="#7a4b2a"/><rect x="2" y="64" width="36" height="5" rx="2" fill="#7a4b2a"/>
    <rect x="4" y="6" width="2.4" height="58" fill="#5c381f"/><rect x="33.6" y="6" width="2.4" height="58" fill="#5c381f"/>
    <path d="M9 6 H31 C31 22 22 28 21 35 C22 42 31 48 31 64 H9 C9 48 18 42 19 35 C18 28 9 22 9 6 Z" fill="rgba(210,230,255,.55)" stroke="rgba(255,255,255,.9)" stroke-width=".8"/>
    <path d="M12.5 15 H27.5 C26 22 21.5 26 20 31 C18.5 26 14 22 12.5 15 Z" fill="#f2c46b"/><path d="M11 63 C12 55 16 52 20 51 C24 52 28 55 29 63 Z" fill="#f2c46b"/><rect x="19.5" y="35" width="1" height="16" fill="#f2c46b"/></svg>`;
  const w = 40, h = 70;
  const pl = rot => `<div class="m-f m-bill" style="width:${w}mm;height:${h}mm;transform:translate3d(${-w / 2}mm, 0, ${h}mm) rotateZ(${rot}deg) rotateX(-90deg)">${svg}</div>`;
  return cien(x, y, 34, 34, 0, .8) + `<div class="m-o" style="transform:translate3d(${x}mm, ${y}mm, 0)">
    <div class="m-o" style="transform:rotateZ(0deg)">${pl(0)}</div><div class="m-o" style="transform:rotateZ(90deg)">${pl(0)}</div>
    ${[0.3, h].map(z => `<div class="m-f m-disc" style="width:${w - 2}mm;height:${w - 2}mm;transform:translate3d(${-(w - 2) / 2}mm, ${-(w - 2) / 2}mm, ${z}mm)"></div>`).join("")}</div>`;
}

// Kilka kart pytań ze zdjęciami (zawsze te same, żeby ujęcia były powtarzalne).
function probki() {
  const z = wybraneKarty().filter(k => k.obrazek);
  return [0, 4, 7, 12, 18, 25, 31, 40, 52, 66, 77, 90].map(i => z[i % z.length]);
}

function scenaPudelko() {
  const r = ROZMIARY[A.ust.rozmiar];
  const p = probki();
  return [
    pudelkoBryla(-38, 0, 0, false),
    cien(92, -48, r.w, r.h, -10, .6),
    kartaNaStole(92, -48, 0, -10, przodPU(POWERUPY_KARTY[2])),
    cien(58, 30, r.w, r.h, 16, .6),
    kartaNaStole(58, 30, 0, 16, przodPytania(p[1])),
  ].join("");
}

function scenaStol() {
  const r = ROZMIARY[A.ust.rozmiar], p = probki();
  const out = [];
  // luźna kupka na środku, pytaniem do góry, z wmieszanymi power-upami
  const kupka = [[-6, -8, 4], [8, -2, -14], [-2, 6, 22], [10, 10, 8], [-12, 2, -26], [2, -4, 40], [-8, 12, -6], [6, 4, 16]];
  out.push(cien(0, 0, r.w + 30, r.h + 30, 0, .7));
  kupka.forEach(([dx, dy, rot], i) => {
    const gora = i === 3 ? przodPU(POWERUPY_KARTY[5]) : przodPytania(p[(i + 2) % p.length]);
    out.push(kartaNaStole(dx, dy, i * 0.35, rot, gora));
  });
  // wylosowana karta przed graczem i odwrócona poprzednia
  out.push(cien(-34, 118, r.w, r.h, -4, .6), kartaNaStole(-34, 118, 0, -4, przodPytania(p[0])));
  out.push(cien(40, 122, r.w, r.h, 6, .6), kartaNaStole(40, 122, 0, 6, tylPytania(p[9])));
  // zdobyte karty (tyłem do góry) i power-upy w ręce
  out.push(cien(118, 112, r.w, r.h, 12, .6), taliaBryla(118, 112, 0, 12, 5, tylPytania(p[4])));
  out.push(cien(-118, 100, r.w, r.h, -16, .6));
  out.push(kartaNaStole(-112, 104, 0, -6, przodPU(POWERUPY_KARTY[0])), kartaNaStole(-124, 98, 0.4, -22, przodPU(POWERUPY_KARTY[7])));
  // pudełko z resztą talii, wieczko, klepsydra i karta zasad
  out.push(pudelkoBryla(-150, -40, 8, true));
  out.push(wieczkoBryla(-150, -150, -10));
  out.push(klepsydra(120, -10));
  out.push(cien(140, -110, r.w, r.h, 14, .6), kartaNaStole(140, -110, 0, 14, kartyZasad()[0][0]));
  return out.join("");
}

function htmlSceny(scena) {
  if (scena === "samo") return pudelkoBryla(0, 0, 0, false);
  return scena === "stol" ? scenaStol() : scenaPudelko();
}

// Stan widoku (kamera)
const M = { widok: WIDOKI[0], rx: WIDOKI[0].rx, rz: WIDOKI[0].rz, zoom: 1 };

function kamera() {
  const el = document.getElementById("m-world");
  if (!el) return;
  const box = el.parentElement.getBoundingClientRect();
  const zakres = { stol: 430, pudelko: 230, samo: 150 }[M.widok.scena];   // mm, które mają się zmieścić
  const s = Math.min(box.width, box.height * 1.25) / (zakres * 3.78) * M.zoom;
  const dz = M.widok.scena === "stol" ? 0 : -25;
  el.style.transform = `scale(${s}) rotateX(${M.rx}deg) rotateZ(${M.rz}deg) translateZ(${dz}mm)`;
}

function renderMakieta(tylkoUjecie) {
  const host = document.getElementById("makieta");
  const bar = document.getElementById("makieta-bar");
  if (bar) bar.innerHTML = `${WIDOKI.map(v => `<button class="btn small ${v.id === M.widok.id ? "primary" : ""}" data-widok="${v.id}">${v.label}</button>`).join("")}
    <span class="hint">Przeciągnij myszką, żeby obrócić; kółkiem przybliżasz.</span>`;
  host.innerHTML = `<div class="m-view ${tylkoUjecie ? "full" : ""}"><div class="m-world" id="m-world">${htmlSceny(M.widok.scena)}</div></div>`;
  kamera();
  requestAnimationFrame(() => dopasujTeksty(host));
}

function ustawWidokStartowy(id) {
  const v = WIDOKI.find(w => w.id === id) || WIDOKI[0];
  Object.assign(M, { widok: v, rx: v.rx, rz: v.rz, zoom: v.zoom });
}

function ustawWidok(id) {
  const v = WIDOKI.find(w => w.id === id) || WIDOKI[0];
  const nowaScena = v.scena !== M.widok.scena;
  Object.assign(M, { widok: v, rx: v.rx, rz: v.rz, zoom: v.zoom });
  if (nowaScena || !document.getElementById("m-world")) renderMakieta(); else {
    kamera();
    document.querySelectorAll("#makieta-bar [data-widok]").forEach(b => b.classList.toggle("primary", b.dataset.widok === id));
  }
}

document.addEventListener("click", e => {
  const b = e.target.closest("#makieta-bar [data-widok]");
  if (b) ustawWidok(b.dataset.widok);
});

// obracanie myszką / palcem
let mDrag = null;
document.addEventListener("pointerdown", e => {
  if (!e.target.closest(".m-view")) return;
  mDrag = { x: e.clientX, y: e.clientY, rx: M.rx, rz: M.rz };
  e.target.closest(".m-view").setPointerCapture?.(e.pointerId);
});
document.addEventListener("pointermove", e => {
  if (!mDrag) return;
  M.rz = mDrag.rz - (e.clientX - mDrag.x) * 0.4;
  M.rx = Math.max(0, Math.min(85, mDrag.rx - (e.clientY - mDrag.y) * 0.3));
  kamera();
});
document.addEventListener("pointerup", () => { mDrag = null; });
document.addEventListener("wheel", e => {
  if (!e.target.closest(".m-view")) return;
  e.preventDefault();
  M.zoom = Math.max(0.4, Math.min(3, M.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
  kamera();
}, { passive: false });
window.addEventListener("resize", kamera);
