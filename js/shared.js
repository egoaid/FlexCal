/* ============================================================
   共有モジュール: IndexedDB アクセスと日付ユーティリティ
   editor(app.js)と印刷プレビュー(print.js)の両方から読み込みます。
   ============================================================ */

const DB_NAME = 'studyprint-db';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const idb = req.result;
      if (!idb.objectStoreNames.contains('events')) {
        idb.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
      }
      if (!idb.objectStoreNames.contains('goals')) {
        idb.createObjectStore('goals', { keyPath: 'date' });
      }
      if (!idb.objectStoreNames.contains('settings')) {
        idb.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

let _db;
async function db() { return _db || (_db = await openDB()); }

async function storeAll(name) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const req = d.transaction(name, 'readonly').objectStore(name).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function storePut(name, value) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const req = d.transaction(name, 'readwrite').objectStore(name).put(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function storeDelete(name, key) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const req = d.transaction(name, 'readwrite').objectStore(name).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
async function storeClear(name) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const req = d.transaction(name, 'readwrite').objectStore(name).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/* ---------------- Shared in-memory store ---------------- */
const Store = { events: [], goals: {} };

async function loadAll() {
  Store.events = await storeAll('events');
  const goalRows = await storeAll('goals');
  Store.goals = {};
  goalRows.forEach(g => Store.goals[g.date] = g.text);
}

function eventsOn(dateStr) {
  return Store.events.filter(e => e.date === dateStr).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
}
function maxLevelOn(dateStr) {
  return eventsOn(dateStr).reduce((m, e) => Math.max(m, e.level || 0), 0);
}

/* ---------------- Date utilities ---------------- */
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parseDate(s) { const [y, m, dd] = s.split('-').map(Number); return new Date(y, m - 1, dd); }
const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土'];

/* ---------------- i18n: 言語と祝日の国を分離 ----------------
   以前は「表示言語」と「祝日の国」を1つの選択肢(ロケール)にまとめていたが、
   「ドイツ在住で英語を使いたい」のように、言語と居住国(祝日)が一致しない
   利用者のニーズに応えられないという指摘を受け、独立した2つの選択に分離した。
   例: Language: English / Holiday Country: Germany
   ※ ロケール一体型だった頃の設定(旧'locale'キー)からは自動移行する。 */
const UI_LANGUAGES = [
  { code: 'ja', label: '日本語' },
  { code: 'en', label: 'English' },
  { code: 'ko', label: '한국어' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
  { code: 'es', label: 'Español' },
  { code: 'zh', label: '简体中文' },
];
const HOLIDAY_COUNTRIES = [
  { code: 'jp', label: '日本' },
  { code: 'us', label: 'United States' },
  { code: 'uk', label: 'United Kingdom' },
  { code: 'de', label: 'Deutschland' },
  { code: 'fr', label: 'France' },
  { code: 'it', label: 'Italia' },
  { code: 'es', label: 'España' },
  { code: 'ca', label: 'Canada' },
  { code: 'au', label: 'Australia' },
  { code: 'kr', label: '대한민국(양력 고정祝日만)' },
  { code: 'cn', label: '中国(固定祝日のみ)' },
  { code: 'tw', label: '台灣(固定祝日のみ)' },
  { code: 'none', label: '祝日を表示しない' },
];
// 旧'locale'キー(言語+国が一体になっていたコード)からの移行マップ
const LEGACY_LOCALE_MAP = {
  'ja-jp': { lang: 'ja', country: 'jp' },
  'en-us': { lang: 'en', country: 'us' },
  'en-uk': { lang: 'en', country: 'uk' },
  'ko-kr': { lang: 'ko', country: 'kr' },
};
function uiLanguageInfo(code) {
  return UI_LANGUAGES.find(l => l.code === code) || UI_LANGUAGES[0];
}
function holidayCountryInfo(code) {
  return HOLIDAY_COUNTRIES.find(c => c.code === code) || HOLIDAY_COUNTRIES[0];
}
// 言語と祝日国をまとめて取得。新形式の設定が無い場合は旧'locale'キーから移行する。
async function getUiSettings() {
  let uiLang = await getSetting('uiLang', null);
  let holidayCountry = await getSetting('holidayCountry', null);
  if (uiLang == null || holidayCountry == null) {
    const legacy = await getSetting('locale', null);
    const mapped = legacy && LEGACY_LOCALE_MAP[legacy];
    if (uiLang == null) uiLang = (mapped && mapped.lang) || 'ja';
    if (holidayCountry == null) holidayCountry = (mapped && mapped.country) || 'jp';
    await setSetting('uiLang', uiLang);
    await setSetting('holidayCountry', holidayCountry);
  }
  return { uiLang, holidayCountry };
}
async function setUiLang(code) { return setSetting('uiLang', code); }
async function setHolidayCountry(code) { return setSetting('holidayCountry', code); }

const WEEKDAY_NAMES = {
  ja: ['日', '月', '火', '水', '木', '金', '土'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  ko: ['일', '월', '화', '수', '목', '금', '토'],
  de: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  fr: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'],
  it: ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'],
  es: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
  zh: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
};
const MONTH_NAMES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_DE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const MONTH_NAMES_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MONTH_NAMES_IT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const MONTH_NAMES_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
// 言語ごとの「◯月」表記フォーマッタ。新しい言語を足すときはここに1行追加するだけでよい設計。
const MONTH_LABEL_FORMATTERS = {
  ja: (i) => `${i + 1}月`,
  en: (i) => MONTH_NAMES_EN[i],
  ko: (i) => `${i + 1}월`,
  de: (i) => MONTH_NAMES_DE[i],
  fr: (i) => MONTH_NAMES_FR[i],
  it: (i) => MONTH_NAMES_IT[i],
  es: (i) => MONTH_NAMES_ES[i],
  zh: (i) => `${i + 1}月`,
};
function weekdayLabels(lang) {
  return WEEKDAY_NAMES[lang] || WEEKDAY_NAMES.ja;
}
function monthLabel(monthIndex, lang) {
  const fmt = MONTH_LABEL_FORMATTERS[lang] || MONTH_LABEL_FORMATTERS.ja;
  return fmt(monthIndex);
}
// 「年+月」の見出し表記(編集画面の月ブロックタイトルなどで使用)。
// 新しい言語を足すときはここに1行追加するだけでよい設計。
const YEAR_MONTH_FORMATTERS = {
  ja: (y, i) => `${y}年 ${monthLabel(i, 'ja')}`,
  en: (y, i) => `${monthLabel(i, 'en')} ${y}`,
  ko: (y, i) => `${y}년 ${monthLabel(i, 'ko')}`,
  de: (y, i) => `${monthLabel(i, 'de')} ${y}`,
  fr: (y, i) => `${monthLabel(i, 'fr')} ${y}`,
  it: (y, i) => `${monthLabel(i, 'it')} ${y}`,
  es: (y, i) => `${monthLabel(i, 'es')} de ${y}`,
  zh: (y, i) => `${y}年${monthLabel(i, 'zh')}`,
};
function yearMonthLabel(year, monthIndex, lang) {
  const fmt = YEAR_MONTH_FORMATTERS[lang] || YEAR_MONTH_FORMATTERS.ja;
  return fmt(year, monthIndex);
}

const MONTH_NAMES_EN_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_NAMES_DE_FULL = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MONTH_NAMES_FR_FULL = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTH_NAMES_IT_FULL = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const MONTH_NAMES_ES_FULL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
// 英語の序数(1st, 2nd, 3rd, 4th...)
function ordinalSuffix(n) {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}
// 「年月日」のフル表記。国ごとに月日の順序が異なる点に対応:
// 日本語: 2026年8月10日 / 英語(米国式): August 10th, 2026 / 韓国語: 2026년 8월 10일
// ドイツ語・フランス語・イタリア語・スペイン語は日/月/年の順(ヨーロッパ式)
const FULL_DATE_FORMATTERS = {
  ja: (y, m, d) => `${y}年${m + 1}月${d}日`,
  en: (y, m, d) => `${MONTH_NAMES_EN_FULL[m]} ${d}${ordinalSuffix(d)}, ${y}`,
  ko: (y, m, d) => `${y}년 ${m + 1}월 ${d}일`,
  de: (y, m, d) => `${d}. ${MONTH_NAMES_DE_FULL[m]} ${y}`,
  fr: (y, m, d) => `${d === 1 ? '1er' : d} ${MONTH_NAMES_FR_FULL[m]} ${y}`,
  it: (y, m, d) => `${d} ${MONTH_NAMES_IT_FULL[m]} ${y}`,
  es: (y, m, d) => `${d} de ${MONTH_NAMES_ES_FULL[m]} de ${y}`,
  zh: (y, m, d) => `${y}年${m + 1}月${d}日`,
};
function formatFullDate(date, lang) {
  const fmt = FULL_DATE_FORMATTERS[lang] || FULL_DATE_FORMATTERS.ja;
  return fmt(date.getFullYear(), date.getMonth(), date.getDate());
}
// 期間表示(「開始日 〜 終了日」)の区切り記号も言語によって変える
const RANGE_SEPARATORS = { ja: '〜', en: '–', ko: '~', de: '–', fr: '–', it: '–', es: '–', zh: '至' };
function formatDateRange(startDate, endDate, lang) {
  const sep = RANGE_SEPARATORS[lang] || RANGE_SEPARATORS.ja;
  return `${formatFullDate(startDate, lang)} ${sep} ${formatFullDate(endDate, lang)}`;
}

/* ---------------- 国ごとのカレンダー慣習の違い(週の始まり以外) ----------------
   調査の結果、週の始まり以外にも以下の慣習差があることが分かったため対応した:
   - 日付の順序: 米国は月/日/年(MDY)、日・韓・中・台・加(公式)は年/月/日(YMD)、
     それ以外(英・独・仏・伊・西・豪)は日/月/年(DMY)が一般的
   - 時刻表記: 米・英・加・豪は12時間制(AM/PM)が日常的、それ以外は24時間制が標準
   これらは本来「言語」ではなく「祝日の国」に紐づく慣習のため、祝日国コードを
   優先的に見る。ただし祝日国が「表示しない」に設定されている等で判断材料が
   無い場合は、表示言語に基づく妥当な既定値にフォールバックする。 */
const DATE_ORDER_BY_COUNTRY = {
  jp: 'YMD', kr: 'YMD', cn: 'YMD', tw: 'YMD', ca: 'YMD',
  us: 'MDY',
  uk: 'DMY', de: 'DMY', fr: 'DMY', it: 'DMY', es: 'DMY', au: 'DMY',
};
const TIME_FORMAT_12H_COUNTRIES = new Set(['us', 'uk', 'ca', 'au']);
// 祝日国が「表示しない」等で判断できない場合の、表示言語による既定値
const DATE_ORDER_BY_LANGUAGE = { ja: 'YMD', ko: 'YMD', zh: 'YMD', en: 'MDY', de: 'DMY', fr: 'DMY', it: 'DMY', es: 'DMY' };
const TIME_FORMAT_12H_LANGUAGES = new Set(['en']);
// HOLIDAY_COUNTRIES(none除く)に実在するコードかどうかの判定に使う
const RECOGNIZED_COUNTRY_CODES = new Set(HOLIDAY_COUNTRIES.map(c => c.code).filter(c => c !== 'none'));

// 短い日付表記(年なし)。国の慣習に応じて月/日の順序を入れ替える。
// countryCode が未対応('none'含む)の場合は、lang(表示言語)から妥当な既定値を推定する。
function formatShortDate(date, countryCode, lang) {
  const order = RECOGNIZED_COUNTRY_CODES.has(countryCode)
    ? (DATE_ORDER_BY_COUNTRY[countryCode] || 'YMD')
    : (DATE_ORDER_BY_LANGUAGE[lang] || 'YMD');
  const m = date.getMonth() + 1, d = date.getDate();
  return order === 'DMY' ? `${d}/${m}` : `${m}/${d}`;
}
// "14:30" のような24時間制の時刻文字列を、国の慣習に応じて "2:30 PM" 等に変換する。
// countryCode が未対応('none'含む)の場合は、lang(表示言語)から妥当な既定値を推定する。
function formatTimeForCountry(timeStr, countryCode, lang) {
  if (!timeStr) return '';
  const use12h = RECOGNIZED_COUNTRY_CODES.has(countryCode)
    ? TIME_FORMAT_12H_COUNTRIES.has(countryCode)
    : TIME_FORMAT_12H_LANGUAGES.has(lang);
  if (!use12h) return timeStr;
  const [hh, mm] = timeStr.split(':').map(Number);
  if (Number.isNaN(hh)) return timeStr;
  const period = hh < 12 ? 'AM' : 'PM';
  let h12 = hh % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${period}`;
}

/* ---- 日本の祝日計算(外部APIなし・完全オフライン対応) ----
   固定祝日・ハッピーマンデー・振替休日・国民の休日を計算します。
   適用範囲: 1948年以降(現行祝日法)。春分・秋分は天文学的推定式(2150年まで精度OK)。 */
function japaneseHolidays(year) {
  const holidays = {};
  const add = (m, d, name) => {
    const key = `${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    holidays[key] = holidays[key] ? holidays[key] + '・' + name : name;
  };
  const weekday = (m, d) => new Date(year, m - 1, d).getDay();
  const nthMon = (m, n) => { // n番目の月曜日
    const first = new Date(year, m - 1, 1).getDay();
    const offset = (1 - first + 7) % 7;
    return 1 + offset + (n - 1) * 7;
  };

  // 春分・秋分(天文学的推定式)
  const vernal = Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  const autumnal = Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));

  const fixed = [
    [1,1,'元日'], [2,11,'建国記念の日'], [2,23,'天皇誕生日'],
    [4,29,'昭和の日'], [5,3,'憲法記念日'], [5,4,'みどりの日'], [5,5,'こどもの日'],
    [8,11,'山の日'], [11,3,'文化の日'], [11,23,'勤労感謝の日'],
  ];
  if (year < 2007) { fixed.push([9,15,'敬老の日']); }
  if (year < 2000) { fixed.push([10,10,'体育の日']); }

  fixed.forEach(([m,d,name]) => add(m,d,name));
  add(3, vernal, '春分の日');
  add(9, autumnal, '秋分の日');

  // ハッピーマンデー(year>=2000以降)
  if (year >= 2000) {
    add(1, nthMon(1,2), '成人の日');
    add(7, nthMon(7,3), '海の日');
    if (year >= 2003) add(9, nthMon(9,3), '敬老の日');
    add(10, nthMon(10,2), 'スポーツの日');
  } else {
    add(1,15,'成人の日');
    add(7,20,'海の日');
    if (year >= 1966) add(10,10,'体育の日');
  }

  // 振替休日(土日に当たる祝日の翌月曜日/直後の平日)
  const current = { ...holidays };
  Object.keys(current).sort().forEach(key => {
    const d = parseDate(key);
    const dw = d.getDay();
    if (dw === 0) { // 日曜
      let next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      while (fmtDate(next) in current || next.getDay() === 0) next = new Date(next.getFullYear(), next.getMonth(), next.getDate() + 1);
      add(next.getMonth()+1, next.getDate(), '振替休日');
    }
  });

  // 国民の休日(祝日と祝日の間に挟まれた、間隔1日の平日)
  const keys = Object.keys(holidays).sort();
  for (let i = 0; i < keys.length - 1; i++) {
    const cur = parseDate(keys[i]);
    const next = parseDate(keys[i + 1]);
    const diff = (next - cur) / 86400000;
    if (diff === 2) {
      const between = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
      if (between.getDay() !== 0) {
        add(between.getMonth() + 1, between.getDate(), '国民の休日');
      }
    }
  }

  return holidays;
}

// キャッシュ(同じ年を繰り返し計算しない)
const _holidayCache = {};
function getHolidays(year) {
  if (!_holidayCache[year]) _holidayCache[year] = japaneseHolidays(year);
  return _holidayCache[year];
}

/* ---- アメリカ連邦祝日(法則ベース・完全オフライン) ---- */
function usHolidays(year) {
  const holidays = {};
  const add = (m, d, name) => { holidays[`${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`] = name; };
  const nthWeekday = (m, weekday, n) => {
    const first = new Date(year, m - 1, 1).getDay();
    const offset = (weekday - first + 7) % 7;
    return 1 + offset + (n - 1) * 7;
  };
  const lastWeekday = (m, weekday) => {
    const lastDay = new Date(year, m, 0).getDate();
    const lastDow = new Date(year, m - 1, lastDay).getDay();
    return lastDay - ((lastDow - weekday + 7) % 7);
  };
  add(1, 1, "New Year's Day");
  add(1, nthWeekday(1, 1, 3), 'Martin Luther King Jr. Day');
  add(2, nthWeekday(2, 1, 3), "Washington's Birthday");
  add(5, lastWeekday(5, 1), 'Memorial Day');
  if (year >= 2021) add(6, 19, 'Juneteenth');
  add(7, 4, 'Independence Day');
  add(9, nthWeekday(9, 1, 1), 'Labor Day');
  add(10, nthWeekday(10, 1, 2), 'Columbus Day');
  add(11, 11, 'Veterans Day');
  add(11, nthWeekday(11, 4, 4), 'Thanksgiving Day');
  add(12, 25, 'Christmas Day');
  return holidays;
}

/* ---- イギリス(イングランド/ウェールズ)祝日(法則ベース・完全オフライン) ----
   復活祭(イースター)はGaussの公式(グレゴリオ暦)で計算します。 */
function easterDate(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}
function ukHolidays(year) {
  const holidays = {};
  const add = (date, name) => { holidays[fmtDate(date)] = name; };
  const substituteIfWeekend = (date, name) => {
    let d = date;
    if (d.getDay() === 6) d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 2);
    else if (d.getDay() === 0) d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    add(d, name);
  };
  const nthMonday = (m, n) => {
    const first = new Date(year, m - 1, 1).getDay();
    const offset = (1 - first + 7) % 7;
    return new Date(year, m - 1, 1 + offset + (n - 1) * 7);
  };
  const lastMonday = (m) => {
    const lastDay = new Date(year, m, 0).getDate();
    const lastDow = new Date(year, m - 1, lastDay).getDay();
    return new Date(year, m - 1, lastDay - ((lastDow - 1 + 7) % 7));
  };
  substituteIfWeekend(new Date(year, 0, 1), "New Year's Day");
  const easter = easterDate(year);
  add(new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() - 2), 'Good Friday');
  add(new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() + 1), 'Easter Monday');
  add(nthMonday(5, 1), 'Early May Bank Holiday');
  add(lastMonday(5), 'Spring Bank Holiday');
  add(lastMonday(8), 'Summer Bank Holiday');
  substituteIfWeekend(new Date(year, 11, 25), 'Christmas Day');
  substituteIfWeekend(new Date(year, 11, 26), 'Boxing Day');
  return holidays;
}
const _usHolidayCache = {}, _ukHolidayCache = {};
function getUsHolidays(year) { return _usHolidayCache[year] || (_usHolidayCache[year] = usHolidays(year)); }
function getUkHolidays(year) { return _ukHolidayCache[year] || (_ukHolidayCache[year] = ukHolidays(year)); }

