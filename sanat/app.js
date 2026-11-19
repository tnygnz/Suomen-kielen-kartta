/* Suomi Kartat — Morfoloji & Dil Stüdyosu
   ------------------------------------------------------------------
   Veri      : data.js (WEEKS, ALL_CARDS) — dokunulmaz.
   Tekrar    : SM-2 sadeleştirmesi (ease faktörü + gün bazlı aralık),
               eski uygulamadaki katsayılarla birebir korunur.
   Katman 1  : editoryal arayüz (styles.css), iki mod, kıl payı çizgiler.
   Katman 2  : canlı kök & ek röntgeni — karttaki her kelime ve laboratuvar.
   ------------------------------------------------------------------ */

const STORE_KEY = 'suomi-kartat-v1';
const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_EASE = 1.3;
const SESSION_LIMIT = 30;
const NEW_CARD_LIMIT = 12;
const DEFAULT_GOAL = 20;
const GRADE_LABELS = ['Tekrar', 'Zor', 'İyi', 'Kolay'];
const THEMES = { linen: 'Sıcak Keten', fjord: 'Gece Fiyordu' };
const REGISTERS = { kirja: 'Kirjakieli', puhe: 'Puhekieli' };
const VIEW_NAMES = { study: 'Çalış', index: 'Dizin', lab: 'Laboratuvar', ledger: 'Kayıt' };
const VIEW_LIST = ['study', 'index', 'lab', 'ledger'];

/* ---------------- Depolama ---------------- */

const memoryStore = new Map();

function readStore(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    return memoryStore.has(key) ? memoryStore.get(key) : null;
  }
}

function writeStore(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    memoryStore.set(key, value);
  }
}

function emptyProgress() {
  return {
    cards: {},
    settings: { goal: DEFAULT_GOAL, theme: 'linen', register: 'kirja' },
    stats: {
      day: '',
      dayCount: 0,
      answers: 0,
      correct: 0,
      streak: { last: null, days: 0 },
    },
    history: {},
  };
}

/* Hem localStorage kaydını hem yedek dosyasını aynı biçime getirir;
   eski sürümün `cards` alanı SM-2 durumunu taşıdığı için korunur. */
function normalizeProgress(parsed) {
  const blank = emptyProgress();
  if (!parsed || typeof parsed !== 'object') return blank;
  const stats = parsed.stats && typeof parsed.stats === 'object' ? parsed.stats : {};
  return {
    cards: parsed.cards && typeof parsed.cards === 'object' ? parsed.cards : {},
    settings: Object.assign({}, blank.settings, parsed.settings || {}),
    stats: Object.assign({}, blank.stats, stats, {
      streak: Object.assign({}, blank.stats.streak, stats.streak || {}),
    }),
    history: parsed.history && typeof parsed.history === 'object' ? parsed.history : {},
  };
}

function loadProgress() {
  let parsed = null;
  try {
    parsed = JSON.parse(readStore(STORE_KEY) || 'null');
  } catch (error) {
    parsed = null;
  }
  return normalizeProgress(parsed);
}

const progress = loadProgress();

function saveProgress() {
  writeStore(STORE_KEY, JSON.stringify(progress));
}

/* ---------------- Tarih ve biçim ---------------- */

function pad2(value) {
  return String(value).padStart(2, '0');
}

function dayKey(date) {
  const d = date || new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/* Yaz saati kaymalarına takılmamak için gün farkı Date üzerinden hesaplanır. */
function shiftKey(key, days) {
  const parts = String(key).split('-').map(Number);
  return dayKey(new Date(parts[0], parts[1] - 1, parts[2] + days));
}

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (char) => {
    if (char === '&') return '&amp;';
    if (char === '<') return '&lt;';
    if (char === '>') return '&gt;';
    if (char === '"') return '&quot;';
    return '&#39;';
  });
}

function intervalText(state, grade) {
  if (grade === 0) return '1 dk';
  const days = state.interval || 0;
  if (!days) return 'bugün';
  if (days === 1) return '1 gün';
  if (days < 30) return `${days} gün`;
  if (days < 365) return `${Math.round(days / 30)} ay`;
  return `${(days / 365).toFixed(1)} yıl`;
}

/* ---------------- SM-2 ---------------- */

/* Eski uygulamadan birebir: 0 tekrar, 1 zor, 2 iyi, 3 kolay. */
function cardState(id) {
  const card = progress.cards[id];
  if (!card) return { reps: 0, interval: 0, ease: 2.5, due: 0, lapses: 0, seen: 0 };
  return {
    reps: card.reps || 0,
    interval: card.interval || 0,
    ease: card.ease || 2.5,
    due: card.due || 0,
    lapses: card.lapses || 0,
    seen: card.seen || 0,
  };
}

function nextState(current, grade, now) {
  const at = typeof now === 'number' ? now : Date.now();
  const s = {
    reps: current.reps || 0,
    interval: current.interval || 0,
    ease: current.ease || 2.5,
    due: current.due || 0,
    lapses: current.lapses || 0,
    seen: (current.seen || 0) + 1,
  };

  if (grade === 0) {
    s.reps = 0;
    s.lapses = (s.lapses || 0) + 1;
    s.ease = Math.max(MIN_EASE, s.ease - 0.2);
    s.interval = 0;
    s.due = at + 60 * 1000;
  } else if (grade === 1) {
    s.reps = s.reps + 1;
    s.ease = Math.max(MIN_EASE, s.ease - 0.15);
    s.interval = s.interval ? Math.max(1, Math.round(s.interval * 1.2)) : 1;
    s.due = at + s.interval * DAY_MS;
  } else if (grade === 2) {
    s.reps = s.reps + 1;
    s.interval = s.interval ? Math.max(1, Math.round(s.interval * s.ease)) : 1;
    s.due = at + s.interval * DAY_MS;
  } else {
    s.reps = s.reps + 1;
    s.ease = s.ease + 0.15;
    s.interval = s.interval ? Math.max(2, Math.round(s.interval * s.ease * 1.3)) : 3;
    s.due = at + s.interval * DAY_MS;
  }

  return s;
}

function registerAnswer(correct, now) {
  const at = typeof now === 'number' ? now : Date.now();
  const key = dayKey(new Date(at));
  const stats = progress.stats;

  stats.answers = (stats.answers || 0) + 1;
  if (correct) stats.correct = (stats.correct || 0) + 1;

  if (stats.day !== key) {
    stats.day = key;
    stats.dayCount = 0;
  }
  stats.dayCount = (stats.dayCount || 0) + 1;

  progress.history[key] = (progress.history[key] || 0) + 1;

  if (stats.streak.last !== key) {
    const yesterday = shiftKey(key, -1);
    stats.streak.days = stats.streak.last === yesterday ? (stats.streak.days || 0) + 1 : 1;
    stats.streak.last = key;
  }
}

