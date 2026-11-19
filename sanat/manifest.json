<!DOCTYPE html>
<html lang="tr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Suomi Ankkuri — Komuta merkezi</title>
    <meta
      name="description"
      content="Aralıklı tekrar ile Fince: günlük hedef, seri, sıradaki görev ve SRS Studio'ya tek tıkla geçiş."
    />
    <link rel="stylesheet" href="styles.css" />
    <link rel="icon" href="favicon.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="doc-nav.css" />
    <link rel="stylesheet" href="theme.css" />
    <script src="theme.js"></script>
    <link rel="stylesheet" href="premium.css" />
    <link rel="stylesheet" href="dashboard.css" />
    <link rel="stylesheet" href="portal.css" />
    <script src="premium.js" defer></script>
    <script src="dashboard.js" defer></script>
  </head>
  <body class="portal-page">
    <header class="portal-head">
      <div class="portal-head-inner">
        <a class="portal-brand" href="index.html" aria-label="Suomi Ankkuri ana sayfa">
          <span class="portal-brand-mark" aria-hidden="true"><img src="logo.svg" alt="" width="26" height="26" /></span>
          <span class="portal-brand-text">
            <b>Suomi Ankkuri</b>
            <small>Fince öğrenme portalı</small>
          </span>
        </a>
        <nav class="portal-nav" aria-label="Site menüsü">
          <a href="index.html" aria-current="page">Ana sayfa</a>
          <a href="sanasto.html">Sözlük</a>
          <a href="kielioppi.html">Dilbilgisi</a>
          <a href="tekstit.html">Metinler</a>
          <a href="puhekieli.html">Konuşma</a>
        </nav>
        <div class="portal-head-end">
          <span class="portal-level">A1–A2 · Fince</span>
          <a class="portal-head-cta" href="studio.html">SRS Studio</a>
        </div>
      </div>
    </header>
    <div class="shell">
      <div class="side-backdrop" id="side-backdrop" hidden></div>
      <!-- ================= SIDEBAR ================= -->
      <aside class="side" id="dash-side" aria-label="Desteler ve gezinme">
        <div class="side-head">
          <p class="side-head-label">Kütüphane</p>
          <span class="side-status" title="Tüm veriler bu tarayıcıda saklanır">
            <i aria-hidden="true"></i> yerel
          </span>
          <button type="button" class="side-rail-toggle" id="side-rail-toggle" aria-pressed="false" aria-label="Menüyü daralt" title="Menüyü daralt">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M9 4.5v15" stroke-linecap="round"/><path d="m14.6 9.6-2.4 2.4 2.4 2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button type="button" class="side-close" id="side-close" aria-label="Menüyü kapat">×</button>
        </div>

        <nav class="side-nav" aria-label="Kategoriler">
          <div class="side-quick">
            <a class="side-link is-active" href="index.html">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 11.5 12 4l8 7.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 10v9.5h11V10" stroke-linecap="round"/></svg>
              <span>Ana sayfa</span>
            </a>
            <a class="side-link" href="studio.html">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="14" rx="2.5"/><path d="M8 21h8M12 18v3" stroke-linecap="round"/><path d="M8 9h8M8 13h5" stroke-linecap="round"/></svg>
              <span>SRS Studio</span>
              <em class="side-pill">canlı</em>
            </a>
            <a class="side-link" href="sanasto.html">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 4.5h9.5A2.5 2.5 0 0 1 17 7v13H7.5A2.5 2.5 0 0 1 5 17.5v-13Z" stroke-linejoin="round"/><path d="M9 8.5h4M9 12h4" stroke-linecap="round"/><path d="M17 7l2.5 2v11H18" stroke-linejoin="round"/></svg>
              <span>Sözlük</span>
            </a>
            <a class="side-link" href="sanastot.html">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10" stroke-linecap="round"/><circle cx="19" cy="18" r="1.6"/></svg>
              <span>Sanastot</span>
            </a>
          </div>

          <p class="side-label">Kitap desteleri</p>
          <details class="side-group" open>
            <summary>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" stroke-linejoin="round"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20" stroke-linejoin="round"/></svg>
              Kitap 1–5
              <span class="side-caret" aria-hidden="true"></span>
            </summary>
            <div class="side-decks" id="week-row" role="tablist" aria-label="Hafta seçimi"></div>
            <div class="side-decks" id="kirja-row" role="tablist" aria-label="Kitap desteleri"></div>
            <div class="side-decks" id="kirja2-row" role="tablist" aria-label="Kitap 2 desteleri"></div>
            <div class="side-decks" id="kirja3-row" role="tablist" aria-label="Kitap 3 desteleri"></div>
            <div class="side-decks" id="kirja4-row" role="tablist" aria-label="Kitap 4 desteleri"></div>
            <div class="side-decks" id="kirja5-row" role="tablist" aria-label="Kitap 5 desteleri"></div>
          </details>

          <p class="side-label">Metin ve konuşma</p>
          <details class="side-group">
            <summary>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h11M4 12h16M4 17h9" stroke-linecap="round"/><path d="M18 4v6" stroke-linecap="round"/></svg>
              Metin desteleri
              <span class="side-caret" aria-hidden="true"></span>
            </summary>
            <div class="side-decks" id="text-row" role="tablist" aria-label="Metin desteleri"></div>
          </details>
          <details class="side-group">
            <summary>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 4a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V7a3 3 0 0 1 3-3Z"/><path d="M6 11a6 6 0 0 0 12 0M12 17v3M9 20h6" stroke-linecap="round"/></svg>
              Puhekieli
              <span class="side-caret" aria-hidden="true"></span>
            </summary>
            <div class="side-decks" id="puhe-row" role="tablist" aria-label="Puhekieli desteleri"></div>
          </details>

          <p class="side-label">Diğer desteler</p>
          <details class="side-group">
            <summary>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3 3 8l9 5 9-5-9-5Z" stroke-linejoin="round"/><path d="m3 13 9 5 9-5M3 17l9 5 9-5" stroke-linejoin="round"/></svg>
              Itseopiskelu · Fonetiikka · Ruotsi
              <span class="side-caret" aria-hidden="true"></span>
            </summary>
            <div class="side-decks" id="itse-row" role="tablist" aria-label="Itseopiskelu desteleri"></div>
            <div class="side-decks" id="fone-row" role="tablist" aria-label="Fonetiikka desteleri"></div>
            <div class="side-decks" id="ruotsi-row" role="tablist" aria-label="Ruotsi desteleri"></div>
          </details>
          <details class="side-group">
            <summary>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 19V6a2 2 0 0 1 2-2h4l2 3h6a2 2 0 0 1 2 2v10H4Z" stroke-linejoin="round"/></svg>
              Trukki · Ennakointi · Sanasto
              <span class="side-caret" aria-hidden="true"></span>
            </summary>
            <div class="side-decks" id="trukki-row" role="tablist" aria-label="Trukki desteleri"></div>
            <div class="side-decks" id="ennakointi-row" role="tablist" aria-label="Ennakointi desteleri"></div>
            <div class="side-decks" id="sanasto-row" role="tablist" aria-label="Sanasto destesi"></div>
          </details>
        </nav>

        <div class="side-foot">
          <button type="button" class="theme-toggle" data-theme-toggle aria-pressed="false" aria-label="Açık temaya geç" title="Açık temaya geç">
            <span class="theme-toggle-icon" aria-hidden="true">☀</span>
            <span class="theme-toggle-label">Açık tema</span>
          </button>
          <a class="side-cta" href="studio.html">
            <span>Studio'yu aç</span>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
        </div>
      </aside>

      <!-- ================= ANA İÇERİK ================= -->
      <div class="dash-wrap">
        <header class="dash-top">
          <button type="button" class="side-toggle" id="side-toggle" aria-expanded="false" aria-controls="dash-side">
            <span class="side-toggle-bars" aria-hidden="true"><i></i><i></i><i></i></span>
            Menü
          </button>
          <p class="dash-date" id="dash-date"><span class="dash-date-full">Bugün</span><span class="dash-date-short">Bugün</span></p>
          <div class="dash-chips">
            <span class="chip">
              <i class="chip-dot chip-dot-cyan" aria-hidden="true"></i>
              <span class="chip-label chip-label-full">Tekrar sırası</span><span class="chip-label chip-label-short">Tekrar</span><b id="stat-due">0</b>
            </span>
            <span class="chip chip-link">
              <a class="chip-hit" href="sanastot.html#sa-quiz" aria-label="Sanasto quizini aç"></a>
              <i class="chip-dot chip-dot-mint" aria-hidden="true"></i>
              <span class="chip-label chip-label-full">Sanasto quizi</span><span class="chip-label chip-label-short">Quiz</span><b id="stat-sanastot">—</b>
            </span>
          </div>
        </header>

        <section class="quiz-history" id="quiz-history" aria-labelledby="quiz-history-title" hidden>
          <p class="quiz-history-title" id="quiz-history-title">Son quizler</p>
          <ul class="quiz-history-list" id="quiz-history-list"></ul>
        </section>

        <main class="dash">
          <!-- Hero -->
          <section class="hero" aria-labelledby="dash-greeting">
            <div class="hero-aurora" aria-hidden="true">
              <span class="aurora-a"></span>
              <span class="aurora-b"></span>
              <span class="aurora-c"></span>
            </div>
            <p class="hero-kicker">Komuta merkezi · günlük plan</p>
            <h1 id="dash-greeting">İyi akşamlar</h1>
            <p class="hero-sub" id="dash-sub">
              Bugünün tekrarlarını tamamla, seriyi koru. Kart çalışması SRS Studio'da.
            </p>
            <div class="hero-actions">
              <a class="hero-cta" href="studio.html">
                Çalışmaya başla
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.3" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </a>
              <a class="hero-ghost" href="#study">Sınav / pratik seç</a>
            </div>
            <div class="hero-meta">
              <span><b id="hero-today">0</b> bugün</span>
              <span class="hero-meta-sep" aria-hidden="true"></span>
              <span><b id="hero-goal">20</b> günlük hedef</span>
              <span class="hero-meta-sep" aria-hidden="true"></span>
              <span id="hero-streak-note">Seri yeni başlıyor</span>
            </div>
          </section>

          <div class="dash-grid">
            <!-- Aktivite halkaları -->
            <article class="dash-card rings-card">
              <header class="card-head">
                <div>
                  <p class="card-kicker">Bugünün halkaları</p>
                  <h2 class="card-title">Aktivite</h2>
                </div>
                <span class="card-chip" id="ring-goal-chip">hedef %0</span>
              </header>

              <div class="rings-body">
                <div class="rings-visual">
                  <svg viewBox="0 0 120 120" role="img" aria-label="Günlük hedef, öğrenilen kart ve seri halkaları">
                    <defs>
                      <linearGradient id="dashGoalGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8fafc"/><stop offset="1" stop-color="#94a3b8"/></linearGradient>
                      <linearGradient id="dashLearnGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#60a5fa"/><stop offset="1" stop-color="#3b82f6"/></linearGradient>
                      <linearGradient id="dashStreakGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#94a3b8"/><stop offset="1" stop-color="#475569"/></linearGradient>
                    </defs>
                    <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(var(--prem-ink-rgb, 234, 240, 251), .1)" stroke-width="7"/>
                    <circle cx="60" cy="60" r="40" fill="none" stroke="rgba(var(--prem-ink-rgb, 234, 240, 251), .09)" stroke-width="7"/>
                    <circle cx="60" cy="60" r="28" fill="none" stroke="rgba(var(--prem-ink-rgb, 234, 240, 251), .08)" stroke-width="7"/>
                    <circle class="dash-ring" id="ringGoal" cx="60" cy="60" r="52" fill="none" stroke="url(#dashGoalGrad)" stroke-width="7" stroke-linecap="round" stroke-dasharray="326.7" stroke-dashoffset="326.7"/>
                    <circle class="dash-ring" id="ringLearned" cx="60" cy="60" r="40" fill="none" stroke="url(#dashLearnGrad)" stroke-width="7" stroke-linecap="round" stroke-dasharray="251.3" stroke-dashoffset="251.3"/>
                    <circle class="dash-ring" id="ringStreak" cx="60" cy="60" r="28" fill="none" stroke="url(#dashStreakGrad)" stroke-width="7" stroke-linecap="round" stroke-dasharray="175.9" stroke-dashoffset="175.9"/>
                  </svg>
                  <div class="rings-center">
                    <strong id="ringGoalPct">%0</strong>
                    <span>hedef</span>
                  </div>
                </div>

                <ul class="rings-legend">
                  <li>
                    <i class="ring-dot ring-dot-goal" aria-hidden="true"></i>
                    <span class="ring-label">Bugünkü tekrar</span>
                    <b class="ring-value"><span id="stat-today">0</span><small id="today-goal"> / 20</small></b>
                  </li>
                  <li>
                    <i class="ring-dot ring-dot-learn" aria-hidden="true"></i>
                    <span class="ring-label">Öğrenilen kart</span>
                    <b class="ring-value"><span id="stat-learned">0</span></b>
                  </li>
                  <li>
                    <i class="ring-dot ring-dot-streak" aria-hidden="true"></i>
                    <span class="ring-label">Günlük seri</span>
                    <b class="ring-value"><span id="stat-streak">0</span><small> gün</small></b>
                  </li>
                </ul>
              </div>
              <div class="goal-picker" id="dash-goal-row" role="group" aria-label="Günlük tekrar hedefi">
                <span class="goal-label">Günlük hedef</span>
                <button type="button" data-goal="10">10</button>
                <button type="button" data-goal="20" class="is-active" aria-pressed="true">20</button>
                <button type="button" data-goal="30">30</button>
                <button type="button" data-goal="50">50</button>
              </div>
              <p class="card-foot" id="ring-note">20 tekrar hedefi · her gün küçük bir oturum yeter.</p>
            </article>

            <!-- Plan özeti -->
            <article class="dash-card plan-card">
              <header class="card-head">
                <div>
                  <p class="card-kicker">Kitap 4 planı</p>
                  <h2 class="card-title">Hafta 17–24</h2>
                </div>
                <span class="card-chip">8 hafta</span>
              </header>
              <p class="plan-now" id="plan-now" hidden></p>
              <div class="plan-progress" id="plan-progress" hidden>
                <div class="plan-progress-head">
                  <span class="plan-progress-meta">
                    <b id="plan-progress-label">0 / 8 hafta tamamlandı</b>
                    <button
                      type="button"
                      class="plan-progress-jump"
                      id="plan-progress-jump"
                      aria-label="Sıradaki tamamlanmamış haftayı aç"
                    >
                      Sıradaki: Hafta 17
                    </button>
                  </span>
                </div>
                <div
                  class="plan-progress-track"
                  id="plan-progress-track"
                  role="progressbar"
                  aria-valuemin="0"
                  aria-valuemax="8"
                  aria-valuenow="0"
                  aria-label="Kitap 4 planı ilerlemesi"
                >
                  <span class="plan-progress-fill" id="plan-progress-fill"></span>
                </div>
                <p class="plan-summary" id="plan-summary" hidden></p>
                <div
                  class="plan-chart"
                  id="plan-chart"
                  role="group"
                  aria-label="Tamamlanan haftalar · desteyi açmak için haftaya tıkla"
                  hidden
                ></div>
              </div>
              <div class="plan-fallback" id="plan-fallback">
                <p>Plan, Kitap 4 haftalarını sırayla açar. Kaldığın yerden devam etmek için haftayı seç.</p>
                <a class="plan-link" href="kirja4.html">Kitap 4 eşliğine git</a>
              </div>
            </article>
          </div>

          <!-- Sıradaki görev -->
          <section class="upnext" aria-labelledby="upnext-title">
            <div class="upnext-glow" aria-hidden="true"></div>
            <div class="upnext-body">
              <p class="upnext-kicker">
                <span class="upnext-ping" aria-hidden="true"><i></i></span>
                Sıradaki görevin
              </p>
              <h2 id="upnext-title">Hafta 17 — Kitap desteleri</h2>
              <p class="upnext-meta" id="upnext-meta">
                Kapsam seçili · kartlar SRS Studio'da aralıklı tekrar planıyla gelir.
              </p>
              <div class="upnext-tags">
                <span class="upnext-tag"><i aria-hidden="true"></i><b id="upnext-due">0</b> tekrar sırada</span>
                <span class="upnext-tag"><b id="upnext-streak">0</b> günlük seri</span>
                <span class="upnext-tag">~<b id="upnext-minutes">0</b> dk</span>
              </div>
            </div>
            <div class="upnext-action">
              <a class="upnext-cta" id="upnext-cta" href="studio.html">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10-6.5a1 1 0 0 0 0-1.72l-10-6.5A1 1 0 0 0 8 5.5Z"/></svg>
                SRS Studio'yu Aç ve Çalışmaya Başla
              </a>
              <p class="upnext-note">Odak modu ve klavye kısayolları ile</p>
            </div>
          </section>

          <!-- Isı haritası -->
          <section class="dash-card heat-card" aria-labelledby="heat-title">
            <header class="card-head">
              <div>
                <p class="card-kicker">Son 30 gün</p>
                <h2 class="card-title" id="heat-title">Çalışma yoğunluğu</h2>
              </div>
              <div class="heat-summary">
                <b id="dash-heat-total">0</b> tekrar
                <span class="heat-summary-sep" aria-hidden="true"></span>
                <b id="dash-heat-streak">0</b> günlük seri
              </div>
            </header>
            <div class="heat-scroll">
              <div class="heat-grid" id="dash-heatmap" role="group" aria-label="Son 30 günün çalışma ısı haritası"></div>
              <div class="heat-tip" id="heat-tip" role="status" hidden></div>
            </div>
            <div class="heat-legend">
              <span>az</span>
              <i class="heat-cell heat-0" aria-hidden="true"></i>
              <i class="heat-cell heat-1" aria-hidden="true"></i>
              <i class="heat-cell heat-2" aria-hidden="true"></i>
              <i class="heat-cell heat-3" aria-hidden="true"></i>
              <i class="heat-cell heat-4" aria-hidden="true"></i>
              <span>çok</span>
              <span class="heat-legend-note">Studio tekrarlarından · bugün dahil</span>
            </div>
            <p class="heat-week" id="dash-heat-week">Bu hafta henüz çalışma yok.</p>
          </section>

          <!-- Hafıza tutma eğrisi -->
          <section class="dash-card curve-card" aria-labelledby="curve-title">
            <header class="card-head">
              <div>
                <p class="card-kicker">Gerçek tekrar kayıtları</p>
                <h2 class="card-title" id="curve-title">Hafıza tutma eğrisi</h2>
              </div>
              <div class="curve-head-tools">
                <span class="card-chip" id="curve-sample">0 çift</span>
                <div class="curve-tools" id="curve-scope" role="group" aria-label="Eğri kapsamı">
                  <button type="button" data-scope="all" class="is-active" aria-pressed="true">Tümü</button>
                  <button type="button" data-scope="deck" aria-pressed="false">Bu deste</button>
                  <button type="button" data-scope="card" aria-pressed="false">Kart</button>
                </div>
                <select class="curve-card-select" id="curve-card" aria-label="Eğri için kart seç" hidden></select>
              </div>
            </header>
            <div class="curve-wrap">
              <svg class="curve-svg" viewBox="0 0 320 150" preserveAspectRatio="none" role="img" aria-label="Hafıza tutma eğrisi için henüz yeterli tekrar kaydı yok">
                <line class="curve-axis-line" x1="10" y1="130" x2="310" y2="130" />
                <line class="curve-target-line" x1="10" y1="20" x2="310" y2="20" />
                <path class="curve-actual" id="curve-actual" d="" />
                <circle class="curve-point" id="curve-point" r="3.5" cx="0" cy="0" hidden />
              </svg>
              <div class="curve-axis" aria-hidden="true">
                <span>0g</span><span>1g</span><span>3g</span><span>7g</span><span>14g</span><span>30g+</span>
              </div>
            </div>
            <div class="curve-legend">
              <span><i class="curve-key curve-key-actual"></i>senin eğrin</span>
              <span><i class="curve-key curve-key-target"></i>hedef %90</span>
            </div>
            <p class="curve-note" id="curve-note">Yeterli tekrar geçmişi yok. Studio'da aynı kartı birkaç kez tekrar edince eğri burada oluşur.</p>
          </section>

          <!-- Kitap ilerlemesi -->
          <details class="dash-card kitap-card">
            <summary class="kitap-summary">
              <span>
                <span class="card-kicker">Eşlik sayfaları</span>
                <span class="card-title">Kitap ilerlemesi</span>
              </span>
              <span class="side-caret" aria-hidden="true"></span>
            </summary>
            <div class="kitap-list">
              <div class="kitap-row">
                <a class="kirja-progress" id="kirja-progress-link" href="kirja.html" title="Henüz tamamlanan bölüm yok">
                  <span class="kirja-progress-track" id="kirja-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="9" aria-valuenow="0" aria-label="Kitap alıştırma ilerlemesi">
                    <span class="kirja-progress-fill" id="kirja-progress-fill"></span>
                  </span>
                </a>
                <details class="kirja-progress-note" id="kirja-progress-note">
                  <summary class="kirja-progress-note-toggle">
                    <span class="kirja-progress-note-caret" aria-hidden="true"></span>
                    <span class="kirja-progress-note-text" id="kirja-progress-note-text">Henüz tamamlanan bölüm yok</span>
                  </summary>
                  <ul class="kirja-progress-note-list" id="kirja-progress-note-list" hidden></ul>
                </details>
              </div>
              <div class="kitap-row">
                <a class="kirja-progress" id="kirja2-progress-link" href="kirja2.html" title="Henüz tamamlanan bölüm yok">
                  <span class="kirja-progress-track" id="kirja2-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="8" aria-valuenow="0" aria-label="Kitap 2 alıştırma ilerlemesi">
                    <span class="kirja-progress-fill" id="kirja2-progress-fill"></span>
                  </span>
                </a>
                <details class="kirja-progress-note" id="kirja2-progress-note">
                  <summary class="kirja-progress-note-toggle">
                    <span class="kirja-progress-note-caret" aria-hidden="true"></span>
                    <span class="kirja-progress-note-text" id="kirja2-progress-note-text">Henüz tamamlanan bölüm yok</span>
                  </summary>
                  <ul class="kirja-progress-note-list" id="kirja2-progress-note-list" hidden></ul>
                </details>
              </div>
              <div class="kitap-row">
                <a class="kirja-progress" id="kirja3-progress-link" href="kirja3.html" title="Henüz tamamlanan bölüm yok">
                  <span class="kirja-progress-track" id="kirja3-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="8" aria-valuenow="0" aria-label="Kitap 3 alıştırma ilerlemesi">
                    <span class="kirja-progress-fill" id="kirja3-progress-fill"></span>
                  </span>
                </a>
                <details class="kirja-progress-note" id="kirja3-progress-note">
                  <summary class="kirja-progress-note-toggle">
                    <span class="kirja-progress-note-caret" aria-hidden="true"></span>
                    <span class="kirja-progress-note-text" id="kirja3-progress-note-text">Henüz tamamlanan bölüm yok</span>
                  </summary>
                  <ul class="kirja-progress-note-list" id="kirja3-progress-note-list" hidden></ul>
                </details>
              </div>
              <div class="kitap-row">
                <a class="kirja-progress" id="kirja4-progress-link" href="kirja4.html" title="Henüz tamamlanan bölüm yok">
                  <span class="kirja-progress-track" id="kirja4-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="8" aria-valuenow="0" aria-label="Kitap 4 alıştırma ilerlemesi">
                    <span class="kirja-progress-fill" id="kirja4-progress-fill"></span>
                  </span>
                </a>
                <details class="kirja-progress-note" id="kirja4-progress-note">
                  <summary class="kirja-progress-note-toggle">
                    <span class="kirja-progress-note-caret" aria-hidden="true"></span>
                    <span class="kirja-progress-note-text" id="kirja4-progress-note-text">Henüz tamamlanan bölüm yok</span>
                  </summary>
                  <ul class="kirja-progress-note-list" id="kirja4-progress-note-list" hidden></ul>
                </details>
              </div>
              <div class="kitap-row">
                <a class="kirja-progress" id="kirja5-progress-link" href="kirja5.html" title="Henüz tamamlanan bölüm yok">
                  <span class="kirja-progress-track" id="kirja5-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="18" aria-valuenow="0" aria-label="Kitap 5 alıştırma ilerlemesi">
                    <span class="kirja-progress-fill" id="kirja5-progress-fill"></span>
                  </span>
                </a>
                <details class="kirja-progress-note" id="kirja5-progress-note">
                  <summary class="kirja-progress-note-toggle">
                    <span class="kirja-progress-note-caret" aria-hidden="true"></span>
                    <span class="kirja-progress-note-text" id="kirja5-progress-note-text">Henüz tamamlanan bölüm yok</span>
                  </summary>
                  <ul class="kirja-progress-note-list" id="kirja5-progress-note-list" hidden></ul>
                </details>
              </div>
              <div class="kitap-row">
                <a class="kirja-progress" id="trukki-progress-link" href="trukki.html" title="Henüz tamamlanan bölüm yok">
                  <span class="kirja-progress-track" id="trukki-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="12" aria-valuenow="0" aria-label="Trukki alıştırma ilerlemesi">
                    <span class="kirja-progress-fill" id="trukki-progress-fill"></span>
                  </span>
                </a>
                <details class="kirja-progress-note" id="trukki-progress-note">
                  <summary class="kirja-progress-note-toggle">
                    <span class="kirja-progress-note-caret" aria-hidden="true"></span>
                    <span class="kirja-progress-note-text" id="trukki-progress-note-text">Henüz tamamlanan bölüm yok</span>
                  </summary>
                  <ul class="kirja-progress-note-list" id="trukki-progress-note-list" hidden></ul>
                </details>
              </div>
            </div>
          </details>

          <!-- Çalışma alanı -->
          <section class="dash-card study-card" id="study" aria-labelledby="study-title">
            <header class="card-head study-head">
              <div>
                <p class="card-kicker">Kapsam ve mod</p>
                <h2 class="card-title" id="study-title">Çalışma alanı</h2>
              </div>
              <div class="toolbar">
                <div class="view-row" id="view-row" role="group" aria-label="Çalışma modu">
                  <button type="button" class="view-btn is-active" data-view="review">Tekrar</button>
                  <button type="button" class="view-btn" data-view="exam">Sınav</button>
                  <button type="button" class="view-btn" data-view="practice">Pratik</button>
                </div>
                <div class="mode-row" id="mode-row" role="group" aria-label="Kart yönü">
                  <button type="button" class="mode-btn is-active" data-mode="fi-tr">Fince → Türkçe</button>
                  <button type="button" class="mode-btn" data-mode="tr-fi">Türkçe → Fince</button>
                </div>
              </div>
            </header>

            <nav class="doc-switch" id="doc-switch" aria-label="Eşlik sayfaları">
              <a href="kielioppi.html">Dilbilgisi</a>
              <a href="tekstit.html">Metinler</a>
              <a href="kirja.html">Kitap</a>
              <a href="kirja2.html">Kitap 2</a>
              <a href="kirja3.html">Kitap 3</a>
              <a href="kirja4.html">Kitap 4</a>
              <a href="kirja5.html">Kitap 5</a>
              <a href="itseopiskelu.html">Itseopiskelu</a>
              <a href="fonetiikka.html">Fonetiikka</a>
              <a href="ruotsi.html">Ruotsi</a>
              <a href="studio.html">Çalışma</a>
              <a href="trukki.html">Trukki</a>
              <a href="ennakointi.html">Ennakointi</a>
              <a href="puhekieli.html">Puhekieli</a>
              <a href="sanasto.html">Sözlük</a>
              <a href="sanastot.html">Sanastot</a>
              <a href="sanastot2.html">Sanastot 2</a>
            </nav>

            <!-- ================= Tekrar modu ================= -->
            <section class="view" id="review-view">
              <div class="panel" id="studio-handoff">
                <div class="panel-head">
                  <h2>Çalışma artık Studio'da</h2>
                  <span class="badge">Yeni</span>
                </div>
                <p class="panel-text">
                  Kelime kartları, odak modu, klavye kısayolları ve istatistikler yeni
                  <b>SRS Studio</b> sayfasına taşındı. Desteler, sınav ve pratik modları burada
                  çalışmaya devam ediyor.
                </p>
                <p class="panel-text">
                  Studio 16 haftalık 328 kartın tamamını aralıklı tekrar planıyla çalışır; ilerleme
                  tarayıcında saklanır ve JSON olarak yedeklenebilir.
                </p>
                <a class="flip-btn" id="studio-link" href="studio.html" style="display:inline-flex;align-items:center;justify-content:center;text-decoration:none">
                  SRS Studio'yu aç
                </a>
              </div>
            </section>

            <!-- ================= Sınav modu ================= -->
            <section class="view exam" id="exam-view" hidden>
              <a class="chapter-back" id="exam-chapter-back" hidden></a>
              <div class="panel" id="exam-start">
                <div class="panel-head">
                  <h2>Sınav modu</h2>
                  <span class="badge">Çoktan seçmeli</span>
                </div>
                <p class="panel-text">
                  Seçili kapsamdan sorular gelir; her soruda dört seçenekten doğru olanı işaretlersin. Sınav
                  sonunda skorun kaydedilir ve yanlışlarını tekrar kuyruğuna ekleyebilirsin.
                </p>

                <div class="exam-stats">
                  <div class="mini-stat">
                    <span class="mini-value" id="exam-last">—</span>
                    <span class="mini-label">son sınav</span>
                  </div>
                  <div class="mini-stat">
                    <span class="mini-value" id="exam-avg">—</span>
                    <span class="mini-label">ortalama</span>
                  </div>
                  <div class="mini-stat">
                    <span class="mini-value" id="exam-total">0</span>
                    <span class="mini-label">toplam soru</span>
                  </div>
                </div>

                <div class="exam-config">
                  <label class="field">
                    <span>Soru sayısı</span>
                    <select id="exam-count">
                      <option value="10" selected>10 soru</option>
                      <option value="20">20 soru</option>
                      <option value="30">30 soru</option>
                    </select>
                  </label>
                  <label class="field">
                    <span>Kart türü</span>
                    <select id="exam-kinds">
                      <option value="all" selected>Kelime + cümle</option>
                      <option value="kelime">Sadece kelime</option>
                      <option value="cümle">Sadece cümle</option>
                    </select>
                  </label>
                </div>

                <p class="scope-hint" id="exam-scope-hint">Kapsam: tüm haftalar</p>
                <button type="button" class="start-btn" id="exam-start-btn">Sınavı başlat</button>
              </div>

              <div class="exam-run" id="exam-run" hidden>
                <div class="progress-meta">
                  <span id="exam-counter">Soru 1 / 10</span>
                  <span id="exam-score">0 doğru</span>
                </div>
                <div class="progress-track">
                  <div class="progress-bar" id="exam-bar"></div>
                </div>

                <article class="card exam-card">
                  <div class="card-head">
                    <span class="badge" id="exam-badge">Kelime</span>
                    <span class="card-week" id="exam-week">Hafta 1</span>
                  </div>

                  <div class="card-body">
                    <p class="prompt-lang" id="exam-prompt-lang">Fince</p>
                    <h2 class="prompt" id="exam-prompt" data-wordtip></h2>
                    <button type="button" class="speak-btn" id="exam-speak" title="Telaffuzu dinle" aria-label="Telaffuzu dinle">
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                        <path fill="currentColor" d="M13 4.1v15.8a1 1 0 0 1-1.6.8L6.3 16.5H3.5A1.5 1.5 0 0 1 2 15V9a1.5 1.5 0 0 1 1.5-1.5h2.8l5.1-4.2a1 1 0 0 1 1.6.8Zm3.6 2.3a1 1 0 0 1 1.4.1 8 8 0 0 1 0 11.2 1 1 0 1 1-1.4-1.4 6 6 0 0 0 0-8.4 1 1 0 0 1 0-1.5Zm-2.4 2.6a1 1 0 0 1 1.4 0 4.2 4.2 0 0 1 0 6 1 1 0 0 1-1.4-1.4 2.2 2.2 0 0 0 0-3.2 1 1 0 0 1 0-1.4Z" />
                      </svg>
                      <span>Dinle</span>
                    </button>
                  </div>

                  <div class="options" id="exam-options"></div>

                  <div class="feedback" id="exam-feedback" hidden>
                    <p class="feedback-text" id="exam-feedback-text"></p>
                    <p class="note" id="exam-note" hidden></p>
                  </div>

                  <button type="button" class="flip-btn" id="exam-next" hidden>
                    Sonraki soru<span class="kbd">Enter</span>
                  </button>
                </article>
              </div>

              <div class="panel exam-result" id="exam-result" hidden>
                <div class="score-ring" id="score-ring">
                  <span class="score-value" id="score-value">0%</span>
                  <span class="score-sub" id="score-sub">0 / 10</span>
                </div>
                <h2 id="result-title">Sınav bitti</h2>
                <p class="panel-text" id="result-text"></p>

                <div class="wrong-list" id="wrong-list" hidden></div>

                <div class="done-actions">
                  <button type="button" class="ghost-btn" id="exam-restart">Yeni sınav</button>
                  <button type="button" class="ghost-btn" id="exam-review-wrong" hidden>Yanlışları tekrara ekle</button>
                  <button type="button" class="ghost-btn" id="exam-to-review">Tekrar moduna dön</button>
                </div>
              </div>
            </section>

            <!-- ================= Pratik modu ================= -->
            <section class="view practice" id="practice-view" hidden>
              <a class="chapter-back" id="practice-chapter-back" hidden></a>
              <div class="panel" id="practice-start">
                <div class="panel-head">
                  <h2>Konuşma ve yazma pratiği</h2>
                  <span class="badge">Üretim</span>
                </div>
                <p class="panel-text">
                  Türkçe anlamı görürsün, Fince karşılığını kendin yazarsın. Cevaptan sonra doğru cümleyi
                  dinleyip mikrofonla yüksek sesle tekrar edebilirsin — tanıma değil, üretme çalışması.
                </p>

                <div class="exam-stats">
                  <div class="mini-stat">
                    <span class="mini-value" id="practice-last">—</span>
                    <span class="mini-label">son pratik</span>
                  </div>
                  <div class="mini-stat">
                    <span class="mini-value" id="practice-avg">—</span>
                    <span class="mini-label">ortalama</span>
                  </div>
                  <div class="mini-stat">
                    <span class="mini-value" id="practice-total">0</span>
                    <span class="mini-label">toplam deneme</span>
                  </div>
                </div>

                <div class="exam-config">
                  <label class="field">
                    <span>Soru sayısı</span>
                    <select id="practice-count">
                      <option value="10" selected>10 soru</option>
                      <option value="20">20 soru</option>
                      <option value="30">30 soru</option>
                    </select>
                  </label>
                  <label class="field">
                    <span>Kart türü</span>
                    <select id="practice-kinds">
                      <option value="all" selected>Kelime + cümle</option>
                      <option value="kelime">Sadece kelime</option>
                      <option value="cümle">Sadece cümle</option>
                    </select>
                  </label>
                </div>

                <p class="scope-hint" id="practice-scope-hint">Kapsam: tüm haftalar</p>
                <button type="button" class="start-btn" id="practice-start-btn">Pratiğe başla</button>
              </div>

              <div class="practice-run" id="practice-run" hidden>
                <div class="progress-meta">
                  <span id="practice-counter">Soru 1 / 10</span>
                  <span id="practice-score">0 doğru</span>
                </div>
                <div class="progress-track">
                  <div class="progress-bar" id="practice-bar"></div>
                </div>

                <article class="card practice-card">
                  <div class="card-head">
                    <span class="badge" id="practice-badge">Kelime</span>
                    <span class="card-week" id="practice-week">Hafta 1</span>
                  </div>

                  <div class="card-body">
                    <p class="prompt-lang">Türkçe</p>
                    <h2 class="prompt" id="practice-prompt"></h2>

                    <form class="answer-form" id="practice-form" autocomplete="off">
                      <input
                        type="text"
                        id="practice-input"
                        class="answer-input"
                        placeholder="Fincesini yaz…"
                        spellcheck="false"
                        autocapitalize="off"
                        lang="fi"
                      />
                      <button type="button" class="ghost-btn small" id="practice-hint-btn">İpucu</button>
                      <button type="submit" class="check-btn" id="practice-check">Kontrol et</button>
                    </form>

                    <p class="hint-line" id="practice-hint" hidden></p>

                    <div class="feedback" id="practice-feedback" hidden>
                      <p class="feedback-text" id="practice-feedback-text"></p>
                      <p class="answer-line" id="practice-answer"></p>
                      <p class="note" id="practice-note" hidden></p>
                      <div class="speak-row">
                        <button type="button" class="speak-btn" id="practice-speak">
                          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                            <path fill="currentColor" d="M13 4.1v15.8a1 1 0 0 1-1.6.8L6.3 16.5H3.5A1.5 1.5 0 0 1 2 15V9a1.5 1.5 0 0 1 1.5-1.5h2.8l5.1-4.2a1 1 0 0 1 1.6.8Zm3.6 2.3a1 1 0 0 1 1.4.1 8 8 0 0 1 0 11.2 1 1 0 1 1-1.4-1.4 6 6 0 0 0 0-8.4 1 1 0 0 1 0-1.5Zm-2.4 2.6a1 1 0 0 1 1.4 0 4.2 4.2 0 0 1 0 6 1 1 0 0 1-1.4-1.4 2.2 2.2 0 0 0 0-3.2 1 1 0 0 1 0-1.4Z" />
                          </svg>
                          <span>Dinle</span>
                        </button>
                        <button type="button" class="speak-btn" id="practice-mic" hidden>Mikrofonla dene</button>
                      </div>
                      <p class="hint-line" id="practice-mic-status" hidden></p>
                    </div>

                    <button type="button" class="flip-btn" id="practice-next" hidden>
                      Sonraki soru<span class="kbd">Enter</span>
                    </button>
                  </div>
                </article>
              </div>

              <div class="panel exam-result" id="practice-result" hidden>
                <div class="score-ring" id="practice-ring">
                  <span class="score-value" id="practice-pct">0%</span>
                  <span class="score-sub" id="practice-sub">0 / 10</span>
                </div>
                <h2 id="practice-result-title">Pratik bitti</h2>
                <p class="panel-text" id="practice-result-text"></p>

                <div class="wrong-list" id="practice-wrong" hidden></div>

                <div class="done-actions">
                  <button type="button" class="ghost-btn" id="practice-restart">Yeni pratik</button>
                  <button type="button" class="ghost-btn" id="practice-review-wrong" hidden>Yanlışları tekrara ekle</button>
                  <button type="button" class="ghost-btn" id="practice-to-review">Tekrar moduna dön</button>
                </div>
              </div>
            </section>
          </section>

          <footer class="footer">
            <nav class="doc-switch" aria-label="Eşlik sayfaları kısayolları">
              <a href="kielioppi.html">Dilbilgisi rehberi</a>
              <a href="tekstit.html">Okuma metinleri</a>
              <a href="kirja.html">Kitap eşliği</a>
              <a href="kirja2.html">Kitap 2 eşliği</a>
              <a href="kirja3.html">Kitap 3 eşliği</a>
              <a href="kirja4.html">Kitap 4 eşliği</a>
              <a href="kirja5.html">Kitap 5 eşliği</a>
              <a href="itseopiskelu.html">Itseopiskelu eşliği</a>
              <a href="fonetiikka.html">Fonetiikka eşliği</a>
              <a href="ruotsi.html">Ruotsi eşliği</a>
              <a href="trukki.html">Trukki eşliği</a>
              <a href="ennakointi.html">Ennakointi</a>
              <a href="sanasto.html">Sözlük</a>
              <a href="sanastot.html">Sanastot</a>
            </nav>
            <div class="footer-meta">
              <p class="hint" id="shortcut-hint">
                Klavye: <span class="kbd">Boşluk</span> çevir · <span class="kbd">1</span> tekrar ·
                <span class="kbd">2</span> zor · <span class="kbd">3</span> iyi · <span class="kbd">4</span> kolay ·
                <span class="kbd">S</span> dinle · cevaptan sonra <span class="kbd">Enter</span> ya da
            <span class="kbd">Boşluk</span> iyi
              </p>
              <div class="footer-actions">
                <span class="save-note">İlerleme bu tarayıcıda saklanır.</span>
                <button type="button" class="reset-btn" id="reset-all">Tüm ilerlemeyi sıfırla</button>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>

    <script src="data-tekstit.js"></script>
    <script src="data.js"></script>
    <script src="puhekieli-data.js"></script>
    <script src="data-puhekieli.js"></script>
    <script src="data-kirja.js"></script>
    <script src="data-kirja2.js"></script>
    <script src="data-kirja3.js"></script>
    <script src="data-kirja4.js"></script>
    <script src="data-kirja5.js"></script>
    <script src="data-itseopiskelu1.js"></script>
    <script src="data-itseopiskelu2.js"></script>
    <script src="data-itseopiskelu3.js"></script>
    <script src="data-itseopiskelu4.js"></script>
    <script src="data-itseopiskelu-lisanot1.js"></script>
    <script src="data-itseopiskelu-lisanot2.js"></script>
    <script src="data-itseopiskelu.js"></script>
    <script src="data-fonetiikka1.js"></script>
    <script src="data-fonetiikka2.js"></script>
    <script src="data-fonetiikka.js"></script>
    <script src="data-ruotsi1.js"></script>
    <script src="data-ruotsi2.js"></script>
    <script src="data-ruotsi3.js"></script>
    <script src="data-ruotsi4.js"></script>
    <script src="data-ruotsi5.js"></script>
    <script src="data-ruotsi.js"></script>
    <script src="data-trukki.js"></script>
    <script src="data-ennakointi-kartat.js"></script>
    <script src="data-sanastot-kartat.js"></script>
    <script src="app.js"></script>
    <script src="word-tip.js" defer></script>
    <script src="doc-nav.js" defer></script>
  </body>
</html>