/* ---- 東アジアの旧暦(太陰太陽暦)祝日: 年別日付テーブル ----
   春節(旧正月)・端午節・中秋節は太陰太陽暦、清明節は太陽の黄経に基づく
   「節気」であり、いずれも単純な数式では正確な日付が求められない。
   そのため、暦の専門データ(qppstudio.net等の公開情報)を基に、
   実際の日付を年ごとにテーブル化して対応した(2024年〜2036年の範囲)。
   この範囲外の年は該当の祝日が表示されない(固定祝日のみになる)。
   - 春節(中国)と설날(韓国の旧正月)は同じ太陰太陽暦の1月1日のため、
     同じテーブルを共有している(ごく稀に暦計算の基準の違いで1日ずれる
     年があり得るが、実用上は問題にならない)。
   - 中秋節(中国)と추석(韓国の秋夕)も同様に旧暦8月15日で共通。 */
const LUNAR_NEW_YEAR_DATES = {
  2024: '02-10', 2025: '01-29', 2026: '02-17', 2027: '02-06', 2028: '01-26',
  2029: '02-13', 2030: '02-03', 2031: '01-23', 2032: '02-11', 2033: '01-31',
  2034: '02-19', 2035: '02-08', 2036: '01-28',
};
const QINGMING_DATES = {
  2024: '04-04', 2025: '04-04', 2026: '04-05', 2027: '04-05', 2028: '04-04',
  2029: '04-04', 2030: '04-05', 2031: '04-05', 2032: '04-04', 2033: '04-04',
  2034: '04-05', 2035: '04-05', 2036: '04-04',
};
const DRAGON_BOAT_DATES = {
  2024: '06-10', 2025: '05-31', 2026: '06-19', 2027: '06-09', 2028: '05-28',
  2029: '06-16', 2030: '06-05', 2031: '06-24', 2032: '06-12', 2033: '06-01',
  2034: '06-20', 2035: '06-10', 2036: '05-30',
};
const MID_AUTUMN_DATES = {
  2024: '09-17', 2025: '10-06', 2026: '09-25', 2027: '09-15', 2028: '10-03',
  2029: '09-22', 2030: '09-12', 2031: '10-01', 2032: '09-19', 2033: '09-08',
  2034: '09-27', 2035: '09-16', 2036: '10-04',
};