function gradeCard(card, grade, now) {
  progress.cards[card.id] = nextState(cardState(card.id), grade, now);
  registerAnswer(grade !== 0, now);
  saveProgress();
  return progress.cards[card.id];
}

/* ---------------- Havuz, kuyruk ---------------- */

function poolFor(week) {
  if (week === 'all') return ALL_CARDS;
  return ALL_CARDS.filter((card) => card.week === Number(week));
}

function dueCount(week, now) {
  const at = typeof now === 'number' ? now : Date.now();
  return poolFor(week).filter((card) => {
    const state = cardState(card.id);
    return state.reps > 0 && state.due <= at;
  }).length;
}

function learnedCount() {
  return ALL_CARDS.filter((card) => cardState(card.id).reps > 0).length;
}

function shuffle(list) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = arr[i];
    arr[i] = arr[j];
    arr[j] = swap;
  }
  return arr;
}

/* Tekrar bekleyenler önce (en eski önce), sonra en fazla 12 yeni kart;
   oturum, günlük hedefle sınırlanır. */
function buildQueue(week, now) {
  const at = typeof now === 'number' ? now : Date.now();
  const pool = poolFor(week);
  const reviews = pool
    .filter((card) => {
      const state = cardState(card.id);
      return state.reps > 0 && state.due <= at;
    })
    .sort((a, b) => cardState(a.id).due - cardState(b.id).due);
  const fresh = shuffle(pool.filter((card) => cardState(card.id).reps === 0)).slice(0, NEW_CARD_LIMIT);
  const goal = progress.settings.goal || DEFAULT_GOAL;
  return reviews.concat(fresh).slice(0, Math.min(SESSION_LIMIT, goal));
}

function currentWeekId() {
  const open = WEEKS.find((week) => poolFor(week.id).some((card) => cardState(card.id).reps === 0));
  return open ? open.id : WEEKS[WEEKS.length - 1].id;
}

function currentStreak() {
  const streak = progress.stats.streak || {};
  if (!streak.last) return 0;
  const today = dayKey();
  if (streak.last === today || streak.last === shiftKey(today, -1)) return streak.days || 0;
  return 0;
}

/* ---------------- Sözlük ---------------- */

const LEXICON = new Map();
ALL_CARDS.forEach((card) => {
  if (card.type !== 'kelime') return;
  const key = card.fi.toLocaleLowerCase('fi');
  if (!LEXICON.has(key)) LEXICON.set(key, card);
});

/* Puhekieli biçimleri yalın hâlde sözlükte olmadığı için ayrı tablo.
   Her giriş yazı dili karşılığını ve varsa kişi/hâl ekini taşır; röntgen
   "biçimsel tahmin" yerine doğrulanmış kök + ek gösterir. */
const COLLOQUIAL = {
  mä: { lemma: 'minä', tr: 'ben', note: 'Yazı dili: minä.' },
  sä: { lemma: 'sinä', tr: 'sen', note: 'Yazı dili: sinä.' },
  ne: { lemma: 'he', tr: 'onlar', note: 'Yazı dili: he (adıl); nesne "ne" ile karışmasın.' },
  tää: { lemma: 'tämä', tr: 'bu', note: 'Yazı dili: tämä.' },
  toi: { lemma: 'tuo', tr: 'şu', note: 'Yazı dili: tuo.' },
  nää: { lemma: 'nämä', tr: 'bunlar', note: 'Yazı dili: nämä.' },
  noi: { lemma: 'nuo', tr: 'şunlar', note: 'Yazı dili: nuo.' },
  oon: { lemma: 'olla', tr: 'olmak', ending: ['n', 'fiil', '1. tekil kişi', 'olen → oon'] },
  oot: { lemma: 'olla', tr: 'olmak', ending: ['t', 'fiil', '2. tekil kişi', 'olet → oot'] },
  on: { lemma: 'olla', tr: 'olmak', note: 'Yazı dili: on (3. tekil).' },
  ollaan: { lemma: 'olla', tr: 'olmak', ending: ['an', 'fiil', '1. çoğul · passiivi', 'olemme → ollaan'] },
  ootte: { lemma: 'olla', tr: 'olmak', ending: ['tte', 'fiil', '2. çoğul kişi', 'olette → ootte'] },
  mulla: { lemma: 'minulla', tr: 'bende', ending: ['la', 'hal', 'adessiivi', 'minulla → mulla'] },
  sulla: { lemma: 'sinulla', tr: 'sende', ending: ['la', 'hal', 'adessiivi', 'sinulla → sulla'] },
  sillä: { lemma: 'hänellä', tr: 'onda', ending: ['lä', 'hal', 'adessiivi', 'hänellä → sillä'] },
  mun: { lemma: 'minun', tr: 'benim', note: 'Yazı dili: minun (genetiivi).' },
  sun: { lemma: 'sinun', tr: 'senin', note: 'Yazı dili: sinun.' },
  sen: { lemma: 'hänen', tr: 'onun', note: 'Yazı dili: hänen; ayrıca işaret adılı se.' },
  mua: { lemma: 'minua', tr: 'beni', ending: ['a', 'hal', 'partitiivi', 'minua → mua'] },
  sua: { lemma: 'sinua', tr: 'seni', ending: ['a', 'hal', 'partitiivi', 'sinua → sua'] },
  sitä: { lemma: 'häntä', tr: 'onu', ending: ['tä', 'hal', 'partitiivi', 'häntä → sitä'] },
};

function colloquialResult(clean, lower, entry) {
  const ending = entry.ending || null;
  const rootText = ending ? clean.slice(0, clean.length - ending[0].length) : clean;
  const segments = [
    {
      text: rootText,
      kind: 'kok',
      label: ending ? 'kök · puhekieli' : 'kök · puhekieli',
      tr: entry.tr,
      note: entry.note || `Yazı dili: ${entry.lemma}.`,
      sure: true,
    },
  ];

  if (ending) {
    segments.push({
      text: clean.slice(clean.length - ending[0].length),
      kind: ending[1],
      label: ending[2],
      tr: ending[3],
      note: `Yazı dili: ${entry.lemma}.`,
      sure: true,
    });
  }

  return {
    word: clean,
    lower,
    harmony: vowelHarmony(lower),
    lemma: entry.lemma,
    lemmaTr: entry.tr,
    verified: true,
    colloquial: true,
    gradation: null,
    segments,
  };
}

/* ---------------- Kirjakieli ↔ Puhekieli ----------------
   Yalnızca kartta görünen biçim değişir; SM-2 anahtarı her zaman yazı dili
   biçimidir, böylece tekrar geçmişi iki kayıt arasında bölünmez. */

