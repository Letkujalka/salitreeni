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

- **Kategoriat:** maastavetotyyppiset, jalat, selkä, rinta, olkapäät, vatsat
  ja pikkulihakset. Ohjelmaan valitaan liike per kategoria (pikkulihaksiin
  useita).
- **Seuraava treeni = toteutunut treeni:** treenin jälkeen seuraava treeni
  rakentuu edellisen treenin liikkeistä ja järjestyksestä. Treenin aikana
  vaihdettu tai lisätty liike tulee seuraavaan mukaan, väliin jätetty liike
  pysyy mukana, ja treenistä poistettu liike putoaa pois. Ohjelma-sivun
  muutokset ja liikkeiden vaihtoehdotukset päivittyvät seuraavaan treeniin.
- **Ensimmäinen kerta:** valitaan liikkeet ja syötetään aloituspainot.
- **Toistoalueet:** isot liikkeet 8–10 toistoa, pikkulihakset (sekä
  vipunostot) sekä vatsat 10–16. Alueen voi muuttaa liikekohtaisesti.
- **Sarjan minimi:** alussa ja aina painon nousun jälkeen jokaisen sarjan
  minimi on alueen alaraja (esim. 8 / 8 / 8). Muuten edellisen kerran
  tulos on uusi minimi: jos edellisellä kerralla tuli 9 / 9 / 8, rajat ovat
  9–10 / 9–10 / 8–10. Tyhjässä sarjaruudussa näkyy sarjan minimi.
- **Treenin aikana:** kaikki liikkeet näkyvät kortteina, ja liikkeen
  ⋯-valikosta voi siirtää liikettä ylemmäs tai alemmas, vaihtaa sen,
  lisätä tai poistaa sarjoja.
  - Ensimmäinen napautus kirjaa sarjan minimin ja käynnistää liikkeen
    ajastimen. Jokainen seuraava napautus lisää yhden toiston, ja maksimin
    jälkeen luku palaa alueen alarajaan.
  - Pitkä painallus avaa valitsimen: mikä tahansa toistomäärä (myös alueen
    ulkopuolelta), sarjan paino tai sarjan tyhjennys.
  - Jokaiseen sarjaan tallentuu paino, jolla se tehtiin, joten painoa voi
    vaihtaa kesken liikkeen. Näyttö pysyy päällä treenin ajan.
- **Palaute:** kun liikkeen kaikki sarjat on tehty, ajastin pysähtyy ja
  kortissa kerrotaan tulos: "Tavoite täynnä! Ensi kerralla 65 kg 💪"
  (ja juhlavärinä), "+2 toistoa edelliseen", "Pidit tason" tai
  "Ensi kerralla kevyemmällä". Yhteenvedossa näkyy kooste (missä paino
  nousee, missä toistoja tuli enemmän) ja uudet ennätykset. Ennätys on
  suurin paino, jolla kaikki sarjat on tehty vähintään alueen minimiin.
- **Värit:** vihreä = sarjan minimi saavutettu (★ = alueen maksimi),
  keltainen = jäi alle minimin, punainen = sarjaa ei tehty.
- **Painojen nousu ja lasku** (viimeisen sarjan painosta):
  - kaikki sarjat alueen maksimiin → paino nousee liikkeen painonlisäyksen
    verran (1–5 kg, muokattavissa)
  - jokin sarja jäi alle alueen alarajan → paino laskee saman verran
  - muuten paino pysyy, ja tulokset ovat ensi kerran minimit.
- **Kehonpainoliikkeet** (leuanveto, dipit): paino tarkoittaa lisäpainoa,
  joka nousee, kun 3×10 (alueen maksimi) menee läpi. **Kuminauhaversiot** ovat omia
  liikkeitään. Kun 3×10 menee läpi, sovellus ehdottaa siirtymistä
  versioon ilman kuminauhaa.
- **Liikkeiden vaihto:** kun sama liike on ollut ohjelmassa 6 treeniä,
  etusivulla ehdotetaan saman kategorian toista liikettä. Ehdotuksen voi
  hyväksyä, valita liikkeen itse tai siirtää 3 treenillä eteenpäin.
- **Treenin poisto:** etusivun treenihistoriassa avaa treeni ja paina
  "Poista treeni". Jos poistat viimeisimmän treenin, liikkeiden painot
  palautetaan treeniä edeltäneisiin. Vanhemman treenin poisto ei muuta
  painoja. Yli 8 treenin historian saa näkyviin "Näytä kaikki" -linkistä.
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
| 9 | Seuraava treeni rakentuu toteutuneesta treenistä (liikkeet ja järjestys, myös pikkulihakset). Palaute liikkeen valmistuttua, yhteenvedon kooste ja ennätykset. Uusi kategoria Vatsat. |
| 8 | Liikkeen ajastin pysähtyy, kun kaikki sarjat on tehty (tilalla ✓ Valmis). |
| 7 | Pystypunnerrus käsipainoilla jaettu istuen- ja seisten-versioiksi (entinen liike ja sen historia jäävät istuen-versiolle). |
| 6 | Oletusliikkeiden päivitys: poistettu hip thrust, face pull ja etukyykky; lisätty maastaveto suorin jaloin, vinopenkki käsipainoilla, vipunostot vinossa, yhden jalan pohjenousu, hauiskääntö Scott ja taljassa; nimet tarkennettu (penkkipunnerrus käsipainoilla, pystypunnerrus käsipainoilla istuen/seisten, vipunostot suoralla kädellä, pohjenousu laitteessa, kulmasoutu käsipainoilla). Käytössä olleet poistetut liikkeet piilotetaan, jotta historia säilyy. |
| 5 | Treenin poisto historiasta (viimeisimmän poisto palauttaa painot), koko historian näyttö. |
| 4 | Toistoalueet (8–10 / 10–16) ja sarjakohtaiset minimit edellisen kerran tuloksista. Napautus kirjaa minimin ja lisää toistoja yksi kerrallaan, pitkä painallus avaa valitsimen. Paino nousee, kun kaikki sarjat menevät maksimiin, ja laskee, jos sarja jää alle alueen. Vanhat tiedot muunnetaan automaattisesti. |
| 3 | Sarjakohtainen paino: sarjaruudussa näkyy toistojen lisäksi paino, jolla sarja tehtiin. Painon voi vaihtaa sarjojen välissä, ja jo tehdyn sarjan painoa voi korjata napauttamalla ruutua. Progressio laskee seuraavan painon viimeisen sarjan painosta. |
| 2 | Järjestyksen ▲▼-nuolet poistettu korteista; siirto ylemmäs/alemmas löytyy ⋯-valikosta. |
| 1 | Ensimmäinen versio: ohjelma kategorioittain, treenin kirjaus, liikekohtaiset ajastimet, automaattinen painojen nosto ja lasku, kuminauhasta siirtyminen, liikkeiden vaihtoehdotukset, varmuuskopio. |