/* ---- 韓国(法則ベースの固定祝日 + 旧暦祝日の日付テーブル) ---- */
function koreanHolidays(year) {
  const holidays = {};
  const add = (m, d, name) => { holidays[`${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`] = name; };
  add(1, 1, '신정');
  add(3, 1, '삼일절');
  add(5, 5, '어린이날');
  add(6, 6, '현충일');
  add(8, 15, '광복절');
  add(10, 3, '개천절');
  add(10, 9, '한글날');
  add(12, 25, '크리스마스');
  if (LUNAR_NEW_YEAR_DATES[year]) holidays[`${year}-${LUNAR_NEW_YEAR_DATES[year]}`] = '설날';
  if (MID_AUTUMN_DATES[year]) holidays[`${year}-${MID_AUTUMN_DATES[year]}`] = '추석';
  return holidays;
}
const _krHolidayCache = {};
function getKrHolidays(year) { return _krHolidayCache[year] || (_krHolidayCache[year] = koreanHolidays(year)); }

/* ---- ドイツ(全国共通の祝日のみ。州ごとに異なる祝日(宗教改革記念日・聖体祭など)は対象外) ---- */
function germanHolidays(year) {
  const holidays = {};
  const add = (date, name) => { holidays[fmtDate(date)] = name; };
  const easter = easterDate(year);
  const offset = (n) => new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() + n);
  add(new Date(year, 0, 1), 'Neujahr');
  add(offset(-2), 'Karfreitag');
  add(offset(1), 'Ostermontag');
  add(new Date(year, 4, 1), 'Tag der Arbeit');
  add(offset(39), 'Christi Himmelfahrt');
  add(offset(50), 'Pfingstmontag');
  add(new Date(year, 9, 3), 'Tag der Deutschen Einheit');
  add(new Date(year, 11, 25), '1. Weihnachtstag');
  add(new Date(year, 11, 26), '2. Weihnachtstag');
  return holidays;
}