const PUHE_PHRASES = [
  ['he ovat', 'ne on'],
  ['me olemme', 'me ollaan'],
  ['te olette', 'te ootte'],
  ['onko sinulla', 'onks sulla'],
];

const PUHE_WORDS = {
  minä: 'mä',
  sinä: 'sä',
  hän: 'se',
  tämä: 'tää',
  tuo: 'toi',
  nämä: 'nää',
  nuo: 'noi',
  olen: 'oon',
  olet: 'oot',
  olemme: 'ollaan',
  olette: 'ootte',
  ovat: 'on',
  minulla: 'mulla',
  sinulla: 'sulla',
  hänellä: 'sillä',
  minun: 'mun',
  sinun: 'sun',
  hänen: 'sen',
  minua: 'mua',
  sinua: 'sua',
  häntä: 'sitä',
};

function matchCase(source, target) {
  const first = String(source).charAt(0);
  if (first && first === first.toLocaleUpperCase('fi') && first !== first.toLocaleLowerCase('fi')) {
    return target.charAt(0).toLocaleUpperCase('fi') + target.slice(1);
  }
  return target;
}

/* Kelime kelime eşleme + iki kelimelik kalıplar ("he ovat" → "ne on").
   Noktalama ve büyük harf korunur. */
function toPuhekieli(text) {
  const parts = String(text)
    .split(/(\s+)/)
    .filter((part) => part !== '');
  const out = [];

  for (let i = 0; i < parts.length; i += 1) {
    const current = parts[i];
    if (/^\s+$/.test(current)) {
      out.push(current);
      continue;
    }

    const spaced = parts[i + 1] && /^\s+$/.test(parts[i + 1]);
    const next = parts[i + 2];
    const clean = current.replace(/[^\p{L}]+$/u, '');
    const tail = current.slice(clean.length);

    if (spaced && next && !/^\s+$/.test(next)) {
      const nextClean = next.replace(/[^\p{L}]+$/u, '');
      const nextTail = next.slice(nextClean.length);
      const pair = `${clean} ${nextClean}`.toLocaleLowerCase('fi');
      const phrase = PUHE_PHRASES.find((entry) => entry[0] === pair);
      if (phrase) {
        out.push(matchCase(clean, phrase[1]) + nextTail);
        i += 2;
        continue;
      }
    }

    const key = clean.toLocaleLowerCase('fi');
    out.push((PUHE_WORDS[key] ? matchCase(clean, PUHE_WORDS[key]) : clean) + tail);
  }

  return out.join('');
}

function displayFi(text) {
  return progress.settings.register === 'puhe' ? toPuhekieli(text) : text;
}

/* ---------------- Morfoloji motoru ----------------
   Ekler uzundan kısaya denenir. Bir ek ancak geriye en az `min` harf
   bırakıyorsa ayrılır; kök sözlükte bulunursa çözüm "doğrulandı" sayılır,
   bulunamazsa "biçimsel tahmin" olarak işaretlenir. */

