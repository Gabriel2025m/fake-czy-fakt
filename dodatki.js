"use strict";

// ═════════════ Wersja karciana: zasady, instrukcja i pudełko ═════════════
// Ładowane przed admin.js; korzysta z jego funkcji (esc, logoMini, PODPIS, styl, karty…)
// dopiero w chwili wywołania. Zasady są dla samych graczy – bez prowadzącego.

const GRA_KARCIANA = {
  gracze: "2–8 graczy",
  czas: "15–30 min",
  sekundy: 15,
  dlugosc: { szybka: { label: "Szybka", rundy: 6 }, normalna: { label: "Normalna", rundy: 10 }, dluga: { label: "Długa", rundy: 14 } },
  poziomy: [
    { kropki: 1, label: "Łatwy" },
    { kropki: 2, label: "Normalny" },
    { kropki: 3, label: "Trudny" },
  ],
};
const metaGry = () => `${t(GRA_KARCIANA.gracze)} · ${GRA_KARCIANA.czas}`;

// Nazwa gry w kolorach: FAKE czy FAKT? / FAKE or FACT? / FAKE oder FAKT?
const nazwaGry = (kl = "r") => `<span class="f">FAKE</span> <span class="czy">${t("czy")}</span> <span class="${kl}">${t("FAKT?")}</span>`;
// Logo FAK + ułamek E/T z kreską „czy”
const logoUlamek = () => `<span class="i-fak">FAK</span><span class="i-frac"><i class="e">E</i><b>${t("czy")}</b><i class="t">T</i></span>`;

const kropkiTxt = n => "●".repeat(n);

// „1 karta”, „2 karty”, „5 kart”
function kartOdm(n) {
  const j = n % 10, d = n % 100;
  if (n === 1) return "karta";
  return j >= 2 && j <= 4 && (d < 12 || d > 14) ? "karty" : "kart";
}

// Ile kart czego jest w talii (zależy od ustawień strony).
function sklad() {
  const pytania = wybraneKarty().length;
  const pu = A.ust.powerupy ? POWERUPY_KARTY.length * kompletyPU() : 0;
  return { pytania, pu, zasady: A.ust.zasady ? 4 : 0 };
}
function skladTxt() {
  const k = sklad();
  return t("Talia: {0} {1} pytań + {2} {3} power-upów", k.pytania, kartOdm(k.pytania), k.pu, kartOdm(k.pu)) + (k.zasady ? t(" + {0} karty zasad", k.zasady) : "");
}

