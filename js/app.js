/* ============================================================
   すたぷり (study print) — エディタ画面ロジック
   IndexedDBまわりと日付ユーティリティは shared.js を参照してください。
   ============================================================ */

const state = {
  viewStart: startOfMonth(new Date()),
  spanMonths: 2,
  selectedDate: null,
  bulkDates: null, // 複数日ドラッグで選択中の日付配列(bulk-add モード時)
};

// 現在の表示言語・祝日国(それぞれ独立して切り替え可能)
let CURRENT_LANG = 'ja';
let CURRENT_HOLIDAY_REGION = 'jp';

function populateMonthSelect() {
  const sel = document.getElementById('spanMonths');
  sel.innerHTML = '';
  for (let n = 1; n <= 12; n++) {
    const opt = document.createElement('option');
    opt.value = String(n);
    opt.textContent = `${n}${t('nav.spanMonths.unit', 'ヶ月')}`;
    if (n === state.spanMonths) opt.selected = true;
    sel.appendChild(opt);
  }
}

async function onHolidayCountryChange(code) {
  CURRENT_HOLIDAY_REGION = code;
  await setHolidayCountry(code);
  render();
}

function setupHolidayCountrySelect(currentCode) {
  const sel = document.getElementById('holidayCountrySelect');
  populateHolidayCountrySelect(sel, currentCode, onHolidayCountryChange);
}

function setupLangSelect(currentCode) {
  const sel = document.getElementById('uiLangSelect');
  populateUiLangSelect(sel, currentCode, async (code) => {
    CURRENT_LANG = code;
    await setUiLang(code);
    await loadI18n(CURRENT_LANG);
    populateMonthSelect();
    populateIconPicker();
    // 祝日国セレクトの選択肢テキスト(国名)も表示言語に合わせて翻訳し直す
    populateHolidayCountrySelect(document.getElementById('holidayCountrySelect'), CURRENT_HOLIDAY_REGION, onHolidayCountryChange);
    render();
  });
}

async function boot() {
  await loadAll();
  const { uiLang, holidayCountry } = await getUiSettings();
  CURRENT_LANG = uiLang;
  CURRENT_HOLIDAY_REGION = holidayCountry;
  await loadI18n(CURRENT_LANG);
  setupLangSelect(uiLang);
  setupHolidayCountrySelect(holidayCountry);
  populateMonthSelect();
  populateIconPicker();
  render();
  bindGlobalUI();
}

/* ---------------- Rendering: editor calendar ---------------- */
function render() {
  const root = document.getElementById('calendarRoot');
  root.innerHTML = '';
  const label = document.getElementById('monthRangeLabel');
  const endMonth = addMonths(state.viewStart, state.spanMonths - 1);
  const sep = RANGE_SEPARATORS[CURRENT_LANG] || RANGE_SEPARATORS.ja;
  label.textContent = `${yearMonthLabel(state.viewStart.getFullYear(), state.viewStart.getMonth(), CURRENT_LANG)} ${sep} ${yearMonthLabel(endMonth.getFullYear(), endMonth.getMonth(), CURRENT_LANG)}`;

  for (let i = 0; i < state.spanMonths; i++) {
    root.appendChild(renderMonthBlock(addMonths(state.viewStart, i)));
  }
}

function renderMonthBlock(monthDate) {
  const block = document.createElement('div');
  block.className = 'month-block';
  const title = document.createElement('h2');
  title.className = 'month-title';
  title.textContent = yearMonthLabel(monthDate.getFullYear(), monthDate.getMonth(), CURRENT_LANG);
  block.appendChild(title);

  const weekdayRow = document.createElement('div');
  weekdayRow.className = 'weekday-row';
  weekdayLabels(CURRENT_LANG).forEach(w => {
    const c = document.createElement('div');
    c.className = 'weekday-cell';
    c.textContent = w;
    weekdayRow.appendChild(c);
  });
  block.appendChild(weekdayRow);

  const grid = document.createElement('div');
  grid.className = 'month-grid';
  buildWeeks(monthDate).forEach(week => {
    week.forEach(date => grid.appendChild(renderDayCell(date)));
  });
  block.appendChild(grid);

  return block;
}

