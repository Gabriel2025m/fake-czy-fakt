# Fake czy Fakt?

Gra edukacyjna o cyberbezpieczeństwie: gracz czyta post z sieci i decyduje, czy to dezinformacja, czy prawdziwa informacja. Nie wymaga logowania.

## Tryby
- **Spotkanie**: jedno urządzenie, wpisujecie imiona. Gracze odpowiadają po kolei, każdy na swoje pytanie (ekran „Teraz kolej: Ola”, czas rusza po kliknięciu). Runda kończy się, gdy każdy odpowie raz, potem jest podsumowanie rundy z przyciskami „Kolejna runda” i „Opuść”.
- **Online**: każdy u siebie. Jedna osoba tworzy pokój i dostaje 5-znakowy kod (albo link), reszta dołącza kodem. Połączenie idzie przez lekki serwer pokoi na Cloudflare (`wss://pokoje.g-mal.com.pl`, klient w `polaczenia.js`), więc działa też w sieciach szkolnych blokujących WebRTC i nie ma limitów publicznego serwera PeerJS.

## Źródło
Pod postem jest przycisk „🔍 Sprawdź źródło”. Jeśli gracz go użyje, za dobrą odpowiedź dostaje o 25% mniej punktów (`KARA_ZA_ZRODLO` w `app.js`). Po odpowiedzi źródło pokazuje się wszystkim.

## Power-upy (spotkanie i online)
Można je włączyć lub wyłączyć w ustawieniach. Pojawiają się tylko w dwóch sytuacjach:

- **✨ Złote rundy** – szybka gra: 2 i 4, normalna: 3, 6 i 8, długa: 3, 6, 9 i 12 (`ZLOTE_RUNDY` w `powerups.js`). Na koniec złotej rundy gracz, który zdobył w niej najwięcej punktów, wybiera 1 z 3 losowych power-upów. Przy remisie nagrodę dostaje każdy z remisujących (każdy wybiera ze swoich 3 kart). Po ostatniej złotej rundzie zostają zawsze co najmniej 2 rundy na jego użycie, a ostatnia runda gry nigdy nie jest złota.
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
- dołączyć 4 karty zasad (przód + tył) i w zakładce „Pudełko i instrukcja” wydrukować pudełko (wieczko i spód; rozmiar liczy się z liczby kart i ich grubości) oraz instrukcję na 2 strony A4 oraz składaną ulotkę z zasadami (3 × 3 pola wielkości karty, po złożeniu mieści się w pudełku) (`dodatki.js`).

Gotowe PDF-y z domyślnymi ustawieniami są w folderze `pdf/` i do pobrania z `admin.html` (na stronie gry nie ma do nich linku). Po zmianie kart wygeneruj je ponownie (np. Chrome headless z `admin.html?druk=karty` i `admin.html?druk=dodatki`).

## Wersja karciana (offline) – zasady w skrócie
Bez prowadzącego, grają tylko gracze (2–8, 15–30 min). Potrzebna klepsydra 15 s albo stoper.
- **Przygotowanie**: wybrane karty pytań tasuje się z power-upami w jedną kupkę na stole. Power-upów jest 1 komplet (po 1 z 8 rodzajów) na ok. 50 pytań – przy całej talii 3 komplety, czyli 24 karty (`kompletyPU` w `admin.js`, ustawienie „Automatycznie”).
- **Tura**: gracz zamyka oczy, sąsiad z lewej rozkłada kupkę w wachlarz i mu ją podaje, a gracz wyciąga jedną kartę (nie z wierzchu). Power-up zatrzymuje i losuje dalej, aż trafi na pytanie. Odwraca klepsydrę, czyta post i w 15 s mówi FAKE albo PRAWDA, potem odwraca kartę.
- **Punkty**: dobra odpowiedź = gracz zatrzymuje kartę (1 punkt); zła albo po czasie = karta na stos odrzuconych. Nie ma tabeli wyników – liczy się karty.
- **Długość**: szybka 6, normalna 10, długa 14 rund (albo do końca pytań). **Poziom**: kropki na karcie (● ●● ●●●) – gra się jednym poziomem albo mieszanką; czas zawsze 15 s.
- **Power-upy** (4 pomoce i 4 ataki – tylko te, które działają bez aplikacji, `POWERUPY_KARTY` w `powerups.js`): zagrywa się je w swojej turze przed odpowiedzią; atak działa w następnej turze wskazanego gracza, tarczę można zagrać w każdej chwili.
- **Koniec**: liczy się karty pytań + 0,5 pkt za każdy niewykorzystany power-up; remis rozstrzyga dogrywka.

## Makieta 3D
Zakładka „Makieta 3D” w `admin.html` (`makieta.js`) pokazuje samo pudełko, pudełko z kartami i rozgrywkę z kilku perspektyw (można obracać myszką). Gotowe zrzuty są w folderze `makieta/` (`admin.html?druk=3d&widok=stol` daje jedno ujęcie na cały ekran); dwa z nich są w instrukcji.

## Publikacja (GitHub Pages)
Wrzuć `index.html`, `style.css`, `app.js`, `powerups.js`, `questions.js`, `admin.html`, `admin.css`, `admin.js`, `dodatki.js`, `makieta.js` oraz foldery `img/`, `pdf/` i `makieta/` do repozytorium, a potem Settings → Pages → Deploy from branch (main, katalog główny).
