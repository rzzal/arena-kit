/* ============================================================
   app.js — OTAK APLIKASI: router antar halaman, dashboard,
   pengaturan, data contoh, dan inisialisasi pertama.
   ============================================================ */

const LABEL_FORMAT = { bracket: 'BRACKET', league: 'LIGA', battle: 'BATTLE POINTS' };

/* ---------- NAVIGASI ---------- */
// Pindah antar view (dashboard/tim/bracket/liga/battle/pengaturan)
function switchView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.view === name));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Tandai tab format yang sedang aktif dengan titik hijau
function renderNavBadges() {
  document.querySelectorAll('.nav-btn.fmt').forEach(b =>
    b.classList.toggle('is-active-format', b.dataset.format === S.tournament.format));
}

/* ---------- HEADER STATUS ---------- */
function renderHeaderStatus() {
  const t = S.tournament, g = GAME_PRESETS[t.game];
  const chips = [
    `<span class="chip gold">🎯 ${LABEL_FORMAT[t.format]}</span>`,
    `<span class="chip">${g ? g.label : t.game}</span>`,
    `<span class="chip">${t.mode === 'online' ? '🌐 ONLINE' : '🏟️ OFFLINE'}</span>`,
  ];
  if (t.date) chips.push(`<span class="chip">📅 ${fmtDate(t.date)}</span>`);
  if (t.venue) chips.push(`<span class="chip">📍 ${esc(t.venue)}</span>`);
  document.getElementById('statusChips').innerHTML = chips.join('');
}

/* ---------- STATISTIK SESUAI FORMAT AKTIF ---------- */
function activeStats() {
  if (S.tournament.format === 'bracket') return bracketStats();
  if (S.tournament.format === 'league') return leagueStats();
  return battleStats();
}

/* ---------- DASHBOARD ---------- */
function renderDashboard() {
  const st = activeStats();
  const prog = st.total ? Math.round(st.done / st.total * 100) : 0;
  const tiles = document.getElementById('dashTiles');
  tiles.innerHTML = `
    <div class="tile"><div class="t-label">Tim Terdaftar</div><div class="t-value">${S.teams.length}</div></div>
    <div class="tile"><div class="t-label">Pertandingan</div><div class="t-value">${st.done}<small style="font-size:16px;color:var(--muted)">/${st.total}</small></div></div>
    <div class="tile"><div class="t-label">Progress</div><div class="t-value">${prog}%</div></div>
    <div class="tile"><div class="t-label">Status</div><div class="t-value" style="font-size:20px">${st.champ ? '🏆 SELESAI' : '🔴 BERJALAN'}</div></div>`;

  // Banner juara (khusus bracket yang sudah final)
  const champTeam = teamById(S.bracket.championId);
  document.getElementById('championBanner').innerHTML = champTeam ? `
    <div class="champion-banner">
      <div class="cb-cup">🏆</div>
      <div class="cb-label">JUARA ${esc(S.tournament.name)}</div>
      <div class="cb-name">${esc(champTeam.name)}</div>
      ${S.tournament.prize ? `<p class="hint">💰 ${esc(S.tournament.prize)}</p>` : ''}
    </div>` : '';

  // Hasil terbaru sesuai format aktif
  const box = document.getElementById('recentResults');
  let items = [];
  if (S.tournament.format === 'bracket') {
    items = S.bracket.rounds.flat().filter(m => m.done && !m.bye).slice(-6).reverse()
      .map(m => `<div class="result-row"><span>${teamName(m.a)} vs ${teamName(m.b)}</span><span class="sc">${m.scoreA} – ${m.scoreB}</span></div>`);
  } else if (S.tournament.format === 'league') {
    items = S.league.fixtures.filter(f => f.done).slice(-6).reverse()
      .map(f => `<div class="result-row"><span>${teamName(f.a)} vs ${teamName(f.b)}</span><span class="sc">${f.scoreA} – ${f.scoreB}</span></div>`);
  } else {
    items = S.battle.matches.filter(m => m.done).slice(-6).reverse().map(m => {
      const win = m.results.find(r => r.place === 1);
      return `<div class="result-row"><span>🔥 ${esc(m.label)} — Booyah: <b>${teamName(win?.teamId)}</b></span><span class="sc">${win?.kills ?? 0} elims</span></div>`;
    });
  }
  box.innerHTML = items.length ? items.join('')
    : '<p class="hint">Belum ada hasil. Mulai input skor di tab format kamu. 🚀</p>';
}

