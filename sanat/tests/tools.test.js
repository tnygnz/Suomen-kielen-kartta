/* Çalışma araçları paketi: gramer rehberi, kart destesi ve mini alıştırma.

   Denetlenenler:
     - iki gramer konusu ve tablo satırları veri olarak bütün,
     - araç katmanı Oturum merkezinden açılıyor, mevcut beş görünümü bozmuyor,
     - kart destesi mevcut ALL_CARDS kelimelerini kullanıyor, çevirme/ilerleme,
     - alıştırma puanı, doğru/yanlış geri bildirimi, sonuç ve baştan başlatma.

   Bağımlılıksız:  cd sanat && node tests/tools.test.js
   Hepsi birlikte: node tests/run.js */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(root, "data.js"), "utf8") + "\n" +
            fs.readFileSync(path.join(root, "app.js"), "utf8");

let store = {};

function boot() {
  store = {};
  global.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
  };

  const nodes = {};
  const el = (id) => ({
    id, innerHTML: "", textContent: "", value: "", hidden: false, style: {}, dataset: {}, files: [],
    tagName: "DIV", addEventListener() {}, setAttribute() {}, removeAttribute() {},
    appendChild() {}, remove() {}, click() {}, closest() { return null; },
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

  return { api: new Function(src + "\nreturn globalThis.SuomiKartat;")(), nodes };
}

let pass = 0, fail = 0;
function t(label, cond, extra) {
  if (cond) { pass++; console.log("  [OK]  " + label + (extra ? " -> " + extra : "")); }
  else { fail++; console.log("  [FAIL] " + label + (extra ? " -> " + extra : "")); }
}

const env = boot();
const api = env.api;

console.log("1) veri bütünlüğü");
t("iki gramer konusu", api.GRAMMAR_GUIDE.length === 2, String(api.GRAMMAR_GUIDE.length));
t("her konu başlık, özet ve tablo taşıyor", api.GRAMMAR_GUIDE.every((topic) =>
  topic.title && topic.summary && topic.headers.length === 3 && topic.rows.length === 3));
t("Partitiivi tablosu", api.GRAMMAR_GUIDE[0].rows.some((row) => row[1] === "vettä"));
t("zorunluluk tablosu genetiivi kullanıyor", api.GRAMMAR_GUIDE[1].rows[0][1] === "Minun täytyy lähteä.");
t("iki alıştırma sorusu", api.QUIZ_QUESTIONS.length === 2);
t("doğru cevap indeksleri geçerli", api.QUIZ_QUESTIONS.every((q) =>
  q.answer >= 0 && q.answer < q.options.length && Boolean(q.explanation)));

console.log("2) entegrasyon noktaları");
api.setView("path", { silent: true });
let html = env.nodes["view-path"].innerHTML;
t("Yolculuk ekranında araç girişi", (html.match(/data-act="tools"/g) || []).length === 2);
t("beş görünüm korunuyor", JSON.stringify(api.VIEW_LIST) === JSON.stringify(["path", "study", "index", "lab", "immerse"]));
api.state.hub = true;
api.setView("study", { silent: true });
html = env.nodes["view-study"].innerHTML;
t("Oturum merkezinde üç araç", (html.match(/class="tool-tile"/g) || []).length === 3);
t("dört oturum modu değişmedi", (html.match(/class="mode-card"/g) || []).length === 4);

console.log("3) gramer rehberi");
api.openTools("grammar");
html = env.nodes["view-study"].innerHTML;
t("gramer sekmesi açık", /data-tool="grammar" aria-selected="true"/.test(html));
t("iki açılır konu çizildi", (html.match(/class="grammar-item"/g) || []).length === 2);
t("tablo başlıkları ve örnekler var", /Partitiivi/.test(html) && /vettä/.test(html) && /grammar-table/.test(html));
t("gramerden karta ve alıştırmaya geçiş", /data-tool="cards"/.test(html) && /data-tool="quiz"/.test(html));

console.log("4) kelime kartları");
api.openTools("cards");
html = env.nodes["view-study"].innerHTML;
t("kart sekmesi ve deste", /data-tool="cards" aria-selected="true"/.test(html) && /class="flash-face"/.test(html));
const deck = api.toolDeck();
const deckSize = deck.length;
const expectedSize = api.poolFor(api.state.week).filter((card) => card.type === "kelime").length;
t("deste mevcut modülün kelimeleri", deckSize === expectedSize, `${deckSize} / ${expectedSize}`);
t("ilk kart Fince ve sayaç", html.indexOf(deck[0].fi) !== -1 && html.indexOf(`1 / ${String(deckSize).padStart(2, "0")}`) !== -1);
api.flipToolCard();
html = env.nodes["view-study"].innerHTML;
t("çevirince Türkçe görünür", html.indexOf(deck[0].tr) !== -1 && /Finceyi göster/.test(html));
api.moveToolCard(1);
html = env.nodes["view-study"].innerHTML;
t("sonraki kart ve sayaç", html.indexOf(deck[1].fi) !== -1 && html.indexOf(`02 / ${String(deckSize).padStart(2, "0")}`) !== -1);
api.moveToolCard(-1);
t("önceki karta dönüş", env.nodes["view-study"].innerHTML.indexOf(deck[0].fi) !== -1);

console.log("5) mini alıştırma");
api.openTools("quiz");
html = env.nodes["view-study"].innerHTML;
t("ilk soru ve üç seçenek", /Soru 01 \/ 02/.test(html) && (html.match(/data-act="tool-answer"/g) || []).length === 3);
const correctFirst = api.QUIZ_QUESTIONS[0].answer;
api.answerToolQuiz(correctFirst);
html = env.nodes["view-study"].innerHTML;
t("doğru cevap puanı artırır", api.state.tools.quizScore === 1, String(api.state.tools.quizScore));
t("doğru geri bildirimi ve açıklama", /quiz-feedback is-ok/.test(html) && /kahvia/.test(html));
api.answerToolQuiz(0);
t("aynı soruda ikinci cevap sayılmaz", api.state.tools.quizScore === 1);
api.nextToolQuiz();
t("ikinci soruya geçiş", api.state.tools.quizIndex === 1 && api.state.tools.quizPicked === null);
const wrongSecond = api.QUIZ_QUESTIONS[1].answer === 0 ? 1 : 0;
api.answerToolQuiz(wrongSecond);
html = env.nodes["view-study"].innerHTML;
t("yanlış cevap puanı artırmaz", api.state.tools.quizScore === 1);
t("doğru cevap gösterilir", /quiz-feedback is-bad/.test(html) && /Doğru cevap: Minun täytyy lähteä/.test(html));
api.nextToolQuiz();
html = env.nodes["view-study"].innerHTML;
t("sonuç ekranı", api.state.tools.quizDone === true && /1 \/ 2/.test(html) && /Baştan başla/.test(html));
api.resetToolQuiz();
t("baştan başlatma sıfırlar", api.state.tools.quizIndex === 0 && api.state.tools.quizScore === 0 &&
  api.state.tools.quizPicked === null && api.state.tools.quizDone === false);

console.log("\nSONUC: " + pass + " gecti, " + fail + " basarisiz");
process.exit(fail ? 1 : 0);
