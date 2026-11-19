/* Genel davranış paketi — "Morfoloji & Dil Stüdyosu" mimarisi.

   Kapsam: SM-2 matematiği, kök/ek çözümlemesi, kirjakieli↔puhekieli,
   çift ses ritmi, Web Speech çağrıları, beş katmanın çizimi ve
   tek durum deposu (suomi-kartat-v2).

   Bağımlılıksız:  cd sanat && node tests/smoke.test.js
   Hepsi birlikte: node tests/run.js

   Tarayıcı yok: data.js + app.js küçük bir DOM taklidiyle yüklenir. */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(root, "data.js"), "utf8") + "\n" +
            fs.readFileSync(path.join(root, "app.js"), "utf8");

let store = {};
let keydown = null;
let spoken = [];

function resetEnv() {
  store = {};
  keydown = null;
  spoken = [];
  global.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
  };
}

function boot(options) {
  const opts = options || {};
  resetEnv();
  const nodes = {};
  const handlers = {};
  const el = (id) => ({
    id, innerHTML: "", textContent: "", value: "", hidden: false, style: {}, dataset: {}, files: [],
    tagName: "DIV",
    addEventListener(type, fn) { handlers[id + ":" + type] = fn; },
    setAttribute() {}, removeAttribute() {}, appendChild() {}, remove() {}, click() {},
    closest() { return null; },
    classList: { add() {}, remove() {}, toggle() {} },
  });

  global.document = {
    getElementById(id) { if (!nodes[id]) nodes[id] = el(id); return nodes[id]; },
    querySelectorAll() { return []; },
    addEventListener(type, fn) { if (type === "keydown") keydown = fn; },
    createElement() { return el("tmp"); },
    body: el("body"),
  };
  global.window = opts.speech
    ? { speechSynthesis: { cancel() {}, speak(u) { spoken.push(u); } } }
    : {};
  global.SpeechSynthesisUtterance = function (text) { this.text = text; };

  const api = new Function(src + "\nreturn globalThis.SuomiKartat;")();
  return { api, nodes, handlers };
}

const press = (key, target) => keydown({
  key,
  target: target || { tagName: "BODY", closest() { return null; } },
  preventDefault() {},
});

let pass = 0, fail = 0;
function t(label, cond, extra) {
  if (cond) { pass++; console.log("  [OK]  " + label + (extra ? " -> " + extra : "")); }
  else { fail++; console.log("  [FAIL] " + label + (extra ? " -> " + extra : "")); }
}

console.log("1) kirjakieli ↔ puhekieli");
let env = boot({ speech: true });
let api = env.api;
t("minä → mä", api.toPuhekieli("minä") === "mä");
t("sinä → sä", api.toPuhekieli("sinä") === "sä");
t("olen → oon", api.toPuhekieli("olen") === "oon");
t("he ovat → ne on (kalıp)", api.toPuhekieli("he ovat") === "ne on");
t("cümlede kalıp", api.toPuhekieli("He ovat kotona.") === "Ne on kotona.", api.toPuhekieli("He ovat kotona."));
t("büyük harf ve noktalama korunur", api.toPuhekieli("Minä, sinä ja hän.") === "Mä, sä ja se.", api.toPuhekieli("Minä, sinä ja hän."));
t("tämä → tää, tuo → toi", api.toPuhekieli("tämä tuo") === "tää toi");
t("kayıt varsayılanı kirjakieli", api.progress.settings.register === "kirja");

console.log("2) çift ses ritmi");
const kukka = api.geminateBeats("kukka");
t("kukka: tek çift ünsüz", kukka.filter((b) => b.geminate).length === 1 && kukka.find((b) => b.geminate).char === "kk");
t("pää: çift ünlü ää", api.geminateBeats("pää").some((b) => b.geminate && b.char === "ää"));
t("kaupunki: çift ses yok", api.geminateBeats("kaupunki").every((b) => !b.geminate));
const rhythm = api.rhythmHtml("kukka ja pää");
t("ritim barı uzun vuruşla çizilir", /bar--long/.test(rhythm) && /Ritim · çift ses/.test(rhythm));
t("çift sesler etiketlenir", /kk/.test(rhythm) && /ää/.test(rhythm));

console.log("3) kök & ek röntgeni");
const a = api.analyze("kaupungissani");
t("üç parça", a.segments.map((s) => s.text).join("|") === "kaupungi|ssa|ni", a.segments.map((s) => s.text).join("|"));
t("yumuşama ng → nk", a.lemma === "kaupunki" && a.gradation.from === "ng");
t("ek türleri", a.segments.map((s) => s.kind).join(",") === "kok,hal,iyelik");
t("sözlük doğrulaması", api.analyze("kahvista").lemma === "kahvi");
t("çözülemeyen biçim", api.analyze("xyzzyq").verified === false);

