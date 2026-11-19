/* Suomi Kartat — aralıklı tekrar motoru, sınav modu ve arayüz mantığı
   Tekrar yöntemi: SM-2'den sadeleştirilmiş aralık hesabı (ease faktörü + gün bazlı tekrar). */

const STORAGE_KEY = 'suomi-kartat-v1';
/* Ennakointi sınavında yanlış çıkan terimler bu anahtara yazılır; o destenin
   bir sonraki turunda kuyruğun başına alınır. */
const TEKRAR_KEY = 'suomi-kartat-tekrar-v1';
const EXAM_KEY = 'suomi-kartat-sinav-v1';
const PRACTICE_KEY = 'suomi-kartat-pratik-v1';
const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_EASE = 1.3;
const SESSION_LIMIT = 30;
const NEW_CARD_LIMIT = 12;
/* Hafta desteleri + metin desteleri + puhekieli desteleri + kitap desteleri:
   tekrar, sınav ve pratik aynı havuzu kullanır. */
const DOC_DECKS = TEXT_DECKS.concat(
  PUHE_DECKS,
  KIRJA_DECKS,
  KIRJA2_DECKS,
  KIRJA3_DECKS,
  KIRJA4_DECKS,
  KIRJA5_DECKS,
  ITSE_DECKS,
  FONE_DECKS,
  RUOTSI_DECKS,
  TRUKKI_DECKS,
  ENNAKOINTI_DECKS,
  SANASTO_DECKS
);
const DOC_CARDS = TEXT_CARDS.concat(
  PUHE_CARDS,
  KIRJA_CARDS,
  KIRJA2_CARDS,
  KIRJA3_CARDS,
  KIRJA4_CARDS,
  KIRJA5_CARDS,
  ITSE_CARDS,
  FONE_CARDS,
  RUOTSI_CARDS,
  TRUKKI_CARDS,
  ENNAKOINTI_CARDS,
  SANASTO_CARDS
);
const CARD_POOL = ALL_CARDS.concat(DOC_CARDS);

/* Kitap 4 planı: haftalık program 16. haftadan sonra kitabın sekiz bölümüyle sürer.
   Hafta 17–24, sırasıyla Kappale 1–8 destelerini gösterir. */
const PLAN_WEEKS = KIRJA4_DECKS.map((deck, index) => ({
  id: String(17 + index),
  deckId: deck.id,
  n: deck.n,
  title: `Kitap 4 · ${deck.title} · ${deck.tr}`,
}));
const PLAN_DECK_BY_WEEK = new Map(PLAN_WEEKS.map((week) => [week.id, week.deckId]));

/* Plan takvimi: ilk plan haftası 26 Ekim 2026 Pazartesi başlar, her hafta pazartesi değişir. */
const PLAN_START = '2026-10-26';
const PLAN_WEEK_MS = 7 * DAY_MS;
const MONTHS_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const PLAN_START_MS = (() => {
  const [year, month, day] = PLAN_START.split('-').map(Number);
  return new Date(year, month - 1, day).getTime();
})();

function planWeekStart(index) {
  return new Date(PLAN_START_MS + index * PLAN_WEEK_MS);
}

/* Örnek: 26 Eki–1 Kas 2026 veya 2–8 Kas 2026 */
function planWeekRange(index) {
  const start = planWeekStart(index);
  const end = new Date(start.getTime() + 6 * DAY_MS);
  const sameMonth = start.getMonth() === end.getMonth();
  const startPart = sameMonth
    ? String(start.getDate())
    : `${start.getDate()} ${MONTHS_TR[start.getMonth()]}`;
  return `${startPart}–${end.getDate()} ${MONTHS_TR[end.getMonth()]} ${end.getFullYear()}`;
}

/* Takvimde bugünü kapsayan plan haftasının sırası; plan başlamadıysa ya da bittiyse -1. */
function currentPlanIndex(now = Date.now()) {
  if (now < PLAN_START_MS) return -1;
  const index = Math.floor((now - PLAN_START_MS) / PLAN_WEEK_MS);
  return index < PLAN_WEEKS.length ? index : -1;
}

const els = {
  weekRow: document.getElementById('week-row'),
  textRow: document.getElementById('text-row'),
  puheRow: document.getElementById('puhe-row'),
  kirjaRow: document.getElementById('kirja-row'),
  kirja2Row: document.getElementById('kirja2-row'),
  kirja3Row: document.getElementById('kirja3-row'),
  kirja4Row: document.getElementById('kirja4-row'),
  kirja5Row: document.getElementById('kirja5-row'),
  itseRow: document.getElementById('itse-row'),
  foneRow: document.getElementById('fone-row'),
  ruotsiRow: document.getElementById('ruotsi-row'),
  trukkiRow: document.getElementById('trukki-row'),
  ennakointiRow: document.getElementById('ennakointi-row'),
  sanastoRow: document.getElementById('sanasto-row'),
  viewRow: document.getElementById('view-row'),
  modeRow: document.getElementById('mode-row'),
  docSwitch: document.getElementById('doc-switch'),
  planNow: document.getElementById('plan-now'),
  planProgress: document.getElementById('plan-progress'),
  planProgressLabel: document.getElementById('plan-progress-label'),
  planProgressTrack: document.getElementById('plan-progress-track'),
  planProgressFill: document.getElementById('plan-progress-fill'),
  planProgressJump: document.getElementById('plan-progress-jump'),
  planSummary: document.getElementById('plan-summary'),
  planChart: document.getElementById('plan-chart'),
  reviewView: document.getElementById('review-view'),
  examView: document.getElementById('exam-view'),
  shortcutHint: document.getElementById('shortcut-hint'),
  card: document.getElementById('card'),
  cardBadge: document.getElementById('card-badge'),
  cardWeek: document.getElementById('card-week'),
  promptLang: document.getElementById('prompt-lang'),
  prompt: document.getElementById('prompt'),
  answer: document.getElementById('answer'),
  answerLang: document.getElementById('answer-lang'),
  answerText: document.getElementById('answer-text'),
  note: document.getElementById('card-note'),
  flipBtn: document.getElementById('flip-btn'),
  speakBtn: document.getElementById('speak-btn'),
  grades: document.getElementById('grades'),
  done: document.getElementById('done'),
  progressWrap: document.getElementById('progress-wrap'),
  progressLabel: document.getElementById('progress-label'),
  progressCount: document.getElementById('progress-count'),
  progressBar: document.getElementById('progress-bar'),
  statDue: document.getElementById('stat-due'),
  statToday: document.getElementById('stat-today'),
  statStreak: document.getElementById('stat-streak'),
  statLearned: document.getElementById('stat-learned'),
  statSanastot: document.getElementById('stat-sanastot'),
  doneTitle: document.getElementById('done-title'),
  doneText: document.getElementById('done-text'),
  doneContinue: document.getElementById('done-continue'),
  doneNextWeek: document.getElementById('done-next-week'),
  doneResetWeek: document.getElementById('done-reset-week'),
  resetAll: document.getElementById('reset-all'),
  /* sınav */
  examStart: document.getElementById('exam-start'),
  examRun: document.getElementById('exam-run'),
  examResult: document.getElementById('exam-result'),
  examStartBtn: document.getElementById('exam-start-btn'),
  examCount: document.getElementById('exam-count'),
  examKinds: document.getElementById('exam-kinds'),
  examScopeHint: document.getElementById('exam-scope-hint'),
  examLast: document.getElementById('exam-last'),
  examAvg: document.getElementById('exam-avg'),
  examTotal: document.getElementById('exam-total'),
  examCounter: document.getElementById('exam-counter'),
  examScore: document.getElementById('exam-score'),
  examBar: document.getElementById('exam-bar'),
  examBadge: document.getElementById('exam-badge'),
  examWeek: document.getElementById('exam-week'),
  examPromptLang: document.getElementById('exam-prompt-lang'),
  examPrompt: document.getElementById('exam-prompt'),
  examSpeak: document.getElementById('exam-speak'),
  examOptions: document.getElementById('exam-options'),
  examFeedback: document.getElementById('exam-feedback'),
  examFeedbackText: document.getElementById('exam-feedback-text'),
  examNote: document.getElementById('exam-note'),
  examNext: document.getElementById('exam-next'),
  scoreRing: document.getElementById('score-ring'),
  scoreValue: document.getElementById('score-value'),
  scoreSub: document.getElementById('score-sub'),
  resultTitle: document.getElementById('result-title'),
  resultText: document.getElementById('result-text'),
  gradeNote: document.getElementById('grade-note'),
  wrongList: document.getElementById('wrong-list'),
  examRestart: document.getElementById('exam-restart'),
  examReviewWrong: document.getElementById('exam-review-wrong'),
  examToReview: document.getElementById('exam-to-review'),
  /* pratik */
  practiceView: document.getElementById('practice-view'),
  practiceStart: document.getElementById('practice-start'),
  practiceRun: document.getElementById('practice-run'),
  practiceResult: document.getElementById('practice-result'),
  practiceStartBtn: document.getElementById('practice-start-btn'),
  practiceCount: document.getElementById('practice-count'),
  practiceKinds: document.getElementById('practice-kinds'),
  practiceScopeHint: document.getElementById('practice-scope-hint'),
  practiceLast: document.getElementById('practice-last'),
  practiceAvg: document.getElementById('practice-avg'),
  practiceTotal: document.getElementById('practice-total'),
  practiceCounter: document.getElementById('practice-counter'),
  practiceScore: document.getElementById('practice-score'),
  practiceBar: document.getElementById('practice-bar'),
  practiceBadge: document.getElementById('practice-badge'),
  practiceWeek: document.getElementById('practice-week'),
  practicePrompt: document.getElementById('practice-prompt'),
  practiceForm: document.getElementById('practice-form'),
  practiceInput: document.getElementById('practice-input'),
  practiceCheck: document.getElementById('practice-check'),
  practiceHint: document.getElementById('practice-hint'),
  practiceFeedback: document.getElementById('practice-feedback'),
  practiceFeedbackText: document.getElementById('practice-feedback-text'),
  practiceAnswer: document.getElementById('practice-answer'),
  practiceNote: document.getElementById('practice-note'),
  practiceSpeak: document.getElementById('practice-speak'),
  practiceMic: document.getElementById('practice-mic'),
  practiceMicStatus: document.getElementById('practice-mic-status'),
  practiceHintBtn: document.getElementById('practice-hint-btn'),
  practiceNext: document.getElementById('practice-next'),
  practiceRing: document.getElementById('practice-ring'),
  practicePct: document.getElementById('practice-pct'),
  practiceSub: document.getElementById('practice-sub'),
  practiceResultTitle: document.getElementById('practice-result-title'),
  practiceResultText: document.getElementById('practice-result-text'),
  practiceWrong: document.getElementById('practice-wrong'),
  practiceRestart: document.getElementById('practice-restart'),
  practiceReviewWrong: document.getElementById('practice-review-wrong'),
  practiceToReview: document.getElementById('practice-to-review'),
  /* trukki bölüm sayfasına dönüş */
  examChapterBack: document.getElementById('exam-chapter-back'),
  practiceChapterBack: document.getElementById('practice-chapter-back'),
};

const state = {
  view: 'review',
  week: 'all',
  mode: 'fi-tr',
  queue: [],
  current: null,
  flipped: false,
  sessionTotal: 0,
  sessionDone: 0,
  busy: false,
};

/* ---------------- Kalıcı ilerleme ---------------- */

function emptyProgress() {
  return { cards: {}, stats: { streak: 0, lastDay: null, day: null, dayCount: 0 } };
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw);
    return {
      cards: parsed.cards && typeof parsed.cards === 'object' ? parsed.cards : {},
      stats: { ...emptyProgress().stats, ...(parsed.stats || {}) },
    };
  } catch {
    return emptyProgress();
  }
}

let progress = loadProgress();

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* Depolama engelliyse uygulama oturum boyunca çalışmaya devam eder. */
  }
}

function cardState(id) {
  const existing = progress.cards[id];
  if (existing) return existing;
  return { reps: 0, interval: 0, ease: 2.5, due: 0, lapses: 0, seen: 0 };
}

function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/* ---------------- Yardımcılar ---------------- */

function isDue(card, now = Date.now()) {
  return cardState(card.id).due <= now;
}

/* Belge desteleri: 'm…' metin desteleri, 'p…' puhekieli desteleri, 'k…' kitap bölümleri,
   'tr…' trukki bölümleri, 'en…' ennakointi terimleri. Trukki ve ennakointi kimlikleri
   sayı değil, bu yüzden ayrıca eşlenir; aksi hâlde deste havuzu boş kalır. */