const SUFFIXES = [
  { sfx: 'massa', kind: 'fiil', label: '3. mastar · inessiivi', tr: '-irken / yaparken', note: 'puhumassa, lukemassa.', min: 3 },
  { sfx: 'mässä', kind: 'fiil', label: '3. mastar · inessiivi', tr: '-irken / yaparken', note: 'lukemässä.', min: 3 },
  { sfx: 'masta', kind: 'fiil', label: '3. mastar · elatiivi', tr: '-madan', note: 'puhumasta.', min: 3 },
  { sfx: 'mästä', kind: 'fiil', label: '3. mastar · elatiivi', tr: '-madan', note: 'lukemästä.', min: 3 },
  { sfx: 'maan', kind: 'fiil', label: '3. mastar · illatiivi', tr: '-maya', note: 'puhumaan.', min: 3 },
  { sfx: 'mään', kind: 'fiil', label: '3. mastar · illatiivi', tr: '-meye', note: 'lukemaan → lukemaan / -mään.', min: 3 },
  { sfx: 'minen', kind: 'yapim', label: 'isim-fiil', tr: '-me', note: 'lukeminen: yapım eki.', min: 3 },
  { sfx: 'misen', kind: 'yapim', label: 'isim-fiil · genetiivi', tr: '-menin', note: 'lukemisen.', min: 3 },
  { sfx: 'ssa', kind: 'hal', label: 'inessiivi', tr: 'içinde', note: '-ssa/-ssä: bulunma hâli.', min: 3 },
  { sfx: 'ssä', kind: 'hal', label: 'inessiivi', tr: 'içinde', note: '-ssa/-ssä: bulunma hâli.', min: 3 },
  { sfx: 'sta', kind: 'hal', label: 'elatiivi', tr: 'içinden / hakkında', note: 'pitää kahvista: -sta.', min: 3 },
  { sfx: 'stä', kind: 'hal', label: 'elatiivi', tr: 'içinden / hakkında', note: 'pitää -stä ile ister.', min: 3 },
  { sfx: 'lla', kind: 'hal', label: 'adessiivi', tr: '-de, üzerinde; ile', note: 'pöydällä: masada.', min: 3 },
  { sfx: 'llä', kind: 'hal', label: 'adessiivi', tr: '-de, üzerinde; ile', note: 'pöydällä / kylmällä.', min: 3 },
  { sfx: 'lta', kind: 'hal', label: 'ablatiivi', tr: '-den', note: 'pöydältä: masadan.', min: 3 },
  { sfx: 'ltä', kind: 'hal', label: 'ablatiivi', tr: '-den', note: 'kylmältä.', min: 3 },
  { sfx: 'lle', kind: 'hal', label: 'allatiivi', tr: '-e, için', note: 'minulle: bana.', min: 3 },
  { sfx: 'ksi', kind: 'hal', label: 'translatiivi', tr: '-e dönüşerek', note: 'opettajaksi: öğretmen olarak.', min: 3 },
  { sfx: 'tta', kind: 'hal', label: 'abessiivi', tr: '-sız', note: 'rahatta: parasız.', min: 3 },
  { sfx: 'ttä', kind: 'hal', label: 'abessiivi', tr: '-sız', note: 'rahatta / työttä.', min: 3 },
  { sfx: 'seen', kind: 'hal', label: 'illatiivi', tr: 'içine', note: 'huoneeseen: odaya.', min: 3 },
  { sfx: 'siin', kind: 'hal', label: 'illatiivi', tr: 'içine', note: 'kaupunkiin → kaupunkiin.', min: 3 },
  { sfx: 'hon', kind: 'hal', label: 'illatiivi', tr: 'içine', note: 'taloon → talohon (nadir).', min: 3 },
  { sfx: 'hön', kind: 'hal', label: 'illatiivi', tr: 'içine', note: 'työhön: işe.', min: 3 },
  { sfx: 'hun', kind: 'hal', label: 'illatiivi', tr: 'içine', note: 'kylmään / -hun.', min: 3 },
  { sfx: 'hyn', kind: 'hal', label: 'illatiivi', tr: 'içine', note: 'nurmeen / -hyn.', min: 3 },
  { sfx: 'vat', kind: 'fiil', label: '3. çoğul kişi', tr: 'onlar …-yor', note: 'puhuvat: konuşuyorlar.', min: 4 },
  { sfx: 'vät', kind: 'fiil', label: '3. çoğul kişi', tr: 'onlar …-yor', note: 'lukevät.', min: 4 },
  { sfx: 'mme', kind: 'iyelik', label: 'iyelik · 1. çoğul', tr: 'bizim', note: 'myös fiilde: puhumme.', min: 3 },
  { sfx: 'nne', kind: 'iyelik', label: 'iyelik · 2. çoğul', tr: 'sizin', note: 'myös fiilde: puhutte.', min: 3 },
  { sfx: 'nsa', kind: 'iyelik', label: 'iyelik · 3. kişi', tr: 'onun / onların', note: 'talonsa: evi.', min: 3 },
  { sfx: 'nsä', kind: 'iyelik', label: 'iyelik · 3. kişi', tr: 'onun / onların', note: 'kylmänsä.', min: 3 },
  { sfx: 'isi', kind: 'fiil', label: 'şart kipi', tr: '-se / -sa', note: 'tulisin: gelsem.', min: 3 },
  { sfx: 'kin', kind: 'klitik', label: 'klitik', tr: '-de / dahi', note: 'minäkin: ben de.', min: 3 },
  { sfx: 'kaan', kind: 'klitik', label: 'klitik (olumsuz)', tr: 'bile', note: 'ei kukaan / ei tullutkaan.', min: 3 },
  { sfx: 'kään', kind: 'klitik', label: 'klitik (olumsuz)', tr: 'bile', note: 'ei tullutkaan / -kään.', min: 3 },
  { sfx: 'han', kind: 'klitik', label: 'klitik', tr: 'pekiştirme', note: 'onhan: elbette var.', min: 3 },
  { sfx: 'hän', kind: 'klitik', label: 'klitik', tr: 'pekiştirme', note: 'onhan / -hän.', min: 3 },
  { sfx: 'ko', kind: 'soru', label: 'soru eki', tr: 'soru', note: 'Onko sinulla aikaa?', min: 3 },
  { sfx: 'kö', kind: 'soru', label: 'soru eki', tr: 'soru', note: 'Puhutko suomea?', min: 3 },
  { sfx: 'pa', kind: 'klitik', label: 'klitik', tr: 'pekiştirme', note: 'mene pois → menepäs.', min: 3 },
  { sfx: 'pä', kind: 'klitik', label: 'klitik', tr: 'pekiştirme', note: 'tulepä / -pä.', min: 3 },
  { sfx: 'ni', kind: 'iyelik', label: 'iyelik · 1. tekil', tr: 'benim', note: 'taloni: evim.', min: 3 },
  { sfx: 'si', kind: 'iyelik', label: 'iyelik · 2. tekil', tr: 'senin', note: 'talosi: evin; aynı zamanda geçmiş 3. kişi.', min: 3 },
  { sfx: 'na', kind: 'hal', label: 'essiivi', tr: 'olarak', note: 'opettajana: öğretmen olarak.', min: 3 },
  { sfx: 'nä', kind: 'hal', label: 'essiivi', tr: 'olarak', note: 'kylmänä.', min: 3 },
  { sfx: 'an', kind: 'hal', label: 'illatiivi', tr: 'içine', note: 'taloon: eve (kısa ünlü + n).', min: 3 },
  { sfx: 'än', kind: 'hal', label: 'illatiivi', tr: 'içine', note: 'kylmään: soğuğa.', min: 3 },
  { sfx: 'en', kind: 'hal', label: 'illatiivi', tr: 'içine', note: 'nurmeen: çayıra (nadir).', min: 3 },
  { sfx: 'on', kind: 'hal', label: 'illatiivi', tr: 'içine', note: 'taloon: eve.', min: 3 },
  { sfx: 'ön', kind: 'hal', label: 'illatiivi', tr: 'içine', note: 'työhön / -ön.', min: 3 },
  { sfx: 'un', kind: 'hal', label: 'illatiivi', tr: 'içine', note: 'työhön / -un (nadir).', min: 3 },
  { sfx: 'yn', kind: 'hal', label: 'illatiivi', tr: 'içine', note: 'kyllä + -yn (nadir).', min: 3 },
  { sfx: 't', kind: 'cogul', label: 'çoğul yalın', tr: 'çoğul', note: 'kahvit: kahveler.', min: 4 },
  { sfx: 'n', kind: 'fiil', label: '1. tekil kişi', tr: 'ben …-yorum', note: 'puhun: konuşuyorum.', min: 4 },
];

const GRADATION = [
  ['kk', 'k'],
  ['pp', 'p'],
  ['tt', 't'],
  ['nt', 'nn'],
  ['nk', 'ng'],
  ['mp', 'mm'],
  ['lt', 'll'],
  ['rt', 'rr'],
  ['lk', 'l'],
  ['rk', 'r'],
  ['p', 'v'],
  ['t', 'd'],
];

function vowelHarmony(word) {
  const chars = String(word).split('');
  const front = 'äöy';
  const back = 'aou';
  let order = 'nötr';
  for (let i = chars.length - 1; i >= 0; i -= 1) {
    if (front.indexOf(chars[i]) !== -1) {
      order = 'ön';
      break;
    }
    if (back.indexOf(chars[i]) !== -1) {
      order = 'arka';
      break;
    }
  }
  const vowels = chars.filter((c) => 'aeiouyäö'.indexOf(c) !== -1).join('');
  if (order === 'ön') return { order, note: `Ön ünlü uyumu · ${vowels}` };
  if (order === 'arka') return { order, note: `Arka ünlü uyumu · ${vowels}` };
  return { order, note: `Nötr ünlüler (e, i) · ${vowels}` };
}

/* Ünsüz yumuşaması: kök sözlükte yoksa, yumuşamış biçimden güçlü biçime
   dönerek sözlükte arama yapılır (kaupungi → kaupunki). */
function gradationBase(stem) {
  for (let p = 0; p < GRADATION.length; p += 1) {
    const strong = GRADATION[p][0];
    const weak = GRADATION[p][1];
    let index = stem.indexOf(weak);
    while (index !== -1) {
      const candidate = stem.slice(0, index) + strong + stem.slice(index + weak.length);
      const hit = LEXICON.get(candidate);
      if (hit) return { base: candidate, hit, from: weak, to: strong };
      index = stem.indexOf(weak, index + 1);
    }
  }
  return null;
}

