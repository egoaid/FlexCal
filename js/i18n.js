/* ============================================================
   i18n.js — UI文言の多言語対応 共通モジュール
   - i18n-data.js(window.I18N_DATA)に埋め込まれた文言データを読み込み、
     data-i18n系属性を持つ要素へ一括反映します。
   - Service Workerがキャッシュするため、2回目以降はオフラインでも
     言語切り替えが機能します(sw.jsのASSETSに追加済み)。
   - 祝日の「地域」は独立して選ぶのではなく、ロケール(LOCALES, shared.js)
     に紐づけて自動的に決まります。
   ============================================================ */

let I18N_STRINGS = {};
let I18N_LANG = 'ja';

// 言語データは i18n-data.js が <script> タグとして先に読み込まれ、
// window.I18N_DATA['xx'] にセットされている前提。
// (以前は fetch('lang/xx.json') で取得していたが、file:// で直接開くと
//  ブラウザのセキュリティ制限で fetch が失敗し、言語が切り替わらないバグがあった。
//  さらにその後 lang/xx.js という「サブフォルダ内の複数ファイル」構成にしたが、
//  チャットから1ファイルずつダウンロードする運用ではサブフォルダ構造が保持されず、
//  lang/xx.js が404になって同じ症状が再発する事故が起きた。
//  最終的に、全言語データを i18n-data.js という単一ファイルにまとめることで、
//  ファイル欠落による事故を構造的に防いでいる。
//
//  【2026年9月・GitHub Pages公開時の追記】その後 js/ フォルダに移動したが、これは
//  上記の問題を再発させない。上記の事故は (a) fetch() が file:// で失敗すること、
//  (b) チャットからの「1ファイルずつダウンロード」でサブフォルダ構造が失われること、
//  の2つが原因だった。<script src="js/i18n-data.js"> のような通常の<script>タグに
//  よる読み込みは file:// でもサブフォルダのままで問題なく動作し(fetch()を使う
//  XHR/Fetch APIとは別物)、かつ今回はZIP一括ダウンロード/Gitリポジトリでの管理が
//  前提のため、サブフォルダ構造が失われる心配もない。よって js/・css/ フォルダへの
//  再編成は安全)
function loadI18n(lang) {
  I18N_LANG = lang || 'ja';
  const bundled = window.I18N_DATA || {};
  if (Object.keys(bundled).length === 0) {
    // i18n-data.js 自体が読み込めていない(ファイルが見つからない等)。
    // サイレントに日本語表示のまま固まるのを防ぐため、画面上に警告を出す。
    console.error('i18n-data.js が読み込めていません。js/i18n-data.js が正しい場所に存在し、<script>タグで読み込まれているか確認してください。');
    showI18nLoadWarning();
  }
  if (bundled[I18N_LANG]) {
    I18N_STRINGS = bundled[I18N_LANG];
  } else {
    console.warn(`i18n: no bundled data for locale "${I18N_LANG}" — is i18n-data.js included as a <script> tag (after i18n.js, before app.js/print.js)? Falling back to "ja".`);
    I18N_STRINGS = bundled.ja || {};
  }
  document.documentElement.lang = I18N_LANG;
  applyI18nDom();
  applyLocalizedManifest(I18N_LANG);
  return I18N_STRINGS;
}