/* ---- フランス(全国共通の祝日のみ) ---- */
function frenchHolidays(year) {
  const holidays = {};
  const add = (date, name) => { holidays[fmtDate(date)] = name; };
  const easter = easterDate(year);
  const offset = (n) => new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() + n);
  add(new Date(year, 0, 1), "Jour de l'An");
  add(offset(1), 'Lundi de Pâques');
  add(new Date(year, 4, 1), 'Fête du Travail');
  add(new Date(year, 4, 8), 'Victoire 1945');
  add(offset(39), 'Ascension');
  add(offset(50), 'Lundi de Pentecôte');
  add(new Date(year, 6, 14), 'Fête nationale');
  add(new Date(year, 7, 15), 'Assomption');
  add(new Date(year, 10, 1), 'Toussaint');
  add(new Date(year, 10, 11), 'Armistice 1918');
  add(new Date(year, 11, 25), 'Noël');
  return holidays;
}

/* ---- イタリア(全国共通の祝日のみ) ---- */
function italianHolidays(year) {
  const holidays = {};
  const add = (date, name) => { holidays[fmtDate(date)] = name; };
  const easter = easterDate(year);
  const offset = (n) => new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() + n);
  add(new Date(year, 0, 1), 'Capodanno');
  add(new Date(year, 0, 6), 'Epifania');
  add(offset(1), 'Pasquetta');
  add(new Date(year, 3, 25), 'Festa della Liberazione');
  add(new Date(year, 4, 1), 'Festa dei Lavoratori');
  add(new Date(year, 5, 2), 'Festa della Repubblica');
  add(new Date(year, 7, 15), 'Ferragosto');
  add(new Date(year, 10, 1), 'Ognissanti');
  add(new Date(year, 11, 8), 'Immacolata Concezione');
  add(new Date(year, 11, 25), 'Natale');
  add(new Date(year, 11, 26), 'Santo Stefano');
  return holidays;
}