// ── karty zasad (4 karty, przód + tył – mieszczą się w pudełku razem z talią) ──
function panelyZasad() {
  const P = GRA_KARCIANA;
  return [
    { t: t("Zasady gry"), b: `<p class="r-lead">${t('Wylosuj post z sieci i zdecyduj: <b class="f">FAKE</b> czy <b class="r">PRAWDA</b>? Każda dobra odpowiedź to zdobyta karta.')}</p>
        <p class="r-meta">${metaGry()}</p>
        <p>${t("Potrzebne: klepsydra {0} s (albo stoper w telefonie). Nie trzeba zapisywać punktów.", P.sekundy)}</p>` },
    { t: t("1. Długość gry"), b: `<p>${t("Wybierzcie, ile rund gracie. W rundzie każdy gracz losuje raz.")}</p>
        <ul>${Object.values(P.dlugosc).map(d => `<li><b>${t(d.label)}</b>: ${t("{0} rund", d.rundy)}</li>`).join("")}</ul>
        <p>${t("Gra kończy się też wtedy, gdy w kupce skończą się pytania.")}</p>` },
    { t: t("2. Poziom"), b: `<p>${t("Kropki na karcie to poziom: <b>●</b> łatwy, <b>●●</b> normalny, <b>●●●</b> trudny.")}</p>
        <p>${t("Weźcie karty jednego poziomu albo je <b>zmieszajcie</b> (np. ●● z ●●● albo całą talię).")}</p>
        <p>${t("Czas jest zawsze ten sam: <b>{0} s</b>.", P.sekundy)}</p>` },
    { t: t("3. Przygotowanie"), b: `<p>${t("Potasujcie wybrane karty pytań <b>razem z power-upami</b> (1 komplet power-upów na ok. {0} pytań) i połóżcie w kupce na środku stołu.", PYTAN_NA_KOMPLET)}</p>
        <p>${t("Klepsydrę postawcie obok. Zaczyna najmłodszy gracz, potem kolej idzie w lewo.")}</p>` },
    { t: t("4. Twoja tura"), b: `<ol><li>${t("Zamknij oczy. Sąsiad z lewej rozkłada kupkę w wachlarz i Ci ją podaje – wyciągnij jedną kartę, nie z wierzchu.")}</li>
        <li>${t("Power-up? Zatrzymaj go i losuj dalej, aż trafisz na pytanie.")}</li>
        <li>${t("Odwróć klepsydrę i przeczytaj post na głos.")}</li>
        <li>${t('Powiedz <b class="f">FAKE</b> albo <b class="r">PRAWDA</b>, zanim przesypie się piasek.')}</li>
        <li>${t("Odwróć kartę i przeczytaj wyjaśnienie.")}</li></ol>` },
    { t: t("5. Punkty"), b: `<ul><li>${t("<b>Dobrze:</b> zatrzymujesz kartę pytania – to Twój punkt.")}</li>
        <li>${t("<b>Źle albo po czasie:</b> karta idzie na stos odrzuconych.")}</li></ul>
        <p>${t("Nie ma tabeli wyników: punkty to karty pytań, które leżą przed Tobą.")}</p>` },
    { t: t("6. Power-upy"), b: `<p>${t("Power-upy wylosowane z kupki trzymasz w ręce, tak żeby inni ich nie widzieli.")}</p>
        <p>${t("Zagrywasz je w swojej turze, po przeczytaniu posta, a przed odpowiedzią. <b>Pomoc</b> działa od razu, <b>atak</b> w następnej turze wybranego gracza. <b>Tarczę</b> zagrywasz, gdy ktoś Cię atakuje.")}</p>` },
    { t: t("7. Koniec gry"), b: `<p>${t("Po ostatniej rundzie każdy liczy swoje karty pytań. Każdy niewykorzystany power-up to <b>+0,5 pkt</b>.")}</p>
        <p>${t("Wygrywa gracz z największą liczbą punktów. Remis? Dogrywka: remisujący losują po kolei, aż ktoś się pomyli.")}</p>` },
  ];
}

function kartaZasad(panel, i, etykieta = `${t("ZASADY")} ${i + 1}/8`) {
  return `<div class="card rule ${styl()}">
    <div class="c-top">${logoMini()}<span class="c-nr">${etykieta}</span></div>
    <div class="rule-panel">
      <div class="rule-t">${panel.t}</div>
      <div class="rule-b fit" data-max="8.6" data-min="6">${panel.b}</div>
    </div>
    <div class="c-foot"><span class="c-credit">${PODPIS}</span></div>
  </div>`;
}

// Pary [przód, tył] kart zasad do talii.
function kartyZasad() {
  const p = panelyZasad().map((panel, i) => kartaZasad(panel, i));
  return [[p[0], p[1]], [p[2], p[3]], [p[4], p[5]], [p[6], p[7]]];
}

// ── instrukcja A4 (2 strony) ──
function naglowekA4(podtytul) {
  return `<header class="i-head">
    <div class="i-logo">${logoUlamek()}</div>
    <div class="i-title"><b>${podtytul}</b><span>${metaGry()}</span><small>${PODPIS}</small></div>
  </header>`;
}

