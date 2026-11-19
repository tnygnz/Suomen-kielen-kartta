/* Suomi Kartat — Morfoloji & Dil Stüdyosu
   ------------------------------------------------------------------
   Veri      : data.js (WEEKS, ALL_CARDS) — dokunulmaz.
   Tekrar    : SM-2 sadeleştirmesi (ease faktörü + gün bazlı aralık),
               eski uygulamadaki katsayılarla birebir korunur.
   Katman 1  : editoryal arayüz (styles.css), iki mod, kıl payı çizgiler.
   Katman 2  : canlı kök & ek röntgeni — karttaki her kelime ve laboratuvar.
   ------------------------------------------------------------------ */

const STORE_KEY = 'suomi-kartat-v2';
const LEGACY_STORE_KEYS = ['suomi-kartat-v1'];
const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_EASE = 1.3;
const SESSION_LIMIT = 30;
const NEW_CARD_LIMIT = 12;
const DEFAULT_GOAL = 20;
const GRADE_LABELS = ['Tekrar', 'Zor', 'İyi', 'Kolay'];
const THEMES = { linen: 'Aydınlık', fjord: 'Gece Modu' };
const REGISTERS = { kirja: 'Kirjakieli', puhe: 'Puhekieli' };
const VIEW_NAMES = { path: 'Yolculuk', study: 'Oturum', index: 'Sözlük', lab: 'AI Koç', immerse: 'Dalma' };
const VIEW_LIST = ['path', 'study', 'index', 'lab', 'immerse'];
const SPEED_MS = 8000;
const SPEED_LIMIT = 10;
const HARD_LIMIT = 12;

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
    favorites: {},
    custom: [],
    settings: { goal: DEFAULT_GOAL, theme: 'linen', register: 'kirja' },
    stats: {
      day: '',
      dayCount: 0,
      answers: 0,
      correct: 0,
      streak: { last: null, days: 0 },
      lastSession: null,
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
    favorites: parsed.favorites && typeof parsed.favorites === 'object' ? parsed.favorites : {},
    custom: Array.isArray(parsed.custom) ? parsed.custom : [],
    settings: Object.assign({}, blank.settings, parsed.settings || {}),
    stats: Object.assign({}, blank.stats, stats, {
      streak: Object.assign({}, blank.stats.streak, stats.streak || {}),
    }),
    history: parsed.history && typeof parsed.history === 'object' ? parsed.history : {},
  };
}

/* Bütün katmanlar tek kayıtta yaşar: SM-2 kartları, seri, zor kelime
   ölçümleri, favoriler ve kişisel kartlar aynı `progress` nesnesinin
   alanlarıdır; `saveProgress()` hepsini tek anahtara yazar. Eski v1 kaydı
   varsa bir kez v2'ye taşınır; uygulama artık v1'e yazmaz. */