/* ---- スペイン(全国共通の祝日のみ。自治州ごとの祝日は対象外) ---- */
function spanishHolidays(year) {
  const holidays = {};
  const add = (date, name) => { holidays[fmtDate(date)] = name; };
  const easter = easterDate(year);
  const offset = (n) => new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() + n);
  add(new Date(year, 0, 1), 'Año Nuevo');
  add(new Date(year, 0, 6), 'Epifanía del Señor');
  add(offset(-2), 'Viernes Santo');
  add(new Date(year, 4, 1), 'Fiesta del Trabajo');
  add(new Date(year, 7, 15), 'Asunción de la Virgen');
  add(new Date(year, 9, 12), 'Fiesta Nacional de España');
  add(new Date(year, 10, 1), 'Todos los Santos');
  add(new Date(year, 11, 6), 'Día de la Constitución');
  add(new Date(year, 11, 8), 'Inmaculada Concepción');
  add(new Date(year, 11, 25), 'Navidad');
  return holidays;
}

/* ---- カナダ(連邦の祝日) ---- */
function canadianHolidays(year) {
  const holidays = {};
  const add = (date, name) => { holidays[fmtDate(date)] = name; };
  const easter = easterDate(year);
  const nthWeekday = (m, weekday, n) => {
    const first = new Date(year, m - 1, 1).getDay();
    const offset = (weekday - first + 7) % 7;
    return new Date(year, m - 1, 1 + offset + (n - 1) * 7);
  };
  // ビクトリアデー: 5月25日の直前の月曜日(5月25日が月曜ならその日)
  const victoriaDay = () => {
    const d = new Date(year, 4, 24);
    const diff = (d.getDay() - 1 + 7) % 7;
    return new Date(year, 4, 24 - diff);
  };
  add(new Date(year, 0, 1), "New Year's Day");
  add(new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() - 2), 'Good Friday');
  add(victoriaDay(), 'Victoria Day');
  add(new Date(year, 6, 1), 'Canada Day');
  add(nthWeekday(9, 1, 1), 'Labour Day');
  add(nthWeekday(10, 1, 2), 'Thanksgiving');
  add(new Date(year, 10, 11), 'Remembrance Day');
  add(new Date(year, 11, 25), 'Christmas Day');
  add(new Date(year, 11, 26), 'Boxing Day');
  return holidays;
}

