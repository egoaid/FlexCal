/* ============================================================
   プリント準備ページ ロジック
   - カレンダーは通常の「週の行」に戻しました。重要日はマスのサイズを
     変えず、色・枠線の強調だけで目立たせます(行がズレたり歪んだりしません)。
   - プレビューはページ全体を px 単位の箱(.page-frame)でクリップし、
     その中で実寸(mm)のシートを transform:scale する方式にしたため、
     複数ページ表示時にページ同士が重なるバグが起きません。
   ============================================================ */

const MM_PER_PX = 96 / 25.4; // 96dpi 基準
const PAGE_SIZES = {
  a4: { portrait: { w: 210, h: 297 }, landscape: { w: 297, h: 210 } },
  letter: { portrait: { w: 215.9, h: 279.4 }, landscape: { w: 279.4, h: 215.9 } },
};
function pageSizeFor(opts) {
  return (PAGE_SIZES[opts.paperSize] || PAGE_SIZES.a4)[opts.orientation];
}

/* ---------------- フォントカタログ(言語ロケール別) ----------------
   国・言語によって使えるフォントの傾向が大きく異なるため、
   日本語UIには日本語対応フォント、英語UIには英語フォント、
   韓国語UIには韓国語フォントを中心に見せる。
   「欧文フォントは英語圏以外でも需要がある」という方針により、
   日本語・韓国語のカタログにも「欧文アクセント」グループとして
   ラテン文字の装飾フォントを少数だけ追加してある。
   新しい言語を足すときは、この FONT_CATALOG に1エントリ追加するだけでよい。
   ------------------------------------------------------------------ */
const ACCENT_FONTS_JA = [
  { label: 'Quicksand(欧文・シンプル)', family: "'Quicksand', 'Noto Sans JP', sans-serif" },
  { label: 'DynaPuff(欧文・ポップ)', family: "'DynaPuff', 'Noto Sans JP', sans-serif" },
  { label: 'Special Elite(欧文・レトロ)', family: "'Special Elite', 'Noto Sans JP', sans-serif" },
  { label: 'Merriweather(欧文・ビジネス)', family: "'Merriweather', 'Noto Sans JP', serif" },
  { label: 'Schoolbell(欧文・子供っぽい)', family: "'Schoolbell', 'Noto Sans JP', sans-serif" },
  { label: 'Cinzel(欧文・エレガント)', family: "'Cinzel', 'Noto Sans JP', serif" },
];
const ACCENT_FONTS_KO = [
  { label: 'Quicksand (심플)', family: "'Quicksand', 'Noto Sans KR', sans-serif" },
  { label: 'DynaPuff (팝)', family: "'DynaPuff', 'Noto Sans KR', sans-serif" },
  { label: 'Special Elite (레트로)', family: "'Special Elite', 'Noto Sans KR', sans-serif" },
  { label: 'Merriweather (비즈니스)', family: "'Merriweather', 'Noto Sans KR', serif" },
  { label: 'Schoolbell (동심)', family: "'Schoolbell', 'Noto Sans KR', sans-serif" },
  { label: 'Cinzel (엘레강스)', family: "'Cinzel', 'Noto Sans KR', serif" },
  { label: 'Bitcount Prop Single (디지털)', family: "'Bitcount Prop Single', 'Noto Sans KR', monospace" },
];
const ACCENT_FONTS_ZH = [
  { label: 'Quicksand(欧文・简洁)', family: "'Quicksand', 'Noto Sans SC', sans-serif" },
  { label: 'DynaPuff(欧文・活泼)', family: "'DynaPuff', 'Noto Sans SC', sans-serif" },
  { label: 'Special Elite(欧文・复古)', family: "'Special Elite', 'Noto Sans SC', sans-serif" },
  { label: 'Merriweather(欧文・商务)', family: "'Merriweather', 'Noto Sans SC', serif" },
  { label: 'Schoolbell(欧文・童趣)', family: "'Schoolbell', 'Noto Sans SC', sans-serif" },
  { label: 'Cinzel(欧文・优雅)', family: "'Cinzel', 'Noto Sans SC', serif" },
  { label: 'Bitcount Prop Single(欧文・数字风)', family: "'Bitcount Prop Single', 'Noto Sans SC', monospace" },
];

const FONT_CATALOG = {
  ja: {
    groups: [
      { label: '日本語フォント', fonts: [
        { label: 'Noto Sans JP(標準・読みやすい)', family: "'Noto Sans JP', sans-serif" },
        { label: 'さわらびゴシック', family: "'Sawarabi Gothic', sans-serif" },
        { label: 'BIZ UDPゴシック', family: "'BIZ UDPGothic', sans-serif" },
        { label: 'Zenまるゴシック', family: "'Zen Maru Gothic', sans-serif" },
        { label: 'よもぎ(手書き風)', family: "'Yomogi', sans-serif" },
        { label: 'ドットゴシック16', family: "'DotGothic16', sans-serif" },
        { label: 'ひな明朝', family: "'Hina Mincho', serif" },
        { label: 'はちまるぽっぷ', family: "'Hachi Maru Pop', sans-serif" },
        { label: 'デラゴシック', family: "'Dela Gothic One', sans-serif" },
        { label: '解星 特ミン', family: "'Kaisei Tokumin', serif" },
        { label: 'ロックンロール', family: "'RocknRoll One', sans-serif" },
        { label: 'Zenくれない', family: "'Zen Kurenaido', sans-serif" },
        { label: '新テゴ民', family: "'New Tegomin', serif" },
        { label: 'ランパートワン', family: "'Rampart One', sans-serif" },
        { label: 'キウイまる', family: "'Kiwi Maru', serif" },
        { label: 'ゆせいマジック', family: "'Yusei Magic', sans-serif" },
        { label: 'ウォルターターンコート(欧文・数字のみ)', family: "'Walter Turncoat', 'Noto Sans JP', sans-serif" },
        { label: 'アマティックSC(欧文・数字のみ)', family: "'Amatic SC', 'Noto Sans JP', sans-serif" },
        { label: 'キャビット(欧文・数字のみ)', family: "'Caveat', 'Noto Sans JP', sans-serif" },
      ] },
      { label: '欧文アクセント', fonts: ACCENT_FONTS_JA },
    ],
  },
  en: {
    groups: [
      { label: 'Digital', fonts: [
        { label: 'Bitcount Prop Single', family: "'Bitcount Prop Single', monospace" },
      ] },
      { label: 'Playful', fonts: [
        { label: 'Henny Penny', family: "'Henny Penny', cursive" },
        { label: 'Kablammo', family: "'Kablammo', cursive" },
        { label: 'Moirai One', family: "'Moirai One', cursive" },
        { label: 'Eater', family: "'Eater', cursive" },
        { label: 'Rock 3D', family: "'Rock 3D', cursive" },
        { label: 'Shizuru', family: "'Shizuru', cursive" },
        { label: 'Rubik Puddles', family: "'Rubik Puddles', cursive" },
      ] },
      { label: 'Calm', fonts: [
        { label: 'Elms Sans', family: "'Elms Sans', sans-serif" },
        { label: 'Nanum Gothic', family: "'Nanum Gothic', sans-serif" },
        { label: 'Cantarell', family: "'Cantarell', sans-serif" },
        { label: 'Quicksand', family: "'Quicksand', sans-serif" },
        { label: 'Montserrat', family: "'Montserrat', sans-serif" },
        { label: 'Huninn', family: "'Huninn', sans-serif" },
      ] },
      { label: 'Cute', fonts: [
        { label: 'Cause', family: "'Cause', cursive" },
        { label: 'Cherry Bomb One', family: "'Cherry Bomb One', cursive" },
        { label: 'DynaPuff', family: "'DynaPuff', cursive" },
        { label: 'Sniglet', family: "'Sniglet', cursive" },
        { label: 'Coiny', family: "'Coiny', cursive" },
        { label: 'Unkempt', family: "'Unkempt', cursive" },
        { label: 'Chilanka', family: "'Chilanka', cursive" },
        { label: 'Gaegu', family: "'Gaegu', cursive" },
      ] },
      { label: 'Vintage', fonts: [
        { label: 'Tangerine', family: "'Tangerine', cursive" },
        { label: 'Smokum', family: "'Smokum', cursive" },
        { label: 'Cinzel', family: "'Cinzel', serif" },
        { label: 'Uncial Antiqua', family: "'Uncial Antiqua', cursive" },
        { label: 'Special Elite', family: "'Special Elite', cursive" },
        { label: 'Monoton', family: "'Monoton', cursive" },
        { label: 'New Rocker', family: "'New Rocker', cursive" },
        { label: 'Caesar Dressing', family: "'Caesar Dressing', cursive" },
        { label: 'Ewert', family: "'Ewert', cursive" },
      ] },
      { label: 'Business', fonts: [
        { label: 'Google Sans Flex', family: "'Google Sans Flex', sans-serif" },
        { label: 'Gelasio', family: "'Gelasio', serif" },
        { label: 'Merriweather', family: "'Merriweather', serif" },
        { label: 'Noto Serif Display', family: "'Noto Serif Display', serif" },
        { label: 'Chiron Sung HK', family: "'Chiron Sung HK', serif" },
      ] },
      { label: 'Childlike', fonts: [
        { label: 'Playpen Sans', family: "'Playpen Sans', cursive" },
        { label: 'Playpen Sans Arabic', family: "'Playpen Sans Arabic', cursive" },
        { label: 'Schoolbell', family: "'Schoolbell', cursive" },
        { label: 'Sue Ellen Francisco', family: "'Sue Ellen Francisco', cursive" },
        { label: 'Finger Paint', family: "'Finger Paint', cursive" },
      ] },
      { label: 'Awkward', fonts: [
        { label: 'Coral Pixels', family: "'Coral Pixels', cursive" },
        { label: 'Rock 3D', family: "'Rock 3D', cursive" },
        { label: 'Rubik Iso', family: "'Rubik Iso', cursive" },
        { label: 'Shizuru', family: "'Shizuru', cursive" },
        { label: 'Nosifer', family: "'Nosifer', cursive" },
      ] },
    ],
  },
  ko: {
    groups: [
      { label: '손글씨', fonts: [
        { label: 'Gaegu', family: "'Gaegu', 'Noto Sans KR', sans-serif" },
        { label: 'Hi Melody', family: "'Hi Melody', 'Noto Sans KR', sans-serif" },
        { label: 'Nanum Pen Script', family: "'Nanum Pen Script', 'Noto Sans KR', sans-serif" },
        { label: 'Dokdo', family: "'Dokdo', 'Noto Sans KR', sans-serif" },
      ] },
      { label: '귀여운', fonts: [
        { label: 'Jua', family: "'Jua', 'Noto Sans KR', sans-serif" },
        { label: 'Moirai One', family: "'Moirai One', 'Noto Sans KR', sans-serif" },
        { label: 'Single Day', family: "'Single Day', 'Noto Sans KR', sans-serif" },
        { label: 'Dongle', family: "'Dongle', 'Noto Sans KR', sans-serif" },
        { label: 'Cute Font', family: "'Cute Font', 'Noto Sans KR', sans-serif" },
      ] },
      { label: '개성있는', fonts: [
        { label: 'Black And White Picture', family: "'Black And White Picture', 'Noto Sans KR', sans-serif" },
      ] },
      { label: '진지한', fonts: [
        { label: 'Diphylleia', family: "'Diphylleia', 'Noto Serif KR', serif" },
        { label: 'Noto Sans KR', family: "'Noto Sans KR', sans-serif" },
        { label: 'Noto Serif KR', family: "'Noto Serif KR', serif" },
      ] },
      { label: '우아한', fonts: [
        { label: 'Grandiflora One', family: "'Grandiflora One', 'Noto Serif KR', serif" },
      ] },
      { label: '빈티지', fonts: [
        { label: 'Stylish', family: "'Stylish', 'Noto Sans KR', sans-serif" },
        { label: 'Yeon Sung', family: "'Yeon Sung', 'Noto Serif KR', serif" },
      ] },
      { label: '영문 악센트', fonts: ACCENT_FONTS_KO },
    ],
  },
  zh: {
    groups: [
      { label: '基础', fonts: [
        { label: 'Noto Sans SC(标准・易读)', family: "'Noto Sans SC', sans-serif" },
        { label: 'Noto Serif SC(宋体・正式)', family: "'Noto Serif SC', serif" },
      ] },
      { label: '手写风', fonts: [
        { label: 'Ma Shan Zheng(书法・行草)', family: "'Ma Shan Zheng', 'Noto Sans SC', cursive" },
        { label: 'Liu Jian Mao Cao(草书)', family: "'Liu Jian Mao Cao', 'Noto Sans SC', cursive" },
        { label: 'Zhi Mang Xing(行书)', family: "'Zhi Mang Xing', 'Noto Sans SC', cursive" },
        { label: 'Long Cang(苍劲手写)', family: "'Long Cang', 'Noto Sans SC', cursive" },
      ] },
      { label: '个性・海报风', fonts: [
        { label: 'ZCOOL XiaoWei(典雅艺术风)', family: "'ZCOOL XiaoWei', 'Noto Sans SC', serif" },
        { label: 'ZCOOL QingKe HuangYou(粗体・复古)', family: "'ZCOOL QingKe HuangYou', 'Noto Sans SC', sans-serif" },
        { label: 'ZCOOL KuaiLe(活泼・现代)', family: "'ZCOOL KuaiLe', 'Noto Sans SC', sans-serif" },
      ] },
      { label: '欧文口音', fonts: ACCENT_FONTS_ZH },
    ],
  },
};

// ドイツ語・フランス語・イタリア語・スペイン語は、それぞれの言語らしさを
// 出すため、Google Fonts(https://fonts.google.com/)のテーマ別分類を参照して
// 独自にフォントを選定した(以前は英語版のフォントプールを共有していたが、
// 各言語専用のカタログに置き換えた)。フォント名の実在はweb_searchで確認済み。
FONT_CATALOG.de = {
  groups: [
    { label: 'Klar & Sachlich', fonts: [
      { label: 'Fira Sans', family: "'Fira Sans', sans-serif" },
      { label: 'DM Sans', family: "'DM Sans', sans-serif" },
      { label: 'Josefin Sans', family: "'Josefin Sans', sans-serif" },
      { label: 'Inter', family: "'Inter', sans-serif" },
    ] },
    { label: 'Elegant', fonts: [
      { label: 'Cormorant Garamond', family: "'Cormorant Garamond', serif" },
      { label: 'Playfair Display', family: "'Playfair Display', serif" },
      { label: 'EB Garamond', family: "'EB Garamond', serif" },
    ] },
    { label: 'Verspielt', fonts: [
      { label: 'Baloo 2', family: "'Baloo 2', cursive" },
      { label: 'Fredoka', family: "'Fredoka', sans-serif" },
      { label: 'Comfortaa', family: "'Comfortaa', sans-serif" },
    ] },
    { label: 'Vintage & Tradition', fonts: [
      { label: 'UnifrakturMaguntia(伝統的なフラクトゥール書体)', family: "'UnifrakturMaguntia', cursive" },
      { label: 'Abril Fatface', family: "'Abril Fatface', serif" },
      { label: 'Special Elite', family: "'Special Elite', cursive" },
    ] },
    { label: 'Handschrift', fonts: [
      { label: 'Caveat', family: "'Caveat', cursive" },
      { label: 'Sacramento', family: "'Sacramento', cursive" },
      { label: 'Dancing Script', family: "'Dancing Script', cursive" },
    ] },
  ],
};
FONT_CATALOG.fr = {
  groups: [
    { label: 'Élégant', fonts: [
      { label: 'Italiana', family: "'Italiana', serif" },
      { label: 'Cormorant', family: "'Cormorant', serif" },
      { label: 'Playfair Display', family: "'Playfair Display', serif" },
    ] },
    { label: 'Moderne', fonts: [
      { label: 'Josefin Sans', family: "'Josefin Sans', sans-serif" },
      { label: 'Poppins', family: "'Poppins', sans-serif" },
      { label: 'Quicksand', family: "'Quicksand', sans-serif" },
    ] },
    { label: 'Ludique', fonts: [
      { label: 'Baloo 2', family: "'Baloo 2', cursive" },
      { label: 'Fredoka', family: "'Fredoka', sans-serif" },
      { label: 'Bungee', family: "'Bungee', cursive" },
    ] },
    { label: 'Vintage', fonts: [
      { label: 'Abril Fatface', family: "'Abril Fatface', serif" },
      { label: 'Special Elite', family: "'Special Elite', cursive" },
      { label: 'Alfa Slab One', family: "'Alfa Slab One', cursive" },
    ] },
    { label: 'Manuscrit', fonts: [
      { label: 'Alex Brush', family: "'Alex Brush', cursive" },
      { label: 'Dancing Script', family: "'Dancing Script', cursive" },
      { label: 'Great Vibes', family: "'Great Vibes', cursive" },
    ] },
  ],
};
FONT_CATALOG.it = {
  groups: [
    { label: 'Classico', fonts: [
      { label: 'Cinzel', family: "'Cinzel', serif" },
      { label: 'Cormorant', family: "'Cormorant', serif" },
      { label: 'Playfair Display', family: "'Playfair Display', serif" },
    ] },
    { label: 'Moderno', fonts: [
      { label: 'Poppins', family: "'Poppins', sans-serif" },
      { label: 'Nunito', family: "'Nunito', sans-serif" },
      { label: 'Rubik', family: "'Rubik', sans-serif" },
    ] },
    { label: 'Vivace', fonts: [
      { label: 'Fredoka', family: "'Fredoka', sans-serif" },
      { label: 'Baloo 2', family: "'Baloo 2', cursive" },
      { label: 'Righteous', family: "'Righteous', cursive" },
    ] },
    { label: 'Vintage', fonts: [
      { label: 'Abril Fatface', family: "'Abril Fatface', serif" },
      { label: 'Special Elite', family: "'Special Elite', cursive" },
    ] },
    { label: 'Calligrafia', fonts: [
      { label: 'Pacifico', family: "'Pacifico', cursive" },
      { label: 'Dancing Script', family: "'Dancing Script', cursive" },
      { label: 'Great Vibes', family: "'Great Vibes', cursive" },
    ] },
  ],
};
FONT_CATALOG.es = {
  groups: [
    { label: 'Elegante', fonts: [
      { label: 'Playfair Display', family: "'Playfair Display', serif" },
      { label: 'Cormorant Garamond', family: "'Cormorant Garamond', serif" },
    ] },
    { label: 'Moderno', fonts: [
      { label: 'Poppins', family: "'Poppins', sans-serif" },
      { label: 'Nunito', family: "'Nunito', sans-serif" },
    ] },
    { label: 'Vibrante', fonts: [
      { label: 'Righteous', family: "'Righteous', cursive" },
      { label: 'Baloo 2', family: "'Baloo 2', cursive" },
      { label: 'Bungee', family: "'Bungee', cursive" },
    ] },
    { label: 'Vintage', fonts: [
      { label: 'Abril Fatface', family: "'Abril Fatface', serif" },
      { label: 'Special Elite', family: "'Special Elite', cursive" },
    ] },
    { label: 'Caligrafía', fonts: [
      { label: 'Great Vibes', family: "'Great Vibes', cursive" },
      { label: 'Pacifico', family: "'Pacifico', cursive" },
      { label: 'Dancing Script', family: "'Dancing Script', cursive" },
    ] },
  ],
};

function firstFontFamily(lang) {
  const cat = FONT_CATALOG[lang] || FONT_CATALOG.ja;
  return cat.groups[0].fonts[0].family;
}
// そのロケールのカタログで実際に使われている Google Fonts のファミリー名一覧
// (Google Fonts CDN のURLをそのロケール分だけ動的に組み立てるために使う)
function allFontFamiliesFor(lang) {
  const cat = FONT_CATALOG[lang] || FONT_CATALOG.ja;
  const names = [];
  cat.groups.forEach(g => g.fonts.forEach(fo => {
    const m = fo.family.match(/'([^']+)'/);
    if (m && !names.includes(m[1])) names.push(m[1]);
  }));
  return names;
}

