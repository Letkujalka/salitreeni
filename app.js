'use strict';
/* Salitreeni – treenien kirjaus ja painojen automaattinen nosto.
   Kaikki tiedot tallennetaan selaimen localStorageen (avain KEY). */

const APP_VERSION = '6';
const KEY = 'salitreeni.v1';
const CHANGE_AFTER = 6;   // monenko treenin jälkeen ehdotetaan liikkeen vaihtoa
const SNOOZE = 3;         // "Ei vielä" siirtää ehdotusta näin monta treeniä
const BACKUP_DAYS = 14;   // muistutus varmuuskopiosta

const CATS = [
  { id: 'maastaveto', name: 'Maastavetotyyppiset' },
  { id: 'jalat', name: 'Jalat' },
  { id: 'selka', name: 'Selkä' },
  { id: 'rinta', name: 'Rinta' },
  { id: 'olkapaat', name: 'Olkapäät' },
  { id: 'pienet', name: 'Pikkulihakset', multi: true },
];
const CAT = Object.fromEntries(CATS.map(c => [c.id, c]));
const KINDS = {
  paino: 'Painoilla',
  keho: 'Kehonpaino (+ lisäpaino)',
  nauha: 'Kuminauha-avusteinen',
};

// Toistoalueet: isot liikkeet 8–10, pienet liikkeet 10–16.
const RANGE_BIG = [8, 10];
const RANGE_SMALL = [10, 16];
const SMALL_IDS = ['vipunostot', 'vipunostot_vino', 'facepull'];
const defaultRange = (id, cat) => (cat === 'pienet' || SMALL_IDS.includes(id)) ? RANGE_SMALL : RANGE_BIG;

// [id, nimi, kategoria, tyyppi, painonlisäys kg, (nauhaliikkeellä) seuraava liike]
const DEFAULT_EX = [
  ['maastaveto', 'Maastaveto', 'maastaveto', 'paino', 5],
  ['rdl', 'Romanialainen maastaveto', 'maastaveto', 'paino', 5],
  ['suorinjaloin', 'Maastaveto suorin jaloin', 'maastaveto', 'paino', 5],
  ['trapbar', 'Trap bar -maastaveto', 'maastaveto', 'paino', 5],
  ['hyvaahuomenta', 'Hyvää huomenta', 'maastaveto', 'paino', 2.5],
  ['takakyykky', 'Takakyykky', 'jalat', 'paino', 5],
  ['jalkaprassi', 'Jalkaprässi', 'jalat', 'paino', 5],
  ['bulgarialainen', 'Bulgarialainen kyykky', 'jalat', 'paino', 2],
  ['askelkyykky', 'Askelkyykky', 'jalat', 'paino', 2],
  ['leuanveto_nauha', 'Leuanveto kuminauhalla', 'selka', 'nauha', 0, 'leuanveto'],
  ['leuanveto', 'Leuanveto', 'selka', 'keho', 2.5],
  ['ylatalja', 'Ylätalja', 'selka', 'paino', 2.5],
  ['alatalja', 'Alatalja', 'selka', 'paino', 2.5],
  ['kulmasoutu', 'Kulmasoutu tangolla', 'selka', 'paino', 2.5],
  ['kpsoutu', 'Kulmasoutu käsipainoilla', 'selka', 'paino', 2],
  ['penkki', 'Penkkipunnerrus', 'rinta', 'paino', 2.5],
  ['vinopenkki', 'Vinopenkki', 'rinta', 'paino', 2.5],
  ['kppenkki', 'Penkkipunnerrus käsipainoilla', 'rinta', 'paino', 2],
  ['kpvinopenkki', 'Vinopenkki käsipainoilla', 'rinta', 'paino', 2],
  ['dipit_nauha', 'Dipit kuminauhalla', 'rinta', 'nauha', 0, 'dipit'],
  ['dipit', 'Dipit', 'rinta', 'keho', 2.5],
  ['pystypunnerrus', 'Pystypunnerrus tangolla', 'olkapaat', 'paino', 2.5],
  ['kppunnerrus', 'Pystypunnerrus käsipainoilla istuen/seisten', 'olkapaat', 'paino', 2],
  ['vipunostot', 'Vipunostot suoralla kädellä', 'olkapaat', 'paino', 1],
  ['vipunostot_vino', 'Vipunostot vinossa', 'olkapaat', 'paino', 1],
  ['hauis_tanko', 'Hauiskääntö tangolla', 'pienet', 'paino', 2.5],
  ['hauis_kp', 'Hauiskääntö käsipainoilla', 'pienet', 'paino', 1],
  ['hauis_scott', 'Hauiskääntö Scott', 'pienet', 'paino', 2.5],
  ['hauis_talja', 'Hauiskääntö taljassa', 'pienet', 'paino', 2.5],
  ['ojentaja_talja', 'Ojentajapunnerrus taljassa', 'pienet', 'paino', 2.5],
  ['ranskalainen', 'Ranskalainen punnerrus', 'pienet', 'paino', 2.5],
  ['pohje', 'Pohjenousu laitteessa', 'pienet', 'paino', 5],
  ['pohje_yksi', 'Yhden jalan pohjenousu', 'pienet', 'paino', 2],
];

// Oletuslistan muutokset versiossa 3.
const V3_RENAMES = {
  kppenkki: 'Käsipainopenkki',
  kppunnerrus: 'Käsipainopunnerrus istuen',
  vipunostot: 'Vipunostot sivulle',
  pohje: 'Pohjenousu',
  kpsoutu: 'Käsipainosoutu',
};
const V3_REMOVED = ['hipthrust', 'facepull', 'etukyykky'];

/* ---------- tila ---------- */

function defaultExercise([id, name, cat, kind, inc, upgrade]) {
  const [repsMin, repsMax] = defaultRange(id, cat);
  return { id, name, cat, kind, repsMin, repsMax, sets: 3, inc,
    weight: kind === 'keho' ? 0 : null, upgrade: upgrade || null, hidden: false };
}

function freshState() {
  const exercises = {};
  for (const row of DEFAULT_EX) exercises[row[0]] = defaultExercise(row);
  return { version: 3, exercises, program: null, sessions: [], active: null,
    suggestions: [], lastSummary: null, lastBackup: null, created: Date.now() };
}