/* ---- オーストラリア(全国共通の祝日のみ。州ごとの祝日(レイバーデー等)は対象外) ---- */
function australianHolidays(year) {
  const holidays = {};
  const add = (date, name) => { holidays[fmtDate(date)] = name; };
  const easter = easterDate(year);
  const offset = (n) => new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() + n);
  add(new Date(year, 0, 1), "New Year's Day");
  add(new Date(year, 0, 26), 'Australia Day');
  add(offset(-2), 'Good Friday');
  add(offset(1), 'Easter Monday');
  add(new Date(year, 3, 25), 'Anzac Day');
  add(new Date(year, 11, 25), 'Christmas Day');
  add(new Date(year, 11, 26), 'Boxing Day');
  return holidays;
}

/* ---- 中国・台湾(法則ベースの固定祝日 + 旧暦祝日の日付テーブル) ----
   春節(旧正月)・清明節・端午節・中秋節は、上記の日付テーブル
   (LUNAR_NEW_YEAR_DATES等、2024〜2036年)に基づいて追加している。
   この範囲外の年は該当の祝日が表示されない(固定祝日のみになる)。 */
function chineseHolidays(year) {
  const holidays = {};
  const add = (m, d, name) => { holidays[`${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`] = name; };
  add(1, 1, '元旦');
  add(5, 1, '劳动节');
  add(10, 1, '国庆节');
  if (LUNAR_NEW_YEAR_DATES[year]) holidays[`${year}-${LUNAR_NEW_YEAR_DATES[year]}`] = '春节';
  if (QINGMING_DATES[year]) holidays[`${year}-${QINGMING_DATES[year]}`] = '清明节';
  if (DRAGON_BOAT_DATES[year]) holidays[`${year}-${DRAGON_BOAT_DATES[year]}`] = '端午节';
  if (MID_AUTUMN_DATES[year]) holidays[`${year}-${MID_AUTUMN_DATES[year]}`] = '中秋节';
  return holidays;
}
function taiwanHolidays(year) {
  const holidays = {};
  const add = (m, d, name) => { holidays[`${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`] = name; };
  add(1, 1, '元旦');
  add(2, 28, '和平紀念日');
  add(5, 1, '勞動節');
  add(10, 10, '國慶日');
  if (LUNAR_NEW_YEAR_DATES[year]) holidays[`${year}-${LUNAR_NEW_YEAR_DATES[year]}`] = '春節';
  if (QINGMING_DATES[year]) holidays[`${year}-${QINGMING_DATES[year]}`] = '清明節';
  if (DRAGON_BOAT_DATES[year]) holidays[`${year}-${DRAGON_BOAT_DATES[year]}`] = '端午節';
  if (MID_AUTUMN_DATES[year]) holidays[`${year}-${MID_AUTUMN_DATES[year]}`] = '中秋節';
  return holidays;
}

const _deHolidayCache = {}, _frHolidayCache = {}, _itHolidayCache = {}, _esHolidayCache = {}, _caHolidayCache = {}, _auHolidayCache = {}, _cnHolidayCache = {}, _twHolidayCache = {};
function getDeHolidays(year) { return _deHolidayCache[year] || (_deHolidayCache[year] = germanHolidays(year)); }
function getFrHolidays(year) { return _frHolidayCache[year] || (_frHolidayCache[year] = frenchHolidays(year)); }
function getItHolidays(year) { return _itHolidayCache[year] || (_itHolidayCache[year] = italianHolidays(year)); }
function getEsHolidays(year) { return _esHolidayCache[year] || (_esHolidayCache[year] = spanishHolidays(year)); }
function getCaHolidays(year) { return _caHolidayCache[year] || (_caHolidayCache[year] = canadianHolidays(year)); }
function getAuHolidays(year) { return _auHolidayCache[year] || (_auHolidayCache[year] = australianHolidays(year)); }
function getCnHolidays(year) { return _cnHolidayCache[year] || (_cnHolidayCache[year] = chineseHolidays(year)); }
function getTwHolidays(year) { return _twHolidayCache[year] || (_twHolidayCache[year] = taiwanHolidays(year)); }

function getHolidayNameForRegion(dateStr, region) {
  const [y] = dateStr.split('-').map(Number);
  if (region === 'us') return getUsHolidays(y)[dateStr] || '';
  if (region === 'uk') return getUkHolidays(y)[dateStr] || '';
  if (region === 'kr') return getKrHolidays(y)[dateStr] || '';
  if (region === 'jp') return getHolidays(y)[dateStr] || '';
  if (region === 'de') return getDeHolidays(y)[dateStr] || '';
  if (region === 'fr') return getFrHolidays(y)[dateStr] || '';
  if (region === 'it') return getItHolidays(y)[dateStr] || '';
  if (region === 'es') return getEsHolidays(y)[dateStr] || '';
  if (region === 'ca') return getCaHolidays(y)[dateStr] || '';
  if (region === 'au') return getAuHolidays(y)[dateStr] || '';
  if (region === 'cn') return getCnHolidays(y)[dateStr] || '';
  if (region === 'tw') return getTwHolidays(y)[dateStr] || '';
  return '';
}