const COLOR_PRESETS = [
  { name: 'フォレスト(既定)', bg: '#ffffff', ink: '#202b24', line: '#dadcd4', important: '#2f6f4e', top: '#c8443c' },
  { name: 'モノトーン',       bg: '#ffffff', ink: '#111111', line: '#cccccc', important: '#555555', top: '#000000' },
  { name: 'パステルピンク',   bg: '#fff5f7', ink: '#4a2b33', line: '#f3d6dd', important: '#e58aa0', top: '#c2185b' },
  { name: 'パステルブルー',   bg: '#f2f7fb', ink: '#20323f', line: '#cfe1ee', important: '#4a90c4', top: '#1c5d8c' },
  { name: 'パステルイエロー', bg: '#fffdf2', ink: '#4a3f1f', line: '#eee2b3', important: '#e0b234', top: '#b5750a' },
  { name: 'ミント',           bg: '#f2fbf7', ink: '#1f3f30', line: '#c9e9d8', important: '#2fa373', top: '#0e6b47' },
  { name: 'ラベンダー',       bg: '#f8f5fc', ink: '#3a2f4a', line: '#ded1ee', important: '#8a6bc2', top: '#5a3b96' },
  { name: 'サンセット',       bg: '#fff8f2', ink: '#4a2f1f', line: '#f0d9c1', important: '#e0762f', top: '#b0431a' },
  { name: 'ダーク',           bg: '#20242a', ink: '#eef1ee', line: '#454b52', important: '#7fd9a6', top: '#ef7a6d' },
  { name: 'ビビッド',         bg: '#ffffff', ink: '#000000', line: '#999999', important: '#0057ff', top: '#ff0033' },
  { name: 'サクラ',           bg: '#fff8fa', ink: '#5a2f3d', line: '#f6d9e3', important: '#f0709a', top: '#d1276b' },
  { name: 'そら',             bg: '#f5fbff', ink: '#1e3a4f', line: '#cfe7f7', important: '#3ba3d9', top: '#0d6ba8' },
  { name: 'わかば',           bg: '#f7fdf2', ink: '#2c4a1f', line: '#dcefc9', important: '#7cb342', top: '#4c7a1f' },
  { name: 'たいよう',         bg: '#fffbf0', ink: '#4a3410', line: '#f5e2ab', important: '#f2a71b', top: '#c9700a' },
  { name: 'ワイン',           bg: '#fdf6f6', ink: '#3d1a1e', line: '#e8cfd0', important: '#8e3b45', top: '#5c1d24' },
  { name: 'ミッドナイト',     bg: '#101826', ink: '#e6ecf5', line: '#2c3a52', important: '#5b9bd5', top: '#e0576b' },
  { name: 'フォグ(グレー系)', bg: '#f4f5f6', ink: '#33383d', line: '#d6dade', important: '#6b7a8f', top: '#39506e' },
  { name: 'テラコッタ',       bg: '#fdf6f1', ink: '#4a2c1c', line: '#ecd3bd', important: '#c1704a', top: '#96401f' },
  { name: 'アイス',           bg: '#f3fbfc', ink: '#173f45', line: '#c9ecef', important: '#3fb8c4', top: '#12707a' },
  { name: 'モーヴ',           bg: '#faf6fa', ink: '#3a2b3f', line: '#e4d3e6', important: '#a179ad', top: '#6f4179' },
  { name: 'カーキ',           bg: '#f9f8ef', ink: '#3e3c22', line: '#e5e1bf', important: '#9a934a', top: '#6b6423' },
  { name: 'コーラル',         bg: '#fff7f5', ink: '#4a2620', line: '#f4d9d1', important: '#f0806a', top: '#d6472b' },
];

const FONT_PRESETS = {
  ja: [
    { name: 'ベーシック', title: "'Noto Sans JP', sans-serif", summary: "'Noto Sans JP', sans-serif", weekday: "'Noto Sans JP', sans-serif", date: "'Noto Sans JP', sans-serif", comment: "'Noto Sans JP', sans-serif" },
    { name: 'かわいい丸文字', title: "'Zen Maru Gothic', sans-serif", summary: "'Sawarabi Gothic', sans-serif", weekday: "'Zen Maru Gothic', sans-serif", date: "'Zen Maru Gothic', sans-serif", comment: "'Sawarabi Gothic', sans-serif" },
    { name: 'ポップ', title: "'Hachi Maru Pop', sans-serif", summary: "'Noto Sans JP', sans-serif", weekday: "'Hachi Maru Pop', sans-serif", date: "'Hachi Maru Pop', sans-serif", comment: "'Noto Sans JP', sans-serif" },
    { name: '手書き風', title: "'Yomogi', sans-serif", summary: "'Yomogi', sans-serif", weekday: "'Yomogi', sans-serif", date: "'Yomogi', sans-serif", comment: "'Yomogi', sans-serif" },
    { name: '和風・上品', title: "'Kaisei Tokumin', serif", summary: "'Hina Mincho', serif", weekday: "'Hina Mincho', serif", date: "'Kaisei Tokumin', serif", comment: "'Hina Mincho', serif" },
    { name: 'スタイリッシュ', title: "'Dela Gothic One', sans-serif", summary: "'Noto Sans JP', sans-serif", weekday: "'BIZ UDPGothic', sans-serif", date: "'BIZ UDPGothic', sans-serif", comment: "'Noto Sans JP', sans-serif" },
    { name: 'ポップ&ロック', title: "'RocknRoll One', sans-serif", summary: "'Noto Sans JP', sans-serif", weekday: "'RocknRoll One', sans-serif", date: "'RocknRoll One', sans-serif", comment: "'Sawarabi Gothic', sans-serif" },
    { name: 'デジタル風', title: "'DotGothic16', sans-serif", summary: "'DotGothic16', sans-serif", weekday: "'DotGothic16', sans-serif", date: "'DotGothic16', sans-serif", comment: "'DotGothic16', sans-serif" },
    { name: 'まじめゴシック', title: "'BIZ UDPGothic', sans-serif", summary: "'BIZ UDPGothic', sans-serif", weekday: "'BIZ UDPGothic', sans-serif", date: "'BIZ UDPGothic', sans-serif", comment: "'BIZ UDPGothic', sans-serif" },
    { name: 'やわらか明朝', title: "'Hina Mincho', serif", summary: "'Hina Mincho', serif", weekday: "'Sawarabi Gothic', sans-serif", date: "'Hina Mincho', serif", comment: "'Sawarabi Gothic', sans-serif" },
  ],
  // 英語版は、ユーザー指定のテーマ区分(Digital/Playful/Calm/Cute/Vintage/Business/Childlike/Awkward)を
  // そのままプリセット名として採用。日本語版の「10個固定」という数にはあえて合わせていない。
  en: [
    { name: 'Digital', title: "'Bitcount Prop Single', monospace", summary: "'Cantarell', sans-serif", weekday: "'Bitcount Prop Single', monospace", date: "'Bitcount Prop Single', monospace", comment: "'Cantarell', sans-serif" },
    { name: 'Playful', title: "'Kablammo', cursive", summary: "'Cantarell', sans-serif", weekday: "'Rock 3D', cursive", date: "'Rock 3D', cursive", comment: "'Cantarell', sans-serif" },
    { name: 'Calm', title: "'Montserrat', sans-serif", summary: "'Cantarell', sans-serif", weekday: "'Montserrat', sans-serif", date: "'Montserrat', sans-serif", comment: "'Cantarell', sans-serif" },
    { name: 'Cute', title: "'Cherry Bomb One', cursive", summary: "'Quicksand', sans-serif", weekday: "'DynaPuff', cursive", date: "'DynaPuff', cursive", comment: "'Quicksand', sans-serif" },
    { name: 'Vintage', title: "'Special Elite', cursive", summary: "'Gelasio', serif", weekday: "'Cinzel', serif", date: "'Cinzel', serif", comment: "'Gelasio', serif" },
    { name: 'Business', title: "'Google Sans Flex', sans-serif", summary: "'Gelasio', serif", weekday: "'Google Sans Flex', sans-serif", date: "'Google Sans Flex', sans-serif", comment: "'Gelasio', serif" },
    { name: 'Childlike', title: "'Schoolbell', cursive", summary: "'Playpen Sans', cursive", weekday: "'Finger Paint', cursive", date: "'Finger Paint', cursive", comment: "'Playpen Sans', cursive" },
    { name: 'Awkward', title: "'Rubik Iso', cursive", summary: "'Cantarell', sans-serif", weekday: "'Coral Pixels', cursive", date: "'Coral Pixels', cursive", comment: "'Cantarell', sans-serif" },
  ],
  // 韓国語版は、ユーザー指定のテーマ区分(손글씨/귀여운/개성있는/진지한/우아한/빈티지)を採用。
  ko: [
    { name: '손글씨', title: "'Nanum Pen Script', 'Noto Sans KR', sans-serif", summary: "'Gaegu', 'Noto Sans KR', sans-serif", weekday: "'Nanum Pen Script', 'Noto Sans KR', sans-serif", date: "'Nanum Pen Script', 'Noto Sans KR', sans-serif", comment: "'Gaegu', 'Noto Sans KR', sans-serif" },
    { name: '귀여운', title: "'Jua', 'Noto Sans KR', sans-serif", summary: "'Dongle', 'Noto Sans KR', sans-serif", weekday: "'Jua', 'Noto Sans KR', sans-serif", date: "'Jua', 'Noto Sans KR', sans-serif", comment: "'Dongle', 'Noto Sans KR', sans-serif" },
    { name: '개성있는', title: "'Black And White Picture', 'Noto Sans KR', sans-serif", summary: "'Noto Sans KR', sans-serif", weekday: "'Black And White Picture', 'Noto Sans KR', sans-serif", date: "'Black And White Picture', 'Noto Sans KR', sans-serif", comment: "'Noto Sans KR', sans-serif" },
    { name: '진지한', title: "'Noto Serif KR', serif", summary: "'Noto Sans KR', sans-serif", weekday: "'Noto Sans KR', sans-serif", date: "'Noto Serif KR', serif", comment: "'Noto Sans KR', sans-serif" },
    { name: '우아한', title: "'Grandiflora One', 'Noto Serif KR', serif", summary: "'Diphylleia', 'Noto Serif KR', serif", weekday: "'Diphylleia', 'Noto Serif KR', serif", date: "'Grandiflora One', 'Noto Serif KR', serif", comment: "'Diphylleia', 'Noto Serif KR', serif" },
    { name: '빈티지', title: "'Yeon Sung', 'Noto Serif KR', serif", summary: "'Stylish', 'Noto Sans KR', sans-serif", weekday: "'Stylish', 'Noto Sans KR', sans-serif", date: "'Yeon Sung', 'Noto Serif KR', serif", comment: "'Stylish', 'Noto Sans KR', sans-serif" },
  ],
};

// 中国語と同様、ドイツ語・フランス語・イタリア語・スペイン語も
// それぞれの専用フォントカタログ(FONT_CATALOG.de/fr/it/es)から選んだ
// フォントで独自にプリセットを組んでいる(以前は英語版の流用だった)。
FONT_PRESETS.de = [
  { name: 'Klar & Sachlich', title: "'Fira Sans', sans-serif", summary: "'DM Sans', sans-serif", weekday: "'Fira Sans', sans-serif", date: "'Fira Sans', sans-serif", comment: "'DM Sans', sans-serif" },
  { name: 'Elegant', title: "'Playfair Display', serif", summary: "'EB Garamond', serif", weekday: "'Cormorant Garamond', serif", date: "'Cormorant Garamond', serif", comment: "'EB Garamond', serif" },
  { name: 'Verspielt', title: "'Fredoka', sans-serif", summary: "'Comfortaa', sans-serif", weekday: "'Baloo 2', cursive", date: "'Baloo 2', cursive", comment: "'Comfortaa', sans-serif" },
  { name: 'Vintage & Tradition', title: "'UnifrakturMaguntia', cursive", summary: "'Special Elite', cursive", weekday: "'Abril Fatface', serif", date: "'Abril Fatface', serif", comment: "'Special Elite', cursive" },
  { name: 'Handschrift', title: "'Sacramento', cursive", summary: "'Caveat', cursive", weekday: "'Dancing Script', cursive", date: "'Dancing Script', cursive", comment: "'Caveat', cursive" },
];
FONT_PRESETS.fr = [
  { name: 'Élégant', title: "'Italiana', serif", summary: "'Cormorant', serif", weekday: "'Playfair Display', serif", date: "'Playfair Display', serif", comment: "'Cormorant', serif" },
  { name: 'Moderne', title: "'Josefin Sans', sans-serif", summary: "'Quicksand', sans-serif", weekday: "'Poppins', sans-serif", date: "'Poppins', sans-serif", comment: "'Quicksand', sans-serif" },
  { name: 'Ludique', title: "'Bungee', cursive", summary: "'Fredoka', sans-serif", weekday: "'Baloo 2', cursive", date: "'Baloo 2', cursive", comment: "'Fredoka', sans-serif" },
  { name: 'Vintage', title: "'Alfa Slab One', cursive", summary: "'Special Elite', cursive", weekday: "'Abril Fatface', serif", date: "'Abril Fatface', serif", comment: "'Special Elite', cursive" },
  { name: 'Manuscrit', title: "'Great Vibes', cursive", summary: "'Dancing Script', cursive", weekday: "'Alex Brush', cursive", date: "'Alex Brush', cursive", comment: "'Dancing Script', cursive" },
];
FONT_PRESETS.it = [
  { name: 'Classico', title: "'Cinzel', serif", summary: "'Cormorant', serif", weekday: "'Playfair Display', serif", date: "'Playfair Display', serif", comment: "'Cormorant', serif" },
  { name: 'Moderno', title: "'Rubik', sans-serif", summary: "'Nunito', sans-serif", weekday: "'Poppins', sans-serif", date: "'Poppins', sans-serif", comment: "'Nunito', sans-serif" },
  { name: 'Vivace', title: "'Righteous', cursive", summary: "'Nunito', sans-serif", weekday: "'Fredoka', sans-serif", date: "'Fredoka', sans-serif", comment: "'Nunito', sans-serif" },
  { name: 'Vintage', title: "'Abril Fatface', serif", summary: "'Special Elite', cursive", weekday: "'Abril Fatface', serif", date: "'Abril Fatface', serif", comment: "'Special Elite', cursive" },
  { name: 'Calligrafia', title: "'Pacifico', cursive", summary: "'Dancing Script', cursive", weekday: "'Great Vibes', cursive", date: "'Great Vibes', cursive", comment: "'Dancing Script', cursive" },
];
FONT_PRESETS.es = [
  { name: 'Elegante', title: "'Playfair Display', serif", summary: "'Cormorant Garamond', serif", weekday: "'Playfair Display', serif", date: "'Playfair Display', serif", comment: "'Cormorant Garamond', serif" },
  { name: 'Moderno', title: "'Poppins', sans-serif", summary: "'Nunito', sans-serif", weekday: "'Poppins', sans-serif", date: "'Poppins', sans-serif", comment: "'Nunito', sans-serif" },
  { name: 'Vibrante', title: "'Bungee', cursive", summary: "'Nunito', sans-serif", weekday: "'Righteous', cursive", date: "'Righteous', cursive", comment: "'Nunito', sans-serif" },
  { name: 'Vintage', title: "'Abril Fatface', serif", summary: "'Special Elite', cursive", weekday: "'Abril Fatface', serif", date: "'Abril Fatface', serif", comment: "'Special Elite', cursive" },
  { name: 'Caligrafía', title: "'Great Vibes', cursive", summary: "'Pacifico', cursive", weekday: "'Dancing Script', cursive", date: "'Dancing Script', cursive", comment: "'Pacifico', cursive" },
];
// 中国語は専用のフォントカタログ(FONT_CATALOG.zh)を持つため、
// 英語版の流用ではなく中国語フォントで独自にプリセットを組んでいる。
FONT_PRESETS.zh = [
  { name: '基础', title: "'Noto Sans SC', sans-serif", summary: "'Noto Sans SC', sans-serif", weekday: "'Noto Sans SC', sans-serif", date: "'Noto Sans SC', sans-serif", comment: "'Noto Sans SC', sans-serif" },
  { name: '手写风', title: "'Ma Shan Zheng', 'Noto Sans SC', cursive", summary: "'Noto Sans SC', sans-serif", weekday: "'Liu Jian Mao Cao', 'Noto Sans SC', cursive", date: "'Liu Jian Mao Cao', 'Noto Sans SC', cursive", comment: "'Noto Sans SC', sans-serif" },
  { name: '复古海报', title: "'ZCOOL QingKe HuangYou', 'Noto Sans SC', sans-serif", summary: "'Noto Serif SC', serif", weekday: "'ZCOOL QingKe HuangYou', 'Noto Sans SC', sans-serif", date: "'ZCOOL QingKe HuangYou', 'Noto Sans SC', sans-serif", comment: "'Noto Serif SC', serif" },
  { name: '活泼现代', title: "'ZCOOL KuaiLe', 'Noto Sans SC', sans-serif", summary: "'Noto Sans SC', sans-serif", weekday: "'ZCOOL KuaiLe', 'Noto Sans SC', sans-serif", date: "'ZCOOL KuaiLe', 'Noto Sans SC', sans-serif", comment: "'Noto Sans SC', sans-serif" },
  { name: '典雅艺术', title: "'ZCOOL XiaoWei', 'Noto Serif SC', serif", summary: "'Noto Serif SC', serif", weekday: "'ZCOOL XiaoWei', 'Noto Serif SC', serif", date: "'ZCOOL XiaoWei', 'Noto Serif SC', serif", comment: "'Noto Serif SC', serif" },
];

function f(family, size, bold) { return { family, size, bold: !!bold }; }

