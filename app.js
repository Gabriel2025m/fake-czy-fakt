"use strict";

// ═════════════ Ustawienia gry ═════════════
const DLUGOSC = {
  szybka:   { label: "Szybka",   pytania: 6 },    // spotkanie: liczba rund, online: liczba pytań
  normalna: { label: "Normalna", pytania: 10 },
  dluga:    { label: "Długa",    pytania: 14 },
};
const POZIOM = {
  latwy:    { label: "Łatwy",    sekundy: 25 },
  normalny: { label: "Normalny", sekundy: 18 },
  trudny:   { label: "Trudny",   sekundy: 12 },
};
const PUNKTY_ZA_DOBRA = 100;
const MAX_BONUS_ZA_CZAS = 50;
const KARA_ZA_ZRODLO = 0.25;          // sprawdzenie źródła zabiera 25% punktów za pytanie
const PUNKTY_ZA_POWERUP = 30;         // za każdy niewykorzystany power-up na koniec gry
// Złote rundy (tryb spotkania): na koniec złotej rundy gracz z największą liczbą punktów
// zdobytych w tej rundzie wybiera 1 z 3 power-upów.
// Dodatkowo raz na grę jest losowa runda: przed nią każdy gracz dostaje losowy power-up.
// Po ostatniej złotej rundzie zostają co najmniej 2 rundy, żeby nagrodę dało się wykorzystać.
const ZLOTE_RUNDY = { szybka: [2, 4], normalna: [3, 6, 8], dluga: [3, 6, 9, 12] };
const POKAZUJ_MIEJSCE_NA_ZDJECIE = true; // gdy pytanie nie ma zdjęcia, pokaż pustą ramkę
const FOLDER_ZDJEC = "img/";
const MAX_GRACZY_LOKALNIE = 10;
const MAX_GRACZY_ONLINE = 30;
const PREFIKS_POKOJU = "fakeczyfakt-pl-";
const ZNAKI_KODU = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

// ═════════════ Silnik gry (lokalnie lub u hosta) ═════════════
// Dwa sposoby gry:
//   turns = false (online): w każdym pytaniu odpowiadają wszyscy naraz, długość = liczba pytań.
//   turns = true (spotkanie): gracze odpowiadają po kolei, każdy na swoje pytanie.
//     Runda kończy się, gdy każdy odpowie raz; długość = liczba rund.
// Każdy odpowiadający gracz ma w pytaniu własny stan (this.ts[id]): czas, efekty power-upów
// i ewentualnie wymienione pytanie. W spotkaniu jest to tylko gracz, który ma turę.
class Gra {
  constructor(onChange, { turns = false } = {}) {
    this.onChange = onChange;
    this.turns = turns;
    this.players = [];
    this.settings = { dlugosc: "normalna", poziom: "normalny", powerupy: true };
    this.phase = "lobby";       // lobby | ready | question | reveal | roundEnd | summary
    this.questions = [];
    this.index = -1;
    this.answers = {};          // id -> {choice, at}
    this.results = {};          // id -> {choice, correct, points, notes}
    this.sourceUsed = {};       // id -> true, gdy gracz sprawdził źródło w tym pytaniu
    this.ts = {};               // id -> stan gracza w bieżącym pytaniu (czas, efekty power-upów)
    this.offers = [];           // [{pid, gain, options, picked, round, last}] – nagrody za złotą rundę (przy remisie kilka)
    this.lottery = null;        // [{pid, key}] – power-upy rozdane przed losową rundą
    this.randomRound = 0;       // numer losowej rundy (0 = brak)
    this.used = new Set();
    this.timer = null;
    this.deadline = 0;          // najpóźniejszy koniec czasu spośród graczy
    this.qStart = 0;
  }

  emit() { this.onChange && this.onChange(); }

  addPlayer(id, name) {
    if (this.players.some(p => p.id === id)) return;
    this.players.push({ id, name: this.uniqueName(name), score: 0, dobre: 0,
                        inv: [], effects: [], shield: false, roundStart: 0, puBonus: 0 });
    this.emit();
  }

  removePlayer(id) {
    const before = this.players.length;
    this.players = this.players.filter(p => p.id !== id);
    delete this.answers[id];
    delete this.ts[id];
    if (this.players.length === before) return;
    this.offers = this.offers.filter(o => o.pid !== id || o.picked);
    if (this.phase === "question" && this.allAnswered()) this.reveal();
    else this.emit();
  }

  uniqueName(name) {
    const base = (String(name || "").trim() || "Gracz").slice(0, 20);
    let n = base, i = 2;
    while (this.players.some(p => p.name.toLowerCase() === n.toLowerCase())) n = `${base} ${i++}`;
    return n;
  }

  setSettings(s) {
    this.settings = { ...this.settings, ...s };
    this.emit();
  }

  get pu() { return !!this.settings.powerupy; }
  get durationMs() { return POZIOM[this.settings.poziom].sekundy * 1000; }
  get rounds() { return DLUGOSC[this.settings.dlugosc].pytania; }
  get round() { return this.turns ? Math.floor(this.index / this.players.length) + 1 : this.index + 1; }
  get currentPlayer() { return this.turns ? this.players[this.index % this.players.length] : null; }
  player(id) { return this.players.find(p => p.id === id); }

  pickQuestions(n) {
    const poziom = this.settings.poziom;
    const order = { latwy: ["latwy", "normalny", "trudny"],
                    normalny: ["normalny", "latwy", "trudny"],
                    trudny: ["trudny", "normalny", "latwy"] }[poziom];
    let pool = PYTANIA.filter(q => q.poziom === poziom);
    if (pool.every(q => this.used.has(q))) pool.forEach(q => this.used.delete(q));
    // Najpierw nieużyte z wybranego poziomu, potem użyte, potem sąsiednie poziomy.
    const picked = [];
    const take = list => { for (const q of shuffle(list)) if (picked.length < n && !picked.includes(q)) picked.push(q); };
    take(pool.filter(q => !this.used.has(q)));
    take(pool);
    for (const lvl of order.slice(1)) take(PYTANIA.filter(q => q.poziom === lvl));
    picked.forEach(q => this.used.add(q));
    const result = shuffle(picked);
    // Gdy pytań w bazie jest mniej niż potrzeba, powtarzamy je.
    while (result.length < n) result.push(...shuffle(picked).slice(0, n - result.length));
    return result;
  }

  start() {
    clearTimeout(this.timer);
    const n = this.turns ? this.rounds * this.players.length : this.rounds;
    this.questions = this.pickQuestions(n);
    this.players.forEach(p => Object.assign(p, { score: 0, dobre: 0, inv: [], effects: [],
                                                 shield: false, roundStart: 0, puBonus: 0 }));
    this.index = -1;
    this.offers = [];
    this.lottery = null;
    // Losowa runda: jedna ze zwykłych rund od 2. wzwyż (nie złota).
    const zwykle = [];
    for (let r = 2; r <= this.rounds; r++) if (!this.goldenRounds.includes(r)) zwykle.push(r);
    this.randomRound = this.pu && zwykle.length ? shuffle(zwykle)[0] : 0;
    this.phase = "lobby";
    this.next();
  }

  next() {
    clearTimeout(this.timer);
    if ((this.phase === "roundEnd" || this.phase === "reveal") && this.offerPending) return;
    if (this.index + 1 >= this.questions.length) {
      // Ostatnia runda też może być złota: najpierw wybór power-upu, potem wyniki.
      if (this.turns && this.phase === "reveal" && this.isGolden(this.round)) {
        this.phase = "roundEnd";
        this.makeOffer();
        if (this.offers.length) { this.emit(); return; }
      }
      this.finish();
      return;
    }
    // Spotkanie: po ostatnim graczu w rundzie pokazujemy podsumowanie rundy.
    if (this.turns && this.phase === "reveal" && (this.index + 1) % this.players.length === 0) {
      this.phase = "roundEnd";
      this.makeOffer();
      this.emit();
      return;
    }
    if (this.phase === "roundEnd") this.players.forEach(p => { p.roundStart = p.score; });
    this.offers = [];
    this.lottery = null;
    this.index++;
    this.answers = {};
    this.results = {};
    this.sourceUsed = {};
    this.ts = {};
    for (const p of this.answering()) this.ts[p.id] = this.makeTs(p);
    if (this.turns) {
      this.phase = "ready";   // „Kolej gracza X” – czas startuje dopiero po kliknięciu
      this.emit();
    } else {
      this.begin();
    }
  }

