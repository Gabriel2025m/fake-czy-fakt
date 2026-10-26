"use strict";

// ═════════════ Wersja karciana: zasady, instrukcja i pudełko ═════════════
// Ładowane przed admin.js; korzysta z jego funkcji (esc, logoMini, PODPIS, styl, karty…)
// dopiero w chwili wywołania. Zasady są dla samych graczy – bez prowadzącego.

const GRA_KARCIANA = {
  gracze: "2–8 graczy",
  wiek: "12+",
  czas: "15–40 min",
  dlugosc: { szybka: { label: "Szybka", rundy: 6 }, normalna: { label: "Normalna", rundy: 10 }, dluga: { label: "Długa", rundy: 14 } },
  poziomy: [
    { kropki: 1, label: "Łatwy", sekundy: 25 },
    { kropki: 2, label: "Normalny", sekundy: 18 },
    { kropki: 3, label: "Trudny", sekundy: 12 },
  ],
};

const kropkiTxt = n => "●".repeat(n);
const zloteTxt = () => Object.entries(GRA_KARCIANA.dlugosc)
  .map(([k, d]) => `${d.label.toLowerCase()}: ${ZLOTE_RUNDY[k].join(", ")}`).join(" · ");

// „1 karta”, „2 karty”, „5 kart”
function kartOdm(n) {
  const j = n % 10, d = n % 100;
  if (n === 1) return "karta";
  return j >= 2 && j <= 4 && (d < 12 || d > 14) ? "karty" : "kart";
}

// ── karty zasad (4 karty, przód + tył – mieszczą się w pudełku razem z talią) ──
function panelyZasad() {
  const P = GRA_KARCIANA;
  return [
    { t: "Zasady gry", b: `<p class="r-lead">Przeczytaj post z sieci i zdecyduj: <b class="f">FAKE</b> czy <b class="r">PRAWDA</b>? Za dobre odpowiedzi zdobywasz punkty.</p>
        <p class="r-meta">${P.gracze} · ${P.wiek} · ${P.czas}</p>
        <p>Potrzebne: stoper (np. w telefonie) i kartka do zapisywania punktów.</p>` },
    { t: "1. Długość gry", b: `<p>Wybierzcie, ile rund gracie. W rundzie każdy gracz odpowiada raz.</p>
        <ul>${Object.values(P.dlugosc).map(d => `<li><b>${d.label}</b>: ${d.rundy} rund</li>`).join("")}</ul>` },
    { t: "2. Poziom", b: `<p>Kropki na karcie to poziom. Grajcie jednym poziomem albo zmieszajcie kilka (np. ●● i ●●●).</p>
        <ul>${P.poziomy.map(l => `<li><b>${kropkiTxt(l.kropki)}</b> ${l.label}: <b>${l.sekundy} s</b></li>`).join("")}</ul>
        <p>Czas na odpowiedź zależy od kropek na karcie.</p>` },
    { t: "3. Przygotowanie", b: `<p>Potasujcie pytania i połóżcie talię <b>pytaniem do góry</b>: odpowiedź jest na spodzie karty.</p>
        <p>Power-upy potasujcie i połóżcie obok, zakryte.</p>
        <p>Zaczyna najmłodszy gracz. Zapisuje w tajemnicy numer <b>losowej rundy</b> (nie złotej).</p>` },
    { t: "4. Twoja tura", b: `<ol><li>Sąsiad z lewej włącza stoper.</li>
        <li>Przeczytaj na głos nagłówek z wierzchniej karty.</li>
        <li>Możesz użyć lupy albo zagrać power-upy.</li>
        <li>Powiedz <b class="f">FAKE</b> albo <b class="r">PRAWDA</b>, zanim minie czas.</li>
        <li>Odwróć kartę i przeczytaj wyjaśnienie na głos.</li></ol>` },
    { t: "5. Punkty i lupa", b: `<ul><li>Dobra odpowiedź: <b>2 pkt</b></li><li>Dobra po użyciu lupy: <b>1 pkt</b></li><li>Zła albo po czasie: <b>0 pkt</b></li></ul>
        <p><b>Lupa:</b> sąsiad z lewej zagląda pod kartę i czyta Ci tylko linijkę „Źródło”.</p>` },
    { t: "6. Power-upy", b: `<p><b>Złote rundy</b> (${zloteTxt()}): po rundzie gracz z największą liczbą punktów w tej rundzie dobiera 3 power-upy i zatrzymuje 1. Remis? Każdy remisujący.</p>
        <p><b>Losowa runda:</b> na jej początku każdy dobiera 1 power-up.</p>` },
    { t: "7. Zagrywanie i koniec", b: `<p>Power-up zagrywasz w swojej turze, po przeczytaniu pytania, a przed odpowiedzią. Pomoc działa od razu, atak w następnej turze wybranego gracza. Tarczę zagrywasz, gdy ktoś Cię atakuje.</p>
        <p><b>Koniec:</b> +1 pkt za każdy niewykorzystany power-up. Wygrywa najwięcej punktów; remis rozstrzyga dogrywka na kartach ●●●.</p>` },
  ];
}