// デザインプリセットは「配色・不透明度・角丸・月ラベル」は言語に依存しないため
// 3言語で共通の値を使い、フォントと名前だけをロケールごとに差し替えている。
// (同じインデックス = 同じテーマ、という対応関係を保っている)
const DESIGN_PRESETS = {
  ja: [
    {
      name: 'ベーシック',
      colors: { bg: '#ffffff', ink: '#202b24', line: '#dadcd4', important: '#2f6f4e', top: '#c8443c' },
      colorNormal: '#ffffff', normalOpacity: 70, colorEmpty: '#767b74',
      importantOpacity: 16, topOpacity: 20, cellRadius: 1,
      monthLabelIcon: '📌', monthLabelColor: '#2f6f4e', monthLabelSize: 130,
      fonts: { title: f("'Noto Sans JP', sans-serif", 190, true), summary: f("'Noto Sans JP', sans-serif", 140, false), weekday: f("'Noto Sans JP', sans-serif", 130, false), date: f("'Noto Sans JP', sans-serif", 135, false), comment: f("'Noto Sans JP', sans-serif", 135, false) },
    },
    {
      name: 'かわいいピンク',
      colors: { bg: '#fff5f7', ink: '#4a2b33', line: '#f3d6dd', important: '#e58aa0', top: '#c2185b' },
      colorNormal: '#fff5f7', normalOpacity: 60, colorEmpty: '#c79aa6',
      importantOpacity: 22, topOpacity: 28, cellRadius: 3,
      monthLabelIcon: '⭐', monthLabelColor: '#c2185b', monthLabelSize: 140,
      fonts: { title: f("'Zen Maru Gothic', sans-serif", 190, true), summary: f("'Sawarabi Gothic', sans-serif", 140, false), weekday: f("'Zen Maru Gothic', sans-serif", 130, true), date: f("'Zen Maru Gothic', sans-serif", 135, false), comment: f("'Sawarabi Gothic', sans-serif", 135, false) },
    },
    {
      name: 'ポップ・ビビッド',
      colors: { bg: '#ffffff', ink: '#000000', line: '#999999', important: '#0057ff', top: '#ff0033' },
      colorNormal: '#ffffff', normalOpacity: 70, colorEmpty: '#999999',
      importantOpacity: 18, topOpacity: 22, cellRadius: 4,
      monthLabelIcon: '●', monthLabelColor: '#ff0033', monthLabelSize: 150,
      fonts: { title: f("'Hachi Maru Pop', sans-serif", 190, false), summary: f("'Noto Sans JP', sans-serif", 140, false), weekday: f("'Hachi Maru Pop', sans-serif", 130, false), date: f("'Hachi Maru Pop', sans-serif", 135, false), comment: f("'Sawarabi Gothic', sans-serif", 135, false) },
    },
    {
      name: '手書きナチュラル',
      colors: { bg: '#f7fdf2', ink: '#2c4a1f', line: '#dcefc9', important: '#7cb342', top: '#4c7a1f' },
      colorNormal: '#f7fdf2', normalOpacity: 65, colorEmpty: '#8fa87f',
      importantOpacity: 20, topOpacity: 26, cellRadius: 2,
      monthLabelIcon: '🗓️', monthLabelColor: '#4c7a1f', monthLabelSize: 130,
      fonts: { title: f("'Yomogi', sans-serif", 190, false), summary: f("'Yomogi', sans-serif", 140, false), weekday: f("'Yomogi', sans-serif", 130, false), date: f("'Yomogi', sans-serif", 135, false), comment: f("'Yomogi', sans-serif", 135, false) },
    },
    {
      name: '和風エレガント',
      colors: { bg: '#fdf6f6', ink: '#3d1a1e', line: '#e8cfd0', important: '#8e3b45', top: '#5c1d24' },
      colorNormal: '#fdf6f6', normalOpacity: 65, colorEmpty: '#a9848a',
      importantOpacity: 18, topOpacity: 24, cellRadius: 0,
      monthLabelIcon: '▶', monthLabelColor: '#5c1d24', monthLabelSize: 120,
      fonts: { title: f("'Kaisei Tokumin', serif", 190, true), summary: f("'Hina Mincho', serif", 140, false), weekday: f("'Hina Mincho', serif", 130, false), date: f("'Kaisei Tokumin', serif", 135, false), comment: f("'Hina Mincho', serif", 135, false) },
    },
    {
      name: 'モダン筆文字',
      colors: { bg: '#faf7f0', ink: '#2e2a22', line: '#e6ddc8', important: '#8a6b3a', top: '#a13b2c' },
      colorNormal: '#faf7f0', normalOpacity: 65, colorEmpty: '#9c9482',
      importantOpacity: 20, topOpacity: 26, cellRadius: 1,
      monthLabelIcon: '▶', monthLabelColor: '#a13b2c', monthLabelSize: 130,
      fonts: { title: f("'Zen Kurenaido', sans-serif", 190, false), summary: f("'New Tegomin', serif", 140, false), weekday: f("'New Tegomin', serif", 130, false), date: f("'Zen Kurenaido', sans-serif", 135, false), comment: f("'New Tegomin', serif", 135, false) },
    },
    {
      name: 'デジタル',
      colors: { bg: '#ffffff', ink: '#111111', line: '#cccccc', important: '#555555', top: '#000000' },
      colorNormal: '#ffffff', normalOpacity: 75, colorEmpty: '#aaaaaa',
      importantOpacity: 16, topOpacity: 22, cellRadius: 0,
      monthLabelIcon: '', monthLabelColor: '#111111', monthLabelSize: 130,
      fonts: { title: f("'DotGothic16', sans-serif", 190, false), summary: f("'DotGothic16', sans-serif", 140, false), weekday: f("'DotGothic16', sans-serif", 130, false), date: f("'DotGothic16', sans-serif", 135, false), comment: f("'DotGothic16', sans-serif", 135, false) },
    },
    {
      name: 'サクラ',
      colors: { bg: '#fff8fa', ink: '#5a2f3d', line: '#f6d9e3', important: '#f0709a', top: '#d1276b' },
      colorNormal: '#fff8fa', normalOpacity: 60, colorEmpty: '#c093a1',
      importantOpacity: 22, topOpacity: 28, cellRadius: 3,
      monthLabelIcon: '⭐', monthLabelColor: '#d1276b', monthLabelSize: 135,
      fonts: { title: f("'Kiwi Maru', serif", 190, true), summary: f("'Sawarabi Gothic', sans-serif", 140, false), weekday: f("'Kiwi Maru', serif", 130, false), date: f("'Kiwi Maru', serif", 135, false), comment: f("'Sawarabi Gothic', sans-serif", 135, false) },
    },
    {
      name: 'そら・まじめ',
      colors: { bg: '#f5fbff', ink: '#1e3a4f', line: '#cfe7f7', important: '#3ba3d9', top: '#0d6ba8' },
      colorNormal: '#f5fbff', normalOpacity: 65, colorEmpty: '#7fa3b8',
      importantOpacity: 18, topOpacity: 24, cellRadius: 1,
      monthLabelIcon: '📌', monthLabelColor: '#0d6ba8', monthLabelSize: 125,
      fonts: { title: f("'Yusei Magic', sans-serif", 190, false), summary: f("'BIZ UDPGothic', sans-serif", 140, false), weekday: f("'BIZ UDPGothic', sans-serif", 130, false), date: f("'BIZ UDPGothic', sans-serif", 135, false), comment: f("'BIZ UDPGothic', sans-serif", 135, false) },
    },
    {
      name: 'ロックポップ',
      colors: { bg: '#fff5f4', ink: '#2a1210', line: '#f0cfc9', important: '#c94f3f', top: '#7f1f16' },
      colorNormal: '#fff5f4', normalOpacity: 60, colorEmpty: '#a98a86',
      importantOpacity: 24, topOpacity: 30, cellRadius: 2,
      monthLabelIcon: '▶', monthLabelColor: '#7f1f16', monthLabelSize: 140,
      fonts: { title: f("'RocknRoll One', sans-serif", 190, false), summary: f("'Noto Sans JP', sans-serif", 140, false), weekday: f("'RocknRoll One', sans-serif", 130, false), date: f("'RocknRoll One', sans-serif", 135, false), comment: f("'Sawarabi Gothic', sans-serif", 135, false) },
    },
  ],
  en: [
    {
      name: 'Basic',
      colors: { bg: '#ffffff', ink: '#202b24', line: '#dadcd4', important: '#2f6f4e', top: '#c8443c' },
      colorNormal: '#ffffff', normalOpacity: 70, colorEmpty: '#767b74',
      importantOpacity: 16, topOpacity: 20, cellRadius: 1,
      monthLabelIcon: '📌', monthLabelColor: '#2f6f4e', monthLabelSize: 130,
      fonts: { title: f("'Montserrat', sans-serif", 190, true), summary: f("'Cantarell', sans-serif", 140, false), weekday: f("'Montserrat', sans-serif", 130, false), date: f("'Montserrat', sans-serif", 135, false), comment: f("'Cantarell', sans-serif", 135, false) },
    },
    {
      name: 'Cute Pink',
      colors: { bg: '#fff5f7', ink: '#4a2b33', line: '#f3d6dd', important: '#e58aa0', top: '#c2185b' },
      colorNormal: '#fff5f7', normalOpacity: 60, colorEmpty: '#c79aa6',
      importantOpacity: 22, topOpacity: 28, cellRadius: 3,
      monthLabelIcon: '⭐', monthLabelColor: '#c2185b', monthLabelSize: 140,
      fonts: { title: f("'Cherry Bomb One', cursive", 190, false), summary: f("'Quicksand', sans-serif", 140, false), weekday: f("'DynaPuff', cursive", 130, true), date: f("'DynaPuff', cursive", 135, false), comment: f("'Quicksand', sans-serif", 135, false) },
    },
    {
      name: 'Pop Vivid',
      colors: { bg: '#ffffff', ink: '#000000', line: '#999999', important: '#0057ff', top: '#ff0033' },
      colorNormal: '#ffffff', normalOpacity: 70, colorEmpty: '#999999',
      importantOpacity: 18, topOpacity: 22, cellRadius: 4,
      monthLabelIcon: '●', monthLabelColor: '#ff0033', monthLabelSize: 150,
      fonts: { title: f("'Kablammo', cursive", 190, false), summary: f("'Cantarell', sans-serif", 140, false), weekday: f("'Kablammo', cursive", 130, false), date: f("'Kablammo', cursive", 135, false), comment: f("'Cantarell', sans-serif", 135, false) },
    },
    {
      name: 'Handwritten Natural',
      colors: { bg: '#f7fdf2', ink: '#2c4a1f', line: '#dcefc9', important: '#7cb342', top: '#4c7a1f' },
      colorNormal: '#f7fdf2', normalOpacity: 65, colorEmpty: '#8fa87f',
      importantOpacity: 20, topOpacity: 26, cellRadius: 2,
      monthLabelIcon: '🗓️', monthLabelColor: '#4c7a1f', monthLabelSize: 130,
      fonts: { title: f("'Chilanka', cursive", 190, false), summary: f("'Chilanka', cursive", 140, false), weekday: f("'Chilanka', cursive", 130, false), date: f("'Chilanka', cursive", 135, false), comment: f("'Chilanka', cursive", 135, false) },
    },
    {
      name: 'Elegant',
      colors: { bg: '#fdf6f6', ink: '#3d1a1e', line: '#e8cfd0', important: '#8e3b45', top: '#5c1d24' },
      colorNormal: '#fdf6f6', normalOpacity: 65, colorEmpty: '#a9848a',
      importantOpacity: 18, topOpacity: 24, cellRadius: 0,
      monthLabelIcon: '▶', monthLabelColor: '#5c1d24', monthLabelSize: 120,
      fonts: { title: f("'Cinzel', serif", 190, true), summary: f("'Gelasio', serif", 140, false), weekday: f("'Gelasio', serif", 130, false), date: f("'Cinzel', serif", 135, false), comment: f("'Gelasio', serif", 135, false) },
    },
    {
      name: 'Modern Script',
      colors: { bg: '#faf7f0', ink: '#2e2a22', line: '#e6ddc8', important: '#8a6b3a', top: '#a13b2c' },
      colorNormal: '#faf7f0', normalOpacity: 65, colorEmpty: '#9c9482',
      importantOpacity: 20, topOpacity: 26, cellRadius: 1,
      monthLabelIcon: '▶', monthLabelColor: '#a13b2c', monthLabelSize: 130,
      fonts: { title: f("'Special Elite', cursive", 190, false), summary: f("'Gelasio', serif", 140, false), weekday: f("'Gelasio', serif", 130, false), date: f("'Special Elite', cursive", 135, false), comment: f("'Gelasio', serif", 135, false) },
    },
    {
      name: 'Digital',
      colors: { bg: '#ffffff', ink: '#111111', line: '#cccccc', important: '#555555', top: '#000000' },
      colorNormal: '#ffffff', normalOpacity: 75, colorEmpty: '#aaaaaa',
      importantOpacity: 16, topOpacity: 22, cellRadius: 0,
      monthLabelIcon: '', monthLabelColor: '#111111', monthLabelSize: 130,
      fonts: { title: f("'Bitcount Prop Single', monospace", 190, false), summary: f("'Bitcount Prop Single', monospace", 140, false), weekday: f("'Bitcount Prop Single', monospace", 130, false), date: f("'Bitcount Prop Single', monospace", 135, false), comment: f("'Bitcount Prop Single', monospace", 135, false) },
    },
    {
      name: 'Cherry Blossom',
      colors: { bg: '#fff8fa', ink: '#5a2f3d', line: '#f6d9e3', important: '#f0709a', top: '#d1276b' },
      colorNormal: '#fff8fa', normalOpacity: 60, colorEmpty: '#c093a1',
      importantOpacity: 22, topOpacity: 28, cellRadius: 3,
      monthLabelIcon: '⭐', monthLabelColor: '#d1276b', monthLabelSize: 135,
      fonts: { title: f("'Cherry Bomb One', cursive", 190, true), summary: f("'Quicksand', sans-serif", 140, false), weekday: f("'Cherry Bomb One', cursive", 130, false), date: f("'Cherry Bomb One', cursive", 135, false), comment: f("'Quicksand', sans-serif", 135, false) },
    },
    {
      name: 'Sky & Serious',
      colors: { bg: '#f5fbff', ink: '#1e3a4f', line: '#cfe7f7', important: '#3ba3d9', top: '#0d6ba8' },
      colorNormal: '#f5fbff', normalOpacity: 65, colorEmpty: '#7fa3b8',
      importantOpacity: 18, topOpacity: 24, cellRadius: 1,
      monthLabelIcon: '📌', monthLabelColor: '#0d6ba8', monthLabelSize: 125,
      fonts: { title: f("'Montserrat', sans-serif", 190, false), summary: f("'Cantarell', sans-serif", 140, false), weekday: f("'Cantarell', sans-serif", 130, false), date: f("'Cantarell', sans-serif", 135, false), comment: f("'Cantarell', sans-serif", 135, false) },
    },
    {
      name: 'Rock Pop',
      colors: { bg: '#fff5f4', ink: '#2a1210', line: '#f0cfc9', important: '#c94f3f', top: '#7f1f16' },
      colorNormal: '#fff5f4', normalOpacity: 60, colorEmpty: '#a98a86',
      importantOpacity: 24, topOpacity: 30, cellRadius: 2,
      monthLabelIcon: '▶', monthLabelColor: '#7f1f16', monthLabelSize: 140,
      fonts: { title: f("'New Rocker', cursive", 190, false), summary: f("'Cantarell', sans-serif", 140, false), weekday: f("'New Rocker', cursive", 130, false), date: f("'New Rocker', cursive", 135, false), comment: f("'Cantarell', sans-serif", 135, false) },
    },
  ],
  ko: [
    {
      name: '베이직',
      colors: { bg: '#ffffff', ink: '#202b24', line: '#dadcd4', important: '#2f6f4e', top: '#c8443c' },
      colorNormal: '#ffffff', normalOpacity: 70, colorEmpty: '#767b74',
      importantOpacity: 16, topOpacity: 20, cellRadius: 1,
      monthLabelIcon: '📌', monthLabelColor: '#2f6f4e', monthLabelSize: 130,
      fonts: { title: f("'Noto Sans KR', sans-serif", 190, true), summary: f("'Noto Sans KR', sans-serif", 140, false), weekday: f("'Noto Sans KR', sans-serif", 130, false), date: f("'Noto Sans KR', sans-serif", 135, false), comment: f("'Noto Sans KR', sans-serif", 135, false) },
    },
    {
      name: '귀여운 핑크',
      colors: { bg: '#fff5f7', ink: '#4a2b33', line: '#f3d6dd', important: '#e58aa0', top: '#c2185b' },
      colorNormal: '#fff5f7', normalOpacity: 60, colorEmpty: '#c79aa6',
      importantOpacity: 22, topOpacity: 28, cellRadius: 3,
      monthLabelIcon: '⭐', monthLabelColor: '#c2185b', monthLabelSize: 140,
      fonts: { title: f("'Jua', 'Noto Sans KR', sans-serif", 190, false), summary: f("'Gaegu', 'Noto Sans KR', sans-serif", 140, false), weekday: f("'Jua', 'Noto Sans KR', sans-serif", 130, true), date: f("'Jua', 'Noto Sans KR', sans-serif", 135, false), comment: f("'Gaegu', 'Noto Sans KR', sans-serif", 135, false) },
    },
    {
      name: '팝 비비드',
      colors: { bg: '#ffffff', ink: '#000000', line: '#999999', important: '#0057ff', top: '#ff0033' },
      colorNormal: '#ffffff', normalOpacity: 70, colorEmpty: '#999999',
      importantOpacity: 18, topOpacity: 22, cellRadius: 4,
      monthLabelIcon: '●', monthLabelColor: '#ff0033', monthLabelSize: 150,
      fonts: { title: f("'Single Day', 'Noto Sans KR', sans-serif", 190, false), summary: f("'Noto Sans KR', sans-serif", 140, false), weekday: f("'Single Day', 'Noto Sans KR', sans-serif", 130, false), date: f("'Single Day', 'Noto Sans KR', sans-serif", 135, false), comment: f("'Noto Sans KR', sans-serif", 135, false) },
    },
    {
      name: '손글씨 내추럴',
      colors: { bg: '#f7fdf2', ink: '#2c4a1f', line: '#dcefc9', important: '#7cb342', top: '#4c7a1f' },
      colorNormal: '#f7fdf2', normalOpacity: 65, colorEmpty: '#8fa87f',
      importantOpacity: 20, topOpacity: 26, cellRadius: 2,
      monthLabelIcon: '🗓️', monthLabelColor: '#4c7a1f', monthLabelSize: 130,
      fonts: { title: f("'Nanum Pen Script', 'Noto Sans KR', sans-serif", 190, false), summary: f("'Gaegu', 'Noto Sans KR', sans-serif", 140, false), weekday: f("'Nanum Pen Script', 'Noto Sans KR', sans-serif", 130, false), date: f("'Nanum Pen Script', 'Noto Sans KR', sans-serif", 135, false), comment: f("'Gaegu', 'Noto Sans KR', sans-serif", 135, false) },
    },
    {
      name: '우아한',
      colors: { bg: '#fdf6f6', ink: '#3d1a1e', line: '#e8cfd0', important: '#8e3b45', top: '#5c1d24' },
      colorNormal: '#fdf6f6', normalOpacity: 65, colorEmpty: '#a9848a',
      importantOpacity: 18, topOpacity: 24, cellRadius: 0,
      monthLabelIcon: '▶', monthLabelColor: '#5c1d24', monthLabelSize: 120,
      fonts: { title: f("'Grandiflora One', 'Noto Serif KR', serif", 190, true), summary: f("'Diphylleia', 'Noto Serif KR', serif", 140, false), weekday: f("'Diphylleia', 'Noto Serif KR', serif", 130, false), date: f("'Grandiflora One', 'Noto Serif KR', serif", 135, false), comment: f("'Diphylleia', 'Noto Serif KR', serif", 135, false) },
    },
    {
      name: '모던 스타일',
      colors: { bg: '#faf7f0', ink: '#2e2a22', line: '#e6ddc8', important: '#8a6b3a', top: '#a13b2c' },
      colorNormal: '#faf7f0', normalOpacity: 65, colorEmpty: '#9c9482',
      importantOpacity: 20, topOpacity: 26, cellRadius: 1,
      monthLabelIcon: '▶', monthLabelColor: '#a13b2c', monthLabelSize: 130,
      fonts: { title: f("'Stylish', 'Noto Sans KR', sans-serif", 190, false), summary: f("'Diphylleia', 'Noto Serif KR', serif", 140, false), weekday: f("'Diphylleia', 'Noto Serif KR', serif", 130, false), date: f("'Stylish', 'Noto Sans KR', sans-serif", 135, false), comment: f("'Diphylleia', 'Noto Serif KR', serif", 135, false) },
    },
    {
      name: '디지털',
      colors: { bg: '#ffffff', ink: '#111111', line: '#cccccc', important: '#555555', top: '#000000' },
      colorNormal: '#ffffff', normalOpacity: 75, colorEmpty: '#aaaaaa',
      importantOpacity: 16, topOpacity: 22, cellRadius: 0,
      monthLabelIcon: '', monthLabelColor: '#111111', monthLabelSize: 130,
      fonts: { title: f("'Bitcount Prop Single', 'Noto Sans KR', monospace", 190, false), summary: f("'Noto Sans KR', sans-serif", 140, false), weekday: f("'Bitcount Prop Single', 'Noto Sans KR', monospace", 130, false), date: f("'Bitcount Prop Single', 'Noto Sans KR', monospace", 135, false), comment: f("'Noto Sans KR', sans-serif", 135, false) },
    },
    {
      name: '벚꽃',
      colors: { bg: '#fff8fa', ink: '#5a2f3d', line: '#f6d9e3', important: '#f0709a', top: '#d1276b' },
      colorNormal: '#fff8fa', normalOpacity: 60, colorEmpty: '#c093a1',
      importantOpacity: 22, topOpacity: 28, cellRadius: 3,
      monthLabelIcon: '⭐', monthLabelColor: '#d1276b', monthLabelSize: 135,
      fonts: { title: f("'Single Day', 'Noto Sans KR', sans-serif", 190, true), summary: f("'Gaegu', 'Noto Sans KR', sans-serif", 140, false), weekday: f("'Single Day', 'Noto Sans KR', sans-serif", 130, false), date: f("'Single Day', 'Noto Sans KR', sans-serif", 135, false), comment: f("'Gaegu', 'Noto Sans KR', sans-serif", 135, false) },
    },
    {
      name: '하늘·진지함',
      colors: { bg: '#f5fbff', ink: '#1e3a4f', line: '#cfe7f7', important: '#3ba3d9', top: '#0d6ba8' },
      colorNormal: '#f5fbff', normalOpacity: 65, colorEmpty: '#7fa3b8',
      importantOpacity: 18, topOpacity: 24, cellRadius: 1,
      monthLabelIcon: '📌', monthLabelColor: '#0d6ba8', monthLabelSize: 125,
      fonts: { title: f("'Noto Sans KR', sans-serif", 190, true), summary: f("'Noto Serif KR', serif", 140, false), weekday: f("'Noto Sans KR', sans-serif", 130, false), date: f("'Noto Sans KR', sans-serif", 135, false), comment: f("'Noto Serif KR', serif", 135, false) },
    },
    {
      name: '록 팝',
      colors: { bg: '#fff5f4', ink: '#2a1210', line: '#f0cfc9', important: '#c94f3f', top: '#7f1f16' },
      colorNormal: '#fff5f4', normalOpacity: 60, colorEmpty: '#a98a86',
      importantOpacity: 24, topOpacity: 30, cellRadius: 2,
      monthLabelIcon: '▶', monthLabelColor: '#7f1f16', monthLabelSize: 140,
      fonts: { title: f("'Black And White Picture', 'Noto Sans KR', sans-serif", 190, false), summary: f("'Noto Sans KR', sans-serif", 140, false), weekday: f("'Black And White Picture', 'Noto Sans KR', sans-serif", 130, false), date: f("'Black And White Picture', 'Noto Sans KR', sans-serif", 135, false), comment: f("'Noto Sans KR', sans-serif", 135, false) },
    },
  ],
};