/* ---------- PENGATURAN ---------- */
// Isi form pengaturan dari state saat ini
function renderSettings() {
  const t = S.tournament, r = S.rules;
  document.getElementById('stName').value = t.name;
  document.getElementById('stGame').value = t.game;
  document.getElementById('stVenue').value = t.venue;
  document.getElementById('stDate').value = t.date;
  document.getElementById('stPrize').value = t.prize;
  document.querySelector(`input[name=stMode][value=${t.mode}]`).checked = true;
  document.querySelector(`input[name=stFormat][value=${t.format}]`).checked = true;
  document.getElementById('stBo').value = r.bo;
  document.getElementById('stThird').checked = r.thirdPlace;
  document.getElementById('stWin').value = r.winPts;
  document.getElementById('stDraw').value = r.drawPts;
  document.getElementById('stLose').value = r.losePts;
  document.getElementById('stPlacement').value = r.placement.join(',');
  document.getElementById('stKill').value = r.killPts;
  toggleRulePanels();
}

// Tampilkan panel aturan sesuai format yang dipilih
function toggleRulePanels() {
  const fmt = document.querySelector('input[name=stFormat]:checked').value;
  document.querySelectorAll('.rule-panel').forEach(p =>
    p.classList.toggle('show', p.dataset.format === fmt));
}

// Saat memilih game, otomatis sarankan format & BO yang cocok
function applyGamePreset(key) {
  const p = GAME_PRESETS[key];
  if (!p) return;
  const fmtRadio = document.querySelector(`input[name=stFormat][value=${p.format}]`);
  if (fmtRadio) { fmtRadio.checked = true; toggleRulePanels(); }
  if (p.bo) document.getElementById('stBo').value = p.bo;
  toast(`Preset ${p.label} diterapkan. 🎯`);
}

// Simpan semua pengaturan
function submitSettings(ev) {
  ev.preventDefault();
  const v = id => document.getElementById(id).value.trim();

  S.tournament.name = v('stName') || 'Turnamen Tanpa Nama';
  S.tournament.game = v('stGame');
  S.tournament.venue = v('stVenue');
  S.tournament.date = v('stDate');
  S.tournament.prize = v('stPrize');
  S.tournament.mode = document.querySelector('input[name=stMode]:checked').value;
  S.tournament.format = document.querySelector('input[name=stFormat]:checked').value;

  S.rules.bo = parseInt(v('stBo'), 10) || 1;
  S.rules.thirdPlace = document.getElementById('stThird').checked;
  S.rules.winPts = parseInt(v('stWin'), 10) || 0;
  S.rules.drawPts = parseInt(v('stDraw'), 10) || 0;
  S.rules.losePts = parseInt(v('stLose'), 10) || 0;
  S.rules.killPts = parseInt(v('stKill'), 10) || 0;

  // Parse poin placement dari teks "12,10,9,..."
  const pl = v('stPlacement').split(/[,\s]+/).map(Number).filter(n => !isNaN(n) && n >= 0);
  if (pl.length) S.rules.placement = pl;
  else toast('Poin placement kosong — dipakai nilai default.', 'err');

  save(); refreshAll();
  toast('Pengaturan disimpan! ⚙️');
}