function renderDayCell(date) {
  const cell = document.createElement('div');
  if (!date) { cell.className = 'day-cell empty'; return cell; }
  const ds = fmtDate(date);
  cell.dataset.date = ds;
  const evs = eventsOn(ds);
  const lvl = maxLevelOn(ds);
  const isToday = ds === fmtDate(new Date());
  cell.className = 'day-cell' + (evs.length ? ' has-events' : '') + (lvl ? ` level-${lvl}` : '') + (isToday ? ' is-today' : '');

  const num = document.createElement('div');
  num.className = 'date-num';
  num.textContent = date.getDate();
  const holidayName = getHolidayNameForRegion(ds, CURRENT_HOLIDAY_REGION);
  const isSun = date.getDay() === 0;
  const isSat = date.getDay() === 6;
  if ((isSun || holidayName) && !lvl) num.style.color = '#c8443c';
  else if (isSat && !lvl) num.style.color = '#3a6fa8';
  cell.appendChild(num);
  if (holidayName) {
    const hdChip = document.createElement('div');
    hdChip.className = 'ev-chip';
    hdChip.textContent = '🎊 ' + holidayName;
    hdChip.style.color = '#c8443c';
    cell.appendChild(hdChip);
  }

  evs.slice(0, 3).forEach(e => {
    const chip = document.createElement('div');
    chip.className = 'ev-chip' + (e.level ? ' important' : '');
    const label = document.createElement('span');
    label.textContent = (e.icon ? e.icon + ' ' : '') + (formatEventTime(e, CURRENT_HOLIDAY_REGION, CURRENT_LANG) ? formatEventTime(e, CURRENT_HOLIDAY_REGION, CURRENT_LANG) + ' ' : '') + e.title + (e.comment ? ' ・' + e.comment : '');
    chip.appendChild(label);
    chip.draggable = true;
    chip.dataset.eventId = e.id;
    chip.title = t('app.moveHandle.title', 'ドラッグで日付を移動 / Optionキーを押しながらドラッグでコピー');
    chip.addEventListener('dragstart', (ev) => {
      ev.stopPropagation();
      ev.dataTransfer.setData('text/plain', String(e.id));
      ev.dataTransfer.effectAllowed = 'copyMove';
    });
    chip.addEventListener('click', (ev) => { ev.stopPropagation(); openDayModal(ds); });

    // モバイル向け:掴んで移動する代わりに「移動ハンドル」をタップ→移動先の日をタップ、という2ステップ方式
    const handle = document.createElement('span');
    handle.className = 'move-handle';
    handle.textContent = '⠿';
    handle.setAttribute('aria-label', t('app.moveHandle.aria', '移動/コピー'));
    handle.addEventListener('click', (ev) => {
      ev.stopPropagation();
      startPendingMove(e.id, e.title);
    });
    chip.appendChild(handle);

    cell.appendChild(chip);
  });
  if (evs.length > 3) {
    const more = document.createElement('div');
    more.className = 'ev-chip';
    more.textContent = t('app.eventMore', '+{n}件').replace('{n}', evs.length - 3);
    more.addEventListener('click', (ev) => { ev.stopPropagation(); openDayModal(ds); });
    cell.appendChild(more);
  }

  // ---- drop target (move / alt-copy an event onto this day) ----
  cell.addEventListener('dragover', (ev) => {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = ev.altKey ? 'copy' : 'move';
    cell.classList.add('drop-hover');
  });
  cell.addEventListener('dragleave', () => cell.classList.remove('drop-hover'));
  cell.addEventListener('drop', async (ev) => {
    ev.preventDefault();
    cell.classList.remove('drop-hover');
    const id = Number(ev.dataTransfer.getData('text/plain'));
    const source = Store.events.find(e2 => e2.id === id);
    if (!source) return;
    if (ev.altKey) {
      const copy = { ...source, date: ds };
      delete copy.id;
      await storePut('events', copy);
    } else {
      await storePut('events', { ...source, date: ds });
    }
    await loadAll();
    render();
  });

  // ---- click vs multi-day range-drag select vs pending mobile move ----
  cell.addEventListener('mousedown', (ev) => {
    if (ev.target.closest('.ev-chip')) return; // let native drag handle chips
    if (pendingMoveId != null) { completePendingMove(ds); return; }
    beginRangeSelect(ds);
  });
  cell.addEventListener('mouseenter', () => updateRangeSelect(ds));

  return cell;
}