function instrukcjaStrona1() {
  const P = GRA_KARCIANA, k = sklad();
  return `<div class="sheet a4 instr">${naglowekA4(t("Zasady gry karcianej"))}
  <div class="i-cols">
    <section><h3>${t("Cel gry")}</h3>
      <p>${t('Każda karta pytania to post z sieci. Rozpoznaj, czy to <b class="f">FAKE</b> (dezinformacja, mit, manipulacja), czy <b class="r">PRAWDA</b>. Za każdą dobrą odpowiedź zatrzymujesz kartę. Wygrywa gracz, który na koniec ma najwięcej kart. Gra nie potrzebuje prowadzącego: grają tylko gracze.')}</p></section>
    <section><h3>${t("Zawartość")}</h3>
      <p>${t(k.zasady
        ? "{0} {1} pytań (z przodu post, z tyłu odpowiedź i wyjaśnienie), {2} {3} power-upów ({4} rodzajów), {5} karty zasad i składana ulotka z zasadami. Potrzebna jest też klepsydra {6}-sekundowa albo stoper w telefonie."
        : "{0} {1} pytań (z przodu post, z tyłu odpowiedź i wyjaśnienie), {2} {3} power-upów ({4} rodzajów) i składana ulotka z zasadami. Potrzebna jest też klepsydra {6}-sekundowa albo stoper w telefonie.",
        k.pytania, kartOdm(k.pytania), k.pu, kartOdm(k.pu), POWERUPY_KARTY.length, k.zasady, P.sekundy)}</p></section>
    <section><h3>${t("1. Długość gry")}</h3>
      <p>${t("W jednej rundzie każdy gracz losuje i odpowiada raz.")}</p>
      <table class="i-tab"><tr><th>${t("Gra")}</th><th>${t("Rund")}</th></tr>
        ${Object.values(P.dlugosc).map(d => `<tr><td>${t(d.label)}</td><td>${d.rundy}</td></tr>`).join("")}</table>
      <p>${t("Jeśli w kupce skończą się pytania, gra kończy się wcześniej.")}</p></section>
    <section><h3>${t("2. Poziom trudności")}</h3>
      <p>${t("Kropki w rogu karty pytania pokazują poziom:")}</p>
      <table class="i-tab"><tr><th>${t("Kropki")}</th><th>${t("Poziom")}</th></tr>
        ${P.poziomy.map(l => `<tr><td>${kropkiTxt(l.kropki)}</td><td>${t(l.label)}</td></tr>`).join("")}</table>
      <p>${t("Przed grą wybierzcie karty jednego poziomu albo je <b>zmieszajcie</b>: np. ●● z ●●●, a dla młodszych graczy ● z ●●. Można też grać całą talią. Czas na odpowiedź jest zawsze taki sam: <b>{0} sekund</b>.", P.sekundy)}</p></section>
    <section><h3>${t("3. Przygotowanie")}</h3>
      <ul><li>${t("Potasujcie wybrane karty pytań <b>razem z kartami power-upów</b> i połóżcie je w kupce na środku stołu.")}</li>
      <li>${t("Power-upów ma być mniej więcej <b>1 komplet</b> (po 1 karcie z każdego z {0} rodzajów) <b>na {1} kart pytań</b>. Gracie całą talią? Weźcie wszystkie. Gracie np. tylko kartami ●● (ok. 50)? Weźcie 1 komplet.", POWERUPY_KARTY.length, PYTAN_NA_KOMPLET)}</li>
      <li>${t("Postawcie obok klepsydrę. Zaczyna najmłodszy gracz, potem kolej przechodzi w lewo.")}</li></ul></section>
    <section><h3>${t("4. Twoja tura")}</h3>
      <ol><li>${t("<b>Zamknij oczy.</b> Sąsiad z lewej bierze kupkę ze stołu, rozkłada ją w wachlarz i podaje Ci. Wyciągnij jedną kartę z dowolnego miejsca – nie wolno brać karty z wierzchu. Sąsiad odkłada kupkę na stół.")}</li>
      <li>${t("Jeśli to <b>power-up</b>, zatrzymaj go i losuj dalej, aż trafisz na kartę pytania.")}</li>
      <li>${t("Odwróć klepsydrę i przeczytaj post na głos.")}</li>
      <li>${t('Powiedz <b class="f">FAKE</b> albo <b class="r">PRAWDA</b>, zanim przesypie się piasek.')}</li>
      <li>${t("Odwróć kartę: pieczątka pokazuje odpowiedź. Przeczytaj wyjaśnienie na głos, żeby wszyscy się czegoś dowiedzieli.")}</li></ol></section>
    <section><h3>${t("5. Punkty")}</h3>
      <ul><li>${t("<b>Dobra odpowiedź:</b> zatrzymujesz kartę pytania i kładziesz ją przed sobą. Jedna karta to jeden punkt.")}</li>
      <li>${t("<b>Zła odpowiedź albo brak odpowiedzi w czasie:</b> karta idzie na stos odrzuconych.")}</li></ul>
      <p>${t("Nie zapisujecie wyników: wystarczy policzyć karty.")}</p></section>
    <section><h3>${t("6. Power-upy")}</h3>
      <p>${t("Power-upy są wmieszane w kupkę, więc trafiają się przy losowaniu (średnio co 6–7 losowanie). Trzymasz je w ręce, tak żeby inni ich nie widzieli.")}</p>
      <p>${t("<b>Zagrywanie:</b> w swojej turze, po przeczytaniu posta, a przed odpowiedzią; możesz zagrać power-up wylosowany w tej samej turze. <b>Pomoc</b> działa od razu na Twoje pytanie. <b>Atak</b> działa w najbliższej turze wskazanego gracza. <b>Tarczę</b> zagrywasz w dowolnej chwili, gdy ktoś Cię atakuje. Zagrane karty idą na stos odrzuconych.")}</p></section>
    <section><h3>${t("7. Koniec gry")}</h3>
      <p>${t("Gra kończy się po ostatniej rundzie. Każdy liczy swoje karty pytań, a każdy niewykorzystany power-up dolicza jako <b>+0,5 pkt</b>. Wygrywa gracz z największą liczbą punktów. Przy remisie dogrywka: remisujący losują po kolei, aż ktoś się pomyli.")}</p></section>
  </div>
  <footer class="i-foot">${t("Wersja online tej gry:")} <b>fake-czy-fakt-unseen.pl</b></footer>
  </div>`;
}