function loadProgress() {
  let raw = readStore(STORE_KEY);
  let legacy = false;
  if (!raw) {
    for (let i = 0; i < LEGACY_STORE_KEYS.length; i += 1) {
      const old = readStore(LEGACY_STORE_KEYS[i]);
      if (old) {
        raw = old;
        legacy = true;
        break;
      }
    }
  }
  let parsed = null;
  try {
    parsed = JSON.parse(raw || 'null');
  } catch (error) {
    parsed = null;
  }
  const normalized = normalizeProgress(parsed);
  if (legacy) writeStore(STORE_KEY, JSON.stringify(normalized));
  return normalized;
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

/* ---------------- Günlük hedef ve haftalık çizgi ---------------- */

function todayCount() {
  return progress.stats.day === dayKey() ? progress.stats.dayCount || 0 : 0;
}

function goalInfo() {
  const goal = progress.settings.goal || DEFAULT_GOAL;
  const today = todayCount();
  return {
    today,
    goal,
    percent: Math.min(100, Math.round((today / Math.max(1, goal)) * 100)),
    streak: currentStreak(),
  };
}

/* Günlük hedef halkası: tek çizgi, bakır yay; süs yok. */
function streakRingHtml() {
  const info = goalInfo();
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (circumference * info.percent) / 100;
  return `<figure class="streak-ring" aria-label="Günlük hedef ${info.today} / ${info.goal} kart, seri ${info.streak} gün">
    <svg viewBox="0 0 84 84" fill="none" aria-hidden="true">
      <circle class="ring-track" cx="42" cy="42" r="${radius}" />
      <circle class="ring-fill" cx="42" cy="42" r="${radius}" stroke-dasharray="${circumference.toFixed(
        2,
      )}" stroke-dashoffset="${offset.toFixed(2)}" transform="rotate(-90 42 42)" />
    </svg>
    <figcaption><b>${info.today}</b><span> / ${info.goal} kart</span><em>seri ${info.streak} gün</em></figcaption>
  </figure>`;
}

/* Son yedi günün cevap sayısı: tek kırık çizgi. */
function weekLineHtml() {
  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const key = shiftKey(dayKey(), -i);
    days.push({ key, count: progress.history[key] || 0 });
  }
  const max = Math.max(1, ...days.map((day) => day.count));
  const points = days
    .map((day, index) => {
      const x = 2 + (index / 6) * 116;
      const y = 34 - (day.count / max) * 26;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const dots = days
    .map((day, index) => {
      const x = 2 + (index / 6) * 116;
      const y = 34 - (day.count / max) * 26;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.6" />`;
    })
    .join('');
  return `<svg class="week-line" viewBox="0 0 120 40" preserveAspectRatio="none" aria-hidden="true">
    <line x1="0" y1="34" x2="120" y2="34" />
    <polyline points="${points}" />
    ${dots}
  </svg>`;
}

/* ---------------- Sözlük ---------------- */

const LEXICON = new Map();
ALL_CARDS.forEach((card) => {
  if (card.type !== 'kelime') return;
  const key = card.fi.toLocaleLowerCase('fi');
  if (!LEXICON.has(key)) LEXICON.set(key, card);
});

/* ---------------- Modüler mimari ----------------
   Memrise'ın modül → kademe bölümlemesinden esinlenir: her hafta bir modül,
   modül beş kartlık kademelere ayrılır. Kademenin durumu bir "büyüme evresi"
   ile okunur (tohum → filiz → yaprak → dal → çiçek). SM-2 durumu değişmez;
   kademe yalnızca aynı modülün kartlarını gruplar, sıralamayı motor yapar. */

const LEVEL_SIZE = 5;
const GROWTH_STAGES = ['Tohum', 'Filiz', 'Yaprak', 'Dal', 'Çiçek'];

const MODULES = WEEKS.map((week) => {
  const cards = poolFor(week.id);
  const ordered = cards
    .filter((card) => card.type === 'kelime')
    .concat(cards.filter((card) => card.type !== 'kelime'));
  const levels = [];
  for (let i = 0; i < ordered.length; i += LEVEL_SIZE) {
    levels.push({
      id: `${week.id}.${levels.length + 1}`,
      week: week.id,
      index: levels.length + 1,
      cards: ordered.slice(i, i + LEVEL_SIZE),
    });
  }
  return { id: week.id, title: week.title, focus: week.focus, cards, levels };
});

function moduleFor(week) {
  const id = Number(week);
  return MODULES.find((module) => module.id === id) || null;
}

function levelFor(levelId) {
  const parts = String(levelId == null ? '' : levelId).split('.');
  const module = moduleFor(parts[0]);
  if (!module) return null;
  return module.levels.find((level) => level.id === String(levelId)) || null;
}

function levelLearned(level) {
  return level.cards.filter((card) => cardState(card.id).reps > 0).length;
}

function levelPercent(level) {
  return level.cards.length ? Math.round((levelLearned(level) / level.cards.length) * 100) : 0;
}

function growthStage(level) {
  const learned = levelLearned(level);
  if (!learned) return 0;
  const ratio = learned / level.cards.length;
  if (ratio >= 1) return 4;
  if (ratio >= 0.6) return 3;
  if (ratio >= 0.3) return 2;
  return 1;
}

/* Gölgesiz, keskin geometrik semboller: her evre tek bir 1px işaret,
   miter birleşim, dolgu yok. Renk currentColor ile temaya uyar. */
function growthGlyph(stage, extra) {
  const marks = [
    '<path d="M8 9.2 11 12 8 14.8 5 12Z" />',
    '<path d="M8 14.5V8M8 10.5 5.6 8M8 12.5 10.4 10" />',
    '<path d="M8 14.5V7M8 9.5 5 7.4M8 9.5 11 7.4" />',
    '<path d="M8 14.5V5.5M8 8 4.6 5.6M8 10.6 11.4 8.2M8 9.5 11.4 12" />',
    '<path d="M8 3.5v3M8 9.5v3M3.5 8h3M9.5 8h3M8 6.2 9.8 8 8 9.8 6.2 8Z" />',
  ];
  const mark = marks[stage] || marks[0];
  return `<svg class="ico ico--growth${extra ? ' ' + extra : ''}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linejoin="miter" aria-hidden="true">${mark}</svg>`;
}

function markGlyph() {
  return '<svg class="ico ico--mark" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true"><path d="M8 1.5 14.5 8 8 14.5 1.5 8Z" /><path d="M8 5.4v5.2M6.3 8.6 8 10.3l1.7-1.7" /></svg>';
}

/* Bir kademenin kuyruğu: tekrarı gelenler önce, sonra yeni kartlar,
   en son henüz vakti gelmemiş olanlar. */
function buildLevelQueue(level, now) {
  const at = typeof now === 'number' ? now : Date.now();
  const due = level.cards
    .filter((card) => {
      const s = cardState(card.id);
      return s.reps > 0 && s.due <= at;
    })
    .sort((a, b) => cardState(a.id).due - cardState(b.id).due);
  const fresh = shuffle(level.cards.filter((card) => cardState(card.id).reps === 0));
  const later = shuffle(
    level.cards.filter((card) => {
      const s = cardState(card.id);
      return s.reps > 0 && s.due > at;
    }),
  );
  return due.concat(fresh, later);
}

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
  filter: 'all',
  hub: false,
  summary: false,
  speedTimer: null,
  speedStart: 0,
  coach: { tab: 'dialog', scenario: 0, turn: 0, picked: null, showTr: false, hint: false, key: '', options: [] },
  pron: { index: 0, heard: '', heardOk: false },
  immerse: { index: 0, showTr: false },
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
  const level = opts.level ? levelFor(opts.level) : null;
  let queue;
  let mode = 'new';
  if (level) {
    queue = buildLevelQueue(level);
    mode = 'level';
  } else if (opts.speed) {
    queue = buildSpeedQueue(target);
    mode = 'speed';
  } else if (opts.hard) {
    queue = hardPool(target);
    mode = 'hard';
  } else if (opts.free) {
    queue = shuffle(poolFor(target)).slice(0, 10);
    mode = 'free';
  } else {
    queue = buildQueue(target);
  }
  state.session = {
    queue,
    total: queue.length,
    done: 0,
    correct: 0,
    repeated: new Set(),
    free: Boolean(opts.free),
    mode,
    level: level ? level.id : null,
  };
  state.flipped = false;
  state.token = null;
  state.hub = false;
  state.summary = false;
  clearSpeed();
}

/* ---------------- Çizim ---------------- */

/* Ünite adımlarının dairesel ikonları; yalnızca görsel, veriye dokunmaz. */
const STEP_ICONS = {
  words:
    '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H11v14H6.5A2.5 2.5 0 0 0 4 20.5Z"/><path d="M20 6.5A2.5 2.5 0 0 0 17.5 4H13v14h4.5A2.5 2.5 0 0 1 20 20.5Z"/></svg>',
  dialog:
    '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v10H9l-5 4.5V5Z"/><path d="M8 9h6M8 12h4"/></svg>',
  grammar:
    '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h6M7 6v12M14 6h6M17 6v12M10 12h7"/></svg>',
  quiz:
    '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 4h8v4a4 4 0 0 1-8 0Z"/><path d="M8 6H5v2a3 3 0 0 0 3 3M16 6h3v2a3 3 0 0 1-3 3M12 12v5M8 20h8"/></svg>',
};

const CHEVRON_ICON =
  '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';

function renderMast() {
  const theme = progress.settings.theme === 'fjord' ? 'fjord' : 'linen';
  document.body.dataset.theme = theme;

  const streak = document.getElementById('mastStreak');
  if (streak) {
    const days = currentStreak();
    streak.innerHTML = `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c3 3.6 5.5 6.2 5.5 9.6A5.5 5.5 0 0 1 12 18a5.5 5.5 0 0 1-5.5-5.4C6.5 9.2 9 6.6 12 3Z"/><path d="M12 18c-1.7 0-3-1.2-3-2.9 0-1.6 1.2-2.7 2.4-4.1.3 1.7 1.4 2 2 2.9.5.7.6 1.2.6 1.7 0 1.4-1 2.4-2 2.4Z"/></svg><b>${days}</b><i>gün</i>`;
    streak.setAttribute('aria-label', `Günlük seri: ${days} gün`);
  }

  const offline = document.getElementById('offlineState');
  if (offline) {
    const ready = typeof navigator !== 'undefined' && Boolean(navigator.serviceWorker);
    offline.innerHTML = `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v10m0 0 4-4m-4 4-4-4"/><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2"/></svg><span>${ready ? 'Çevrimdışı · Hazır' : 'Çevrimdışı · Kapalı'}</span>`;
    offline.classList.toggle('is-ready', Boolean(ready));
  }

  const goalRing = document.getElementById('goalRing');
  if (goalRing) {
    const goal = Math.max(1, Math.round(progress.settings.goal || DEFAULT_GOAL));
    const today = Math.min(todayCount(), goal);
    const ratio = Math.max(0, Math.min(1, today / goal));
    goalRing.innerHTML = `<svg viewBox="0 0 36 36" aria-hidden="true"><circle class="goal-ring-track" cx="18" cy="18" r="15.9155" pathLength="100"></circle><circle class="goal-ring-fill" cx="18" cy="18" r="15.9155" pathLength="100" stroke-dasharray="${(ratio * 100).toFixed(1)} 100"></circle></svg><span class="goal-ring-text"><b>${today}</b><i>/${goal}</i></span>`;
    goalRing.setAttribute('aria-label', `Günlük hedef: ${today} / ${goal} kart`);
  }

  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.setAttribute('aria-pressed', String(theme === 'fjord'));
    toggle.setAttribute(
      'aria-label',
      theme === 'fjord' ? 'Aydınlık moda geç' : 'Gece moduna geç',
    );
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
  return `<article class="summary">
    <p class="kicker"><span>Oturum özeti</span><span>${esc(modeLabel(session))}</span></p>
    <h1 class="view-title">Kuyruk boşaldı</h1>
    <dl class="summary-grid">
      <div><dt>Kart</dt><dd>${session.done}</dd></div>
      <div><dt>Doğru</dt><dd>${session.correct}</dd></div>
      <div><dt>Oran</dt><dd>${percent}%</dd></div>
      <div><dt>Hafta</dt><dd>${pad2(state.week)}</dd></div>
    </dl>
    <p class="lede">Yeni oturum, tekrar zamanı gelen kartlarla devam eder; hızlı tekrar on kartlık bir refleks turudur.</p>
    <div class="actions">
      <button class="btn btn--primary" type="button" data-act="new-session">Yeni oturum</button>
      <button class="btn" type="button" data-act="mode-speed">Hızlı tekrar</button>
      <button class="btn btn--quiet" type="button" data-act="hub">Oturum merkezi</button>
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
      <button class="btn" type="button" data-act="open-index">Sözlüğü aç</button>
      <button class="btn btn--quiet" type="button" data-act="hub">Oturum merkezi</button>
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

function speakText(text, rate) {
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

function speak(rate) {
  const card = currentCard();
  if (!card) return;
  speakText(displayFi(card.fi), rate);
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
  if (state.hub) {
    renderHub();
    return;
  }
  if (state.summary) {
    renderSummary();
    return;
  }
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
  const module = moduleFor(card.week);
  const level = session.level ? levelFor(session.level) : null;

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

  const speed =
    session.mode === 'speed'
      ? '<div class="speed"><div class="speed-bar" id="speedBar"><span></span></div><span class="speed-label" id="speedLabel">8 sn</span></div>'
      : '';
  const xrayActive = Boolean(state.token);
  const xrayPill = `<button type="button" class="pill${xrayActive ? ' is-on' : ''}" data-act="xray-card" aria-pressed="${xrayActive}" aria-label="Morfoloji röntgenini aç">Morfoloji Röntgeni</button>`;

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
    <div class="lesson-top">
      <button class="icon-btn" type="button" data-act="hub" aria-label="Oturum merkezi">
        <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>
      </button>
      <div class="track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(
        percent,
      )}"><span style="width:${percent.toFixed(1)}%"></span></div>
      <span class="lesson-count">${pad2(session.done + 1)} / ${pad2(total)}</span>
    </div>
    <div class="session-bar">
      <span class="session-mode">${modeLabel(session)}</span>
      <button class="link-btn" type="button" data-act="hub">Oturum merkezi · 4 mod</button>
    </div>
    ${speed}
    <section class="lesson-card" aria-label="Ders kartı">
      <p class="eyebrow"><span class="eyebrow-mark">${growthGlyph(
        module ? growthStage(module) : 0,
      )}</span><span>Ünite ${pad2(card.week)}${module ? ` · ${esc(module.title)}` : ''}</span></p>
      <div class="card-tabs">
        ${registerSwitch}
        ${listen}
        ${xrayPill}
      </div>
      ${level ? ladderHtml(level, session) : ''}
      <p class="prompt">${prompt}</p>
      ${rhythmHtml(shown)}
      <p class="hint">Kelimeye dokun · kök ve ek röntgeni</p>
      ${
        state.flipped
          ? answerHtml(card)
          : '<button type="button" class="btn btn--primary reveal" data-act="reveal">Anlamı göster</button>'
      }
      ${state.flipped ? `<div class="grades" role="group" aria-label="Kendini puanla">${grades}</div>` : ''}
    </section>
    <div class="xray-slot" id="xraySlot">${state.token ? xrayHtml(analyze(state.token)) : ''}</div>
  </article>`;
  armSpeed();
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

/* ---------------- Sözlük: arama, favoriler, kişisel kartlar ----------------
   328 kartın tamamı listelenir; "Kelimelerim" yıldızları ve kişisel kartlar
   yalnızca bu görünümde yaşar, SM-2 kaydına dokunmaz. */

function allEntries() {
  const custom = (progress.custom || []).filter((card) => card && card.fi && card.tr);
  return ALL_CARDS.concat(custom);
}

function isFavorite(id) {
  return Boolean(progress.favorites && progress.favorites[id]);
}

function toggleFavorite(id) {
  if (!id) return;
  progress.favorites = progress.favorites || {};
  if (progress.favorites[id]) delete progress.favorites[id];
  else progress.favorites[id] = true;
  saveProgress();
  renderIndex();
  announce(progress.favorites[id] ? 'Kelimelerime eklendi' : 'Kelimelerimden çıkarıldı');
}

function addCustomCard(fi, tr) {
  const cleanFi = String(fi == null ? '' : fi).trim();
  const cleanTr = String(tr == null ? '' : tr).trim();
  if (!cleanFi || !cleanTr) {
    announce('Fince ve Türkçe alanları gerekli');
    return false;
  }
  progress.custom = progress.custom || [];
  progress.custom.push({
    id: `c-${Date.now()}-${progress.custom.length + 1}`,
    fi: cleanFi,
    tr: cleanTr,
    week: 0,
    type: 'kelime',
    note: 'Kişisel kart',
    custom: true,
  });
  saveProgress();
  state.filter = 'mine';
  const fiInput = document.getElementById('customFi');
  const trInput = document.getElementById('customTr');
  if (fiInput) fiInput.value = '';
  if (trInput) trInput.value = '';
  renderIndex();
  announce('Kart eklendi');
  return true;
}

function removeCustomCard(id) {
  const before = (progress.custom || []).length;
  progress.custom = (progress.custom || []).filter((card) => card.id !== id);
  if (progress.custom.length === before) return;
  saveProgress();
  renderIndex();
  announce('Kart silindi');
}

function downloadJson(payload, filename) {
  if (typeof Blob === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) {
    announce('Bu tarayıcı indirmeyi desteklemiyor');
    return;
  }
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportCustomCards() {
  const list = progress.custom || [];
  if (!list.length) {
    announce('Dışa aktarılacak kişisel kart yok');
    return;
  }
  downloadJson(
    JSON.stringify(
      { app: 'suomi-kartat', kind: 'custom-cards', exportedAt: new Date().toISOString(), cards: list },
      null,
      2,
    ),
    'suomi-kartat-kelimelerim.json',
  );
  announce(`${list.length} kişisel kart dışa aktarıldı`);
}

function dictRow(card) {
  const fav = isFavorite(card.id);
  return `<li class="dict-row">
    <button type="button" class="star${fav ? ' is-on' : ''}" data-act="fav" data-id="${esc(
      card.id,
    )}" aria-pressed="${fav}" aria-label="${fav ? 'Kelimelerimden çıkar' : 'Kelimelerime ekle'}">★</button>
    <button type="button" class="dict-main" data-lab="${esc(card.fi)}">
      <span class="dict-fi">${esc(card.fi)}</span>
      <span class="dict-tr">${esc(card.tr)}</span>
    </button>
    <span class="dict-tag">${card.custom ? 'özel' : `H${pad2(card.week)}`}</span>
    ${
      card.custom
        ? `<button type="button" class="dict-del" data-act="del-custom" data-id="${esc(
            card.id,
          )}" aria-label="Kartı sil">×</button>`
        : ''
    }
  </li>`;
}

function renderIndex() {
  const body = document.getElementById('indexBody');
  if (!body) return;

  const filters = document.getElementById('dictFilters');
  if (filters && filters.querySelectorAll) {
    filters.querySelectorAll('[data-filter]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.filter === state.filter));
    });
  }

  const query = state.search.trim().toLocaleLowerCase('tr');
  const entries = allEntries().filter((card) => {
    if (state.filter === 'fav' && !isFavorite(card.id)) return false;
    if (state.filter === 'mine' && !card.custom) return false;
    if (state.filter === 'kelime' && card.type !== 'kelime') return false;
    if (state.filter === 'lause' && card.type === 'kelime') return false;
    if (!query) return true;
    return (
      card.fi.toLocaleLowerCase('tr').indexOf(query) !== -1 ||
      card.tr.toLocaleLowerCase('tr').indexOf(query) !== -1
    );
  });

  if (!entries.length) {
    const message =
      state.filter === 'fav'
        ? 'Henüz yıldızladığın kart yok. Bir satırdaki ★ ile listene al.'
        : state.filter === 'mine'
          ? 'Kendi kartın yok. Yukarıdaki formdan ekle.'
          : 'Eşleşme yok. Fince ya da Türkçe bir parça dene.';
    body.innerHTML = `<p class="empty">${message}</p>`;
    return;
  }

  const shown = query ? entries.slice(0, 60) : entries;
  body.innerHTML = `<p class="dict-count">${shown.length} kart${
    entries.length > shown.length ? ` / ${entries.length} eşleşme` : ''
  }</p>
    <ol class="dict-list">${shown.map(dictRow).join('')}</ol>`;
}

/* ---------------- Patika çizimi ---------------- */

function ladderHtml(level, session) {
  const pips = level.cards
    .map((card) => {
      const done = session.queue.indexOf(card) === -1;
      const now = session.queue[0] && session.queue[0].id === card.id;
      return `<span class="pip${done ? ' is-done' : ''}${now ? ' is-now' : ''}"></span>`;
    })
    .join('');
  return `<div class="ladder-row"><span class="ladder-label">Kademe ${pad2(
    level.index,
  )}</span><span class="ladder">${pips}</span><span class="ladder-count">${levelLearned(level)}/${
    level.cards.length
  }</span></div>`;
}

function moduleHtml(module) {
  const learned = module.cards.filter((card) => cardState(card.id).reps > 0).length;
  const due = dueCount(module.id);
  const percent = module.cards.length ? Math.round((learned / module.cards.length) * 100) : 0;
  const words = module.cards.filter((card) => card.type === 'kelime').length;

  const levels = module.levels
    .map(
      (level) => `<button type="button" class="level" data-act="level" data-level="${level.id}" aria-label="Modül ${
        module.id
      }, kademe ${level.index}: ${levelLearned(level)} / ${level.cards.length} kart">
        <span class="level-num">${pad2(level.index)}</span>
        ${growthGlyph(growthStage(level), 'level-glyph')}
        <span class="level-meter"><span style="width:${levelPercent(level)}%"></span></span>
      </button>`,
    )
    .join('');

  const steps = [
    { key: 'words', label: 'Kelimeler', note: `${words || module.cards.length} kart · yeni kelimeler` },
    { key: 'dialog', label: 'Diyalog', note: 'Koçla iki replik' },
    { key: 'grammar', label: 'Dilbilgisi Röntgeni', note: 'Kök–ek çözümlemesi' },
    { key: 'quiz', label: 'Ünite Sınavı', note: '8 saniyelik hızlı tur' },
  ]
    .map(
      (step, index) => `<li>
        <button type="button" class="unit-step" data-act="unit-step" data-step="${step.key}" data-unit="${module.id}" aria-label="Ünite ${module.id}, ${step.label}">
          <span class="step-icon step-icon--${step.key}">${STEP_ICONS[step.key]}</span>
          <span class="step-text"><b>${index + 1}. ${step.label}</b><i>${step.note}</i></span>
          <span class="step-arrow">${CHEVRON_ICON}</span>
        </button>
      </li>`,
    )
    .join('');

  return `<li class="module">
    <div class="unit-cover unit-cover--${module.id % 5}">
      <p class="unit-eyebrow"><span>Ünite ${pad2(module.id)} · Hafta ${pad2(module.id)}</span><span>${module.cards.length} kart</span></p>
      <div class="module-head">
        <span class="module-title">${esc(module.title)}</span>
        <span class="module-focus">${esc(module.focus)}</span>
      </div>
      <div class="unit-cover-meta">
        <span class="unit-percent">%${percent}</span>
        <span class="unit-bar"><span style="width:${percent}%"></span></span>
        <span class="unit-offline"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v10m0 0 4-4m-4 4-4-4"/><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2"/></svg>Çevrimdışı İndir</span>
      </div>
    </div>
    <div class="unit-body">
      <p class="unit-steps-label">Ders adımları</p>
      <ol class="unit-steps">${steps}</ol>
      <details class="unit-levels">
        <summary>Kademeler · ${module.levels.length}</summary>
        <div class="module-levels">${levels}</div>
      </details>
      <div class="module-foot">
        <button class="btn btn--primary btn--tight" type="button" data-act="module" data-week="${module.id}">Üniteye başla</button>
        <span class="module-due">${due ? `${due} tekrar hazır` : 'tekrar yok'} · ${module.levels.length} kademe</span>
      </div>
    </div>
  </li>`;
}

function renderPath() {
  const el = document.getElementById('view-path');
  if (!el) return;

  const levels = MODULES.reduce((list, module) => list.concat(module.levels), []);
  const bloomed = levels.filter((level) => growthStage(level) === 4).length;
  const due = MODULES.reduce((total, module) => total + dueCount(module.id), 0);
  const goal = progress.settings.goal || DEFAULT_GOAL;
  const theme = progress.settings.theme === 'fjord' ? 'fjord' : 'linen';
  const answers = progress.stats.answers || 0;
  const correct = progress.stats.correct || 0;
  const accuracy = answers ? Math.round((correct / answers) * 100) : 0;

  el.innerHTML = `<div class="path-head">
      <p class="kicker">${markGlyph()}<span>Ünite haritası</span></p>
      <h1 class="view-title">Yolculuk</h1>
      <p class="lede">16 ünite, 68 kademe. Her ünitede kelimeler, diyalog, dilbilgisi röntgeni ve ünite sınavı; ilerleme SM-2 takvimine bağlı kalır.</p>
      <div class="journey-top">
        ${streakRingHtml()}
        <div class="journey-side">
          <p class="journey-label">Son yedi gün · cevap</p>
          ${weekLineHtml()}
          <p class="journey-note">${todayCount()} kart bugün · doğru oranı %${accuracy}</p>
          <dl class="path-stats">
            <div><dt>Modül</dt><dd>${MODULES.length}</dd></div>
            <div><dt>Kademe</dt><dd>${levels.length}</dd></div>
            <div><dt>Çiçek</dt><dd>${bloomed}</dd></div>
            <div><dt>Tekrar</dt><dd>${due}</dd></div>
          </dl>
        </div>
      </div>
    </div>
    <ol class="modules">${MODULES.map(moduleHtml).join('')}</ol>
    <details class="settings-block">
      <summary>Muhasebe &amp; ayarlar</summary>
      <dl class="ledger">
        <div><dt>Öğrenilen</dt><dd><b>${learnedCount()}</b><span> / ${ALL_CARDS.length}</span></dd></div>
        <div><dt>Bugün</dt><dd><b>${todayCount()}</b><span> / ${goal}</span></dd></div>
        <div><dt>Doğru oranı</dt><dd><b>${accuracy}%</b><span> ${correct} / ${answers}</span></dd></div>
        <div><dt>Seri</dt><dd><b>${currentStreak()}</b><span> gün</span></dd></div>
      </dl>
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
      </div>
    </details>`;
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


/* ---------------- Oturum merkezi ve dört mod ---------------- */

function modeLabel(session) {
  if (!session) return '';
  if (session.mode === 'speed') return 'Hızlı tekrar';
  if (session.mode === 'hard') return 'Zor kelimeler';
  if (session.mode === 'level') return 'Kademe';
  if (session.mode === 'free') return 'Serbest';
  return 'Yeni öğrenme';
}

function buildSpeedQueue(week, now) {
  const at = typeof now === 'number' ? now : Date.now();
  const pool = poolFor(week);
  const due = pool.filter((card) => {
    const s = cardState(card.id);
    return s.reps > 0 && s.due <= at;
  });
  const rest = pool.filter((card) => due.indexOf(card) === -1);
  return shuffle(due).concat(shuffle(rest)).slice(0, SPEED_LIMIT);
}

function weakScore(card) {
  const s = cardState(card.id);
  if (!s.seen) return -1;
  const errorRate = (s.lapses || 0) / s.seen;
  const easeDrag = (2.5 - Math.min(2.5, s.ease)) / 2.5;
  return errorRate + easeDrag * 0.5;
}

/* Yalnızca gerçekten zorlanılan kartlar: en az bir kez tekrara düşmüş ya
   da kolaylık puanı düşmüş olanlar; hata oranı yüksek olan önce gelir. */
function hardPool(week) {
  return poolFor(week)
    .filter((card) => {
      const s = cardState(card.id);
      return s.seen > 0 && ((s.lapses || 0) > 0 || s.ease < 2.4);
    })
    .sort((a, b) => weakScore(b) - weakScore(a))
    .slice(0, HARD_LIMIT);
}

function clearSpeed() {
  if (state.speedTimer) {
    clearInterval(state.speedTimer);
    state.speedTimer = null;
  }
}

/* Hızlı tekrarda her kart kendi geri sayımını taşır; süre biterse kart
   tekrar havuzuna düşer (SM-2: grade 0). */
function armSpeed() {
  clearSpeed();
  const session = state.session;
  if (!session || session.mode !== 'speed' || !session.queue.length) return;
  if (typeof document === 'undefined' || !document.getElementById) return;
  state.speedStart = Date.now();
  state.speedTimer = setInterval(() => {
    const left = Math.max(0, SPEED_MS - (Date.now() - state.speedStart));
    const bar = document.getElementById('speedBar');
    const label = document.getElementById('speedLabel');
    if (bar && bar.style && bar.style.setProperty) {
      bar.style.setProperty('--left', String(left / SPEED_MS));
    }
    if (label) label.textContent = `${Math.ceil(left / 1000)} sn`;
    if (left <= 0) {
      clearSpeed();
      if (!state.session || !state.session.queue.length) return;
      state.flipped = true;
      answer(0);
      announce('Süre doldu · kart tekrara düştü');
    }
  }, 120);
}

function renderHub() {
  const el = document.getElementById('view-study');
  if (!el) return;
  const module = moduleFor(state.week) || MODULES[0];
  const pool = poolFor(module.id);
  const fresh = pool.filter((card) => cardState(card.id).reps === 0).length;
  const due = dueCount(module.id);
  const hard = hardPool(module.id).length;
  const last = progress.stats.lastSession || null;
  const lastAccuracy = last && last.done ? Math.round((last.correct / last.done) * 100) : 0;

  el.innerHTML = `<div class="hub">
    <p class="kicker"><span>02 · Oturum</span><span>Hafta ${pad2(module.id)}</span></p>
    <h1 class="view-title">Oturum merkezi</h1>
    <p class="lede">${esc(module.title)} · ${esc(module.focus)}</p>
    <label class="week-switch">Modül
      <select id="weekSelect">${WEEKS.map(
        (week) =>
          `<option value="${week.id}"${week.id === module.id ? ' selected' : ''}>Hafta ${pad2(
            week.id,
          )} · ${esc(week.title)}</option>`,
      ).join('')}</select>
    </label>
    <ul class="mode-grid">
      <li class="mode-card">
        <span class="mode-num">a</span>
        <h2>Yeni öğrenme</h2>
        <p>Kök–ek röntgeni, kirjakieli/puhekieli anahtarı, 0,75× ve 1,0× ses.</p>
        <span class="mode-meta">${fresh} yeni · ${due} tekrar</span>
        <button class="btn btn--primary btn--tight" type="button" data-act="mode-new">Başla</button>
      </li>
      <li class="mode-card">
        <span class="mode-num">b</span>
        <h2>Hızlı tekrar</h2>
        <p>Geri sayım barlı refleks turu; süre biten kart tekrara düşer.</p>
        <span class="mode-meta">10 kart · 8 sn</span>
        <button class="btn btn--primary btn--tight" type="button" data-act="mode-speed">Başla</button>
      </li>
      <li class="mode-card">
        <span class="mode-num">c</span>
        <h2>Zor kelimeler</h2>
        <p>Hata oranı yüksek kartlar; yanlış yaptıkça havuz kendini yeniler.</p>
        <span class="mode-meta">${hard ? `${hard} kart hazır` : 'henüz ölçüm yok'}</span>
        <button class="btn btn--primary btn--tight" type="button" data-act="mode-hard"${
          hard ? '' : ' disabled'
        }>Başla</button>
      </li>
      <li class="mode-card">
        <span class="mode-num">d</span>
        <h2>Oturum özeti</h2>
        <p>Son oturumun kart, doğru ve oran dökümü; tek ölçüm, süs yok.</p>
        <span class="mode-meta">${last ? `%${lastAccuracy} · ${last.done} kart` : 'henüz oturum yok'}</span>
        <button class="btn btn--primary btn--tight" type="button" data-act="mode-summary">Özeti aç</button>
      </li>
    </ul>
    <button class="btn btn--quiet" type="button" data-act="hub-close">Karta dön</button>
  </div>`;
}

function renderSummary() {
  const el = document.getElementById('view-study');
  if (!el) return;
  const last = progress.stats.lastSession;
  if (!last) {
    el.innerHTML = `<div class="hub">
      <p class="kicker"><span>02 · Oturum</span></p>
      <h1 class="view-title">Oturum özeti</h1>
      <p class="lede">Henüz bitmiş bir oturum yok. Bir mod seç, ilk ölçüm orada başlar.</p>
      <div class="actions">
        <button class="btn btn--primary" type="button" data-act="hub-close">Oturum merkezi</button>
      </div>
    </div>`;
    return;
  }
  const accuracy = last.done ? Math.round((last.correct / last.done) * 100) : 0;
  el.innerHTML = `<article class="summary">
    <p class="kicker"><span>Oturum özeti</span><span>${esc(modeLabel(last))}</span></p>
    <h1 class="view-title">${last.done} kart, %${accuracy}</h1>
    <dl class="summary-grid">
      <div><dt>Kart</dt><dd>${last.done}</dd></div>
      <div><dt>Doğru</dt><dd>${last.correct}</dd></div>
      <div><dt>Oran</dt><dd>${accuracy}%</dd></div>
      <div><dt>Hafta</dt><dd>${pad2(last.week || state.week)}</dd></div>
    </dl>
    <p class="lede">Tekrar geçmişi SM-2'de; ertesi gün kuyruk kendini yeniden kurar.</p>
    <div class="actions">
      <button class="btn btn--primary" type="button" data-act="hub">Oturum merkezi</button>
      <button class="btn" type="button" data-act="mode-speed">Hızlı tekrar</button>
      <button class="btn btn--quiet" type="button" data-act="summary-close">Karta dön</button>
    </div>
  </article>`;
}

/* ---------------- AI Koç: diyalog, telaffuz, röntgen ---------------- */

function dialogueGroups(week) {
  const sentences = poolFor(week).filter((card) => card.type !== 'kelime');
  const groups = [];
  for (let i = 0; i < sentences.length; i += 2) groups.push(sentences.slice(i, i + 2));
  return groups.slice(0, 3);
}

function dialogueOptions(card) {
  const seen = [card.tr];
  const extra = [];
  shuffle(poolFor(state.week).filter((item) => item.type !== 'kelime'))
    .concat(shuffle(ALL_CARDS.filter((item) => item.type !== 'kelime')))
    .forEach((candidate) => {
      if (extra.length >= 2) return;
      if (seen.indexOf(candidate.tr) !== -1) return;
      seen.push(candidate.tr);
      extra.push(candidate.tr);
    });
  return shuffle([card.tr].concat(extra));
}

function hintHtml(card) {
  const words = String(card.fi).match(/\p{L}+/gu) || [];
  const results = words.slice(0, 3).map((word) => analyze(word)).filter(Boolean);
  if (!results.length) return 'İpucu yok.';
  return `İpucu: ${results
    .map((result) => `<b>${esc(result.word)}</b> ${esc(result.lemmaTr || '—')}`)
    .join(' · ')}`;
}

function renderCoach() {
  const tab = state.coach.tab === 'pron' || state.coach.tab === 'lab' ? state.coach.tab : 'dialog';
  if (typeof document !== 'undefined' && document.querySelectorAll) {
    document.querySelectorAll('[data-pane]').forEach((pane) => {
      pane.hidden = pane.dataset.pane !== tab;
    });
    document.querySelectorAll('[data-coach]').forEach((button) => {
      button.setAttribute('aria-selected', String(button.dataset.coach === tab));
    });
  }
  renderDialog();
  renderPron();
}

function renderDialog() {
  const el = document.getElementById('dialogBody');
  if (!el) return;
  const module = moduleFor(state.week) || MODULES[0];
  const groups = dialogueGroups(module.id);
  if (!groups.length) {
    el.innerHTML = '<p class="empty">Bu modülde cümle yok. Başka bir hafta seç.</p>';
    return;
  }
  const sIndex = Math.min(Math.max(0, state.coach.scenario || 0), groups.length - 1);
  const group = groups[sIndex];
  const turnIndex = Math.min(Math.max(0, state.coach.turn || 0), group.length - 1);
  const card = group[turnIndex];
  const key = `${module.id}:${sIndex}:${turnIndex}`;
  if (state.coach.key !== key) {
    state.coach.key = key;
    state.coach.options = dialogueOptions(card);
    state.coach.picked = null;
    state.coach.showTr = false;
    state.coach.hint = false;
  }
  state.coach.scenario = sIndex;
  state.coach.turn = turnIndex;

  const picked = state.coach.picked;
  const scenarios = groups
    .map(
      (entry, i) =>
        `<button type="button" data-act="scenario" data-scenario="${i}" aria-pressed="${
          i === sIndex
        }">Diyalog ${i + 1}</button>`,
    )
    .join('');
  const options = state.coach.options
    .map((text, i) => {
      const right = text === card.tr;
      const klass = picked == null ? '' : right ? ' is-right' : picked === i ? ' is-wrong' : '';
      return `<button type="button" class="opt${klass}" data-act="reply" data-opt="${i}"><span class="opt-idx">${pad2(
        i + 1,
      )}</span><span>${esc(text)}</span></button>`;
    })
    .join('');
  const solved = picked != null && state.coach.options[picked] === card.tr;
  const done = solved && turnIndex + 1 >= group.length;
  const listen = speechAvailable()
    ? `<button type="button" data-act="coach-speak" data-rate="0.75">Dinle · 0,75×</button><button type="button" data-act="coach-speak" data-rate="1">Dinle · 1,0×</button>`
    : '';

  el.innerHTML = `<p class="kicker"><span>Diyalog</span><span>Hafta ${pad2(module.id)} · ${
    turnIndex + 1
  }/${group.length}</span></p>
    <div class="coach-scenarios">${scenarios}</div>
    <article class="bubble">
      <p class="bubble-who">Koç</p>
      <p class="bubble-fi">${esc(displayFi(card.fi))}</p>
      <div class="bubble-tools">
        ${listen}
        <button type="button" data-act="coach-hint">İpucu</button>
        <button type="button" data-act="coach-tr">${
          state.coach.showTr ? 'Çeviriyi gizle' : 'Anlık çeviri'
        }</button>
      </div>
      ${
        state.coach.showTr
          ? `<p class="bubble-tr">${esc(card.tr)}${card.note ? ` · ${esc(card.note)}` : ''}</p>`
          : ''
      }
      ${state.coach.hint ? `<p class="bubble-hint">${hintHtml(card)}</p>` : ''}
    </article>
    <p class="coach-q">Koç ne dedi?</p>
    <div class="coach-opts">${options}</div>
    ${
      picked == null
        ? ''
        : solved
          ? `<div class="coach-feedback"><span>Doğru · ${esc(card.tr)}</span>${
              done
                ? '<button class="btn btn--primary btn--tight" type="button" data-act="scenario-next">Diyaloğu bitir</button>'
                : '<button class="btn btn--primary btn--tight" type="button" data-act="coach-next">Sıradaki replik</button>'
            }</div>`
          : '<div class="coach-feedback"><span>Henüz değil; çeviriyi ya da ipucunu dene.</span></div>'
    }`;
}