/** Versio 1 -> 2: yksittäinen tavoitetoistomäärä muuttui toistoalueeksi. */
function migrate(s) {
  if (s && s.version === 1) {
    for (const x of Object.values(s.exercises || {})) {
      [x.repsMin, x.repsMax] = defaultRange(x.id, x.cat);
      delete x.reps;
    }
    if (s.active) {
      for (const e of s.active.entries) {
        const x = s.exercises[e.exId] || {};
        e.repsMin = x.repsMin || RANGE_BIG[0];
        e.repsMax = x.repsMax || RANGE_BIG[1];
        e.prev = [];
        e.sets.forEach(st => { if (st.reps != null && st.target == null) st.target = e.reps; });
      }
    }
    s.version = 2;
  }
  if (s && s.version === 2) {
    // Oletusliikkeiden päivitys. Käyttäjän itse muuttamia nimiä ei kosketa.
    const ex = s.exercises;
    for (const [id, oldName] of Object.entries(V3_RENAMES)) {
      const row = DEFAULT_EX.find(r => r[0] === id);
      if (ex[id] && ex[id].name === oldName) ex[id].name = row[1];
    }
    for (const row of DEFAULT_EX) if (!ex[row[0]]) ex[row[0]] = defaultExercise(row);
    const used = id => s.sessions.some(se => se.entries.some(e => e.exId === id))
      || (s.active && s.active.entries.some(e => e.exId === id))
      || Object.values(s.program || {}).some(p => p.ids.includes(id));
    for (const id of V3_REMOVED) {
      if (!ex[id]) continue;
      if (used(id)) ex[id].hidden = true; else delete ex[id];
    }
    s.version = 3;
  }
  return s;
}

function validState(s) {
  return s && s.version === 3 && s.exercises && typeof s.exercises === 'object' && Array.isArray(s.sessions);
}

function load() {
  try {
    const s = migrate(JSON.parse(localStorage.getItem(KEY)));
    if (validState(s)) return s;
  } catch (e) { /* tyhjä tai rikki -> uusi tila */ }
  return freshState();
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { alert('Tallennus epäonnistui: ' + e.message); }
}

let S = load();
let draft = null;      // ohjelmanäkymän keskeneräiset valinnat
let prevPath = null;
let modalCtx = {};
let showAllHistory = false;

/* ---------- apufunktiot ---------- */

const esc = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const round = n => Math.round(n * 100) / 100;
const fmtKg = w => w == null ? '–' : String(round(w)).replace('.', ',');
const parseNum = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; };
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* ei tukea */ } };