function isDocDeck(id) {
  return (
    typeof id === 'string' &&
    (id.charAt(0) === 'm' ||
      id.charAt(0) === 'p' ||
      id.charAt(0) === 'k' ||
      id.indexOf('en-') === 0 ||
      id.indexOf('sanasto-') === 0 ||
      /^tr\d+$/.test(id))
  );
}

function poolFor(deck) {
  if (deck === 'all') return CARD_POOL;
  /* karışık puhekieli destesi: harf destelerinin bütün kartları */
  if (deck === PUHE_MIXED_ID) return PUHE_CARDS;
  if (PLAN_DECK_BY_WEEK.has(String(deck))) {
    return DOC_CARDS.filter((c) => c.week === PLAN_DECK_BY_WEEK.get(String(deck)));
  }
  if (isDocDeck(deck)) return DOC_CARDS.filter((c) => c.week === deck);
  return ALL_CARDS.filter((c) => c.week === Number(deck));
}

function deckLabel(deck) {
  if (deck === 'all') return 'tüm desteler';
  if (PLAN_DECK_BY_WEEK.has(String(deck))) {
    const plan = PLAN_WEEKS.find((week) => week.id === String(deck));
    return `Hafta ${plan.id} · Kappale ${plan.n}`;
  }
  if (isDocDeck(deck)) {
    const found = DOC_DECKS.find((d) => d.id === deck);
    return found ? `${found.short} · ${found.tr}` : 'deste';
  }
  return `Hafta ${Number(deck)}`;
}

/* Sınav ve pratik metinleri için kapsam adı: hafta destelerinde "hafta",
   metin/puhekieli/kitap/trukki destelerinde "deste". */
function scopeTexts() {
  if (isDocDeck(state.week)) {
    return { pick: 'başka bir deste seç', focus: 'bu desteyi' };
  }
  return { pick: 'başka bir hafta seç', focus: 'bu haftayı' };
}

function scopeCards() {
  return poolFor(state.week);
}

function dueCount(weekId, now = Date.now()) {
  return poolFor(weekId).filter((c) => isDue(c, now)).length;
}

function learnedCount() {
  return CARD_POOL.filter((c) => cardState(c.id).reps > 0).length;
}

function intervalLabel(days) {
  if (days < 1) return 'bugün';
  if (days === 1) return '1 gün';
  if (days < 30) return `${days} gün`;
  if (days < 365) return `${Math.round(days / 30)} ay`;
  return `${(days / 365).toFixed(1)} yıl`;
}

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ---------------- Tekrar oturumu ---------------- */

/* Rapordaki terim sınavından ve sanastot quizinden gelen tekrar istekleri.
   İstekler deste başına tutulur: { deck, cards, queues }. `queues` yoksa eski
   { deck, cards } kaydı okunur. */
function reviewQueues(parsed) {
  if (!parsed || typeof parsed !== 'object') return {};
  if (parsed.queues && typeof parsed.queues === 'object') return parsed.queues;
  if (parsed.deck && Array.isArray(parsed.cards)) return { [parsed.deck]: parsed.cards };
  return {};
}

function writeReviewQueues(map) {
  const keys = Object.keys(map).filter((id) => Array.isArray(map[id]) && map[id].length);
  if (!keys.length) {
    localStorage.removeItem(TEKRAR_KEY);
    return;
  }
  localStorage.setItem(
    TEKRAR_KEY,
    JSON.stringify({ deck: keys[0], cards: map[keys[0]], queues: map }),
  );
}

function pendingReviews(deckId) {
  try {
    const parsed = JSON.parse(localStorage.getItem(TEKRAR_KEY) || 'null');
    const list = reviewQueues(parsed)[deckId];
    if (!Array.isArray(list)) return new Set();
    return new Set(list.filter((id) => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

/* İstek, kart gerçekten çalışılıncaya kadar durur: tur yarıda bırakılırsa
   kart bir sonraki turda yine kuyruğun başında gelir. */
function resolvePendingReview(deckId, cardId) {
  try {
    const parsed = JSON.parse(localStorage.getItem(TEKRAR_KEY) || 'null');
    const map = reviewQueues(parsed);
    if (!Array.isArray(map[deckId])) return;
    map[deckId] = map[deckId].filter((id) => id !== cardId);
    writeReviewQueues(map);
  } catch {
    /* Depolama engelliyse kuyruk yine kurulur. */
  }
}

function buildQueue() {
  const now = Date.now();
  const pool = scopeCards();
  const reviews = pool
    .filter((c) => {
      const s = cardState(c.id);
      return s.reps > 0 && s.due <= now;
    })
    .sort((a, b) => cardState(a.id).due - cardState(b.id).due);

  const fresh = shuffle(pool.filter((c) => cardState(c.id).reps === 0)).slice(0, NEW_CARD_LIMIT);

  let queue = [...reviews, ...fresh].slice(0, SESSION_LIMIT);

  /* Sınavda yanlış çıkan terimler öne alınır; istek kart çalışılınca silinir. */
  const flagged = isDocDeck(state.week) ? pendingReviews(state.week) : new Set();
  if (flagged.size) {
    const front = pool.filter((card) => flagged.has(card.id));
    queue = [...front, ...queue.filter((card) => !flagged.has(card.id))].slice(0, SESSION_LIMIT);
  }

  state.queue = queue;
  state.sessionTotal = queue.length;
  state.sessionDone = 0;
}

/* ---------------- Arayüz: ortak ---------------- */

/* Sanasto quizlerinin doğru oranı: SM1 ve SM2 ayrı anahtarlarda tutulur.
   Her kitap kendi quiz sayfasına bağlanır; karta tıklayınca o quiz açılır. */
const SANASTO_BOOKS = [
  ['SM1', 'suomi-kartat-sanastot-ilerleme-v1', 'sanastot.html#sa-quiz'],
  ['SM2', 'suomi-kartat-sanastot2-ilerleme-v1', 'sanastot2.html#sa-quiz'],
];

function sanastoQuizPercent(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    const all = saved && saved.all;
    if (!all || !all.asked) return null;
    return Math.round((all.correct / all.asked) * 100);
  } catch {
    return null;
  }
}

function renderSanastoStats() {
  if (!els.statSanastot) return;
  els.statSanastot.textContent = '';
  SANASTO_BOOKS.forEach(([name, key, href], index) => {
    if (index) els.statSanastot.appendChild(document.createTextNode(' · '));
    const percent = sanastoQuizPercent(key);
    const link = document.createElement('a');
    link.className = 'stat-link';
    link.href = href;
    link.textContent = percent === null ? `${name} —` : `${name} %${percent}`;
    link.title = `${name} sanasto quizini aç`;
    els.statSanastot.appendChild(link);
  });
}

/* Başka sekmede quiz çözülünce oranlar tazelensin. */
function watchSanastoStats() {
  window.addEventListener('storage', (event) => {
    if (!event.key || event.key.indexOf('sanastot') !== -1) renderSanastoStats();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) renderSanastoStats();
  });
}

watchSanastoStats();

function renderStats() {
  els.statDue.textContent = String(dueCount('all'));
  const stats = progress.stats;
  els.statToday.textContent = String(stats.day === todayKey() ? stats.dayCount : 0);
  els.statStreak.textContent = String(stats.streak || 0);
  els.statLearned.textContent = `${learnedCount()}/${CARD_POOL.length}`;
  renderSanastoStats();
}

function deckButton(item) {
  const due = dueCount(item.id);
  const active = state.week === item.id;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className =
    'week-btn' +
    (active ? ' is-active' : '') +
    (item.done ? ' is-done' : '') +
    (item.current ? ' is-current' : '');
  btn.setAttribute('role', 'tab');
  btn.setAttribute('aria-selected', active ? 'true' : 'false');
  if (item.current) btn.dataset.current = 'true';
  const title = item.done ? `${item.title} · ${item.doneLabel || 'Alıştırma tamamlandı'}` : item.title;
  btn.title = item.current ? `${title} · Bu hafta` : title;
  btn.dataset.deck = item.id;
  btn.innerHTML =
    `${item.label}` +
    (item.dateLabel ? `<span class="week-date">${item.dateLabel}</span>` : '') +
    `<span class="week-due" data-empty="${due === 0}">${due}</span>` +
    (item.done ? '<span class="done-mark" aria-hidden="true">✓</span>' : '');
  btn.addEventListener('click', () => selectWeek(item.id));
  return btn;
}

function renderWeeks() {
  if (!els.weekRow) return;
  els.weekRow.innerHTML = '';
  /* Sayfa açıldığında bütün paneller kapalı gelir. */
  setDeckGroupTitle(els.weekRow, 'Hafta seçimi');
  const currentIndex = currentPlanIndex();
  const planStats = planWeekStats();
  const doneWeeks = new Set(planStats.filter((week) => week.done).map((week) => week.week.id));
  const items = [
    { id: 'all', label: 'Tümü', title: `Tüm desteler birlikte (${CARD_POOL.length} kart)` },
    ...WEEKS.map((w) => ({ id: String(w.id), label: `Hafta ${w.id}`, title: w.title })),
    ...PLAN_WEEKS.map((w, index) => ({
      id: w.id,
      label: `Hafta ${w.id}`,
      title: `${w.title} · ${planWeekRange(index)}`,
      dateLabel: planWeekRange(index).replace(/ \d{4}$/, ''),
      current: index === currentIndex,
      done: doneWeeks.has(w.id),
      doneLabel: 'Hafta tamamlandı',
    })),
  ];
  items.forEach((item) => els.weekRow.appendChild(deckButton(item)));
  renderPlanNow(currentIndex);
  renderPlanProgress();
  renderTextDecks();
  renderPuheDecks();
  renderKirjaDecks();
  renderKirja2Decks();
  renderKirja3Decks();
  renderKirja4Decks();
  renderKirja5Decks();
  renderItseDecks();
  renderFoneDecks();
  renderRuotsiDecks();
  renderTrukkiDecks();
  renderEnnakointiDecks();
}

/* Plan ilerlemesi: bir hafta, destesindeki bütün kartlar en az bir kez
   çalışıldığında tamamlanmış sayılır. */
function planWeekStats() {
  return PLAN_WEEKS.map((week) => {
    const cards = poolFor(week.id);
    const studied = cards.filter((card) => cardState(card.id).reps > 0).length;
    return { week, total: cards.length, studied, done: cards.length > 0 && studied === cards.length };
  });
}

function renderPlanProgress() {
  if (!els.planProgress) return;

  const stats = planWeekStats();
  const done = stats.filter((week) => week.done).length;
  const totalCards = stats.reduce((sum, week) => sum + week.total, 0);
  const studiedCards = stats.reduce((sum, week) => sum + week.studied, 0);

  els.planProgress.hidden = false;
  els.planProgressLabel.textContent = `${done} / ${stats.length} hafta tamamlandı`;
  els.planProgressLabel.title = `${studiedCards} / ${totalCards} kart en az bir kez çalışıldı`;

  if (els.planProgressTrack) {
    els.planProgressTrack.setAttribute('aria-valuemax', String(stats.length));
    els.planProgressTrack.setAttribute('aria-valuenow', String(done));
    els.planProgressTrack.setAttribute('aria-valuetext', `${done} / ${stats.length} hafta tamamlandı`);
  }
  if (els.planProgressFill) {
    els.planProgressFill.style.width =
      (stats.length ? (done / stats.length) * 100 : 0) + '%';
  }

  /* Tamamlanan haftalar: hem özet rozetleri hem mini grafik aynı listeyi kullanır. */
  const doneStats = stats.filter((week) => week.done);

  /* Kısa haftalık özet: yalnız tamamlanan haftalar, her birinde çalışılan kart sayısı. */
  if (els.planSummary) {
    els.planSummary.textContent = '';
    els.planSummary.hidden = doneStats.length === 0;

    if (doneStats.length) {
      const lead = document.createElement('span');
      lead.className = 'plan-summary-label';
      lead.textContent = 'Tamamlanan haftalar:';
      els.planSummary.append(lead);

      doneStats.forEach((week) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'plan-summary-week';
        chip.dataset.planWeek = week.week.id;
        chip.title = `${week.week.title} · ${week.studied} / ${week.total} kart çalışıldı`;
        chip.setAttribute(
          'aria-label',
          `Hafta ${week.week.id} destesini aç (${week.studied} kart çalışıldı)`
        );

        const name = document.createElement('b');
        name.textContent = `Hafta ${week.week.id}`;
        chip.append(name, ` · ${week.studied} kart`);

        /* Rozet kendi haftasının destesini açar; hafta şeridi de aynı seçimi gösterir. */
        chip.addEventListener('click', () => {
          selectWeek(week.week.id);
          scrollActiveWeekIntoView();
        });

        els.planSummary.append(chip);
      });

      const studiedTotal = doneStats.reduce((sum, week) => sum + week.studied, 0);
      els.planSummary.title =
        `${doneStats.length} tamamlanan haftada toplam ${studiedTotal} kart en az bir kez çalışıldı`;
    } else {
      els.planSummary.removeAttribute('title');
    }
  }

  /* Mini çubuk grafik: tamamlanan haftaların kart sayısı, en büyük haftaya göre ölçeklenir. */
  if (els.planChart) {
    els.planChart.textContent = '';
    els.planChart.hidden = doneStats.length === 0;

    if (doneStats.length) {
      const maxStudied = Math.max(...doneStats.map((week) => week.studied)) || 1;
      const parts = [];

      doneStats.forEach((week) => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'plan-chart-row';
        row.dataset.planWeek = week.week.id;
        row.title = `${week.week.title} · ${week.studied} kart çalışıldı — desteyi aç`;
        row.setAttribute(
          'aria-label',
          `Hafta ${week.week.id} destesini aç (Kappale ${week.week.n}, ${week.studied} kart çalışıldı)`
        );

        /* Satır kendi haftasının destesini açar; hafta şeridi aynı seçimi gösterir. */
        row.addEventListener('click', () => {
          selectWeek(week.week.id);
          scrollActiveWeekIntoView();
        });

        const label = document.createElement('span');
        label.className = 'plan-chart-label';
        label.textContent = week.week.id;

        const track = document.createElement('span');
        track.className = 'plan-chart-track';
        const bar = document.createElement('span');
        bar.className = 'plan-chart-bar';
        bar.style.width = `${((week.studied / maxStudied) * 100).toFixed(1)}%`;
        track.append(bar);

        const value = document.createElement('span');
        value.className = 'plan-chart-value';
        value.textContent = String(week.studied);

        row.append(label, track, value);
        els.planChart.append(row);
        parts.push(`Hafta ${week.week.id}: ${week.studied} kart`);
      });

      els.planChart.setAttribute(
        'aria-label',
        `Tamamlanan haftalar — ${parts.join(', ')}. Desteyi açmak için haftaya tıkla.`
      );
    }
  }

  const next = stats.find((week) => !week.done) || null;
  if (els.planProgressJump) {
    els.planProgressJump.disabled = !next;
    els.planProgressJump.textContent = next
      ? `Sıradaki: Hafta ${next.week.id}`
      : 'Plan tamamlandı';
    els.planProgressJump.setAttribute(
      'aria-label',
      next
        ? `Sıradaki tamamlanmamış haftayı aç: Hafta ${next.week.id} (Kappale ${next.week.n})`
        : 'Kitap 4 planı tamamlandı'
    );
    if (next) els.planProgressJump.dataset.planWeek = next.week.id;
    else delete els.planProgressJump.dataset.planWeek;
  }
  if (els.planProgressTrack) {
    if (next) {
      els.planProgressTrack.dataset.planWeek = next.week.id;
      els.planProgressTrack.title = `İlk tamamlanmamış haftayı aç: Hafta ${next.week.id}`;
    } else {
      delete els.planProgressTrack.dataset.planWeek;
      els.planProgressTrack.title = 'Kitap 4 planı tamamlandı';
    }
  }
}