function getHolidayName(dateStr) {
  const [y] = dateStr.split('-').map(Number);
  return getHolidays(y)[dateStr] || '';
}

function buildWeeks(monthDate) {
  const y = monthDate.getFullYear(), m = monthDate.getMonth();
  const first = new Date(y, m, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function formatEventTime(e, countryCode, lang) {
  if (!e.time) return '';
  const start = formatTimeForCountry(e.time, countryCode, lang);
  return e.endTime ? `${start}-${formatTimeForCountry(e.endTime, countryCode, lang)}` : start;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function getSetting(key, def) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const req = d.transaction('settings', 'readonly').objectStore('settings').get(key);
    req.onsuccess = () => resolve(req.result ? req.result.value : def);
    req.onerror = () => reject(req.error);
  });
}
async function setSetting(key, value) { return storePut('settings', { key, value }); }

function dateRangeArray(startDate, endDate) {
  const out = [];
  let d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  while (d <= endDate) { out.push(d); d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); }
  return out;
}
function chunkByWeek(dates, weekStart) {
  weekStart = weekStart || 0;
  const chunks = [];
  let cur = [];
  dates.forEach(d => {
    if (d.getDay() === weekStart && cur.length) { chunks.push(cur); cur = []; }
    cur.push(d);
  });
  if (cur.length) chunks.push(cur);
  return chunks;
}
function chunkByWeekWithMonthBreak(dates, weekStart) {
  weekStart = weekStart || 0;
  const chunks = [];
  let cur = [];
  let prevDate = null;
  dates.forEach(d => {
    const newWeek = d.getDay() === weekStart && cur.length;
    const newMonth = prevDate && d.getMonth() !== prevDate.getMonth();
    if ((newWeek || newMonth) && cur.length) { chunks.push(cur); cur = []; }
    cur.push(d);
    prevDate = d;
  });
  if (cur.length) chunks.push(cur);
  return chunks;
}
function reorderForWeekStart(arr, weekStart) {
  return weekStart === 1 ? [...arr.slice(1), arr[0]] : arr;
}
function gridColumnFor(date, weekStart) {
  return ((date.getDay() - (weekStart || 0) + 7) % 7) + 1;
}

const ICON_CATEGORIES = [
  { key: 'basic', label: '基本' },
  { key: 'school', label: '学校・勉強' },
  { key: 'transport', label: '移動' },
  { key: 'hobby', label: '趣味・音楽' },
  { key: 'sports', label: 'スポーツ・健康' },
  { key: 'work', label: '仕事' },
  { key: 'life', label: '生活' },
  { key: 'food', label: '食事・お出かけ' },
  { key: 'event', label: 'イベント' },
  { key: 'culture', label: '文化・お国柄' },
  { key: 'other', label: 'その他' },
];