function fmtTime(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
}
function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('fi-FI', { weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric' });
}
function exName(id) { return S.exercises[id] ? S.exercises[id].name : '(poistettu liike)'; }
function weightLabel(kind, w) {
  if (kind === 'nauha') return 'Kuminauha';
  if (kind === 'keho') return w ? '+' + fmtKg(w) + ' kg' : 'Oma paino';
  return w == null ? 'Syötä paino' : fmtKg(w) + ' kg';
}
function visibleEx(cat) { return Object.values(S.exercises).filter(x => x.cat === cat && !x.hidden); }
function setClass(s, target, finished) {
  if (s.reps == null) return finished ? 'miss' : '';
  if (s.reps >= target) return 'ok';
  return s.reps > 0 ? 'part' : 'miss';
}
/** Sarjan paino: tallennettu sarjakohtaisesti, vanhoissa tiedoissa liikkeen paino. */
function setW(e, s) { return s.w !== undefined ? s.w : e.weight; }
/** Liikkeen "työpaino": viimeisen tehdyn sarjan paino. */
function workWeight(e) {
  const done = e.sets.filter(s => s.reps > 0);
  return done.length ? setW(e, done[done.length - 1]) : e.weight;
}
/** Kaikki tehdyt sarjat samalla painolla? Palauttaa painon tai undefined. */
function uniformWeight(e) {
  const ws = e.sets.filter(s => s.reps != null).map(s => setW(e, s));
  if (!ws.length) return e.weight;
  return ws.every(w => w === ws[0]) ? ws[0] : undefined;
}
function shortW(kind, w) {
  if (kind === 'nauha' || w == null) return '';
  if (kind === 'keho') return w ? '+' + fmtKg(w) : 'oma';
  return fmtKg(w);
}
/** Esim. "60 kg · 10 / 10 / 8" tai sekapainoilla "10×60 / 10×62,5 / 8×62,5 kg". */
function resultText(e) {
  const u = uniformWeight(e);
  if (e.kind === 'nauha' || u !== undefined) {
    const w = u !== undefined ? u : e.weight;
    return `${weightLabel(e.kind, w)} · ${e.sets.map(s => s.reps == null ? '–' : s.reps).join(' / ')}`;
  }
  return e.sets.map(s => s.reps == null ? '–' : `${s.reps}×${shortW(e.kind, setW(e, s))}`).join(' / ') + ' kg';
}
function dotsHtml(e) {
  return `<span class="dots">${e.sets.map(s => `<span class="dot ${setClass(s, doneTarget(e, s), true)}"></span>`).join('')}</span>`;
}
/** Tehdyn sarjan tavoite (vanhoissa tiedoissa liikkeen yhteinen tavoite). */
function doneTarget(e, s) { return s.target != null ? s.target : (e.reps != null ? e.reps : e.repsMin); }

/**
 * Sarjan minimitavoite: edellisen kerran saman sarjan tulos, jos se tehtiin
 * samalla painolla ja se oli toistoalueella. Muuten alueen minimi
 * (myös aina painon nousun jälkeen, koska paino on silloin eri).
 */
function setTarget(e, j, w) {
  const s = e.sets[j];
  if (s && s.target != null) return s.target;
  const p = e.prev && e.prev[j];
  if (p && p.reps != null && p.w === w && p.reps >= e.repsMin) return Math.min(p.reps, e.repsMax);
  return e.repsMin;
}
const rangeText = x => `${x.sets.length != null ? x.sets.length : x.sets}×${x.repsMin}–${x.repsMax}`;

/** Viimeisin treenikerta, jossa liikettä on tehty vähintään yksi sarja. */
function lastEntry(exId) {
  for (let i = S.sessions.length - 1; i >= 0; i--) {
    const e = S.sessions[i].entries.find(x => x.exId === exId && x.sets.some(s => s.reps));
    if (e) return e;
  }
  return null;
}
function lastUsed(exId) {
  for (let i = S.sessions.length - 1; i >= 0; i--) {
    if (S.sessions[i].entries.some(x => x.exId === exId)) return S.sessions[i].start;
  }
  return 0;
}

/* ---------- progressio ---------- */

/**
 * Seuraavan kerran paino (paino = viimeisen tehdyn sarjan paino):
 *  - kaikki sarjat toistoalueen maksimiin  -> paino + lisäys
 *  - jokin tehty sarja jäi alle toistoalueen minimin -> paino − lisäys
 *  - muuten -> sama paino (sarjojen tulokset ovat ensi kerran minimit)
 */
function evaluate(e, ex) {
  const did = e.sets.filter(s => s.reps > 0);
  if (!did.length) return { result: 'skip', next: ex.weight };
  const success = e.sets.every(s => s.reps != null && s.reps >= e.repsMax);
  if (e.kind === 'nauha') {
    return { result: success ? 'success' : 'keep', next: ex.weight, upgrade: success && ex.upgrade ? ex.upgrade : null };
  }
  const w = workWeight(e);
  if (w == null) return { result: 'keep', next: ex.weight };
  if (success) return { result: 'up', next: round(w + ex.inc) };
  if (did.some(s => s.reps < e.repsMin)) return { result: 'down', next: Math.max(0, round(w - ex.inc)) };
  return { result: 'keep', next: w };
}

function prevSets(exId) {
  const p = lastEntry(exId);
  return p ? p.sets.map(s => ({ reps: s.reps, w: setW(p, s) })) : [];
}

function makeEntry(exId) {
  const ex = S.exercises[exId];
  return { id: uid(), exId, name: ex.name, cat: ex.cat, kind: ex.kind,
    weight: ex.kind === 'nauha' ? null : ex.weight, repsMin: ex.repsMin, repsMax: ex.repsMax,
    prev: prevSets(exId),
    sets: Array.from({ length: ex.sets || 3 }, () => ({ reps: null, t: null })) };
}

function plannedIds() {
  const ids = [];
  for (const c of CATS) {
    const p = S.program && S.program[c.id];
    if (!p || !p.ids.length) continue;
    ids.push(c.multi ? p.ids[(p.rot || 0) % p.ids.length] : p.ids[0]);
  }
  return ids.filter(id => S.exercises[id]);
}

function startWorkout() {
  S.active = { id: uid(), start: Date.now(), entries: plannedIds().map(makeEntry) };
  save();
  go('#/treeni');
}

function finishWorkout() {
  const a = S.active;
  const items = [];
  // Painot ennen treeniä, jotta ne voidaan palauttaa, jos treeni poistetaan.
  const before = {};
  for (const e of a.entries) if (S.exercises[e.exId]) before[e.exId] = S.exercises[e.exId].weight;
  for (const e of a.entries) {
    const ex = S.exercises[e.exId];
    if (!ex) continue;
    const r = evaluate(e, ex);
    items.push({ name: e.name, kind: e.kind, from: workWeight(e), to: r.next, result: r.result,
      upgrade: r.upgrade, sets: e.sets, repsMin: e.repsMin, repsMax: e.repsMax, weight: e.weight });
    if (e.kind !== 'nauha') ex.weight = r.next;
    if (r.upgrade && !S.suggestions.some(s => s.type === 'upgrade' && s.from === ex.id)) {
      S.suggestions.push({ type: 'upgrade', from: ex.id, to: r.upgrade });
    }
  }
  S.sessions.push({ id: a.id, start: a.start, end: Date.now(), entries: a.entries, before });
  for (const c of CATS) {
    const p = S.program && S.program[c.id];
    if (c.multi && p) p.rot = (p.rot || 0) + 1;
  }
  S.lastSummary = { start: a.start, end: Date.now(), items };
  S.active = null;
  save();
  go('#/yhteenveto');
}

/* ---------- liikkeen vaihtoehdotukset ---------- */

function dueChanges() {
  if (!S.program) return [];
  return CATS.filter(c => {
    const p = S.program[c.id];
    return p && p.ids.length && S.sessions.length - p.since >= CHANGE_AFTER;
  });
}

function candidate(cat, current) {
  const blocked = new Set(current);
  current.forEach(id => { const x = S.exercises[id]; if (x && x.upgrade) blocked.add(x.upgrade); });
  const list = visibleEx(cat).filter(x => !blocked.has(x.id) && x.kind !== 'nauha');
  list.sort((a, b) => lastUsed(a.id) - lastUsed(b.id));
  return list.length ? list[0].id : null;
}

function setProgramIds(cat, ids) {
  const old = S.program[cat];
  const same = old && old.ids.join() === ids.join();
  S.program[cat] = { ids, since: same ? old.since : S.sessions.length, rot: old ? old.rot || 0 : 0 };
}

/* ---------- näkymät ---------- */

function header(title, back = '#/', extra = '') {
  return `<header class="top">${back ? `<a class="back" href="${back}">‹</a>` : ''}<h1>${title}</h1>${extra}</header>`;
}

function viewHome() {
  let h = header('Salitreeni', '');
  if (!S.program) {
    return h + `<div class="card"><p>Tervetuloa! Valitse ensin jokaisesta kategoriasta liike ja syötä aloituspainot.</p>
      <a class="btn primary big" href="#/ohjelma">Valitse liikkeet</a></div>
      <div class="card"><p>Onko sinulla varmuuskopio aiemmasta puhelimesta?</p>
      <a class="btn" href="#/varmuuskopio">Palauta varmuuskopio</a></div>`;
  }
  h += backupReminder();
  if (S.active) {
    h += `<a class="btn primary big" href="#/treeni">Jatka treeniä</a>`;
  } else {
    h += suggestionsHtml();
    h += `<button class="btn primary big" data-act="start">Aloita treeni</button>`;
    h += `<div class="card"><h2>Seuraava treeni</h2><ul class="plan">${plannedIds().map(id => {
      const x = S.exercises[id];
      return `<li><span>${esc(x.name)}</span><span class="r">${weightLabel(x.kind, x.weight)} · ${rangeText(x)}</span></li>`;
    }).join('')}</ul></div>`;
  }
  h += historyHtml();
  h += `<nav class="links"><a class="btn" href="#/ohjelma">Ohjelma</a><a class="btn" href="#/liikkeet">Liikkeet</a><a class="btn" href="#/varmuuskopio">Varmuuskopio</a></nav>
    <p class="ver">versio ${APP_VERSION}</p>`;
  return h;
}

function backupReminder() {
  if (!S.sessions.length) return '';
  const days = S.lastBackup ? Math.floor((Date.now() - S.lastBackup) / 864e5) : null;
  if (days != null && days < BACKUP_DAYS) return '';
  return `<div class="card warn"><p>${days == null ? 'Varmuuskopiota ei ole vielä tehty.' : `Edellisestä varmuuskopiosta on ${days} päivää.`}</p>
    <div class="row"><button class="btn small" data-act="export">Tee varmuuskopio nyt</button></div></div>`;
}

function suggestionsHtml() {
  let h = '';
  for (const s of S.suggestions) {
    if (s.type !== 'upgrade' || !S.exercises[s.to]) continue;
    h += `<div class="card sugg"><p><b>${esc(exName(s.from))}</b> meni täysin läpi! Siirrytäänkö liikkeeseen <b>${esc(exName(s.to))}</b>?</p>
      <div class="row"><button class="btn primary small" data-act="upgYes" data-from="${s.from}">Siirry</button>
      <button class="btn small" data-act="upgNo" data-from="${s.from}">Ei vielä</button></div></div>`;
  }
  for (const c of dueChanges()) {
    const p = S.program[c.id];
    const cand = c.multi ? null : candidate(c.id, p.ids);
    h += `<div class="card sugg"><p><b>${c.name}:</b> ${esc(p.ids.map(exName).join(', '))} on ollut ohjelmassa
      ${S.sessions.length - p.since} treeniä. ${cand ? `Ehdotus: vaihda liikkeeseen <b>${esc(exName(cand))}</b>.` : 'Vaihdetaanko liikkeitä?'}</p>
      <div class="row">${cand ? `<button class="btn primary small" data-act="chgYes" data-cat="${c.id}" data-id="${cand}">Vaihda</button>` : ''}
      <a class="btn small" href="#/ohjelma?k=${c.id}">Valitse itse</a>
      <button class="btn small" data-act="chgNo" data-cat="${c.id}">Ei vielä</button></div></div>`;
  }
  return h;
}

function historyHtml() {
  if (!S.sessions.length) return '';
  const list = showAllHistory ? S.sessions : S.sessions.slice(-8);
  const rows = list.slice().reverse().map(s => `<details><summary>${fmtDate(s.start)} · ${s.entries.length} liikettä · ${fmtTime(s.end - s.start)}</summary>
    <ul class="plan">${s.entries.map(e => `<li><span>${esc(e.name)} ${dotsHtml(e)}</span><span class="r">${resultText(e)}</span></li>`).join('')}</ul>
    <button class="btn danger small" data-act="delSession" data-id="${s.id}">Poista treeni</button></details>`).join('');
  const more = S.sessions.length > 8
    ? `<button class="linkbtn" data-act="toggleHistory">${showAllHistory ? 'Näytä vain viimeisimmät' : `Näytä kaikki (${S.sessions.length})`}</button>` : '';
  return `<div class="card"><h2>${showAllHistory ? 'Kaikki treenit' : 'Viimeisimmät treenit'}</h2>${rows}${more}</div>`;
}

function initDraft() {
  const d = {};
  for (const c of CATS) d[c.id] = S.program && S.program[c.id] ? [...S.program[c.id].ids] : [];
  return d;
}

function viewProgram() {
  if (prevPath !== '/ohjelma' || !draft) draft = initDraft();
  let h = header('Ohjelma');
  h += `<p class="hint">Valitse jokaisesta kategoriasta liike ja syötä aloituspaino. Toistoalue on valmiina (isot liikkeet 8–10, pienet 10–16).
    Pikkulihaksista voi valita useita – niitä tehdään treeneissä vuorotellen.</p>`;
  for (const c of CATS) {
    h += `<section class="cat" id="k-${c.id}"><h2>${c.name}</h2>`;
    for (const x of visibleEx(c.id)) {
      const sel = draft[c.id].includes(x.id);
      h += `<button class="opt ${sel ? 'sel' : ''}" data-act="pick" data-cat="${c.id}" data-id="${x.id}">
        <span class="mark ${c.multi ? 'check' : 'radio'}"></span><span>${esc(x.name)}</span>
        ${x.kind !== 'paino' ? `<small>${x.kind === 'keho' ? 'kehonpaino' : 'kuminauha'}</small>` : ''}</button>`;
      if (sel) {
        h += `<div class="opt-inputs">${x.kind === 'nauha' ? '' : `<label>${x.kind === 'keho' ? 'Lisäpaino' : 'Paino'} (kg)
          <input inputmode="decimal" data-field="weight" data-id="${x.id}" value="${x.weight == null ? '' : fmtKg(x.weight)}" placeholder="kg"></label>`}
          <label>Toistot min<input inputmode="numeric" data-field="repsMin" data-id="${x.id}" value="${x.repsMin}"></label>
          <label>max<input inputmode="numeric" data-field="repsMax" data-id="${x.id}" value="${x.repsMax}"></label>
          <label>Sarjat<input inputmode="numeric" data-field="sets" data-id="${x.id}" value="${x.sets}"></label></div>`;
      }
    }
    h += `<button class="linkbtn" data-act="newEx" data-cat="${c.id}">+ Oma liike</button></section>`;
  }
  h += `<button class="btn primary big" data-act="saveProgram">Tallenna ohjelma</button>`;
  return h;
}

function viewWorkout() {
  const a = S.active;
  if (!a) { setTimeout(() => go('#/'), 0); return ''; }
  let h = header('Treeni', '#/', `<span class="clock" data-since="${a.start}"></span>`);
  h += `<p class="hint">Napauta sarjaruutua, kun sarja on tehty: ruutuun tulee sarjan minimi ja ajastin käynnistyy. Jokainen uusi napautus lisää yhden toiston (maksimin jälkeen alusta). Pitkä painallus: muu määrä, sarjan paino tai tyhjennys.</p>`;
  a.entries.forEach((e, i) => { h += cardHtml(e, i, a.entries.length); });
  h += `<button class="btn block" data-act="addEx">+ Lisää liike</button>
    <button class="btn primary big" data-act="finish">Lopeta treeni</button>
    <button class="btn danger small" data-act="cancelWorkout">Hylkää treeni</button>`;
  return h;
}

function cardHtml(e, i, n) {
  const last = Math.max(0, ...e.sets.map(s => s.t || 0));
  const prev = lastEntry(e.exId);
  const ex = S.exercises[e.exId];
  const inc = ex && e.kind !== 'nauha' ? ex.inc : 0;
  const done = e.sets.every(s => s.reps != null);
  return `<div class="card ex ${done ? 'done' : ''}">
    <div class="ex-head">
      <div class="ex-title"><b>${esc(e.name)}</b><small>${CAT[e.cat] ? CAT[e.cat].name : ''} · ${rangeText(e)}</small></div>
      <button class="menu" data-act="menu" data-i="${i}" aria-label="Valikko">⋯</button>
    </div>
    <div class="ex-row">
      ${e.kind === 'nauha' ? '<span class="w">Kuminauha</span>' : `<div class="weight">
        ${inc ? `<button data-act="wminus" data-i="${i}">−</button>` : ''}
        <button class="w" data-act="wedit" data-i="${i}">${weightLabel(e.kind, e.weight)}</button>
        ${inc ? `<button data-act="wplus" data-i="${i}">+</button>` : ''}</div>`}
      <span class="timer ${last ? '' : 'idle'}" ${last ? `data-since="${last}"` : ''}>${last ? '' : '–:––'}</span>
    </div>
    <div class="sets">${e.sets.map((s, j) => s.reps == null
      ? `<button class="set" data-act="set" data-i="${i}" data-j="${j}"><span class="ghost">${setTarget(e, j, e.weight)}</span></button>`
      : `<button class="set ${setClass(s, doneTarget(e, s))}" data-act="set" data-i="${i}" data-j="${j}">${s.reps}${s.reps >= e.repsMax ? '<sup>★</sup>' : ''}<small>${shortW(e.kind, setW(e, s))}</small></button>`).join('')}</div>
    ${prev ? `<p class="prev">Edellinen: ${resultText(prev)}</p>` : ''}
  </div>`;
}

function viewSummary() {
  const sm = S.lastSummary;
  if (!sm) { setTimeout(() => go('#/'), 0); return ''; }
  let h = header('Treeni tehty', '');
  h += `<div class="card"><p>${fmtDate(sm.start)} · kesto ${fmtTime(sm.end - sm.start)}</p>`;
  for (const it of sm.items) {
    let txt;
    if (it.result === 'skip') txt = '<span class="muted">ei tehty</span>';
    else if (it.kind === 'nauha') txt = it.result === 'success' ? '<span class="up">täysin läpi</span>' : '<span class="muted">sama ensi kerralla</span>';
    else if (it.result === 'up') txt = `<span class="up">↑ ${weightLabel(it.kind, it.to)}</span>`;
    else if (it.result === 'down') txt = `<span class="down">↓ ${weightLabel(it.kind, it.to)}</span>`;
    else txt = `<span class="muted">= ${weightLabel(it.kind, it.to)}</span>`;
    h += `<div class="res"><span>${esc(it.name)}<br><small>${resultText(it)} ${dotsHtml(it)}</small></span><span>${txt}</span></div>`;
  }
  h += `</div><p class="hint">↑ = paino nousee ensi kerralla, = pysyy samana, ↓ = laskee.</p>
    <a class="btn primary big" href="#/" data-act="closeSummary">Valmis</a>`;
  return h;
}

function viewExercises() {
  let h = header('Liikkeet');
  h += `<p class="hint">Napauta liikettä muokataksesi tavoitetoistoja, sarjoja, painonlisäystä tai seuraavan kerran painoa.</p>`;
  for (const c of CATS) {
    h += `<div class="card"><h2>${c.name}</h2><ul class="plan">`;
    for (const x of Object.values(S.exercises).filter(x => x.cat === c.id)) {
      h += `<li data-act="editEx" data-id="${x.id}" style="cursor:pointer${x.hidden ? ';opacity:.45' : ''}"><span>${esc(x.name)}</span>
        <span class="r">${rangeText(x)} · ${weightLabel(x.kind, x.weight)}${x.kind !== 'nauha' ? ` · +${fmtKg(x.inc)}` : ''}</span></li>`;
    }
    h += `</ul><button class="linkbtn" data-act="newEx" data-cat="${c.id}">+ Uusi liike</button></div>`;
  }
  return h;
}

function viewBackup() {
  let h = header('Varmuuskopio');
  h += `<div class="card"><p>Tiedot ovat vain tässä puhelimessa. Tee varmuuskopio säännöllisesti ja tallenna tiedosto
    esimerkiksi Google Driveen tai lähetä se itsellesi sähköpostilla.</p>
    <p class="muted">Edellinen varmuuskopio: ${S.lastBackup ? fmtDate(S.lastBackup) : 'ei koskaan'} · treenejä tallessa: ${S.sessions.length}</p>
    <button class="btn primary" data-act="export">Vie varmuuskopio</button></div>
    <div class="card"><p>Palauta tiedot varmuuskopiotiedostosta. <b>Korvaa kaikki nykyiset tiedot.</b></p>
    <label class="btn">Tuo varmuuskopio<input type="file" accept=".json,application/json,text/plain" id="importFile" hidden></label></div>
    <p class="hint" id="persist"></p>`;
  if (navigator.storage && navigator.storage.persisted) {
    navigator.storage.persisted().then(p => {
      const el = document.getElementById('persist');
      if (el) el.textContent = p ? 'Selain on luvannut säilyttää tiedot pysyvästi.' : 'Huom: selain ei ole vielä merkinnyt tietoja pysyviksi – asenna sovellus aloitusnäytölle.';
    });
  }
  return h;
}

/* ---------- reititys ja piirto ---------- */

const VIEWS = {
  '/': viewHome, '/ohjelma': viewProgram, '/treeni': viewWorkout, '/yhteenveto': viewSummary,
  '/liikkeet': viewExercises, '/varmuuskopio': viewBackup,
};

function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }

function render() {
  const [path, query] = (location.hash.replace(/^#/, '') || '/').split('?');
  const view = VIEWS[path] || viewHome;
  document.getElementById('app').innerHTML = view();
  if (path !== prevPath) {
    const k = new URLSearchParams(query || '').get('k');
    const target = k && document.getElementById('k-' + k);
    if (target) target.scrollIntoView(); else window.scrollTo(0, 0);
  }
  prevPath = path;
  tick();
  keepAwake(!!S.active && path === '/treeni');
}

function tick() {
  const now = Date.now();
  document.querySelectorAll('[data-since]').forEach(el => {
    el.textContent = (el.classList.contains('timer') ? '⏱ ' : '') + fmtTime(now - Number(el.dataset.since));
  });
}
setInterval(tick, 1000);

let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && !wakeLock && 'wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch (e) { /* ei tukea tai ei lupaa */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') render();
});

/* ---------- modaali ---------- */

const modalEl = document.getElementById('modal');
function openModal(html, ctx = {}) {
  modalCtx = ctx;
  modalEl.querySelector('.sheet').innerHTML = html;
  modalEl.classList.remove('hidden');
  const inp = modalEl.querySelector('input[autofocus]');
  if (inp) setTimeout(() => { inp.focus(); inp.select(); }, 50);
}
function closeModal() { modalEl.classList.add('hidden'); modalCtx = {}; }
modalEl.addEventListener('click', e => { if (e.target === modalEl) closeModal(); });

