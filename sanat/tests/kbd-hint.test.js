/* Klavye paketi: oturum ekranının tek Enter/boşluk + 1-4 akışı.

   Denetlenenler:
     - boşluk cevabı açar, puanlama düğmeleri çıkar,
     - cevap açılmadan rakam puan yazmaz,
     - 1-4 tuşları SM-2'ye yazar (4 → kolay, 3 gün),
     - girdi alanında ve düğme üzerinde kısayol çalışmaz,
     - puanlamadan sonra yeni kart kapalı gelir.

   Bağımlılıksız:  cd sanat && node tests/kbd-hint.test.js
   Hepsi birlikte: node tests/run.js */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(root, "data.js"), "utf8") + "\n" +
            fs.readFileSync(path.join(root, "app.js"), "utf8");

let store = {};
let keydown = null;

function boot() {
  store = {};
  keydown = null;
  global.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
  };
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
  global.window = {};
  const api = new Function(src + "\nreturn globalThis.SuomiKartat;")();
  return { api, nodes };
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

const env = boot();
const api = env.api;
const cardId = api.state.session.queue[0].id;

console.log("1) cevap açılmadan puan yok");
press("3");
t("rakam yok sayılır", api.state.flipped === false && !api.progress.cards[cardId]);
t("puanlama düğmesi çizilmedi", !/data-grade=/.test(env.nodes["view-study"].innerHTML));

console.log("2) boşluk cevabı açar");
press(" ");
t("cevap açık", api.state.flipped === true);
t("dört puanlama düğmesi", (env.nodes["view-study"].innerHTML.match(/data-grade=/g) || []).length === 4);

console.log("3) klavye puanı SM-2'ye yazar");
press("4");
const state4 = api.progress.cards[cardId];
t("kolay: 3 gün", Boolean(state4) && state4.interval === 3 && state4.reps === 1, JSON.stringify(state4));
t("sonraki kart kapalı", api.state.flipped === false);
t("oturum sayacı", api.state.session.done === 1 && api.state.session.correct === 1);
t("duyuru tek satır", /sonraki tekrar 3 gün/.test(env.nodes["srStatus"].textContent));

console.log("4) odağa göre kısayol susar");
press(" ", { tagName: "INPUT", closest() { return null; } });
t("girdi alanında boşluk açmaz", api.state.flipped === false);
press(" ", { tagName: "BUTTON", closest() { return {}; } });
t("düğme üzerinde boşluk açmaz", api.state.flipped === false);

console.log("5) ikinci kart: Enter ve rakam");
press("Enter");
t("Enter cevabı açar", api.state.flipped === true);
const nextId = api.state.session.queue[0].id;
press("2");
const state2 = api.progress.cards[nextId];
t("zor puanı: aralık 1 gün", Boolean(state2) && state2.interval === 1 && state2.reps === 1, JSON.stringify(state2));
t("zor puanı da doğru sayılır (yalnız Tekrar yanlış)", api.state.session.correct === 2, String(api.state.session.correct));

console.log("\nSONUC: " + pass + " gecti, " + fail + " basarisiz");
process.exit(fail ? 1 : 0);