// 中国語と同様、ドイツ語・フランス語・イタリア語・スペイン語も、配色(言語に
// 依存しない)は英語版を流用しつつ、フォントはそれぞれの専用フォントカタログ
// (FONT_CATALOG.de/fr/it/es)から選び直している(以前は英語版フォントの流用だった)。
const DESIGN_NAMES_DE = ['Basis', 'Süßes Pink', 'Poppig Lebendig', 'Natürlich Handschriftlich', 'Elegant', 'Moderne Schrift', 'Digital', 'Kirschblüte', 'Himmel & Ernst', 'Rock Pop'];
const DESIGN_FONTS_DE = [
  { title: f("'Fira Sans', sans-serif", 190, true), summary: f("'DM Sans', sans-serif", 140, false), weekday: f("'Fira Sans', sans-serif", 130, false), date: f("'Fira Sans', sans-serif", 135, false), comment: f("'DM Sans', sans-serif", 135, false) },
  { title: f("'Fredoka', sans-serif", 190, false), summary: f("'Comfortaa', sans-serif", 140, false), weekday: f("'Baloo 2', cursive", 130, true), date: f("'Baloo 2', cursive", 135, false), comment: f("'Comfortaa', sans-serif", 135, false) },
  { title: f("'Baloo 2', cursive", 190, false), summary: f("'DM Sans', sans-serif", 140, false), weekday: f("'Baloo 2', cursive", 130, false), date: f("'Baloo 2', cursive", 135, false), comment: f("'DM Sans', sans-serif", 135, false) },
  { title: f("'Caveat', cursive", 190, false), summary: f("'Caveat', cursive", 140, false), weekday: f("'Caveat', cursive", 130, false), date: f("'Caveat', cursive", 135, false), comment: f("'Caveat', cursive", 135, false) },
  { title: f("'Playfair Display', serif", 190, true), summary: f("'EB Garamond', serif", 140, false), weekday: f("'EB Garamond', serif", 130, false), date: f("'Playfair Display', serif", 135, false), comment: f("'EB Garamond', serif", 135, false) },
  { title: f("'Special Elite', cursive", 190, false), summary: f("'EB Garamond', serif", 140, false), weekday: f("'EB Garamond', serif", 130, false), date: f("'Special Elite', cursive", 135, false), comment: f("'EB Garamond', serif", 135, false) },
  { title: f("'Fira Sans', sans-serif", 190, true), summary: f("'DM Sans', sans-serif", 140, false), weekday: f("'Fira Sans', sans-serif", 130, false), date: f("'Fira Sans', sans-serif", 135, false), comment: f("'DM Sans', sans-serif", 135, false) },
  { title: f("'Sacramento', cursive", 190, true), summary: f("'Comfortaa', sans-serif", 140, false), weekday: f("'Sacramento', cursive", 130, false), date: f("'Sacramento', cursive", 135, false), comment: f("'Comfortaa', sans-serif", 135, false) },
  { title: f("'Fira Sans', sans-serif", 190, true), summary: f("'EB Garamond', serif", 140, false), weekday: f("'Fira Sans', sans-serif", 130, false), date: f("'Fira Sans', sans-serif", 135, false), comment: f("'EB Garamond', serif", 135, false) },
  { title: f("'UnifrakturMaguntia', cursive", 190, false), summary: f("'DM Sans', sans-serif", 140, false), weekday: f("'UnifrakturMaguntia', cursive", 130, false), date: f("'UnifrakturMaguntia', cursive", 135, false), comment: f("'DM Sans', sans-serif", 135, false) },
];
DESIGN_PRESETS.de = DESIGN_PRESETS.en.map((p, i) => ({ ...p, name: DESIGN_NAMES_DE[i], fonts: DESIGN_FONTS_DE[i] }));

const DESIGN_NAMES_FR = ['Basique', 'Rose mignon', 'Pop vif', 'Manuscrit naturel', 'Élégant', 'Écriture moderne', 'Numérique', 'Fleur de cerisier', 'Ciel & sérieux', 'Rock Pop'];
const DESIGN_FONTS_FR = [
  { title: f("'Josefin Sans', sans-serif", 190, true), summary: f("'Quicksand', sans-serif", 140, false), weekday: f("'Josefin Sans', sans-serif", 130, false), date: f("'Josefin Sans', sans-serif", 135, false), comment: f("'Quicksand', sans-serif", 135, false) },
  { title: f("'Fredoka', sans-serif", 190, false), summary: f("'Quicksand', sans-serif", 140, false), weekday: f("'Baloo 2', cursive", 130, true), date: f("'Baloo 2', cursive", 135, false), comment: f("'Quicksand', sans-serif", 135, false) },
  { title: f("'Bungee', cursive", 190, false), summary: f("'Poppins', sans-serif", 140, false), weekday: f("'Bungee', cursive", 130, false), date: f("'Bungee', cursive", 135, false), comment: f("'Poppins', sans-serif", 135, false) },
  { title: f("'Alex Brush', cursive", 190, false), summary: f("'Dancing Script', cursive", 140, false), weekday: f("'Alex Brush', cursive", 130, false), date: f("'Alex Brush', cursive", 135, false), comment: f("'Dancing Script', cursive", 135, false) },
  { title: f("'Italiana', serif", 190, true), summary: f("'Cormorant', serif", 140, false), weekday: f("'Cormorant', serif", 130, false), date: f("'Italiana', serif", 135, false), comment: f("'Cormorant', serif", 135, false) },
  { title: f("'Special Elite', cursive", 190, false), summary: f("'Cormorant', serif", 140, false), weekday: f("'Cormorant', serif", 130, false), date: f("'Special Elite', cursive", 135, false), comment: f("'Cormorant', serif", 135, false) },
  { title: f("'Josefin Sans', sans-serif", 190, true), summary: f("'Poppins', sans-serif", 140, false), weekday: f("'Josefin Sans', sans-serif", 130, false), date: f("'Josefin Sans', sans-serif", 135, false), comment: f("'Poppins', sans-serif", 135, false) },
  { title: f("'Great Vibes', cursive", 190, true), summary: f("'Quicksand', sans-serif", 140, false), weekday: f("'Great Vibes', cursive", 130, false), date: f("'Great Vibes', cursive", 135, false), comment: f("'Quicksand', sans-serif", 135, false) },
  { title: f("'Josefin Sans', sans-serif", 190, true), summary: f("'Cormorant', serif", 140, false), weekday: f("'Josefin Sans', sans-serif", 130, false), date: f("'Josefin Sans', sans-serif", 135, false), comment: f("'Cormorant', serif", 135, false) },
  { title: f("'Alfa Slab One', cursive", 190, false), summary: f("'Poppins', sans-serif", 140, false), weekday: f("'Alfa Slab One', cursive", 130, false), date: f("'Alfa Slab One', cursive", 135, false), comment: f("'Poppins', sans-serif", 135, false) },
];
DESIGN_PRESETS.fr = DESIGN_PRESETS.en.map((p, i) => ({ ...p, name: DESIGN_NAMES_FR[i], fonts: DESIGN_FONTS_FR[i] }));

const DESIGN_NAMES_IT = ['Base', 'Rosa carino', 'Pop vivace', 'Scrittura naturale', 'Elegante', 'Scrittura moderna', 'Digitale', 'Fiore di ciliegio', 'Cielo e serietà', 'Rock Pop'];
const DESIGN_FONTS_IT = [
  { title: f("'Rubik', sans-serif", 190, true), summary: f("'Nunito', sans-serif", 140, false), weekday: f("'Rubik', sans-serif", 130, false), date: f("'Rubik', sans-serif", 135, false), comment: f("'Nunito', sans-serif", 135, false) },
  { title: f("'Fredoka', sans-serif", 190, false), summary: f("'Nunito', sans-serif", 140, false), weekday: f("'Baloo 2', cursive", 130, true), date: f("'Baloo 2', cursive", 135, false), comment: f("'Nunito', sans-serif", 135, false) },
  { title: f("'Righteous', cursive", 190, false), summary: f("'Nunito', sans-serif", 140, false), weekday: f("'Righteous', cursive", 130, false), date: f("'Righteous', cursive", 135, false), comment: f("'Nunito', sans-serif", 135, false) },
  { title: f("'Pacifico', cursive", 190, false), summary: f("'Dancing Script', cursive", 140, false), weekday: f("'Pacifico', cursive", 130, false), date: f("'Pacifico', cursive", 135, false), comment: f("'Dancing Script', cursive", 135, false) },
  { title: f("'Cinzel', serif", 190, true), summary: f("'Cormorant', serif", 140, false), weekday: f("'Cormorant', serif", 130, false), date: f("'Cinzel', serif", 135, false), comment: f("'Cormorant', serif", 135, false) },
  { title: f("'Special Elite', cursive", 190, false), summary: f("'Cormorant', serif", 140, false), weekday: f("'Cormorant', serif", 130, false), date: f("'Special Elite', cursive", 135, false), comment: f("'Cormorant', serif", 135, false) },
  { title: f("'Rubik', sans-serif", 190, true), summary: f("'Nunito', sans-serif", 140, false), weekday: f("'Rubik', sans-serif", 130, false), date: f("'Rubik', sans-serif", 135, false), comment: f("'Nunito', sans-serif", 135, false) },
  { title: f("'Great Vibes', cursive", 190, true), summary: f("'Nunito', sans-serif", 140, false), weekday: f("'Great Vibes', cursive", 130, false), date: f("'Great Vibes', cursive", 135, false), comment: f("'Nunito', sans-serif", 135, false) },
  { title: f("'Rubik', sans-serif", 190, true), summary: f("'Cormorant', serif", 140, false), weekday: f("'Rubik', sans-serif", 130, false), date: f("'Rubik', sans-serif", 135, false), comment: f("'Cormorant', serif", 135, false) },
  { title: f("'Abril Fatface', serif", 190, false), summary: f("'Nunito', sans-serif", 140, false), weekday: f("'Abril Fatface', serif", 130, false), date: f("'Abril Fatface', serif", 135, false), comment: f("'Nunito', sans-serif", 135, false) },
];
DESIGN_PRESETS.it = DESIGN_PRESETS.en.map((p, i) => ({ ...p, name: DESIGN_NAMES_IT[i], fonts: DESIGN_FONTS_IT[i] }));

const DESIGN_NAMES_ES = ['Básico', 'Rosa bonito', 'Pop vívido', 'Manuscrito natural', 'Elegante', 'Escritura moderna', 'Digital', 'Flor de cerezo', 'Cielo y seriedad', 'Rock Pop'];
const DESIGN_FONTS_ES = [
  { title: f("'Poppins', sans-serif", 190, true), summary: f("'Nunito', sans-serif", 140, false), weekday: f("'Poppins', sans-serif", 130, false), date: f("'Poppins', sans-serif", 135, false), comment: f("'Nunito', sans-serif", 135, false) },
  { title: f("'Righteous', cursive", 190, false), summary: f("'Nunito', sans-serif", 140, false), weekday: f("'Baloo 2', cursive", 130, true), date: f("'Baloo 2', cursive", 135, false), comment: f("'Nunito', sans-serif", 135, false) },
  { title: f("'Bungee', cursive", 190, false), summary: f("'Nunito', sans-serif", 140, false), weekday: f("'Bungee', cursive", 130, false), date: f("'Bungee', cursive", 135, false), comment: f("'Nunito', sans-serif", 135, false) },
  { title: f("'Great Vibes', cursive", 190, false), summary: f("'Pacifico', cursive", 140, false), weekday: f("'Great Vibes', cursive", 130, false), date: f("'Great Vibes', cursive", 135, false), comment: f("'Pacifico', cursive", 135, false) },
  { title: f("'Playfair Display', serif", 190, true), summary: f("'Cormorant Garamond', serif", 140, false), weekday: f("'Cormorant Garamond', serif", 130, false), date: f("'Playfair Display', serif", 135, false), comment: f("'Cormorant Garamond', serif", 135, false) },
  { title: f("'Special Elite', cursive", 190, false), summary: f("'Cormorant Garamond', serif", 140, false), weekday: f("'Cormorant Garamond', serif", 130, false), date: f("'Special Elite', cursive", 135, false), comment: f("'Cormorant Garamond', serif", 135, false) },
  { title: f("'Poppins', sans-serif", 190, true), summary: f("'Nunito', sans-serif", 140, false), weekday: f("'Poppins', sans-serif", 130, false), date: f("'Poppins', sans-serif", 135, false), comment: f("'Nunito', sans-serif", 135, false) },
  { title: f("'Great Vibes', cursive", 190, true), summary: f("'Pacifico', cursive", 140, false), weekday: f("'Great Vibes', cursive", 130, false), date: f("'Great Vibes', cursive", 135, false), comment: f("'Pacifico', cursive", 135, false) },
  { title: f("'Poppins', sans-serif", 190, true), summary: f("'Cormorant Garamond', serif", 140, false), weekday: f("'Poppins', sans-serif", 130, false), date: f("'Poppins', sans-serif", 135, false), comment: f("'Cormorant Garamond', serif", 135, false) },
  { title: f("'Alfa Slab One', cursive", 190, false), summary: f("'Nunito', sans-serif", 140, false), weekday: f("'Alfa Slab One', cursive", 130, false), date: f("'Alfa Slab One', cursive", 135, false), comment: f("'Nunito', sans-serif", 135, false) },
];
DESIGN_PRESETS.es = DESIGN_PRESETS.en.map((p, i) => ({ ...p, name: DESIGN_NAMES_ES[i], fonts: DESIGN_FONTS_ES[i] }));

// 中国語は配色(言語に依存しない)は英語版を流用しつつ、フォントは
// 中国語フォントカタログ(FONT_CATALOG.zh)から選び直している。
const DESIGN_NAMES_ZH = ['基础', '可爱粉', '活力缤纷', '手写自然', '典雅', '现代书法', '数字风', '樱花', '晴空・认真', '摇滚流行'];
const DESIGN_FONTS_ZH = [
  { title: f("'Noto Sans SC', sans-serif", 190, true), summary: f("'Noto Sans SC', sans-serif", 140, false), weekday: f("'Noto Sans SC', sans-serif", 130, false), date: f("'Noto Sans SC', sans-serif", 135, false), comment: f("'Noto Sans SC', sans-serif", 135, false) },
  { title: f("'ZCOOL KuaiLe', 'Noto Sans SC', sans-serif", 190, false), summary: f("'Noto Sans SC', sans-serif", 140, false), weekday: f("'ZCOOL KuaiLe', 'Noto Sans SC', sans-serif", 130, true), date: f("'ZCOOL KuaiLe', 'Noto Sans SC', sans-serif", 135, false), comment: f("'Noto Sans SC', sans-serif", 135, false) },
  { title: f("'ZCOOL QingKe HuangYou', 'Noto Sans SC', sans-serif", 190, false), summary: f("'Noto Sans SC', sans-serif", 140, false), weekday: f("'ZCOOL QingKe HuangYou', 'Noto Sans SC', sans-serif", 130, false), date: f("'ZCOOL QingKe HuangYou', 'Noto Sans SC', sans-serif", 135, false), comment: f("'Noto Sans SC', sans-serif", 135, false) },
  { title: f("'Long Cang', 'Noto Sans SC', cursive", 190, false), summary: f("'Long Cang', 'Noto Sans SC', cursive", 140, false), weekday: f("'Long Cang', 'Noto Sans SC', cursive", 130, false), date: f("'Long Cang', 'Noto Sans SC', cursive", 135, false), comment: f("'Long Cang', 'Noto Sans SC', cursive", 135, false) },
  { title: f("'ZCOOL XiaoWei', 'Noto Serif SC', serif", 190, true), summary: f("'Noto Serif SC', serif", 140, false), weekday: f("'Noto Serif SC', serif", 130, false), date: f("'ZCOOL XiaoWei', 'Noto Serif SC', serif", 135, false), comment: f("'Noto Serif SC', serif", 135, false) },
  { title: f("'Zhi Mang Xing', 'Noto Sans SC', cursive", 190, false), summary: f("'Noto Serif SC', serif", 140, false), weekday: f("'Noto Serif SC', serif", 130, false), date: f("'Zhi Mang Xing', 'Noto Sans SC', cursive", 135, false), comment: f("'Noto Serif SC', serif", 135, false) },
  { title: f("'Bitcount Prop Single', 'Noto Sans SC', monospace", 190, false), summary: f("'Noto Sans SC', sans-serif", 140, false), weekday: f("'Bitcount Prop Single', 'Noto Sans SC', monospace", 130, false), date: f("'Bitcount Prop Single', 'Noto Sans SC', monospace", 135, false), comment: f("'Noto Sans SC', sans-serif", 135, false) },
  { title: f("'ZCOOL KuaiLe', 'Noto Sans SC', sans-serif", 190, true), summary: f("'Noto Sans SC', sans-serif", 140, false), weekday: f("'ZCOOL KuaiLe', 'Noto Sans SC', sans-serif", 130, false), date: f("'ZCOOL KuaiLe', 'Noto Sans SC', sans-serif", 135, false), comment: f("'Noto Sans SC', sans-serif", 135, false) },
  { title: f("'Noto Sans SC', sans-serif", 190, true), summary: f("'Noto Serif SC', serif", 140, false), weekday: f("'Noto Sans SC', sans-serif", 130, false), date: f("'Noto Sans SC', sans-serif", 135, false), comment: f("'Noto Serif SC', serif", 135, false) },
  { title: f("'Ma Shan Zheng', 'Noto Sans SC', cursive", 190, false), summary: f("'Noto Sans SC', sans-serif", 140, false), weekday: f("'Ma Shan Zheng', 'Noto Sans SC', cursive", 130, false), date: f("'Ma Shan Zheng', 'Noto Sans SC', cursive", 135, false), comment: f("'Noto Sans SC', sans-serif", 135, false) },
];
DESIGN_PRESETS.zh = DESIGN_PRESETS.en.map((p, i) => ({ ...p, name: DESIGN_NAMES_ZH[i], fonts: DESIGN_FONTS_ZH[i] }));

const FONT_TARGETS = ['title', 'summary', 'weekday', 'date', 'comment'];