function analyze(raw) {
  const clean = String(raw == null ? '' : raw).replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
  if (!clean) return null;

  const lower = clean.toLocaleLowerCase('fi');
  const harmony = vowelHarmony(lower);

  /* Puhekieli tablosu sözlükten önce gelir: "mä", "oon" gibi kartlar
     yalın sözlük maddesi olarak değil, yazı dili kökü + kişi/hâl eki
     olarak çözümlensin. */
  const colloquial = COLLOQUIAL[lower];
  if (colloquial) return colloquialResult(clean, lower, colloquial);

  const direct = LEXICON.get(lower);

  if (direct) {
    return {
      word: clean,
      lower,
      harmony,
      lemma: lower,
      lemmaTr: direct.tr,
      verified: true,
      gradation: null,
      segments: [
        {
          text: clean,
          kind: 'kok',
          label: 'kök',
          tr: direct.tr,
          note: 'Sözlükteki yalın biçim; ek yok.',
          sure: true,
        },
      ],
    };
  }

  let stem = lower;
  const taken = [];

  for (let step = 0; step < 3; step += 1) {
    const hit = SUFFIXES.find((entry) => stem.length - entry.sfx.length >= entry.min && stem.endsWith(entry.sfx));
    if (!hit) break;
    taken.unshift(hit);
    stem = stem.slice(0, stem.length - hit.sfx.length);
    if (LEXICON.has(stem)) break;
  }

  let lemmaHit = LEXICON.get(stem) || null;
  let gradation = null;
  if (!lemmaHit) {
    gradation = gradationBase(stem);
    if (gradation) lemmaHit = gradation.hit;
  }

  const segments = [];

  if (!taken.length) {
    segments.push({
      text: clean,
      kind: 'kok',
      label: 'kök',
      tr: lemmaHit ? lemmaHit.tr : '—',
      note: lemmaHit ? 'Sözlükteki biçim.' : 'Sözlükte yok; ek de çözülemedi.',
      sure: Boolean(lemmaHit),
    });
  } else {
    const suffixLength = taken.reduce((total, entry) => total + entry.sfx.length, 0);
    const rootLength = clean.length - suffixLength;
    segments.push({
      text: clean.slice(0, rootLength),
      kind: 'kok',
      label: gradation ? 'kök · yumuşama' : 'kök',
      tr: lemmaHit ? lemmaHit.tr : '—',
      note: lemmaHit
        ? gradation
          ? `Yalın biçim ${gradation.base} · ${gradation.from} → ${gradation.to}.`
          : 'Sözlükte doğrulandı.'
        : 'Sözlükte doğrulanamadı; biçimsel tahmin.',
      sure: Boolean(lemmaHit),
    });

    let cursor = rootLength;
    taken.forEach((entry) => {
      segments.push({
        text: clean.slice(cursor, cursor + entry.sfx.length),
        kind: entry.kind,
        label: entry.label,
        tr: entry.tr,
        note: entry.note,
        sure: Boolean(lemmaHit),
      });
      cursor += entry.sfx.length;
    });
  }

  return {
    word: clean,
    lower,
    harmony,
    lemma: lemmaHit ? (gradation ? gradation.base : stem) : null,
    lemmaTr: lemmaHit ? lemmaHit.tr : null,
    verified: Boolean(lemmaHit),
    gradation,
    segments,
  };
}

function tokenize(text) {
  return String(text)
    .split(/(\s+)/)
    .filter((part) => part.length > 0)
    .map((part) => ({ raw: part, word: /\p{L}/u.test(part) }));
}

function xrayHtml(result) {
  if (!result) {
    return '<p class="xray-empty">Kök ve ekleri görmek için bir kelimeye dokun.</p>';
  }

  const segments = result.segments
    .map(
      (segment) =>
        `<span class="morf morf--${segment.kind}${segment.sure ? '' : ' is-guess'}" title="${esc(
          segment.label,
        )}">${esc(segment.text)}</span>`,
    )
    .join('');

  const rows = result.segments
    .map(
      (segment) =>
        `<div class="xray-row"><dt>${esc(segment.label)}</dt><dd><b>${esc(segment.text)}</b> — ${esc(
          segment.tr,
        )}${segment.note ? ` <span class="sub">${esc(segment.note)}</span>` : ''}</dd></div>`,
    )
    .join('');

  const gradationRow = result.gradation
    ? `<div class="xray-row"><dt>Yumuşama</dt><dd><b>${esc(result.gradation.from)} → ${esc(
        result.gradation.to,
      )}</b> <span class="sub">${esc(result.gradation.base)} yalın biçimiyle doğrulandı.</span></dd></div>`
    : '';

  return `
    <div class="xray">
      <p class="xray-head">Röntgen · <span>${esc(result.word)}</span>${
        result.verified ? '' : ' <em>biçimsel tahmin</em>'
      }</p>
      <p class="xray-word">${segments}</p>
      <dl class="xray-rows">
        ${rows}
        ${gradationRow}
        <div class="xray-row"><dt>Ünlü uyumu</dt><dd>${esc(result.harmony.note)}</dd></div>
      </dl>
    </div>`;
}

/* ---------------- Görünüm durumu ---------------- */

const state = {
  view: 'study',
  week: String(currentWeekId()),
  session: null,
  flipped: false,
  token: null,
  search: '',
  labWord: '',
};

function announce(message) {
  const el = document.getElementById('srStatus');
  if (el) el.textContent = message;
}

function currentCard() {
  if (!state.session || !state.session.queue.length) return null;
  return state.session.queue[0];
}

function startSession(week, options) {
  const opts = options || {};
  const target = week == null ? state.week : String(week);
  state.week = target;
  const queue = opts.free ? shuffle(poolFor(target)).slice(0, 10) : buildQueue(target);
  state.session = {
    queue,
    total: queue.length,
    done: 0,
    correct: 0,
    repeated: new Set(),
    free: Boolean(opts.free),
  };
  state.flipped = false;
  state.token = null;
}

/* ---------------- Çizim ---------------- */

function renderMast() {
  const theme = progress.settings.theme === 'fjord' ? 'fjord' : 'linen';
  document.body.dataset.theme = theme;

  const streak = document.getElementById('mastStreak');
  if (streak) {
    const days = currentStreak();
    streak.textContent = days > 0 ? `seri ${days} gün` : 'seri —';
  }

  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.textContent = theme === 'fjord' ? THEMES.linen : THEMES.fjord;
    toggle.setAttribute('aria-pressed', String(theme === 'fjord'));
  }
}