/* ---------- DATA CONTOH (untuk coba-coba) ---------- */
function loadDemo() {
  if (S.teams.length && !confirm('Data tim sekarang akan diganti data contoh. Lanjut?')) return;
  S = defaultState();
  S.tournament.name = 'Piala Arena 2026';
  S.tournament.venue = 'Online — Discord & Game';
  S.tournament.date = new Date().toISOString().slice(0, 10);
  S.tournament.prize = 'Rp 5.000.000';

  // Buat tim contoh
  S.teams = DEMO_TEAMS.map(d => ({
    id: uid(), name: d.name, tag: d.tag,
    players: Array.isArray(d.players) ? d.players : d.players.split(',').map(p => p.trim()),
  }));

  const rnd = n => Math.floor(Math.random() * n);

  if (S.tournament.format === 'bracket') {
    // Generate bracket + isi skor acak ronde pertama (biar dashboard hidup)
    generateBracketSilent();
    S.bracket.rounds[0].forEach(m => {
      if (m.a && m.b && !m.bye) {
        const need = neededWins();
        const aWins = rnd(2) === 0;
        m.scoreA = aWins ? need : rnd(need);
        m.scoreB = aWins ? rnd(need) : need;
        m.done = true;
        m.winnerId = aWins ? m.a : m.b;
      }
    });
    recomputeBracket();
  } else if (S.tournament.format === 'league') {
    generateLeagueSilent();
    S.league.fixtures.filter(f => f.round === 1).forEach(f => {
      f.scoreA = rnd(4); f.scoreB = rnd(4); f.done = true;
    });
  } else {
    // Battle: buat 2 match dengan placement & eliminasi acak
    for (let i = 1; i <= 2; i++) {
      const pool = S.teams.slice();
      const results = [];
      let place = 1;
      while (pool.length) {
        const t = pool.splice(rnd(pool.length), 1)[0];
        results.push({ teamId: t.id, place: place++, kills: rnd(13) });
      }
      S.battle.matches.push({ id: uid(), label: 'Match ' + i, results, done: true });
    }
  }
  save(); refreshAll();
  toast('Data contoh dimuat! Silakan jelajah. 🎮');
}

// Versi "tanpa toast & confirm" untuk dipakai loadDemo
function generateBracketSilent() {
  const pool = S.teams.slice();
  let size = 2; while (size < pool.length) size *= 2;
  const rounds = [];
  for (let r = 0; r < Math.log2(size); r++) {
    const list = []; for (let i = 0; i < size / Math.pow(2, r + 1); i++) list.push(newMatch(r, i));
    rounds.push(list);
  }
  seedOrder(size).forEach((seedNum, slot) => {
    const m = rounds[0][slot >> 1], team = pool[seedNum - 1] || null;
    if (slot % 2 === 0) m.a = team ? team.id : null; else m.b = team ? team.id : null;
  });
  S.bracket = { rounds, third: S.rules.thirdPlace ? newMatch(99, 0) : null, championId: null, runnerUpId: null, thirdId: null };
  recomputeBracket();
}
function generateLeagueSilent() {
  const fixtures = [];
  roundRobin(S.teams.map(t => t.id)).forEach((round, ri) =>
    round.forEach(p => fixtures.push({ id: uid(), round: ri + 1, a: p.a, b: p.b, scoreA: null, scoreB: null, done: false })));
  S.league = { fixtures, generated: true };
}

/* ---------- RENDER SEREMPAK ---------- */
// Dipanggil setiap ada perubahan data agar semua halaman selalu sinkron
function refreshAll() {
  renderHeaderStatus();
  renderNavBadges();
  renderDashboard();
  renderTeams();
  renderBracket();
  renderLeague();
  renderBattle();
  renderSettings();
}

/* ---------- START ---------- */
document.addEventListener('DOMContentLoaded', () => {
  S = loadState();   // muat data tersimpan
  refreshAll();      // gambar seluruh UI
  switchView('dashboard');
  console.log('%c🎮 ARENA KIT siap! Semoga turnamennya lancar, GGWP!', 'color:#ffc53d;font-weight:bold');
});