function instrukcjaStrona2() {
  const pu = POWERUPY_KARTY.map(tpu);
  const wiersz = d => `<tr><td class="ic">${d.ikona}</td><td><b>${esc(d.nazwa)}</b></td><td>${esc(d.opisKarty)}</td></tr>`;
  const kroki = [
    ["🙈", t("Losuj"), t("oczy zamknięte, sąsiad podaje wachlarz")],
    ["⚡", t("Power-up?"), t("zatrzymaj i losuj dalej")],
    ["⏳", t("Klepsydra"), t("{0} sekund", GRA_KARCIANA.sekundy)],
    ["🗣️", t("FAKE czy PRAWDA?"), t("odpowiedz na głos")],
    ["🔄", t("Odwróć kartę"), t("dobrze = karta jest Twoja")],
  ];
  return `<div class="sheet a4 instr">${naglowekA4(t("Power-upy i przebieg tury"))}
  <div class="i-pu">
    <section><h3 class="r">${t("Pomoc dla Ciebie")}</h3><table class="i-putab">${pu.filter(d => d.typ === "pomoc").map(wiersz).join("")}</table></section>
    <section><h3 class="f">${t("Ataki na innych")}</h3><table class="i-putab">${pu.filter(d => d.typ === "atak").map(wiersz).join("")}</table></section>
  </div>
  <section><h3>${t("Tura w skrócie")}</h3>
    <div class="i-kroki">${kroki.map(([ic, t, d], i) => `<div class="i-krok"><span class="ic">${ic}</span><b>${i + 1}. ${t}</b><small>${d}</small></div>`).join("")}</div></section>
  <section class="i-makieta"><h3>${t("Tak wygląda gra")}</h3>
    <div class="i-foto"><img src="makieta/stol${LANG === "pl" ? "" : "-" + LANG}.png" alt="${t("Rozgrywka na stole")}"><img src="makieta/samo${LANG === "pl" ? "" : "-" + LANG}.png" alt="${t("Pudełko z grą")}"></div></section>
  <footer class="i-foot">${PODPIS}</footer>
  </div>`;
}