function confirmBox(text, okLabel, onOk, danger) {
  openModal(`<p>${text}</p><div class="row"><button class="btn ${danger ? 'danger' : 'primary'}" data-act="ok">${okLabel}</button>
    <button class="btn" data-act="close">Peruuta</button></div>`, { onOk });
}

function numberBox(title, value, onOk) {
  openModal(`<h2>${title}</h2><input id="numIn" inputmode="decimal" value="${value == null ? '' : fmtKg(value)}" autofocus>
    <div class="row"><button class="btn primary" data-act="numOk">OK</button><button class="btn" data-act="close">Peruuta</button></div>`, { onNum: onOk });
}

function pickExercise(title, cats, onPick) {
  let h = `<h2>${title}</h2><div class="picklist">`;
  for (const c of CATS.filter(c => cats.includes(c.id))) {
    h += `<h3>${c.name}</h3>`;
    for (const x of visibleEx(c.id)) {
      h += `<button class="opt" data-act="picked" data-id="${x.id}"><span>${esc(x.name)}</span><small>${weightLabel(x.kind, x.weight)}</small></button>`;
    }
  }
  h += `</div><button class="btn block" data-act="close">Peruuta</button>`;
  openModal(h, { onPick });
}

function openExEdit(id, presetCat) {
  const x = id ? S.exercises[id] : { name: '', cat: presetCat || 'rinta', kind: 'paino', repsMin: 8, repsMax: 10, sets: 3, inc: 2.5, weight: null, upgrade: null, hidden: false };
  const opts = (obj, cur) => Object.entries(obj).map(([k, v]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${esc(v)}</option>`).join('');
  const upg = Object.values(S.exercises).filter(e => e.kind !== 'nauha')
    .map(e => `<option value="${e.id}" ${e.id === x.upgrade ? 'selected' : ''}>${esc(e.name)}</option>`).join('');
  openModal(`<h2>${id ? 'Muokkaa liikettä' : 'Uusi liike'}</h2>
    <label>Nimi<input id="f_name" value="${esc(x.name)}"></label>
    <div class="grid2">
      <label>Kategoria<select id="f_cat">${opts(Object.fromEntries(CATS.map(c => [c.id, c.name])), x.cat)}</select></label>
      <label>Tyyppi<select id="f_kind">${opts(KINDS, x.kind)}</select></label>
      <label>Sarjat<input id="f_sets" inputmode="numeric" value="${x.sets}"></label>
      <span></span>
      <label>Toistot min<input id="f_rmin" inputmode="numeric" value="${x.repsMin}"></label>
      <label>Toistot max<input id="f_rmax" inputmode="numeric" value="${x.repsMax}"></label>
      <label>Painonlisäys (kg)<input id="f_inc" inputmode="decimal" value="${fmtKg(x.inc)}"></label>
      <label>Seuraava paino (kg)<input id="f_weight" inputmode="decimal" value="${x.weight == null ? '' : fmtKg(x.weight)}"></label>
    </div>
    <label>Kuminauhaversiosta siirrytään liikkeeseen<select id="f_upg"><option value="">–</option>${upg}</select></label>
    <label class="chk"><input type="checkbox" id="f_hidden" ${x.hidden ? 'checked' : ''}> Piilota valintalistoista</label>
    <div class="row"><button class="btn primary" data-act="exSave">Tallenna</button><button class="btn" data-act="close">Peruuta</button></div>`,
  { exId: id });
}

function openRepsBox(i, j) {
  const e = S.active.entries[i];
  const cur = e.sets[j].reps;
  const w0 = cur == null ? e.weight : setW(e, e.sets[j]);
  const target = setTarget(e, j, w0);
  const max = Math.max(e.repsMax + 4, cur || 0, 14);
  let btns = '';
  for (let v = 0; v <= max; v++) {
    const cls = v === target ? 'target' : (v >= e.repsMin && v <= e.repsMax ? 'inrange' : '');
    btns += `<button class="${cls}" data-act="repsPick" data-v="${v}">${v}</button>`;
  }
  const wInput = e.kind === 'nauha' ? '' : `<label>${e.kind === 'keho' ? 'Lisäpaino' : 'Paino'} tässä sarjassa (kg)
    <input id="setWIn" inputmode="decimal" value="${w0 == null ? '' : fmtKg(w0)}"></label>`;
  openModal(`<h2>${esc(e.name)} – sarja ${j + 1}</h2>${wInput}<p class="muted">Montako toistoa tuli? Tavoite ${target}, alue ${e.repsMin}–${e.repsMax}.</p>
    <div class="repsgrid">${btns}</div>
    <div class="row"><button class="btn danger" data-act="repsPick" data-v="">Ei tehty (tyhjennä)</button><button class="btn" data-act="close">Sulje</button></div>`,
  { i, j });
}

/* ---------- varmuuskopio ---------- */

async function exportBackup() {
  const before = S.lastBackup;
  S.lastBackup = Date.now();
  const data = JSON.stringify({ app: 'salitreeni', exported: new Date().toISOString(), state: S });
  const name = `salitreeni-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([data], name, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: name });
      save(); render();
      return;
    }
  } catch (e) {
    if (e.name === 'AbortError') { S.lastBackup = before; return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  save(); render();
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let st;
    try { const d = JSON.parse(reader.result); st = migrate(d && d.state ? d.state : d); } catch (e) { st = null; }
    if (!validState(st)) { alert('Tiedosto ei ole Salitreenin varmuuskopio.'); return; }
    const last = st.sessions.length ? fmtDate(st.sessions[st.sessions.length - 1].start) : '–';
    confirmBox(`Varmuuskopiossa on ${st.sessions.length} treeniä (viimeisin ${last}). Korvataanko nykyiset tiedot?`, 'Palauta', () => {
      S = st; save(); go('#/');
    }, true);
  };
  reader.readAsText(file);
}