/* İlk tamamlanmamış plan haftasını açar; hepsi bittiyse hiçbir şey yapmaz. */
function jumpToNextPlanWeek() {
  const next = planWeekStats().find((week) => !week.done);
  if (!next) return;
  selectWeek(next.week.id);
  scrollActiveWeekIntoView();
}

/* Takvimde bu haftaya denk gelen Kitap 4 destesini vurgular. */
function renderPlanNow(index) {
  if (!els.planNow) return;
  els.planNow.hidden = false;

  if (index >= 0) {
    const week = PLAN_WEEKS[index];
    els.planNow.innerHTML = '';
    els.planNow.append('Bu haftanın destesi: ');

    const label = document.createElement('b');
    label.textContent = `Hafta ${week.id} · Kappale ${week.n}`;
    els.planNow.append(label, ` · ${planWeekRange(index)} `);

    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'plan-now-btn';
    open.textContent = 'Desteyi aç';
    open.setAttribute('aria-label', `Hafta ${week.id} destesini aç (Kappale ${week.n})`);
    open.addEventListener('click', () => {
      selectWeek(week.id);
      scrollActiveWeekIntoView();
    });
    els.planNow.append(open);

    els.planNow.dataset.week = week.id;
    return;
  }

  els.planNow.dataset.week = '';
  els.planNow.textContent =
    Date.now() < PLAN_START_MS
      ? `Kitap 4 planı ${planWeekRange(0)} tarihinde başlıyor (Hafta 17).`
      : 'Kitap 4 planı tamamlandı (Hafta 24) — desteleri istediğiniz zaman açabilirsiniz.';
}

/* ---------- Deste şeritleri: açılır-kapanır başlık ---------- */

/* Aynı anda yalnızca bir şerit açık kalır. */
let openDeckGroup = null;

/* Kapanma animasyonu bitince paneli gizle; yarım kalan zamanlayıcıyı temizle. */
function hideDeckPanelLater(panel) {
  clearTimeout(panel.hideTimer);
  const duration = parseFloat(getComputedStyle(panel).transitionDuration) * 1000 || 0;
  panel.hideTimer = setTimeout(() => {
    if (panel.classList.contains('is-open')) return;
    panel.hidden = true;
  }, duration + 40);
}

function setDeckGroupOpen(group, open) {
  const toggle = group.querySelector('.deck-group-toggle');
  const panel = group.querySelector('.deck-group-panel');
  if (!toggle || !panel) return;

  toggle.setAttribute('aria-expanded', String(open));
  clearTimeout(panel.hideTimer);

  if (open) {
    panel.hidden = false;
    /* Gizli panelden yükseklik geçişini başlatmak için bir kare bekle. */
    requestAnimationFrame(() => panel.classList.add('is-open'));
    return;
  }

  panel.classList.remove('is-open');
  hideDeckPanelLater(panel);
}

function toggleDeckGroup(group) {
  const toggle = group.querySelector('.deck-group-toggle');
  const open = Boolean(toggle) && toggle.getAttribute('aria-expanded') === 'true';

  if (!open && openDeckGroup && openDeckGroup !== group) setDeckGroupOpen(openDeckGroup, false);
  setDeckGroupOpen(group, !open);
  openDeckGroup = open ? null : group;
}

/* Şeridin başlığını kurar: ilk çağrıda başlık düğmesini ve paneli oluşturup
   şeridi panelin içine taşır; sonraki çağrılar yalnızca başlığı tazeler
   (böylece panelin açık/kapalı durumu korunur). */
function setDeckGroupTitle(row, title, href, startOpen = false) {
  if (!row) return;

  let group = row.closest('.deck-group');

  if (!group) {
    group = document.createElement('div');
    group.className = 'deck-group';
    row.parentNode.insertBefore(group, row);

    const head = document.createElement('div');
    head.className = 'deck-group-head';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'deck-group-toggle';
    toggle.id = `${row.id}-toggle`;
    toggle.setAttribute('aria-expanded', 'false');

    const caret = document.createElement('span');
    caret.className = 'deck-group-caret';
    caret.setAttribute('aria-hidden', 'true');

    const titleEl = document.createElement('span');
    titleEl.className = 'deck-group-title';
    toggle.append(caret, titleEl);

    const panel = document.createElement('div');
    panel.className = 'deck-group-panel';
    panel.id = `${row.id}-panel`;
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-labelledby', toggle.id);
    panel.hidden = true;

    const body = document.createElement('div');
    body.className = 'deck-group-body';
    body.appendChild(row);
    panel.appendChild(body);

    toggle.setAttribute('aria-controls', panel.id);
    head.appendChild(toggle);
    group.append(head, panel);

    toggle.addEventListener('click', () => toggleDeckGroup(group));

    /* Varsayılanı açık paneller ilk boyamada animasyonsuz görünür. */
    if (startOpen) {
      panel.hidden = false;
      panel.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      openDeckGroup = group;
    }
  }

  const titleEl = group.querySelector('.deck-group-title');
  if (titleEl) titleEl.textContent = title;

  if (href) {
    const head = group.querySelector('.deck-group-head');
    if (head && !head.querySelector('.deck-group-link')) {
      const link = document.createElement('a');
      link.className = 'deck-group-link';
      link.href = href;
      link.textContent = 'Sayfayı aç';
      link.title = 'Bölüm sayfasına git';
      head.appendChild(link);
    }
  }
}

/* Araç çubuğundaki buton grupları da aynı açılır-kapanır düzene katılır:
   çalışma modu, kart yönü ve eşlik sayfaları başlık altında toplanır. */
function renderControlGroups() {
  setDeckGroupTitle(els.viewRow, 'Çalışma modu');
  setDeckGroupTitle(els.modeRow, 'Kart yönü');
  setDeckGroupTitle(els.docSwitch, 'Eşlik sayfaları');
}

/* Okuma metinlerinin kelime listeleri: her metin kendi destesi. */
function renderTextDecks() {
  if (!els.textRow) return;
  els.textRow.innerHTML = '';

  setDeckGroupTitle(els.textRow, 'Metin desteleri');

  TEXT_DECKS.forEach((deck) => {
    els.textRow.appendChild(
      deckButton({
        id: deck.id,
        label: `Metin ${deck.n}`,
        title: `${deck.title} · ${deck.tr} · ${deck.words.length} kart`,
      })
    );
  });
}

/* Puhekieli sözlüğü: her harf kendi destesi. */
function renderPuheDecks() {
  if (!els.puheRow) return;
  els.puheRow.innerHTML = '';

  setDeckGroupTitle(els.puheRow, 'Puhekieli desteleri');

  PUHE_DECKS.forEach((deck) => {
    els.puheRow.appendChild(
      deckButton({
        id: deck.id,
        label: `Puhe ${deck.n}`,
        title: `${deck.title} · ${deck.tr} · ${deck.words ? deck.words.length : deck.count} kart`,
      })
    );
  });
}

/* İlerleme çizgisinin ipucu: dört sorusu da doğru olan bölümlerin adları. */
function chapterProgressHint(done, decks, perQuiz = 4) {
  const items = decks
    .filter((deck) => done.has(deck.id))
    .map((deck) => ({ id: deck.id, label: deck.short || `Kappale ${deck.n}` }));
  const labels = items.map((item) => item.label);

  if (!items.length) {
    return {
      title: `Henüz tamamlanan bölüm yok — ${perQuiz} soruyu da doğru cevapla bölüm işaretlenir`,
      valueText: `0/${decks.length} bölüm tamamlandı`,
      note: 'Henüz tamamlanan bölüm yok',
      items,
    };
  }

  return {
    title: `Tamamlandı: ${labels.join(', ')}`,
    valueText: `${labels.length}/${decks.length} bölüm tamamlandı · ${labels.join(', ')}`,
    note: `${labels.length}/${decks.length} tamamlandı`,
    items,
  };
}

/* Durum metnini ve ayrıntı düğmesinin bölüm listesini yazar. */
function applyProgressNote(id, hint, doneCount) {
  const note = document.getElementById(id);
  if (!note) return;

  note.dataset.done = String(doneCount > 0);

  const text = document.getElementById(`${id}-text`);
  if (text) text.textContent = hint.note;

  const list = document.getElementById(`${id}-list`);
  if (!list) return;

  list.innerHTML = '';
  const items = hint.items || [];
  list.hidden = items.length === 0;

  items.forEach((entry) => {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.className = 'kirja-progress-note-link';
    link.href = `?deste=${entry.id}`;
    link.textContent = entry.label;
    /* Sol tık: sayfa yenilenmeden desteyi aç, ayrıntı düğmesini kapat.
       Ctrl/Cmd/Shift/orta tık normal bağlantı davranışını korur (yeni sekme). */
    link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;

      event.preventDefault();
      selectWeek(entry.id, 'silent');
      scrollActiveWeekIntoView();
      highlightCardArea();
      if (note.tagName === 'DETAILS') note.open = false;
      syncUrl('push');
    });
    item.appendChild(link);
    list.appendChild(item);
  });
}

/* Kitap sayfasındaki mini alıştırma kayıtları: dört sorusu da doğru olan bölümler. */
const KIRJA_QUIZ_KEY = 'suomi-kartat-kirja-v1';

