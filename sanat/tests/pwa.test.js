/* PWA paketi: manifest.json, sw.js ve index.html bağlantıları.

   Denetlenenler:
     - manifest geçerli JSON, ad/kapsam/standalone ve #F4F7FA renkleri,
     - simge referansları varsa diskte gerçekten var,
     - sw.js sürümlü önbellek adı kullanıyor, eski ad kalmamış,
     - önbellek listesindeki her yol diskte mevcut,
     - skipWaiting / clients.claim / caches.delete / network-first gezinme var,
     - index.html manifesti bağlıyor, sw.js kaydediyor, tema rengi #F7F5F0.

   Bağımlılıksız:  cd sanat && node tests/pwa.test.js
   Hepsi birlikte: node tests/run.js */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

let pass = 0, fail = 0;
function t(label, cond, extra) {
  if (cond) { pass++; console.log("  [OK]  " + label + (extra ? " -> " + extra : "")); }
  else { fail++; console.log("  [FAIL] " + label + (extra ? " -> " + extra : "")); }
}

console.log("1) manifest.json");
let manifest = null;
try { manifest = JSON.parse(read("manifest.json")); } catch (error) { manifest = null; }
t("geçerli JSON", Boolean(manifest));
if (manifest) {
  t("ad ve kısa ad", /Suomi Kartat/.test(manifest.name) && Boolean(manifest.short_name), manifest.short_name);
  t("kapsam ve başlangıç", manifest.start_url === "./index.html" && manifest.scope === "./");
  t("standalone", manifest.display === "standalone");
  t("dil tr", manifest.lang === "tr");
  t("tema rengi #F4F7FA", String(manifest.theme_color).toUpperCase() === "#F4F7FA", manifest.theme_color);
  t("arka plan #F4F7FA", String(manifest.background_color).toUpperCase() === "#F4F7FA", manifest.background_color);
  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
  const missingIcons = icons.filter((icon) => !fs.existsSync(path.join(root, icon.src)));
  t("eksik simge referansı yok", missingIcons.length === 0, missingIcons.map((i) => i.src).join(", ") || "simge yok");
}

console.log("2) sw.js");
const sw = read("sw.js");
t("sürümlü önbellek adı", /const CACHE_NAME = 'suomi-kartat-v\d+';/.test(sw), (sw.match(/CACHE_NAME = '[^']+'/) || [])[0]);
t("eski önbellek adı kalmadı", !/suomi-sanat/.test(sw));
const coreMatch = sw.match(/const CORE = \[([\s\S]*?)\];/);
const core = coreMatch ? [...coreMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
t("çekirdek liste tanımlı", core.length >= 6, core.length + " yol");
const missing = core
  .map((entry) => entry.replace(/^\.\//, ""))
  .filter((entry) => entry !== "" && !fs.existsSync(path.join(root, entry)));
t("çekirdek dosyalar diskte", missing.length === 0, missing.join(", ") || "eksik yok");
t("kurulumda skipWaiting", /skipWaiting\(\)/.test(sw));
t("etkinleştirmede clients.claim", /clients\.claim\(\)/.test(sw));
t("eski önbellekler silinir", /caches\.delete/.test(sw));
t("gezinme network-first", /mode === 'navigate'/.test(sw));

console.log("3) index.html bağlantısı");
const html = read("index.html");
t("manifest bağlı", /rel="manifest" href="manifest.json"/.test(html));
t("sw kaydı var", /serviceWorker\.register\('sw\.js'\)/.test(html));
t("tema rengi meta #F4F7FA", /name="theme-color" content="#F4F7FA"/i.test(html));
t("fontlar önbellekte", core.indexOf("./fonts/fraunces.woff2") !== -1 && core.indexOf("./fonts/inter.woff2") !== -1);

console.log("4) Busuu görsel dili");
const css = read("styles.css");
t("ferah gri-mavi zemin ve beyaz kart", /--bg:\s*#f4f7fa/i.test(css) && /--surface:\s*#ffffff/i.test(css));
t("kobalt mavi, turuncu ve başarı yeşili", /--primary:\s*#1a73e8/i.test(css) && /--accent:\s*#ff7a00/i.test(css) && /--success:\s*#16a34a/i.test(css));
t("gece mavisi karanlık mod", /--bg:\s*#0b1120/i.test(css) && /--surface:\s*#151f32/i.test(css));
t("16px kart yarıçapı ve hap butonlar", /--radius:\s*16px/.test(css) && /--pill:\s*999px/.test(css));
t("yumuşak kart gölgesi", /0 4px 14px rgba\(15, 23, 42, 0\.06\)/.test(css));
t("modern sans-serif (Fraunces başlık yok)", /@font-face\s*{[^}]*Inter/s.test(css) && !/font-family:\s*"Fraunces"/.test(css));

console.log("\nSONUC: " + pass + " gecti, " + fail + " basarisiz");
process.exit(fail ? 1 : 0);
