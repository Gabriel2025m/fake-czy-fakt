# Fake czy Fakt?

Gra edukacyjna o cyberbezpieczeństwie: gracz czyta post z sieci i decyduje, czy to dezinformacja, czy prawdziwa informacja. Nie wymaga logowania.

## Tryby
- **Spotkanie**: jedno urządzenie, wpisujecie imiona. Gracze odpowiadają po kolei, każdy na swoje pytanie (ekran „Teraz kolej: Ola”, czas rusza po kliknięciu). Runda kończy się, gdy każdy odpowie raz, potem jest podsumowanie rundy z przyciskami „Kolejna runda” i „Opuść”.
- **Online**: każdy u siebie. Jedna osoba tworzy pokój i dostaje 5-znakowy kod (albo link), reszta dołącza kodem. Połączenie idzie bezpośrednio między przeglądarkami (PeerJS / WebRTC), więc nie potrzeba własnego serwera.

## Źródło
Pod postem jest przycisk „🔍 Sprawdź źródło”. Jeśli gracz go użyje, za dobrą odpowiedź dostaje o 25% mniej punktów (`KARA_ZA_ZRODLO` w `app.js`). Po odpowiedzi źródło pokazuje się wszystkim.

## Power-upy (spotkanie i online)
Można je włączyć lub wyłączyć w ustawieniach. Pojawiają się tylko w dwóch sytuacjach:

- **✨ Złote rundy** – szybka gra: 2 i 4, normalna: 3, 6 i 8, długa: 3, 6, 9 i 12 (`ZLOTE_RUNDY` w `powerups.js`, wspólne dla gry i kart). Na koniec złotej rundy gracz, który zdobył w niej najwięcej punktów, wybiera 1 z 3 losowych power-upów. Przy remisie nagrodę dostaje każdy z remisujących (każdy wybiera ze swoich 3 kart). Po ostatniej złotej rundzie zostają zawsze co najmniej 2 rundy na jego użycie, a ostatnia runda gry nigdy nie jest złota.
- **🎲 Losowa runda** – raz na grę, w losowo wybranej zwykłej rundzie: przed nią każdy gracz dostaje losowy power-up.

Power-upy zbierają się na dole ekranu i można ich użyć w swojej turze. Każdy niewykorzystany daje +30 pkt na koniec gry.

**Online** każde pytanie liczy się jak runda: złote są pytania o tych samych numerach, a losowe jest jedno pytanie na grę. Po złotym pytaniu power-up wybiera na swoim urządzeniu gracz, który zdobył w nim najwięcej punktów; host może pominąć wybór, jeśli ktoś nie reaguje. Każdy używa power-upów na swoim urządzeniu w trakcie pytania: pomoc działa od razu na jego pytanie, a atak na wybranego gracza w jego następnym pytaniu.

Pomoc: 🔍 Darmowa lupa, ⏱️ Więcej czasu (+10 s), 💎 Podwójne punkty, 🛟 Koło ratunkowe (50 pkt nawet przy złej odpowiedzi), 🔄 Nowe pytanie, 🛡️ Tarcza (blokuje następny atak).
Ataki (działają w następnej turze wybranego gracza): ⏳ Pośpiech (połowa czasu), 🚫 Bez lupy, 🌫️ Mgła (post rozmyty przez 5 s), 🔀 Zamienione przyciski, 💸 Haracz (połowa jego punktów dla Ciebie), 🧲 Kradzież (od razu −50 pkt).

## Ustawienia
| Długość  | Rund (spotkanie) / pytań (online) | | Poziom   | Czas na odpowiedź |
|----------|-------|-|----------|-------------------|
| Szybka   | 6     | | Łatwy    | 25 s |
| Normalna | 10    | | Normalny | 18 s |
| Długa    | 14    | | Trudny   | 12 s |

Wartości zmienia się na górze `app.js` (`DLUGOSC`, `POZIOM`).