function kirjaDoneChapters() {
  const done = new Set();
  let stored;

  try {
    stored = JSON.parse(localStorage.getItem(KIRJA_QUIZ_KEY) || '{}');
  } catch (error) {
    return done;
  }
  if (!stored || typeof stored !== 'object') return done;

  KIRJA.forEach((chapter) => {
    const entry = stored[chapter.id];
    if (!entry || !Array.isArray(entry.answers)) return;

    const quiz = chapter.quiz || [];
    if (!quiz.length || entry.answers.length !== quiz.length) return;

    const allCorrect = quiz.every((item, index) => entry.answers[index] === item.a);
    if (allCorrect) done.add(chapter.id);
  });

  return done;
}

/* Suomen mestari 1 bölümleri: her kappale kendi destesi. */
function renderKirjaDecks() {
  if (!els.kirjaRow) return;
  els.kirjaRow.innerHTML = '';

  const done = kirjaDoneChapters();
  setDeckGroupTitle(els.kirjaRow, `Kitap desteleri · ${done.size}/${KIRJA_DECKS.length}`, 'kirja.html');

  const progressLink = document.getElementById('kirja-progress-link');
  const progressTrack = document.getElementById('kirja-progress-track');
  const progressFill = document.getElementById('kirja-progress-fill');
  const hint = chapterProgressHint(done, KIRJA_DECKS);
  if (progressLink) progressLink.title = hint.title;
  applyProgressNote('kirja-progress-note', hint, done.size);
  if (progressTrack) {
    progressTrack.setAttribute('aria-valuenow', String(done.size));
    progressTrack.setAttribute('aria-valuetext', hint.valueText);
  }
  if (progressFill) {
    progressFill.style.width =
      (KIRJA_DECKS.length ? (done.size / KIRJA_DECKS.length) * 100 : 0) + '%';
  }

  KIRJA_DECKS.forEach((deck) => {
    els.kirjaRow.appendChild(
      deckButton({
        id: deck.id,
        label: `Kappale ${deck.n}`,
        title: `${deck.title} · ${deck.tr} · ${deck.words.length} kart`,
        done: done.has(deck.id),
      })
    );
  });
}

/* Suomen mestari 2 bölümleri: ayrı kayıt anahtarı, ayrı deste şeridi. */
const KIRJA2_QUIZ_KEY = 'suomi-kartat-kirja2-v1';

function kirja2DoneChapters() {
  const done = new Set();
  let stored;

  try {
    stored = JSON.parse(localStorage.getItem(KIRJA2_QUIZ_KEY) || '{}');
  } catch (error) {
    return done;
  }
  if (!stored || typeof stored !== 'object') return done;

  KIRJA2.forEach((chapter) => {
    const entry = stored[chapter.id];
    if (!entry || !Array.isArray(entry.answers)) return;

    const quiz = chapter.quiz || [];
    if (!quiz.length || entry.answers.length !== quiz.length) return;

    if (quiz.every((item, index) => entry.answers[index] === item.a)) done.add(chapter.id);
  });

  return done;
}

function renderKirja2Decks() {
  if (!els.kirja2Row) return;
  els.kirja2Row.innerHTML = '';

  const done = kirja2DoneChapters();
  setDeckGroupTitle(els.kirja2Row, `Kitap 2 desteleri · ${done.size}/${KIRJA2_DECKS.length}`, 'kirja2.html');

  const progressLink = document.getElementById('kirja2-progress-link');
  const progressTrack = document.getElementById('kirja2-progress-track');
  const progressFill = document.getElementById('kirja2-progress-fill');
  const hint = chapterProgressHint(done, KIRJA2_DECKS);
  if (progressLink) progressLink.title = hint.title;
  applyProgressNote('kirja2-progress-note', hint, done.size);
  if (progressTrack) {
    progressTrack.setAttribute('aria-valuenow', String(done.size));
    progressTrack.setAttribute('aria-valuetext', hint.valueText);
  }
  if (progressFill) {
    progressFill.style.width =
      (KIRJA2_DECKS.length ? (done.size / KIRJA2_DECKS.length) * 100 : 0) + '%';
  }

  KIRJA2_DECKS.forEach((deck) => {
    els.kirja2Row.appendChild(
      deckButton({
        id: deck.id,
        label: `Kappale ${deck.n}`,
        title: `${deck.title} · ${deck.tr} · ${deck.words.length} kart`,
        done: done.has(deck.id),
      })
    );
  });
}

/* Suomen mestari 3 bölümleri: ayrı kayıt anahtarı, ayrı deste şeridi. */
const KIRJA3_QUIZ_KEY = 'suomi-kartat-kirja3-v1';

function kirja3DoneChapters() {
  const done = new Set();
  let stored;

  try {
    stored = JSON.parse(localStorage.getItem(KIRJA3_QUIZ_KEY) || '{}');
  } catch (error) {
    return done;
  }
  if (!stored || typeof stored !== 'object') return done;

  KIRJA3.forEach((chapter) => {
    const entry = stored[chapter.id];
    if (!entry || !Array.isArray(entry.answers)) return;

    const quiz = chapter.quiz || [];
    if (!quiz.length || entry.answers.length !== quiz.length) return;

    if (quiz.every((item, index) => entry.answers[index] === item.a)) done.add(chapter.id);
  });

  return done;
}

function renderKirja3Decks() {
  if (!els.kirja3Row) return;
  els.kirja3Row.innerHTML = '';

  const done = kirja3DoneChapters();
  setDeckGroupTitle(els.kirja3Row, `Kitap 3 desteleri · ${done.size}/${KIRJA3_DECKS.length}`, 'kirja3.html');

  const progressLink = document.getElementById('kirja3-progress-link');
  const progressTrack = document.getElementById('kirja3-progress-track');
  const progressFill = document.getElementById('kirja3-progress-fill');
  const hint = chapterProgressHint(done, KIRJA3_DECKS);
  if (progressLink) progressLink.title = hint.title;
  applyProgressNote('kirja3-progress-note', hint, done.size);
  if (progressTrack) {
    progressTrack.setAttribute('aria-valuenow', String(done.size));
    progressTrack.setAttribute('aria-valuetext', hint.valueText);
  }
  if (progressFill) {
    progressFill.style.width =
      (KIRJA3_DECKS.length ? (done.size / KIRJA3_DECKS.length) * 100 : 0) + '%';
  }

  KIRJA3_DECKS.forEach((deck) => {
    els.kirja3Row.appendChild(
      deckButton({
        id: deck.id,
        label: `Kappale ${deck.n}`,
        title: `${deck.title} · ${deck.tr} · ${deck.words.length} kart`,
        done: done.has(deck.id),
      })
    );
  });
}

/* Suomen mestari 4 bölümleri: ayrı kayıt anahtarı, ayrı deste şeridi. */
const KIRJA4_QUIZ_KEY = 'suomi-kartat-kirja4-v1';

function kirja4DoneChapters() {
  const done = new Set();
  let stored;

  try {
    stored = JSON.parse(localStorage.getItem(KIRJA4_QUIZ_KEY) || '{}');
  } catch (error) {
    return done;
  }
  if (!stored || typeof stored !== 'object') return done;

  KIRJA4.forEach((chapter) => {
    const entry = stored[chapter.id];
    if (!entry || !Array.isArray(entry.answers)) return;

    const quiz = chapter.quiz || [];
    if (!quiz.length || entry.answers.length !== quiz.length) return;

    if (quiz.every((item, index) => entry.answers[index] === item.a)) done.add(chapter.id);
  });

  return done;
}

function renderKirja4Decks() {
  if (!els.kirja4Row) return;
  els.kirja4Row.innerHTML = '';

  const done = kirja4DoneChapters();
  setDeckGroupTitle(els.kirja4Row, `Kitap 4 desteleri · ${done.size}/${KIRJA4_DECKS.length}`, 'kirja4.html');

  const progressLink = document.getElementById('kirja4-progress-link');
  const progressTrack = document.getElementById('kirja4-progress-track');
  const progressFill = document.getElementById('kirja4-progress-fill');
  const hint = chapterProgressHint(done, KIRJA4_DECKS);
  if (progressLink) progressLink.title = hint.title;
  applyProgressNote('kirja4-progress-note', hint, done.size);
  if (progressTrack) {
    progressTrack.setAttribute('aria-valuenow', String(done.size));
    progressTrack.setAttribute('aria-valuetext', hint.valueText);
  }
  if (progressFill) {
    progressFill.style.width =
      (KIRJA4_DECKS.length ? (done.size / KIRJA4_DECKS.length) * 100 : 0) + '%';
  }

  KIRJA4_DECKS.forEach((deck) => {
    els.kirja4Row.appendChild(
      deckButton({
        id: deck.id,
        label: `Kappale ${deck.n}`,
        title: `${deck.title} · ${deck.tr} · ${deck.words.length} kart`,
        done: done.has(deck.id),
      })
    );
  });
}

/* Opi puhumaan suomea bölümleri: 18 deste, ayrı şerit.
   Bu kitabın alıştırması kopyalanmadığı için ilerleme göstergesi yok. */
const KIRJA5_QUIZ_KEY = 'suomi-kartat-kirja5-v1';

function kirja5DoneChapters() {
  const done = new Set();
  let stored;

  try {
    stored = JSON.parse(localStorage.getItem(KIRJA5_QUIZ_KEY) || '{}');
  } catch (error) {
    return done;
  }
  if (!stored || typeof stored !== 'object') return done;

  KIRJA5.forEach((chapter) => {
    const entry = stored[chapter.id];
    if (!entry || !Array.isArray(entry.answers)) return;

    const quiz = chapter.quiz || [];
    if (!quiz.length || entry.answers.length !== quiz.length) return;

    if (quiz.every((item, index) => entry.answers[index] === item.a)) done.add(chapter.id);
  });

  return done;
}

function renderKirja5Decks() {
  if (!els.kirja5Row) return;
  els.kirja5Row.innerHTML = '';

  const done = kirja5DoneChapters();
  setDeckGroupTitle(els.kirja5Row, `Kitap 5 desteleri · ${done.size}/${KIRJA5_DECKS.length}`, 'kirja5.html');

  const progressLink = document.getElementById('kirja5-progress-link');
  const progressTrack = document.getElementById('kirja5-progress-track');
  const progressFill = document.getElementById('kirja5-progress-fill');
  const hint = chapterProgressHint(done, KIRJA5_DECKS);
  if (progressLink) progressLink.title = hint.title;
  applyProgressNote('kirja5-progress-note', hint, done.size);
  if (progressTrack) {
    progressTrack.setAttribute('aria-valuenow', String(done.size));
    progressTrack.setAttribute('aria-valuetext', hint.valueText);
  }
  if (progressFill) {
    progressFill.style.width =
      (KIRJA5_DECKS.length ? (done.size / KIRJA5_DECKS.length) * 100 : 0) + '%';
  }

  KIRJA5_DECKS.forEach((deck) => {
    els.kirja5Row.appendChild(
      deckButton({
        id: deck.id,
        label: `Kappale ${deck.n}`,
        title: `${deck.title} · ${deck.tr} · ${deck.words.length} kart`,
        done: done.has(deck.id),
      })
    );
  });
}


/* Itseopiskelu desteleri: kitabın 79 dersi + 4 ek bölümü ayrı birer deste. */
function renderItseDecks() {
  if (!els.itseRow) return;
  els.itseRow.innerHTML = '';

  setDeckGroupTitle(
    els.itseRow,
    `Itseopiskelu desteleri · ${ITSE_DECKS.length}`,
    'itseopiskelu.html'
  );

  ITSE_DECKS.forEach((deck) => {
    els.itseRow.appendChild(
      deckButton({
        id: deck.id,
        label: deck.part === 3 ? `Ek ${deck.n}` : `Ders ${deck.n}`,
        title: `${deck.title} · ${deck.tr} · ${deck.words.length} kart`,
        done: false,
      })
    );
  });
}

/* Fonetikka desteleri: kitabın 11 konusu + 7 metni ayrı birer deste. */
function renderFoneDecks() {
  if (!els.foneRow) return;
  els.foneRow.innerHTML = '';

  setDeckGroupTitle(
    els.foneRow,
    `Fonetikka desteleri · ${FONE_DECKS.length}`,
    'fonetiikka.html'
  );

  FONE_DECKS.forEach((deck) => {
    els.foneRow.appendChild(
      deckButton({
        id: deck.id,
        label: deck.part === 2 ? `Metin ${deck.n}` : `Bölüm ${deck.n}`,
        title: `${deck.title} · ${deck.tr} · ${deck.words.length} kart`,
        done: false,
      })
    );
  });
}

