/* ============================================================
   teams.js — tambah / edit / hapus tim, acak seed
   ============================================================ */

// Tambah tim dari form di halaman Tim
function addTeam(ev) {
  ev.preventDefault();
  const name = document.getElementById('tName').value.trim();
  if (!name) return toast('Nama tim wajib diisi.', 'err');

  const playersRaw = document.getElementById('tPlayers').value;
  S.teams.push({
    id: uid(),
    name,
    tag: document.getElementById('tTag').value.trim().toUpperCase(),
    // pemain boleh dipisah koma ATAU titik koma
    players: playersRaw.split(/[,;]/).map(p => p.trim()).filter(Boolean),
  });
  save(); refreshAll();
  ev.target.reset();
  toast(`Tim "${name}" terdaftar! 👥`);
}

// Acak urutan tim (urutan = seed untuk bracket)
function shuffleTeams() {
  for (let i = S.teams.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [S.teams[i], S.teams[j]] = [S.teams[j], S.teams[i]];
  }
  save(); renderTeams();
  toast('Urutan seed diacak. 🎲');
}

// Hapus tim. Jika sudah ada jadwal/bracket, data pertandingan ikut direset.
function deleteTeam(id) {
  const t = teamById(id);
  const hasData = S.bracket.rounds.length || S.league.generated || S.battle.matches.length;
  const warn = hasData ? '\n\n⚠️ Jadwal / bracket / battle yang sudah dibuat akan DIRESET.' : '';
  if (!confirm(`Hapus tim "${t?.name}"?${warn}`)) return;

  S.teams = S.teams.filter(x => x.id !== id);
  if (hasData) { // reset semua modul pertandingan
    S.bracket = { rounds: [], third: null, championId: null, runnerUpId: null, thirdId: null };
    S.league = { fixtures: [], generated: false };
    S.battle = { matches: [] };
  }
  save(); refreshAll();
  toast('Tim dihapus.', 'err');
}

// Buka modal edit tim (dipanggil dari tombol ✏️)
function openTeamModal(id) {
  const t = teamById(id);
  if (!t) return;
  openModal(`
    <h3>✏️ Edit Tim</h3>
    <label>Nama Tim <input id="emName" value="${esc(t.name)}"></label>
    <label>Tag <input id="emTag" value="${esc(t.tag)}" maxlength="6" style="text-transform:uppercase"></label>
    <label>Players (pisah koma) <input id="emPlayers" value="${esc(t.players.join(', '))}"></label>
    <div class="btn-row" style="justify-content:flex-end">
      <button class="btn btn-ghost" onclick="closeModal()">Batal</button>
      <button class="btn btn-gold" onclick="saveTeam('${id}')">Simpan</button>
    </div>`);
}

// Simpan perubahan dari modal edit
function saveTeam(id) {
  const t = teamById(id);
  if (!t) return;
  t.name = document.getElementById('emName').value.trim() || t.name;
  t.tag = document.getElementById('emTag').value.trim().toUpperCase();
  t.players = document.getElementById('emPlayers').value.split(/[,;]/).map(p => p.trim()).filter(Boolean);
  save(); closeModal(); refreshAll();
  toast('Data tim diperbarui. ✅');
}

// Render daftar tim ke halaman Tim
function renderTeams() {
  const box = document.getElementById('teamList');
  document.getElementById('pillTeams').textContent = S.teams.length; // badge di nav

  if (!S.teams.length) {
    box.innerHTML = `<div class="empty"><span class="big">👥</span>
      Belum ada tim terdaftar.<br>Gunakan form di atas untuk menambahkan tim.</div>`;
    return;
  }

  box.innerHTML = `<table><thead><tr>
      <th class="num">Seed</th><th>Tim</th><th>Players</th><th class="num">Aksi</th>
    </tr></thead><tbody>` +
    S.teams.map((t, i) => `
      <tr>
        <td class="num"><span class="seed-no">${i + 1}</span></td>
        <td>${t.tag ? `<span class="tag-badge">${esc(t.tag)}</span>` : ''}<b>${esc(t.name)}</b></td>
        <td style="color:var(--muted); font-size:13px">${esc(t.players.join(', ')) || '—'}</td>
        <td class="num">
          <button class="icon-btn" title="Edit" onclick="openTeamModal('${t.id}')">✏️</button>
          <button class="icon-btn" title="Hapus" onclick="deleteTeam('${t.id}')">🗑️</button>
        </td>
      </tr>`).join('') +
    '</tbody></table>';
}