function kartaZasad(panel, i) {
  return `<div class="card rule ${styl()}">
    <div class="c-top">${logoMini()}<span class="c-nr">ZASADY ${i + 1}/8</span></div>
    <div class="rule-panel">
      <div class="rule-t">${panel.t}</div>
      <div class="rule-b fit" data-max="8.6" data-min="6">${panel.b}</div>
    </div>
    <div class="c-foot"><span class="c-credit">${PODPIS}</span></div>
  </div>`;
}

// Pary [przód, tył] kart zasad do talii.
function kartyZasad() {
  const p = panelyZasad().map(kartaZasad);
  return [[p[0], p[1]], [p[2], p[3]], [p[4], p[5]], [p[6], p[7]]];
}

// ── instrukcja A4 (2 strony) ──
function naglowekA4(podtytul) {
  return `<header class="i-head">
    <div class="i-logo"><span class="i-fak">FAK</span><span class="i-frac"><i class="e">E</i><b>czy</b><i class="t">T</i></span></div>
    <div class="i-title"><b>${podtytul}</b><span>${GRA_KARCIANA.gracze} · ${GRA_KARCIANA.wiek} · ${GRA_KARCIANA.czas}</span><small>${PODPIS}</small></div>
  </header>`;
}

function instrukcjaStrona1() {
  const P = GRA_KARCIANA;
  return `<div class="sheet a4 instr">${naglowekA4("Zasady gry karcianej")}
  <div class="i-cols">
    <section><h3>Cel gry</h3>
      <p>Każda karta to post z sieci. Twoim zadaniem jest rozpoznać, czy to <b class="f">FAKE</b> (dezinformacja, mit, manipulacja), czy <b class="r">PRAWDA</b>. Za dobre odpowiedzi zdobywasz punkty. Wygrywa gracz, który na koniec ma ich najwięcej. Gra nie potrzebuje prowadzącego: grają tylko gracze.</p></section>
    <section><h3>Zawartość</h3>
      <p>147 kart pytań (z przodu post, z tyłu odpowiedź i wyjaśnienie), 24 karty power-upów, 4 karty zasad. Potrzebne: stoper (np. w telefonie) oraz kartka i długopis albo tabela wyników z drugiej strony instrukcji.</p></section>
    <section><h3>1. Długość gry</h3>
      <p>W jednej rundzie każdy gracz odpowiada na jedno pytanie.</p>
      <table class="i-tab"><tr><th>Gra</th><th>Rund</th><th>Złote rundy</th></tr>
        ${Object.entries(P.dlugosc).map(([k, d]) => `<tr><td>${d.label}</td><td>${d.rundy}</td><td>${ZLOTE_RUNDY[k].join(", ")}</td></tr>`).join("")}</table></section>
    <section><h3>2. Poziom trudności</h3>
      <p>Kropki w rogu karty pokazują poziom. Wybierzcie karty jednego poziomu albo <b>zmieszajcie</b> kilka, np. ●● z ●●● albo całą talię. Czas na odpowiedź zawsze zależy od kropek na karcie:</p>
      <table class="i-tab"><tr><th>Kropki</th><th>Poziom</th><th>Czas</th></tr>
        ${P.poziomy.map(l => `<tr><td>${kropkiTxt(l.kropki)}</td><td>${l.label}</td><td>${l.sekundy} s</td></tr>`).join("")}</table>
      <p class="i-note">Jeśli przy wielu graczach zabraknie kart z wybranego poziomu, dołóżcie karty z sąsiedniego.</p></section>
    <section><h3>3. Przygotowanie</h3>
      <ul><li>Potasujcie wybrane karty pytań i połóżcie talię <b>pytaniem (przodem) do góry</b>. Odpowiedź jest na spodzie karty, więc nikt jej nie widzi.</li>
      <li>Potasujcie karty power-upów i połóżcie je obok, napisem POWER-UP do góry.</li>
      <li>Zaczyna najmłodszy gracz. Zanim zacznie, zapisuje w tajemnicy numer <b>losowej rundy</b> (dowolna runda poza pierwszą i złotymi).</li></ul></section>
    <section><h3>4. Twoja tura</h3>
      <ol><li>Sąsiad z lewej włącza stoper z czasem z karty.</li>
      <li>Czytasz na głos nagłówek z wierzchniej karty i oglądasz zdjęcie.</li>
      <li>Przed odpowiedzią możesz użyć lupy i zagrać power-upy.</li>
      <li>Mówisz <b class="f">FAKE</b> albo <b class="r">PRAWDA</b>, zanim minie czas. Brak odpowiedzi to zła odpowiedź.</li>
      <li>Odwracasz kartę: pieczątka pokazuje odpowiedź. Czytasz wyjaśnienie na głos, żeby wszyscy się czegoś dowiedzieli.</li>
      <li>Zapisujecie punkty, karta trafia na stos odrzuconych, a kolej przechodzi na lewo.</li></ol></section>
    <section><h3>5. Punkty i lupa</h3>
      <ul><li>Dobra odpowiedź: <b>2 pkt</b>.</li><li>Dobra odpowiedź po użyciu lupy: <b>1 pkt</b>.</li><li>Zła odpowiedź albo brak odpowiedzi: <b>0 pkt</b>.</li></ul>
      <p><b>Lupa</b> to sprawdzenie źródła, jak w prawdziwym życiu: sąsiad z lewej zagląda pod kartę i czyta Ci na głos <b>tylko</b> linijkę „Źródło”. Pewność kosztuje 1 punkt.</p></section>
    <section><h3>6. Power-upy</h3>
      <p><b>Złote rundy:</b> po złotej rundzie gracz, który zdobył w niej najwięcej punktów, dobiera 3 power-upy, wybiera 1, a 2 wtasowuje z powrotem. Przy remisie wybiera każdy z remisujących (po kolei). Gdy nikt nie zdobył punktów, nikt nie dobiera.</p>
      <p><b>Losowa runda:</b> gdy zaczyna się runda zapisana na początku, każdy gracz dobiera 1 power-up w ciemno.</p>
      <p><b>Zagrywanie:</b> w swojej turze, po przeczytaniu pytania, a przed odpowiedzią. Możesz zagrać kilka różnych power-upów. <b>Pomoc</b> działa od razu na Twoje pytanie. <b>Atak</b> działa w najbliższej turze wskazanego gracza. <b>Tarczę</b> zagrywasz w dowolnej chwili, gdy ktoś Cię atakuje. Zagrane karty idą na stos odrzuconych.</p></section>
    <section><h3>7. Koniec gry</h3>
      <p>Gra kończy się po ostatniej rundzie. Każdy niewykorzystany power-up daje <b>+1 pkt</b>. Wygrywa gracz z największą liczbą punktów. Przy remisie dogrywka: remisujący odpowiadają po kolei na karty ●●●, aż ktoś się pomyli.</p></section>
  </div>
  <footer class="i-foot">Wersja online tej gry: <b>gra.g-mal.com.pl</b></footer>
  </div>`;
}

