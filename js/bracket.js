/* ============================================================
   bracket.js — BAGAN GUGUR (Single Elimination)
   Fitur: seeding otomatis, BYE, BO1/3/5/7, juara 3, juara otomatis.
   ============================================================ */

// Jumlah kemenangan yang dibutuhkan untuk menang seri (BO3 → 2)
function neededWins() { return Math.ceil((S.rules.bo || 1) / 2); }

// Urutan seeding standar turnamen: [1,8,4,5,2,7,3,6] dst (size = pangkat 2)
function seedOrder(size) {
  let arr = [1];
  while (arr.length < size) {
    const m = arr.length * 2 + 1, next = [];
    arr.forEach(s => { next.push(s); next.push(m - s); });
    arr = next;
  }
  return arr;
}

// Objek match baru
function newMatch(r, i) {
  return { id: uid(), round: r, idx: i, a: null, b: null, scoreA: 0, scoreB: 0, done: false, winnerId: null, bye: false };
}

// Nama ronde berdasarkan jumlah match di ronde tersebut
function roundLabel(count) {
  if (count === 1) return '🏆 FINAL';
  if (count === 2) return 'SEMIFINAL';
  if (count === 4) return 'PEREMPAT FINAL';
  if (count === 8) return '16 BESAR';
  return 'BABAK ' + count * 2 + ' BESAR';
}

// Membuat bracket baru dari daftar tim
// doShuffle = true → urutan seed diacak dulu
function generateBracket(doShuffle) {
  if (S.teams.length < 2) return toast('Minimal 2 tim untuk membuat bracket.', 'err');
  if (S.bracket.rounds.length && !confirm('Bracket sudah ada. Timpa dengan yang baru?')) return;

  const pool = S.teams.slice();
  if (doShuffle) {
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
  }

  // Besarkan jumlah slot ke pangkat 2 terdekat (4, 8, 16, ...)
  let size = 2;
  while (size < pool.length) size *= 2;
  const roundsCount = Math.log2(size);
  const rounds = [];
  for (let r = 0; r < roundsCount; r++) {
    const list = [], count = size / Math.pow(2, r + 1);
    for (let i = 0; i < count; i++) list.push(newMatch(r, i));
    rounds.push(list);
  }

  // Isi ronde pertama sesuai urutan seeding; seed > jumlah tim = BYE (null)
  seedOrder(size).forEach((seedNum, slot) => {
    const m = rounds[0][slot >> 1];
    const team = pool[seedNum - 1] || null;
    if (slot % 2 === 0) m.a = team ? team.id : null;
    else m.b = team ? team.id : null;
  });

  S.bracket = {
    rounds,
    third: S.rules.thirdPlace ? newMatch(99, 0) : null, // 99 = penanda match juara 3
    championId: null, runnerUpId: null, thirdId: null,
  };
  recomputeBracket();
  save(); refreshAll();
  toast(`Bracket ${pool.length} tim berhasil dibuat! 🎮`);
}

// Otomatis menangkan match BYE (lawan kosong)
function fixBye(m) {
  if (!m.a && !m.b) { m.done = false; m.winnerId = null; m.bye = false; return; }
  if (m.a && !m.b)      { m.done = true; m.winnerId = m.a; m.bye = true; }
  else if (!m.a && m.b) { m.done = true; m.winnerId = m.b; m.bye = true; }
  else m.bye = false;
}

/* JANTUNG BRACKET: hitung ulang seluruh alur.
   Dipanggil setiap kali skor disimpan. Cara kerja:
   1. Ronde 0: cek BYE.
   2. Ronde berikutnya: peserta diambil dari pemenang ronde sebelumnya.
      Jika peserta berubah (skor lama diedit) → hasil match itu direset.
   3. Tentukan juara, runner-up, dan peserta juara 3. */