// ── pudełko: dwie części (spód i wieczko), każda na jednej kartce A4 ──
function wymiaryPudelka() {
  const r = ROZMIARY[A.ust.rozmiar];
  const ile = talia().length;
  const grubosc = Math.max(0.1, +A.ust.grubosc || 0.3);
  const H = Math.ceil(ile * grubosc + 3);           // wysokość spodu = grubość talii + zapas
  const spod = { W: r.w + 2, L: r.h + 2, H };
  const wieczko = { W: spod.W + 2, L: spod.L + 2, H: Math.min(30, Math.max(18, Math.round(H / 2))) };
  return { ile, grubosc, spod, wieczko };
}

// Siatka pudełka: środek W×L, ścianki o wysokości H, zakładki do klejenia na ściankach N i S.
function siatkaPudelka(d, ozdoby) {
  const { W, L, H } = d;
  const t = Math.min(12, H * 0.45), s = Math.min(4, H * 0.18);
  const Wn = W + 2 * H, Ln = L + 2 * H;
  const x0 = (PAPIER.w - Wn) / 2, y0 = (PAPIER.h - Ln) / 2 + 6;
  const pts = [
    [H, 0], [H + W, 0], [H + W + t, s], [H + W + t, H - s], [H + W, H],
    [2 * H + W, H], [2 * H + W, H + L], [H + W, H + L],
    [H + W + t, H + L + s], [H + W + t, 2 * H + L - s], [H + W, 2 * H + L],
    [H, 2 * H + L], [H - t, 2 * H + L - s], [H - t, H + L + s], [H, H + L],
    [0, H + L], [0, H], [H, H], [H - t, H - s], [H - t, s],
  ];
  const zgiecia = [
    [H, H, H + W, H], [H, H + L, H + W, H + L], [H, H, H, H + L], [H + W, H, H + W, H + L],
    [H, 0, H, H], [H + W, 0, H + W, H], [H, H + L, H, 2 * H + L], [H + W, H + L, H + W, 2 * H + L],
  ];
  const tabs = [
    [[H + W, 0], [H + W + t, s], [H + W + t, H - s], [H + W, H]],
    [[H + W, H + L], [H + W + t, H + L + s], [H + W + t, 2 * H + L - s], [H + W, 2 * H + L]],
    [[H, 2 * H + L], [H - t, 2 * H + L - s], [H - t, H + L + s], [H, H + L]],
    [[H, H], [H - t, H - s], [H - t, s], [H, 0]],
  ];
  const panel = (cls, x, y, w, h, html, rot) => `<div class="bx-p ${cls}" style="left:${x}mm;top:${y}mm;width:${w}mm;height:${h}mm">
      <div class="bx-in" style="width:${rot % 180 ? h : w}mm;height:${rot % 180 ? w : h}mm;transform:translate(-50%,-50%) rotate(${rot}deg)">${html}</div></div>`;
  const svg = `<svg class="bx-lines" viewBox="0 0 ${Wn} ${Ln}" style="width:${Wn}mm;height:${Ln}mm">
      ${tabs.map(p => `<polygon points="${p.map(q => q.join(",")).join(" ")}" class="tab"/>`).join("")}
      <polygon points="${pts.map(q => q.join(",")).join(" ")}" class="cut"/>
      ${zgiecia.map(([a, b, c, e]) => `<line x1="${a}" y1="${b}" x2="${c}" y2="${e}" class="fold"/>`).join("")}
    </svg>`;
  const o = ozdoby;
  return `<div class="bx-net" style="left:${x0}mm;top:${y0}mm;width:${Wn}mm;height:${Ln}mm">
      ${panel("bx-c", H, H, W, L, o.srodek, 0)}
      ${panel("bx-w", H, 0, W, H, o.n, o.rot.n)}
      ${panel("bx-w", H, H + L, W, H, o.s, o.rot.s)}
      ${panel("bx-w", 0, H, H, L, o.w, o.rot.w)}
      ${panel("bx-w", H + W, H, H, L, o.e, o.rot.e)}
      ${svg}
    </div>`;
}