console.log("3b) puhekieli biçimleri röntgende");
const oon = api.analyze("oon");
t("oon doğrulandı", oon.verified === true && oon.colloquial === true);
t("oon kök + kişi eki", oon.segments.map((s) => s.text).join("|") === "oo|n" && oon.segments[1].kind === "fiil", oon.segments.map((s) => s.text).join("|"));
t("oon yazı dili olla", oon.lemma === "olla" && oon.segments[1].label === "1. tekil kişi");
t("mä tek kök, minä", api.analyze("mä").lemma === "minä" && api.analyze("mä").segments.length === 1);
t("tää → tämä", api.analyze("tää").lemma === "tämä" && api.analyze("tää").verified === true);
t("toi → tuo", api.analyze("toi").lemma === "tuo");
t("ne → he", api.analyze("ne").lemma === "he" && api.analyze("ne").colloquial === true);
t("sä → sinä", api.analyze("sä").lemma === "sinä");
t("ollaan kök + an", api.analyze("ollaan").segments.map((s) => s.text).join("|") === "olla|an");
t("sulla kök + la (adessiivi)", api.analyze("sulla").segments[1].kind === "hal" && api.analyze("sulla").lemma === "sinulla");
t("oon notunda tahmin yok", !/tahmin/i.test(oon.segments.map((s) => s.note).join(" ")) && oon.segments.every((s) => s.sure));

console.log("4) SM-2");
const fresh = api.cardState("__yok__");
t("iyi: ilk aralık 1 gün", api.nextState(fresh, 2, 1000).interval === 1);
t("zor: ease 2.35", Math.abs(api.nextState(fresh, 1, 1000).ease - 2.35) < 1e-9);
t("kolay: 3 gün", api.nextState(fresh, 3, 1000).interval === 3);
const lapse = api.nextState({ reps: 4, interval: 16, ease: 2.5, due: 0, lapses: 0, seen: 9 }, 0, 1000);
t("tekrar: kutu sıfır, 1 dk", lapse.reps === 0 && lapse.interval === 0 && lapse.due === 61000 && lapse.lapses === 1);
t("kuyruk 12 yeni kart", api.buildQueue(1).length === 12, api.buildQueue(1).length);

console.log("5) çizim");
let html = env.nodes["view-study"].innerHTML;
t("kayıt anahtarı çizildi", /data-register="kirja" aria-pressed="true"/.test(html));
t("iki dinleme düğmesi", (html.match(/data-speak=/g) || []).length === 2);
t("ritim barları kartta", /class="bar/.test(html));
t("haftalık ray 16 tik", (env.nodes["weekRail"].innerHTML.match(/class="tick"/g) || []).length === 16);

const mina = api.poolFor(1).find((card) => card.fi === "Minä olen Ayşe.");
api.state.session = { queue: [mina], total: 1, done: 0, correct: 0, repeated: new Set() };
api.setView("study");
api.setRegister("puhe");
html = env.nodes["view-study"].innerHTML;
t("kart puhekieli biçiminde", /data-token="Mä"/.test(html) && /data-token="oon"/.test(html) && !/data-token="Minä"/.test(html));
t("anahtar puhe seçili", /data-register="puhe" aria-pressed="true"/.test(html));

console.log("6) Web Speech");
api.speak(0.75);
t("0.75× konuşma", spoken.length === 1 && spoken[0].rate === 0.75 && spoken[0].lang === "fi-FI", JSON.stringify(spoken[0] || {}));
t("metin puhekieli", spoken[0].text === "Mä oon Ayşe.", spoken[0].text);
api.setRegister("kirja");
api.speak(1);
t("1.0× konuşma kirjakieli", spoken[1] && spoken[1].rate === 1 && spoken[1].text === "Minä olen Ayşe.", spoken[1] && spoken[1].text);

console.log("7) klavye ile oturum");
t("başlangıçta cevap kapalı", api.state.flipped === false);
press(" ");
t("boşluk cevabı açar", api.state.flipped === true && /class="grades"/.test(env.nodes["view-study"].innerHTML));
press("4");
const graded = api.progress.cards[mina.id];
t("kolay puanı yazıldı", Boolean(graded) && graded.reps === 1 && graded.interval === 3, JSON.stringify(graded));
t("tek durum v2 anahtarında", Object.keys(store).indexOf("suomi-kartat-v2") !== -1 && Object.keys(store).indexOf("suomi-kartat-v1") === -1, Object.keys(store).join(", "));
t("duyuru", /sonraki tekrar 3 gün/.test(env.nodes["srStatus"].textContent), env.nodes["srStatus"].textContent);

console.log("8) ses desteklenmeyen tarayıcı");
env = boot({ speech: false });
api = env.api;
t("dinleme düğmesi yok", !/data-speak=/.test(env.nodes["view-study"].innerHTML));
api.speak(1);
t("uyarı duyurulur", /desteklemiyor/.test(env.nodes["srStatus"].textContent), env.nodes["srStatus"].textContent);

console.log("\nSONUC: " + pass + " gecti, " + fail + " basarisiz");
process.exit(fail ? 1 : 0);