/* Ruotsi desteleri: 2000 kelimelik derleme on desteye bölünmüş. */
function renderRuotsiDecks() {
  if (!els.ruotsiRow) return;
  els.ruotsiRow.innerHTML = '';

  setDeckGroupTitle(
    els.ruotsiRow,
    `Ruotsi desteleri · ${RUOTSI_DECKS.length}`,
    'ruotsi.html'
  );

  RUOTSI_DECKS.forEach((deck) => {
    els.ruotsiRow.appendChild(
      deckButton({
        id: deck.id,
        label: `Deste ${deck.n}`,
        title: `${deck.title} · ${deck.tr} · ${deck.words.length} kart`,
        done: false,
      })
    );
  });
}

/* Turvallinen trukkityö bölümleri: 12 deste, ayrı şerit.
   Bölüm başına üç soru vardır; üçü de doğruysa bölüm tamamlanmış sayılır. */
const TRUKKI_QUIZ_KEY = 'suomi-kartat-trukki-v1';

function trukkiDoneChapters() {
  const done = new Set();
  let stored;

  try {
    stored = JSON.parse(localStorage.getItem(TRUKKI_QUIZ_KEY) || '{}');
  } catch (error) {
    return done;
  }
  if (!stored || typeof stored !== 'object') return done;

  TRUKKI.forEach((chapter) => {
    const entry = stored[chapter.id];
    if (!entry || !Array.isArray(entry.answers)) return;

    const quiz = chapter.quiz || [];
    if (!quiz.length || entry.answers.length !== quiz.length) return;

    if (quiz.every((item, index) => entry.answers[index] === item.a)) done.add(chapter.id);
  });

  return done;
}

function renderTrukkiDecks() {
  if (!els.trukkiRow) return;
  els.trukkiRow.innerHTML = '';

  const done = trukkiDoneChapters();
  setDeckGroupTitle(els.trukkiRow, `Trukki desteleri · ${done.size}/${TRUKKI_DECKS.length}`, 'trukki.html');

  const progressLink = document.getElementById('trukki-progress-link');
  const progressTrack = document.getElementById('trukki-progress-track');
  const progressFill = document.getElementById('trukki-progress-fill');
  const hint = chapterProgressHint(done, TRUKKI_DECKS, 3);
  if (progressLink) progressLink.title = hint.title;
  applyProgressNote('trukki-progress-note', hint, done.size);
  if (progressTrack) {
    progressTrack.setAttribute('aria-valuenow', String(done.size));
    progressTrack.setAttribute('aria-valuetext', hint.valueText);
  }
  if (progressFill) {
    progressFill.style.width =
      (TRUKKI_DECKS.length ? (done.size / TRUKKI_DECKS.length) * 100 : 0) + '%';
  }

  TRUKKI_DECKS.forEach((deck) => {
    els.trukkiRow.appendChild(
      deckButton({
        id: deck.id,
        label: `Luku ${deck.n}`,
        title: `${deck.title} · ${deck.tr} · ${deck.words.length} kart`,
        done: done.has(deck.id),
      })
    );
  });
}

/* Ennakointi raporunun 60 terimi tek destede; kart notu terimin geçtiği bölümü söyler. */
function renderEnnakointiDecks() {
  if (!els.ennakointiRow) return;
  els.ennakointiRow.innerHTML = '';

  setDeckGroupTitle(els.ennakointiRow, 'Ennakointi desteleri');

  ENNAKOINTI_DECKS.forEach((deck) => {
    els.ennakointiRow.appendChild(
      deckButton({
        id: deck.id,
        label: 'Ennakointi',
        title: `${deck.title} · ${deck.tr} · ${deck.words.length} kart`,
      })
    );
  });
}

/* Sanasto destesi: Suomen mestari 1 sözlüğünün 1169 girişi tek destede;
   arka yüz İngilizce olduğu için kart kendi dil etiketini taşır. */
function renderSanastoDecks() {
  if (!els.sanastoRow) return;
  els.sanastoRow.innerHTML = '';

  setDeckGroupTitle(els.sanastoRow, 'Sanasto destesi');

  SANASTO_DECKS.forEach((deck) => {
    els.sanastoRow.appendChild(
      deckButton({
        id: deck.id,
        label: 'Sanasto',
        title: `${deck.title} · ${deck.tr} · ${deck.words.length} kart`,
      })
    );
  });
}

/* Tarayıcı geri tuşuyla önbellekten dönüldüğünde işaretleri tazele. */
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    renderKirjaDecks();
    renderKirja2Decks();
    renderKirja3Decks();
    renderKirja4Decks();
    renderKirja5Decks();
    renderItseDecks();
  renderFoneDecks();
  renderRuotsiDecks();
    renderTrukkiDecks();
  renderEnnakointiDecks();
  renderSanastoDecks();
  }
});

