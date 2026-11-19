/* Kelime paketleri paketi: imports/ altındaki 26 JSON dosyası ve index.json.

   Uygulama artık paketleri ağdan indirmiyor; dosyalar depoda ve canlı sitede
   aynı adla duruyor. Bu test, paketlerin okunabilir ve tutarlı kaldığını
   doğrular:

     - index.json 26 kayıt, tekrar eden dosya adı yok,
     - her dosya diskte var ve JSON olarak açılıyor,
     - app alanı "suomi-tr", state.custom bir dizi,
     - custom uzunluğu index'teki count ile aynı, fi/tr dolu,
     - paket içinde aynı Fince kelime iki kez yok.

   Bağımlılıksız:  cd sanat && node tests/import.test.js
   Hepsi birlikte: node tests/run.js */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dir = path.join(root, "imports");
const index = JSON.parse(fs.readFileSync(path.join(dir, "index.json"), "utf8"));

let pass = 0, fail = 0;
function t(label, cond, extra) {
  if (cond) { pass++; console.log("  [OK]  " + label + (extra ? " -> " + extra : "")); }
  else { fail++; console.log("  [FAIL] " + label + (extra ? " -> " + extra : "")); }
}

console.log("1) index.json");
t("26 paket", index.length === 26, String(index.length));
t("dosya adları benzersiz", new Set(index.map((p) => p.file)).size === index.length);
t("her kayıtta pack/count/lvl", index.every((p) => typeof p.pack === "string" && p.pack.length > 3 && typeof p.count === "number" && p.count > 0 && typeof p.lvl === "string"));

console.log("2) dosyalar");
const missing = index.filter((p) => !fs.existsSync(path.join(dir, p.file)));
t("hepsi diskte", missing.length === 0, missing.map((p) => p.file).join(", ") || "eksik yok");

const packs = [];
index.forEach((entry) => {
  try {
    packs.push({ entry, data: JSON.parse(fs.readFileSync(path.join(dir, entry.file), "utf8")) });
  } catch (error) {
    packs.push({ entry, data: null });
  }
});

t("hepsi JSON olarak açılıyor", packs.every((p) => p.data !== null));
t("app alanı suomi-tr", packs.every((p) => p.data && p.data.app === "suomi-tr"));
t("state.custom dizi", packs.every((p) => p.data && p.data.state && Array.isArray(p.data.state.custom)));

console.log("3) içerik");
const countMismatch = packs.filter((p) => p.data && p.data.state.custom.length !== p.entry.count);
t("count = custom uzunluğu", countMismatch.length === 0, countMismatch.map((p) => p.entry.file + ":" + p.data.state.custom.length + "/" + p.entry.count).join(", ") || "tutarlı");

const emptyFields = packs.filter((p) =>
  p.data && p.data.state.custom.some((c) => !c || typeof c.fi !== "string" || !c.fi.trim() || typeof c.tr !== "string" || !c.tr.trim()));
t("her kelimede fi ve tr dolu", emptyFields.length === 0, emptyFields.map((p) => p.entry.file).join(", ") || "eksik yok");

const dupes = packs.filter((p) => {
  if (!p.data) return false;
  const seen = new Set();
  return p.data.state.custom.some((c) => {
    const key = c && String(c.fi).toLocaleLowerCase("fi");
    if (seen.has(key)) return true;
    seen.add(key);
    return false;
  });
});
t("paket içinde tekrar eden Fince yok", dupes.length === 0, dupes.map((p) => p.entry.file).join(", ") || "temiz");

const kokoelma = packs.find((p) => p.entry.file === "samalla-kartalla-3-kokoelma.json");
t("kokoelma 795 kelime", Boolean(kokoelma) && kokoelma.data.state.custom.length === 795, kokoelma ? String(kokoelma.data.state.custom.length) : "yok");
t("her pakette en az 40 kelime", packs.every((p) => p.data.state.custom.length >= 40), packs.map((p) => p.data.state.custom.length).join(","));

console.log("\nSONUC: " + pass + " gecti, " + fail + " basarisiz");
process.exit(fail ? 1 : 0);