function instrukcjaStrona2() {
  const pu = Object.values(POWERUPY);
  const wiersz = d => `<tr><td class="ic">${d.ikona}</td><td><b>${esc(d.nazwa)}</b></td><td>${esc(d.opisKarty)}</td></tr>`;
  const rundy = 14, gracze = 6;
  return `<div class="sheet a4 instr">${naglowekA4("Power-upy i tabela wyników")}
  <div class="i-pu">
    <section><h3 class="r">Pomoc dla Ciebie</h3><table class="i-putab">${pu.filter(d => d.typ === "pomoc").map(wiersz).join("")}</table></section>
    <section><h3 class="f">Ataki na innych</h3><table class="i-putab">${pu.filter(d => d.typ === "atak").map(wiersz).join("")}</table></section>
  </div>
  <section class="i-score"><h3>Tabela wyników</h3>
    <table class="i-wyn"><tr><th>Runda</th>${Array.from({ length: gracze }, () => `<th class="name"></th>`).join("")}</tr>
      ${Array.from({ length: rundy }, (_, r) => `<tr><td>${r + 1}${Object.values(ZLOTE_RUNDY).some(z => z.includes(r + 1)) ? ` <small>★</small>` : ""}</td>${"<td></td>".repeat(gracze)}</tr>`).join("")}
      <tr class="sum"><td>Power-upy</td>${"<td></td>".repeat(gracze)}</tr>
      <tr class="sum"><td>Suma</td>${"<td></td>".repeat(gracze)}</tr></table>
    <p class="i-note">★ możliwe złote rundy (zależą od długości gry). Losowa runda: ……… Wpisz imiona w pierwszym wierszu.</p></section>
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
    <div class="bx-head"><b>${tytul}</b> · ${opis} · wymiary wewnętrzne ${d.W} × ${d.L} × ${d.H} mm</div>
    ${siatkaPudelka(d, ozdoby)}
    <div class="bx-legend"><span class="lg-cut"></span> cięcie <span class="lg-fold"></span> zgięcie <span class="lg-tab"></span> zakładka do klejenia (zaginana do środka)</div>
  </div>`;
}