/* ---------------- モードごとに別々に保存するレイアウト設定 ----------------
   面付け印刷モードはマスがとても小さいため、行間・余白・角丸などを
   カレンダー表示モード用に調整した値のまま使うと崩れて見える。
   そのため、この一覧のキーだけは「カレンダー/リスト表示」用と
   「面付け印刷」用で別々の値として保存・復元する。
   (配色やフォントの種類など、他の設定は今まで通り共通のまま) */
const LAYOUT_KEYS = [
  'cellLineHeight', 'fillPageHeight', 'cellPadTop', 'cellPadBottom',
  'autoResize', 'wrapMode', 'manualWidthMode', 'manualColWidths',
  'cellRadius', 'monthLabelSize',
];
const LAYOUT_KEY_DEFAULTS = {
  cellLineHeight: 125, fillPageHeight: false, cellPadTop: 1, cellPadBottom: 1,
  autoResize: true, wrapMode: 'wrap', manualWidthMode: false,
  manualColWidths: [1, 1, 1, 1, 1, 1, 1], cellRadius: 1, monthLabelSize: 130,
};
function layoutGroupFor(mode) { return mode === 'planner' ? 'planner' : 'calendar'; }
let currentLayoutGroup = 'calendar';

const _MISSING = Symbol('missing');
async function getLayoutSetting(key, group, fallbackDefault) {
  const v = await getSetting(`${key}__${group}`, _MISSING);
  if (v !== _MISSING) return v;
  // 未移行の既存データがあれば一度だけ引き継ぐ(それも無ければ既定値)
  const legacy = await getSetting(key, _MISSING);
  return legacy !== _MISSING ? legacy : fallbackDefault;
}

/* 表示モードを切り替えたときに、そのモード用に保存されているレイアウト設定を
   フォームへ反映する(保存済みが無ければ既定値)。 */
async function loadLayoutGroupIntoForm(group) {
  document.getElementById('cellLineHeight').value = await getLayoutSetting('cellLineHeight', group, LAYOUT_KEY_DEFAULTS.cellLineHeight);
  document.getElementById('cellLineHeightValue').textContent = document.getElementById('cellLineHeight').value + '%';
  document.getElementById('fillPageHeight').checked = await getLayoutSetting('fillPageHeight', group, LAYOUT_KEY_DEFAULTS.fillPageHeight);
  document.getElementById('cellPadTop').value = await getLayoutSetting('cellPadTop', group, LAYOUT_KEY_DEFAULTS.cellPadTop);
  document.getElementById('cellPadTopValue').textContent = document.getElementById('cellPadTop').value + 'mm';
  document.getElementById('cellPadBottom').value = await getLayoutSetting('cellPadBottom', group, LAYOUT_KEY_DEFAULTS.cellPadBottom);
  document.getElementById('cellPadBottomValue').textContent = document.getElementById('cellPadBottom').value + 'mm';
  document.getElementById('autoResize').checked = await getLayoutSetting('autoResize', group, LAYOUT_KEY_DEFAULTS.autoResize);
  const wrapMode = await getLayoutSetting('wrapMode', group, LAYOUT_KEY_DEFAULTS.wrapMode);
  document.querySelector(`input[name=wrapMode][value="${wrapMode}"]`).checked = true;
  document.getElementById('manualWidthMode').checked = await getLayoutSetting('manualWidthMode', group, LAYOUT_KEY_DEFAULTS.manualWidthMode);
  const manualColWidths = await getLayoutSetting('manualColWidths', group, LAYOUT_KEY_DEFAULTS.manualColWidths);
  document.querySelectorAll('.weekday-width-input').forEach((input, i) => {
    input.value = manualColWidths[i] || 1;
    input.nextSibling.textContent = Number(input.value).toFixed(1) + 'x';
  });
  document.getElementById('cellRadius').value = await getLayoutSetting('cellRadius', group, LAYOUT_KEY_DEFAULTS.cellRadius);
  document.getElementById('cellRadiusValue').textContent = document.getElementById('cellRadius').value + 'mm';
  document.getElementById('monthLabelSize').value = await getLayoutSetting('monthLabelSize', group, LAYOUT_KEY_DEFAULTS.monthLabelSize);
  document.getElementById('monthLabelSizeValue').textContent = document.getElementById('monthLabelSize').value + '%';
}
let zoomLevel = 0.55;
let bgImageObjectURL = null;
let plannerRowFracs = null; // 面付けモード: 行の内部境界線位置(0〜1の配列。長さ = 行数-1)
let plannerColFracs = null; // 面付けモード: 列の内部境界線位置(0〜1の配列。長さ = 列数-1)
let plannerCellRanges = null; // 面付けモード[手動割り当て]: マスごとの {startMonth, months}
let plannerDragCleanup = null; // 直前のドラッグ用イベントリスナーの解除関数

function buildOutlineShadow(rgb, width, strength) {
  const alpha = Math.min(1, strength / 10);
  const steps = 16;
  const shadows = [];
  for (let i = 0; i < steps; i++) {
    const angle = (2 * Math.PI * i) / steps;
    const x = (width * Math.cos(angle)).toFixed(2);
    const y = (width * Math.sin(angle)).toFixed(2);
    shadows.push(`${x}px ${y}px 0 rgba(${rgb},${alpha})`);
  }
  return shadows.join(', ');
}

async function boot() {
  await loadAll();
  const { uiLang, holidayCountry } = await getUiSettings();
  await loadI18n(uiLang);
  applyGoogleFontsForLocale(I18N_LANG);
  populateFontSelects();
  populateWeekdayWidthGrid();
  renderColorPresets();
  renderFontPresets();
  renderDesignPresets();
  setupLangSelect(uiLang);
  setupHolidayCountrySelect(holidayCountry);
  await loadSettingsIntoForm();
  await loadUserPresets();
  bindOptionEvents();
  await rebuildPreview();
}

// 表示言語の切り替え: フォントカタログ・フォントプリセット・デザインプリセット・
// 曜日ラベル・Google Fontsの読み込みをすべてその場で再構築する
function setupLangSelect(currentCode) {
  const sel = document.getElementById('uiLangSelect');
  populateUiLangSelect(sel, currentCode, async (code) => {
    await setUiLang(code);
    await loadI18n(code);
    applyGoogleFontsForLocale(I18N_LANG);
    populateFontSelects();
    populateWeekdayWidthGrid();
    renderFontPresets();
    renderDesignPresets();
    const countrySel = document.getElementById('holidayCountrySelect');
    populateHolidayCountrySelect(countrySel, countrySel.value, onHolidayCountryChange);
    updateRangeEcho();
    await rebuildPreview();
  });
}
async function onHolidayCountryChange(code) {
  await setHolidayCountry(code);
  await rebuildPreview();
}
function setupHolidayCountrySelect(currentCode) {
  const sel = document.getElementById('holidayCountrySelect');
  populateHolidayCountrySelect(sel, currentCode, onHolidayCountryChange);
}

// ---- Google Fonts CDN を、選択中の表示言語に必要なフォントだけ動的に読み込む ----
// (全言語分を1つの<link>で静的に読み込むと種類が多く初期表示が重くなるため、
//  言語切り替え時にその言語で使うフォントだけに<link>を差し替える方式にしている)
function buildGoogleFontsHref(families) {
  const params = families.map(fam => 'family=' + fam.replace(/ /g, '+') + ':wght@400;700').join('&');
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}
function applyGoogleFontsForLocale(lang) {
  const families = allFontFamiliesFor(lang);
  let link = document.getElementById('googleFontsLink');
  if (!link) {
    link = document.createElement('link');
    link.id = 'googleFontsLink';
    link.rel = 'stylesheet';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }
  link.href = buildGoogleFontsHref(families);
}

function updateRangeEcho() {
  const view = loadViewRange();
  const defaultEnd = endOfMonth(addMonths(view.viewStart, view.spanMonths - 1));
  const startStr = yearMonthLabel(view.viewStart.getFullYear(), view.viewStart.getMonth(), I18N_LANG);
  const endStr = yearMonthLabel(defaultEnd.getFullYear(), defaultEnd.getMonth(), I18N_LANG);
  document.getElementById('rangeEcho').textContent =
    t('print.rangeEcho', '編集画面の現在の表示範囲: {start} 〜 {end}').replace('{start}', startStr).replace('{end}', endStr);
}

function populateFontSelects() {
  const catalog = FONT_CATALOG[I18N_LANG] || FONT_CATALOG.ja;
  document.querySelectorAll('.font-family-select').forEach(sel => {
    sel.innerHTML = '';
    catalog.groups.forEach(group => {
      const og = document.createElement('optgroup');
      og.label = group.label;
      group.fonts.forEach(fo => {
        const opt = document.createElement('option');
        opt.value = fo.family;
        opt.textContent = fo.label;
        og.appendChild(opt);
      });
      sel.appendChild(og);
    });
  });
}

function populateWeekdayWidthGrid() {
  const grid = document.getElementById('weekdayWidthGrid');
  grid.innerHTML = '';
  weekdayLabels(I18N_LANG).forEach((w, i) => {
    const row = document.createElement('div');
    row.className = 'weekday-width-row';
    const label = document.createElement('span');
    label.textContent = w;
    const input = document.createElement('input');
    input.type = 'range'; input.min = '0.5'; input.max = '3'; input.step = '0.1'; input.value = '1';
    input.dataset.day = String(i);
    input.className = 'weekday-width-input';
    const valSpan = document.createElement('span');
    valSpan.textContent = '1.0x';
    input.addEventListener('input', () => { valSpan.textContent = Number(input.value).toFixed(1) + 'x'; });
    row.appendChild(label); row.appendChild(input); row.appendChild(valSpan);
    grid.appendChild(row);
  });
}

function renderColorPresets() {
  const grid = document.getElementById('colorPresets');
  grid.innerHTML = '';
  COLOR_PRESETS.forEach((p, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-swatch';
    btn.title = p.name;
    btn.dataset.presetIndex = i;
    btn.innerHTML = `<span style="background:${p.bg}"></span><span style="background:${p.important}"></span><span style="background:${p.top}"></span>`;
    btn.onclick = () => applyPreset(p);
    grid.appendChild(btn);
  });
}
function renderDesignPresets() {
  const grid = document.getElementById('designPresets');
  grid.innerHTML = '';
  const presets = DESIGN_PRESETS[I18N_LANG] || DESIGN_PRESETS.ja;
  presets.forEach(p => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'design-preset-btn';
    btn.innerHTML = `<span class="dp-swatch" style="background:${p.colors.bg}"><span style="background:${p.colors.important}"></span><span style="background:${p.colors.top}"></span></span><span class="dp-name">${p.name}</span>`;
    btn.onclick = () => applyDesignPreset(p);
    grid.appendChild(btn);
  });
}

function applyDesignPreset(p) {
  document.getElementById('colorBg').value = p.colors.bg;
  document.getElementById('colorInk').value = p.colors.ink;
  document.getElementById('colorLine').value = p.colors.line;
  document.getElementById('colorImportant').value = p.colors.important;
  document.getElementById('colorTop').value = p.colors.top;
  document.getElementById('colorNormal').value = p.colorNormal;
  document.getElementById('normalOpacity').value = p.normalOpacity;
  document.getElementById('normalOpacityValue').textContent = p.normalOpacity + '%';
  document.getElementById('colorEmpty').value = p.colorEmpty;
  document.getElementById('importantOpacity').value = p.importantOpacity;
  document.getElementById('importantOpacityValue').textContent = p.importantOpacity + '%';
  document.getElementById('topOpacity').value = p.topOpacity;
  document.getElementById('topOpacityValue').textContent = p.topOpacity + '%';
  document.getElementById('cellRadius').value = p.cellRadius;
  document.getElementById('cellRadiusValue').textContent = p.cellRadius + 'mm';
  document.getElementById('monthLabelIcon').value = p.monthLabelIcon;
  document.getElementById('monthLabelColor').value = p.monthLabelColor;
  document.getElementById('monthLabelSize').value = p.monthLabelSize;
  document.getElementById('monthLabelSizeValue').textContent = p.monthLabelSize + '%';
  FONT_TARGETS.forEach(t => {
    document.querySelector(`.font-family-select[data-target="${t}"]`).value = p.fonts[t].family;
    document.querySelector(`.font-size-range[data-target="${t}"]`).value = p.fonts[t].size;
    document.querySelector(`.font-bold-toggle[data-target="${t}"]`).checked = p.fonts[t].bold;
  });
  rebuildPreview();
}

function applyPreset(p) {
  document.getElementById('colorBg').value = p.bg;
  document.getElementById('colorInk').value = p.ink;
  document.getElementById('colorLine').value = p.line;
  document.getElementById('colorImportant').value = p.important;
  document.getElementById('colorTop').value = p.top;
  rebuildPreview();
}

/* ---------------- マイプリセット(全設定の保存・JSON書き出し/読み込み) ----------------
   デザインプリセットは配色・フォントだけだが、こちらは面付け設定や祝日・
   行間/余白といった「全ての」カスタマイズ設定をまるごと1つの名前で保存する。
   端末内(IndexedDB)に保存されるほか、JSONファイルとして書き出し/読み込みもできる。 */
let userPresets = [];

function downloadJSON(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

async function loadUserPresets() {
  userPresets = await getSetting('userPresets', []);
  renderUserPresetList();
}

function renderUserPresetList() {
  const wrap = document.getElementById('userPresetList');
  wrap.innerHTML = '';
  if (!userPresets.length) {
    const p = document.createElement('p');
    p.className = 'menu-hint';
    p.textContent = '保存されたプリセットはまだありません。';
    wrap.appendChild(p);
    return;
  }
  userPresets.forEach((preset, i) => {
    const row = document.createElement('div');
    row.className = 'user-preset-row';
    const name = document.createElement('span');
    name.className = 'upr-name';
    name.textContent = preset.name;
    const applyBtn = document.createElement('button');
    applyBtn.type = 'button'; applyBtn.className = 'upr-apply'; applyBtn.textContent = '適用';
    applyBtn.onclick = () => applyFullPreset(preset.data);
    const delBtn = document.createElement('button');
    delBtn.type = 'button'; delBtn.className = 'upr-delete'; delBtn.textContent = '削除';
    delBtn.onclick = async () => {
      if (!confirm(`プリセット「${preset.name}」を削除しますか?`)) return;
      userPresets.splice(i, 1);
      await setSetting('userPresets', userPresets);
      renderUserPresetList();
    };
    row.appendChild(name);
    row.appendChild(applyBtn);
    row.appendChild(delBtn);
    wrap.appendChild(row);
  });
}

function captureFullSettings() {
  return {
    ...readOptions(),
    plannerRowFracs: plannerRowFracs ? [...plannerRowFracs] : null,
    plannerColFracs: plannerColFracs ? [...plannerColFracs] : null,
    plannerCellRanges: plannerCellRanges ? JSON.parse(JSON.stringify(plannerCellRanges)) : null,
  };
}

async function saveCurrentAsUserPreset() {
  const name = (prompt('プリセット名を入力してください', `プリセット${userPresets.length + 1}`) || '').trim();
  if (!name) return;
  userPresets.push({ name, data: captureFullSettings() });
  await setSetting('userPresets', userPresets);
  renderUserPresetList();
}

function applyFullPreset(data) {
  if (!data) return;
  const setChecked = (name, value) => {
    const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (el) el.checked = true;
  };
  if (data.mode) { setChecked('printMode', data.mode); currentLayoutGroup = layoutGroupFor(data.mode); }
  if (data.pageFit) setChecked('pageFit', data.pageFit);
  if (data.orientation) setChecked('orientation', data.orientation);
  if (data.paperSize) document.getElementById('paperSize').value = data.paperSize;
  if (data.weekStart != null) setChecked('weekStart', data.weekStart);
  if (data.colorMode) setChecked('colorMode', data.colorMode);
  if (data.colors) {
    document.getElementById('colorBg').value = data.colors.bg;
    document.getElementById('colorInk').value = data.colors.ink;
    document.getElementById('colorLine').value = data.colors.line;
    document.getElementById('colorImportant').value = data.colors.important;
    document.getElementById('colorTop').value = data.colors.top;
  }
  if (data.colorNormal) document.getElementById('colorNormal').value = data.colorNormal;
  if (data.normalOpacity != null) { document.getElementById('normalOpacity').value = data.normalOpacity; document.getElementById('normalOpacityValue').textContent = data.normalOpacity + '%'; }
  if (data.colorEmpty) document.getElementById('colorEmpty').value = data.colorEmpty;
  if (data.monthLabelIcon != null) document.getElementById('monthLabelIcon').value = data.monthLabelIcon;
  if (data.monthLabelColor) document.getElementById('monthLabelColor').value = data.monthLabelColor;
  if (data.monthLabelSize != null) { document.getElementById('monthLabelSize').value = data.monthLabelSize; document.getElementById('monthLabelSizeValue').textContent = data.monthLabelSize + '%'; }
  if (data.summaryBorderStyle) document.getElementById('summaryBorderStyle').value = data.summaryBorderStyle;
  if (data.summaryBg) document.getElementById('summaryBg').value = data.summaryBg;
  if (data.summaryBgOpacity != null) { document.getElementById('summaryBgOpacity').value = data.summaryBgOpacity; document.getElementById('summaryBgOpacityValue').textContent = data.summaryBgOpacity + '%'; }
  if (data.autoResize != null) document.getElementById('autoResize').checked = data.autoResize;
  if (data.wrapMode) setChecked('wrapMode', data.wrapMode);
  if (data.cellLineHeight != null) { document.getElementById('cellLineHeight').value = data.cellLineHeight; document.getElementById('cellLineHeightValue').textContent = data.cellLineHeight + '%'; }
  if (data.fillPageHeight != null) document.getElementById('fillPageHeight').checked = data.fillPageHeight;
  if (data.cellPadTop != null) { document.getElementById('cellPadTop').value = data.cellPadTop; document.getElementById('cellPadTopValue').textContent = data.cellPadTop + 'mm'; }
  if (data.cellPadBottom != null) { document.getElementById('cellPadBottom').value = data.cellPadBottom; document.getElementById('cellPadBottomValue').textContent = data.cellPadBottom + 'mm'; }
  if (data.monthBreak != null) setChecked('monthBreak', data.monthBreak ? '1' : '0');
  if (data.manualWidthMode != null) document.getElementById('manualWidthMode').checked = data.manualWidthMode;
  if (Array.isArray(data.manualColWidths)) {
    document.querySelectorAll('.weekday-width-input').forEach((input, i) => {
      input.value = data.manualColWidths[i] || 1;
      input.nextSibling.textContent = Number(input.value).toFixed(1) + 'x';
    });
  }
  if (data.cellRadius != null) { document.getElementById('cellRadius').value = data.cellRadius; document.getElementById('cellRadiusValue').textContent = data.cellRadius + 'mm'; }
  if (data.textOutline) document.getElementById('textOutline').value = data.textOutline;
  if (data.outlineWidth != null) { document.getElementById('outlineWidth').value = data.outlineWidth; document.getElementById('outlineWidthValue').textContent = data.outlineWidth + 'px'; }
  if (data.outlineStrength != null) { document.getElementById('outlineStrength').value = data.outlineStrength; document.getElementById('outlineStrengthValue').textContent = data.outlineStrength; }
  if (data.importantOpacity != null) { document.getElementById('importantOpacity').value = data.importantOpacity; document.getElementById('importantOpacityValue').textContent = data.importantOpacity + '%'; }
  if (data.topOpacity != null) { document.getElementById('topOpacity').value = data.topOpacity; document.getElementById('topOpacityValue').textContent = data.topOpacity + '%'; }
  if (data.bgImageOpacity != null) { document.getElementById('bgImageOpacity').value = data.bgImageOpacity; document.getElementById('bgImageOpacityValue').textContent = data.bgImageOpacity + '%'; }
  // 表示言語(lang)はプリセットには含めない(UIの表示言語は端末ごとの
  // 好みであり、デザインの一部として保存・復元するものではないため)。
  // 祝日の国(holidayRegion)は復元する。以前は存在しない#holidayRegion要素を
  // 直接書き換えようとしてエラーになっていたバグがあったため、正しい
  // #holidayCountrySelect を更新し、setHolidayCountry()で保存もする。
  if (data.holidayRegion) {
    const countrySel = document.getElementById('holidayCountrySelect');
    if (countrySel) { countrySel.value = data.holidayRegion; setHolidayCountry(data.holidayRegion); }
  }
  if (data.colorHoliday) document.getElementById('colorHoliday').value = data.colorHoliday;
  if (data.plannerRows != null) document.getElementById('plannerRows').value = data.plannerRows;
  if (data.plannerCols != null) document.getElementById('plannerCols').value = data.plannerCols;
  if (data.plannerScale != null) { document.getElementById('plannerScale').value = data.plannerScale; document.getElementById('plannerScaleValue').textContent = data.plannerScale + '%'; }
  if (data.plannerAssignMode) document.getElementById('plannerAssignMode').value = data.plannerAssignMode;
  if (data.plannerCompact != null) document.getElementById('plannerCompact').checked = data.plannerCompact;
  if (data.fonts) {
    FONT_TARGETS.forEach(t => {
      if (!data.fonts[t]) return;
      const fSel = document.querySelector(`.font-family-select[data-target="${t}"]`);
      const sRange = document.querySelector(`.font-size-range[data-target="${t}"]`);
      const bChk = document.querySelector(`.font-bold-toggle[data-target="${t}"]`);
      if (data.fonts[t].family) fSel.value = data.fonts[t].family;
      if (data.fonts[t].size != null) sRange.value = data.fonts[t].size;
      bChk.checked = !!data.fonts[t].bold;
    });
  }
  if (data.title != null) document.getElementById('scheduleTitle').value = data.title;
  if (data.summary != null) document.getElementById('scheduleSummary').value = data.summary;
  if (data.showDateRange != null) document.getElementById('showDateRange').checked = data.showDateRange;
  if (data.rangeStart) document.getElementById('rangeStart').value = data.rangeStart;
  if (data.rangeEnd) document.getElementById('rangeEnd').value = data.rangeEnd;

  if (Array.isArray(data.plannerRowFracs)) plannerRowFracs = data.plannerRowFracs;
  if (Array.isArray(data.plannerColFracs)) plannerColFracs = data.plannerColFracs;
  if (Array.isArray(data.plannerCellRanges)) {
    plannerCellRanges = data.plannerCellRanges;
    renderPlannerCellAssignUI();
  }

  rebuildPreview();
}

function exportUserPresetsToFile() {
  if (!userPresets.length) { alert('書き出せるプリセットがまだありません。先に「現在の設定を保存」してください。'); return; }
  downloadJSON('flexcal-presets.json', userPresets);
}

async function importUserPresetsFromFile(file) {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    let incoming = [];
    if (Array.isArray(parsed)) incoming = parsed.filter(p => p && typeof p.name === 'string' && p.data);
    else if (parsed && typeof parsed.name === 'string' && parsed.data) incoming = [parsed];
    if (!incoming.length) throw new Error('empty');
    userPresets = userPresets.concat(incoming);
    await setSetting('userPresets', userPresets);
    renderUserPresetList();
    alert(`${incoming.length}件のプリセットを読み込みました。`);
  } catch (err) {
    alert('プリセットファイルの読み込みに失敗しました。このアプリから書き出したJSONファイルを指定してください。');
  }
}