// PWAのmanifest(ホーム画面追加時の名前・説明)を選択中の言語に合わせて動的に差し替える。
// manifest.jsonは静的ファイルなので言語ごとに複数用意するのではなく、実際のmanifest.json
// を取得したうえで name/description/lang だけを選択中の言語に差し替え、Blob URLとして
// <link rel="manifest"> に差し込む方式にしている。
// (以前は最小限の項目だけを手書きしたJSONで丸ごと置き換えており、manifest.json本来の
//  アイコン7種・shortcuts・categories等がページ読み込みのたびに消えてしまうという
//  実害のあるバグがあった。実物のmanifest.jsonを土台にして必要な項目だけ書き換える
//  方式に修正済み)
// (注意: Blob URLは通常のURLと違って「相対パスの基準」として機能しないため、
//  アイコンやshortcutsの中のURLは、埋め込み前にすべて絶対URLへ変換しておく必要がある)
async function applyLocalizedManifest(lang) {
  const link = document.querySelector('link[rel="manifest"]');
  if (!link) return; // print.html等、manifestを持たないページでは何もしない
  const strings = (window.I18N_DATA && window.I18N_DATA[lang]) || {};
  // 差し替え前の「本物のmanifest.jsonへのURL」を最初の1回だけ覚えておく
  // (2回目以降の呼び出し時には link.href が既にblob: URLになっているため)
  if (!link.dataset.originalHref) link.dataset.originalHref = link.href;
  const baseHref = link.dataset.originalHref;
  try {
    const res = await fetch(baseHref);
    if (!res.ok) throw new Error('manifest fetch failed: ' + res.status);
    const manifest = await res.json();
    manifest.name = `FlexCal — ${strings['app.brandSub'] || 'free calendar print'}`;
    manifest.description = strings['app.description'] || manifest.description;
    manifest.lang = lang;

    const abs = (u) => new URL(u, baseHref).href;
    if (Array.isArray(manifest.icons)) {
      manifest.icons = manifest.icons.map((icon) => ({ ...icon, src: abs(icon.src) }));
    }
    if (Array.isArray(manifest.shortcuts)) {
      manifest.shortcuts = manifest.shortcuts.map((sc) => ({
        ...sc,
        url: abs(sc.url),
        icons: Array.isArray(sc.icons) ? sc.icons.map((icon) => ({ ...icon, src: abs(icon.src) })) : sc.icons,
      }));
    }
    if (manifest.start_url) manifest.start_url = abs(manifest.start_url);
    if (manifest.scope) manifest.scope = abs(manifest.scope);

    const oldHref = link.href;
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    link.href = URL.createObjectURL(blob);
    // 直前のBlob URLはすぐには解放せず少し待つ(ブラウザがまだ読み込み中の可能性があるため)
    if (oldHref && oldHref.startsWith('blob:')) {
      setTimeout(() => URL.revokeObjectURL(oldHref), 5000);
    }
  } catch (err) {
    // manifest.jsonの取得に失敗した場合(file://で直接開いている、オフライン初回
    // アクセス等)は、静的なmanifest.jsonのままにしておく。多言語化されないだけで、
    // PWAとしてのインストール自体は引き続き可能な状態を維持する。
    console.warn('applyLocalizedManifest: failed to localize manifest, keeping static manifest.json', err);
  }
}

function showI18nLoadWarning() {
  if (document.getElementById('i18nLoadWarning')) return;
  const bar = document.createElement('div');
  bar.id = 'i18nLoadWarning';
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#c8443c;color:#fff;'
    + 'padding:8px 14px;font-size:13px;text-align:center;font-family:sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
  bar.textContent = '⚠ i18n-data.js が読み込めていません。js/i18n-data.js が正しい場所にあるか確認してください。'
    + '(Language data failed to load — make sure i18n-data.js is in the same folder as this page.)';
  if (document.body) document.body.prepend(bar);
  else document.addEventListener('DOMContentLoaded', () => document.body.prepend(bar));
}

// key に対応する文言を返す。見つからない場合は fallback (省略時は key 自体) を返す。
function t(key, fallback) {
  if (I18N_STRINGS && Object.prototype.hasOwnProperty.call(I18N_STRINGS, key)) {
    return I18N_STRINGS[key];
  }
  return fallback !== undefined ? fallback : key;
}

// DOM内の data-i18n / data-i18n-placeholder / data-i18n-title / data-i18n-html を一括置換
function applyI18nDom(root) {
  const scope = root || document;
  scope.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (Object.prototype.hasOwnProperty.call(I18N_STRINGS, key)) el.textContent = I18N_STRINGS[key];
  });
  scope.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (Object.prototype.hasOwnProperty.call(I18N_STRINGS, key)) el.setAttribute('placeholder', I18N_STRINGS[key]);
  });
  scope.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (Object.prototype.hasOwnProperty.call(I18N_STRINGS, key)) el.setAttribute('title', I18N_STRINGS[key]);
  });
  scope.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria-label');
    if (Object.prototype.hasOwnProperty.call(I18N_STRINGS, key)) el.setAttribute('aria-label', I18N_STRINGS[key]);
  });
  scope.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    if (Object.prototype.hasOwnProperty.call(I18N_STRINGS, key)) el.innerHTML = I18N_STRINGS[key];
  });
}

// 「表示言語」プルダウンを生成
function populateUiLangSelect(selectEl, currentCode, onChange) {
  selectEl.innerHTML = '';
  UI_LANGUAGES.forEach(l => {
    const opt = document.createElement('option');
    opt.value = l.code;
    opt.textContent = l.label;
    selectEl.appendChild(opt);
  });
  selectEl.value = currentCode;
  selectEl.onchange = () => onChange(selectEl.value);
}
// 「祝日の国」プルダウンを生成。国名は現在の表示言語で翻訳して表示する
// (言語を切り替えたときは呼び直して選択肢のテキストを更新すること)
function populateHolidayCountrySelect(selectEl, currentCode, onChange) {
  selectEl.innerHTML = '';
  HOLIDAY_COUNTRIES.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.code;
    opt.textContent = t(`country.${c.code}`, c.label);
    selectEl.appendChild(opt);
  });
  selectEl.value = currentCode;
  selectEl.onchange = () => onChange(selectEl.value);
}
