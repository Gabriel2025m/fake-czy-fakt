"use strict";

// ═════════════ Power-upy (wspólne dla gry i strony z kartami do druku) ═════════════
// typ: "pomoc" – działa na Ciebie w tej turze, "atak" – wybierasz gracza, działa w jego następnej turze.
// tylkoPytanie: można użyć dopiero, gdy pytanie jest na ekranie.
// opisKarty: opis na drukowanej karcie power-upu (wersja karciana, bez aplikacji).
//   Power-upu bez opisKarty nie ma w kartach (w kartach nie ma lupy ani punktów do mnożenia, a klepsydry nie da się skrócić o połowę); zostają 4 pomoce i 4 ataki.
const POWERUPY = {
  zrodlo:    { ikona: "🔍", nazwa: "Darmowa lupa",     typ: "pomoc", tylkoPytanie: true, opis: "Sprawdź źródło bez utraty punktów." },
  czas:      { ikona: "⏱️", nazwa: "Więcej czasu",      typ: "pomoc", opis: "+10 sekund na odpowiedź.",
               opisKarty: "Gdy przesypie się klepsydra, odwróć ją jeszcze raz: masz drugie 15 sekund." },
  podwojne:  { ikona: "💎", nazwa: "Podwójne punkty",   typ: "pomoc", opis: "Dobra odpowiedź da 2× więcej punktów." },
  kolo:      { ikona: "🛟", nazwa: "Koło ratunkowe",    typ: "pomoc", opis: "Nawet przy złej odpowiedzi dostaniesz 50 pkt.",
               opisKarty: "Jeśli odpowiesz źle albo nie zdążysz, i tak zatrzymujesz kartę pytania." },
  wymiana:   { ikona: "🔄", nazwa: "Nowe pytanie",      typ: "pomoc", tylkoPytanie: true, opis: "Wymień pytanie na inne, czas liczy się od nowa.",
               opisKarty: "Wsuń pytanie z powrotem do kupki i wylosuj nowe. Czas liczy się od nowa." },
  tarcza:    { ikona: "🛡️", nazwa: "Tarcza",            typ: "pomoc", opis: "Zablokuje następny atak wymierzony w Ciebie.",
               opisKarty: "Zagraj w dowolnej chwili, gdy ktoś Cię atakuje. Atak przepada." },
  pospiech:  { ikona: "⏳", nazwa: "Pośpiech",          typ: "atak",  opis: "Gracz ma o połowę mniej czasu w swojej turze." },
  bezlupy:   { ikona: "🚫", nazwa: "Bez lupy",          typ: "atak",  opis: "Gracz nie może sprawdzić źródła w swojej turze." },
  mgla:      { ikona: "🌫️", nazwa: "Mgła",              typ: "atak",  opis: "Post gracza jest rozmyty przez pierwsze 5 sekund.",
               opisKarty: "W następnej turze wybranego gracza zasłaniasz mu post dłonią przez pierwsze 5 sekund." },
  zamiana:   { ikona: "🔀", nazwa: "Zamienione przyciski", typ: "atak", opis: "Graczowi zamieniają się miejscami przyciski odpowiedzi.",
               opisKarty: "W następnej turze wybrany gracz odpowiada na odwrót: mówi „PRAWDA”, gdy myśli, że to fake, i odwrotnie." },
  haracz:    { ikona: "💸", nazwa: "Haracz",            typ: "atak",  opis: "Połowa punktów z następnego pytania gracza trafia do Ciebie.",
               opisKarty: "Jeśli wybrany gracz odpowie dobrze w następnej turze, to Ty zabierasz jego kartę pytania." },
  kradziez:  { ikona: "🧲", nazwa: "Kradzież",          typ: "atak",  opis: "Zabierz graczowi od razu 50 pkt.",
               opisKarty: "Zabierz wybranemu graczowi od razu 1 zdobytą kartę pytania." },
};

// Złote rundy (w aplikacji). Po ostatniej złotej rundzie
// zostają co najmniej 2 rundy, żeby nagrodę dało się wykorzystać.
const ZLOTE_RUNDY = { szybka: [2, 4], normalna: [3, 6, 8], dluga: [3, 6, 9, 12] };

// Power-upy wersji karcianej.
const POWERUPY_KARTY = Object.keys(POWERUPY).filter(k => POWERUPY[k].opisKarty);
