(function () {
  function setLang(lang) {
    document.querySelectorAll('[data-manual-lang]').forEach(function (el) {
      el.classList.toggle('manual-hidden', el.getAttribute('data-manual-lang') !== lang);
    });
    document.getElementById('manualLangJa').classList.toggle('active', lang === 'ja');
    document.getElementById('manualLangEn').classList.toggle('active', lang === 'en');
    try { localStorage.setItem('flexcal_manual_lang', lang); } catch (e) { /* ignore */ }
    document.documentElement.lang = lang;
  }
  document.getElementById('manualLangJa').addEventListener('click', function () { setLang('ja'); });
  document.getElementById('manualLangEn').addEventListener('click', function () { setLang('en'); });

  document.getElementById('manualToc').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-goto]');
    if (!btn) return;
    var anchor = btn.getAttribute('data-goto');
    var visible = document.querySelector('[data-manual-lang]:not(.manual-hidden)');
    if (!visible) return;
    var target = visible.querySelector('[data-anchor="' + anchor + '"]');
    if (!target) return;
    var details = target.closest('details');
    if (details) details.open = true;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // 初期表示の言語を決める:
  // 1. このガイド上で以前選んだ言語があればそれを優先
  // 2. なければ、アプリ本体の表示言語設定(IndexedDB)を見て、日本語ならja、
  //    それ以外(英語含む)ならenを既定にする(このガイドは現状ja/enの2言語のみのため)
  var saved = null;
  try { saved = localStorage.getItem('flexcal_manual_lang'); } catch (e) { /* ignore */ }
  if (saved === 'ja' || saved === 'en') {
    setLang(saved);
  } else {
    setLang('ja'); // 判定が終わるまでの暫定表示
    getUiSettings().then(function (s) {
      setLang(s.uiLang === 'ja' ? 'ja' : 'en');
    }).catch(function () { /* IndexedDBが使えない環境などでは日本語のまま */ });
  }
})();
