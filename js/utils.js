/* ============================================================
   utils.js — fungsi bantu umum (ID, escape HTML, toast, modal)
   ============================================================ */

// Membuat ID unik untuk tim / match
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Membersihkan teks agar aman dimasukkan ke HTML (anti XSS / error kutip)
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Ambil objek tim berdasarkan ID; return null jika tidak ada
function teamById(id) {
  return S.teams.find(t => t.id === id) || null;
}

// Nama tim aman-tampil; fallback "—" jika tim kosong/dihapus
function teamName(id) {
  const t = teamById(id);
  return t ? esc(t.name) : '—';
}

// Format tanggal Indonesia, mis. "2 Nov 2026"
function fmtDate(d) {
  if (!d) return '';
  try { return new Date(d + 'T00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

// Notifikasi kecil di pojok kanan bawah. type: 'ok' | 'err'
function toast(msg, type = 'ok') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  document.getElementById('toastRoot').appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 350); }, 2600);
}

// Modal sederhana: isi dengan string HTML, tombol tutup otomatis tersedia
function openModal(html) {
  document.getElementById('modalRoot').innerHTML =
    `<div class="modal-back" onclick="if(event.target===this)closeModal()">
       <div class="modal">${html}</div>
     </div>`;
}
function closeModal() { document.getElementById('modalRoot').innerHTML = ''; }

// Tutup modal dengan tombol Escape
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