function renderFontPresets() {
  const grid = document.getElementById('fontPresets');
  grid.innerHTML = '';
  const presets = FONT_PRESETS[I18N_LANG] || FONT_PRESETS.ja;
  presets.forEach(p => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'font-preset-btn';
    btn.textContent = p.name;
    btn.onclick = () => applyFontPreset(p);
    grid.appendChild(btn);
  });
}
function applyFontPreset(p) {
  FONT_TARGETS.forEach(t => {
    document.querySelector(`.font-family-select[data-target="${t}"]`).value = p[t];
  });
  rebuildPreview();
}

/* ---------------- Settings ---------------- */
async function loadSettingsIntoForm() {
  const view = loadViewRange();
  const defaultStart = view.viewStart;
  const defaultEnd = endOfMonth(addMonths(view.viewStart, view.spanMonths - 1));

  document.getElementById('scheduleTitle').value = await getSetting('scheduleTitle', 'study schedule');
  document.getElementById('scheduleSummary').value = await getSetting('scheduleSummary', '');
  document.getElementById('showDateRange').checked = await getSetting('showDateRange', true);
  document.getElementById('rangeStart').value = await getSetting('rangeStart', fmtDate(defaultStart));
  document.getElementById('rangeEnd').value = await getSetting('rangeEnd', fmtDate(defaultEnd));
  const orientation = await getSetting('orientation', 'portrait');
  document.querySelector(`input[name=orientation][value="${orientation}"]`).checked = true;
  document.getElementById('paperSize').value = await getSetting('paperSize', 'a4');
  const weekStart = await getSetting('weekStart', 0);
  document.querySelector(`input[name=weekStart][value="${weekStart}"]`).checked = true;
  const colorMode = await getSetting('colorMode', 'color');
  const colorModeInput = document.querySelector(`input[name=colorMode][value="${colorMode}"]`);
  if (colorModeInput) colorModeInput.checked = true;

  const colors = await getSetting('colors', COLOR_PRESETS[0]);
  document.getElementById('colorBg').value = colors.bg;
  document.getElementById('colorInk').value = colors.ink;
  document.getElementById('colorLine').value = colors.line;
  document.getElementById('colorImportant').value = colors.important;
  document.getElementById('colorTop').value = colors.top;
  document.getElementById('colorNormal').value = await getSetting('colorNormal', '#ffffff');
  document.getElementById('normalOpacity').value = await getSetting('normalOpacity', 70);
  document.getElementById('normalOpacityValue').textContent = document.getElementById('normalOpacity').value + '%';
  document.getElementById('colorEmpty').value = await getSetting('colorEmpty', '#767b74');
  document.getElementById('monthLabelIcon').value = await getSetting('monthLabelIcon', '');
  document.getElementById('monthLabelColor').value = await getSetting('monthLabelColor', '#202b24');

  document.getElementById('summaryBorderStyle').value = await getSetting('summaryBorderStyle', 'dashed');
  document.getElementById('summaryBg').value = await getSetting('summaryBg', '#ffffff');
  document.getElementById('summaryBgOpacity').value = await getSetting('summaryBgOpacity', 0);
  document.getElementById('summaryBgOpacityValue').textContent = document.getElementById('summaryBgOpacity').value + '%';
  const monthBreak = await getSetting('monthBreak', false);
  document.querySelector(`input[name=monthBreak][value="${monthBreak ? '1' : '0'}"]`).checked = true;

  // 表示モード(カレンダー/リスト/面付け)とページ数設定は、以前は保存先が
  // 抜けており、リロードのたびに既定値(カレンダー表示・A4 1枚に収める)へ
  // 戻ってしまっていたバグがあった。ここで復元する。
  const printMode = await getSetting('printMode', 'calendar');
  const printModeInput = document.querySelector(`input[name=printMode][value="${printMode}"]`);
  if (printModeInput) printModeInput.checked = true;
  const pageFit = await getSetting('pageFit', '1');
  const pageFitInput = document.querySelector(`input[name=pageFit][value="${pageFit}"]`);
  if (pageFitInput) pageFitInput.checked = true;

  // カレンダー/リスト表示 と 面付け印刷 で別々に保存されているレイアウト設定
  // (行間・余白・マスの角丸・自動調整など)を、現在のモード用に読み込む
  currentLayoutGroup = layoutGroupFor(printMode);
  await loadLayoutGroupIntoForm(currentLayoutGroup);

  document.getElementById('textOutline').value = await getSetting('textOutline', 'none');
  document.getElementById('outlineWidth').value = await getSetting('outlineWidth', 1.5);
  document.getElementById('outlineWidthValue').textContent = document.getElementById('outlineWidth').value + 'px';
  document.getElementById('outlineStrength').value = await getSetting('outlineStrength', 6);
  document.getElementById('outlineStrengthValue').textContent = document.getElementById('outlineStrength').value;
  document.getElementById('importantOpacity').value = await getSetting('importantOpacity', 16);
  document.getElementById('importantOpacityValue').textContent = document.getElementById('importantOpacity').value + '%';
  document.getElementById('topOpacity').value = await getSetting('topOpacity', 20);
  document.getElementById('topOpacityValue').textContent = document.getElementById('topOpacity').value + '%';
  document.getElementById('bgImageOpacity').value = await getSetting('bgImageOpacity', 100);
  document.getElementById('bgImageOpacityValue').textContent = document.getElementById('bgImageOpacity').value + '%';
  // 表示言語(uiLang)・祝日の国(holidayCountry)は、それぞれ setupLangSelect() /
  // setupHolidayCountrySelect() が getUiSettings() の値を使って個別に復元する
  // (persistSettings() 経由の他の項目とは別枠で、getUiSettings()/setUiLang()/
  //  setHolidayCountry() を通じて保存されているため)。
  document.getElementById('colorHoliday').value = await getSetting('colorHoliday', '#c8443c');
  document.getElementById('plannerRows').value = await getSetting('plannerRows', 2);
  document.getElementById('plannerCols').value = await getSetting('plannerCols', 2);
  document.getElementById('plannerScale').value = await getSetting('plannerScale', 100);
  document.getElementById('plannerScaleValue').textContent = document.getElementById('plannerScale').value + '%';
  plannerRowFracs = await getSetting('plannerRowFracs', null);
  plannerColFracs = await getSetting('plannerColFracs', null);
  plannerCellRanges = await getSetting('plannerCellRanges', null);
  document.getElementById('plannerAssignMode').value = await getSetting('plannerAssignMode', 'same');
  document.getElementById('plannerCompact').checked = await getSetting('plannerCompact', false);

  const fonts = await getSetting('fonts', null);
  FONT_TARGETS.forEach(t => {
    const fSel = document.querySelector(`.font-family-select[data-target="${t}"]`);
    const sRange = document.querySelector(`.font-size-range[data-target="${t}"]`);
    const bChk = document.querySelector(`.font-bold-toggle[data-target="${t}"]`);
    fSel.value = (fonts && fonts[t] && fonts[t].family) || firstFontFamily(I18N_LANG);
    sRange.value = (fonts && fonts[t] && fonts[t].size) || sRange.value;
    bChk.checked = fonts && fonts[t] ? !!fonts[t].bold : (t === 'title');
  });

  const bgBlob = await getSetting('bgImageBlob', null);
  if (bgBlob) {
    if (bgImageObjectURL) URL.revokeObjectURL(bgImageObjectURL);
    bgImageObjectURL = URL.createObjectURL(bgBlob);
  }

  updateRangeEcho();
}

function readOptions() {
  const colorModeInput = document.querySelector('input[name=colorMode]:checked');
  const fonts = {};
  FONT_TARGETS.forEach(t => {
    fonts[t] = {
      family: document.querySelector(`.font-family-select[data-target="${t}"]`).value,
      size: Number(document.querySelector(`.font-size-range[data-target="${t}"]`).value),
      bold: document.querySelector(`.font-bold-toggle[data-target="${t}"]`).checked,
    };
  });
  return {
    mode: document.querySelector('input[name=printMode]:checked').value,
    pageFit: document.querySelector('input[name=pageFit]:checked').value,
    orientation: document.querySelector('input[name=orientation]:checked').value,
    paperSize: document.getElementById('paperSize').value,
    weekStart: Number(document.querySelector('input[name=weekStart]:checked').value),
    colorMode: colorModeInput ? colorModeInput.value : 'color',
    colors: {
      bg: document.getElementById('colorBg').value,
      ink: document.getElementById('colorInk').value,
      line: document.getElementById('colorLine').value,
      important: document.getElementById('colorImportant').value,
      top: document.getElementById('colorTop').value,
    },
    colorNormal: document.getElementById('colorNormal').value,
    normalOpacity: Number(document.getElementById('normalOpacity').value),
    colorEmpty: document.getElementById('colorEmpty').value,
    monthLabelIcon: document.getElementById('monthLabelIcon').value,
    monthLabelColor: document.getElementById('monthLabelColor').value,
    monthLabelSize: Number(document.getElementById('monthLabelSize').value),
    summaryBorderStyle: document.getElementById('summaryBorderStyle').value,
    summaryBg: document.getElementById('summaryBg').value,
    summaryBgOpacity: Number(document.getElementById('summaryBgOpacity').value),
    autoResize: document.getElementById('autoResize').checked,
    wrapMode: document.querySelector('input[name=wrapMode]:checked').value,
    cellLineHeight: Number(document.getElementById('cellLineHeight').value),
    fillPageHeight: document.getElementById('fillPageHeight').checked,
    cellPadTop: Number(document.getElementById('cellPadTop').value),
    cellPadBottom: Number(document.getElementById('cellPadBottom').value),
    monthBreak: document.querySelector('input[name=monthBreak]:checked').value === '1',
    manualWidthMode: document.getElementById('manualWidthMode').checked,
    manualColWidths: Array.from({ length: 7 }, (_, i) => Number(document.querySelector(`.weekday-width-input[data-day="${i}"]`).value)),
    cellRadius: Number(document.getElementById('cellRadius').value),
    textOutline: document.getElementById('textOutline').value,
    outlineWidth: Number(document.getElementById('outlineWidth').value),
    outlineStrength: Number(document.getElementById('outlineStrength').value),
    importantOpacity: Number(document.getElementById('importantOpacity').value),
    topOpacity: Number(document.getElementById('topOpacity').value),
    bgImageOpacity: Number(document.getElementById('bgImageOpacity').value),
    lang: I18N_LANG,
    holidayRegion: document.getElementById('holidayCountrySelect').value,
    colorHoliday: document.getElementById('colorHoliday').value,
    plannerRows: Math.max(1, Math.min(6, Number(document.getElementById('plannerRows').value) || 1)),
    plannerCols: Math.max(1, Math.min(6, Number(document.getElementById('plannerCols').value) || 1)),
    plannerScale: Number(document.getElementById('plannerScale').value),
    plannerAssignMode: document.getElementById('plannerAssignMode').value,
    plannerCompact: document.getElementById('plannerCompact').checked,
    fonts,
    title: document.getElementById('scheduleTitle').value.trim() || 'study schedule',
    summary: document.getElementById('scheduleSummary').value.trim(),
    showDateRange: document.getElementById('showDateRange').checked,
    rangeStart: document.getElementById('rangeStart').value,
    rangeEnd: document.getElementById('rangeEnd').value,
  };
}

async function persistSettings(opts) {
  await setSetting('printMode', opts.mode);
  await setSetting('pageFit', opts.pageFit);
  await setSetting('scheduleTitle', opts.title);
  await setSetting('scheduleSummary', opts.summary);
  await setSetting('showDateRange', opts.showDateRange);
  await setSetting('rangeStart', opts.rangeStart);
  await setSetting('rangeEnd', opts.rangeEnd);
  await setSetting('orientation', opts.orientation);
  await setSetting('paperSize', opts.paperSize);
  await setSetting('weekStart', opts.weekStart);
  await setSetting('colorMode', opts.colorMode);
  await setSetting('colors', opts.colors);
  await setSetting('colorNormal', opts.colorNormal);
  await setSetting('normalOpacity', opts.normalOpacity);
  await setSetting('colorEmpty', opts.colorEmpty);
  await setSetting('monthLabelIcon', opts.monthLabelIcon);
  await setSetting('monthLabelColor', opts.monthLabelColor);
  await setSetting('summaryBorderStyle', opts.summaryBorderStyle);
  await setSetting('summaryBg', opts.summaryBg);
  await setSetting('summaryBgOpacity', opts.summaryBgOpacity);
  await setSetting('monthBreak', opts.monthBreak);
  // 行間・余白・角丸・自動調整などは、カレンダー表示/面付け印刷それぞれ専用に保存する
  const layoutGroup = layoutGroupFor(opts.mode);
  for (const key of LAYOUT_KEYS) {
    await setSetting(`${key}__${layoutGroup}`, opts[key]);
  }
  await setSetting('textOutline', opts.textOutline);
  await setSetting('outlineWidth', opts.outlineWidth);
  await setSetting('outlineStrength', opts.outlineStrength);
  await setSetting('importantOpacity', opts.importantOpacity);
  await setSetting('topOpacity', opts.topOpacity);
  await setSetting('bgImageOpacity', opts.bgImageOpacity);
  // 表示言語(uiLang)・祝日の国(holidayCountry)は setUiLang()/setHolidayCountry() が
  // 個別に保存するため、ここでは扱わない(shared.js の getUiSettings() 参照)。
  await setSetting('colorHoliday', opts.colorHoliday);
  await setSetting('plannerRows', opts.plannerRows);
  await setSetting('plannerCols', opts.plannerCols);
  await setSetting('plannerScale', opts.plannerScale);
  await setSetting('plannerAssignMode', opts.plannerAssignMode);
  await setSetting('plannerCompact', opts.plannerCompact);
  await setSetting('fonts', opts.fonts);
}

function bindOptionEvents() {
  document.querySelectorAll('.print-options input, .print-options select, .print-options textarea').forEach(el => {
    if (el.name === 'printMode') return; // 表示モードは下の専用ハンドラでレイアウト切り替えと合わせて処理する
    if (el.id === 'uiLangSelect' || el.id === 'holidayCountrySelect') return; // 専用リスナー(setupLangSelect/setupHolidayCountrySelect)で処理
    el.addEventListener('input', () => {
      document.getElementById('cellRadiusValue').textContent = document.getElementById('cellRadius').value + 'mm';
      document.getElementById('outlineWidthValue').textContent = document.getElementById('outlineWidth').value + 'px';
      document.getElementById('outlineStrengthValue').textContent = document.getElementById('outlineStrength').value;
      document.getElementById('importantOpacityValue').textContent = document.getElementById('importantOpacity').value + '%';
      document.getElementById('topOpacityValue').textContent = document.getElementById('topOpacity').value + '%';
      document.getElementById('bgImageOpacityValue').textContent = document.getElementById('bgImageOpacity').value + '%';
      document.getElementById('normalOpacityValue').textContent = document.getElementById('normalOpacity').value + '%';
      document.getElementById('monthLabelSizeValue').textContent = document.getElementById('monthLabelSize').value + '%';
      document.getElementById('cellPadTopValue').textContent = document.getElementById('cellPadTop').value + 'mm';
      document.getElementById('cellPadBottomValue').textContent = document.getElementById('cellPadBottom').value + 'mm';
      document.getElementById('cellLineHeightValue').textContent = document.getElementById('cellLineHeight').value + '%';
      document.getElementById('summaryBgOpacityValue').textContent = document.getElementById('summaryBgOpacity').value + '%';
      document.getElementById('plannerScaleValue').textContent = document.getElementById('plannerScale').value + '%';
      rebuildPreview();
    });
  });
  // 表示モード(カレンダー/リスト/面付け)の切り替え:
  // 行間・余白・角丸などのレイアウト設定は、切り替え先のモード用に保存されている値を
  // 先に読み込んでからプレビューを再構築する(これをしないと、面付けモード用に
  // 調整した値がカレンダー表示にそのまま適用されて崩れてしまう)。
  document.querySelectorAll('input[name=printMode]').forEach(radio => {
    radio.addEventListener('change', async () => {
      const newGroup = layoutGroupFor(radio.value);
      if (newGroup !== currentLayoutGroup) {
        currentLayoutGroup = newGroup;
        await loadLayoutGroupIntoForm(newGroup);
      }
      rebuildPreview();
    });
  });
  document.getElementById('resetColors').onclick = () => applyPreset(COLOR_PRESETS[0]);
  document.getElementById('saveUserPreset').onclick = saveCurrentAsUserPreset;
  document.getElementById('exportUserPresets').onclick = exportUserPresetsToFile;
  document.getElementById('importUserPresets').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await importUserPresetsFromFile(file);
    e.target.value = '';
  });
  document.getElementById('plannerResetGrid').onclick = () => {
    plannerRowFracs = evenFracs(Number(document.getElementById('plannerRows').value) || 1);
    plannerColFracs = evenFracs(Number(document.getElementById('plannerCols').value) || 1);
    setSetting('plannerRowFracs', plannerRowFracs);
    setSetting('plannerColFracs', plannerColFracs);
    rebuildPreview();
  };
  document.getElementById('syncFromEditor').onclick = async () => {
    const view = loadViewRange();
    document.getElementById('rangeStart').value = fmtDate(view.viewStart);
    document.getElementById('rangeEnd').value = fmtDate(endOfMonth(addMonths(view.viewStart, view.spanMonths - 1)));
    await rebuildPreview();
  };
  document.getElementById('bgImageFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await setSetting('bgImageBlob', file);
    if (bgImageObjectURL) URL.revokeObjectURL(bgImageObjectURL);
    bgImageObjectURL = URL.createObjectURL(file);
    rebuildPreview();
  });
  document.getElementById('bgImageClear').onclick = async () => {
    await setSetting('bgImageBlob', null);
    if (bgImageObjectURL) { URL.revokeObjectURL(bgImageObjectURL); bgImageObjectURL = null; }
    rebuildPreview();
  };

  document.getElementById('doPrint').onclick = () => window.print();

  document.querySelectorAll('.modal-backdrop').forEach(bd => {
    bd.addEventListener('click', (e) => { if (e.target === bd) bd.hidden = true; });
  });

  document.getElementById('zoomIn').onclick = () => setZoom(zoomLevel + 0.1);
  document.getElementById('zoomOut').onclick = () => setZoom(zoomLevel - 0.1);
  document.getElementById('zoomFit').onclick = () => {
    const areaWidth = document.querySelector('.preview-area').clientWidth - 48;
    const size = pageSizeFor(readOptions());
    setZoom(Math.max(0.15, Math.min(1.5, areaWidth / (size.w * MM_PER_PX))));
  };
}

