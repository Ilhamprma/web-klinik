const express = require("express");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = 3000;

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// serve frontend
app.use(express.static(path.join(__dirname, "public")));

/* =====================
   API ANTRIAN KLINIK
   ===================== */

/*
ALUR TAMBAH ANTRIAN (TERSTRUKTUR):
1. Terima data pasien
2. Simpan ke tabel pasien
3. Ambil nomor antrian terakhir
4. Nomor baru = terakhir + 1
5. Simpan ke tabel antrian
6. Kirim hasil ke user
*/

// tambah pasien + antrian
app.post("/api/antrian", (req, res) => {
  const { nama, umur, keluhan } = req.body;

  // validasi sederhana
  if (!nama || !umur || !keluhan) {
    return res.status(400).json({ error: "Data tidak lengkap" });
  }

  // 1) simpan pasien
  const pasien = db
    .prepare("INSERT INTO pasien (nama, umur, keluhan) VALUES (?, ?, ?)")
    .run(nama, umur, keluhan);

  const pasienId = pasien.lastInsertRowid;

  // 2) ambil nomor antrian terakhir
  const last = db
    .prepare("SELECT nomor FROM antrian ORDER BY nomor DESC LIMIT 1")
    .get();

  const nomorBaru = last ? last.nomor + 1 : 1;

  // 3) simpan antrian
  db.prepare(
    "INSERT INTO antrian (pasien_id, nomor) VALUES (?, ?)"
  ).run(pasienId, nomorBaru);

  res.json({
    message: "Antrian berhasil ditambahkan",
    nomor: nomorBaru
  });
});

// ambil semua antrian
app.get("/api/antrian", (req, res) => {
  const data = db.prepare(`
    SELECT 
      antrian.id,
      antrian.nomor,
      pasien.nama,
      pasien.keluhan,
      antrian.status
    FROM antrian
    JOIN pasien ON pasien.id = antrian.pasien_id
    ORDER BY antrian.nomor ASC
  `).all();

  res.json(data);
});

// hapus antrian berdasarkan nomor
app.delete("/api/antrian/:nomor", (req, res) => {
  const nomor = Number(req.params.nomor);

  if (!nomor) {
    return res.status(400).json({ error: "Nomor tidak valid" });
  }

  const info = db
    .prepare("DELETE FROM antrian WHERE nomor = ?")
    .run(nomor);

  if (info.changes === 0) {
    return res.status(404).json({ error: "Data antrian tidak ditemukan" });
  }

  res.json({ message: "Antrian berhasil dihapus", nomor });
});

app.put("/api/antrian/:nomor/layani", (req, res) => {
  const { nomor } = req.params;

  const result = db.prepare(`
    UPDATE antrian
    SET status = 'SELESAI'
    WHERE nomor = ?
  `).run(nomor);

  if (result.changes === 0) {
    return res.status(404).json({ error: "Antrian tidak ditemukan" });
  }

  res.json({ message: "Status antrian diperbarui" });
});

// server jalan
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