/* ---------------- Mobile-friendly move/copy (tap handle, then tap destination) ---------------- */
let pendingMoveId = null;

function startPendingMove(eventId, title) {
  pendingMoveId = eventId;
  document.getElementById('moveBannerText').textContent =
    t('app.moveBanner.text', '{title} を移動 — 移動先の日付をタップしてください').replace('{title}', title);
  document.getElementById('moveAsCopy').checked = false;
  document.getElementById('moveBanner').hidden = false;
}
async function completePendingMove(dateStr) {
  const source = Store.events.find(e => e.id === pendingMoveId);
  pendingMoveId = null;
  document.getElementById('moveBanner').hidden = true;
  if (!source) return;
  const asCopy = document.getElementById('moveAsCopy').checked;
  if (asCopy) {
    const copy = { ...source, date: dateStr };
    delete copy.id;
    await storePut('events', copy);
  } else {
    await storePut('events', { ...source, date: dateStr });
  }
  await loadAll();
  render();
}
function cancelPendingMove() {
  pendingMoveId = null;
  document.getElementById('moveBanner').hidden = true;
}

/* ---------------- Multi-day range select (bulk add) ---------------- */
let rangeSelecting = false;
let rangeStartDate = null;
let rangeEndDate = null;

function beginRangeSelect(dateStr) {
  rangeSelecting = true;
  rangeStartDate = dateStr;
  rangeEndDate = dateStr;
  paintRangeHighlight();
}
function updateRangeSelect(dateStr) {
  if (!rangeSelecting) return;
  rangeEndDate = dateStr;
  paintRangeHighlight();
}
function paintRangeHighlight() {
  const [lo, hi] = [rangeStartDate, rangeEndDate].sort();
  document.querySelectorAll('.day-cell[data-date]').forEach(cell => {
    const d = cell.dataset.date;
    cell.classList.toggle('range-hover', rangeSelecting && d >= lo && d <= hi);
  });
}
document.addEventListener('mouseup', () => {
  if (!rangeSelecting) return;
  rangeSelecting = false;
  const [lo, hi] = [rangeStartDate, rangeEndDate].sort();
  const dates = datesBetween(lo, hi);
  document.querySelectorAll('.range-hover').forEach(c => c.classList.remove('range-hover'));
  if (dates.length <= 1) {
    openDayModal(dates[0] || lo);
  } else {
    openBulkModal(dates);
  }
});
function datesBetween(loStr, hiStr) {
  const out = [];
  let d = parseDate(loStr);
  const end = parseDate(hiStr);
  while (d <= end) { out.push(fmtDate(d)); d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); }
  return out;
}

/* ---------------- Day modal (single day) ---------------- */
let currentImportanceLevel = 0;
let currentIcon = '';
let editingEventId = null;

function openDayModal(dateStr) {
  state.selectedDate = dateStr;
  state.bulkDates = null;
  editingEventId = null;
  const d = parseDate(dateStr);
  document.getElementById('dayModalDate').textContent = `${formatFullDate(d, CURRENT_LANG)} (${weekdayLabels(CURRENT_LANG)[d.getDay()]})`;
  document.getElementById('bulkNotice').hidden = true;
  document.getElementById('eventListSection').hidden = false;
  renderEventList(dateStr);
  document.getElementById('eventForm').reset();
  currentImportanceLevel = 0;
  currentIcon = '';
  currentIconCategory = 'basic';
  updateImportanceChips();
  renderIconPickerItems();
  document.getElementById('eventSubmitBtn').textContent = t('form.submit.add', 'この日に追加');
  document.getElementById('dayModal').hidden = false;
}