function setZoom(v) {
  zoomLevel = Math.max(0.15, Math.min(2, v));
  document.getElementById('zoomValue').textContent = Math.round(zoomLevel * 100) + '%';
  applyZoomToFrames();
}

function applyZoomToFrames() {
  const opts = readOptions();
  const size = pageSizeFor(opts);
  const wPx = size.w * MM_PER_PX * zoomLevel;
  const hPx = size.h * MM_PER_PX * zoomLevel;
  document.querySelectorAll('.page-frame').forEach(frame => {
    frame.style.width = wPx + 'px';
    frame.style.height = hPx + 'px';
    const sheet = frame.querySelector('.sheet');
    if (sheet) sheet.style.transform = `scale(${zoomLevel})`;
  });
}

/* ---------------- Sheet scaffolding ---------------- */
function applyOrientationStyle(opts) {
  let styleEl = document.getElementById('orientationStyle');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'orientationStyle';
    document.head.appendChild(styleEl);
  }
  const size = pageSizeFor(opts);
  const pageSizeName = opts.paperSize === 'letter' ? 'letter' : 'A4';
  styleEl.textContent = `
    .sheet { width: ${size.w}mm; height: ${size.h}mm; }
    @page { size: ${pageSizeName} ${opts.orientation}; margin: 0; }
  `;
}

function newSheet(opts) {
  const sheet = document.createElement('div');
  sheet.className = 'sheet' + (opts.colorMode === 'mono' ? ' mono-mode' : '') + (opts.textOutline !== 'none' ? ` outline-${opts.textOutline}` : '') + (opts.wrapMode === 'nowrap' ? ' nowrap-mode' : '');
  sheet.style.setProperty('--sheet-bg', opts.colors.bg);
  sheet.style.setProperty('--sheet-ink', opts.colors.ink);
  sheet.style.setProperty('--sheet-line', opts.colors.line);
  sheet.style.setProperty('--sheet-important', opts.colors.important);
  sheet.style.setProperty('--sheet-top', opts.colors.top);
  sheet.style.setProperty('--cell-radius', opts.cellRadius + 'mm');
  sheet.style.setProperty('--sheet-bg-image', bgImageObjectURL ? `url(${bgImageObjectURL})` : 'none');
  sheet.style.setProperty('--bg-image-opacity', opts.bgImageOpacity / 100);
  sheet.style.setProperty('--important-opacity', opts.importantOpacity + '%');
  sheet.style.setProperty('--top-opacity', opts.topOpacity + '%');
  sheet.style.setProperty('--normal-bg', opts.colorNormal);
  sheet.style.setProperty('--normal-opacity', opts.normalOpacity + '%');
  sheet.style.setProperty('--empty-color', opts.colorEmpty);
  sheet.style.setProperty('--cell-pad-top', opts.cellPadTop + 'mm');
  sheet.style.setProperty('--cell-pad-bottom', opts.cellPadBottom + 'mm');
  sheet.style.setProperty('--cell-line-height', opts.cellLineHeight / 100);
  sheet.style.setProperty('--month-label-color', opts.monthLabelColor);
  sheet.style.setProperty('--month-label-size', opts.monthLabelSize / 100);
  sheet.style.setProperty('--summary-border-style', opts.summaryBorderStyle);
  sheet.style.setProperty('--summary-bg', opts.summaryBg);
  sheet.style.setProperty('--summary-bg-opacity', opts.summaryBgOpacity + '%');
  if (opts.textOutline !== 'none') {
    const rgb = opts.textOutline === 'white' ? '255,255,255' : '0,0,0';
    sheet.style.setProperty('--outline-width', opts.outlineWidth + 'px');
    sheet.style.setProperty('--outline-shadow', buildOutlineShadow(rgb, opts.outlineWidth, opts.outlineStrength));
  }
  FONT_TARGETS.forEach(t => {
    sheet.style.setProperty(`--font-${t}`, opts.fonts[t].family);
    sheet.style.setProperty(`--font-${t}-size`, opts.fonts[t].size / 100);
    sheet.style.setProperty(`--font-${t}-weight`, opts.fonts[t].bold ? '700' : '400');
  });
  return sheet;
}

function buildHeader(opts, pageNum, totalPages, rangeLabel) {
  const header = document.createElement('div');
  header.className = 'sheet-header';
  const titleEl = document.createElement('div');
  titleEl.className = 'sheet-title';
  titleEl.style.fontFamily = opts.fonts.title.family;
  titleEl.style.fontWeight = opts.fonts.title.bold ? '700' : '400';
  titleEl.textContent = opts.title;
  const rangeEl = document.createElement('div');
  rangeEl.className = 'sheet-range';
  rangeEl.style.fontFamily = opts.fonts.summary.family;
  rangeEl.style.fontWeight = opts.fonts.summary.bold ? '700' : '400';
  rangeEl.textContent = `${rangeLabel || formatDateRange(parseDate(opts.rangeStart), parseDate(opts.rangeEnd), opts.lang)}${totalPages > 1 ? ` (${pageNum}/${totalPages})` : ''}`;
  header.appendChild(titleEl);
  if (opts.showDateRange) header.appendChild(rangeEl);
  return header;
}

function buildSummaryBox(opts) {
  if (!opts.summary) return null;
  const box = document.createElement('div');
  box.className = 'summary-box';
  box.style.fontFamily = opts.fonts.summary.family;
  box.style.fontWeight = opts.fonts.summary.bold ? '700' : '400';
  box.textContent = opts.summary;
  return box;
}

/* ---------------- Uniform, aligned week-row calendar ---------------- */
let monthTracker = { last: null };

function formatDayLabel(date, opts) {
  const isNewMonth = monthTracker.last !== date.getMonth();
  monthTracker.last = date.getMonth();
  if (!isNewMonth) return { text: String(date.getDate()), isNewMonth: false };
  const monthName = monthLabel(date.getMonth(), opts.lang);
  const icon = opts.monthLabelIcon ? opts.monthLabelIcon + ' ' : '';
  return { text: `${icon}${monthName} ${date.getDate()}`, isNewMonth: true };
}

function buildDayCell(date, opts) {
  const cell = document.createElement('div');
  const ds = fmtDate(date);
  const lvl = maxLevelOn(ds);
  const evs = eventsOn(ds);
  const holidayName = getHolidayNameForRegion(ds, opts.holidayRegion);
  const isSunOrHoliday = date.getDay() === 0 || !!holidayName;
  const isSat = date.getDay() === 6;
  const isEmpty = !evs.length && !holidayName;
  cell.className = 'print-day'
    + (lvl === 1 ? ' important' : '')
    + (lvl === 2 ? ' top-important' : '')
    + (isEmpty ? ' empty-day' : '');
  cell.style.gridColumn = String(gridColumnFor(date, opts.weekStart));
  const num = document.createElement('div');
  const label = formatDayLabel(date, opts);
  num.className = 'pd-num' + (label.isNewMonth ? ' month-start' : '');
  num.style.fontFamily = opts.fonts.date.family;
  num.style.fontWeight = opts.fonts.date.bold ? '700' : '400';
  num.textContent = label.text;
  if (!label.isNewMonth && isSunOrHoliday && !lvl) num.style.color = opts.colorHoliday;
  if (!label.isNewMonth && isSat && !lvl) num.style.color = '#3a6fa8';
  cell.appendChild(num);
  if (holidayName && !lvl) {
    const hday = document.createElement('div');
    hday.className = 'pd-comment';
    hday.style.fontFamily = opts.fonts.comment.family;
    hday.style.color = opts.colorHoliday;
    hday.style.fontWeight = '700';
    hday.textContent = holidayName;
    cell.appendChild(hday);
  }
  evs.slice(0, 3).forEach(e => {
    const ev = document.createElement('div');
    ev.className = 'pd-ev';
    ev.style.fontFamily = opts.fonts.comment.family;
    ev.style.fontWeight = opts.fonts.comment.bold ? '700' : '400';
    ev.textContent = (e.icon ? e.icon + ' ' : '') + (formatEventTime(e, opts.holidayRegion, opts.lang) ? formatEventTime(e, opts.holidayRegion, opts.lang) + ' ' : '') + e.title;
    cell.appendChild(ev);
    if (e.comment) {
      const cm = document.createElement('div');
      cm.className = 'pd-comment';
      cm.style.fontFamily = opts.fonts.comment.family;
      cm.style.fontWeight = opts.fonts.comment.bold ? '700' : '400';
      cm.textContent = e.comment;
      cell.appendChild(cm);
    }
  });
  return cell;
}

function computeWidthWeights(weekDates, weekStart) {
  const weights = [1, 1, 1, 1, 1, 1, 1];
  weekDates.forEach(date => {
    const evs = eventsOn(fmtDate(date));
    if (!evs.length) return;
    const totalChars = evs.reduce((sum, e) => sum + (e.title ? e.title.length : 0) + (e.comment ? e.comment.length : 0), 0);
    weights[gridColumnFor(date, weekStart) - 1] = Math.min(3, 1 + totalChars / 25);
  });
  return weights;
}

function mergeWeights(a, b) {
  return a.map((v, i) => Math.max(v, b[i]));
}

function weekChunksFor(dates, opts) {
  return opts.monthBreak ? chunkByWeekWithMonthBreak(dates, opts.weekStart) : chunkByWeek(dates, opts.weekStart);
}

function buildWeekRow(weekDates, opts) {
  const row = document.createElement('div');
  row.className = 'print-week-row';
  weekDates.forEach(date => row.appendChild(buildDayCell(date, opts)));
  return row;
}

function buildWeekdayHeader(opts) {
  const wr = document.createElement('div');
  wr.className = 'print-weekday-row';
  const labels = reorderForWeekStart(weekdayLabels(opts.lang), opts.weekStart);
  labels.forEach(w => {
    const c = document.createElement('div');
    c.style.fontFamily = opts.fonts.weekday.family;
  c.style.fontWeight = opts.fonts.weekday.bold ? '700' : '400';
    c.textContent = w;
    wr.appendChild(c);
  });
  return wr;
}

function buildListItem(e, opts) {
  const item = document.createElement('div');
  item.className = 'print-list-item' + (e.level === 2 ? ' top' : '');
  const d = parseDate(e.date);
  const wLabel = weekdayLabels(opts.lang)[d.getDay()];
  const dateEl = document.createElement('div');
  dateEl.className = 'print-list-date';
  dateEl.style.fontFamily = opts.fonts.date.family;
  dateEl.style.fontWeight = opts.fonts.date.bold ? '700' : '400';
  dateEl.innerHTML = `${formatShortDate(d, opts.holidayRegion, opts.lang)}<br><span style="font-size:8pt">(${wLabel})</span>`;
  const body = document.createElement('div');
  body.className = 'print-list-body';
  const titleEl = document.createElement('div');
  titleEl.className = 'pl-title';
  titleEl.style.fontFamily = opts.fonts.comment.family;
  titleEl.style.fontWeight = opts.fonts.comment.bold ? '700' : '400';
  titleEl.textContent = (e.icon ? e.icon + ' ' : '') + e.title;
  const metaEl = document.createElement('div');
  metaEl.className = 'pl-meta';
  metaEl.style.fontFamily = opts.fonts.comment.family;
  metaEl.style.fontWeight = opts.fonts.comment.bold ? '700' : '400';
  metaEl.textContent = (formatEventTime(e, opts.holidayRegion, opts.lang) ? formatEventTime(e, opts.holidayRegion, opts.lang) + ' ' : '') + (e.comment || '');
  body.appendChild(titleEl);
  body.appendChild(metaEl);
  item.appendChild(dateEl);
  item.appendChild(body);
  return item;
}

/* ---------------- Page assembly (measures real DOM height to decide breaks) ---------------- */
function attachForMeasure(sheet) {
  document.body.appendChild(sheet);
  sheet.style.position = 'fixed'; sheet.style.visibility = 'hidden'; sheet.style.left = '-9999px';
  sheet.style.transform = 'none';
}
function detachAfterMeasure(sheet) {
  sheet.remove();
  sheet.style.position = ''; sheet.style.visibility = ''; sheet.style.left = '';
}

function makePage(opts, pageNum, totalPagesRef, includeExtras, rangeLabel) {
  const sheet = newSheet(opts);
  sheet.appendChild(buildHeader(opts, pageNum, totalPagesRef.value, rangeLabel));
  if (includeExtras) {
    const box = buildSummaryBox(opts);
    if (box) sheet.appendChild(box);
  }
  if (opts.mode === 'list') {
    const wrapper = document.createElement('div');
    wrapper.className = 'print-list';
    sheet.appendChild(wrapper);
    return { sheet, wrapper };
  }
  const calWrap = document.createElement('div');
  calWrap.className = 'print-calendar';
  calWrap.appendChild(buildWeekdayHeader(opts));
  const weeksWrap = document.createElement('div');
  weeksWrap.className = 'print-weeks';
  calWrap.appendChild(weeksWrap);
  sheet.appendChild(calWrap);
  return { sheet, calWrap, wrapper: weeksWrap, chunks: [] };
}

function chunkByMonth(dates) {
  const chunks = [];
  let cur = [];
  let curKey = null;
  dates.forEach(d => {
    const key = d.getFullYear() + '-' + d.getMonth();
    if (curKey !== null && key !== curKey) { chunks.push(cur); cur = []; }
    curKey = key;
    cur.push(d);
  });
  if (cur.length) chunks.push(cur);
  return chunks;
}

function fitPageContent(sheet, target) {
  attachForMeasure(sheet);
  if (target.scrollHeight > target.clientHeight + 1) {
    const scale = target.clientHeight / target.scrollHeight;
    target.style.transformOrigin = 'top left';
    target.style.transform = `scale(${scale})`;
    target.style.width = `${100 / scale}%`;
  }
  detachAfterMeasure(sheet);
}

/* ---------------- 面付け印刷(N-up)モード [第1段階] ----------------
   現段階では「均等なN×M分割」+「全マスに同じ内容(選択期間全体)を
   自動縮小して詰め込む」のみに対応。マス境界のドラッグ移動、
   マスごとの内容の出し分け、数字+アイコンのみの超コンパクト表示は
   まだ実装していません(次の段階で追加予定)。
------------------------------------------------------------------------- */
function evenFracs(n) {
  // n分割の内部境界線(n-1本)を均等な位置(0〜1)で返す
  const arr = [];
  for (let i = 1; i < n; i++) arr.push(i / n);
  return arr;
}

function ensurePlannerFracs(rows, cols) {
  let changed = false;
  if (!plannerRowFracs || plannerRowFracs.length !== rows - 1) { plannerRowFracs = evenFracs(rows); changed = true; }
  if (!plannerColFracs || plannerColFracs.length !== cols - 1) { plannerColFracs = evenFracs(cols); changed = true; }
  if (changed) {
    setSetting('plannerRowFracs', plannerRowFracs);
    setSetting('plannerColFracs', plannerColFracs);
  }
}

function fracsToTemplate(fracs, count) {
  const bounds = [0, ...fracs, 1];
  const parts = [];
  for (let i = 0; i < count; i++) parts.push(((bounds[i + 1] - bounds[i]) * 100).toFixed(4) + '%');
  return parts.join(' ');
}

function buildPlannerDragOverlay(opts) {
  const overlay = document.createElement('div');
  overlay.className = 'planner-drag-overlay no-print';
  plannerRowFracs.forEach((frac, idx) => {
    const handle = document.createElement('div');
    handle.className = 'planner-drag-handle planner-drag-row';
    handle.style.top = (frac * 100) + '%';
    handle.dataset.axis = 'row';
    handle.dataset.index = String(idx);
    overlay.appendChild(handle);
  });
  plannerColFracs.forEach((frac, idx) => {
    const handle = document.createElement('div');
    handle.className = 'planner-drag-handle planner-drag-col';
    handle.style.left = (frac * 100) + '%';
    handle.dataset.axis = 'col';
    handle.dataset.index = String(idx);
    overlay.appendChild(handle);
  });
  return overlay;
}