function renderRail() {
  const rail = document.getElementById('weekRail');
  if (!rail) return;
  const activeWeek = String(state.week);

  rail.innerHTML = WEEKS.map((week) => {
    const cards = poolFor(week.id);
    const learned = cards.filter((card) => cardState(card.id).reps > 0).length;
    const fill = cards.length ? learned / cards.length : 0;
    return `<button type="button" class="tick" data-week="${week.id}" style="--fill:${fill.toFixed(
      3,
    )}" aria-label="Hafta ${week.id}: ${learned} / ${cards.length} kart öğrenildi" title="Hafta ${
      week.id
    } · ${esc(week.title)}"${activeWeek === String(week.id) ? ' aria-current="true"' : ''}><span class="tick-bar"></span></button>`;
  }).join('');
}

function answerHtml(card) {
  return `<div class="answer"><p class="tr">${esc(card.tr)}</p>${
    card.note ? `<p class="note">${esc(card.note)}</p>` : ''
  }</div>`;
}

function endHtml(session) {
  const percent = session.done ? Math.round((session.correct / session.done) * 100) : 0;
  return `<article class="focus">
    <p class="eyebrow"><span>Oturum tamam</span><span>Hafta ${esc(state.week)}</span></p>
    <p class="end-line"><b>${session.done}</b> kart · <b>${session.correct}</b> doğru · %${percent}</p>
    <p class="lede">Kuyruk boşaldı. Yeni oturum, tekrar zamanı gelen kartlarla devam eder.</p>
    <div class="actions">
      <button class="btn btn--primary" type="button" data-act="new-session">Yeni oturum</button>
      <button class="btn" type="button" data-act="free-session">Serbest tekrar (10)</button>
    </div>
  </article>`;
}

function emptyHtml() {
  return `<article class="focus">
    <p class="eyebrow"><span>Hafta ${esc(state.week)}</span><span>tekrar yok</span></p>
    <p class="end-line">Bu hafta için bekleyen kart yok.</p>
    <p class="lede">Yeni kartlar eklemek için başka bir hafta seç ya da serbest tekrarla dön.</p>
    <div class="actions">
      <button class="btn btn--primary" type="button" data-act="free-session">Serbest tekrar (10)</button>
      <button class="btn" type="button" data-act="open-index">Dizini aç</button>
    </div>
  </article>`;
}

/* Çift ünlü / çift ünsüz: aynı harfin yan yana gelmesi bir "uzun" vuruş sayılır. */
function geminateBeats(word) {
  const text = String(word);
  const beats = [];
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    const letter = /\p{L}/u.test(char);
    if (letter && next === char) {
      beats.push({ char: char + next, geminate: true, letter: true });
      i += 1;
    } else {
      beats.push({ char, geminate: false, letter });
    }
  }
  return beats;
}

function rhythmHtml(text) {
  const words = String(text)
    .split(/\s+/)
    .filter(Boolean);
  const groups = [];
  const gems = [];

  words.forEach((word) => {
    const bars = geminateBeats(word)
      .filter((beat) => beat.letter)
      .map((beat) => {
        if (beat.geminate) gems.push(beat.char);
        return `<span class="bar${beat.geminate ? ' bar--long' : ''}"></span>`;
      })
      .join('');
    groups.push(`<span class="rhythm-word">${bars}</span>`);
  });

  const unique = gems.filter((gem, index) => gems.indexOf(gem) === index);
  const label = unique.length ? `Ritim · çift ses: ${unique.join(' · ')}` : 'Ritim · çift ses yok';

  return `<div class="rhythm" aria-hidden="true">${groups.join('')}</div>
    <p class="rhythm-label">${esc(label)}</p>`;
}

function speechAvailable() {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.speechSynthesis) &&
    typeof SpeechSynthesisUtterance !== 'undefined'
  );
}

