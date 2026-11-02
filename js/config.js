/* ============================================================
   config.js — ⚙️ PUSAT PENGATURAN. FILE PALING SERING DIEDIT!
   Ubah nilai di sini tanpa menyentuh logika.
   ============================================================ */

// ✏️ Preset game: saat user memilih game di Pengaturan,
//    format & aturan otomatis menyesuaikan. Tambahkan game baru di sini.
const GAME_PRESETS = {
  mlbb:     { game: 'mlbb',     label: 'Mobile Legends (MLBB)', format: 'bracket', bo: 3 },
  ff:       { game: 'ff',       label: 'Free Fire (FF)',        format: 'battle' },
  pubg:     { game: 'pubg',     label: 'PUBG Mobile',           format: 'battle' },
  valorant: { game: 'valorant', label: 'Valorant',              format: 'bracket', bo: 3 },
  efootball:{ game: 'efootball',label: 'eFootball',             format: 'league' },
};

// ✏️ Poin placement default ala Free Fire (juara 1 = 12, dst).
//    Bisa juga diubah lewat menu Pengaturan tanpa edit file ini.
const DEFAULT_PLACEMENT = [12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1];

// Nama file saat Export JSON
const EXPORT_FILENAME = 'arena-kit-turnamen.json';

// ✏️ Data contoh (dipakai tombol "Muat Data Contoh" di Pengaturan)
const DEMO_TEAMS = [
  { name: 'Garuda Esports',      tag: 'GRD', players: ['Rizky', 'Dimas', 'Fajar', 'Aldo', 'Bayu'] },
  { name: 'Raja Naga',           tag: 'RJN', players: ['Satria', 'Kevin', 'Yoga'] },
  { name: 'Banteng Merah',       tag: 'BTM', players: ['Gilang', 'Reza', 'Iqbal', 'Fikri'] },
  { name: 'Elang Hitam Squad',   tag: 'EHS', players: 'Doni, Andi, Rafli' },
  { name: 'Serigala Utara',      tag: 'SRU', players: 'Bima, Candra, Erik, Gilang' },
  { name: 'Phoenix Bali',        tag: 'PNX', players: 'Made, Ketut, Nyoman' },
  { name: 'Cendrawasih GG',      tag: 'CGG', players: 'Yosua, Fernando, Ariel' },
  { name: 'Harimau Sumatera',    tag: 'HRS', players: 'Andika, Putra, Randy, Zaki'] },
];

// Struktur data awal aplikasi (state kosong)
function defaultState() {
  return {
    tournament: {
      name: 'Turnamen Saya',     // ✏️ nama default event
      game: 'mlbb',              // ✏️ kunci game (lihat GAME_PRESETS)
      mode: 'offline',           // 'online' | 'offline'
      venue: '',                 // lokasi / platform
      date: '',                  // tanggal mulai (YYYY-MM-DD)
      prize: '',                 // total hadiah
      format: 'bracket',         // 'bracket' | 'league' | 'battle'
    },
    rules: {
      bo: 3,                     // Best of untuk bracket (1/3/5/7)
      thirdPlace: true,          // adakan perebutan juara 3?
      winPts: 3, drawPts: 1, losePts: 0,   // poin liga
      placement: [...DEFAULT_PLACEMENT],   // poin placement battle
      killPts: 1,                // poin per eliminasi
    },
    teams: [],
    bracket: { rounds: [], third: null, championId: null, runnerUpId: null, thirdId: null },
    league:  { fixtures: [], generated: false },
    battle:  { matches: [] },
  };
}