function openBulkModal(dates) {
  state.bulkDates = dates;
  state.selectedDate = null;
  editingEventId = null;
  document.getElementById('dayModalDate').textContent = t('app.bulkNotice.title', '{n}日分をまとめて追加').replace('{n}', dates.length);
  const notice = document.getElementById('bulkNotice');
  notice.hidden = false;
  notice.textContent = t('app.bulkNotice.body', '{start} 〜 {end}({n}日間)に同じ予定を一括で追加します。')
    .replace('{start}', dates[0]).replace('{end}', dates[dates.length - 1]).replace('{n}', dates.length);
  document.getElementById('eventListSection').hidden = true;
  document.getElementById('eventForm').reset();
  currentImportanceLevel = 0;
  currentIcon = '';
  currentIconCategory = 'basic';
  updateImportanceChips();
  renderIconPickerItems();
  document.getElementById('eventSubmitBtn').textContent = t('form.submit.bulk', 'まとめて追加');
  document.getElementById('dayModal').hidden = false;
}

function renderEventList(dateStr) {
  const list = document.getElementById('eventList');
  list.innerHTML = '';
  eventsOn(dateStr).forEach(e => {
    const row = document.createElement('div');
    row.className = 'event-item';
    row.innerHTML = `<span>${e.icon ? e.icon + ' ' : ''}${formatEventTime(e, CURRENT_HOLIDAY_REGION, CURRENT_LANG) ? formatEventTime(e, CURRENT_HOLIDAY_REGION, CURRENT_LANG) + ' ' : ''}<strong>${escapeHtml(e.title)}</strong>${e.comment ? ' — ' + escapeHtml(e.comment) : ''}</span>`;
    const edit = document.createElement('button');
    edit.className = 'ev-edit';
    edit.textContent = t('app.eventEdit', '編集');
    edit.onclick = () => startEditEvent(e);
    const del = document.createElement('button');
    del.className = 'ev-del';
    del.textContent = t('app.eventDelete', '削除');
    del.onclick = async () => { await storeDelete('events', e.id); await loadAll(); renderEventList(dateStr); render(); };
    row.appendChild(edit);
    row.appendChild(del);
    list.appendChild(row);
  });
}

function startEditEvent(e) {
  editingEventId = e.id;
  document.getElementById('evTime').value = e.time || '';
  document.getElementById('evEndTime').value = e.endTime || '';
  document.getElementById('evTitle').value = e.title || '';
  document.getElementById('evComment').value = e.comment || '';
  currentImportanceLevel = e.level || 0;
  currentIcon = e.icon || '';
  const matchedIcon = ICON_LIST.find(ic => ic.emoji === currentIcon);
  currentIconCategory = matchedIcon ? matchedIcon.category : 'basic';
  updateImportanceChips();
  renderIconPickerItems();
  document.getElementById('eventSubmitBtn').textContent = t('form.submit.save', '変更を保存');
  document.getElementById('evTitle').focus();
}

function updateImportanceChips() {
  document.querySelectorAll('#importanceChips .chip').forEach(chip => {
    chip.classList.toggle('active', Number(chip.dataset.level) === currentImportanceLevel);
  });
}

let currentIconCategory = 'basic';

function populateIconPicker() {
  const tabs = document.getElementById('iconCategoryTabs');
  tabs.innerHTML = '';
  ICON_CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'icon-cat-tab';
    btn.textContent = t(`iconCat.${cat.key}`, cat.label);
    btn.dataset.cat = cat.key;
    btn.onclick = () => { currentIconCategory = cat.key; renderIconPickerItems(); };
    tabs.appendChild(btn);
  });
  renderIconPickerItems();
}

function renderIconPickerItems() {
  const picker = document.getElementById('iconPicker');
  picker.innerHTML = '';
  document.querySelectorAll('.icon-cat-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.cat === currentIconCategory);
  });
  ICON_LIST.filter(icon => icon.category === currentIconCategory).forEach(icon => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.dataset.icon = icon.emoji;
    btn.title = t(`icon.${icon.key}`, icon.label);
    btn.textContent = icon.emoji || t(`icon.${icon.key}`, icon.label);
    btn.onclick = () => { currentIcon = icon.emoji; updateIconPicker(); };
    picker.appendChild(btn);
  });
  updateIconPicker();
}
function updateIconPicker() {
  document.querySelectorAll('#iconPicker .chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.icon === currentIcon);
  });
}