function recognitionAvailable() {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
}

function normalizeSpeech(text) {
  return String(text == null ? '' : text)
    .toLocaleLowerCase('fi')
    .replace(/[^\p{L}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function startRecognition() {
  if (!recognitionAvailable()) {
    announce('Bu tarayıcı konuşma tanımayı desteklemiyor');
    return;
  }
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  const card = allEntries().find((item) => item.id === state.pron.cardId);
  if (!card) return;
  try {
    const recognition = new Ctor();
    recognition.lang = 'fi-FI';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const heard = (event.results[0] && event.results[0][0] && event.results[0][0].transcript) || '';
      state.pron.heard = heard;
      state.pron.heardOk = normalizeSpeech(heard) === normalizeSpeech(card.fi);
      renderPron();
      announce(state.pron.heardOk ? 'Telaffuz eşleşti' : `Duyulan: ${heard}`);
    };
    recognition.onerror = () => announce('Tanıma tamamlanamadı');
    recognition.start();
    announce('Dinliyorum…');
  } catch (error) {
    announce('Tanıma başlatılamadı');
  }
}

function renderPron() {
  const el = document.getElementById('pronBody');
  if (!el) return;
  const module = moduleFor(state.week) || MODULES[0];
  const pool = poolFor(module.id);
  const words = pool.filter((card) => card.type === 'kelime');
  const list = words.length ? words : pool;
  if (!list.length) {
    el.innerHTML = '<p class="empty">Bu modülde kart yok.</p>';
    return;
  }
  const index = (((state.pron.index || 0) % list.length) + list.length) % list.length;
  state.pron.index = index;
  const card = list[index];
  state.pron.cardId = card.id;
  const shown = displayFi(card.fi);
  const listen = speechAvailable()
    ? `<div class="listen">
        <button class="listen-btn" type="button" data-act="pron-speak" data-rate="0.75">Dinle · 0,75×</button>
        <button class="listen-btn" type="button" data-act="pron-speak" data-rate="1">Dinle · 1,0×</button>
        ${
          recognitionAvailable()
            ? '<button class="listen-btn" type="button" data-act="pron-listen">Mikrofonla dene</button>'
            : ''
        }
      </div>`
    : '<p class="pron-note">Bu tarayıcı sesli okumayı desteklemiyor.</p>';

  el.innerHTML = `<p class="kicker"><span>Telaffuz stüdyosu</span><span>${pad2(index + 1)} / ${pad2(
    list.length,
  )}</span></p>
    <p class="pron-fi">${esc(shown)}</p>
    <p class="pron-note">${esc(card.tr)} · ${esc(
      REGISTERS[progress.settings.register === 'puhe' ? 'puhe' : 'kirja'],
    )}</p>
    ${rhythmHtml(shown)}
    ${listen}
    ${
      state.pron.heard
        ? `<p class="pron-heard">Duyulan: <b>${esc(state.pron.heard)}</b> · ${
            state.pron.heardOk ? 'eşleşti' : 'tekrar dinle'
          }</p>`
        : ''
    }
    <div class="actions">
      <button class="btn" type="button" data-act="pron-next">Sonraki kart</button>
      <button class="btn btn--quiet" type="button" data-act="pron-xray">Röntgeni aç</button>
    </div>`;
}

/* ---------------- Dalma: bağlam içi mikro-okuma ---------------- */

function renderImmerse() {
  const el = document.getElementById('view-immerse');
  if (!el) return;
  const module = moduleFor(state.week) || MODULES[0];
  const sentences = poolFor(module.id).filter((card) => card.type !== 'kelime');
  const list = sentences.length ? sentences : poolFor(module.id);
  const total = list.length;
  if (!total) {
    el.innerHTML = '<p class="empty">Bu modülde okunacak cümle yok.</p>';
    return;
  }
  const index = (((state.immerse.index || 0) % total) + total) % total;
  state.immerse.index = index;
  const card = list[index];
  const shown = displayFi(card.fi);
  const dots = list
    .map(
      (entry, i) =>
        `<span class="reading-dot${i === index ? ' is-on' : i < index ? ' is-read' : ''}"></span>`,
    )
    .join('');

  el.innerHTML = `<div class="view-head">
      <p class="kicker"><span>05 · Dalma</span><span>Hafta ${pad2(module.id)}</span></p>
      <h1 class="view-title">Dalma</h1>
      <p class="lede">${esc(module.title)} · cümleleri bağlam içinde oku ve dinle.</p>
      <label class="week-switch">Modül
        <select id="immerseWeek">${WEEKS.map(
          (week) =>
            `<option value="${week.id}"${week.id === module.id ? ' selected' : ''}>Hafta ${pad2(
              week.id,
            )} · ${esc(week.title)}</option>`,
        ).join('')}</select>
      </label>
    </div>
    <article class="reading">
      <p class="reading-count">${pad2(index + 1)} / ${pad2(total)} · ${
        card.type === 'kelime' ? 'kelime' : 'cümle'
      }</p>
      <p class="reading-fi">${esc(shown)}</p>
      ${rhythmHtml(shown)}
      ${
        speechAvailable()
          ? `<div class="listen"><button class="listen-btn" type="button" data-act="immerse-speak" data-rate="0.75">Dinle · 0,75×</button><button class="listen-btn" type="button" data-act="immerse-speak" data-rate="1">Dinle · 1,0×</button></div>`
          : ''
      }
      ${
        state.immerse.showTr
          ? `<div class="reading-tr">${esc(card.tr)}${
              card.note ? `<p class="note">${esc(card.note)}</p>` : ''
            }</div>`
          : '<button class="btn btn--primary reveal" type="button" data-act="immerse-tr">Anlamı göster</button>'
      }
      <div class="reading-nav">
        <button class="btn btn--tight" type="button" data-act="immerse-prev"${
          index === 0 ? ' disabled' : ''
        }>Geri</button>
        <span class="reading-dots">${dots}</span>
        <button class="btn btn--tight" type="button" data-act="immerse-next">${
          index + 1 >= total ? 'Baştan' : 'İleri'
        }</button>
      </div>
    </article>`;
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

  if (view === 'path') renderPath();
  if (view === 'study') {
    clearSpeed();
    renderStudy();
  }
  if (view === 'index') renderIndex();
  if (view === 'lab') {
    renderCoach();
    renderLabChips();
    renderLabOutput();
  }
  if (view === 'immerse') renderImmerse();

  if (!options || !options.silent) announce(`${VIEW_NAMES[view]} bölümü`);
}

function renderAll() {
  renderMast();
  renderRail();
  renderPath();
  renderStudy();
  renderIndex();
  renderCoach();
  renderLabChips();
  renderLabOutput();
  renderImmerse();
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

  clearSpeed();
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

  progress.stats.lastSession = {
    done: session.done,
    correct: session.correct,
    total: session.total,
    mode: session.mode || 'new',
    week: Number(state.week) || card.week,
    at: Date.now(),
  };
  saveProgress();

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

function runAction(action, node) {
  if (action === 'hub') {
    clearSpeed();
    state.hub = true;
    state.summary = false;
    setView('study', { silent: true });
    announce('Oturum merkezi');
    return;
  }
  if (action === 'hub-close') {
    state.hub = false;
    state.summary = false;
    if (!state.session || (!state.session.queue.length && !state.session.done)) {
      startSession(state.week);
    }
    renderStudy();
    announce('Karta dönüldü');
    return;
  }
  if (action === 'mode-new') {
    startSession(state.week);
    setView('study', { silent: true });
    announce('Yeni öğrenme oturumu');
    return;
  }
  if (action === 'mode-speed') {
    startSession(state.week, { speed: true });
    setView('study', { silent: true });
    announce('Hızlı tekrar · kart başına 8 saniye');
    return;
  }
  if (action === 'mode-hard') {
    if (!hardPool(state.week).length) {
      announce('Zor kelime havuzu boş; önce birkaç kart çalış');
      return;
    }
    startSession(state.week, { hard: true });
    setView('study', { silent: true });
    announce('Zor kelimeler oturumu');
    return;
  }
  if (action === 'mode-summary') {
    clearSpeed();
    state.hub = false;
    state.summary = true;
    setView('study', { silent: true });
    announce('Oturum özeti');
    return;
  }
  if (action === 'summary-close') {
    state.summary = false;
    renderStudy();
    announce('Karta dönüldü');
    return;
  }
  if (action === 'module') {
    const week = node && node.dataset.week ? node.dataset.week : state.week;
    startSession(week);
    setView('study', { silent: true });
    announce(`Modül ${week} oturumu`);
    return;
  }
  if (action === 'level') {
    const level = node ? levelFor(node.dataset.level) : null;
    if (!level) return;
    startSession(level.week, { level: level.id });
    setView('study', { silent: true });
    announce(`Modül ${level.week} · kademe ${level.index}`);
    return;
  }
  if (action === 'unit-step') {
    const week = node && node.dataset.unit ? node.dataset.unit : state.week;
    const step = node && node.dataset.step;
    state.week = String(week);
    if (step === 'dialog') {
      state.coach.tab = 'dialog';
      state.coach.turn = 0;
      state.coach.key = '';
      setView('lab', { silent: true });
      announce(`Ünite ${week} diyaloğu`);
      return;
    }
    if (step === 'grammar') {
      state.coach.tab = 'lab';
      state.labWord = '';
      setView('lab', { silent: true });
      announce(`Ünite ${week} dilbilgisi röntgeni`);
      return;
    }
    if (step === 'quiz') {
      startSession(week, { speed: true });
      setView('study', { silent: true });
      announce(`Ünite ${week} sınavı · hızlı tur`);
      return;
    }
    startSession(week);
    setView('study', { silent: true });
    announce(`Ünite ${week} kelimeleri`);
    return;
  }
  if (action === 'xray-card') {
    const card = currentCard();
    if (!card) return;
    if (state.token) {
      state.token = null;
    } else {
      state.token = (String(displayFi(card.fi)).match(/\p{L}+/u) || [])[0] || null;
    }
    renderStudy();
    announce(state.token ? `${state.token} röntgende` : 'Röntgen kapandı');
    return;
  }
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
    return;
  }
  if (action === 'fav') {
    toggleFavorite(node && node.dataset.id);
    return;
  }
  if (action === 'del-custom') {
    removeCustomCard(node && node.dataset.id);
    return;
  }
  if (action === 'export-custom') {
    exportCustomCards();
    return;
  }
  if (action === 'scenario') {
    state.coach.scenario = Number(node.dataset.scenario) || 0;
    state.coach.turn = 0;
    state.coach.key = '';
    renderDialog();
    announce(`Diyalog ${state.coach.scenario + 1}`);
    return;
  }
  if (action === 'scenario-next') {
    const groups = dialogueGroups(state.week);
    state.coach.scenario = ((state.coach.scenario || 0) + 1) % Math.max(1, groups.length);
    state.coach.turn = 0;
    state.coach.key = '';
    renderDialog();
    announce('Yeni diyalog');
    return;
  }
  if (action === 'reply') {
    const pick = Number(node.dataset.opt);
    if (!Number.isFinite(pick)) return;
    state.coach.picked = pick;
    renderDialog();
    return;
  }
  if (action === 'coach-next') {
    state.coach.turn = (state.coach.turn || 0) + 1;
    state.coach.key = '';
    renderDialog();
    announce('Sıradaki replik');
    return;
  }
  if (action === 'coach-hint') {
    state.coach.hint = true;
    renderDialog();
    return;
  }
  if (action === 'coach-tr') {
    state.coach.showTr = !state.coach.showTr;
    renderDialog();
    return;
  }
  if (action === 'coach-speak') {
    const card = dialogueGroups(state.week)[state.coach.scenario || 0];
    const line = card && card[state.coach.turn || 0];
    if (line) speakText(displayFi(line.fi), Number(node.dataset.rate) || 1);
    return;
  }
  if (action === 'pron-speak') {
    const card = allEntries().find((item) => item.id === state.pron.cardId);
    if (card) speakText(displayFi(card.fi), Number(node.dataset.rate) || 1);
    return;
  }
  if (action === 'pron-listen') {
    startRecognition();
    return;
  }
  if (action === 'pron-next') {
    state.pron.index = (state.pron.index || 0) + 1;
    state.pron.heard = '';
    state.pron.heardOk = false;
    renderPron();
    return;
  }
  if (action === 'pron-xray') {
    const card = allEntries().find((item) => item.id === state.pron.cardId);
    if (!card) return;
    state.coach.tab = 'lab';
    state.labWord = card.fi;
    const input = document.getElementById('labInput');
    if (input) input.value = card.fi;
    setView('lab', { silent: true });
    renderLabChips();
    renderLabOutput();
    announce(`${card.fi} röntgende`);
    return;
  }
  if (action === 'immerse-tr') {
    state.immerse.showTr = true;
    renderImmerse();
    return;
  }
  if (action === 'immerse-next') {
    state.immerse.index = (state.immerse.index || 0) + 1;
    state.immerse.showTr = false;
    renderImmerse();
    return;
  }
  if (action === 'immerse-prev') {
    state.immerse.index = Math.max(0, (state.immerse.index || 0) - 1);
    state.immerse.showTr = false;
    renderImmerse();
    return;
  }
  if (action === 'immerse-speak') {
    const module = moduleFor(state.week) || MODULES[0];
    const list = poolFor(module.id).filter((card) => card.type !== 'kelime');
    const card = list[state.immerse.index || 0];
    if (card) speakText(displayFi(card.fi), Number(node.dataset.rate) || 1);
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

  const filter = target.closest('[data-filter]');
  if (filter) {
    state.filter = filter.dataset.filter;
    renderIndex();
    announce(`Süzgeç: ${filter.textContent.trim()}`);
    return;
  }

  const coachTab = target.closest('[data-coach]');
  if (coachTab) {
    state.coach.tab = coachTab.dataset.coach;
    renderCoach();
    return;
  }

  const grade = target.closest('[data-grade]');
  if (grade) {
    answer(Number(grade.dataset.grade));
    return;
  }

  const action = target.closest('[data-act]');
  if (action) runAction(action.dataset.act, action);
}

function onMainChange(event) {
  const target = event.target;
  if (!target) return;

  if (target.id === 'goalInput') {
    const value = Math.max(4, Math.min(60, Number(target.value) || DEFAULT_GOAL));
    progress.settings.goal = value;
    saveProgress();
    renderPath();
    announce(`Günlük hedef ${value}`);
    return;
  }

  if (target.id === 'themeSelect') {
    setTheme(target.value);
    return;
  }

  if (target.id === 'weekSelect') {
    state.week = String(target.value);
    state.immerse.index = 0;
    renderHub();
    renderRail();
    announce(`Hafta ${target.value}`);
    return;
  }

  if (target.id === 'immerseWeek') {
    state.week = String(target.value);
    state.immerse.index = 0;
    state.immerse.showTr = false;
    renderImmerse();
    renderRail();
    announce(`Hafta ${target.value} okuması`);
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
  if (state.hub || state.summary) return;
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

  const goalRing = document.getElementById('goalRing');
  if (goalRing) {
    goalRing.addEventListener('click', () => setView('path'));
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

  const customForm = document.getElementById('customForm');
  if (customForm) {
    customForm.addEventListener('submit', (event) => {
      if (event && event.preventDefault) event.preventDefault();
      const fiInput = document.getElementById('customFi');
      const trInput = document.getElementById('customTr');
      addCustomCard(fiInput ? fiInput.value : '', trInput ? trInput.value : '');
    });
  }

  document.addEventListener('keydown', onKeyDown);

  renderMast();
  renderRail();
  renderPath();
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
    MODULES,
    LEVEL_SIZE,
    GROWTH_STAGES,
    moduleFor,
    levelFor,
    levelLearned,
    levelPercent,
    growthStage,
    growthGlyph,
    buildLevelQueue,
    renderPath,
    renderHub,
    renderSummary,
    renderIndex,
    renderImmerse,
    hardPool,
    buildSpeedQueue,
    dialogueGroups,
    addCustomCard,
    toggleFavorite,
    VIEW_LIST,
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