function renderMode() {
  document.querySelectorAll('.mode-btn').forEach((btn) => {
    const active = btn.dataset.mode === state.mode;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
}

function renderViewButtons() {
  document.querySelectorAll('.view-btn').forEach((btn) => {
    const active = btn.dataset.view === state.view;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
}

const REVIEW_HINT =
  'Klavye: <span class="kbd">Boşluk</span> çevir · <span class="kbd">1</span> tekrar · ' +
  '<span class="kbd">2</span> zor · <span class="kbd">3</span> iyi · <span class="kbd">4</span> kolay · ' +
  '<span class="kbd">S</span> dinle · cevaptan sonra <span class="kbd">Enter</span> ya da ' +
  '<span class="kbd">Boşluk</span> iyi';

const EXAM_HINT =
  'Klavye: <span class="kbd">1-4</span> seçenek · <span class="kbd">Enter</span> sonraki soru · ' +
  '<span class="kbd">S</span> dinle';

const PRACTICE_HINT =
  'Klavye: <span class="kbd">Enter</span> kontrol et / sonraki · <span class="kbd">S</span> dinle';

function setView(view, urlMode = 'push') {
  state.view = view;
  syncUrl(urlMode);
  els.reviewView.hidden = view !== 'review';
  els.examView.hidden = view !== 'exam';
  els.practiceView.hidden = view !== 'practice';
  els.shortcutHint.innerHTML =
    view === 'exam' ? EXAM_HINT : view === 'practice' ? PRACTICE_HINT : REVIEW_HINT;
  renderViewButtons();

  if (view === 'exam') {
    resetExamToStart();
    return;
  }
  if (view === 'practice') {
    resetPracticeToStart();
    return;
  }
  buildQueue();
  renderCard();
}

/* Fince kelime bilgi penceresi: yeni kart yüzü basıldığında kelimeleri yeniden işaretler. */
function refreshWordTips() {
  if (window.WordTip) window.WordTip.refresh();
}

/* ---------------- Arayüz: tekrar ---------------- */

function renderProgress() {
  if (!els.progressBar) return;   // kart paneli kaldırıldıysa (Studio'ya taşındı) çizim yok
  const total = state.sessionTotal;
  const done = state.sessionDone;
  const pct = total === 0 ? 0 : Math.min(100, (done / total) * 100);
  els.progressBar.style.width = `${pct}%`;
  els.progressCount.textContent = `${done} / ${total}`;
  els.progressLabel.textContent =
    state.current === null
      ? 'Oturum tamamlandı'
      : `${state.queue.length} kart kaldı · oturum ${total} kart`;
}

function showFront() {
  const card = state.current;
  if (!card || !els.prompt) return;

  const finnishFront = state.mode === 'fi-tr';
  els.promptLang.textContent = finnishFront ? 'Fince' : card.backLang || 'Türkçe';
  els.prompt.textContent = finnishFront ? card.fi : card.tr;
  els.prompt.dataset.long = String((finnishFront ? card.fi : card.tr).length > 24);
  els.answerLang.textContent = finnishFront ? card.backLang || 'Türkçe' : 'Fince';
  els.answerText.textContent = finnishFront ? card.tr : card.fi;

  /* Notlar Fince yazım/dilbilgisi ipucu olduğu için yalnızca Fince yüzünde gösterilir. */
  const showNote = Boolean(card.note) && finnishFront;
  els.note.hidden = !showNote;
  els.note.textContent = showNote ? card.note : '';

  els.cardBadge.textContent = card.type === 'kelime' ? 'Kelime' : 'Cümle';
  els.cardBadge.dataset.type = card.type;
  els.cardWeek.textContent = card.weekTitle;

  els.answer.hidden = true;
  els.grades.hidden = true;
  els.flipBtn.hidden = false;
  state.flipped = false;
  updateGradeLabels();
  refreshWordTips();
}

function updateGradeLabels() {
  const card = state.current;
  if (!card || !document.getElementById('grade-0-sub')) return;
  const s = cardState(card.id);
  const base = s.interval || 0;

  const hard = base ? Math.max(1, Math.round(base * 1.2)) : 1;
  const good = base ? Math.max(1, Math.round(base * s.ease)) : 1;
  const easy = base ? Math.max(2, Math.round(base * s.ease * 1.3)) : 3;

  document.getElementById('grade-0-sub').textContent = 'tekrar sorulur';
  document.getElementById('grade-1-sub').textContent = intervalLabel(hard);
  document.getElementById('grade-2-sub').textContent = intervalLabel(good);
  document.getElementById('grade-3-sub').textContent = intervalLabel(easy);
}

function renderCard() {
  /* Eski kart paneli index.html'den kaldırıldı; tekrar görünümü Studio'ya yönlendiriyor. */
  if (!els.card) { renderStats(); renderWeeks(); return; }

  const card = state.queue[0] || null;
  state.current = card;
  state.busy = false;

  if (!card) {
    els.card.hidden = true;
    els.grades.hidden = true;
    els.progressWrap.hidden = true;
    els.done.hidden = false;
    renderDoneMessage();
  } else {
    els.card.hidden = false;
    els.progressWrap.hidden = false;
    els.done.hidden = true;
    showFront();
  }

  renderProgress();
  renderStats();
  renderWeeks();
}

function renderDoneMessage() {
  const pool = scopeCards();
  const scopedDue = pool.filter((c) => isDue(c)).length;
  const scopedNew = pool.filter((c) => cardState(c.id).reps === 0).length;
  const scopedLearned = pool.filter((c) => cardState(c.id).reps > 0).length;

  els.doneContinue.hidden = scopedDue === 0;
  els.doneNextWeek.textContent = isDocDeck(state.week) ? 'Sonraki desteye geç' : 'Sonraki haftaya geç';

  if (scopedDue > 0) {
    els.doneTitle.textContent = 'Bugünkü oturum tamamlandı';
    els.doneText.textContent = `${scopedDue} kart daha tekrar sırasında bekliyor. Devam ederek yeni bir oturum başlatabilirsin.`;
  } else if (scopedNew === 0 && pool.length > 0) {
    els.doneTitle.textContent = 'Bu deste için tekrar kalmadı';
    els.doneText.textContent = `Bu destedeki ${pool.length} kartın tamamı planlandı (${scopedLearned} kart çalışıldı). Aralıklı tekrar, kartları tam hatırlama sınırında getirir — yarın tekrar bak.`;
  } else {
    els.doneTitle.textContent = 'Bu destede kart yok';
    els.doneText.textContent = 'Başka bir hafta seçerek devam edebilirsin.';
  }
}

/* Görünüm kısa adları: adres çubuğunda Türkçe okunur karşılıkları kullanılır. */
const VIEW_SLUGS = { review: 'tekrar', exam: 'sinav', practice: 'pratik' };
const SLUG_VIEWS = { tekrar: 'review', sinav: 'exam', pratik: 'practice' };

/* Adresteki görünüm: index.html?gorunum=sinav */
function viewFromUrl() {
  const slug = new URLSearchParams(window.location.search).get('gorunum');
  return (slug && SLUG_VIEWS[slug]) || null;
}

/* Seçili desteyi ve görünümü adres çubuğuna yazar: ?deste=p-k&gorunum=sinav paylaşılabilir kalır.
   'push' her değişimi gezinme geçmişine ekler (Geri/İleri desteler ve görünümler arasında dolaşır),
   'replace' mevcut kaydı günceller (sayfa açılışında normalize etmek için),
   'silent' hiçbir şey yazmaz (Geri/İleri gezinmesinin kendisi tekrar kayıt üretmesin). */
function syncUrl(mode = 'push') {
  if (mode === 'silent') return;
  try {
    const url = new URL(window.location.href);
    if (state.week === 'all') url.searchParams.delete('deste');
    else url.searchParams.set('deste', state.week);
    const viewSlug = VIEW_SLUGS[state.view];
    if (!viewSlug || viewSlug === VIEW_SLUGS.review) url.searchParams.delete('gorunum');
    else url.searchParams.set('gorunum', viewSlug);
    const next = `${url.pathname}${url.search}${url.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next === current) return;
    if (mode === 'replace') window.history.replaceState(null, '', next);
    else window.history.pushState(null, '', next);
  } catch {
    /* Adres çubuğu güncellenemezse (ör. file://) uygulama çalışmaya devam eder. */
  }
}

/* Rozetten sonra kart alanına yumuşak kaydırma ve kısa vurgu. */
let cardHighlightTimer = null;

function highlightCardArea() {
  const reduceMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cards = document.querySelectorAll('.card');
  let target = null;

  for (let i = 0; i < cards.length; i += 1) {
    const card = cards[i];
    if (card.hidden || card.closest('[hidden]')) continue;
    target = card;
    break;
  }
  if (!target) target = els.card;
  if (!target) return;

  target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });

  target.classList.remove('is-highlighted');
  void target.offsetWidth;
  target.classList.add('is-highlighted');

  window.clearTimeout(cardHighlightTimer);
  cardHighlightTimer = window.setTimeout(() => {
    target.classList.remove('is-highlighted');
  }, 900);
}

function scrollActiveWeekIntoView() {
  const active = els.weekRow && els.weekRow.querySelector('.week-btn.is-active');
  if (active) active.scrollIntoView({ block: 'nearest', inline: 'center' });
}

function selectWeek(week, urlMode = 'push') {
  state.week = String(week);
  syncUrl(urlMode);
  hideGradeNote();
  if (state.view === 'exam') {
    resetExamToStart();
    renderWeeks();
    return;
  }
  if (state.view === 'practice') {
    resetPracticeToStart();
    renderWeeks();
    return;
  }
  buildQueue();
  renderCard();
}

function flip() {
  if (!state.current || state.flipped) return;
  hideGradeNote();
  state.flipped = true;
  els.answer.hidden = false;
  els.note.hidden = !els.note.textContent;
  els.flipBtn.hidden = true;
  els.grades.hidden = false;
  updateGradeLabels();
}

function speak(card = state.current) {
  if (!card || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(card.fi);
  utter.lang = 'fi-FI';
  utter.rate = 0.9;
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith('fi'));
  if (voice) utter.voice = voice;
  window.speechSynthesis.speak(utter);
}

function grade(value) {
  const card = state.current;
  if (!card || !state.flipped || state.busy) return;
  state.busy = true;

  /* Geri al için notlandırma öncesi durum saklanır: kart planı, kuyruk ve
     bekleyen tekrar isteği aynen geri yüklenebilsin. */
  const before = {
    progress: JSON.parse(JSON.stringify(progress)),
    progressRaw: localStorage.getItem(STORAGE_KEY),
    pending: localStorage.getItem(TEKRAR_KEY),
    queue: state.queue.slice(),
    sessionDone: state.sessionDone,
    front: els.prompt.textContent,
  };

  const s = cardState(card.id);
  const now = Date.now();
  s.seen = (s.seen || 0) + 1;
  s.ease = s.ease || 2.5;

  if (value === 0) {
    s.reps = 0;
    s.lapses = (s.lapses || 0) + 1;
    s.ease = Math.max(MIN_EASE, s.ease - 0.2);
    s.interval = 0;
    s.due = now + 60 * 1000; /* bir dakika sonra: aynı oturumda tekrar sorulur */
  } else if (value === 1) {
    s.reps += 1;
    s.ease = Math.max(MIN_EASE, s.ease - 0.15);
    s.interval = s.interval ? Math.max(1, Math.round(s.interval * 1.2)) : 1;
    s.due = now + s.interval * DAY_MS;
  } else if (value === 2) {
    s.reps += 1;
    s.interval = s.interval ? Math.max(1, Math.round(s.interval * s.ease)) : 1;
    s.due = now + s.interval * DAY_MS;
  } else {
    s.reps += 1;
    s.ease = s.ease + 0.15;
    s.interval = s.interval ? Math.max(2, Math.round(s.interval * s.ease * 1.3)) : 3;
    s.due = now + s.interval * DAY_MS;
  }

  progress.cards[card.id] = s;
  resolvePendingReview(card.week, card.id);
  registerStudyDay();

  state.queue.shift();
  if (value === 0) state.queue.push(card); /* "Tekrar" kartı oturumun sonuna atar */
  state.sessionDone += 1;

  saveProgress();
  lastGrade = before;
  showGradeNote(value, before.front);
  renderCard();
}

/* Notlandırmadan sonra kısa onay: hangi not verildi ve tek tıkla geri alma.
   Geri alma, kart planını ve kuyruğu notlandırma öncesine döndürür. */
const GRADE_NOTES = ['tekrar', 'zor', 'iyi', 'kolay'];
let lastGrade = null;

function showGradeNote(value, front) {
  if (!els.gradeNote) return;
  els.gradeNote.textContent = '';
  const text = document.createElement('span');
  text.textContent = `“${front}” kartı ${GRADE_NOTES[value]} olarak notlandı · `;
  const undo = document.createElement('button');
  undo.type = 'button';
  undo.className = 'grade-undo';
  undo.textContent = 'Geri al';
  undo.addEventListener('click', undoGrade);
  els.gradeNote.appendChild(text);
  els.gradeNote.appendChild(undo);
  els.gradeNote.hidden = false;
}

function hideGradeNote() {
  lastGrade = null;
  if (!els.gradeNote) return;
  els.gradeNote.hidden = true;
  els.gradeNote.textContent = '';
}

function undoGrade() {
  const snapshot = lastGrade;
  if (!snapshot) return;

  progress = snapshot.progress;
  try {
    /* Depodaki ham değerler birebir geri yazılır: geri alma, notlandırma hiç
       olmamış gibi bırakır (boş depoya yeni anahtar eklemez). */
    if (snapshot.progressRaw === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, snapshot.progressRaw);
    if (snapshot.pending === null) localStorage.removeItem(TEKRAR_KEY);
    else localStorage.setItem(TEKRAR_KEY, snapshot.pending);
  } catch {
    /* Depolama engelliyse kart yine de geri alınır. */
  }

  state.queue = snapshot.queue;
  state.sessionDone = snapshot.sessionDone;
  state.busy = false;
  state.flipped = false;
  lastGrade = null;
  renderCard();
  hideGradeNote();
  if (els.flipBtn && !els.flipBtn.hidden) els.flipBtn.focus();
}

function registerStudyDay() {
  const today = todayKey();
  const stats = progress.stats;
  if (stats.day === today) {
    stats.dayCount = (stats.dayCount || 0) + 1;
  } else {
    const yesterday = todayKey(new Date(Date.now() - DAY_MS));
    stats.streak = stats.lastDay === yesterday ? (stats.streak || 0) + 1 : 1;
    stats.lastDay = today;
    stats.day = today;
    stats.dayCount = 1;
  }
}

function resetWeek() {
  const pool = poolFor(state.week);
  const label = state.week === 'all' ? 'Tüm kartların' : `${deckLabel(state.week)} destesinin`;
  if (!confirm(`${label} tekrar geçmişi silinsin mi?`)) return;
  pool.forEach((c) => delete progress.cards[c.id]);
  saveProgress();
  buildQueue();
  renderCard();
}

function resetAll() {
  if (!confirm('Tüm ilerleme, seri ve sınav istatistikleri silinsin mi? Bu işlem geri alınamaz.')) return;
  progress = emptyProgress();
  examine.stats = emptyExamStats();
  practice.stats = emptyPracticeStats();
  saveProgress();
  saveExamStats();
  savePracticeStats();
  renderExamStats();
  renderPracticeStats();
  buildQueue();
  renderCard();
}

/* ---------------- Sınav modu ---------------- */

function emptyExamStats() {
  return { last: null, totalAnswered: 0, totalCorrect: 0 };
}

function loadExamStats() {
  try {
    const raw = localStorage.getItem(EXAM_KEY);
    if (!raw) return emptyExamStats();
    const parsed = JSON.parse(raw);
    return {
      last: parsed.last && typeof parsed.last === 'object' ? parsed.last : null,
      totalAnswered: Number(parsed.totalAnswered) || 0,
      totalCorrect: Number(parsed.totalCorrect) || 0,
    };
  } catch {
    return emptyExamStats();
  }
}

function saveExamStats() {
  try {
    localStorage.setItem(EXAM_KEY, JSON.stringify(examine.stats));
  } catch {
    /* Depolama engelliyse oturum boyunca çalışmaya devam eder. */
  }
}

const examine = {
  questions: [],
  index: 0,
  correct: 0,
  wrong: [],
  answered: false,
  answeredCount: 0,
  stats: loadExamStats(),
};

function pickDistractors(card, lang, count) {
  const sameWeek = CARD_POOL.filter(
    (c) => c.week === card.week && c.id !== card.id && c[lang] && c[lang] !== card[lang]
  );
  const others = CARD_POOL.filter(
    (c) => c.week !== card.week && c.id !== card.id && c[lang] && c[lang] !== card[lang]
  );

  const pool = [...shuffle(sameWeek), ...shuffle(others)];
  const picked = [];
  for (const candidate of pool) {
    if (picked.length >= count) break;
    if (!picked.includes(candidate[lang])) picked.push(candidate[lang]);
  }
  return picked;
}

function buildExamQuestions(count) {
  const kind = els.examKinds.value;
  let pool = scopeCards();
  if (kind !== 'all') pool = pool.filter((c) => c.type === kind);
  if (pool.length < 2) return [];

  const sourceLang = state.mode === 'fi-tr' ? 'fi' : 'tr';
  const targetLang = sourceLang === 'fi' ? 'tr' : 'fi';

  return shuffle(pool)
    .slice(0, Math.min(count, pool.length))
    .map((card) => {
      const correct = card[targetLang];
      const options = shuffle([correct, ...pickDistractors(card, targetLang, 3)]);
      return { card, prompt: card[sourceLang], correct, options };
    });
}

function renderExamStats() {
  const stats = examine.stats;
  els.examLast.textContent = stats.last ? `${stats.last.correct}/${stats.last.total}` : '—';
  els.examAvg.textContent =
    stats.totalAnswered > 0 ? `${Math.round((stats.totalCorrect / stats.totalAnswered) * 100)}%` : '—';
  els.examTotal.textContent = String(stats.totalAnswered);
}

/* Seçili kapsam bir trukki bölümüyse sınav/pratik görünümünde o bölümün
   sayfasına dönüş bağlantısı gösterilir. */
function trukkiScopeDeck() {
  return isDocDeck(state.week)
    ? TRUKKI_DECKS.find((deck) => deck.id === state.week) || null
    : null;
}

function renderChapterBacks() {
  const deck = trukkiScopeDeck();
  [els.examChapterBack, els.practiceChapterBack].forEach((link) => {
    if (!link) return;
    link.hidden = !deck;
    if (!deck) {
      link.removeAttribute('href');
      link.textContent = '';
      link.removeAttribute('aria-label');
      return;
    }
    link.href = `trukki.html#${deck.id}`;
    link.textContent = `← Luku ${deck.n} · ${deck.tr}`;
    link.setAttribute('aria-label', `Trukki bölüm sayfasına dön: Luku ${deck.n} · ${deck.tr}`);
  });
}

function renderExamScopeHint() {
  els.examScopeHint.textContent = `Kapsam: ${deckLabel(state.week)} (${scopeCards().length} kart)`;
  renderChapterBacks();
}

function resetExamToStart() {
  examine.questions = [];
  examine.index = 0;
  examine.correct = 0;
  examine.wrong = [];
  examine.answered = false;
  examine.answeredCount = 0;

  els.examStart.hidden = false;
  els.examRun.hidden = true;
  els.examResult.hidden = true;
  renderExamStats();
  renderExamScopeHint();
  renderWeeks();
}

function startExam() {
  const count = Number(els.examCount.value) || 10;
  const questions = buildExamQuestions(count);
  if (questions.length === 0) {
    els.examScopeHint.textContent = `Bu kapsamda soru üretmek için yeterli kart yok — ${scopeTexts().pick}.`;
    return;
  }

  examine.questions = questions;
  examine.index = 0;
  examine.correct = 0;
  examine.wrong = [];
  examine.answered = false;
  examine.answeredCount = 0;

  els.examStart.hidden = true;
  els.examResult.hidden = true;
  els.examRun.hidden = false;
  renderQuestion();
}

function renderQuestion() {
  const question = examine.questions[examine.index];
  if (!question) return;
  const { card } = question;
  const finnishFirst = state.mode === 'fi-tr';

  els.examBadge.textContent = card.type === 'kelime' ? 'Kelime' : 'Cümle';
  els.examBadge.dataset.type = card.type;
  els.examWeek.textContent = card.weekTitle;
  els.examPromptLang.textContent = finnishFirst ? 'Fince' : 'Türkçe';
  els.examPrompt.textContent = question.prompt;
  els.examPrompt.dataset.long = String(question.prompt.length > 24);
  refreshWordTips();

  els.examCounter.textContent = `Soru ${examine.index + 1} / ${examine.questions.length}`;
  els.examScore.textContent = `${examine.correct} doğru`;
  els.examBar.style.width = `${(examine.answeredCount / examine.questions.length) * 100}%`;

  els.examOptions.innerHTML = '';
  question.options.forEach((option, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option';
    btn.dataset.option = option;

    const key = document.createElement('span');
    key.className = 'option-key';
    key.textContent = String(i + 1);

    const text = document.createElement('span');
    text.className = 'option-text';
    text.textContent = option;

    btn.append(key, text);
    btn.addEventListener('click', () => answerQuestion(option));
    els.examOptions.appendChild(btn);
  });

  els.examFeedback.hidden = true;
  els.examNote.hidden = true;
  els.examNext.hidden = true;
  els.examNext.innerHTML =
    examine.index === examine.questions.length - 1
      ? 'Sonuçları gör<span class="kbd">Enter</span>'
      : 'Sonraki soru<span class="kbd">Enter</span>';
  examine.answered = false;
}

function answerQuestion(choice) {
  if (examine.answered) return;
  const question = examine.questions[examine.index];
  if (!question) return;

  examine.answered = true;
  const isCorrect = choice === question.correct;
  if (isCorrect) examine.correct += 1;
  else examine.wrong.push(question.card);

  els.examOptions.querySelectorAll('.option').forEach((btn) => {
    const option = btn.dataset.option;
    btn.disabled = true;
    if (option === question.correct) btn.classList.add('is-correct');
    else if (option === choice) btn.classList.add('is-wrong');
    else btn.classList.add('is-dim');
  });

  els.examFeedback.hidden = false;
  els.examFeedbackText.textContent = isCorrect
    ? 'Doğru!'
    : `Yanlış — doğru cevap: ${question.correct}`;
  els.examNote.hidden = !question.card.note;
  els.examNote.textContent = question.card.note || '';
  els.examNext.hidden = false;

  els.examScore.textContent = `${examine.correct} doğru`;
  els.examBar.style.width = `${((examine.answeredCount + 1) / examine.questions.length) * 100}%`;
}

function nextQuestion() {
  if (!examine.answered) return;
  examine.answeredCount = Math.min(examine.questions.length, examine.answeredCount + 1);
  examine.index += 1;
  if (examine.index >= examine.questions.length) {
    finishExam();
    return;
  }
  renderQuestion();
}

function finishExam() {
  examine.answered = false; /* sonuç ekranında Enter tekrar sınav bitirmesin */
  const total = examine.questions.length;
  const correct = examine.correct;
  const pct = total === 0 ? 0 : Math.round((correct / total) * 100);
  if (window.premiumCelebrate) window.premiumCelebrate({ percent: pct, label: 'Sınav' });

  examine.stats.last = { total, correct, pct, date: todayKey() };
  examine.stats.totalAnswered += total;
  examine.stats.totalCorrect += correct;
  saveExamStats();
  registerStudyDay();
  saveProgress();

  els.examRun.hidden = true;
  els.examResult.hidden = false;

  els.scoreValue.textContent = `${pct}%`;
  els.scoreSub.textContent = `${correct} / ${total}`;
  els.scoreRing.classList.remove('is-mid', 'is-low');
  if (pct < 70) els.scoreRing.classList.add('is-low');
  else if (pct < 90) els.scoreRing.classList.add('is-mid');

  if (pct >= 90) {
    els.resultTitle.textContent = 'Harika!';
    els.resultText.textContent = `${total} sorudan ${correct} doğru. Bu deste artık sağlam — tekrar modunda aralıkları uzatmaya devam edebilirsin.`;
  } else if (pct >= 70) {
    els.resultTitle.textContent = 'İyi gidiyorsun';
    els.resultText.textContent = `${total} sorudan ${correct} doğru. Yanlışlarını tekrar kuyruğuna ekleyip birkaç gün içinde tekrar bak.`;
  } else {
    els.resultTitle.textContent = 'Tekrar gerekiyor';
    els.resultText.textContent = `${total} sorudan ${correct} doğru. ${scopeTexts().focus} tekrar modunda bir tur daha çalışmak iyi gelir.`;
  }

  els.wrongList.innerHTML = '';
  examine.wrong.forEach((card) => {
    const item = document.createElement('div');
    item.className = 'wrong-item';

    const fi = document.createElement('span');
    fi.className = 'wrong-fi';
    fi.textContent = card.fi;

    const tr = document.createElement('span');
    tr.className = 'wrong-tr';
    tr.textContent = card.tr;

    item.append(fi, tr);
    els.wrongList.appendChild(item);
  });
  els.wrongList.hidden = examine.wrong.length === 0;
  els.examReviewWrong.hidden = examine.wrong.length === 0;

  renderExamStats();
  renderStats();
}

function addWrongToReview() {
  if (examine.wrong.length === 0) return;
  const now = Date.now();
  examine.wrong.forEach((card) => {
    const s = cardState(card.id);
    s.due = now;
    s.interval = 0;
    s.ease = Math.max(MIN_EASE, (s.ease || 2.5) - 0.1);
    progress.cards[card.id] = s;
  });
  saveProgress();
  setView('review');
}

/* ---------------- Pratik modu (yazma + telaffuz) ---------------- */

function emptyPracticeStats() {
  return { last: null, totalAttempted: 0, totalCorrect: 0 };
}

function loadPracticeStats() {
  try {
    const raw = localStorage.getItem(PRACTICE_KEY);
    if (!raw) return emptyPracticeStats();
    const parsed = JSON.parse(raw);
    return {
      last: parsed.last && typeof parsed.last === 'object' ? parsed.last : null,
      totalAttempted: Number(parsed.totalAttempted) || 0,
      totalCorrect: Number(parsed.totalCorrect) || 0,
    };
  } catch {
    return emptyPracticeStats();
  }
}

function savePracticeStats() {
  try {
    localStorage.setItem(PRACTICE_KEY, JSON.stringify(practice.stats));
  } catch {
    /* Depolama engelliyse oturum boyunca çalışmaya devam eder. */
  }
}

const practice = {
  questions: [],
  index: 0,
  correct: 0,
  wrong: [],
  answered: false,
  hintUsed: false,
  stats: loadPracticeStats(),
};

function normalizeAnswer(text) {
  return text
    .toLowerCase()
    .replace(/[.,!?;:"“”'’()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripDiacritics(text) {
  return text.replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/å/g, 'a');
}

function similarity(a, b) {
  const aw = normalizeAnswer(a).split(' ').filter(Boolean);
  const bw = normalizeAnswer(b).split(' ').filter(Boolean);
  if (!aw.length || !bw.length) return 0;
  const common = aw.filter((word) => bw.includes(word)).length;
  return Math.round((common / Math.max(aw.length, bw.length)) * 100);
}

function buildPracticeQuestions(count) {
  const kind = els.practiceKinds.value;
  let pool = scopeCards();
  if (kind !== 'all') pool = pool.filter((c) => c.type === kind);
  return shuffle(pool)
    .slice(0, Math.min(count, pool.length))
    .map((card) => ({ card }));
}

function renderPracticeStats() {
  const stats = practice.stats;
  els.practiceLast.textContent = stats.last ? `${stats.last.correct}/${stats.last.total}` : '—';
  els.practiceAvg.textContent =
    stats.totalAttempted > 0 ? `${Math.round((stats.totalCorrect / stats.totalAttempted) * 100)}%` : '—';
  els.practiceTotal.textContent = String(stats.totalAttempted);
}

function renderPracticeScopeHint() {
  els.practiceScopeHint.textContent = `Kapsam: ${deckLabel(state.week)} (${scopeCards().length} kart)`;
  renderChapterBacks();
}

function resetPracticeToStart() {
  practice.questions = [];
  practice.index = 0;
  practice.correct = 0;
  practice.wrong = [];
  practice.answered = false;

  els.practiceStart.hidden = false;
  els.practiceRun.hidden = true;
  els.practiceResult.hidden = true;
  renderPracticeStats();
  renderPracticeScopeHint();
  renderWeeks();
}

function startPractice() {
  const count = Number(els.practiceCount.value) || 10;
  const questions = buildPracticeQuestions(count);
  if (questions.length === 0) {
    els.practiceScopeHint.textContent = `Bu kapsamda kart yok — ${scopeTexts().pick}.`;
    return;
  }

  practice.questions = questions;
  practice.index = 0;
  practice.correct = 0;
  practice.wrong = [];
  practice.answered = false;

  els.practiceStart.hidden = true;
  els.practiceResult.hidden = true;
  els.practiceRun.hidden = false;
  renderPracticeQuestion();
}

function renderPracticeQuestion() {
  const question = practice.questions[practice.index];
  if (!question) return;
  const { card } = question;

  els.practiceBadge.textContent = card.type === 'kelime' ? 'Kelime' : 'Cümle';
  els.practiceBadge.dataset.type = card.type;
  els.practiceWeek.textContent = card.weekTitle;
  els.practicePrompt.textContent = card.tr;
  els.practicePrompt.dataset.long = String(card.tr.length > 24);

  els.practiceCounter.textContent = `Soru ${practice.index + 1} / ${practice.questions.length}`;
  els.practiceScore.textContent = `${practice.correct} doğru`;
  els.practiceBar.style.width = `${(practice.index / practice.questions.length) * 100}%`;

  els.practiceInput.value = '';
  els.practiceInput.disabled = false;
  els.practiceCheck.disabled = false;
  els.practiceForm.hidden = false;
  els.practiceHint.hidden = true;
  els.practiceHint.textContent = '';

  els.practiceFeedback.hidden = true;
  els.practiceFeedback.classList.remove('is-ok', 'is-bad');
  els.practiceAnswer.textContent = '';
  els.practiceNote.hidden = true;
  els.practiceNote.textContent = '';
  els.practiceMicStatus.hidden = true;
  els.practiceMicStatus.textContent = '';
  els.practiceMic.hidden = !micSupported();
  els.practiceMic.classList.remove('is-recording');
  els.practiceNext.hidden = true;
  els.practiceNext.innerHTML =
    practice.index === practice.questions.length - 1
      ? 'Sonuçları gör<span class="kbd">Enter</span>'
      : 'Sonraki soru<span class="kbd">Enter</span>';

  practice.answered = false;
  practice.hintUsed = false;

  window.setTimeout(() => els.practiceInput.focus(), 40);
}

function checkPracticeAnswer() {
  if (practice.answered) return;
  const question = practice.questions[practice.index];
  if (!question) return;

  const given = els.practiceInput.value;
  const expected = question.card.fi;
  const normalizedGiven = normalizeAnswer(given);
  if (!normalizedGiven) {
    els.practiceInput.focus();
    return;
  }

  const exact = normalizedGiven === normalizeAnswer(expected);
  const withoutAccents = stripDiacritics(normalizedGiven) === stripDiacritics(normalizeAnswer(expected));
  const isCorrect = exact || withoutAccents;

  practice.answered = true;
  practice.stats.totalAttempted += 1;
  if (isCorrect) {
    practice.correct += 1;
    practice.stats.totalCorrect += 1;
  } else {
    practice.wrong.push(question.card);
  }
  savePracticeStats();
  registerStudyDay();
  saveProgress();

  els.practiceInput.disabled = true;
  els.practiceCheck.disabled = true;
  els.practiceForm.hidden = false;
  els.practiceFeedback.hidden = false;
  els.practiceFeedback.classList.toggle('is-ok', isCorrect);
  els.practiceFeedback.classList.toggle('is-bad', !isCorrect);

  if (exact) {
    els.practiceFeedbackText.textContent = 'Doğru!';
  } else if (isCorrect) {
    els.practiceFeedbackText.textContent = 'Doğru — ama aksanlara dikkat (ä, ö, y).';
  } else {
    els.practiceFeedbackText.textContent = 'Yanlış — doğrusu:';
  }

  els.practiceAnswer.textContent = expected;
  els.practiceNote.hidden = !question.card.note;
  els.practiceNote.textContent = question.card.note || '';

  els.practiceScore.textContent = `${practice.correct} doğru`;
  els.practiceBar.style.width = `${((practice.index + 1) / practice.questions.length) * 100}%`;
  els.practiceNext.hidden = false;

  speak(question.card);
}

function nextPracticeQuestion() {
  if (!practice.answered) return;
  practice.index += 1;
  if (practice.index >= practice.questions.length) {
    finishPractice();
    return;
  }
  renderPracticeQuestion();
}

function finishPractice() {
  practice.answered = false;
  const total = practice.questions.length;
  const correct = practice.correct;
  const pct = total === 0 ? 0 : Math.round((correct / total) * 100);
  if (window.premiumCelebrate) window.premiumCelebrate({ percent: pct, label: 'Pratik' });

  practice.stats.last = { total, correct, pct, date: todayKey() };
  savePracticeStats();

  els.practiceRun.hidden = true;
  els.practiceResult.hidden = false;

  els.practicePct.textContent = `${pct}%`;
  els.practiceSub.textContent = `${correct} / ${total}`;
  els.practiceRing.classList.remove('is-mid', 'is-low');
  if (pct < 70) els.practiceRing.classList.add('is-low');
  else if (pct < 90) els.practiceRing.classList.add('is-mid');

  if (pct >= 90) {
    els.practiceResultTitle.textContent = 'Harika!';
    els.practiceResultText.textContent = `${total} sorudan ${correct} doğru. Üretim tarafı da oturdu — artık bu kalıpları gerçek konuşmalarda kullanma zamanı.`;
  } else if (pct >= 70) {
    els.practiceResultTitle.textContent = 'İyi gidiyorsun';
    els.practiceResultText.textContent = `${total} sorudan ${correct} doğru. Yanlışlarını tekrar kuyruğuna ekleyip birkaç gün içinde tekrar bak.`;
  } else {
    els.practiceResultTitle.textContent = 'Henüz değil';
    els.practiceResultText.textContent = `${total} sorudan ${correct} doğru. Önce tekrar modunda ${scopeTexts().focus} bir tur çalış, sonra pratiğe dön.`;
  }

  els.practiceWrong.innerHTML = '';
  practice.wrong.forEach((card) => {
    const item = document.createElement('div');
    item.className = 'wrong-item';

    const fi = document.createElement('span');
    fi.className = 'wrong-fi';
    fi.textContent = card.fi;

    const tr = document.createElement('span');
    tr.className = 'wrong-tr';
    tr.textContent = card.tr;

    item.append(fi, tr);
    els.practiceWrong.appendChild(item);
  });
  els.practiceWrong.hidden = practice.wrong.length === 0;
  els.practiceReviewWrong.hidden = practice.wrong.length === 0;

  renderPracticeStats();
  renderStats();
}

function addPracticeWrongToReview() {
  if (practice.wrong.length === 0) return;
  const now = Date.now();
  practice.wrong.forEach((card) => {
    const s = cardState(card.id);
    s.due = now;
    s.interval = 0;
    s.ease = Math.max(MIN_EASE, (s.ease || 2.5) - 0.1);
    progress.cards[card.id] = s;
  });
  saveProgress();
  setView('review');
}

function showPracticeHint() {
  const question = practice.questions[practice.index];
  if (!question) return;
  const answer = question.card.fi;
  const wordCount = answer.split(/\s+/).length;
  els.practiceHint.hidden = false;
  els.practiceHint.textContent = `İpucu: ${wordCount} kelime · ilk harf "${answer.charAt(0)}" · ${answer.length} karakter`;
  practice.hintUsed = true;
}

function micSupported() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function startMic() {
  const question = practice.questions[practice.index];
  if (!question) return;
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) {
    els.practiceMicStatus.hidden = false;
    els.practiceMicStatus.textContent =
      'Bu tarayıcı konuşma tanımayı desteklemiyor. Cümleyi dinle ve yüksek sesle tekrar et.';
    return;
  }

  let recognition;
  try {
    recognition = new Ctor();
  } catch {
    els.practiceMicStatus.hidden = false;
    els.practiceMicStatus.textContent = 'Mikrofon başlatılamadı — tarayıcı izinlerini kontrol et.';
    return;
  }

  recognition.lang = 'fi-FI';
  recognition.interimResults = false;
  recognition.maxAlternatives = 3;

  els.practiceMicStatus.hidden = false;
  els.practiceMicStatus.textContent = 'Dinliyorum… Fince cümleyi söyle.';
  els.practiceMic.classList.add('is-recording');

  recognition.onresult = (event) => {
    const results = event.results[0];
    let best = { text: '', score: 0 };
    for (let i = 0; i < results.length; i += 1) {
      const text = results[i].transcript;
      const score = similarity(text, question.card.fi);
      if (score > best.score) best = { text, score };
    }
    els.practiceMicStatus.textContent =
      (best.score >= 80 ? 'Telaffuz iyi! ' : 'Tekrar dene. ') +
      `Benzerlik %${best.score} — duyduğum: "${best.text}"`;
  };

  recognition.onerror = (event) => {
    els.practiceMicStatus.textContent = `Mikrofon hatası (${event.error}). Tarayıcı izinlerini kontrol et.`;
    els.practiceMic.classList.remove('is-recording');
  };

  recognition.onend = () => {
    els.practiceMic.classList.remove('is-recording');
  };

  recognition.start();
}

/* ---------------- Olay bağlama ---------------- */

function bindEvents() {
  /* Kart paneli yoksa tekrar görünümü olayları bağlanmaz. */
  if (els.card) {
    els.card.addEventListener('click', flip);
    els.flipBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      flip();
    });
    els.speakBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      speak();
    });
    els.grades.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-grade]');
      if (!btn) return;
      e.stopPropagation();
      grade(Number(btn.dataset.grade));
    });
  }
  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.mode = btn.dataset.mode;
      renderMode();
      if (state.view === 'review' && state.current) showFront();
    });
  });
  document.querySelectorAll('.view-btn').forEach((btn) => {
    btn.addEventListener('click', () => setView(btn.dataset.view));
  });

  if (els.doneContinue) els.doneContinue.addEventListener('click', () => {
    buildQueue();
    renderCard();
  });

  if (els.doneNextWeek) els.doneNextWeek.addEventListener('click', () => {
    const order = WEEKS.map((w) => String(w.id)).concat(
      PLAN_WEEKS.map((w) => w.id),
      DOC_DECKS.map((d) => d.id)
    );
    const index = order.indexOf(state.week);
    selectWeek(order[(index + 1) % order.length]);
  });

  if (els.planProgressTrack) els.planProgressTrack.addEventListener('click', jumpToNextPlanWeek);
  if (els.planProgressJump) els.planProgressJump.addEventListener('click', jumpToNextPlanWeek);

  if (els.doneResetWeek) els.doneResetWeek.addEventListener('click', resetWeek);
  els.resetAll.addEventListener('click', resetAll);

  /* sınav olayları */
  els.examStartBtn.addEventListener('click', startExam);
  els.examRestart.addEventListener('click', () => {
    els.examResult.hidden = true;
    els.examStart.hidden = false;
    renderExamStats();
    renderExamScopeHint();
  });
  els.examToReview.addEventListener('click', () => setView('review'));
  els.examReviewWrong.addEventListener('click', addWrongToReview);
  els.examNext.addEventListener('click', nextQuestion);
  els.examSpeak.addEventListener('click', () => {
    const question = examine.questions[examine.index];
    if (question) speak(question.card);
  });

  /* pratik olayları */
  els.practiceStartBtn.addEventListener('click', startPractice);
  els.practiceForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (practice.answered) nextPracticeQuestion();
    else checkPracticeAnswer();
  });
  els.practiceNext.addEventListener('click', nextPracticeQuestion);
  els.practiceHintBtn.addEventListener('click', showPracticeHint);
  els.practiceSpeak.addEventListener('click', () => {
    const question = practice.questions[practice.index];
    if (question) speak(question.card);
  });
  els.practiceMic.addEventListener('click', startMic);
  els.practiceRestart.addEventListener('click', () => {
    els.practiceResult.hidden = true;
    els.practiceStart.hidden = false;
    renderPracticeStats();
    renderPracticeScopeHint();
  });
  els.practiceToReview.addEventListener('click', () => setView('review'));
  els.practiceReviewWrong.addEventListener('click', addPracticeWrongToReview);

  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    if (state.view === 'practice') {
      if (e.key === 'Enter' && practice.answered) {
        e.preventDefault();
        nextPracticeQuestion();
        return;
      }
      if (e.key === 's' || e.key === 'S') {
        const question = practice.questions[practice.index];
        if (question) speak(question.card);
      }
      return;
    }

    if (state.view === 'exam') {
      if (e.key === 'Enter') {
        if (!els.examStart.hidden) {
          e.preventDefault();
          startExam();
          return;
        }
        if (examine.answered) {
          e.preventDefault();
          nextQuestion();
        }
        return;
      }
      if (['1', '2', '3', '4'].includes(e.key) && els.examRun.hidden === false) {
        const option = els.examOptions.querySelectorAll('.option')[Number(e.key) - 1];
        if (option && !option.disabled) option.click();
        return;
      }
      if (e.key === 's' || e.key === 'S') {
        const question = examine.questions[examine.index];
        if (question) speak(question.card);
      }
      return;
    }

    if (e.code === 'Space' || e.key === 'Enter') {
      if (state.current && !state.flipped) {
        e.preventDefault();
        flip();
      } else if (state.current && state.flipped) {
        e.preventDefault();
        grade(2);
      }
      return;
    }
    if (e.key === 's' || e.key === 'S') {
      speak();
      return;
    }
    if (state.flipped && ['1', '2', '3', '4'].includes(e.key)) {
      grade(Number(e.key) - 1);
    }
  });

  /* Tarayıcı Geri/İleri: adresteki görünümü ve desteyi uygula, yeni geçmiş kaydı yazma. */
  window.addEventListener('popstate', () => {
    const view = viewFromUrl() || 'review';
    const id = deckFromUrl() || 'all';
    if (view === state.view && id === state.week) return;
    if (view !== state.view) setView(view, 'silent');
    if (id !== state.week) {
      selectWeek(id, 'silent');
      scrollActiveWeekIntoView();
    }
  });
}