/* ---------------- ICS parsing ---------------- */
function parseICS(text) {
  const events = [];
  const blocks = text.split('BEGIN:VEVENT').slice(1);
  blocks.forEach(block => {
    const body = block.split('END:VEVENT')[0];
    const get = (key) => {
      const m = body.match(new RegExp(key + '(;[^:]*)?:(.+)'));
      return m ? m[2].trim() : '';
    };
    let dtstart = get('DTSTART');
    const summary = get('SUMMARY').replace(/\\,/g, ',');
    const desc = get('DESCRIPTION').replace(/\\n/gi, ' ').replace(/\\,/g, ',');
    if (!dtstart) return;
    let date, time = '';
    if (/^\d{8}$/.test(dtstart)) {
      date = `${dtstart.slice(0, 4)}-${dtstart.slice(4, 6)}-${dtstart.slice(6, 8)}`;
    } else if (/^\d{8}T\d{6}/.test(dtstart)) {
      date = `${dtstart.slice(0, 4)}-${dtstart.slice(4, 6)}-${dtstart.slice(6, 8)}`;
      time = `${dtstart.slice(9, 11)}:${dtstart.slice(11, 13)}`;
    } else return;
    events.push({ date, time, title: summary || '(無題の予定)', comment: desc, level: 0 });
  });
  return events;
}

/* ---------------- CSV parsing (Google Calendar format) ---------------- */
function parseCSVLine(line) {
  const out = []; let cur = ''; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else cur += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length);
  if (!lines.length) return [];
  const headers = parseCSVLine(lines[0]).map(h => h.trim());
  const idx = (name) => headers.indexOf(name);
  const events = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const subject = cols[idx('Subject')] || '(無題の予定)';
    const startDate = cols[idx('Start Date')];
    const startTime = cols[idx('Start Time')] || '';
    const desc = cols[idx('Description')] || '';
    if (!startDate) continue;
    const [m, d, y] = startDate.includes('/') ? startDate.split('/') : [null, null, null];
    let date;
    if (y) date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    else if (/^\d{4}-\d{2}-\d{2}/.test(startDate)) date = startDate.slice(0, 10);
    else continue;
    let time = '';
    if (startTime) {
      const t = startTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (t) {
        let hh = Number(t[1]);
        if (t[3] && /PM/i.test(t[3]) && hh < 12) hh += 12;
        if (t[3] && /AM/i.test(t[3]) && hh === 12) hh = 0;
        time = `${String(hh).padStart(2, '0')}:${t[2]}`;
      }
    }
    events.push({ date, time, title: subject, comment: desc, level: 0 });
  }
  return events;
}