function arkuszPudelka(tytul, opis, d, ozdoby) {
  return `<div class="sheet a4 box ${styl()}">
    <div class="bx-head"><b>${tytul}</b> · ${opis} · ${t("wymiary wewnętrzne")} ${d.W} × ${d.L} × ${d.H} mm</div>
    ${siatkaPudelka(d, ozdoby)}
    <div class="bx-legend"><span class="lg-cut"></span> ${t("cięcie")} <span class="lg-fold"></span> ${t("zgięcie")} <span class="lg-tab"></span> ${t("zakładka do klejenia (zaginana do środka)")}</div>
  </div>`;
}

function pudelkoArkusze() {
  const { ile, spod, wieczko } = wymiaryPudelka();
  const wieczkoOzdoby = {
    srodek: gornaPokrywa(),
    n: bokPudelka("logo"), s: bokPudelka("logo"), w: bokPudelka("napis"), e: bokPudelka("napis"),
    rot: { n: 180, s: 0, w: 90, e: -90 },
  };
  // Spód: z boków widać tylko dolną część (resztę zasłania wieczko), więc napisy są przy dnie.
  const spodOzdoby = {
    srodek: `<div class="bx-bottom"><div class="bx-name">${nazwaGry()}</div>
        <p>${t(A.ust.zasady ? "W pudełku: {0} {1} (pytania, power-upy i karty zasad) oraz ulotka z zasadami." : "W pudełku: {0} {1} (pytania i power-upy) oraz ulotka z zasadami.", ile, kartOdm(ile))}</p>
        <p>${t("Gra edukacyjna o krytycznym myśleniu i odporności na dezinformację. Wersja online: fake-czy-fakt-unseen.pl")}</p>
        <div class="bx-credit">${PODPIS}</div></div>`,
    n: bokPudelka("logo", true), s: bokPudelka("logo", true), w: bokPudelka("napis", true), e: bokPudelka("napis", true),
    rot: { n: 0, s: 180, w: -90, e: 90 },
  };
  return [
    arkuszPudelka(t("Pudełko – wieczko"), t("wytnij, zegnij do środka i sklej zakładki"), wieczko, wieczkoOzdoby),
    arkuszPudelka(t("Pudełko – spód"), t("wytnij, zegnij i sklej; drukuj na papierze 250–300 g/m²"), spod, spodOzdoby),
  ];
}

// Bok pudełka: krótkie boki (z zakładkami) – logo, długie – pełny napis i podpis twórców.
// spod: napis tylko w dolnej części, która wystaje spod wieczka.
function bokPudelka(rodzaj, spod = false) {
  const { spod: d, wieczko } = wymiaryPudelka();
  const widac = d.H - wieczko.H;
  const tresc = rodzaj === "logo"
    ? `<div class="bx-logo sm">${logoUlamek()}</div>`
    : `<div class="bx-name">${nazwaGry()}</div><div class="bx-credit">${PODPIS}</div>`;
  return `<div class="bx-wall ${spod ? "low" : ""}" ${spod ? `style="height:${widac}mm"` : ""}>${tresc}</div>`;
}

// Wierzch wieczka (też na makiecie 3D).
function gornaPokrywa() {
  return `<div class="bx-top">
      <div class="bx-logo">${logoUlamek()}</div>
      <div class="bx-name">${nazwaGry()}</div>
      <div class="bx-tag">${t("Gra karciana o rozpoznawaniu dezinformacji")}</div>
      <div class="bx-meta">${t(GRA_KARCIANA.gracze)}<br>${GRA_KARCIANA.czas}</div>
      <div class="bx-credit">${PODPIS}</div>
    </div>`;
}