  // Stan gracza na jedno pytanie; zużywa ataki, które na niego czekały.
  makeTs(p) {
    const fx = p.effects;
    p.effects = [];
    const has = k => fx.some(e => e.key === k);
    return {
      used: [], incoming: fx.map(e => e.key),
      haste: has("pospiech"), noSource: has("bezlupy"), fog: has("mgla"), swapped: has("zamiana"),
      haracz: fx.find(e => e.key === "haracz")?.from ?? null,
      extraMs: 0, freeSource: false, double: false, lifeline: false, fogUntil: 0,
      question: null, start: 0, duration: 0, deadline: 0,
    };
  }

  startClock(st, now) {
    st.start = now;
    st.duration = (st.haste ? Math.round(this.durationMs / 2) : this.durationMs) + st.extraMs;
    st.deadline = now + st.duration;
    if (st.fog) st.fogUntil = now + 5000;
  }

  // Stan gracza; gracz, który dołączył w trakcie pytania online, dostaje zwykły czas.
  getTs(id) {
    if (!this.ts[id] && !this.turns && this.phase === "question" && this.player(id)) {
      const st = this.makeTs(this.player(id));
      st.start = this.qStart; st.duration = this.durationMs; st.deadline = this.qStart + this.durationMs;
      this.ts[id] = st;
    }
    return this.ts[id];
  }

  qFor(id) {
    return this.ts[id]?.question || this.questions[this.index];
  }

  begin() {
    if (this.phase !== "ready" && this.phase !== "lobby" && this.phase !== "reveal" && this.phase !== "roundEnd") return;
    this.phase = "question";
    const now = Date.now();
    this.qStart = now;
    for (const st of Object.values(this.ts)) this.startClock(st, now);
    this.schedule();
    this.emit();
  }

  // Timer sprawdza, czy wszyscy już odpowiedzieli lub skończył im się czas.
  schedule() {
    clearTimeout(this.timer);
    const now = Date.now();
    const pending = this.answering().filter(p => !this.answers[p.id]).map(p => this.getTs(p.id)).filter(Boolean);
    this.deadline = Math.max(now, ...Object.values(this.ts).map(st => st.deadline));
    const nextAt = pending.length ? Math.min(...pending.map(st => st.deadline)) : now;
    this.timer = setTimeout(() => {
      if (this.phase !== "question") return;
      if (this.allAnswered()) this.reveal(); else this.schedule();
    }, Math.max(0, nextAt - now) + 250);
  }

  answering() {
    return this.turns ? [this.currentPlayer] : this.players;
  }

  allAnswered() {
    const list = this.answering();
    const now = Date.now();
    return list.length > 0 && list.every(p => p && (this.answers[p.id] || (this.ts[p.id] && now > this.ts[p.id].deadline + 200)));
  }

  canAnswer(id) {
    if (this.phase !== "question" || this.answers[id] || !this.answering().some(p => p.id === id)) return false;
    const st = this.getTs(id);
    return !!st && Date.now() <= st.deadline + 400;
  }

  useSource(id) {
    if (!this.canAnswer(id)) return;
    if (this.ts[id].noSource) return;
    this.sourceUsed[id] = true;
    this.emit();
  }

  answer(id, choice) {
    if (!this.canAnswer(id)) return;
    if (choice !== "fake" && choice !== "prawda") return;
    this.answers[id] = { choice, at: Math.min(Date.now(), this.ts[id].deadline) };
    if (this.allAnswered()) this.reveal();
    else this.emit();
  }

  reveal() {
    if (this.phase !== "question") return;
    clearTimeout(this.timer);
    for (const p of this.answering()) {
      const t = this.ts[p.id] || null;
      const q = this.qFor(p.id);
      const good = q.prawda ? "prawda" : "fake";
      const a = this.answers[p.id];
      const correct = !!a && a.choice === good;
      let points = 0;
      const notes = [];
      if (correct) {
        const left = t ? Math.max(0, 1 - (a.at - t.start) / t.duration) : 0;
        points = PUNKTY_ZA_DOBRA + Math.round(MAX_BONUS_ZA_CZAS * left);
        if (this.sourceUsed[p.id] && !(t && t.freeSource)) {
          points = Math.round(points * (1 - KARA_ZA_ZRODLO));
          notes.push("🔍 −25%");
        }
        if (t && t.double) { points *= 2; notes.push("💎 ×2"); }
      } else if (t && t.lifeline) {
        points = 50;
        notes.push("🛟 koło ratunkowe");
      }
      if (t && t.haracz && points > 0) {
        const thief = this.player(t.haracz);
        if (thief) {
          const cut = Math.floor(points / 2);
          points -= cut;
          thief.score += cut;
          notes.push(`💸 ${cut} pkt dla ${thief.name}`);
        }
      }
      p.score += points;
      if (correct) p.dobre++;
      this.results[p.id] = { choice: a ? a.choice : null, correct, points, notes };
    }
    this.phase = "reveal";
    // Online każde pytanie jest „rundą”: nagroda za złote pytanie i losowanie od razu po odpowiedziach.
    if (!this.turns) this.makeOffer();
    this.emit();
  }

  // ── power-upy ──
  usePowerup(pid, key, targetId) {
    const fail = msg => ({ ok: false, msg });
    const def = POWERUPY[key];
    const t = this.ts[pid];
    if (!this.pu || !def || !t) return fail("Teraz nie można użyć power-upu.");
    if (this.turns && this.currentPlayer?.id !== pid) return fail("Teraz nie można użyć power-upu.");
    if (this.phase !== "ready" && this.phase !== "question") return fail("Teraz nie można użyć power-upu.");
    if (this.answers[pid]) return fail("Już odpowiedziałeś.");
    if (this.phase === "question" && Date.now() > t.deadline) return fail("Czas minął.");
    const p = this.player(pid);
    const idx = p.inv.indexOf(key);
    if (idx < 0) return fail("Nie masz tego power-upu.");
    if (def.tylkoPytanie && this.phase !== "question") return fail("Użyj, gdy zobaczysz pytanie.");
    if (t.used.includes(key)) return fail("Ten power-up już działa w tej turze.");
    if (key === "zrodlo" && t.noSource) return fail("Ktoś zablokował Ci lupę!");
    let target = null;
    if (def.typ === "atak") {
      target = this.player(targetId);
      if (!target || target.id === pid) return fail("Wybierz innego gracza.");
    }

    p.inv.splice(idx, 1);
    t.used.push(key);
    let msg = `${def.ikona} ${def.nazwa}!`;

    if (def.typ === "atak") {
      if (target.shield) {
        target.shield = false;
        msg = `🛡️ Tarcza gracza ${target.name} zablokowała atak!`;
      } else if (key === "kradziez") {
        const amt = Math.min(50, target.score);
        target.score -= amt;
        p.score += amt;
        msg = `🧲 ${p.name} zabiera ${amt} pkt graczowi ${target.name}!`;
      } else {
        target.effects.push({ key, from: pid });
        msg = `${def.ikona} ${def.nazwa} czeka na gracza ${target.name}.`;
      }
    } else if (key === "zrodlo") {
      t.freeSource = true;
      this.sourceUsed[pid] = true;
    } else if (key === "czas") {
      if (this.phase === "question") {
        t.deadline += 10000;
        t.duration += 10000;
        this.schedule();
      } else {
        t.extraMs += 10000;
      }
    } else if (key === "podwojne") {
      t.double = true;
    } else if (key === "kolo") {
      t.lifeline = true;
    } else if (key === "wymiana") {
      const cur = this.qFor(pid);
      const taken = new Set([...this.questions, ...Object.values(this.ts).map(s => s.question).filter(Boolean)]);
      const fresh = shuffle(PYTANIA.filter(q => !taken.has(q)));
      const same = fresh.filter(q => q.poziom === this.settings.poziom);
      const repl = same[0] || fresh[0] || shuffle(PYTANIA.filter(q => q !== cur))[0];
      if (repl) t.question = repl;
      this.sourceUsed[pid] = t.freeSource;
      const now = Date.now();
      t.start = now;
      t.deadline = now + t.duration;
      if (t.fog) t.fogUntil = now + 5000;
      this.schedule();
    } else if (key === "tarcza") {
      p.shield = true;
    }
    this.emit();
    return { ok: true, msg };
  }

  // Ostatnia runda nigdy nie jest złota – power-upa nie byłoby już kiedy użyć.
  get goldenRounds() { return this.pu ? (ZLOTE_RUNDY[this.settings.dlugosc] || []).filter(r => r < this.rounds) : []; }
  isGolden(r) { return this.goldenRounds.includes(r); }