## Pytania
Są w `questions.js`: 147 pytań z plików `prawdziwe_klos.xlsx` (88 prawdziwych) i `likfake.xlsx` (59 fake; usunięto F8 i F32 – fake'i o prawdziwych osobach – F41, którego oznaczenie było wątpliwe, oraz F19 i F36 o bankach). Każde ma poziom (łatwy / normalny / trudny, mniej więcej po 50) oraz numer z Excela (`nr`: P101, F12 itd.), więc łatwo znaleźć i przenieść wiersz na inny poziom.

- treść posta = „Nagłówek”, wyjaśnienie po odpowiedzi = „Opis”,
- lupa (−25%) pokazuje domenę źródła z kolumny „Źródło / weryfikacja”, a pełny link jest widoczny po odpowiedzi,
- zdjęcie: dopisz `obrazek: "plik.jpg"` i wrzuć plik do folderu `img/`.

## Karty do druku (admin.html)
Wersja karciana jest pod adresem `/admin.html` (z gry nie ma do niej linku). Można tam:
- wybrać karty do druku (filtry, wyszukiwanie, zaznaczanie), dodać własne i edytować przód (treść, autor, zdjęcie, poziom, odpowiedź) oraz tył (wyjaśnienie, źródło) z podglądem na żywo,
- dołączyć karty power-upów (wybrana liczba kopii, wspólny tył),
- wydrukować na A4: strony idą na przemian PRZÓD / TYŁ, a tył jest ułożony lustrzanie, żeby przy druku dwustronnym trafił dokładnie za przód (obracanie przez długą lub krótką krawędź). Drukować w skali 100%.
- skalibrować drukarkę stroną testową (krzyżyki) i przesunięciem tyłu w milimetrach,
- wyeksportować poprawki (JSON) albo gotowy `questions.js` do gry,
- dołączyć 4 karty zasad (przód + tył) i w zakładce „Pudełko i instrukcja” wydrukować pudełko (wieczko i spód; rozmiar liczy się z liczby kart i ich grubości) oraz instrukcję na 2 strony A4 z tabelą wyników (`dodatki.js`).

Gotowe PDF-y z domyślnymi ustawieniami są w folderze `pdf/` i mają link na stronie głównej gry. Po zmianie kart wygeneruj je ponownie (np. Chrome headless z `admin.html?druk=karty` i `admin.html?druk=dodatki`).

## Wersja karciana – zasady w skrócie
Bez prowadzącego, grają tylko gracze (2–8, 12+, 15–40 min).
- **Długość**: szybka 6, normalna 10, długa 14 rund; w rundzie każdy odpowiada na jedną kartę.
- **Poziom**: kropki na karcie (● 25 s, ●● 18 s, ●●● 12 s). Można grać jednym poziomem albo zmieszać kilka; czas zawsze wynika z kropek na danej karcie.
- **Tura**: sąsiad z lewej mierzy czas, gracz czyta post, może użyć lupy (sąsiad czyta mu tylko linijkę „Źródło” z tyłu karty) i zagrać power-upy, potem mówi FAKE albo PRAWDA, odwraca kartę i czyta wyjaśnienie.
- **Punkty**: dobra odpowiedź 2 pkt, z lupą 1 pkt, zła lub po czasie 0.
- **Power-upy**: po złotej rundzie gracz z największą liczbą punktów w tej rundzie dobiera 3 i zatrzymuje 1 (remis: każdy). Losową rundę najmłodszy gracz zapisuje w tajemnicy na początku; przed nią każdy dobiera 1. Zagrywa się je w swojej turze przed odpowiedzią; atak działa w następnej turze wskazanego gracza, tarczę można zagrać w każdej chwili.
- **Koniec**: każdy niewykorzystany power-up daje +1 pkt; remis rozstrzyga dogrywka na kartach ●●●.

Poprawki zapisują się w przeglądarce, w której je zrobiono. Strona nie ma hasła (to statyczna strona, więc hasło i tak nie dałoby prawdziwej ochrony), ale nie jest indeksowana przez wyszukiwarki.

## Publikacja (GitHub Pages)
Wrzuć `index.html`, `style.css`, `app.js`, `powerups.js`, `questions.js`, `admin.html`, `admin.css`, `admin.js`, `dodatki.js` oraz foldery `img/` i `pdf/` do repozytorium, a potem Settings → Pages → Deploy from branch (main, katalog główny).
