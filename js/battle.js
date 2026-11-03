/* ============================================================
   battle.js — SISTEM POIN BATTLE ROYALE (ala Free Fire / PUBG)
   Tiap match: input PERINGKAT (placement) + JUMLAH ELIMINASI tiap tim.
   Total poin = poin placement + (eliminasi × poin eliminasi).
   ============================================================ */

// Tambah match battle baru (semua tim otomatis masuk daftar input)
function addBattle() {
  if (!S.teams.length) return toast('Daftarkan tim terlebih dahulu.', 'err');
  S.battle.matches.push({
    id: uid(),
    label: 'Match ' + (S.battle.matches.length + 1),
    results: [],   // isi: [{teamId, place, kills}]
    done: false,
  });
  save(); renderBattle();
  toast('Match battle ditambahkan. 🔥');
}

// Hapus satu match battle
function deleteBattle(mid) {
  if (!confirm('Hapus match ini beserta hasilnya?')) return;
  S.battle.matches = S.battle.matches.filter(m => m.id !== mid);
  save(); refreshAll();
  toast('Match dihapus.', 'err');
}

/* Simpan hasil satu match battle.
   Validasi: peringkat tidak boleh dobel & harus 1..jumlah tim.
   Baris yang dikosongkan = tim tidak ikut match tersebut. */
function saveBattle(mid) {
  const m = S.battle.matches.find(x => x.id === mid);
  if (!m) return;
  const entries = [], usedPlace = new Set();
  let err = null;

  S.teams.forEach(t => {
    const pEl = document.getElementById(`bp-${mid}-${t.id}`);
    const kEl = document.getElementById(`bk-${mid}-${t.id}`);
    const pVal = pEl.value.trim(), kVal = kEl.value.trim();
    if (!pVal && !kVal) return; // baris kosong → tim absen di match ini

    const place = parseInt(pVal, 10);
    const kills = kVal ? parseInt(kVal, 10) : 0;
    if (isNaN(place) || place < 1 || place > S.teams.length)
      err = `Peringkat ${t.name} harus 1–${S.teams.length}.`;
    else if (isNaN(kills) || kills < 0)
      err = `Eliminasi ${t.name} harus angka ≥ 0.`;
    else if (usedPlace.has(place))
      err = `Peringkat #${place} dobel! Tiap peringkat hanya boleh 1 tim.`;
    else { usedPlace.add(place); entries.push({ teamId: t.id, place, kills }); }
  });

  if (err) return toast(err, 'err');
  if (!entries.length) return toast('Isi minimal satu tim.', 'err');

  m.results = entries;
  m.done = true;
  save(); refreshAll();
  const booyah = entries.find(e => e.place === 1);
  toast(`Hasil disimpan! 🏆 Booyah: ${teamName(booyah?.teamId)}`);
}

/* Hitung klasemen battle.
   Urutan: Total Poin → Jumlah Booyah → Total Eliminasi. */
function computeBattleStandings() {
  const rows = S.teams.map(t => ({ t, main: 0, booyah: 0, kills: 0, pts: 0 }));
  const map = Object.fromEntries(rows.map(r => [r.t.id, r]));

  S.battle.matches.filter(m => m.done).forEach(m => {
    m.results.forEach(r => {
      const row = map[r.teamId];
      if (!row) return;
      row.main++;
      row.kills += r.kills;
      if (r.place === 1) row.booyah++;
      // poin placement diambil dari tabel aturan; di luar daftar = 0
      const placePts = S.rules.placement[r.place - 1] ?? 0;
      row.pts += placePts + r.kills * (S.rules.killPts || 0);
    });
  });

  return rows.sort((x, y) =>
    y.pts - x.pts || y.booyah - x.booyah || y.kills - x.kills);
}

// Render daftar match (editor input) + klasemen
function renderBattle() {
  const box = document.getElementById('battleList');
  const tb = document.getElementById('battleTable');
  document.getElementById('battleInfo').textContent =
    `Poin placement: [${S.rules.placement.join(', ')}] • Eliminasi = ${S.rules.killPts} poin.`;

  if (!S.battle.matches.length) {
    box.innerHTML = `<div class="empty"><span class="big">🔥</span>
      Belum ada match battle.<br>Klik <b>Tambah Match</b> untuk setiap game yang dimainkan.</div>`;
    tb.innerHTML = '';
    return;
  }

  // ---- kartu tiap match ----
  box.innerHTML = S.battle.matches.map(m => `
    <div class="round-block">
      <div class="card-head">
        <h4>${esc(m.label)} ${m.done ? '<span class="fx-done">✔ SELESAI</span>' : ''}</h4>
        <button class="icon-btn" title="Hapus match" onclick="deleteBattle('${m.id}')">🗑️</button>
      </div>
      <table><thead><tr><th>Tim</th><th class="num">Peringkat</th><th class="num">Eliminasi</th></tr></thead><tbody>
      ${S.teams.map(t => {
        const res = m.results.find(r => r.teamId === t.id); // isi ulang hasil lama
        return `<tr>
          <td>${t.tag ? `<span class="tag-badge">${esc(t.tag)}</span>` : ''}${esc(t.name)}</td>
          <td class="num"><input id="bp-${m.id}-${t.id}" type="number" min="1" max="${S.teams.length}"
               style="width:80px" value="${res?.place ?? ''}" placeholder="—"></td>
          <td class="num"><input id="bk-${m.id}-${t.id}" type="number" min="0"
               style="width:80px" value="${res?.kills ?? ''}" placeholder="—"></td>
        </tr>`;
      }).join('')}
      </tbody></table>
      <p class="hint" style="margin:8px 0">Baris kosong = tim tidak ikut match ini. Peringkat tidak boleh dobel.</p>
      <button class="btn btn-gold" onclick="saveBattle('${m.id}')">💾 Simpan Hasil Match</button>
    </div>`).join('');

  // ---- klasemen battle ----
  const rows = computeBattleStandings();
  tb.innerHTML = `<table><thead><tr>
      <th class="num">#</th><th>Tim</th><th class="num">Main</th>
      <th class="num">Booyah</th><th class="num">Eliminasi</th><th class="num">Total Poin</th>
    </tr></thead><tbody>` +
    rows.map((r, i) => `
      <tr class="${i === 0 ? 'rank-1' : ''}">
        <td class="num">${i + 1}</td>
        <td>${r.t.tag ? `<span class="tag-badge">${esc(r.t.tag)}</span>` : ''}${esc(r.t.name)}</td>
        <td class="num">${r.main}</td><td class="num">${r.booyah ? '🏆 ' + r.booyah : 0}</td>
        <td class="num">${r.kills}</td><td class="num"><b>${r.pts}</b></td>
      </tr>`).join('') + '</tbody></table>';
}

// Statistik battle untuk dashboard
function battleStats() {
  const ms = S.battle.matches;
  const leader = computeBattleStandings()[0];
  return {
    total: ms.length,
    done: ms.filter(m => m.done).length,
    champ: null,
    leader: ms.some(m => m.done) && leader && leader.pts > 0 ? leader.t.name : null,
  };
}
