# Přidat předmět

Aplikace (`core/`) je pro všechny předměty stejná. Předmět jsou jen **data**: jedna složka `data/<id>/` s několika JavaScriptovými soubory a obrázky. Žádný build, žádné závislosti.

Nejrychlejší cesta je na stránce **<https://machmar.github.io/sbirka/pridat.html>**: fork jedním klikem a připravené zadání pro Clauda, který data vytvoří z tvých podkladů. Tento soubor je přesný popis formátu, ze kterého Claude (nebo ty) vychází.

Funkční ukázka: složka [`data/sablona/`](data/sablona/), běží na <https://machmar.github.io/sbirka/sablona/>.

## Postup

1. **Fork** repozitáře `machmar/sbirka` a naklonování.
2. **Složka předmětu**: zkopíruj `data/sablona/` do `data/<id>/`. `id` je zkratka předmětu malými písmeny, číslicemi a pomlčkou (např. `ele`, `mat1`). Přepiš `subject.js` a data.
3. **Stránka předmětu**: zkopíruj `sablona/index.html` do `<id>/index.html` a změň v něm `data-subject="sablona"` na `data-subject="<id>"` (a `<title>`).
4. **Seznam**: přidej řádek do `data/subjects.js`: `{ id: "<id>", name: "Zkratka", desc: "Celý název · počet příkladů" }`.
5. **Vyzkoušej**: v kořeni repozitáře `python -m http.server 8000` a otevři `http://localhost:8000/<id>/`. Konzole prohlížeče (F12) má být bez chyb.
6. **Pull request** do `machmar/sbirka`. Po sloučení je předmět na `https://machmar.github.io/sbirka/<id>/`.

Neměň `core/` ani data jiných předmětů. Když aplikaci něco chybí, napiš to do pull requestu nebo do issue.

## Soubory předmětu

Názvy datových souborů jsou libovolné, `subject.js` je vyjmenuje. Každý soubor nastaví jednu nebo víc globálních proměnných. Povinné je jen `SUBJECT` a `MPC`.

| Proměnná | K čemu | Povinné |
|---|---|---|
| `SUBJECT` | název, kapitoly, seznam souborů (`subject.js`) | ano |
| `MPC` | příklady k procvičování: zadání, kroky, výsledky, řešení | ano |
| `NAI_EX` | vysvětlení pro režim **Pochopit** se zvýrazněním v obrázku | ne |
| `LINK` | vazba kroků Procvičit → kroky Pochopit | ne (jen s `NAI_EX`) |
| `VZORCE` | panel „Vzorce a konstanty“ | ne |
| `PATTERNS`, `TAHAK` | stránky **Vzory** a **Co na tahák** | ne (bez nich se záložky skryjí) |
| `TAHAK_K` | karta s konstantami nahoře na stránce **Co na tahák** | ne (bez ní se karta nezobrazí) |
| `BLOKY` | stránka **Bloky** (vlastní kreslená schémata, složitější, viz `data/nai/bloky.js`) | ne |

Texty: kde je v šabloně `R\`...\``, píše se HTML a TeX (`$...$` v řádku, `\[...\]` samostatně). V obyčejných řetězcích (`task`, `q`, `hint`, `why`, `given`) se `V_out` nebo `R_{ref}` vysází jako dolní index, TeX tam nepiš.

### `subject.js`

```js
window.SUBJECT = {
  title: "ELE · sbírka příkladů",       // titulek záložky
  brand: "ELE · sbírka",                // nápis vlevo nahoře; první slovo jde do hlášení chyb
  sub: "Elektronika 1 · 40 příkladů",   // řádek pod ním
  chapters: [["1", "Kapitola 1 · diody"], ["2", "Kapitola 2 · tranzistory"]],
  files: ["vysvetleni.js", "priklady.js", "vazby.js", "vzorce.js"]
};
```

`chapters`: pořadí kapitol v seznamu. Klíč kapitoly se bere z čísla příkladu `num`: část před tečkou (`"2.14"` → `"2"`), u čísla bez tečky písmena na začátku (`"K3"` → `"K"`). Každý klíč, který se v `num` objeví, musí být v `chapters`.

### `MPC`: příklady (povinné)

```js
window.MPC = [{
  id: "p1-1",            // adresa (#p1-1), unikátní: písmena, číslice, pomlčka
  num: "1.1",            // číslo v seznamu, určuje kapitolu a pořadí
  kind: "Dělič napětí",  // štítek typu
  page: 3,               // strana ve sbírce (nepovinné)
  src: "Skripta",        // nepovinné: místo „sbírka, str. 3“ se ukáže „podklady Skripta, str. 3“
  img: "img/1.1.png", w: 1100, h: 940,   // obrázek a jeho skutečné rozměry v px (nepovinné; bez něj jen kroky)
  plot: "img/1.1-graf.png", pw: 1000, ph: 700,  // nepovinné: graf s výsledky, ukáže se na tlačítko
  title: "Odporový dělič",
  task: "Urči proud I a napětí V_out.",
  given: ["V_in = 10 V", "R_1 = 6 kΩ"],
  steps: [
    { q: "Proud I",          // otázka kroku
      sym: "I|I_d",          // značka výsledku; ve Zkoušce se podle ní páruje odpověď ("|" = další možné zápisy)
      unit: "mA",            // jednotka, ve které je ans; student může psát i předpony (0,001 A, 1m)
      ans: 1,                // správný výsledek (číslo v unit)
      tolAbs: 0.2,           // nepovinné: absolutní tolerance (jinak 2 %), hodí se pro dB
      alt: [1.05],           // nepovinné: další přijatelné výsledky
      hint: "I = V_in / (R_1 + R_2).",
      tex: R`I = \frac{V_{in}}{R_1+R_2} = 1\ \mathrm{mA}`,   // celé řešení v TeXu
      why: "Proč to tak je (může být prázdné)." },
    { q: "Odvoď přenos A(p)", hint: "…", tex: R`A = …`, why: "" }  // bez ans = odvození bez kontroly
  ],
  tk: [[R`I=\frac{U}{R}`, "d", "poznámka"]]  // nepovinné, viz „Vzorce v tomto příkladu“
}];
```