const ICON_LIST = [
  { key: 'none', label: 'なし', emoji: '', category: 'basic' },
  { key: 'star', label: '星', emoji: '⭐', category: 'basic' },
  { key: 'heart', label: 'お気に入り', emoji: '❤️', category: 'basic' },
  { key: 'check', label: '完了', emoji: '✅', category: 'basic' },
  { key: 'warning', label: '注意', emoji: '⚠️', category: 'basic' },

  { key: 'school', label: '学校', emoji: '🏫', category: 'school' },
  { key: 'study', label: '勉強', emoji: '📚', category: 'school' },
  { key: 'test', label: 'テスト', emoji: '📝', category: 'school' },
  { key: 'homework', label: '宿題', emoji: '✏️', category: 'school' },
  { key: 'english', label: '英語', emoji: '🔤', category: 'school' },
  { key: 'reading', label: '読書', emoji: '📖', category: 'school' },
  { key: 'pc', label: 'パソコン', emoji: '💻', category: 'school' },

  { key: 'train', label: '電車', emoji: '🚃', category: 'transport' },
  { key: 'bus', label: 'バス', emoji: '🚌', category: 'transport' },
  { key: 'walk', label: '徒歩', emoji: '🚶', category: 'transport' },
  { key: 'bicycle', label: '自転車', emoji: '🚲', category: 'transport' },
  { key: 'travel', label: '旅行', emoji: '✈️', category: 'transport' },

  { key: 'music', label: '音楽', emoji: '🎵', category: 'hobby' },
  { key: 'piano', label: 'ピアノ', emoji: '🎹', category: 'hobby' },
  { key: 'guitar', label: 'ギター', emoji: '🎸', category: 'hobby' },
  { key: 'camera', label: 'カメラ', emoji: '📷', category: 'hobby' },
  { key: 'art', label: 'アート', emoji: '🎨', category: 'hobby' },
  { key: 'museum', label: '美術館', emoji: '🏛️', category: 'hobby' },
  { key: 'concert', label: 'コンサート', emoji: '🎤', category: 'hobby' },
  { key: 'game', label: 'ゲーム', emoji: '🎮', category: 'hobby' },
  { key: 'dog', label: '犬', emoji: '🐶', category: 'hobby' },
  { key: 'cat', label: '猫', emoji: '🐱', category: 'hobby' },

  { key: 'ballet', label: 'バレエ', emoji: '🩰', category: 'sports' },
  { key: 'sports', label: 'スポーツ', emoji: '⚽', category: 'sports' },
  { key: 'workout', label: '筋トレ', emoji: '💪', category: 'sports' },
  { key: 'bed', label: '休息・ベッド', emoji: '🛏️', category: 'sports' },
  { key: 'hospital', label: '通院', emoji: '🏥', category: 'sports' },
  { key: 'medicine', label: '薬', emoji: '💊', category: 'sports' },

  { key: 'work', label: '仕事', emoji: '💼', category: 'work' },
  { key: 'meeting', label: '会議', emoji: '🗓️', category: 'work' },
  { key: 'company', label: '会社', emoji: '🏢', category: 'work' },
  { key: 'building', label: 'ビル', emoji: '🏙️', category: 'work' },
  { key: 'money', label: 'お金', emoji: '💰', category: 'work' },
  { key: 'payday', label: '給料日', emoji: '💴', category: 'work' },
  { key: 'holiday', label: '休日', emoji: '🌴', category: 'work' },

  { key: 'home', label: '家', emoji: '🏠', category: 'life' },
  { key: 'laundry', label: '洗濯', emoji: '🧺', category: 'life' },
  { key: 'cleaning', label: '掃除', emoji: '🧹', category: 'life' },
  { key: 'trash', label: 'ゴミの日', emoji: '🗑️', category: 'life' },

  { key: 'food', label: '食事', emoji: '🍽️', category: 'food' },
  { key: 'restaurant', label: 'レストラン', emoji: '🍴', category: 'food' },
  { key: 'date', label: 'デート', emoji: '💑', category: 'food' },
  { key: 'friends', label: '友達', emoji: '👥', category: 'food' },
  { key: 'banana', label: 'バナナ', emoji: '🍌', category: 'food' },
  { key: 'apple', label: 'りんご', emoji: '🍎', category: 'food' },

  { key: 'birthday', label: '誕生日', emoji: '🎂', category: 'event' },
  { key: 'newyear', label: '正月', emoji: '🎍', category: 'event' },
  { key: 'christmas', label: 'クリスマス', emoji: '🎄', category: 'event' },
  { key: 'halloween', label: 'ハロウィン', emoji: '🎃', category: 'event' },

  { key: 'smile', label: '笑顔', emoji: '😊', category: 'other' },
  { key: 'moon', label: '月', emoji: '🌙', category: 'other' },
  { key: 'calendar', label: 'カレンダー', emoji: '📅', category: 'other' },

  { key: 'sakura', label: '桜', emoji: '🌸', category: 'culture' },
  { key: 'sushi', label: '寿司', emoji: '🍣', category: 'culture' },
  { key: 'onsen', label: '温泉', emoji: '♨️', category: 'culture' },
  { key: 'turkey', label: '七面鳥', emoji: '🦃', category: 'culture' },
  { key: 'fireworks', label: '花火', emoji: '🎆', category: 'culture' },
  { key: 'tea', label: 'ティータイム', emoji: '☕', category: 'culture' },
  { key: 'oktoberfest', label: 'ビール', emoji: '🍺', category: 'culture' },
  { key: 'pretzel', label: 'プレッツェル', emoji: '🥨', category: 'culture' },
  { key: 'croissant', label: 'クロワッサン', emoji: '🥐', category: 'culture' },
  { key: 'wine', label: 'ワイン', emoji: '🍷', category: 'culture' },
  { key: 'pizza', label: 'ピザ', emoji: '🍕', category: 'culture' },
  { key: 'pasta', label: 'パスタ', emoji: '🍝', category: 'culture' },
  { key: 'flamenco', label: 'フラメンコ', emoji: '💃', category: 'culture' },
  { key: 'paella', label: 'パエリア', emoji: '🥘', category: 'culture' },
  { key: 'mapleleaf', label: 'メープルリーフ', emoji: '🍁', category: 'culture' },
  { key: 'icehockey', label: 'アイスホッケー', emoji: '🏒', category: 'culture' },
  { key: 'kangaroo', label: 'カンガルー', emoji: '🦘', category: 'culture' },
  { key: 'bbq', label: 'BBQ', emoji: '🍖', category: 'culture' },
  { key: 'surfing', label: 'サーフィン', emoji: '🏄', category: 'culture' },
  { key: 'taekwondo', label: 'テコンドー', emoji: '🥋', category: 'culture' },
  { key: 'kimchi', label: 'キムチ鍋', emoji: '🍲', category: 'culture' },
  { key: 'redenvelope', label: 'お年玉袋', emoji: '🧧', category: 'culture' },
  { key: 'dragon', label: '龍', emoji: '🐉', category: 'culture' },
  { key: 'dumpling', label: '餃子', emoji: '🥟', category: 'culture' },
  { key: 'lantern', label: '提灯', emoji: '🏮', category: 'culture' },
  { key: 'bubbletea', label: 'タピオカ', emoji: '🧋', category: 'culture' },
];

/* ---------------- Shared "view range" handoff between pages ---------------- */
function saveViewRange(viewStart, spanMonths) {
  localStorage.setItem('sp_view_start', fmtDate(viewStart));
  localStorage.setItem('sp_span_months', String(spanMonths));
}
function loadViewRange() {
  const s = localStorage.getItem('sp_view_start');
  const n = Number(localStorage.getItem('sp_span_months'));
  return {
    viewStart: s ? startOfMonth(parseDate(s)) : startOfMonth(new Date()),
    spanMonths: n && n >= 1 && n <= 12 ? n : 2,
  };
}
