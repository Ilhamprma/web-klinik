// ============================
// KONFIG + ELEMEN UI
// ============================
const form = document.getElementById("formAntrian");
const statusEl = document.getElementById("status");
const listEl = document.getElementById("listAntrian");
// EVENT AKSI (layani & hapus) - JANGAN taruh di dalam fungsi
listEl.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const action = btn.dataset.action;
  const nomor = Number(btn.dataset.nomor);
  const status = btn.dataset.status;

  try {
    if (action === "layani") {
      await layaniAntrian(nomor);
      setStatus(`Antrian #${nomor} sudah dilayani!`);
      await refreshTable();
    }

    if (action === "hapus") {
      await hapusAntrian(nomor, status);
    }
  } catch (err) {
    setStatus("Error: " + err.message);
  }
});
const btnRefresh = document.getElementById("btnRefresh");
document.getElementById("year").textContent = new Date().getFullYear();

const LS_KEY = "antrian_klinik_state"; // localStorage key

// ============================
// FUNGSI BANTU (TERSTRUKTUR)
// ============================
function setStatus(text) {
  statusEl.textContent = text;
}

function saveLocalState(state) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function loadLocalState() {
  const raw = localStorage.getItem(LS_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function layaniAntrian(nomor) {
    const res = await fetch(`/api/antrian/${nomor}/layani`, {
        method: "PUT"
    });

    if (!res.ok) {
        throw new Error("Gagal melayani antrian");
    }

    setStatus(`Antrian #${nomor} sudah dilayani`);
    await refreshTable();
}


function clearForm() {
  document.getElementById("nama").value = "";
  document.getElementById("umur").value = "";
  document.getElementById("keluhan").value = "";
}

function renderTable(data) {
  listEl.innerHTML = "";

  if (!data || data.length === 0) {
    listEl.innerHTML =
      `<tr><td colspan="5" class="muted">Belum ada antrian.</td></tr>`;
    return;
  }

  const rows = data.map(item => {
    const status = String(item.status).toUpperCase();

    const btnLayani = status === "MENUNGGU"
      ? `<button class="btnSmall"
          data-action="layani"
          data-nomor="${item.nomor}">
          layani
        </button>`
      : "";

    const btnHapus = `
      <button class="btnSmall danger"
        data-action="hapus"
        data-nomor="${item.nomor}"
        data-status="${status}">
        hapus
      </button>
    `;

    return `
      <tr>
        <td><span class="badge">#${item.nomor}</span></td>
        <td>${escapeHtml(item.nama)}</td>
        <td>${escapeHtml(item.keluhan)}</td>
        <td>${escapeHtml(item.status)}</td>
        <td>${btnLayani} ${btnHapus}</td>
      </tr>
    `;
  }).join("");

  listEl.innerHTML = rows;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}


async function layani(id) {
  try {
    const res = await fetch(`/api/antrian/${id}/layani`, {
      method: "PUT"
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Gagal mengubah status");
    }

    await refreshTable();
    setStatus("✅ Antrian sudah dilayani!");
  } catch (e) {
    setStatus("Error: " + e.message);
  }
}

// ============================
// API CALL (TERSTRUKTUR)
// ============================
async function fetchAntrian() {
  const res = await fetch("/api/antrian");
  return await res.json();
}

async function tambahAntrian(nama, umur, keluhan) {
  const res = await fetch("/api/antrian", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nama, umur, keluhan })
  });

  const out = await res.json();
  if (!res.ok) throw new Error(out.error || "Gagal menambah antrian");
  return out; // {message, nomor}
}

// ============================
// ALUR UTAMA (TERSTRUKTUR)
// ============================
async function init() {
  setStatus("Memuat data antrian...");
  await refreshTable();

  // tampilkan info localStorage (opsional, buat presentasi)
  const st = loadLocalState();
  if (st && st.lastTaken) {
    setStatus(`Terakhir ambil nomor: #${st.lastTaken}`);
  } else {
    setStatus("Siap. Silakan input data pasien.");
  }
}

async function refreshTable() {
  try {
    const data = await fetchAntrian();
    renderTable(data);
  } catch (err) {
    renderTable([]);
    setStatus("Gagal memuat data: " + err.message);
  }
}

async function hapusAntrian(nomor, status) {
  // kalau masih menunggu, minta konfirmasi
  if (String(status).toUpperCase() === "MENUNGGU") {
    const ok = confirm(`Antrian #${nomor} masih MENUNGGU.\nYakin mau hapus?`);
    if (!ok) return;
  }

  const res = await fetch(`/api/antrian/${nomor}`, { method: "DELETE" });

  // biar kalau error gak "Unexpected end of JSON"
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch {}

  if (!res.ok) {
    throw new Error(data.error || "Gagal menghapus antrian");
  }

  setStatus(`Antrian #${nomor} dihapus.`);
  await refreshTable();
}

// ============================
// EVENT HANDLER
// ============================
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setStatus("Memproses...");

  const nama = document.getElementById("nama").value.trim();
  const umur = Number(document.getElementById("umur").value);
  const keluhan = document.getElementById("keluhan").value.trim();

  // validasi sederhana
  if (!nama || !umur || !keluhan) {
    setStatus("Mohon isi semua data.");
    return;
  }

  try {
    const hasil = await tambahAntrian(nama, umur, keluhan);

    // simpan state sederhana ke localStorage (nilai plus untuk tugas)
    saveLocalState({ lastTaken: hasil.nomor, time: new Date().toISOString() });

    setStatus(`Berhasil! Nomor antrian kamu: #${hasil.nomor}`);
    clearForm();
    await refreshTable();
  } catch (err) {
    setStatus("Error: " + err.message);
  }
});

btnRefresh.addEventListener("click", async () => {
  setStatus("Refresh data...");
  await refreshTable();
  setStatus("Data diperbarui.");
});

// start
init();