function speak(rate) {
  const card = currentCard();
  if (!card) return;
  const text = displayFi(card.fi);
  if (!speechAvailable()) {
    announce('Bu tarayıcı sesli okumayı desteklemiyor');
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'fi-FI';
  utterance.rate = rate;
  synth.speak(utterance);
  announce(`${text} · ${rate === 1 ? 'normal hız' : `${rate}× yavaş`}`);
}

function setRegister(mode) {
  progress.settings.register = mode === 'puhe' ? 'puhe' : 'kirja';
  saveProgress();
  state.token = null;
  renderStudy();
  announce(`${REGISTERS[progress.settings.register]} biçimi`);
}

function renderStudy() {
  const el = document.getElementById('view-study');
  if (!el) return;
  if (!state.session) startSession(state.week);

  const session = state.session;
  if (!session.queue.length) {
    el.innerHTML = session.done ? endHtml(session) : emptyHtml();
    return;
  }

  const card = session.queue[0];
  const remaining = session.queue.length;
  const total = session.done + remaining;
  const percent = total ? (session.done / total) * 100 : 0;

  const shown = displayFi(card.fi);
  const register = progress.settings.register === 'puhe' ? 'puhe' : 'kirja';

  const prompt = tokenize(shown)
    .map((part) =>
      part.word
        ? `<button type="button" class="token" data-token="${esc(part.raw)}">${esc(part.raw)}</button>`
        : `<span class="punct">${esc(part.raw)}</span>`,
    )
    .join('');

  const registerSwitch = `<div class="register" role="group" aria-label="Dil kaydı">
      <button type="button" data-register="kirja" aria-pressed="${register === 'kirja'}">Kirjakieli</button>
      <button type="button" data-register="puhe" aria-pressed="${register === 'puhe'}">Puhekieli</button>
    </div>`;

  const listen = speechAvailable()
    ? `<div class="listen">
        <button type="button" class="listen-btn" data-speak="0.75">Dinle · 0,75×</button>
        <button type="button" class="listen-btn" data-speak="1">Dinle · 1,0×</button>
      </div>`
    : '';

  const grades = [0, 1, 2, 3]
    .map((grade) => {
      const ghost = nextState(cardState(card.id), grade);
      return `<button type="button" class="grade" data-grade="${grade}">
        <span class="g-key">${grade + 1}</span>
        <span class="g-label">${GRADE_LABELS[grade]}</span>
        <span class="g-when">${intervalText(ghost, grade)}</span>
      </button>`;
    })
    .join('');

  el.innerHTML = `<article class="focus">
    <p class="eyebrow"><span>Hafta ${card.week}</span><span>${esc(card.type)}</span><span>${pad2(
      session.done + 1,
    )} / ${pad2(total)}</span></p>
    <div class="track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(
      percent,
    )}"><span style="width:${percent.toFixed(1)}%"></span></div>
    ${registerSwitch}
    <p class="prompt">${prompt}</p>
    ${rhythmHtml(shown)}
    ${listen}
    <p class="hint">Kelimeye dokun · kök ve ek röntgeni</p>
    ${
      state.flipped
        ? answerHtml(card)
        : '<button type="button" class="btn btn--primary reveal" data-act="reveal">Anlamı göster</button>'
    }
    ${state.flipped ? `<div class="grades" role="group" aria-label="Kendini puanla">${grades}</div>` : ''}
  </article>
  <div class="xray-slot" id="xraySlot">${
    state.token ? xrayHtml(analyze(state.token)) : xrayHtml(null)
  }</div>`;
}

function weekRow(week) {
  const cards = poolFor(week.id);
  const learned = cards.filter((card) => cardState(card.id).reps > 0).length;
  const percent = cards.length ? Math.round((learned / cards.length) * 100) : 0;
  return `<button type="button" class="week-row" data-week="${week.id}">
    <span class="week-num">${pad2(week.id)}</span>
    <span class="week-body">
      <span class="week-title">${esc(week.title)}</span>
      <span class="week-focus">${esc(week.focus)}</span>
    </span>
    <span class="week-count">${learned}<i>/${cards.length}</i><span class="week-bar"><span style="width:${percent}%"></span></span></span>
  </button>`;
}

function resultRow(card) {
  return `<button type="button" class="result" data-lab="${esc(card.fi)}">
    <span class="result-fi">${esc(card.fi)}</span>
    <span class="result-tr">${esc(card.tr)}</span>
    <span class="result-tag">Hafta ${card.week}</span>
  </button>`;
}

function renderIndex() {
  const body = document.getElementById('indexBody');
  if (!body) return;

  const query = state.search.trim().toLocaleLowerCase('tr');
  if (query) {
    const hits = ALL_CARDS.filter(
      (card) =>
        card.fi.toLocaleLowerCase('tr').indexOf(query) !== -1 ||
        card.tr.toLocaleLowerCase('tr').indexOf(query) !== -1,
    ).slice(0, 40);
    body.innerHTML = hits.length
      ? `<div class="results">${hits.map(resultRow).join('')}</div>`
      : '<p class="empty">Eşleşme yok. Fince ya da Türkçe bir parça dene.</p>';
    return;
  }

  body.innerHTML = `<div class="week-list">${WEEKS.map(weekRow).join('')}</div>`;
}

const LAB_SAMPLES = ['kaupungissani', 'talossa', 'lukemassa', 'pidän', 'metsässä', 'opettajaksi'];

function renderLabChips() {
  const chips = document.getElementById('labChips');
  if (!chips || chips.dataset.ready === 'true') return;
  chips.dataset.ready = 'true';
  chips.innerHTML = LAB_SAMPLES.map(
    (word) => `<button type="button" class="chip" data-lab="${esc(word)}">${esc(word)}</button>`,
  ).join('');
}

function renderLabOutput() {
  const out = document.getElementById('labOut');
  if (!out) return;
  out.innerHTML = xrayHtml(analyze(state.labWord));
}

function renderLedger() {
  const el = document.getElementById('view-ledger');
  if (!el) return;

  const goal = progress.settings.goal || DEFAULT_GOAL;
  const theme = progress.settings.theme === 'fjord' ? 'fjord' : 'linen';
  const learned = learnedCount();
  const answers = progress.stats.answers || 0;
  const correct = progress.stats.correct || 0;
  const accuracy = answers ? Math.round((correct / answers) * 100) : 0;
  const today = progress.stats.day === dayKey() ? progress.stats.dayCount || 0 : 0;
  const due = ALL_CARDS.filter((card) => {
    const cardInfo = cardState(card.id);
    return cardInfo.reps > 0 && cardInfo.due <= Date.now();
  }).length;

  el.innerHTML = `<h1 class="view-title">Kayıt</h1>
    <p class="lede">Aralıklı tekrarın muhasebesi; her satır bir ölçüm, süs yok.</p>
    <dl class="ledger">
      <div><dt>Öğrenilen</dt><dd><b>${learned}</b><span> / ${ALL_CARDS.length}</span></dd></div>
      <div><dt>Bugün</dt><dd><b>${today}</b><span> / ${goal}</span></dd></div>
      <div><dt>Tekrar bekleyen</dt><dd><b>${due}</b></dd></div>
      <div><dt>Doğru oranı</dt><dd><b>${accuracy}%</b><span> ${correct} / ${answers}</span></dd></div>
      <div><dt>Seri</dt><dd><b>${currentStreak()}</b><span> gün</span></dd></div>
    </dl>
    <h2 class="sub-title">Ayarlar</h2>
    <div class="settings">
      <label class="setting"><span>Günlük hedef</span>
        <input id="goalInput" type="number" min="4" max="60" step="1" inputmode="numeric" value="${goal}">
      </label>
      <label class="setting"><span>Tema</span>
        <select id="themeSelect">
          ${Object.keys(THEMES)
            .map(
              (key) =>
                `<option value="${key}"${theme === key ? ' selected' : ''}>${THEMES[key]}</option>`,
            )
            .join('')}
        </select>
      </label>
    </div>
    <div class="actions">
      <button class="btn" type="button" data-act="backup">Yedek al</button>
      <label class="btn btn--file">Yedek yükle
        <input id="backupFile" class="sr-only" type="file" accept="application/json,.json">
      </label>
      <button class="btn btn--quiet" type="button" data-act="reset">İlerlemeyi sıfırla</button>
    </div>`;
}

function setView(view, options) {
  if (VIEW_LIST.indexOf(view) === -1) return;
  state.view = view;

  document.querySelectorAll('[data-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.panel !== view;
  });
  document.querySelectorAll('[data-tab]').forEach((button) => {
    if (button.dataset.tab === view) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });

  if (view === 'study') renderStudy();
  if (view === 'index') renderIndex();
  if (view === 'lab') {
    renderLabChips();
    renderLabOutput();
  }
  if (view === 'ledger') renderLedger();

  if (!options || !options.silent) announce(`${VIEW_NAMES[view]} bölümü`);
}

function renderAll() {
  renderMast();
  renderRail();
  renderStudy();
  renderIndex();
  renderLabChips();
  renderLabOutput();
  renderLedger();
}

/* ---------------- Oturum eylemleri ---------------- */

function reveal() {
  if (!state.session || !state.session.queue.length) return;
  state.flipped = true;
  renderStudy();
  const card = currentCard();
  if (card) announce(`${card.fi} · ${card.tr}`);
}