function pudelkoArkusze() {
  const { ile, spod, wieczko } = wymiaryPudelka();
  const tytulBoczny = `<div class="bx-side"><span class="f">FAKE</span> <span class="czy">czy</span> <span class="r">FAKT?</span></div>`;
  const infoBoczne = `<div class="bx-side small">${GRA_KARCIANA.gracze} · ${GRA_KARCIANA.wiek} · ${GRA_KARCIANA.czas}</div>`;
  // Wieczko: ścianki zaginane w dół – „góra” napisów wskazuje linię zgięcia.
  const wieczkoOzdoby = {
    srodek: `<div class="bx-top">
        <div class="bx-logo"><span class="i-fak">FAK</span><span class="i-frac"><i class="e">E</i><b>czy</b><i class="t">T</i></span></div>
        <div class="bx-name"><span class="f">FAKE</span> <span class="czy">czy</span> <span class="r">FAKT?</span></div>
        <div class="bx-tag">Gra karciana o rozpoznawaniu dezinformacji</div>
        <div class="bx-meta">${GRA_KARCIANA.gracze}<br>${GRA_KARCIANA.wiek} · ${GRA_KARCIANA.czas}</div>
        <div class="bx-credit">${PODPIS}</div>
      </div>`,
    n: tytulBoczny, s: tytulBoczny, w: infoBoczne, e: infoBoczne,
    rot: { n: 180, s: 0, w: 90, e: -90 },
  };
  // Spód: ścianki zaginane w górę; widać ich dolną część spod wieczka.
  const spodBok = `<div class="bx-side small low">${ile} kart · ${PODPIS}</div>`;
  const spodOzdoby = {
    srodek: `<div class="bx-bottom"><div class="bx-name"><span class="f">FAKE</span> <span class="czy">czy</span> <span class="r">FAKT?</span></div>
        <p>W pudełku: ${ile} ${kartOdm(ile)} (pytania, power-upy i karty zasad).</p>
        <p>Gra edukacyjna o krytycznym myśleniu i odporności na dezinformację. Wersja online: gra.g-mal.com.pl</p>
        <div class="bx-credit">${PODPIS}</div></div>`,
    n: spodBok, s: spodBok, w: spodBok, e: spodBok,
    rot: { n: 0, s: 180, w: -90, e: 90 },
  };
  return [
    arkuszPudelka("Pudełko – wieczko", "wytnij, zegnij do środka i sklej zakładki", wieczko, wieczkoOzdoby),
    arkuszPudelka("Pudełko – spód", "wytnij, zegnij i sklej; drukuj na papierze 250–300 g/m²", spod, spodOzdoby),
  ];
}

function dodatkiArkusze() {
  return [...pudelkoArkusze(), instrukcjaStrona1(), instrukcjaStrona2()].join("");
}