/* マス境界のドラッグ移動。戻り値はイベントリスナー解除関数(次の再描画前に必ず呼ぶこと)。 */
function enablePlannerDragging(grid, overlay, opts, onDragEnd) {
  let dragState = null;
  let labelPool = []; // ドラッグ中、サイズが変化しているマスの数だけラベルを用意して使い回す

  function clearLabelPool() {
    labelPool.forEach(el => el.remove());
    labelPool = [];
  }

  overlay.querySelectorAll('.planner-drag-handle').forEach(handle => {
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const axis = handle.dataset.axis;
      const index = Number(handle.dataset.index);
      const fracsArr = axis === 'row' ? plannerRowFracs : plannerColFracs;
      const minBound = index === 0 ? 0.03 : fracsArr[index - 1] + 0.03;
      const maxBound = index === fracsArr.length - 1 ? 0.97 : fracsArr[index + 1] - 0.03;
      dragState = { axis, index, minBound, maxBound, fracsArr };
      handle.classList.add('dragging');

      // このドラッグでサイズが変化するマスの数だけラベル要素を用意しておく
      // (行の境界線なら、変化する2行 × 列数ぶん。列の境界線なら、変化する2列 × 行数ぶん)
      clearLabelPool();
      const affectedCount = axis === 'row' ? 2 * opts.plannerCols : 2 * opts.plannerRows;
      for (let i = 0; i < affectedCount; i++) {
        const el = document.createElement('div');
        el.className = 'planner-drag-label no-print';
        overlay.appendChild(el);
        labelPool.push(el);
      }
    });
  });

  function onMove(e) {
    if (!dragState) return;
    const rect = grid.getBoundingClientRect(); // 画面表示上(ズーム適用後)の実ピクセル
    // .sheet 全体が transform:scale(zoomLevel) で拡大縮小されているため、
    // その内側の要素に left/top(px)を指定する場合は、表示上の実ピクセルではなく
    // 「ズームがかかっていないとしたときのローカル座標系」の値を使う必要がある。
    // (指定した数値はズーム前の座標として解釈され、あとから transform で拡縮されるため)
    const localWidthPx = rect.width / zoomLevel;
    const localHeightPx = rect.height / zoomLevel;
    const gridWidthMM = localWidthPx / MM_PER_PX;
    const gridHeightMM = localHeightPx / MM_PER_PX;
    let frac = dragState.axis === 'row'
      ? (e.clientY - rect.top) / rect.height
      : (e.clientX - rect.left) / rect.width;
    frac = Math.min(dragState.maxBound, Math.max(dragState.minBound, frac));
    dragState.fracsArr[dragState.index] = frac;

    // 軽量な見た目の更新のみ(重いミニカレンダーの再構築はドラッグ終了後にまとめて行う)
    grid.style.gridTemplateRows = fracsToTemplate(plannerRowFracs, opts.plannerRows);
    grid.style.gridTemplateColumns = fracsToTemplate(plannerColFracs, opts.plannerCols);
    overlay.querySelectorAll('.planner-drag-row').forEach((h, i) => { h.style.top = (plannerRowFracs[i] * 100) + '%'; });
    overlay.querySelectorAll('.planner-drag-col').forEach((h, i) => { h.style.left = (plannerColFracs[i] * 100) + '%'; });

    const rowBounds = [0, ...plannerRowFracs, 1];
    const colBounds = [0, ...plannerColFracs, 1];
    let labelIdx = 0;
    const placeLabel = (text, cxPx, cyPx) => {
      const el = labelPool[labelIdx++];
      if (!el) return;
      el.textContent = text;
      el.style.left = cxPx + 'px';
      el.style.top = cyPx + 'px';
      el.style.transform = 'translate(-50%, -50%)';
    };

    if (dragState.axis === 'row') {
      // 上下にドラッグ中: 高さが変化する2つの行(index, index+1)について、
      // それぞれの行にある全マスの中心に、そのマスの新しい高さ(mm)を表示する
      [dragState.index, dragState.index + 1].forEach(r => {
        const heightMM = (rowBounds[r + 1] - rowBounds[r]) * gridHeightMM;
        const cyPx = ((rowBounds[r] + rowBounds[r + 1]) / 2) * localHeightPx;
        for (let c = 0; c < opts.plannerCols; c++) {
          const cxPx = ((colBounds[c] + colBounds[c + 1]) / 2) * localWidthPx;
          placeLabel(`${heightMM.toFixed(1)}mm`, cxPx, cyPx);
        }
      });
    } else {
      // 左右にドラッグ中: 横幅が変化する2つの列(index, index+1)について、
      // それぞれの列にある全マスの中心に、そのマスの新しい横幅(mm)を表示する
      [dragState.index, dragState.index + 1].forEach(c => {
        const widthMM = (colBounds[c + 1] - colBounds[c]) * gridWidthMM;
        const cxPx = ((colBounds[c] + colBounds[c + 1]) / 2) * localWidthPx;
        for (let r = 0; r < opts.plannerRows; r++) {
          const cyPx = ((rowBounds[r] + rowBounds[r + 1]) / 2) * localHeightPx;
          placeLabel(`${widthMM.toFixed(1)}mm`, cxPx, cyPx);
        }
      });
    }
  }

  function onUp() {
    if (!dragState) return;
    overlay.querySelectorAll('.planner-drag-handle').forEach(h => h.classList.remove('dragging'));
    clearLabelPool();
    dragState = null;
    onDragEnd();
  }

  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  return () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    clearLabelPool();
  };
}

function defaultCellRanges(count, rangeStartStr) {
  const base = rangeStartStr ? startOfMonth(parseDate(rangeStartStr)) : startOfMonth(new Date());
  const arr = [];
  for (let i = 0; i < count; i++) {
    const d = addMonths(base, i);
    arr.push({ startMonth: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, months: 1 });
  }
  return arr;
}

function ensurePlannerCellRanges(totalCells, opts) {
  let needsRender = false;
  if (!plannerCellRanges || plannerCellRanges.length !== totalCells) {
    plannerCellRanges = defaultCellRanges(totalCells, opts.rangeStart);
    setSetting('plannerCellRanges', plannerCellRanges);
    needsRender = true;
  }
  // 前回のセッションで保存された plannerCellRanges の件数がすでに一致している場合、
  // 上のif文には入らず再生成されないため、今回のページ表示でまだ一度も
  // #plannerCellAssignGrid のDOMを描画していないと「欄が空のまま」になってしまう。
  // そのため、DOM側の行数と件数が食い違っている場合も描画し直す。
  const grid = document.getElementById('plannerCellAssignGrid');
  if (needsRender || (grid && grid.children.length !== plannerCellRanges.length)) {
    renderPlannerCellAssignUI();
  }
}

function renderPlannerCellAssignUI() {
  const grid = document.getElementById('plannerCellAssignGrid');
  if (!grid || !plannerCellRanges) return;
  grid.innerHTML = '';
  plannerCellRanges.forEach((cfg, i) => {
    const row = document.createElement('div');
    row.className = 'planner-cell-assign-row';
    const label = document.createElement('span');
    label.className = 'pca-label';
    label.textContent = `マス${i + 1}`;
    const monthInput = document.createElement('input');
    monthInput.type = 'month';
    monthInput.value = cfg.startMonth;
    monthInput.addEventListener('change', () => {
      plannerCellRanges[i].startMonth = monthInput.value;
      setSetting('plannerCellRanges', plannerCellRanges);
      rebuildPreview();
    });
    const monthsInput = document.createElement('input');
    monthsInput.type = 'number';
    monthsInput.min = '1'; monthsInput.max = '36';
    monthsInput.value = cfg.months;
    monthsInput.className = 'pca-months';
    monthsInput.addEventListener('change', () => {
      plannerCellRanges[i].months = Math.max(1, Math.min(36, Number(monthsInput.value) || 1));
      setSetting('plannerCellRanges', plannerCellRanges);
      rebuildPreview();
    });
    row.appendChild(label);
    row.appendChild(monthInput);
    row.appendChild(document.createTextNode('から'));
    row.appendChild(monthsInput);
    row.appendChild(document.createTextNode('ヶ月'));
    grid.appendChild(row);
  });
}

function countMonthsInclusive(startMonthDate, endMonthDate) {
  return Math.max(1, (endMonthDate.getFullYear() - startMonthDate.getFullYear()) * 12 + (endMonthDate.getMonth() - startMonthDate.getMonth()) + 1);
}

/* マスごとに実際に表示する日付配列を決定する。
   - same : 全マスに選択期間全体を複製
   - auto : 選択期間を月単位でマス数ぶん連続分割(足りない月は空のマスになる)
   - manual: plannerCellRangesで指定された開始月+ヶ月数を使う */
function computeCellDateRanges(opts, allDates, totalCells) {
  if (opts.plannerAssignMode === 'manual') {
    ensurePlannerCellRanges(totalCells, opts);
    return plannerCellRanges.map(cfg => {
      if (!cfg || !cfg.startMonth) return [];
      const start = parseDate(cfg.startMonth + '-01');
      const months = Math.max(1, Math.min(36, Number(cfg.months) || 1));
      const end = endOfMonth(addMonths(start, months - 1));
      return dateRangeArray(start, end);
    });
  }
  if (opts.plannerAssignMode === 'auto') {
    const startMonth = startOfMonth(parseDate(opts.rangeStart));
    const endMonth = startOfMonth(parseDate(opts.rangeEnd));
    const totalMonths = countMonthsInclusive(startMonth, endMonth);
    const base = Math.floor(totalMonths / totalCells);
    const extra = totalMonths % totalCells;
    const out = [];
    let cursor = startMonth;
    for (let i = 0; i < totalCells; i++) {
      const len = base + (i < extra ? 1 : 0);
      if (len <= 0) { out.push([]); continue; }
      const chunkEnd = endOfMonth(addMonths(cursor, len - 1));
      out.push(dateRangeArray(cursor, chunkEnd));
      cursor = addMonths(cursor, len);
    }
    return out;
  }
  // 'same'(既定): 全マスに選択期間全体を複製
  return new Array(totalCells).fill(allDates);
}

/* 超コンパクト表示用の日マス: 日付の数字とアイコンのみ(タイトル・コメントは表示しない) */
function buildCompactDayCell(date, opts) {
  const cell = document.createElement('div');
  const ds = fmtDate(date);
  const lvl = maxLevelOn(ds);
  const evs = eventsOn(ds);
  const holidayName = getHolidayNameForRegion(ds, opts.holidayRegion);
  const isSunOrHoliday = date.getDay() === 0 || !!holidayName;
  const isSat = date.getDay() === 6;
  const isEmpty = !evs.length && !holidayName;
  cell.className = 'print-day compact'
    + (lvl === 1 ? ' important' : '')
    + (lvl === 2 ? ' top-important' : '')
    + (isEmpty ? ' empty-day' : '');
  cell.style.gridColumn = String(gridColumnFor(date, opts.weekStart));
  const num = document.createElement('div');
  const label = formatDayLabel(date, opts);
  num.className = 'pd-num' + (label.isNewMonth ? ' month-start' : '');
  num.style.fontFamily = opts.fonts.date.family;
  num.style.fontWeight = opts.fonts.date.bold ? '700' : '400';
  num.textContent = label.text;
  if (!label.isNewMonth && isSunOrHoliday && !lvl) num.style.color = opts.colorHoliday;
  if (!label.isNewMonth && isSat && !lvl) num.style.color = '#3a6fa8';
  cell.appendChild(num);
  const iconSource = evs.find(e => e.icon);
  if (iconSource) {
    const iconEl = document.createElement('div');
    iconEl.className = 'pd-compact-icon';
    iconEl.textContent = iconSource.icon;
    cell.appendChild(iconEl);
  }
  return cell;
}

function buildPlannerWeekRow(weekDates, opts) {
  const row = document.createElement('div');
  row.className = 'print-week-row';
  weekDates.forEach(date => row.appendChild(opts.plannerCompact ? buildCompactDayCell(date, opts) : buildDayCell(date, opts)));
  return row;
}

function buildPlannerMiniCalendar(opts, dates, naturalWidthPx) {
  monthTracker.last = null;
  const mini = document.createElement('div');
  mini.className = 'planner-mini';
  mini.style.width = naturalWidthPx + 'px';
  mini.appendChild(buildWeekdayHeader(opts));
  const weeksWrap = document.createElement('div');
  weeksWrap.className = 'planner-mini-weeks';
  const chunks = [];
  weekChunksFor(dates, opts).forEach(chunk => {
    weeksWrap.appendChild(buildPlannerWeekRow(chunk, opts));
    chunks.push(chunk);
  });
  mini.appendChild(weeksWrap);
  // 列幅もページ内カレンダーと同じロジックで揃える
  if (opts.autoResize && !opts.manualWidthMode) {
    const weights = chunks.reduce((acc, chunk) => mergeWeights(acc, computeWidthWeights(chunk, opts.weekStart)), [1, 1, 1, 1, 1, 1, 1]);
    const template = weights.map(w => w.toFixed(2) + 'fr').join(' ');
    weeksWrap.querySelectorAll('.print-week-row').forEach(row => { row.style.gridTemplateColumns = template; });
    mini.querySelectorAll('.print-weekday-row').forEach(row => { row.style.gridTemplateColumns = template; });
  }
  return mini;
}

function buildPlannerPage(opts) {
  ensurePlannerFracs(opts.plannerRows, opts.plannerCols);
  ensurePlannerCellRanges(opts.plannerRows * opts.plannerCols, opts);
  const sheet = newSheet(opts);
  sheet.classList.add('planner-mode');
  sheet.appendChild(buildHeader(opts, 1, 1, formatDateRange(parseDate(opts.rangeStart), parseDate(opts.rangeEnd), opts.lang)));
  const grid = document.createElement('div');
  grid.className = 'planner-grid';
  grid.style.gridTemplateColumns = fracsToTemplate(plannerColFracs, opts.plannerCols);
  grid.style.gridTemplateRows = fracsToTemplate(plannerRowFracs, opts.plannerRows);
  const cells = [];
  const totalCells = opts.plannerRows * opts.plannerCols;
  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement('div');
    cell.className = 'planner-cell';
    grid.appendChild(cell);
    cells.push(cell);
  }
  sheet.appendChild(grid);
  return { sheet, grid, cells };
}

function fitPlannerCalendars(sheet, cells, opts, allDates) {
  attachForMeasure(sheet);

  const PROBE_WIDTH = 700;
  const cellDateRanges = computeCellDateRanges(opts, allDates, cells.length);

  // マスごとに内容(日付範囲)が異なりうるため、縮小率もマスごとに個別計算する
  cells.forEach((cell, idx) => {
    cell.style.position = 'relative';
    cell.style.overflow = 'hidden';
    cell.querySelectorAll('.planner-mini').forEach(m => m.remove());
    const dates = cellDateRanges[idx] || [];

    const probe = buildPlannerMiniCalendar(opts, dates, PROBE_WIDTH);
    probe.style.position = 'fixed';
    probe.style.visibility = 'hidden';
    probe.style.left = '-9999px';
    document.body.appendChild(probe);
    const naturalW = probe.scrollWidth || PROBE_WIDTH;
    const naturalH = probe.scrollHeight || 1;
    probe.remove();

    const cellW = cell.clientWidth;
    const cellH = cell.clientHeight;
    const baseScale = Math.min(cellW / naturalW, cellH / naturalH);
    const scale = Math.max(0.02, baseScale * (opts.plannerScale / 100));
    const mini = buildPlannerMiniCalendar(opts, dates, PROBE_WIDTH);
    mini.style.position = 'absolute';
    mini.style.transformOrigin = 'top left';
    mini.style.transform = `scale(${scale})`;
    const scaledW = naturalW * scale;
    const scaledH = naturalH * scale;
    mini.style.left = Math.max(0, (cellW - scaledW) / 2) + 'px';
    mini.style.top = Math.max(0, (cellH - scaledH) / 2) + 'px';
    cell.appendChild(mini);
  });

  detachAfterMeasure(sheet);
}

function alignPageColumns(page, opts) {
  if (opts.manualWidthMode) {
    const ordered = reorderForWeekStart(opts.manualColWidths, opts.weekStart);
    const template = ordered.map(w => w.toFixed(2) + 'fr').join(' ');
    page.wrapper.querySelectorAll('.print-week-row').forEach(row => { row.style.gridTemplateColumns = template; });
  } else if (opts.autoResize && page.chunks && page.chunks.length) {
    const pageWeights = page.chunks.reduce((acc, chunk) => mergeWeights(acc, computeWidthWeights(chunk, opts.weekStart)), [1, 1, 1, 1, 1, 1, 1]);
    const template = pageWeights.map(w => w.toFixed(2) + 'fr').join(' ');
    page.wrapper.querySelectorAll('.print-week-row').forEach(row => { row.style.gridTemplateColumns = template; });
  }
}

function fillPageHeight(page, opts) {
  if (!opts.fillPageHeight || !page.wrapper) return;
  const rowCount = page.wrapper.children.length;
  if (!rowCount) return;
  // display:grid + grid-auto-rows:1fr は、内容量に関わらず全ての行の高さを
  // 「利用可能な高さ ÷ 行数」で均等に割り当てるため、必ずページ下端まで埋まります。
  page.wrapper.style.display = 'grid';
  page.wrapper.style.gridTemplateRows = `repeat(${rowCount}, 1fr)`;
  page.wrapper.style.rowGap = '0.8mm';
}

let rebuildToken = 0; // 連続した設定変更でrebuildPreview()が重なった時、古い呼び出しが後から上書きしないようにするための世代番号

async function rebuildPreview() {
  const myToken = ++rebuildToken;
  const opts = readOptions();
  await persistSettings(opts);
  if (myToken !== rebuildToken) return; // このawait中に新しい呼び出しが来ていたら、古い方は何もせず中断する
  applyOrientationStyle(opts);

  if (typeof plannerDragCleanup === 'function') { plannerDragCleanup(); plannerDragCleanup = null; }
  const assignWrap = document.getElementById('plannerCellAssignWrap');
  if (assignWrap) assignWrap.hidden = opts.plannerAssignMode !== 'manual';
  // 面付け設定は「表示モードが面付け印刷」の時だけ意味を持つため、他のモードでは隠す
  // (以前は常時表示されており、初心者には無関係な項目に見えて分かりにくかった)
  const plannerFieldset = document.getElementById('plannerModeSettings');
  if (plannerFieldset) plannerFieldset.hidden = opts.mode !== 'planner';

  const container = document.getElementById('previewPages');
  container.innerHTML = '';

  if (!opts.rangeStart || !opts.rangeEnd || parseDate(opts.rangeEnd) < parseDate(opts.rangeStart)) {
    container.innerHTML = '<p style="color:#900;padding:20px;">開始日・終了日を正しく指定してください。</p>';
    return;
  }

  const allDates = dateRangeArray(parseDate(opts.rangeStart), parseDate(opts.rangeEnd));
  const pages = [];

  if (opts.mode === 'planner') {
    // ---- 面付け印刷[第2段階]: 均等または自由にドラッグ調整したN×Mのマスに、選択期間全体を自動縮小して詰め込む ----
    const { sheet, grid, cells } = buildPlannerPage(opts);
    fitPlannerCalendars(sheet, cells, opts, allDates);
    const overlay = buildPlannerDragOverlay(opts);
    grid.appendChild(overlay);
    plannerDragCleanup = enablePlannerDragging(grid, overlay, opts, async () => {
      await setSetting('plannerRowFracs', plannerRowFracs);
      await setSetting('plannerColFracs', plannerColFracs);
      rebuildPreview();
    });
    pages.push({ sheet });
  } else if (opts.pageFit === '1') {
    // ---- A4 1枚に収める: 期間全体を1ページにまとめ、はみ出す分だけ縮小 ----
    monthTracker.last = null;
    const totalPagesRef = { value: 1 };
    const page = makePage(opts, 1, totalPagesRef, true, formatDateRange(parseDate(opts.rangeStart), parseDate(opts.rangeEnd), opts.lang));
    pages.push(page);

    if (opts.mode === 'list') {
      const important = Store.events
        .filter(e => e.level > 0 && e.date >= opts.rangeStart && e.date <= opts.rangeEnd)
        .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
      if (!important.length) {
        page.wrapper.innerHTML = '<p style="opacity:0.6;font-size:11pt;">重要度が「重要」以上の予定がまだありません。編集画面で日付をクリックして重要度を設定してください。</p>';
      } else {
        important.forEach(e => page.wrapper.appendChild(buildListItem(e, opts)));
      }
      fitPageContent(page.sheet, page.wrapper);
    } else {
      weekChunksFor(allDates, opts).forEach(chunk => { page.wrapper.appendChild(buildWeekRow(chunk, opts)); page.chunks.push(chunk); });
      alignPageColumns(page, opts);
      fillPageHeight(page, opts);
      fitPageContent(page.sheet, page.calWrap);
    }
  } else {
    // ---- 複数ページを許可する: 1ヶ月= 1ページ(3ヶ月の期間なら3ページ) ----
    const monthChunks = chunkByMonth(allDates);
    const totalPagesRef = { value: monthChunks.length };

    monthChunks.forEach((monthDates, i) => {
      monthTracker.last = null;
      const first = monthDates[0], last = monthDates[monthDates.length - 1];
      const rangeLabel = formatDateRange(first, last, opts.lang);
      const page = makePage(opts, i + 1, totalPagesRef, i === 0, rangeLabel);
      pages.push(page);

      if (opts.mode === 'list') {
        const important = Store.events
          .filter(e => e.level > 0 && e.date >= fmtDate(first) && e.date <= fmtDate(last))
          .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
        if (!important.length) {
          page.wrapper.innerHTML = '<p style="opacity:0.6;font-size:11pt;">この月には重要度が「重要」以上の予定がありません。</p>';
        } else {
          important.forEach(e => page.wrapper.appendChild(buildListItem(e, opts)));
        }
        fitPageContent(page.sheet, page.wrapper);
      } else {
        weekChunksFor(monthDates, opts).forEach(chunk => { page.wrapper.appendChild(buildWeekRow(chunk, opts)); page.chunks.push(chunk); });
        alignPageColumns(page, opts);
        fillPageHeight(page, opts);
        // 1ヶ月分は通常ページに収まるはずですが、念のためはみ出した場合は縮小します
        fitPageContent(page.sheet, page.calWrap);
      }
    });
  }

  pages.forEach(p => {
    const frame = document.createElement('div');
    frame.className = 'page-frame';
    frame.appendChild(p.sheet);
    container.appendChild(frame);
  });
  applyZoomToFrames();
}

boot();
