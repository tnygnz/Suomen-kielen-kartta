/* Beş katman & tek durum paketi — `suomi-kartat-v2`.

   Denetlenenler:
     - bütün katmanlar tek localStorage kaydında senkron: SM-2 kartları,
       seri, favoriler ve kişisel kartlar aynı `progress` nesnesinde,
     - eski `suomi-kartat-v1` kaydı bir kez v2'ye taşınır, uygulama v1'e yazmaz,
     - Yolculuk / Oturum / Sözlük / AI Koç / Dalma katmanları çizilir,
     - dört oturum modunun kuyrukları (SM-2, hızlı, zor) doğru kurulur,
     - SM-2 matematiği değişmemiştir.

   Bağımlılıksız:  cd sanat && node tests/layers.test.js
   Hepsi birlikte: node tests/run.js */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "data.js"), "utf8") + "\n" +
                  fs.readFileSync(path.join(root, "app.js"), "utf8");

let pass = 0, fail = 0;
function t(label, cond, extra) {
  if (cond) { pass++; console.log("  [OK]  " + label + (extra ? " -> " + extra : "")); }
  else { fail++; console.log("  [FAIL] " + label + (extra ? " -> " + extra : "")); }
}

function boot(seed) {
  const store = {};
  if (seed) {
    Object.keys(seed).forEach(function (key) { store[key] = seed[key]; });
  }
  global.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
  };
  const nodes = {};
  const el = (id) => ({
    id, innerHTML: "", textContent: "", value: "", hidden: false, style: {}, dataset: {},
    files: [], tagName: "DIV",
    addEventListener() {}, setAttribute() {}, removeAttribute() {}, appendChild() {},
    remove() {}, click() {}, closest() { return null; },
    classList: { add() {}, remove() {}, toggle() {} },
    querySelectorAll() { return []; },
  });
  global.document = {
    getElementById(id) { if (!nodes[id]) nodes[id] = el(id); return nodes[id]; },
    querySelectorAll() { return []; },
    addEventListener() {},
    createElement() { return el("tmp"); },
    body: el("body"),
  };
  global.window = { speechSynthesis: { cancel() {}, speak() {} } };
  global.SpeechSynthesisUtterance = function (text) { this.text = text; };

  const api = new Function(appSource + "\nreturn globalThis.SuomiKartat;")();
  return { api, nodes, store };
}

console.log("1) tek durum · v2");
const legacyRecord = JSON.stringify({
  cards: { "w1-k-1": { reps: 2, interval: 3, ease: 2.4, due: 0, lapses: 1, seen: 2 } },
  favorites: { "w1-k-2": true },
  custom: [{ id: "c-eski", fi: "kiitos", tr: "teşekkürler", week: 0, type: "kelime" }],
  stats: { answers: 7, correct: 6, streak: { last: null, days: 4 } },
});
let env = boot({ "suomi-kartat-v1": legacyRecord });
let saved = JSON.parse(env.store["suomi-kartat-v2"] || "{}");
t("v1 kaydı v2'ye taşındı", Boolean(env.store["suomi-kartat-v2"]));
t("SM-2 aralığı taşındı", saved.cards && saved.cards["w1-k-1"] && saved.cards["w1-k-1"].interval === 3);
t("favoriler taşındı", saved.favorites && saved.favorites["w1-k-2"] === true);
t("özel kartlar taşındı", Array.isArray(saved.custom) && saved.custom.length === 1);
t("seri taşındı", saved.stats && saved.stats.streak && saved.stats.streak.days === 4);

env = boot();
let api = env.api;
const card = api.poolFor("1")[0];
api.gradeCard(card, 2, 1000);
api.toggleFavorite(card.id);
api.addCustomCard("kiitos", "teşekkürler");
const keys = Object.keys(env.store);
t("tek anahtar: suomi-kartat-v2", keys.length === 1 && keys[0] === "suomi-kartat-v2", keys.join(", "));
saved = JSON.parse(env.store["suomi-kartat-v2"]);
t("SM-2 aynı kayıtta", Boolean(saved.cards[card.id]) && saved.cards[card.id].reps === 1);
t("favori aynı kayıtta", saved.favorites[card.id] === true);
t("kişisel kart aynı kayıtta", saved.custom.length === 1 && saved.custom[0].fi === "kiitos");
t("seri & günlük sayaç aynı kayıtta", saved.stats.streak.days === 1 && saved.stats.dayCount === 1);
t("son oturum alanı hazır", saved.stats.lastSession === null);
t("uygulama v1 anahtarı yazmıyor", keys.indexOf("suomi-kartat-v1") === -1);