- Kroky jdou postupně, další se odemkne po vyřešení předchozího. Ať je každý krok jeden výpočet s jedním číslem.
- `ans` musí sedět s `tex`. Výsledky přepočítej.
- **Zkouška** je automatická: student napíše výsledky po řádcích (`I = 1 mA`), aplikace je spáruje podle `sym` a zkontroluje.

### `NAI_EX`: vysvětlení pro Pochopit (nepovinné)

Spojí se s příkladem přes `id` = `num` příkladu. Bez něj má příklad jen Procvičit a Zkoušku.

```js
window.NAI_EX = [{
  id: "1.1",
  task: R`HTML/TeX zadání`,      // nepovinné: nahradí task z MPC
  idea: R`Myšlenka v jedné větě.`,
  pat: ["ptat"],                 // nepovinné: klíče z PATTERNS (štítky vzorů)
  parts: {                       // části obrázku; souřadnice v % šířky a výšky obrázku
    R1: { b: [42, 18, 16, 25], c: "r", t: "R1 6k" },     // obdélník [x, y, šířka, výška]
    I:  { a: [[30, 20], [30, 85]], c: "o", t: "I" },     // šipka po bodech
    OUT: { n: [80, 50], c: "g", t: "Vout" }              // uzel
  },                             // barvy: r o b g p k t y s
  steps: [{
    t: "Název kroku",
    h: ["R1", "I"],              // části ke zvýraznění
    x: R`<p>Text kroku.</p>`,
    g: [R`obecný vzorec`],       // nepovinné, šedě
    eq: [R`dosazení`],           // nepovinné
    r: R`$I = 1$ mA`,            // nepovinné: výsledek kroku
    m: R`zapamatuj si`,          // nepovinné
    w: R`pozor na…`              // nepovinné
  }],
  res: R`souhrn výsledků`,
  tk: [[R`TeX`, "T"]]            // Vzorce v tomto příkladu
}];
```

Souřadnice odhadni z obrázku (otevři ho a odečti polohu v procentech). Popisky se kolem zvýraznění rozmístí samy.

### `LINK`: vazby (nepovinné)

```js
window.LINK = { "1.1": [0, 0, 1] };  // pro každý krok MPC index kroku NAI_EX (od 0); délka = počet kroků MPC
```

### „Vzorce v tomto příkladu“ (`tk`)

Seznam `[TeX, štítek, poznámka]`. Štítek: `"T"` = na taháku, `"+"` = doplnit na tahák, `"d"` = odvodit. U příkladu s vysvětlením je `tk` v `NAI_EX` (ukáže se v Pochopit), jinak v `MPC` (ukáže se v Procvičit).

### `VZORCE`: panel Vzorce a konstanty (nepovinné)

```js
window.VZORCE = [{ g: "Skupina", f: [["popis", R`TeX`], ["…", R`…`]] }];
```

### `PATTERNS` a `TAHAK` (nepovinné)

```js
window.PATTERNS = { klic: { name: "Název vzoru", d: R`popis (HTML/TeX)`, f: [R`vzorec`] } };
window.TAHAK = [{ p: "★★★", n: "Krátký název", f: [R`vzorec`], d: "proč je důležitý", ex: ["1.1", "2.3"] }];  // ex = čísla příkladů
window.TAHAK_K = { t: "Konstanty", c: [["k", "1,38·10⁻²³ J/K"], ["V<sub>T</sub>", "26 mV"]] };  // [popisek HTML, hodnota]
```

`TAHAK`: řádky jdou v pořadí, v jakém jsou zapsané, a v levém seznamu se seskupí podle priority `p`, proto je řaď od nejdůležitějších. `n` (nepovinné) je krátký název řádku do levého seznamu a jako nadpis sloupce „K čemu“; bez něj se v seznamu ukáže celé `d`. V `d` lze psát HTML a TeX (`$...$`).

## Obrázky

PNG, JPG nebo SVG v `data/<id>/img/`, ideálně kolem 1000 px na šířku, světlé pozadí. `w` a `h` jsou skutečné rozměry v px (poměr stran se z nich počítá).

## Postup a místnosti

Každý předmět má vlastní uložený postup (`sbirka-<id>-v1`) i vlastní místnosti, takže se předměty neovlivňují.