  // Na końcu rundy (online: po każdym pytaniu): nagroda za złotą rundę i losowanie przed losową rundą.
  makeOffer() {
    this.offers = [];
    this.lottery = null;
    if (!this.pu) return;
    const nextRound = this.round + 1;
    if (this.isGolden(this.round)) {
      // power-up dostaje gracz, który zdobył najwięcej punktów w tej złotej rundzie;
      // przy remisie nagrodę dostaje każdy z remisujących (każdy wybiera ze swoich 3 kart),
      // a gdy nikt nie zdobył punktów – nikt nie dostaje
      const gain = p => this.turns ? p.score - p.roundStart : (this.results[p.id]?.points || 0);
      const bestGain = Math.max(0, ...this.players.map(gain));
      if (bestGain > 0) {
        this.offers = this.players.filter(p => gain(p) === bestGain).map(p => ({
          pid: p.id, gain: bestGain, options: shuffle(Object.keys(POWERUPY)).slice(0, 3), picked: null,
          round: this.round, last: this.round >= this.rounds,
        }));
      }
    }
    if (nextRound === this.randomRound) {
      const keys = Object.keys(POWERUPY);
      this.lottery = this.players.map(p => {
        const key = keys[Math.floor(Math.random() * keys.length)];
        p.inv.push(key);
        return { pid: p.id, key };
      });
    }
  }

  get offerPending() { return this.offers.some(o => !o.picked); }

  pickPowerup(key, pid) {
    if (this.phase !== "roundEnd" && this.phase !== "reveal") return;
    const o = this.offers.find(x => !x.picked && (pid === undefined || x.pid === pid));
    if (!o || !o.options.includes(key)) return;
    this.player(o.pid)?.inv.push(key);
    o.picked = key;
    this.emit();
  }

  // Host może pominąć wybór, gdy zwycięzca nie reaguje.
  skipOffer() {
    if (!this.offerPending) return;
    this.offers = this.offers.filter(o => o.picked);
    this.emit();
  }

  finish() {
    clearTimeout(this.timer);
    this.phase = "summary";
    this.offers = [];
    this.lottery = null;
    for (const p of this.players) {
      p.puBonus = this.pu ? p.inv.length * PUNKTY_ZA_POWERUP : 0;
      p.score += p.puBonus;
    }
    this.emit();
  }

  stop() { clearTimeout(this.timer); }

  // Migawka stanu dla konkretnego gracza (online każdy ma swój czas, efekty i pytanie).
  // Bez poprawnej odpowiedzi, dopóki trwa pytanie.
  view(forId) {
    const who = this.turns ? this.currentPlayer?.id : forId;
    const t = who != null ? this.ts[who] : null;
    const q = this.questions[this.index] ? this.qFor(who) : null;
    const showAnswer = this.phase === "reveal";
    const n = this.players.length;
    const lastInRound = this.turns ? (this.index + 1) % n === 0 : true;
    const now = Date.now();
    return {
      phase: this.phase,
      turns: this.turns,
      powerupy: this.pu,
      settings: { ...this.settings },
      index: this.index,
      total: this.questions.length,
      round: this.round,
      rounds: this.rounds,
      perPlayer: this.rounds,          // ile pytań dostaje każdy gracz
      currentId: this.currentPlayer?.id ?? null,
      nextId: this.turns && !lastInRound ? this.players[(this.index + 1) % n]?.id : null,
      lastInRound,
      durationMs: (t && t.duration) || this.durationMs,
      remainingMs: Math.max(0, (t && t.deadline ? t.deadline : this.deadline) - now),
      turn: t && {
        used: t.used.slice(), incoming: t.incoming.slice(), noSource: t.noSource, swapped: t.swapped,
        haste: t.haste, freeSource: t.freeSource, double: t.double, lifeline: t.lifeline,
        haracz: !!t.haracz, extraMs: t.extraMs, fogRemainingMs: Math.max(0, t.fogUntil - now),
      },
      offers: this.offers.map(o => ({ ...o })),
      lottery: this.lottery && this.lottery.map(x => ({ ...x })),
      golden: this.isGolden(this.round),
      randomRound: this.pu && this.round === this.randomRound,
      nextRound: this.round + 1,
      goldenRounds: this.goldenRounds.slice(),
      question: q && (this.phase === "question" || showAnswer) ? {
        autor: q.autor || "", handle: q.handle || "", tekst: q.tekst, zrodlo: q.zrodlo, obrazek: q.obrazek || "",
        ...(showAnswer ? { prawda: q.prawda, wyjasnienie: q.wyjasnienie, link: q.link || "", obrazekZrodlo: q.obrazekZrodlo || "" } : {}),
      } : null,
      players: this.players.map(p => ({
        id: p.id, name: p.name, score: p.score, dobre: p.dobre,
        inv: p.inv.slice(), shield: p.shield, puBonus: p.puBonus,
        answered: !!this.answers[p.id],
        source: !!this.sourceUsed[p.id],
        result: showAnswer ? this.results[p.id] || null : null,
      })),
    };
  }
}

// ═════════════ Stan aplikacji ═════════════
const S = {
  screen: "home",          // home | localSetup | onlineMenu | connecting | room
  mode: null,              // local | host | guest
  game: null,
  view: null,
  myId: null,
  myChoice: null,          // {index, choice} – co wybrałem (online)
  puTarget: null,          // power-up ataku czekający na wybór celu
  peer: null,
  conns: new Map(),
  hostConn: null,
  roomCode: null,
  localNames: ["", ""],
  localSettings: { dlugosc: "normalna", poziom: "normalny", powerupy: true },
  myName: load("fcf-name") || "",
  joinCode: "",
};

const app = document.getElementById("app");