function recomputeBracket() {
  const B = S.bracket;
  if (!B.rounds.length) return;

  B.rounds[0].forEach(fixBye);
  B.championId = null; B.runnerUpId = null;

  for (let r = 1; r < B.rounds.length; r++) {
    for (const m of B.rounds[r]) {
      const p = B.rounds[r - 1];
      const a = p[m.idx * 2].done ? p[m.idx * 2].winnerId : null;
      const b = p[m.idx * 2 + 1].done ? p[m.idx * 2 + 1].winnerId : null;
      if (a !== m.a || b !== m.b) { // peserta berubah → reset hasil lama
        m.a = a; m.b = b;
        m.scoreA = 0; m.scoreB = 0; m.done = false; m.winnerId = null;
      }
    }
  }

  // Juara & runner-up dari match final
  const final = B.rounds[B.rounds.length - 1][0];
  if (final.done && final.winnerId) {
    B.championId = final.winnerId;
    B.runnerUpId = final.winnerId === final.a ? final.b : final.a;
  }

  // Juara 3: mempertemukan 2 tim yang kalah di semifinal
  if (B.third) {
    const L = B.rounds.length;
    if (L >= 2) {
      const semis = B.rounds[L - 2];
      if (semis.length === 2 && semis.every(m => m.done)) {
        B.third.a = semis[0].winnerId === semis[0].a ? semis[0].b : semis[0].a;
        B.third.b = semis[1].winnerId === semis[1].a ? semis[1].b : semis[1].a;
      } else if (B.third.a || B.third.b) {
        B.third.a = null; B.third.b = null; B.third.done = false; B.third.winnerId = null;
        B.thirdId = null;
      }
    }
    if (B.third.done) B.thirdId = B.third.winnerId;
  }
}

// Simpan hasil satu match bracket (dipanggil tombol Simpan di kartu match)
function saveBracketResult(r, i) {
  const m = S.bracket.rounds[r][i];
  if (!m.a || !m.b) return toast('Peserta belum lengkap.', 'err');

  const need = neededWins();
  const a = parseInt(document.getElementById(`bs-${r}-${i}-a`).value, 10);
  const b = parseInt(document.getElementById(`bs-${r}-${i}-b`).value, 10);

  // ---- validasi skor ----
  if (isNaN(a) || isNaN(b) || a < 0 || b < 0) return toast('Skor harus angka ≥ 0.', 'err');
  if (a > need || b > need) return toast(`Maksimal kemenangan seri ini = ${need} (BO${S.rules.bo}).`, 'err');
  if (a === need && b === need) return toast('Skor seri tidak mungkin keduanya menang.', 'err');

  m.scoreA = a; m.scoreB = b;
  if (Math.max(a, b) === need) { // seri selesai → tentukan pemenang
    m.done = true;
    m.winnerId = a > b ? m.a : m.b;
    toast(`${teamName(m.winnerId)} menang seri! 🎉`);
  } else {
    m.done = false; m.winnerId = null; // masih berlangsung (bisa disimpan dulu)
    toast('Skor sementara disimpan (seri masih berjalan). ⏳');
  }
  recomputeBracket(); save(); refreshAll();
}

// Simpan hasil perebutan juara 3
function saveThirdResult() {
  const m = S.bracket.third;
  if (!m || !m.a || !m.b) return toast('Peserta juara 3 belum lengkap.', 'err');
  const need = neededWins();
  const a = parseInt(document.getElementById('bt-a').value, 10);
  const b = parseInt(document.getElementById('bt-b').value, 10);
  if (isNaN(a) || isNaN(b) || a < 0 || b < 0) return toast('Skor harus angka ≥ 0.', 'err');
  if (a === b) return toast('Juara 3 tidak boleh seri.', 'err');
  if (a > need || b > need) return toast(`Maksimal ${need} kemenangan.`, 'err');
  m.scoreA = a; m.scoreB = b; m.done = true;
  m.winnerId = a > b ? m.a : m.b;
  recomputeBracket(); save(); refreshAll();
  toast('Juara 3 ditentukan! 🥉');
}

