# Salitreeni

Kännykkään asennettava web-sovellus (PWA) salitreenien kirjaamiseen.
Toimii ilman verkkoyhteyttä, ja tiedot tallentuvat vain puhelimeen.

## Asennus puhelimeen (Android / Chrome)

1. Avaa Chromessa https://letkujalka.github.io/salitreeni/
2. Valitse Chromen valikosta ⋮ **Lisää aloitusnäytölle** / **Asenna sovellus**.
3. Sovellus aukeaa jatkossa omasta kuvakkeestaan koko näytön tilassa.

Päivitykset tulevat automaattisesti: uusi versio otetaan käyttöön, kun
sovellus avataan seuraavan kerran julkaisun jälkeen.

## Toiminta

- **Kategoriat:** maastavetotyyppiset, jalat, selkä, rinta, olkapäät ja
  pikkulihakset. Ohjelmaan valitaan yksi liike per kategoria. Pikkulihaksiin
  voi valita useita liikkeitä, jolloin niitä tehdään treeneissä vuorotellen
  ja ne ovat aina viimeisinä.
- **Ensimmäinen kerta:** valitaan liikkeet ja syötetään aloituspainot sekä
  tavoitetoistot (oletukset liikkeen mukaan, noin 10).
- **Treenin aikana:** kaikki liikkeet näkyvät kortteina, ja järjestystä voi
  muuttaa ▲▼-napeilla. Kun sarja on tehty, sen ruutua napautetaan, jolloin
  sarja kirjataan tavoitetoistoilla ja liikkeen oma ajastin käynnistyy.
  Vajaan sarjan toistot korjataan napauttamalla ruutua uudelleen. Liikkeitä
  voi lisätä, vaihtaa ja poistaa, ja painoa voi muuttaa kesken treenin.
  Näyttö pysyy päällä treenin ajan.
- **Värit:** vihreä = tavoite täyttyi, keltainen = sarja jäi vajaaksi,
  punainen = sarjaa ei tehty.
- **Painojen nousu:** jos kaikki sarjat menivät tavoitetoistoilla, paino
  nousee ensi kerralla liikkeen painonlisäyksen verran (1–5 kg, muokattavissa).
  Jos kaikki sarjat tehtiin samalla painolla kuin edellisellä kerralla mutta
  toistoja tuli yhteensä vähemmän, paino laskee saman verran. Muuten paino
  pysyy samana.
- **Kehonpainoliikkeet** (leuanveto, dipit): paino tarkoittaa lisäpainoa,
  joka nousee, kun 3×10 menee läpi. **Kuminauhaversiot** ovat omia
  liikkeitään. Kun 3×10 menee läpi, sovellus ehdottaa siirtymistä
  versioon ilman kuminauhaa.
- **Liikkeiden vaihto:** kun sama liike on ollut ohjelmassa 6 treeniä,
  etusivulla ehdotetaan saman kategorian toista liikettä. Ehdotuksen voi
  hyväksyä, valita liikkeen itse tai siirtää 3 treenillä eteenpäin.
- **Varmuuskopio:** Varmuuskopio-sivulla tiedot viedään yhdeksi tiedostoksi,
  joka kannattaa tallentaa esim. Google Driveen. Sama tiedosto palautetaan
  "Tuo varmuuskopio" -napista. Etusivu muistuttaa, jos edellisestä
  varmuuskopiosta on yli 14 päivää.

Kaikki treenit tallennetaan kokonaisuudessaan (liike, paino, jokaisen
sarjan toistot ja kellonajat), joten historiaa ja kehityskäyriä voidaan
lisätä myöhemmin.

## Tiedostot ja kehitys

| Tiedosto | Sisältö |
|---|---|
| `index.html` | Sivun runko |
| `app.js` | Koko sovelluslogiikka (tila, näkymät, progressio) |
| `style.css` | Ulkoasu |
| `sw.js` | Service worker: välimuisti verkottomaan käyttöön |
| `manifest.webmanifest`, `icons/` | Asennettavuus ja kuvakkeet |

Paikallinen testaus: `python3 -m http.server` repon juuressa ja selaimella
`http://localhost:8000`.

Julkaistessa muutoksia kasvata `APP_VERSION` (`app.js`) ja `CACHE`-nimen
numero (`sw.js`), jotta puhelin hakee uudet tiedostot.

Julkaisu: `.github/workflows/pages.yml` vie sovelluksen GitHub
Pagesiin, kun `main`-haaraan tulee muutos. Ota käyttöön kohdasta
Settings → Pages → Source: **GitHub Actions**.

| Versio | Muutokset |
|---|---|
| 1 | Ensimmäinen versio: ohjelma kategorioittain, treenin kirjaus, liikekohtaiset ajastimet, automaattinen painojen nosto ja lasku, kuminauhasta siirtyminen, liikkeiden vaihtoehdotukset, varmuuskopio. |