console.log("2) beş katman");
api.setView("path", { silent: true });
let html = env.nodes["view-path"].innerHTML;
t("Yolculuk: seri halkası + haftalık çizgi", /class="streak-ring"/.test(html) && /class="week-line"/.test(html));
t("Yolculuk: 16 modül, 68 kademe",
  (html.match(/class="module"/g) || []).length === 16 &&
  (html.match(/data-act="level"/g) || []).length === 68);
t("Yolculuk: Busuu ünite kapağı ve yüzde barı",
  (html.match(/class="unit-cover unit-cover--/g) || []).length === 16 &&
  (html.match(/class="unit-bar"/g) || []).length === 16 &&
  /Çevrimdışı İndir/.test(html));
t("Yolculuk: ünite başına dört ders adımı",
  (html.match(/data-act="unit-step"/g) || []).length === 64 &&
  /Dilbilgisi Röntgeni/.test(html) && /Ünite Sınavı/.test(html));

api.state.hub = true;
api.setView("study", { silent: true });
html = env.nodes["view-study"].innerHTML;
t("Oturum: dört mod kartı", (html.match(/class="mode-card"/g) || []).length === 4);
api.state.hub = false;
api.setView("study", { silent: true });
html = env.nodes["view-study"].innerHTML;
t("Oturum: Busuu ders kartı ve hap sekmeler",
  /class="lesson-card"/.test(html) && /class="card-tabs"/.test(html) &&
  /data-act="xray-card"/.test(html) && /Morfoloji Röntgeni/.test(html));
t("Oturum: kart üzerinde iki kayıt ve iki dinleme hapı",
  (html.match(/data-register=/g) || []).length === 2 &&
  (html.match(/data-speak=/g) || []).length === 2);

t("Oturum: hızlı kuyruk 10 kart", api.buildSpeedQueue("1").length === 10, String(api.buildSpeedQueue("1").length));
api.gradeCard(api.poolFor("1")[1], 0, 1000);
t("Oturum: zor havuz tekrara düşeni alır", api.hardPool("1").length === 1, String(api.hardPool("1").length));

api.state.filter = "all";
api.setView("index", { silent: true });
t("Sözlük: 328 + 1 kişisel kart", (env.nodes["indexBody"].innerHTML.match(/class="dict-row"/g) || []).length === 329,
  String((env.nodes["indexBody"].innerHTML.match(/class="dict-row"/g) || []).length));
api.state.filter = "fav";
api.setView("index", { silent: true });
t("Sözlük: Kelimelerim süzgeci", (env.nodes["indexBody"].innerHTML.match(/class="dict-row"/g) || []).length === 1);
api.state.filter = "all";

api.state.week = "1";
api.state.coach.tab = "dialog";
api.setView("lab", { silent: true });
html = env.nodes["dialogBody"].innerHTML;
t("AI Koç: üç senaryo", (html.match(/data-act="scenario"/g) || []).length === 3);
t("AI Koç: üç çeviri seçeneği", (html.match(/data-act="reply"/g) || []).length === 3);
api.state.coach.tab = "pron";
api.setView("lab", { silent: true });
t("AI Koç: iki dinleme hızı", (env.nodes["pronBody"].innerHTML.match(/data-act="pron-speak"/g) || []).length === 2);

api.setView("immerse", { silent: true });
html = env.nodes["view-immerse"].innerHTML;
t("Dalma: 01 / 08 sayacı", /class="reading-count">01 \/ 08/.test(html));
t("Dalma: sekiz cümle noktası", (html.match(/class="reading-dot[ "]/g) || []).length === 8);

const shell = fs.readFileSync(path.join(root, "index.html"), "utf8");
t("Kabuk: beş sekme", (shell.match(/data-tab=/g) || []).length === 5);
t("Kabuk: Busuu üst barı (seviye, seri, çevrimdışı, hedef)",
  /Suomi A1–A2/.test(shell) && /id="mastStreak"/.test(shell) &&
  /id="offlineState"/.test(shell) && /id="goalRing"/.test(shell));
t("Kabuk: Dalma paneli var", /id="view-immerse"/.test(shell) && !/view-ledger/.test(shell));
t("VIEW_LIST beş katman", JSON.stringify(api.VIEW_LIST) === JSON.stringify(["path", "study", "index", "lab", "immerse"]));

console.log("3) SM-2 dokunulmadı");
const fresh = api.cardState("__yok__");
t("kolay: 3 gün", api.nextState(fresh, 3, 1000).interval === 3);
t("zor: ease 2.35", Math.abs(api.nextState(fresh, 1, 1000).ease - 2.35) < 1e-9);
t("tekrar: 1 dk, kutu sıfır", api.nextState({ reps: 4, interval: 16, ease: 2.5, due: 0, lapses: 0, seen: 9 }, 0, 1000).due === 61000);

console.log("\nSONUC: " + pass + " gecti, " + fail + " basarisiz");
process.exit(fail ? 1 : 0);