/* ---------------- Başlangıç ---------------- */

/* Sözlük sayfasından gelen bağlantı: index.html?deste=p-k (görünüm için ?gorunum=sinav) */
function deckFromUrl() {
  const id = new URLSearchParams(window.location.search).get('deste');
  if (!id) return null;
  if (id === 'all') return id;
  if (DOC_DECKS.some((d) => d.id === id)) return id;
  if (WEEKS.some((w) => String(w.id) === id)) return id;
  if (PLAN_DECK_BY_WEEK.has(id)) return id;
  return null;
}

/* Sözlük sayfasından gelen kelime bağlantısı: index.html?kelime=kahvi
   Kartı bütün destelerde arar, destesini açar ve kartı sıranın başına alır. */
function focusWordFromUrl() {
  const raw = new URLSearchParams(window.location.search).get('kelime');
  if (!raw) return;
  const key = raw.trim().toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ');
  if (!key) return;
  const card = CARD_POOL.find((c) => c.fi.toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ') === key);
  if (!card) return;

  if (state.view !== 'review') setView('review', 'silent');
  selectWeek(String(card.week), 'silent');
  const index = state.queue.findIndex((c) => c.id === card.id);
  if (index > 0) state.queue.unshift(state.queue.splice(index, 1)[0]);
  else if (index === -1) state.queue.unshift(card);
  renderCard();
  if (els.card && typeof els.card.scrollIntoView === 'function') {
    els.card.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

function init() {
  renderControlGroups();
  renderSanastoDecks();
  bindEvents();
  renderMode();
  renderViewButtons();
  buildQueue();
  renderCard();
  renderExamStats();
  renderExamScopeHint();
  renderPracticeStats();
  renderPracticeScopeHint();

  const requestedDeck = deckFromUrl();
  const requestedView = viewFromUrl();

  if (requestedView && requestedView !== state.view) setView(requestedView, 'silent');
  if (requestedDeck) {
    selectWeek(requestedDeck, 'silent');
    scrollActiveWeekIntoView();
  }

  /* Sözlükten gelen tek kelime bağlantısı desteyi ve kartı kendisi seçer. */
  focusWordFromUrl();

  /* Adresteki varsayılanları (deste=all, gorunum=tekrar) ve geçersiz değerleri temizle. */
  syncUrl('replace');
}

init();