// ═════════════ Pomocnicze ═════════════
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function shuffle(a) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}
function load(k) { try { return localStorage.getItem(k); } catch { return null; } }
function save(k, v) { try { localStorage.setItem(k, v); } catch {} }
function genCode() {
  let c = "";
  const buf = crypto.getRandomValues(new Uint32Array(5));
  for (const x of buf) c += ZNAKI_KODU[x % ZNAKI_KODU.length];
  return c;
}
function avatarColor(s) {
  let h = 0;
  for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h} 55% 45%)`;
}
let toastTimer;
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
}
function roomLink(code) {
  return `${location.origin}${location.pathname}?pokoj=${code}`;
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast("Skopiowano!"); }
  catch {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); toast("Skopiowano!"); } catch { toast(text); }
    ta.remove();
  }
}
function linkHost(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}
const WERSJA_ZDJEC = 3;
function imgSrc(name) {
  if (!name) return "";
  // ?v=… – po podmianie zdjęć (te same nazwy plików) przeglądarka pobierze nowe zamiast starych z pamięci
  return /^(https?:)?\/\//.test(name) || name.includes("/") ? name : FOLDER_ZDJEC + name + "?v=" + WERSJA_ZDJEC;
}

// ═════════════ Tryb lokalny (spotkanie) ═════════════
function startLocal() {
  const names = S.localNames.map(n => n.trim()).filter(Boolean);
  if (names.length < 1) { toast("Wpisz przynajmniej jedno imię"); return; }
  leaveAll();
  S.mode = "local";
  S.game = new Gra(() => {
    S.view = withDeadline(S.game.view());
    if (S.view.phase !== "ready" && S.view.phase !== "question") S.puTarget = null;
    render();
  }, { turns: true });
  S.game.settings = { ...S.localSettings };
  names.forEach((n, i) => S.game.addPlayer("p" + i, n));
  S.screen = "room";
  S.game.start();
}

function withDeadline(view) {
  const now = Date.now();
  view.deadline = now + view.remainingMs;
  view.fogUntil = view.turn ? now + view.turn.fogRemainingMs : 0;
  return view;
}

// ═════════════ Tryb online (PeerJS) ═════════════
function createRoom() {
  const name = S.myName.trim();
  if (!name) { toast("Wpisz swoje imię"); return; }
  if (!window.Peer) { toast("Brak połączenia z serwerem gry. Sprawdź internet."); return; }
  save("fcf-name", name);
  leaveAll();
  S.screen = "connecting";
  render();

  const code = genCode();
  const peer = new Peer(PREFIKS_POKOJU + code);
  S.peer = peer;

  peer.on("open", () => {
    S.mode = "host";
    S.roomCode = code;
    S.myId = "host";
    S.game = new Gra(() => {
      S.view = withDeadline(S.game.view("host"));
      if (S.view.phase !== "question") S.puTarget = null;
      broadcast();
      render();
    });
    S.game.addPlayer("host", name);
    S.screen = "room";
    render();
  });

  peer.on("connection", conn => {
    conn.on("data", msg => onGuestMessage(conn, msg));
    conn.on("close", () => dropGuest(conn.peer));
    conn.on("error", () => dropGuest(conn.peer));
    conn.on("iceStateChanged", st => { if (st === "failed" || st === "closed") dropGuest(conn.peer); });
  });

  peer.on("error", err => {
    if (err.type === "unavailable-id" && S.screen === "connecting") { createRoom(); return; }
    console.warn(err);
    if (S.mode !== "host") { toast("Nie udało się utworzyć pokoju. Spróbuj ponownie."); goHome(); }
  });

  peer.on("disconnected", () => { if (S.peer === peer && !peer.destroyed) peer.reconnect(); });
}

function onGuestMessage(conn, msg) {
  if (!msg || typeof msg !== "object" || !S.game) return;
  if (msg.t === "join") {
    if (S.game.players.length >= MAX_GRACZY_ONLINE) {
      conn.send({ t: "reject", reason: "Pokój jest pełny." });
      setTimeout(() => conn.close(), 300);
      return;
    }
    S.conns.set(conn.peer, conn);
    S.game.addPlayer(conn.peer, String(msg.name || "").slice(0, 20));
    sendState(conn);
  } else if (msg.t === "answer") {
    S.game.answer(conn.peer, msg.choice);
  } else if (msg.t === "pu") {
    const r = S.game.usePowerup(conn.peer, String(msg.key || ""), msg.target);
    try { conn.send({ t: "toast", msg: r.msg }); } catch {}
  } else if (msg.t === "pick") {
    S.game.pickPowerup(String(msg.key || ""), conn.peer);
  } else if (msg.t === "source") {
    S.game.useSource(conn.peer);
  } else if (msg.t === "leave") {
    dropGuest(conn.peer);
  }
}

function dropGuest(id) {
  if (!S.conns.has(id)) return;
  const c = S.conns.get(id);
  S.conns.delete(id);
  try { c.close(); } catch {}
  if (S.game) S.game.removePlayer(id);
}

function sendState(conn) {
  if (!conn.open) return;
  try { conn.send({ t: "state", view: S.game.view(conn.peer) }); } catch {}
}

function broadcast() {
  if (S.mode !== "host") return;
  for (const c of S.conns.values()) sendState(c);
}

function joinRoom() {
  const name = S.myName.trim();
  const code = S.joinCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!name) { toast("Wpisz swoje imię"); return; }
  if (code.length !== 5) { toast("Kod pokoju ma 5 znaków"); return; }
  if (!window.Peer) { toast("Brak połączenia z serwerem gry. Sprawdź internet."); return; }
  save("fcf-name", name);
  leaveAll();
  S.screen = "connecting";
  render();

  const peer = new Peer();
  S.peer = peer;
  let joined = false;

  const fail = text => {
    if (S.peer !== peer) return;
    toast(text);
    leaveAll();
    S.screen = "onlineMenu";
    render();
  };

  const timeout = setTimeout(() => { if (!joined) fail("Nie udało się połączyć z pokojem."); }, 15000);

  peer.on("open", id => {
    const conn = peer.connect(PREFIKS_POKOJU + code, { reliable: true });
    S.hostConn = conn;
    conn.on("open", () => conn.send({ t: "join", name }));
    conn.on("data", msg => {
      if (!msg || typeof msg !== "object") return;
      if (msg.t === "state") {
        if (!joined) {
          joined = true;
          clearTimeout(timeout);
          S.mode = "guest";
          S.myId = id;
          S.roomCode = code;
          S.screen = "room";
        }
        S.view = withDeadline(msg.view);
        if (S.view.phase !== "question") S.puTarget = null;
        if (S.myChoice && S.myChoice.index !== S.view.index) S.myChoice = null;
        if (S.view.phase === "lobby" || S.view.phase === "summary") S.myChoice = null;
        render();
      } else if (msg.t === "reject") {
        fail(msg.reason || "Nie można dołączyć.");
      } else if (msg.t === "toast") {
        toast(String(msg.msg || ""));
      } else if (msg.t === "closed") {
        toast("Host zakończył grę.");
        goHome();
      }
    });
    const lost = () => { if (S.mode === "guest" && S.hostConn === conn) { toast("Utracono połączenie z hostem."); goHome(); } };
    conn.on("close", lost);
    conn.on("iceStateChanged", st => { if (st === "failed" || st === "closed") lost(); });
  });

  peer.on("error", err => {
    if (err.type === "peer-unavailable") fail("Nie ma pokoju o kodzie " + code + ".");
    else if (!joined) fail("Błąd połączenia. Spróbuj ponownie.");
    else console.warn(err);
  });
}

function guestAnswer(choice) {
  if (!S.view || S.view.phase !== "question" || S.myChoice) return;
  S.myChoice = { index: S.view.index, choice };
  try { S.hostConn.send({ t: "answer", choice }); } catch {}
  render();
}

function leaveAll() {
  if (S.game) S.game.stop();
  if (S.mode === "host") {
    for (const c of S.conns.values()) { try { c.send({ t: "closed" }); } catch {} }
  }
  if (S.mode === "guest" && S.hostConn) { try { S.hostConn.send({ t: "leave" }); } catch {} }
  const peer = S.peer;
  if (peer) setTimeout(() => { try { peer.destroy(); } catch {} }, 200);
  Object.assign(S, { mode: null, game: null, view: null, myId: null, myChoice: null, puTarget: null,
                     peer: null, conns: new Map(), hostConn: null, roomCode: null });
}

function goHome() {
  leaveAll();
  S.screen = "home";
  history.replaceState(null, "", location.pathname);
  render();
}

// Kto „ja” na tym ekranie: w spotkaniu gracz, który ma turę.
function meId(v) {
  return S.mode === "local" ? v.currentId : S.myId;
}

// Użycie power-upu: lokalnie i u hosta od razu w silniku, gość wysyła prośbę do hosta.
function usePowerup(key, target) {
  if (S.mode === "guest") {
    try { S.hostConn.send({ t: "pu", key, target }); } catch {}
    return;
  }
  const pid = S.mode === "host" ? "host" : S.game.currentPlayer.id;
  toast(S.game.usePowerup(pid, key, target).msg);
}

// ═════════════ Akcje (kliknięcia) ═════════════
const actions = {
  home: goHome,
  "go-local": () => { S.screen = "localSetup"; render(); },
  "go-online": () => { S.screen = "onlineMenu"; render(); },
  "add-player": () => {
    if (S.localNames.length >= MAX_GRACZY_LOKALNIE) return;
    S.localNames.push("");
    render();
    const inputs = app.querySelectorAll("[data-name-idx]");
    inputs[inputs.length - 1]?.focus();
  },
  "remove-player": el => { S.localNames.splice(+el.dataset.idx, 1); if (!S.localNames.length) S.localNames.push(""); render(); },
  "set": el => {
    const { key } = el.dataset;
    const val = key === "powerupy" ? el.dataset.val === "1" : el.dataset.val;
    if (S.screen === "localSetup") { S.localSettings[key] = val; render(); }
    else if (S.mode === "host" && S.game) S.game.setSettings({ [key]: val });
  },
  "start-local": startLocal,
  "create-room": createRoom,
  "join-room": joinRoom,
  "start-game": () => S.game && S.game.start(),
  "next": () => S.game && S.game.next(),
  "begin": () => S.game && S.game.phase === "ready" && S.game.begin(),
  "again": () => S.game && S.game.start(),
  "to-settings": () => {
    if (S.mode === "local") {
      S.localSettings = { ...S.game.settings };
      S.localNames = S.game.players.map(p => p.name);
      leaveAll();
      S.screen = "localSetup";
      render();
    } else if (S.mode === "host") {
      S.game.stop();
      S.game.phase = "lobby";
      S.game.emit();
    }
  },
  "answer-local": el => S.game && S.game.answer(el.dataset.pid, el.dataset.choice),
  "answer-host": el => S.game && S.game.answer("host", el.dataset.choice),
  "answer-guest": el => guestAnswer(el.dataset.choice),
  "source": () => {
    if (S.mode === "local") S.game.useSource(S.game.currentPlayer.id);
    else if (S.mode === "host") S.game.useSource("host");
    else if (S.mode === "guest") { try { S.hostConn.send({ t: "source" }); } catch {} }
  },
  "use-pu": el => {
    const key = el.dataset.key;
    if (POWERUPY[key].typ === "atak") { S.puTarget = S.puTarget === key ? null : key; render(); return; }
    usePowerup(key);
  },
  "pu-target": el => {
    const key = S.puTarget;
    S.puTarget = null;
    usePowerup(key, el.dataset.pid);
    render();
  },
  "pu-cancel": () => { S.puTarget = null; render(); },
  "pick-pu": el => {
    const key = el.dataset.key;
    if (S.mode === "local") S.game.pickPowerup(key, el.dataset.pid);
    else if (S.mode === "host") S.game.pickPowerup(key, "host");
    else if (S.mode === "guest") { try { S.hostConn.send({ t: "pick", key }); } catch {} }
  },
  "skip-offer": () => S.mode === "host" && S.game.skipOffer(),
  "copy-code": () => copy(S.roomCode),
  "copy-link": () => copy(roomLink(S.roomCode)),
  "leave": goHome,
};

app.addEventListener("click", e => {
  const el = e.target.closest("[data-a]");
  if (!el || el.disabled) return;
  actions[el.dataset.a]?.(el);
});

app.addEventListener("input", e => {
  const t = e.target;
  if (t.dataset.nameIdx != null) S.localNames[+t.dataset.nameIdx] = t.value;
  if (t.id === "my-name") S.myName = t.value;
  if (t.id === "join-code") { t.value = t.value.toUpperCase(); S.joinCode = t.value; }
});

app.addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  const t = e.target;
  if (t.dataset.nameIdx != null) { e.preventDefault(); actions["add-player"](); }
  if (t.id === "join-code") { e.preventDefault(); joinRoom(); }
});

// ═════════════ Widoki ═════════════
let lastRenderKey = "";
function render() {
  const views = { home: viewHome, localSetup: viewLocalSetup, onlineMenu: viewOnlineMenu,
                  connecting: viewConnecting, room: viewRoom };
  // Animacja wejścia tylko przy zmianie ekranu, nie przy każdej aktualizacji stanu.
  const key = `${S.screen}|${S.view?.phase}|${S.view?.index}`;
  const same = key === lastRenderKey;
  const scrollTop = same ? app.querySelector(".scroll")?.scrollTop || 0 : 0;
  app.classList.toggle("still", same);
  lastRenderKey = key;
  app.innerHTML = (views[S.screen] || viewHome)();
  const sc = app.querySelector(".scroll");
  if (sc && scrollTop) sc.scrollTop = scrollTop;
  app.dataset.screen = S.screen;
  tick();
}

// Logo „FAK” + ułamek: E nad kreską „czy”, T pod nią → FAKE czy FAKT.
const PODPIS = `by <b>UNSEEN</b> · ZSTiO Jarosław`;

function logo(small) {
  const mark = `<div class="logo ${small ? "logo-small" : ""}" ${small ? 'data-a="leave" role="button" title="Wyjdź do menu"' : ""} aria-label="Fake czy fakt?">
    <span class="logo-fak" aria-hidden="true">FAK</span><span class="logo-frac" aria-hidden="true"><span class="frac-top">E</span><span class="frac-bar">czy</span><span class="frac-bot">T</span></span>
  </div>`;
  // małe logo (na wszystkich ekranach poza główną) ma podpis twórców pod spodem
  return small ? `<div class="brandbox">${mark}<div class="credit sm">${PODPIS}</div></div>` : mark;
}

function viewHome() {
  return `
  <section class="screen home">
    ${logo()}
    <div class="credit">${PODPIS}</div>
    <p class="lead">Gra o cyberbezpieczeństwie. Czytasz post z sieci i decydujesz: <b class="t-fake">dezinformacja</b> czy <b class="t-real">prawdziwa informacja</b>? Bez logowania.</p>
    <div class="mode-grid">
      <button class="mode-card" data-a="go-local">
        <span class="mode-icon" aria-hidden="true">👥</span>
        <span class="mode-title">Spotkanie</span>
        <span class="mode-desc">Jedno urządzenie, wszyscy w jednym miejscu. Gracze odpowiadają po kolei, są power-upy.</span>
      </button>
      <button class="mode-card" data-a="go-online">
        <span class="mode-icon" aria-hidden="true">🌐</span>
        <span class="mode-title">Online</span>
        <span class="mode-desc">Każdy u siebie, np. podczas rozmowy na Messengerze czy Discordzie. Łączycie się kodem pokoju.</span>
      </button>
    </div>
    <ul class="howto">
      <li><b>Szybciej = więcej punktów.</b> Dobra odpowiedź to ${PUNKTY_ZA_DOBRA} pkt + do ${MAX_BONUS_ZA_CZAS} pkt bonusu za czas.</li>
      <li><b>Lupa kosztuje.</b> Sprawdzenie źródła zabiera ${Math.round(KARA_ZA_ZRODLO * 100)}% punktów za pytanie.</li>
    </ul>
  </section>`;
}

function seg(settings, key, opts, fmt, editable) {
  return `
    <div class="seg ${Object.keys(opts).length === 2 ? "seg-2" : ""}" role="group">
      ${Object.entries(opts).map(([val, o]) => `
        <button class="seg-btn ${String(settings[key] === true ? "1" : settings[key] === false ? "0" : settings[key]) === val ? "on" : ""}" ${editable ? `data-a="set" data-key="${key}" data-val="${val}"` : "disabled"}>
          <span class="seg-main">${o.label}</span><span class="seg-sub">${fmt(o)}</span>
        </button>`).join("")}
    </div>`;
}

function settingsBlock(settings, editable, turns) {
  return `
    <div class="field">
      <div class="field-label">Długość gry</div>
      ${seg(settings, "dlugosc", DLUGOSC, o => `${o.pytania} ${turns ? "rund" : "pytań"}`, editable)}
      ${turns ? `<p class="muted small hint">W każdej rundzie gracze odpowiadają po kolei – każdy na swoje pytanie.</p>` : ""}
    </div>
    <div class="field">
      <div class="field-label">Poziom trudności</div>
      ${seg(settings, "poziom", POZIOM, o => `${o.sekundy} s na odpowiedź`, editable)}
    </div>
    <div class="field">
      <div class="field-label">Power-upy</div>
      ${seg(settings, "powerupy", { 1: { label: "Włączone", sub: turns ? "złote i losowa runda" : "złote i losowe pytanie" }, 0: { label: "Wyłączone", sub: "sama wiedza" } }, o => o.sub, editable)}
      ${settings.powerupy ? powerupList(turns) : ""}
    </div>`;
}

function powerupList(turns) {
  const R = turns ? { a: "Złote rundy", b: "Na koniec złotej rundy gracz, który zdobył w niej", c: "Losowa runda", d: "w swojej turze" }
                  : { a: "Złote pytania", b: "Po złotym pytaniu gracz, który zdobył w nim", c: "Losowe pytanie", d: "podczas pytania, na swoim urządzeniu" };
  const card = ([k, d]) => `<li class="pu-info pu-${d.typ}"><span class="pu-icon">${d.ikona}</span><span><b>${d.nazwa}</b><br><span class="muted">${d.opis}</span></span></li>`;
  const all = Object.entries(POWERUPY);
  return `<details class="pu-details">
    <summary>Zobacz wszystkie 12 power-upów</summary>
    <p class="muted small"><b>✨ ${R.a}</b> – ${Object.entries(ZLOTE_RUNDY).map(([k, r]) => `${DLUGOSC[k].label.toLowerCase()}: ${r.join(", ")}`).join("; ")}. ${R.b} najwięcej punktów, wybiera 1 z 3 losowych power-upów.</p>
    <p class="muted small"><b>🎲 ${R.c}</b> – raz na grę, w losowym momencie, każdy gracz dostaje losowy power-up.</p>
    <p class="muted small">Power-upy zbierają się na dole ekranu i można ich użyć ${R.d}. Ataki działają na wybranego gracza w jego następnej ${turns ? "turze" : "odpowiedzi"}. Każdy niewykorzystany power-up daje +${PUNKTY_ZA_POWERUP} pkt na koniec gry.</p>
    <h3 class="pu-h">Pomoc dla Ciebie</h3>
    <ul class="pu-infos">${all.filter(([, d]) => d.typ === "pomoc").map(card).join("")}</ul>
    <h3 class="pu-h">Ataki na innych</h3>
    <ul class="pu-infos">${all.filter(([, d]) => d.typ === "atak").map(card).join("")}</ul>
  </details>`;
}

function viewLocalSetup() {
  const rows = S.localNames.map((n, i) => `
    <div class="name-row">
      <span class="name-num">${i + 1}</span>
      <input class="input" data-name-idx="${i}" value="${esc(n)}" placeholder="Imię gracza" maxlength="20" autocomplete="off">
      <button class="icon-btn" data-a="remove-player" data-idx="${i}" aria-label="Usuń gracza">✕</button>
    </div>`).join("");
  return `
  <section class="screen panel">
    ${logo(true)}
    <h1 class="h1">Spotkanie</h1>
    <div class="scroll">
    <div class="field">
      <div class="field-label">Gracze <span class="muted">(${S.localNames.length}/${MAX_GRACZY_LOKALNIE})</span></div>
      <div class="names">${rows}</div>
      ${S.localNames.length < MAX_GRACZY_LOKALNIE ? `<button class="btn btn-ghost btn-small" data-a="add-player">+ Dodaj gracza</button>` : ""}
    </div>
    ${settingsBlock(S.localSettings, true, true)}
    </div>
    <div class="actions">
      <button class="btn btn-ghost" data-a="home">← Wróć</button>
      <button class="btn btn-primary" data-a="start-local">Start ▶</button>
    </div>
  </section>`;
}

function viewOnlineMenu() {
  return `
  <section class="screen panel">
    ${logo(true)}
    <h1 class="h1">Online</h1>
    <div class="scroll">
    <div class="field">
      <label class="field-label" for="my-name">Twoje imię</label>
      <input class="input" id="my-name" value="${esc(S.myName)}" placeholder="np. Ola" maxlength="20" autocomplete="off">
    </div>
    <div class="online-grid">
      <div class="online-box">
        <h2 class="h2">Utwórz pokój</h2>
        <p class="muted">Dostaniesz kod do wysłania znajomym. Ty wybierasz ustawienia i startujesz grę.</p>
        <button class="btn btn-primary" data-a="create-room">Utwórz pokój</button>
      </div>
      <div class="online-box">
        <h2 class="h2">Dołącz do pokoju</h2>
        <input class="input input-code" id="join-code" value="${esc(S.joinCode)}" placeholder="KOD" maxlength="5" autocomplete="off" spellcheck="false" aria-label="Kod pokoju">
        <button class="btn btn-real" data-a="join-room">Dołącz</button>
      </div>
    </div>
    </div>
    <div class="actions"><button class="btn btn-ghost" data-a="home">← Wróć</button></div>
  </section>`;
}

function viewConnecting() {
  return `<section class="screen panel center">${logo(true)}<div class="spinner"></div><p class="muted">Łączenie…</p>
    <button class="btn btn-ghost" data-a="home">Anuluj</button></section>`;
}

function viewRoom() {
  const v = S.view;
  if (!v) return viewConnecting();
  if (v.phase === "lobby") return viewLobby(v);
  if (v.phase === "summary" || v.phase === "roundEnd") return viewSummary(v);
  if (v.phase === "ready") return viewReady(v);
  return viewQuestion(v);
}

function isController() { return S.mode === "local" || S.mode === "host"; }

function viewLobby(v) {
  const host = S.mode === "host";
  const players = v.players.map(p => `
    <li class="chip ${p.id === S.myId ? "me" : ""}"><span class="dot" style="background:${avatarColor(p.name)}"></span>${esc(p.name)}${p.id === "host" ? ' <span class="tag">host</span>' : ""}</li>`).join("");
  return `
  <section class="screen panel">
    ${logo(true)}
    <div class="scroll">
    <div class="room-code-box">
      <div class="field-label">Kod pokoju</div>
      <div class="room-code">${esc(S.roomCode)}</div>
      <div class="row-btns">
        <button class="btn btn-ghost btn-small" data-a="copy-code">Kopiuj kod</button>
        <button class="btn btn-ghost btn-small" data-a="copy-link">Kopiuj link</button>
      </div>
      ${host ? `<p class="muted small">Wyślij kod lub link znajomym na Messengerze / Discordzie.</p>` : ""}
    </div>
    <div class="field">
      <div class="field-label">Gracze w pokoju <span class="muted">(${v.players.length})</span></div>
      <ul class="chips">${players}</ul>
    </div>
    ${settingsBlock(v.settings, host, false)}
    </div>
    <div class="actions">
      <button class="btn btn-ghost" data-a="leave">Opuść</button>
      ${host
        ? `<button class="btn btn-primary" data-a="start-game">Rozpocznij ▶</button>`
        : `<span class="waiting">Czekamy, aż host rozpocznie grę…</span>`}
    </div>
  </section>`;
}

function playerName(v, id) {
  return v.players.find(p => p.id === id)?.name ?? "";
}

function progressLabel(v) {
  const special = v.golden ? `<span class="round-tag gold">✨ Złota</span>` : v.randomRound ? `<span class="round-tag lucky">🎲 Losowa</span>` : "";
  return v.turns
    ? `${special}Runda <b>${v.round}</b>/${v.rounds} · ${POZIOM[v.settings.poziom].label}`
    : `Pytanie <b>${v.index + 1}</b>/${v.total} · ${POZIOM[v.settings.poziom].label}`;
}

function scoreChips(v) {
  return `<ul class="chips score-chips">${v.players.map(p => `
    <li class="chip ${p.id === v.currentId ? "me" : ""}"><span class="dot" style="background:${avatarColor(p.name)}"></span>${esc(p.name)} <b>${p.score}</b>${
      v.powerupy && p.inv.length ? ` <span class="chip-pu" title="Power-upy">🎒${p.inv.length}</span>` : ""}${
      p.shield ? ` <span title="Tarcza">🛡️</span>` : ""}</li>`).join("")}</ul>`;
}

function puLabel(k) {
  const d = POWERUPY[k];
  return `${d.ikona} ${d.nazwa}`;
}

// Pasek power-upów: w spotkaniu gracza, który ma turę; online – mój, na moim urządzeniu.
function inventoryBar(v) {
  if (!v.powerupy || !v.turn) return "";
  if (!v.turns && v.phase !== "question") return "";
  const me = v.players.find(p => p.id === meId(v));
  if (!me || me.answered) return "";
  if (S.puTarget) {
    const others = v.players.filter(p => p.id !== me.id);
    return `<div class="inventory">
      <div class="inv-title">${puLabel(S.puTarget)} – na kogo?</div>
      <div class="targets">${others.map(p => `
        <button class="btn btn-ghost btn-small target-btn" data-a="pu-target" data-pid="${esc(p.id)}"><span class="dot" style="background:${avatarColor(p.name)}"></span>${esc(p.name)}${p.shield ? " 🛡️" : ""}</button>`).join("")}
        <button class="btn btn-ghost btn-small" data-a="pu-cancel">Anuluj</button>
      </div>
    </div>`;
  }
  const inQuestion = v.phase === "question";
  const cards = me.inv.map(k => {
    const d = POWERUPY[k];
    const off = v.turn.used.includes(k) || (d.tylkoPytanie && !inQuestion) || (k === "zrodlo" && (v.turn.noSource || me.source))
             || (d.typ === "atak" && v.players.length < 2);
    return `<button class="pu pu-${d.typ}" data-a="use-pu" data-key="${k}" title="${esc(d.opis)}" ${off ? "disabled" : ""}>
      <span class="pu-icon">${d.ikona}</span><span class="pu-name">${d.nazwa}</span><span class="pu-desc">${d.opis}</span></button>`;
  }).join("");
  return `<div class="inventory">
    <div class="inv-title">🎒 Power-upy: ${esc(me.name)}</div>
    ${me.inv.length ? `<div class="pu-row">${cards}</div>` : `<p class="muted small inv-empty">Brak power-upów. Zdobywa się je za wygranie ${v.turns ? "złotej rundy" : "złotego pytania"} i w ${v.turns ? "losowej rundzie" : "losowym pytaniu"}.</p>`}
  </div>`;
}

function activeTags(v) {
  const t = v.turn;
  if (!t) return "";
  const tags = [];
  if (t.double) tags.push(`<span class="tag-pill good">💎 ×2</span>`);
  if (t.lifeline) tags.push(`<span class="tag-pill good">🛟 Koło</span>`);
  if (t.freeSource) tags.push(`<span class="tag-pill good">🔍 Darmowa lupa</span>`);
  if (t.extraMs) tags.push(`<span class="tag-pill good">⏱️ +${t.extraMs / 1000} s</span>`);
  if (t.haste) tags.push(`<span class="tag-pill bad">⏳ Pośpiech</span>`);
  if (t.noSource) tags.push(`<span class="tag-pill bad">🚫 Bez lupy</span>`);
  if (t.swapped) tags.push(`<span class="tag-pill bad">🔀 Zamiana</span>`);
  if (t.fogRemainingMs > 0 || (t.incoming || []).includes("mgla")) tags.push(`<span class="tag-pill bad">🌫️ Mgła</span>`);
  if (t.haracz) tags.push(`<span class="tag-pill bad">💸 Haracz</span>`);
  return tags.length ? `<div class="tag-row">${tags.join("")}</div>` : "";
}

function viewReady(v) {
  const name = playerName(v, v.currentId);
  const incoming = v.turn?.incoming || [];
  return `
  <section class="screen game ${v.golden ? "golden" : ""}">
    <div class="game-top">${logo(true)}<div class="progress-label">${progressLabel(v)}</div></div>
    <div class="turn-card">
      ${v.golden ? `<div class="gold-banner">✨ ZŁOTA RUNDA – najlepszy w tej rundzie dostanie power-up!</div>` : ""}
      <div class="field-label">Teraz kolej</div>
      <div class="turn-name" style="color:${avatarColor(name)}">${esc(name)}</div>
      ${incoming.length ? `<div class="warn">⚠️ Ktoś użył na Tobie: ${incoming.map(puLabel).join(", ")}</div>` : ""}
      <p class="muted">Przekaż urządzenie. Czas ruszy po kliknięciu.</p>
      <button class="btn btn-primary btn-big" data-a="begin">Pokaż pytanie ▶</button>
    </div>
    ${activeTags(v)}
    ${inventoryBar(v)}
    ${scoreChips(v)}
    <div class="actions"><button class="btn btn-ghost" data-a="leave">Opuść</button></div>
  </section>`;
}

function postCard(v, q) {
  const reveal = v.phase === "reveal";
  const me = v.players.find(p => p.id === meId(v));
  const stamp = reveal ? `<div class="stamp ${q.prawda ? "stamp-real" : "stamp-fake"}">${q.prawda ? "Prawda" : "Fake"}</div>` : "";

  let source;
  if (reveal || me?.source) {
    source = `<div class="post-source"><span aria-hidden="true">🔍</span> <span>${esc(q.zrodlo)}</span></div>`;
  } else if (v.turn?.noSource) {
    source = `<button class="post-source source-btn" disabled>🚫 Lupa zablokowana przez innego gracza</button>`;
  } else {
    const free = v.turn?.freeSource;
    source = `<button class="post-source source-btn" data-a="source" ${!me || me.answered ? "disabled" : ""}>
      🔍 Sprawdź źródło <span class="cost">${free ? "(za darmo)" : `(−${Math.round(KARA_ZA_ZRODLO * 100)}% punktów)`}</span></button>`;
  }

  // Podpis zdjęcia dopiero po odpowiedzi – nazwa serwisu mogłaby zdradzić odpowiedź.
  const img = q.obrazek
    ? `<figure class="post-fig"><img class="post-img" src="${esc(imgSrc(q.obrazek))}" alt="" loading="lazy">${
        reveal && q.obrazekZrodlo ? `<figcaption class="img-credit">Zdjęcie: ${esc(q.obrazekZrodlo)}</figcaption>` : ""}</figure>`
    : POKAZUJ_MIEJSCE_NA_ZDJECIE ? `<div class="post-img post-img-empty" aria-hidden="true"><span>🖼️</span></div>` : "";

  return `
  <article class="post ${reveal ? (q.prawda ? "post-real" : "post-fake") : ""}" id="post">
    ${stamp}
    ${q.autor ? `<header class="post-head">
      <div class="avatar" style="background:${avatarColor(q.autor)}">${esc(q.autor.trim()[0])}</div>
      <div><div class="post-author">${esc(q.autor)}</div><div class="post-handle">${esc(q.handle)}</div></div>
    </header>` : ""}
    <p class="post-text">${esc(q.tekst)}</p>
    ${img}
    ${source}
  </article>`;
}

function viewQuestion(v) {
  const q = v.question;
  const reveal = v.phase === "reveal";
  const last = v.index + 1 >= v.total;
  const answeredCount = v.players.filter(p => p.answered).length;

  let answerArea = "";
  if (!reveal) {
    if (S.mode === "local") {
      const pid = esc(v.currentId);
      const btns = [
        `<button class="btn btn-fake btn-big" data-a="answer-local" data-pid="${pid}" data-choice="fake">✖ Dezinformacja</button>`,
        `<button class="btn btn-real btn-big" data-a="answer-local" data-pid="${pid}" data-choice="prawda">✔ Prawdziwa informacja</button>`,
      ];
      if (v.turn?.swapped) btns.reverse();
      answerArea = `<div class="big-answers">${btns.join("")}</div>${inventoryBar(v)}`;
    } else {
      const mine = S.mode === "host" ? S.game.answers.host?.choice : S.myChoice?.choice;
      const act = S.mode === "host" ? "answer-host" : "answer-guest";
      const btns = [
        `<button class="btn btn-fake btn-big" data-a="${act}" data-choice="fake">✖ Dezinformacja</button>`,
        `<button class="btn btn-real btn-big" data-a="${act}" data-choice="prawda">✔ Prawdziwa informacja</button>`,
      ];
      if (v.turn?.swapped) btns.reverse();
      answerArea = mine
        ? `<div class="sent">Odpowiedź wysłana: <b class="${mine === "fake" ? "t-fake" : "t-real"}">${mine === "fake" ? "Fake" : "Prawda"}</b>. Czekamy na innych (${answeredCount}/${v.players.length})…</div>`
        : `<div class="big-answers">${btns.join("")}</div>
           <div class="muted small center-text">Odpowiedziało: ${answeredCount}/${v.players.length}</div>
           ${inventoryBar(v)}`;
    }
  } else {
    const sorted = v.turns
      ? v.players.filter(p => p.id === v.currentId)
      : v.players.slice().sort((a, b) => b.score - a.score);
    const pendingPick = !v.turns && v.offers.some(o => !o.picked);
    const nextLabel = last ? "Zobacz wyniki"
      : v.turns ? (v.lastInRound ? "Podsumowanie rundy ▶" : `Dalej: ${esc(playerName(v, v.nextId))} ▶`)
      : "Następne pytanie ▶";
    answerArea = `
      <div class="reveal-area scroll">
      <div class="explain"><b>Dlaczego?</b> ${esc(q.wyjasnienie)}${q.link
        ? `<a class="src-link" href="${esc(q.link)}" target="_blank" rel="noopener noreferrer">Źródło: ${esc(linkHost(q.link))} ↗</a>` : ""}</div>
      <ul class="results">${sorted.map(p => {
        const r = p.result || { choice: null, correct: false, points: 0, notes: [] };
        const label = r.choice == null ? "brak odpowiedzi" : r.choice === "fake" ? "Fake" : "Prawda";
        const notes = r.notes || [];
        return `<li class="result ${r.correct ? "ok" : "bad"} ${p.id === S.myId ? "me" : ""}">
          <span class="res-icon">${r.correct ? "✔" : "✖"}</span>
          <span class="res-name">${esc(p.name)}${notes.length ? `<span class="res-notes">${notes.map(esc).join(" · ")}</span>` : ""}</span>
          <span class="res-choice">${label}</span>
          <span class="res-points">${r.points ? "+" + r.points : "0"}</span>
          <span class="res-total">${p.score}</span>
        </li>`;
      }).join("")}</ul>
      ${v.turns ? scoreChips(v) : lotteryBlock(v) + offerBlock(v)}
      </div>
      <div class="actions">
        <button class="btn btn-ghost" data-a="leave">Opuść</button>
        ${!v.turns && pendingPick && S.mode === "host" && v.offers.some(o => !o.picked && o.pid !== "host") ? `<button class="btn btn-ghost" data-a="skip-offer">Pomiń wybór</button>` : ""}
        ${isController()
          ? `<button class="btn btn-primary" data-a="next" ${pendingPick ? "disabled" : ""}>${pendingPick ? "Czekamy na wybór power-upu" : nextLabel}</button>`
          : `<span class="waiting">Czekamy na hosta…</span>`}
      </div>`;
  }

  return `
  <section class="screen game ${v.golden ? "golden" : ""}">
    <div class="game-top">
      ${logo(true)}
      <div class="progress-label">${progressLabel(v)}</div>
    </div>
    ${v.turns ? `<div class="turn-banner">Odpowiada: <b style="color:${avatarColor(playerName(v, v.currentId))}">${esc(playerName(v, v.currentId))}</b></div>` : ""}
    ${!reveal && !v.turns && v.golden ? `<div class="gold-banner">✨ ZŁOTE PYTANIE – najwięcej punktów = power-up!</div>` : ""}
    ${!reveal && !v.turns && v.turn?.incoming?.length ? `<div class="warn">⚠️ Ktoś użył na Tobie: ${v.turn.incoming.map(puLabel).join(", ")}</div>` : ""}
    ${!reveal ? activeTags(v) : ""}
    ${reveal ? "" : `<div class="timer"><div class="timer-bar"><div class="timer-fill" id="timer-fill"></div></div><div class="timer-num" id="timer-num"></div></div>`}
    ${postCard(v, q)}
    ${answerArea}
  </section>`;
}

function lotteryBlock(v) {
  if (!v.lottery) return "";
  return `<div class="offer lottery">
    <div class="offer-kicker">🎲 ${v.turns ? `Runda ${v.nextRound} jest LOSOWA` : `Pytanie ${v.nextRound} jest LOSOWE`}</div>
    <div class="offer-title">Każdy dostaje losowy power-up:</div>
    <ul class="lottery-list">${v.lottery.map(x => `
      <li><span class="dot" style="background:${avatarColor(playerName(v, x.pid))}"></span><b>${esc(playerName(v, x.pid))}</b> <span>${puLabel(x.key)}</span></li>`).join("")}</ul>
  </div>`;
}

// Kto prowadzi / wygrywa – przy remisie na pierwszym miejscu wszyscy liderzy.
function liderzy(sorted, roundEnd) {
  const top = sorted.filter(p => p.score === sorted[0].score);
  const imiona = top.map(p => `<b>${esc(p.name)}</b>`);
  const lista = imiona.length > 1 ? imiona.slice(0, -1).join(", ") + " i " + imiona.at(-1) : imiona[0];
  if (top.length > 1) return `<p class="lead">${roundEnd ? "Remis na prowadzeniu" : "Remis! Wygrywają"}: ${lista} (${sorted[0].score} pkt)!</p>`;
  return `<p class="lead">${roundEnd ? "Prowadzi" : "Wygrywa"} ${lista} z wynikiem ${sorted[0].score} pkt!</p>`;
}

// Nagrody za złotą rundę – jeden blok na zwycięzcę (przy remisie kilka).
function offerBlock(v) {
  if (!v.offers.length) return "";
  const remis = v.offers.length > 1
    ? `<div class="offer-tie">Remis! Nagrodę dostaje każdy z ${v.offers.length} graczy.</div>` : "";
  return remis + v.offers.map(o => offerOne(v, o)).join("");
}

function offerOne(v, o) {
  const name = esc(playerName(v, o.pid));
  const head = `<div class="offer-kicker">✨ Nagroda za złot${v.turns ? "ą rundę" : "e pytanie"} ${o.round}</div>`;
  if (o.picked) {
    return `<div class="offer">${head}<div class="offer-title">🏆 ${name} wybiera: <b>${puLabel(o.picked)}</b></div></div>`;
  }
  const why = `zdobył najwięcej w złot${v.turns ? "ej rundzie" : "ym pytaniu"} (+${o.gain} pkt)`;
  // Online wybiera tylko zwycięzca na swoim urządzeniu; reszta widzi, że trwa wybór.
  if (!v.turns && o.pid !== S.myId) {
    return `<div class="offer">${head}<div class="offer-title">🏆 <b>${name}</b> ${why} i wybiera power-up…</div></div>`;
  }
  return `<div class="offer">
    ${head}
    <div class="offer-title">🏆 <b>${!v.turns ? "Ty" : name}</b> ${!v.turns ? why.replace("zdobył", "zdobyłeś") : why}! Wybierz 1 power-up:</div>
    ${o.last ? `<div class="muted small offer-note">${v.turns ? "To była ostatnia runda" : "To było ostatnie pytanie"} – power-up da +${PUNKTY_ZA_POWERUP} pkt do wyniku końcowego.</div>` : ""}
    <div class="offer-grid">${o.options.map(k => {
      const d = POWERUPY[k];
      return `<button class="pu pu-big pu-${d.typ}" data-a="pick-pu" data-key="${k}" data-pid="${esc(o.pid)}">
        <span class="pu-icon">${d.ikona}</span><span class="pu-name">${d.nazwa}</span><span class="pu-desc">${d.opis}</span>
        <span class="pu-type">${d.typ === "atak" ? "atak" : "pomoc"}</span></button>`;
    }).join("")}</div>
  </div>`;
}

function viewSummary(v) {
  const roundEnd = v.phase === "roundEnd";
  const asked = roundEnd ? v.round : v.perPlayer;   // ile pytań dostał dotąd każdy gracz
  const sorted = v.players.slice().sort((a, b) => b.score - a.score || b.dobre - a.dobre);
  const medals = ["🥇", "🥈", "🥉"];
  const best = sorted[0];
  const allGood = sorted.reduce((s, p) => s + p.dobre, 0);
  const pct = v.players.length && asked ? Math.round(100 * allGood / (v.players.length * asked)) : 0;
  const ctrl = isController();
  const mustPick = roundEnd && v.offers.some(o => !o.picked);
  return `
  <section class="screen panel">
    ${logo(true)}
    <h1 class="h1">${roundEnd ? `Koniec rundy ${v.round} z ${v.rounds}` : v.turns ? "Koniec gry" : "Podsumowanie"}</h1>
    ${best ? liderzy(sorted, roundEnd) : ""}
    <div class="scroll">
    ${roundEnd ? lotteryBlock(v) + offerBlock(v) : ""}
    <ol class="ranking">${sorted.map((p, i) => `
      <li class="rank ${p.id === S.myId ? "me" : ""} ${i === 0 ? "first" : ""}">
        <span class="rank-pos">${medals[i] || i + 1}</span>
        <span class="rank-name">${esc(p.name)}${v.powerupy && roundEnd && p.inv.length ? ` <span class="rank-inv">${p.inv.map(k => POWERUPY[k].ikona).join("")}</span>` : ""}</span>
        <span class="rank-good">${p.dobre}/${asked} dobrze${p.puBonus ? ` · +${p.puBonus} za power-upy` : ""}</span>
        <span class="rank-score">${p.score}</span>
      </li>`).join("")}</ol>
    <div class="stat-line">Wspólnie rozpoznaliście poprawnie <b>${pct}%</b> postów.</div>
    ${roundEnd ? "" : `<div class="tip">💡 Zanim udostępnisz: sprawdź autora, poszukaj tej informacji w innych źródłach i uważaj na presję czasu i emocje.</div>`}
    </div>
    <div class="actions">
      <button class="btn btn-ghost" data-a="leave">Opuść</button>
      ${roundEnd ? `<button class="btn btn-primary" data-a="next" ${mustPick ? "disabled" : ""}>${mustPick ? "Najpierw wybierz power-up" : v.offers[0]?.last ? "Zobacz wyniki ▶" : "Kolejna runda ▶"}</button>`
        : ctrl ? `<button class="btn btn-ghost" data-a="to-settings">Zmień ustawienia</button>
                <button class="btn btn-primary" data-a="again">${v.turns ? "Zagraj od nowa ▶" : "Kolejna runda ▶"}</button>`
             : `<span class="waiting">Czekamy, aż host rozpocznie kolejną rundę…</span>`}
    </div>
  </section>`;
}

// ═════════════ Licznik czasu ═════════════
function tick() {
  const v = S.view;
  const fill = document.getElementById("timer-fill");
  const num = document.getElementById("timer-num");
  if (!v || v.phase !== "question" || !fill) return;
  const now = Date.now();
  const left = Math.max(0, v.deadline - now);
  const frac = Math.min(1, left / v.durationMs);
  fill.style.transform = `scaleX(${frac})`;
  fill.classList.toggle("low", frac < 0.3);
  num.textContent = Math.ceil(left / 1000) + " s";
  document.getElementById("post")?.classList.toggle("fog", v.fogUntil > now);
}
setInterval(tick, 100);

// ═════════════ Start ═════════════
window.addEventListener("beforeunload", () => { if (S.mode === "host" || S.mode === "guest") leaveAll(); });

(function init() {
  const code = new URLSearchParams(location.search).get("pokoj");
  if (code) { S.joinCode = code.toUpperCase().slice(0, 5); S.screen = "onlineMenu"; }
  render();
})();
