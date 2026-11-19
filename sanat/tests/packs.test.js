/* Müfredat verisi paketi: data.js içindeki 16 haftalık WEEKS ve türetilen
   ALL_CARDS bozulmadan duruyor mu?

   Denetlenenler:
     - 16 hafta, sıralı kimlikler, her haftada başlık/odak/kelime/cümle,
     - 328 kart (200 kelime + 128 cümle), benzersiz kimlikler,
     - her kartta fi/tr dolu, tür ve hafta başlığı tutarlı,
     - data.js yalnızca veri: DOM, localStorage veya ağ çağrısı yok.

   Bağımlılıksız:  cd sanat && node tests/packs.test.js
   Hepsi birlikte: node tests/run.js */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const file = path.join(root, "data.js");
const text = fs.readFileSync(file, "utf8");
const api = new Function(text + "\nreturn { WEEKS: WEEKS, ALL_CARDS: ALL_CARDS };")();
const WEEKS = api.WEEKS;
const ALL_CARDS = api.ALL_CARDS;

let pass = 0, fail = 0;
function t(label, cond, extra) {
  if (cond) { pass++; console.log("  [OK]  " + label + (extra ? " -> " + extra : "")); }
  else { fail++; console.log("  [FAIL] " + label + (extra ? " -> " + extra : "")); }
}

console.log("1) haftalar");
t("16 hafta", WEEKS.length === 16, String(WEEKS.length));
t("kimlikler 1..16 sıralı", WEEKS.every((w, i) => w.id === i + 1));
t("her haftada başlık ve odak", WEEKS.every((w) => typeof w.title === "string" && w.title.length > 3 && typeof w.focus === "string" && w.focus.length > 3));
t("her haftada en az 12 kelime", WEEKS.every((w) => Array.isArray(w.words) && w.words.length >= 12), WEEKS.map((w) => w.words.length).join(","));
t("her haftada 8 cümle", WEEKS.every((w) => Array.isArray(w.sentences) && w.sentences.length === 8));

console.log("2) kart havuzu");
t("328 kart", ALL_CARDS.length === 328, String(ALL_CARDS.length));
const words = ALL_CARDS.filter((c) => c.type === "kelime");
const sentences = ALL_CARDS.filter((c) => c.type === "cümle");
t("200 kelime", words.length === 200, String(words.length));
t("128 cümle", sentences.length === 128, String(sentences.length));
const ids = ALL_CARDS.map((c) => c.id);
t("kimlikler benzersiz", new Set(ids).size === ids.length, String(new Set(ids).size));
t("kimlik biçimi w<hafta>-[kc]-<n>", ids.every((id) => /^w\d+-[kc]-\d+$/.test(id)));
t("fi ve tr dolu", ALL_CARDS.every((c) => typeof c.fi === "string" && c.fi.trim() && typeof c.tr === "string" && c.tr.trim()));
t("tür alanı geçerli", ALL_CARDS.every((c) => c.type === "kelime" || c.type === "cümle"));
t("hafta 1..16 aralığında", ALL_CARDS.every((c) => c.week >= 1 && c.week <= 16));
t("hafta başlığı WEEKS ile eşleşir", ALL_CARDS.every((c) => c.weekTitle === WEEKS[c.week - 1].title));
t("not alanı her kartta var", ALL_CARDS.every((c) => typeof c.note === "string"));

console.log("3) hafta dağılımı");
const perWeek = WEEKS.map((w) => ALL_CARDS.filter((c) => c.week === w.id).length);
t("dağılım toplamı 328", perWeek.reduce((a, b) => a + b, 0) === 328, perWeek.join(","));
t("hafta 1 = 23 kart", perWeek[0] === 23, String(perWeek[0]));
t("her hafta en az 20 kart", perWeek.every((n) => n >= 20), perWeek.join(","));

console.log("4) veri dosyası saflığı");
t("DOM referansı yok", !/document\.|localStorage|window\./.test(text));
t("ağ çağrısı yok", !/fetch\(|XMLHttpRequest|import\(/.test(text));
t("yalnızca WEEKS ve ALL_CARDS tanımlar", !/^\s*(let|var)\s/m.test(text));

console.log("\nSONUC: " + pass + " gecti, " + fail + " basarisiz");
process.exit(fail ? 1 : 0);