/* ---------- toiminnot ---------- */

const entry = el => S.active.entries[Number(el.dataset.i)];

const ACT = {
  start: startWorkout,
  export: exportBackup,
  close: closeModal,
  ok: () => { const f = modalCtx.onOk; closeModal(); if (f) f(); },
  numOk: () => {
    const v = parseNum(document.getElementById('numIn').value);
    const f = modalCtx.onNum; closeModal(); if (f) f(v);
  },
  picked: el => { const f = modalCtx.onPick; closeModal(); if (f) f(el.dataset.id); },
  closeSummary: () => { S.lastSummary = null; save(); },

  // ohjelma
  pick: el => {
    const { cat, id } = el.dataset;
    const list = draft[cat];
    if (CAT[cat].multi) {
      const k = list.indexOf(id);
      if (k >= 0) list.splice(k, 1); else list.push(id);
    } else {
      draft[cat] = list[0] === id ? [] : [id];
    }
    render();
  },
  saveProgram: () => {
    if (!CATS.some(c => draft[c.id].length)) { alert('Valitse vähintään yksi liike.'); return; }
    S.program = S.program || {};
    for (const c of CATS) {
      if (draft[c.id].length) setProgramIds(c.id, draft[c.id]); else delete S.program[c.id];
    }
    draft = null;
    save();
    go('#/');
  },
  newEx: el => openExEdit(null, el.dataset.cat),
  editEx: el => openExEdit(el.dataset.id),
  exSave: () => {
    const val = id => document.getElementById(id).value;
    const name = val('f_name').trim();
    if (!name) { alert('Anna liikkeelle nimi.'); return; }
    const id = modalCtx.exId || 'oma_' + uid();
    const old = S.exercises[id] || {};
    const x = {
      ...old, id, name, cat: val('f_cat'), kind: val('f_kind'),
      sets: Math.max(1, parseInt(val('f_sets'), 10) || 3),
      repsMin: Math.max(1, parseInt(val('f_rmin'), 10) || 8),
      repsMax: Math.max(1, parseInt(val('f_rmax'), 10) || 10),
      inc: Math.max(0, parseNum(val('f_inc')) ?? 2.5),
      weight: parseNum(val('f_weight')),
      upgrade: val('f_upg') || null,
      hidden: document.getElementById('f_hidden').checked,
    };
    if (x.kind === 'keho' && x.weight == null) x.weight = 0;
    if (x.repsMax < x.repsMin) x.repsMax = x.repsMin;
    S.exercises[id] = x;
    if (!modalCtx.exId && draft && prevPath === '/ohjelma' && !x.hidden) {
      if (CAT[x.cat].multi) draft[x.cat].push(id); else draft[x.cat] = [id];
    }
    closeModal(); save(); render();
  },

  // ehdotukset
  chgYes: el => {
    const { cat, id } = el.dataset;
    setProgramIds(cat, [id]);
    save(); render();
    const x = S.exercises[id];
    if (x.kind === 'paino' && x.weight == null) {
      numberBox(`Aloituspaino: ${esc(x.name)} (kg)`, null, v => { x.weight = v; save(); render(); });
    }
  },
  chgNo: el => {
    const p = S.program[el.dataset.cat];
    p.since = S.sessions.length - CHANGE_AFTER + SNOOZE;
    save(); render();
  },
  upgYes: el => {
    const s = S.suggestions.find(x => x.type === 'upgrade' && x.from === el.dataset.from);
    if (!s) return;
    for (const c of CATS) {
      const p = S.program[c.id];
      if (p) p.ids = p.ids.map(id => id === s.from ? s.to : id);
    }
    const to = S.exercises[s.to];
    if (to.weight == null) to.weight = 0;
    S.suggestions = S.suggestions.filter(x => x !== s);
    save(); render();
  },
  upgNo: el => {
    S.suggestions = S.suggestions.filter(x => !(x.type === 'upgrade' && x.from === el.dataset.from));
    save(); render();
  },

  // historia
  toggleHistory: () => { showAllHistory = !showAllHistory; render(); },
  delSession: el => {
    const idx = S.sessions.findIndex(x => x.id === el.dataset.id);
    if (idx < 0) return;
    const sess = S.sessions[idx];
    const latest = idx === S.sessions.length - 1;
    const restore = latest && sess.before;
    const note = restore
      ? 'Liikkeiden painot palautetaan treeniä edeltäneisiin.'
      : 'Liikkeiden painot eivät muutu – tarkista ne tarvittaessa Liikkeet-sivulta.';
    confirmBox(`Poistetaanko treeni ${fmtDate(sess.start)}? ${note}`, 'Poista', () => {
      S.sessions.splice(idx, 1);
      if (restore) {
        for (const [id, w] of Object.entries(sess.before)) if (S.exercises[id]) S.exercises[id].weight = w;
      }
      if (latest) {
        for (const c of CATS) {
          const p = S.program && S.program[c.id];
          if (c.multi && p && p.rot > 0) p.rot -= 1;
        }
      }
      save(); render();
    }, true);
  },

  // treeni
  // Napautus: tyhjä sarja -> sarjan minimi ja ajastin käyntiin.
  // Tehty sarja -> +1 toisto, maksimin jälkeen alueen minimiin.
  set: el => {
    if (lpFired) { lpFired = false; return; }
    const e = entry(el), j = Number(el.dataset.j);
    const s = e.sets[j];
    if (s.reps == null) {
      const k = e.sets.findIndex(x => x.reps == null);
      const w = e.kind === 'nauha' ? null : e.weight;
      const target = setTarget(e, k, w);
      e.sets[k] = { reps: target, target, t: Date.now(), w };
      buzz(40);
    } else {
      s.reps = s.reps >= e.repsMax ? e.repsMin : s.reps + 1;
      buzz(15);
    }
    save(); render();
  },
  repsPick: el => {
    const e = S.active.entries[modalCtx.i];
    const s = e.sets[modalCtx.j];
    const wIn = document.getElementById('setWIn');
    if (el.dataset.v === '') { e.sets[modalCtx.j] = { reps: null, t: null }; } else {
      s.w = e.kind === 'nauha' ? null : (wIn ? parseNum(wIn.value) ?? (e.kind === 'keho' ? 0 : null) : e.weight);
      if (s.target == null) s.target = setTarget(e, modalCtx.j, s.w);
      s.reps = Number(el.dataset.v); s.t = s.t || Date.now();
    }
    closeModal(); save(); render();
  },
  wplus: el => { const e = entry(el); e.weight = round((e.weight || 0) + S.exercises[e.exId].inc); save(); render(); },
  wminus: el => { const e = entry(el); e.weight = Math.max(0, round((e.weight || 0) - S.exercises[e.exId].inc)); save(); render(); },
  wedit: el => {
    const e = entry(el);
    numberBox(`${esc(e.name)} – ${e.kind === 'keho' ? 'lisäpaino' : 'paino'} (kg)`, e.weight, v => { e.weight = v; save(); render(); });
  },
  up: el => { const i = Number(el.dataset.i), a = S.active.entries; [a[i - 1], a[i]] = [a[i], a[i - 1]]; closeModal(); save(); render(); },
  down: el => { const i = Number(el.dataset.i), a = S.active.entries; [a[i + 1], a[i]] = [a[i], a[i + 1]]; closeModal(); save(); render(); },
  menu: el => {
    const i = Number(el.dataset.i), e = S.active.entries[i];
    openModal(`<h2>${esc(e.name)}</h2>
      <button class="btn block" data-act="swapEx" data-i="${i}">Vaihda toiseen liikkeeseen</button>
      ${i > 0 ? `<button class="btn block" data-act="up" data-i="${i}">Siirrä ylemmäs</button>` : ''}
      ${i < S.active.entries.length - 1 ? `<button class="btn block" data-act="down" data-i="${i}">Siirrä alemmas</button>` : ''}
      <button class="btn block" data-act="addSet" data-i="${i}">Lisää sarja</button>
      ${e.sets.length > 1 ? `<button class="btn block" data-act="delSet" data-i="${i}">Poista viimeinen sarja</button>` : ''}
      <button class="btn block danger" data-act="delEntry" data-i="${i}">Poista treenistä</button>
      <button class="btn block" data-act="close">Sulje</button>`);
  },
  addSet: el => { entry(el).sets.push({ reps: null, t: null }); closeModal(); save(); render(); },
  delSet: el => { entry(el).sets.pop(); closeModal(); save(); render(); },
  delEntry: el => { S.active.entries.splice(Number(el.dataset.i), 1); closeModal(); save(); render(); },
  swapEx: el => {
    const i = Number(el.dataset.i), e = S.active.entries[i];
    pickExercise('Vaihda liike', [e.cat, ...CATS.map(c => c.id).filter(c => c !== e.cat)], id => {
      S.active.entries[i] = makeEntry(id); save(); render();
    });
  },
  addEx: () => {
    pickExercise('Lisää liike treeniin', CATS.map(c => c.id), id => {
      const a = S.active.entries;
      const k = a.findIndex(x => x.cat === 'pienet');   // pikkulihakset pysyvät viimeisinä
      a.splice(k >= 0 && S.exercises[id].cat !== 'pienet' ? k : a.length, 0, makeEntry(id));
      save(); render();
    });
  },
  finish: () => {
    const left = S.active.entries.reduce((n, e) => n + e.sets.filter(s => s.reps == null).length, 0);
    confirmBox(`Lopetetaanko treeni?${left ? ` ${left} sarjaa on tekemättä – ne merkitään punaisiksi.` : ''}`, 'Lopeta treeni', finishWorkout);
  },
  cancelWorkout: () => confirmBox('Hylätäänkö treeni? Tämän treenin kirjauksia ei tallenneta.', 'Hylkää', () => {
    S.active = null; save(); go('#/');
  }, true),
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = ACT[el.dataset.act];
  if (fn) { if (el.tagName === 'BUTTON') e.preventDefault(); fn(el, e); }
});