function answer(grade) {
  if (!state.flipped) return;
  const card = currentCard();
  if (!card) return;

  const session = state.session;
  const next = gradeCard(card, grade);

  session.done += 1;
  if (grade > 0) session.correct += 1;
  session.queue.shift();
  if (grade === 0 && !session.repeated.has(card.id)) {
    session.repeated.add(card.id);
    session.queue.push(card);
  }

  state.flipped = false;
  state.token = null;

  announce(`${card.fi} · ${GRADE_LABELS[grade]} · sonraki tekrar ${intervalText(next, grade)}`);
  renderStudy();
  renderRail();
  renderMast();
}

function resetProgress() {
  if (typeof confirm === 'function' && !confirm('Bütün ilerleme silinsin mi?')) return;
  const settings = Object.assign({}, progress.settings);
  const blank = emptyProgress();
  blank.settings = settings;
  Object.keys(progress).forEach((key) => delete progress[key]);
  Object.assign(progress, blank);
  saveProgress();
  state.session = null;
  state.flipped = false;
  state.token = null;
  renderAll();
  announce('İlerleme sıfırlandı');
}

function exportBackup() {
  const payload = JSON.stringify(
    { app: 'suomi-kartat', exportedAt: new Date().toISOString(), progress },
    null,
    2,
  );
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'suomi-kartat-yedek.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  announce('Yedek indirildi');
}

function importBackup(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const incoming = parsed && parsed.progress ? parsed.progress : parsed;
      if (!incoming || typeof incoming !== 'object' || !incoming.cards) throw new Error('geçersiz');
      const settings = Object.assign({}, progress.settings);
      const next = normalizeProgress(incoming);
      next.settings = Object.assign({}, next.settings, settings);
      Object.keys(progress).forEach((key) => delete progress[key]);
      Object.assign(progress, next);
      saveProgress();
      state.session = null;
      renderAll();
      announce('Yedek yüklendi');
    } catch (error) {
      announce('Yedek okunamadı');
    }
  };
  reader.readAsText(file);
}

function runAction(action) {
  if (action === 'reveal') {
    reveal();
    return;
  }
  if (action === 'new-session') {
    startSession(state.week);
    renderStudy();
    announce('Yeni oturum');
    return;
  }
  if (action === 'free-session') {
    startSession(state.week, { free: true });
    renderStudy();
    announce('Serbest tekrar başladı');
    return;
  }
  if (action === 'open-index') {
    setView('index');
    return;
  }
  if (action === 'backup') {
    exportBackup();
    return;
  }
  if (action === 'reset') {
    resetProgress();
  }
}

/* ---------------- Olaylar ---------------- */

function onDockClick(event) {
  const button = event.target.closest('[data-tab]');
  if (button) setView(button.dataset.tab);
}

function onMainClick(event) {
  const target = event.target;
  if (!target || !target.closest) return;

  const token = target.closest('[data-token]');
  if (token) {
    state.token = token.dataset.token;
    const slot = document.getElementById('xraySlot');
    if (slot) slot.innerHTML = xrayHtml(analyze(state.token));
    return;
  }

  const week = target.closest('[data-week]');
  if (week) {
    startSession(week.dataset.week);
    setView('study', { silent: true });
    announce(`Hafta ${week.dataset.week} oturumu`);
    return;
  }

  const registerButton = target.closest('[data-register]');
  if (registerButton) {
    setRegister(registerButton.dataset.register);
    return;
  }

  const speakButton = target.closest('[data-speak]');
  if (speakButton) {
    speak(Number(speakButton.dataset.speak));
    return;
  }

  const lab = target.closest('[data-lab]');
  if (lab) {
    state.labWord = lab.dataset.lab;
    const input = document.getElementById('labInput');
    if (input) input.value = state.labWord;
    setView('lab', { silent: true });
    renderLabChips();
    renderLabOutput();
    announce(`${state.labWord} çözümlendi`);
    return;
  }

  const grade = target.closest('[data-grade]');
  if (grade) {
    answer(Number(grade.dataset.grade));
    return;
  }

  const action = target.closest('[data-act]');
  if (action) runAction(action.dataset.act);
}

function onMainChange(event) {
  const target = event.target;
  if (!target) return;

  if (target.id === 'goalInput') {
    const value = Math.max(4, Math.min(60, Number(target.value) || DEFAULT_GOAL));
    progress.settings.goal = value;
    saveProgress();
    renderLedger();
    announce(`Günlük hedef ${value}`);
    return;
  }

  if (target.id === 'themeSelect') {
    setTheme(target.value);
    return;
  }

  if (target.id === 'backupFile') {
    importBackup(target.files && target.files[0]);
  }
}

function setTheme(theme) {
  progress.settings.theme = theme === 'fjord' ? 'fjord' : 'linen';
  saveProgress();
  renderMast();
  announce(THEMES[progress.settings.theme] + ' teması');
}

function onKeyDown(event) {
  if (state.view !== 'study') return;
  const target = event.target;
  const tag = target && target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  if (event.key === 'Enter' || event.key === ' ') {
    if (target && target.closest && target.closest('button')) return;
    if (!state.flipped) {
      event.preventDefault();
      reveal();
    }
    return;
  }

  if (state.flipped && ['1', '2', '3', '4'].indexOf(event.key) !== -1) {
    event.preventDefault();
    answer(Number(event.key) - 1);
  }
}

function init() {
  const dock = document.getElementById('dock');
  if (dock) dock.addEventListener('click', onDockClick);

  const main = document.getElementById('studyo');
  if (main) {
    main.addEventListener('click', onMainClick);
    main.addEventListener('change', onMainChange);
  }

  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      setTheme(progress.settings.theme === 'fjord' ? 'linen' : 'fjord');
    });
  }

  const search = document.getElementById('searchInput');
  if (search) {
    search.addEventListener('input', (event) => {
      state.search = event.target.value;
      renderIndex();
    });
  }

  const labInput = document.getElementById('labInput');
  if (labInput) {
    labInput.addEventListener('input', (event) => {
      state.labWord = event.target.value;
      renderLabOutput();
    });
  }

  document.addEventListener('keydown', onKeyDown);

  renderMast();
  renderRail();
  renderLabChips();
  setView('study', { silent: true });
}

if (typeof document !== 'undefined' && document.getElementById && document.getElementById('studyo')) {
  init();
}

/* Test ve laboratuvar için motor dışa açılır; uygulama bunu kullanmaz. */
if (typeof globalThis !== 'undefined') {
  globalThis.SuomiKartat = {
    analyze,
    COLLOQUIAL,
    tokenize,
    vowelHarmony,
    nextState,
    gradeCard,
    cardState,
    buildQueue,
    poolFor,
    dueCount,
    learnedCount,
    progress,
    state,
    setView,
    renderAll,
    toPuhekieli,
    displayFi,
    geminateBeats,
    rhythmHtml,
    speak,
    setRegister,
    speechAvailable,
    REGISTERS,
    progressSettings: progress.settings,
  };
}