// HTML satu kartu match
function matchCardHTML(m, r, i, idA, idB, extraLabel) {
  const tA = teamById(m.a), tB = teamById(m.b);
  const ready = m.a && m.b;
  const status = m.bye ? ['BYE', 'bye'] : m.done ? ['SELESAI', 'done'] : ready ? ['SIAP MAIN', 'ready'] : ['MENUNGGU', 'wait'];

  const teamRow = (t, side, isWin, isLose) => `
    <div class="m-team ${isWin ? 'winner' : ''} ${isLose ? 'loser' : ''}">
      <span class="name">${t ? esc(t.name) : '<small>menunggu…</small>'}</span>
      ${ready && !m.bye ? `<input id="${idA && side === 'a' ? idA : idB}" type="number" min="0" max="${neededWins()}" value="${side === 'a' ? m.scoreA : m.scoreB}">` : ''}
    </div>`;

  const winA = m.done && m.winnerId === m.a, winB = m.done && m.winnerId === m.b;

  return `
  <div class="match ${m.done ? 'done' : ''} ${m.bye ? 'bye' : ''}">
    <div class="m-head"><span>${extraLabel || 'M' + (i + 1)} · BO${S.rules.bo}</span>
      <span class="m-status ${status[1]}">${status[0]}</span></div>
    ${teamRow(tA, 'a', winA, winB)}
    ${teamRow(tB, 'b', winB, winA)}
    ${ready && !m.bye ? `<button class="btn btn-gold btn-sm" onclick="${r === 99 ? 'saveThirdResult()' : `saveBracketResult(${r},${i})`}">💾 Simpan Hasil</button>` : ''}
  </div>`;
}

// Render seluruh bracket ke layar
function renderBracket() {
  const B = S.bracket, box = document.getElementById('bracketWrap');
  const info = document.getElementById('bracketInfo');
  info.textContent = `Format aktif: Best of ${S.rules.bo}${S.rules.thirdPlace ? ' • Juara 3: ON' : ''}. Urutan tim saat Generate = seed.`;

  if (!B.rounds.length) {
    box.innerHTML = `<div class="empty"><span class="big">🏆</span>
      Bracket belum dibuat.<br>Daftarkan minimal 2 tim lalu klik <b>Generate Bracket</b>.</div>`;
    return;
  }

  let html = '<div class="bracket">';
  B.rounds.forEach((round, r) => {
    html += `<div class="b-round"><div class="b-round-title">${roundLabel(round.length)}</div>`;
    round.forEach((m, i) => {
      html += `<div class="b-item">${matchCardHTML(m, r, i, `bs-${r}-${i}-a`, `bs-${r}-${i}-b`)}</div>`;
    });
    html += '</div>';
  });

  // Kolom podium (juara 1–3)
  const champ = teamById(B.championId), run = teamById(B.runnerUpId), third = teamById(B.thirdId);
  html += `<div class="b-round"><div class="b-round-title">PODIUM</div><div class="podium">
    <div class="p1">🥇 <b>${champ ? esc(champ.name) : '—'}</b></div>
    <div>🥈 ${run ? esc(run.name) : '—'}</div>
    ${B.third ? `<div>🥉 ${third ? esc(third.name) : '—'}</div>` : ''}
  </div>`;

  // Kartu juara 3 (jika diaktifkan & pesertanya sudah ada)
  if (B.third && B.third.a && B.third.b) {
    html += `</div><div class="bracket" style="margin-top:22px"><div class="b-round">
      <div class="b-round-title">🥉 PEREBUTAN JUARA 3</div>
      <div class="b-item">${matchCardHTML(B.third, 99, 0, 'bt-a', 'bt-b', 'JUARA 3')}</div>
    </div>`;
  } else html += '</div>';

  box.innerHTML = html;
}

// Salin jadwal bracket ke clipboard (untuk share ke grup WA peserta)
function copyBracket() {
  if (!S.bracket.rounds.length) return toast('Belum ada bracket.', 'err');
  let txt = `🏆 ${S.tournament.name} — BRACKET (BO${S.rules.bo})\n`;
  S.bracket.rounds.forEach((round, r) => {
    txt += `\n— ${roundLabel(round.length).replace('🏆 ', '')} —\n`;
    round.forEach(m => {
      if (m.bye) txt += `• ${teamName(m.a || m.b)} → BYE (lolos otomatis)\n`;
      else if (m.a && m.b) txt += `• ${teamName(m.a)} vs ${teamName(m.b)}${m.done ? ` (${m.scoreA}-${m.scoreB})` : ''}\n`;
    });
  });
  navigator.clipboard.writeText(txt).then(() => toast('Jadwal disalin ke clipboard! 📋'));
}

// Statistik bracket untuk dashboard
function bracketStats() {
  const ms = S.bracket.rounds.flat().filter(m => !m.bye);
  return { total: ms.length, done: ms.filter(m => m.done).length, champ: S.bracket.championId };
}