document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'importFile' && t.files[0]) { importBackup(t.files[0]); t.value = ''; return; }
  if (t.dataset.field) {
    const x = S.exercises[t.dataset.id];
    if (!x) return;
    if (t.dataset.field === 'weight') x.weight = parseNum(t.value) ?? (x.kind === 'keho' ? 0 : null);
    else x[t.dataset.field] = Math.max(1, parseInt(t.value, 10) || x[t.dataset.field]);
    if (x.repsMax < x.repsMin) {
      if (t.dataset.field === 'repsMin') x.repsMax = x.repsMin; else x.repsMin = x.repsMax;
      render();
    }
    save();
  }
});

// Pitkä painallus sarjaruudussa avaa toistovalitsimen.
let lpTimer = null, lpFired = false, lpStart = null;
document.addEventListener('pointerdown', e => {
  lpFired = false;
  const el = e.target.closest('.set[data-act=set]');
  if (!el) return;
  lpStart = [e.clientX, e.clientY];
  lpTimer = setTimeout(() => {
    lpTimer = null;
    lpFired = true;
    buzz(30);
    const i = Number(el.dataset.i), e2 = S.active.entries[i];
    let j = Number(el.dataset.j);
    if (e2.sets[j].reps == null) j = e2.sets.findIndex(x => x.reps == null);
    openRepsBox(i, j);
  }, 500);
});
const lpCancel = () => { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } };
document.addEventListener('pointerup', lpCancel);
document.addEventListener('pointercancel', lpCancel);
document.addEventListener('pointermove', e => {
  if (lpTimer && lpStart && Math.hypot(e.clientX - lpStart[0], e.clientY - lpStart[1]) > 12) lpCancel();
});
document.addEventListener('contextmenu', e => { if (e.target.closest('.set')) e.preventDefault(); });

window.addEventListener('hashchange', render);
if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
render();