/* ---------------- Export ICS / CSV ---------------- */
function toICS(events) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//studyprint//JA'];
  events.forEach(e => {
    const dt = e.date.replace(/-/g, '') + (e.time ? 'T' + e.time.replace(':', '') + '00' : '');
    lines.push('BEGIN:VEVENT');
    lines.push(`DTSTART${e.time ? '' : ';VALUE=DATE'}:${dt}`);
    lines.push(`SUMMARY:${(e.title || '').replace(/,/g, '\\,')}`);
    if (e.comment) lines.push(`DESCRIPTION:${e.comment.replace(/,/g, '\\,')}`);
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
function toCSV(events) {
  const rows = [['Subject', 'Start Date', 'Start Time', 'End Date', 'End Time', 'All Day Event', 'Description']];
  events.forEach(e => {
    const [y, m, d] = e.date.split('-');
    const usDate = `${m}/${d}/${y}`;
    rows.push([e.title, usDate, e.time || '', usDate, e.time || '', e.time ? 'False' : 'True', e.comment || '']);
  });
  return rows.map(r => r.map(f => `"${String(f).replace(/"/g, '""')}"`).join(',')).join('\r\n');
}
function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/* ---------------- Global UI bindings ---------------- */
function bindGlobalUI() {
  document.getElementById('todayBtn').onclick = () => { state.viewStart = startOfMonth(new Date()); render(); };
  document.getElementById('moveCancel').onclick = cancelPendingMove;
  document.getElementById('prevMonth').onclick = () => { state.viewStart = addMonths(state.viewStart, -1); render(); };
  document.getElementById('nextMonth').onclick = () => { state.viewStart = addMonths(state.viewStart, 1); render(); };
  document.getElementById('spanMonths').onchange = (e) => { state.spanMonths = Number(e.target.value); render(); };

  document.getElementById('openMenu').onclick = () => document.getElementById('sideMenu').hidden = false;
  document.getElementById('closeMenu').onclick = () => document.getElementById('sideMenu').hidden = true;

  document.getElementById('dayModalClose').onclick = () => document.getElementById('dayModal').hidden = true;
  document.querySelectorAll('#importanceChips .chip').forEach(chip => {
    chip.onclick = () => { currentImportanceLevel = Number(chip.dataset.level); updateImportanceChips(); };
  });

  document.getElementById('eventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('evTitle').value.trim();
    if (!title) return;
    const base = {
      time: document.getElementById('evTime').value,
      endTime: document.getElementById('evEndTime').value,
      title,
      comment: document.getElementById('evComment').value.trim(),
      level: currentImportanceLevel,
      icon: currentIcon,
    };
    if (editingEventId != null) {
      await storePut('events', { ...base, date: state.selectedDate, id: editingEventId });
    } else if (state.bulkDates) {
      for (const d of state.bulkDates) await storePut('events', { ...base, date: d });
    } else {
      await storePut('events', { ...base, date: state.selectedDate });
    }
    await loadAll();
    render();
    if (state.bulkDates) {
      document.getElementById('dayModal').hidden = true;
    } else {
      renderEventList(state.selectedDate);
      e.target.reset();
      currentImportanceLevel = 0;
      currentIcon = '';
      currentIconCategory = 'basic';
      editingEventId = null;
      updateImportanceChips();
      renderIconPickerItems();
      document.getElementById('eventSubmitBtn').textContent = t('form.submit.add', 'この日に追加');
    }
  });

  // Import
  document.getElementById('importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const parsed = file.name.toLowerCase().endsWith('.csv') ? parseCSV(text) : parseICS(text);
    for (const ev of parsed) await storePut('events', ev);
    await loadAll();
    render();
    document.getElementById('importSummary').textContent = t('app.importSummary', '{n}件の予定を読み込みました。').replace('{n}', parsed.length);
  });

  document.getElementById('exportIcs').onclick = () => downloadFile('schedule.ics', toICS(Store.events), 'text/calendar');
  document.getElementById('exportCsv').onclick = () => downloadFile('schedule.csv', toCSV(Store.events), 'text/csv');

  document.getElementById('backupExport').onclick = () => {
    downloadFile('studyprint-backup.json', JSON.stringify({ events: Store.events, goals: Store.goals }, null, 2), 'application/json');
  };
  document.getElementById('backupImport').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm(t('app.backupConfirm', '現在のデータに上書き復元します。よろしいですか？'))) return;
    const data = JSON.parse(await file.text());
    await storeClear('events'); await storeClear('goals');
    for (const ev of (data.events || [])) { delete ev.id; await storePut('events', ev); }
    for (const [date, text] of Object.entries(data.goals || {})) await storePut('goals', { date, text });
    await loadAll();
    render();
  });

  document.getElementById('showPrivacyDetail').onclick = (e) => {
    e.preventDefault();
    alert(t('app.privacyAlert', 'このアプリはサーバーを持ちません。予定・目標コメントなどの入力データはすべて、お使いのブラウザのIndexedDB(端末内のストレージ)にのみ保存されます。アプリ本体(画面やコード)はGitHub Pagesから読み込みますが、そのあとの操作でネットワーク通信は発生しません。'));
  };

  // プリント準備ページへ移動する前に、現在の表示範囲を引き継ぐ
  document.getElementById('openPrintPanel').addEventListener('click', () => {
    saveViewRange(state.viewStart, state.spanMonths);
  });

  document.querySelectorAll('.modal-backdrop').forEach(bd => {
    bd.addEventListener('click', (e) => { if (e.target === bd) bd.hidden = true; });
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

boot();