// ── składana ulotka: 3 × 3 pola wielkości karty na jednej kartce A4 ──
// Po złożeniu w harmonijkę (najpierw pionowe linie, potem poziome) ma rozmiar karty
// i mieści się w pudełku. Okładka jest w lewym górnym rogu, więc po złożeniu ląduje na wierzchu.
function panelyUlotki() {
  const z = panelyZasad();
  const pu = typ => `<ul class="u-pu">${POWERUPY_KARTY.map(tpu).filter(d => d.typ === typ)
    .map(d => `<li><b>${d.ikona} ${esc(d.nazwa)}</b> ${esc(d.opisKarty)}</li>`).join("")}</ul>`;
  return [
    z[1], z[2], z[3], z[4], z[5],
    { t: t("Power-upy: pomoc"), b: pu("pomoc") },
    { t: t("Power-upy: ataki"), b: pu("atak") },
    { t: t("Zagrywanie i koniec"), b: `<p>${t("Power-upy z kupki trzymasz w ręce. Zagrywasz je w swojej turze, po przeczytaniu posta, a przed odpowiedzią. Pomoc działa od razu, atak w następnej turze wybranego gracza, tarcza w każdej chwili.")}</p>
        <p>${t("<b>Koniec:</b> liczycie karty pytań, +0,5 pkt za każdy niewykorzystany power-up. Remis? Dogrywka.")}</p>` },
  ];
}

function okladkaUlotki() {
  return `<div class="card rule u-cover ${styl()}">
    <div class="bx-top">
      <div class="bx-logo">${logoUlamek()}</div>
      <div class="bx-name">${nazwaGry()}</div>
      <div class="bx-tag">${t("Zasady gry karcianej")}</div>
      <div class="bx-meta">${metaGry()}</div>
      <div class="u-open">${t("Rozłóż ulotkę")} →</div>
      <div class="bx-credit">${PODPIS}</div>
    </div>
  </div>`;
}

function ulotkaArkusz() {
  const r = ROZMIARY[A.ust.rozmiar];
  const kol = 3, wier = 3, W = kol * r.w, H = wier * r.h;
  const x0 = (PAPIER.w - W) / 2, y0 = (PAPIER.h - H) / 2 + 4;
  const pola = [okladkaUlotki(), ...panelyUlotki().map((p, i) => kartaZasad(p, i, `${i + 2}/9`))];
  const cells = pola.map((html, i) => `<div class="cell" style="left:${x0 + (i % kol) * r.w}mm;top:${y0 + Math.floor(i / kol) * r.h}mm;width:${r.w}mm;height:${r.h}mm">${html}</div>`).join("");
  const linie = [
    ...Array.from({ length: kol - 1 }, (_, i) => `<line x1="${(i + 1) * r.w}" y1="0" x2="${(i + 1) * r.w}" y2="${H}" class="fold"/>`),
    ...Array.from({ length: wier - 1 }, (_, i) => `<line x1="0" y1="${(i + 1) * r.h}" x2="${W}" y2="${(i + 1) * r.h}" class="fold"/>`),
  ].join("");
  return `<div class="sheet a4 box ulotka">
    <div class="bx-head"><b>${t("Ulotka z zasadami")}</b> · ${t("wytnij po linii ciągłej, zegnij harmonijkę najpierw po liniach pionowych, potem po poziomych – okładka zostaje na wierzchu, a całość ma rozmiar karty")}</div>
    ${cells}
    <svg class="bx-lines" viewBox="0 0 ${W} ${H}" style="left:${x0}mm;top:${y0}mm;width:${W}mm;height:${H}mm">
      <rect x="0" y="0" width="${W}" height="${H}" class="cut"/>${linie}</svg>
    <div class="bx-legend"><span class="lg-cut"></span> ${t("cięcie")} <span class="lg-fold"></span> ${t("zgięcie")}</div>
  </div>`;
}

function dodatkiArkusze() {
  return [...pudelkoArkusze(), instrukcjaStrona1(), instrukcjaStrona2(), ulotkaArkusz()].join("");
}
