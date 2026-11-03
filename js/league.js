/* ============================================================
   league.js — SISTEM LIGA (Round Robin) + KLASEMEN
   Setiap tim bertemu semua tim lain. Poin menang/seri/kalah
   bisa diatur di menu Pengaturan.
   ============================================================ */

/* Algoritma "circle method": susun jadwal round robin adil.
   Jika jumlah tim ganjil, satu tim libur tiap pekan. */
function roundRobin(ids) {
  const arr = ids.slice();
  if (arr.length % 2) arr.push(null); // null = libur
  const n = arr.length, rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const round = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i], b = arr[n - 1 - i];
      if (a && b) round.push({ a, b });
    }
    rounds.push(round);
    arr.splice(1, 0, arr.pop()); // rotasi posisi, posisi 0 tetap
  }
  return rounds;
}

// Generate jadwal liga dari tim terdaftar
function generateLeague() {
  if (S.teams.length < 2) return toast('Minimal 2 tim untuk liga.', 'err');
  if (S.league.generated && !confirm('Jadwal liga sudah ada. Timpa?')) return;

  const fixtures = [];
  roundRobin(S.teams.map(t => t.id)).forEach((round, ri) => {
    round.forEach(pair => fixtures.push({
      id: uid(), round: ri + 1,
      a: pair.a, b: pair.b,
      scoreA: null, scoreB: null, done: false,
    }));
  });
  S.league = { fixtures, generated: true };
  save(); refreshAll();
  toast(`Jadwal liga ${fixtures.length} pertandingan dibuat! 📋`);
}

// Simpan hasil satu pertandingan liga
function saveLeagueResult(fid) {
  const f = S.league.fixtures.find(x => x.id === fid);
  if (!f) return;
  const a = parseInt(document.getElementById(`ls-${fid}-a`).value, 10);
  const b = parseInt(document.getElementById(`ls-${fid}-b`).value, 10);
  if (isNaN(a) || isNaN(b) || a < 0 || b < 0) return toast('Isi skor kedua tim (angka ≥ 0).', 'err');
  f.scoreA = a; f.scoreB = b; f.done = true;
  save(); refreshAll();
  toast('Hasil liga disimpan. ✅');
}

/* Hitung klasemen.
   Urutan peringkat: Poin → Selisih Gol → Gol Masuk → Nama. */
function computeStandings() {
  const rows = S.teams.map(t => ({ t, main: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
  const map = Object.fromEntries(rows.map(r => [r.t.id, r]));

  S.league.fixtures.filter(f => f.done).forEach(f => {
    const A = map[f.a], Bm = map[f.b];
    if (!A || !Bm) return;
    A.main++; Bm.main++;
    A.gf += f.scoreA; A.ga += f.scoreB;
    Bm.gf += f.scoreB; Bm.ga += f.scoreA;
    if (f.scoreA > f.scoreB)      { A.w++; Bm.l++; A.pts += S.rules.winPts; Bm.pts += S.rules.losePts; }
    else if (f.scoreA < f.scoreB) { Bm.w++; A.l++; Bm.pts += S.rules.winPts; A.pts += S.rules.losePts; }
    else                          { A.d++; Bm.d++; A.pts += S.rules.drawPts; Bm.pts += S.rules.drawPts; }
  });

  return rows.sort((x, y) =>
    y.pts - x.pts ||
    (y.gf - y.ga) - (x.gf - x.ga) ||
    y.gf - x.gf ||
    x.t.name.localeCompare(y.t.name));
}

// Render jadwal (dikelompokkan per pekan/ronde) + klasemen
function renderLeague() {
  const fx = document.getElementById('leagueFixtures');
  const tb = document.getElementById('leagueTable');

  if (!S.league.generated) {
    fx.innerHTML = `<div class="empty"><span class="big">📋</span>
      Jadwal liga belum dibuat.<br>Klik <b>Generate Jadwal</b> setelah tim terdaftar.</div>`;
    tb.innerHTML = '';
    return;
  }

  // ---- jadwal per pekan ----
  const maxRound = Math.max(...S.league.fixtures.map(f => f.round));
  let html = '';
  for (let r = 1; r <= maxRound; r++) {
    const list = S.league.fixtures.filter(f => f.round === r);
    html += `<div class="round-block"><h4>PEKAN ${r}</h4>` + list.map(f => `
      <div class="fx-row">
        <span class="fname right">${teamName(f.a)}</span>
        <input id="ls-${f.id}-a" type="number" min="0" value="${f.scoreA ?? ''}" placeholder="-">
        <span class="vs">VS</span>
        <input id="ls-${f.id}-b" type="number" min="0" value="${f.scoreB ?? ''}" placeholder="-">
        <span class="fname">${teamName(f.b)}</span>
        ${f.done
          ? '<span class="fx-done">✔ SELESAI</span>'
          : `<button class="btn btn-gold btn-sm" onclick="saveLeagueResult('${f.id}')">Simpan</button>`}
      </div>`).join('') + '</div>';
  }
  fx.innerHTML = html;

  // ---- tabel klasemen ----
  const rows = computeStandings();
  tb.innerHTML = `<table><thead><tr>
      <th class="num">#</th><th>Tim</th>
      <th class="num">M</th><th class="num">M</th><th class="num">S</th><th class="num">K</th>
      <th class="num">GM</th><th class="num">GK</th><th class="num">SG</th><th class="num">Poin</th>
    </tr></thead><tbody>` +
    rows.map((r, i) => `
      <tr class="${i === 0 ? 'rank-1' : ''}">
        <td class="num">${i + 1}</td>
        <td>${r.t.tag ? `<span class="tag-badge">${esc(r.t.tag)}</span>` : ''}${esc(r.t.name)}</td>
        <td class="num">${r.main}</td><td class="num">${r.w}</td>
        <td class="num">${r.d}</td><td class="num">${r.l}</td>
        <td class="num">${r.gf}</td><td class="num">${r.ga}</td>
        <td class="num">${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td>
        <td class="num"><b>${r.pts}</b></td>
      </tr>`).join('') +
    `</tbody></table>
    <p class="hint" style="margin-top:10px">Poin: Menang ${S.rules.winPts} • Seri ${S.rules.drawPts} • Kalah ${S.rules.losePts}.
    M=Main, S=Seri, GM/GK=Gol Masuk/Kemasukan, SG=Selisih Gol.</p>`;
}

// Salin jadwal liga ke clipboard
function copyLeague() {
  if (!S.league.generated) return toast('Belum ada jadwal liga.', 'err');
  let txt = `📋 ${S.tournament.name} — JADWAL LIGA\n`;
  const maxRound = Math.max(...S.league.fixtures.map(f => f.round));
  for (let r = 1; r <= maxRound; r++) {
    txt += `\nPekan ${r}:\n`;
    S.league.fixtures.filter(f => f.round === r)
      .forEach(f => txt += `• ${teamName(f.a)} vs ${teamName(f.b)}\n`);
  }
  navigator.clipboard.writeText(txt).then(() => toast('Jadwal liga disalin! 📋'));
}

// Statistik liga untuk dashboard
function leagueStats() {
  const fx = S.league.fixtures;
  const leader = computeStandings()[0];
  return {
    total: fx.length,
    done: fx.filter(f => f.done).length,
    champ: null,
    leader: fx.some(f => f.done) && leader ? leader.t.name : null,
  };
}
