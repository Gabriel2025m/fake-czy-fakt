"use strict";

// ═════════════ Power-upy (wspólne dla gry i strony z kartami do druku) ═════════════
// typ: "pomoc" – działa na Ciebie w tej turze, "atak" – wybierasz gracza, działa w jego następnej turze.
// tylkoPytanie: można użyć dopiero, gdy pytanie jest na ekranie.
const POWERUPY = {
  zrodlo:    { ikona: "🔍", nazwa: "Darmowa lupa",     typ: "pomoc", tylkoPytanie: true, opis: "Sprawdź źródło bez utraty punktów." },
  czas:      { ikona: "⏱️", nazwa: "Więcej czasu",      typ: "pomoc", opis: "+10 sekund na odpowiedź." },
  podwojne:  { ikona: "💎", nazwa: "Podwójne punkty",   typ: "pomoc", opis: "Dobra odpowiedź da 2× więcej punktów." },
  kolo:      { ikona: "🛟", nazwa: "Koło ratunkowe",    typ: "pomoc", opis: "Nawet przy złej odpowiedzi dostaniesz 50 pkt." },
  wymiana:   { ikona: "🔄", nazwa: "Nowe pytanie",      typ: "pomoc", tylkoPytanie: true, opis: "Wymień pytanie na inne, czas liczy się od nowa." },
  tarcza:    { ikona: "🛡️", nazwa: "Tarcza",            typ: "pomoc", opis: "Zablokuje następny atak wymierzony w Ciebie." },
  pospiech:  { ikona: "⏳", nazwa: "Pośpiech",          typ: "atak",  opis: "Gracz ma o połowę mniej czasu w swojej turze." },
  bezlupy:   { ikona: "🚫", nazwa: "Bez lupy",          typ: "atak",  opis: "Gracz nie może sprawdzić źródła w swojej turze." },
  mgla:      { ikona: "🌫️", nazwa: "Mgła",              typ: "atak",  opis: "Post gracza jest rozmyty przez pierwsze 5 sekund." },
  zamiana:   { ikona: "🔀", nazwa: "Zamienione przyciski", typ: "atak", opis: "Graczowi zamieniają się miejscami przyciski odpowiedzi." },
  haracz:    { ikona: "💸", nazwa: "Haracz",            typ: "atak",  opis: "Połowa punktów z następnego pytania gracza trafia do Ciebie." },
  kradziez:  { ikona: "🧲", nazwa: "Kradzież",          typ: "atak",  opis: "Zabierz graczowi od razu 50 pkt." },
};
