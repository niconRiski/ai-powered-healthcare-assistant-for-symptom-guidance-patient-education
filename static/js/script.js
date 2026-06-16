// ============================================================
//  script.js — Logika Frontend Asisten Kesehatan AI
//  Berkomunikasi dengan Flask API di backend
// ============================================================

// ── STATE APLIKASI ───────────────────────────────────────────
const state = {
  gejalaTerpilih: [],
  tabAktif: "beranda",
};

// ── NAVIGASI TAB ─────────────────────────────────────────────
function gantiTab(namaTab) {
  document.querySelectorAll(".panel").forEach((p) => p.classList.remove("aktif"));
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("aktif"));
  document.getElementById("tab-" + namaTab)?.classList.add("aktif");
  document.querySelector(`[data-tab="${namaTab}"]`)?.classList.add("aktif");
  state.tabAktif = namaTab;
}

// ── UTILITAS: TAMPILKAN LOADING ──────────────────────────────
function tampilkanLoading(elId, pesan = "Memproses dengan AI...") {
  const el = document.getElementById(elId);
  if (!el) return;
  el.classList.add("terlihat");
  el.innerHTML = `
    <div class="loading-row">
      <div class="spinner"></div>
      <span>${pesan}</span>
    </div>`;
}

// ── UTILITAS: FORMAT MARKDOWN SEDERHANA ─────────────────────
function formatMarkdown(teks) {
  let html = teks
    .replace(/## (.+)/g, '<h3 class="hasil-h3">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^\d+\.\s*.+$/gm, "<p>$&</p>")
    .replace(/^- (.+)$/gm, '<div class="item-list">• $1</div>')
    .replace(/\n\n/g, "<br><br>")
    .replace(/---/g, '<hr class="divider-tipis">');

  // Menambahkan penanganan untuk blok kode dengan tombol salin
  html = html.replace(/```(\w*)\n([\s\S]*?)\n```/g, (match, lang, code) => {
    const escapedCode = escHtml(code.trim());
    return `<div class="code-block-wrapper"><pre><button class="btn-salin" onclick="copyCode(this)">Salin</button><code class="language-${lang}">${escapedCode}</code></pre></div>`;
  });
  return html;
}

// ── UTILITAS: TAMPILKAN HASIL ────────────────────────────────
function tampilkanHasil(elId, isi, judulIkon = "🤖") {
  const el = document.getElementById(elId);
  if (!el) return;
  el.classList.add("terlihat");
  el.innerHTML = `
    <div class="hasil-header">${judulIkon} Hasil Analisis AI</div>
    <div class="hasil-isi">${formatMarkdown(isi)}</div>
    <div class="disclaimer-box">
      ⚠️ Informasi ini bersifat edukatif dan bukan pengganti konsultasi medis profesional.
    </div>`;
}

// ── UTILITAS: TAMPILKAN ERROR ────────────────────────────────
function tampilkanError(elId, pesan, saranAksi = null, isHtml = false) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.classList.add("terlihat");
  let actionButton = '';
  if (saranAksi === 'resetChat') {
    actionButton = `<button class="btn-secondary mt-3" onclick="resetChat();">Reset Riwayat Chat</button>`;
  } else if (saranAksi === 'reloadPage') {
    actionButton = `<button class="btn-secondary mt-3" onclick="location.reload();">Muat Ulang Halaman</button>`;
  }
  el.innerHTML = `
    <div class="error-box">
      <p>❌ ${pesan}</p>
      ${actionButton}
    </div>`;
}
// ── PANGGIL API BACKEND ──────────────────────────────────────
async function panggilAPI(endpoint, data) {
  const respons = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  // Check if the response was successful (status code 200-299)
  if (!respons.ok) {
    let errorData;
    try {
      // Try to parse JSON error from backend
      errorData = await respons.json(); 
    } catch (e) {
      // If parsing fails, it means the server sent non-JSON (e.g., HTML error page)
      throw new Error(`Server merespons dengan status ${respons.status}: ${respons.statusText || 'Kesalahan tidak diketahui'}.`);
    }
    // If JSON was parsed, but it's an error, throw it
    throw new Error(errorData.error || `Server merespons dengan status ${respons.status}: ${respons.statusText || 'Kesalahan tidak diketahui'}.`);
  }
  return await respons.json(); // Only parse JSON if response is OK
}

// ── UTILITAS: SALIN KODE ─────────────────────────────────────
function copyCode(button) {
  const pre = button.closest('pre');
  const code = pre.querySelector('code');
  if (!code) return;

  navigator.clipboard.writeText(code.innerText).then(() => {
    button.textContent = 'Disalin!';
    setTimeout(() => {
      button.textContent = 'Salin';
    }, 2000);
  }).catch(err => {
    console.error('Gagal menyalin kode: ', err);
    button.textContent = 'Gagal';
  });
}

// ============================================================
//  FITUR 1: PEMERIKSA GEJALA
// ============================================================
const DAFTAR_GEJALA = [
  { nama: "Demam", ikon: "🌡️", sistem: "umum" },
  { nama: "Batuk", ikon: "😮‍💨", sistem: "pernapasan" },
  { nama: "Sakit Kepala", ikon: "🤕", sistem: "kepala" },
  { nama: "Pusing", ikon: "😵", sistem: "kepala" },
  { nama: "Sesak Nafas", ikon: "🫁", sistem: "pernapasan" },
  { nama: "Nyeri Dada", ikon: "❤️", sistem: "pernapasan" },
  { nama: "Mual", ikon: "🤢", sistem: "pencernaan" },
  { nama: "Muntah", ikon: "🤮", sistem: "pencernaan" },
  { nama: "Diare", ikon: "🚽", sistem: "pencernaan" },
  { nama: "Nyeri Perut", ikon: "🫃", sistem: "pencernaan" },
  { nama: "Kelelahan", ikon: "😴", sistem: "umum" },
  { nama: "Lemas", ikon: "💪", sistem: "umum" },
  { nama: "Menggigil", ikon: "🥶", sistem: "umum" },
  { nama: "Keringat Malam", ikon: "💦", sistem: "umum" },
  { nama: "Nyeri Sendi", ikon: "🦵", sistem: "tulang" },
  { nama: "Nyeri Punggung", ikon: "🔙", sistem: "tulang" },
  { nama: "Nyeri Otot", ikon: "💪", sistem: "tulang" },
  { nama: "Ruam Kulit", ikon: "🔴", sistem: "kulit" },
  { nama: "Gatal", ikon: "😖", sistem: "kulit" },
  { nama: "Pilek", ikon: "🤧", sistem: "pernapasan" },
  { nama: "Sakit Tenggorokan", ikon: "🗣️", sistem: "pernapasan" },
  { nama: "Mual Pagi", ikon: "🌅", sistem: "pencernaan" },
  { nama: "Penglihatan Kabur", ikon: "👁️", sistem: "kepala" },
  { nama: "Jantung Berdebar", ikon: "💓", sistem: "umum" },
  { nama: "Sulit Tidur", ikon: "🌙", sistem: "umum" },
  { nama: "Cemas Berlebihan", ikon: "😰", sistem: "mental" },
  { nama: "Sedih Terus-Menerus", ikon: "😔", sistem: "mental" },
  { nama: "Sering Buang Air Kecil", ikon: "🚾", sistem: "umum" },
  { nama: "Bengkak", ikon: "🎈", sistem: "umum" },
  { nama: "Kulit Kuning", ikon: "🟡", sistem: "kulit" },
];

function renderDaftarGejala() {
  const container = document.getElementById("grid-gejala");
  if (!container) return;

  const filter = document.getElementById("filter-sistem")?.value || "semua";
  const cari = document.getElementById("cari-gejala")?.value.toLowerCase() || "";

  const terfilter = DAFTAR_GEJALA.filter((g) => {
    const cocokSistem = filter === "semua" || g.sistem === filter;
    const cocokCari = g.nama.toLowerCase().includes(cari);
    return cocokSistem && cocokCari;
  });

  container.innerHTML = terfilter
    .map(
      (g) => `
    <button class="btn-gejala ${state.gejalaTerpilih.includes(g.nama) ? "terpilih" : ""}"
      onclick="pilihGejala('${g.nama}')">
      ${g.ikon} ${g.nama}
    </button>`
    )
    .join("");
}

function pilihGejala(nama) {
  const idx = state.gejalaTerpilih.indexOf(nama);
  if (idx >= 0) {
    state.gejalaTerpilih.splice(idx, 1);
  } else {
    state.gejalaTerpilih.push(nama);
  }
  renderDaftarGejala();
  updateTampilGejala();
}

function updateTampilGejala() {
  const el = document.getElementById("gejala-terpilih");
  const btn = document.getElementById("btn-analisis");
  if (!el || !btn) return;

  if (state.gejalaTerpilih.length === 0) {
    el.innerHTML = '<span class="teks-redup">Belum ada gejala dipilih</span>';
    btn.disabled = true;
  } else {
    el.innerHTML = state.gejalaTerpilih
      .map(
        (g) => `
      <span class="tag-gejala">
        ${g}
        <button onclick="pilihGejala('${g}')" title="Hapus">×</button>
      </span>`
      )
      .join("");
    btn.disabled = false;
  }
}

// ── Helper: Ambil profil pasien dari form UI baru ────────────
function scGetProfile() {
  // Ambil riwayat penyakit yang dicentang
  const riwayatChecked = [...document.querySelectorAll('#sc-riwayat-group .sc-checkbox-btn.checked')]
    .map(b => b.textContent.replace(/^✓\s*/,'').trim())
    .filter(t => t !== '🚫 Tidak Ada');
  // Ambil kondisi khusus yang dicentang  
  const kondisiChecked = [...document.querySelectorAll('#sc-kondisi-group .sc-checkbox-btn.checked')]
    .map(b => b.textContent.replace(/^✓\s*/,'').trim())
    .filter(t => t !== '🚫 Tidak Ada');

  return {
    usia:           parseInt(document.getElementById('input-usia')?.value || '25'),
    jenisKelamin:   document.getElementById('pilih-jk')?.value || 'tidak disebutkan',
    keparahan:      parseInt(document.getElementById('slider-keparahan')?.value || '5'),
    durasi:         document.getElementById('pilih-durasi')?.value || 'beberapa hari',
    riwayat:        riwayatChecked.length > 0 ? riwayatChecked.join(', ') : 'Tidak ada',
    kondisiKhusus:  kondisiChecked.length > 0 ? kondisiChecked.join(', ') : 'Tidak ada',
    alergi:         (document.getElementById('sc-alergi')?.value || '').trim() || 'Tidak ada',
  };
}

async function analisisGejalaDenganGambar() {
  const fileInput = document.getElementById('input-foto-gejala');
  const imageFile = fileInput?.files?.[0];
  if (!imageFile) {
    tampilkanError('hasil-gejala', 'Pilih dulu file foto gejala yang ingin dianalisis.');
    return;
  }

  const deskripsi = document.getElementById('symptoms')?.value.trim() || '';
  const profil    = scGetProfile();

  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('deskripsi', deskripsi);
  formData.append('keparahan', profil.keparahan);
  formData.append('durasi', profil.durasi);
  formData.append('usia', profil.usia);
  formData.append('jenis_kelamin', profil.jenisKelamin);
  formData.append('riwayat', profil.riwayat);
  formData.append('kondisi_khusus', profil.kondisiKhusus);
  formData.append('alergi', profil.alergi);
  formData.append('gejala', JSON.stringify(state.gejalaTerpilih || []));

  tampilkanLoading('hasil-gejala',
    `🔬 Menganalisis foto "${imageFile.name}" + gejala dengan AI Vision... Mohon tunggu.`);

  try {
    const res = await fetch('/api/gejala-image', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      let errText = '';
      try { const j = await res.json(); errText = j.error || ''; } catch (e) {}
      throw new Error(errText || `Gagal analisis gambar (${res.status})`);
    }

    const data = await res.json();
    if (data.error) {
      tampilkanError('hasil-gejala', data.error);
    } else {
      tampilkanHasil('hasil-gejala', data.hasil, '🩺');
      // Tampilkan result dashboard setelah hasil muncul
      setTimeout(() => {
        if (typeof scShowResultDashboard === 'function' && state.gejalaTerpilih.length > 0) {
          scShowResultDashboard();
        }
      }, 600);
    }
  } catch (err) {
    tampilkanError('hasil-gejala', err.message || 'Gagal terhubung ke server untuk analisis gambar.');
  }
}

async function analisisGejala() {
  // Jika user mengunggah foto, gunakan endpoint multimodal
  const fileInput = document.getElementById('input-foto-gejala');
  const imageFile = fileInput?.files?.[0];
  if (imageFile) {
    return analisisGejalaDenganGambar();
  }

  const deskripsi = document.getElementById("symptoms")?.value.trim() || "";
  if (state.gejalaTerpilih.length === 0 && !deskripsi) {
    tampilkanError("hasil-gejala", "Mohon deskripsikan gejala Anda atau pilih minimal satu dari daftar.");
    return;
  }

  const profil = scGetProfile();

  tampilkanLoading("hasil-gejala",
    "🤖 Dr. Aura sedang menganalisis gejala Anda secara mendalam... Mohon tunggu.");

  try {
    const data = await panggilAPI("/api/gejala", {
      deskripsi:      deskripsi,
      gejala:         state.gejalaTerpilih,
      keparahan:      profil.keparahan,
      durasi:         profil.durasi,
      usia:           profil.usia,
      jenis_kelamin:  profil.jenisKelamin,
      riwayat:        profil.riwayat,
      kondisi_khusus: profil.kondisiKhusus,
      alergi:         profil.alergi,
    });

    if (data.error) {
      tampilkanError("hasil-gejala", data.error);
    } else {
      tampilkanHasil("hasil-gejala", data.hasil, "🩺");
      // Tampilkan result dashboard setelah hasil muncul
      setTimeout(() => {
        if (typeof scShowResultDashboard === 'function' && state.gejalaTerpilih.length > 0) {
          scShowResultDashboard();
        }
      }, 600);
    }
  } catch (err) {
    tampilkanError("hasil-gejala", err.message || "Gagal terhubung ke server. Pastikan app.py berjalan.");
  }
}

// ============================================================
//  FITUR 2: CHAT KESEHATAN
// ============================================================
let riwayatChat = [];

function handleEnterChat(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    kirimChat();
  }
}

function kirimChatCepat(pesan) {
  document.getElementById("input-chat").value = pesan;
  kirimChat();
}

async function kirimChat() {
  const inputEl = document.getElementById("input-chat");
  const pesan = inputEl?.value.trim();
  if (!pesan) return;

  inputEl.value = "";
  const kontainerChat = document.getElementById("pesan-chat");
  const btnKirim = document.getElementById("btn-kirim-chat");
  if (btnKirim) btnKirim.disabled = true;

  const waktu = new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Tambahkan pesan pengguna
  kontainerChat.innerHTML += `
    <div class="pesan pengguna">
      <div class="avatar-pengguna">👤</div>
      <div>
        <div class="gelembung-pengguna">${escHtml(pesan)}</div>
        <div class="waktu-pesan" style="text-align:right">${waktu}</div>
      </div>
    </div>`;

  // Indikator mengetik
  const idTyping = "typing-" + Date.now();
  kontainerChat.innerHTML += `
    <div class="pesan ai" id="${idTyping}">
      <div class="avatar-ai" style="padding:0; overflow:hidden; border:2px solid var(--blue-accent); background:transparent;"><img src="/static/karakter5.png" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" alt="AI"></div>
      <div class="indikator-typing">
        <span class="titik"></span>
        <span class="titik"></span>
        <span class="titik"></span>
      </div>
    </div>`;
  kontainerChat.scrollTop = kontainerChat.scrollHeight;

  try {
    const data = await panggilAPI("/api/chat", { pesan });
    const respons = data.respons || data.error || "Terjadi kesalahan.";

    riwayatChat.push({ pengguna: pesan, ai: respons });

    document.getElementById(idTyping).outerHTML = `
      <div class="pesan ai">
        <div class="avatar-ai" style="padding:0; overflow:hidden; border:2px solid var(--blue-accent); background:transparent;"><img src="/static/karakter5.png" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" alt="AI"></div>
        <div>
          <div class="gelembung-ai">
            ${formatMarkdown(respons)}

          </div>
          <div class="waktu-pesan">${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</div>
        </div>
      </div>`;
  } catch (err) {
    const errorMessage = err.message || "Gagal terhubung ke server.";
    document.getElementById(idTyping).outerHTML = `
      <div class="pesan ai error">
        <div class="avatar-ai" style="padding:0; overflow:hidden; border:2px solid var(--blue-accent); background:transparent;"><img src="/static/karakter5.png" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" alt="AI"></div>
        <div class="gelembung-ai error-box">❌ ${escHtml(errorMessage)}</div>
      </div>`;
  }

  kontainerChat.scrollTop = kontainerChat.scrollHeight;
  if (btnKirim) btnKirim.disabled = false;
}

async function muatRiwayatChat() {
  const kontainerChat = document.getElementById("pesan-chat");
  if (!kontainerChat) return;

  try {
    const respons = await fetch("/api/chat-history"); // Method GET, no body

    if (!respons.ok) {
      let errorData;
      try {
        errorData = await respons.json();
      } catch (e) {
        // If parsing fails, it means the server sent non-JSON (e.g., HTML error page)
        throw new Error(`Server merespons dengan status ${respons.status}: ${respons.statusText || 'Kesalahan tidak diketahui'}.`);
      }
      throw new Error(errorData.error || `Server merespons dengan status ${respons.status}: ${respons.statusText || 'Kesalahan tidak diketahui'}.`);
    }

    const data = await respons.json(); // Parse JSON only if response is OK

    if (data.riwayat && data.riwayat.length > 0) {
      riwayatChat = data.riwayat; // Sinkronkan state lokal
      kontainerChat.innerHTML = ""; // Hapus pesan selamat datang

      data.riwayat.forEach(item => {
        const waktu = item.timestamp 
          ? new Date(item.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
          : "";

        kontainerChat.innerHTML += `
          <div class="pesan pengguna">
            <div class="avatar-pengguna">👤</div>
            <div>
              <div class="gelembung-pengguna">${escHtml(item.pengguna)}</div>
              ${waktu ? `<div class="waktu-pesan" style="text-align:right">${waktu}</div>` : ''}
            </div>
          </div>`;
        kontainerChat.innerHTML += `
          <div class="pesan ai">
            <div class="avatar-ai" style="padding:0; overflow:hidden; border:2px solid var(--blue-accent); background:transparent;"><img src="/static/karakter5.png" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" alt="AI"></div>
            <div>
              <div class="gelembung-ai">${formatMarkdown(item.ai)}</div>
              ${waktu ? `<div class="waktu-pesan">${waktu}</div>` : ''}
            </div>
          </div>`;
      });
    } else {
      // Jika tidak ada riwayat, tampilkan pesan selamat datang.
      // Ini duplikat dari resetChat, tapi tanpa API call.
      kontainerChat.innerHTML = `
      <div class="pesan ai">
        <div class="avatar-ai" style="padding:0; overflow:hidden; border:2px solid var(--blue-accent); background:transparent;"><img src="/static/karakter5.png" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" alt="AI"></div>
        <div class="gelembung-ai">
          Halo! Saya Asisten Kesehatan AI Anda. Ada yang bisa saya bantu?<br><br>
          Saya dapat membantu dengan pertanyaan seputar gejala, obat-obatan, pola hidup sehat, dan kesehatan mental.<br><br>
          <em>Ingat: Saya memberikan informasi edukatif, bukan pengganti dokter.</em>
        </div>
      </div>`;
    }
  } catch (err) {
    console.error("Gagal memuat riwayat chat:", err);
    kontainerChat.innerHTML = `<div class="pesan ai error"><div class="avatar-ai" style="padding:0; overflow:hidden; border:2px solid var(--blue-accent); background:transparent;"><img src="/static/karakter5.png" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" alt="AI"></div><div class="gelembung-ai error-box">❌ Gagal memuat riwayat chat: ${err.message}. ${kontainerChat.id === 'pesan-chat' ? '<button class="btn-secondary mt-3" onclick="resetChat();">Reset Riwayat Chat</button>' : ''}</div></div>`;
  } finally {
    if (kontainerChat) kontainerChat.scrollTop = kontainerChat.scrollHeight;
  }
}

async function resetChat() {
  await panggilAPI("/api/reset-chat", {});
  riwayatChat = [];
  const kontainer = document.getElementById("pesan-chat");
  if (kontainer) {
    kontainer.innerHTML = `
      <div class="pesan ai">
        <div class="avatar-ai" style="padding:0; overflow:hidden; border:2px solid var(--blue-accent); background:transparent;"><img src="/static/karakter5.png" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" alt="AI"></div>
        <div class="gelembung-ai">
          Halo! Saya Asisten Kesehatan AI Anda. Ada yang bisa saya bantu?<br><br>
          Saya dapat membantu dengan pertanyaan seputar gejala, obat-obatan, pola hidup sehat, dan kesehatan mental.<br><br>
          <em>Ingat: Saya memberikan informasi edukatif, bukan pengganti dokter.</em>
        </div>
      </div>`;
  }
}

// ============================================================
//  FITUR 3: INFORMASI OBAT
// ============================================================
function isiNamaObat(nama) {
  const el = document.getElementById("input-obat");
  if (el) el.value = nama;
  cariInfoObat();
}

async function cariInfoObat() {
  const nama = document.getElementById("input-obat")?.value.trim();
  if (!nama) return;

  tampilkanLoading("hasil-obat", `Mencari informasi tentang ${nama}...`);

  try {
    const data = await panggilAPI("/api/obat", { nama_obat: nama });
    if (data.error) {
      tampilkanError("hasil-obat", data.error);
    } else {
      tampilkanHasil("hasil-obat", data.hasil, "💊");
    }
  } catch {
    tampilkanError("hasil-obat", "Gagal terhubung ke server.");
  }
}

// ============================================================
//  FITUR 4 & 5: WELLNESS & PENCEGAHAN
// ============================================================
async function dapatkanWellness(topik) {
  tampilkanLoading("hasil-wellness", `Menyiapkan panduan untuk "${topik}"...`);
  try {
    const data = await panggilAPI("/api/wellness", { topik });
    if (data.error) {
      tampilkanError("hasil-wellness", data.error);
    } else {
      tampilkanHasil("hasil-wellness", data.hasil, "🧠");
    }
  } catch {
    tampilkanError("hasil-wellness", "Gagal terhubung ke server.");
  }
  document.getElementById("hasil-wellness")?.scrollIntoView({ behavior: "smooth" });
}

function cariWellnessKustom() {
  const topik = document.getElementById("input-wellness")?.value.trim();
  if (topik) {
    dapatkanWellness(topik);
  }
}

async function dapatkanPencegahan(topik) {
  tampilkanLoading("hasil-pencegahan", `Menyiapkan tips pencegahan "${topik}"...`);
  try {
    const data = await panggilAPI("/api/pencegahan", { topik });
    if (data.error) {
      tampilkanError("hasil-pencegahan", data.error);
    } else {
      tampilkanHasil("hasil-pencegahan", data.hasil, "🛡️");
    }
  } catch {
    tampilkanError("hasil-pencegahan", "Gagal terhubung ke server.");
  }
  document.getElementById("hasil-pencegahan")?.scrollIntoView({ behavior: "smooth" });
}

function cariPencegahanKustom() {
  const topik = document.getElementById("input-pencegahan")?.value.trim();
  if (topik) {
    dapatkanPencegahan(topik);
  }
}

// ── UTILITAS TTS ─────────────────────────────────────────────
// ── TTS CHAT: pastikan hanya 1 audio berjalan, dan klik kedua stop + play ulang ──
let ttsChatAudio = null;
let ttsChatToken = 0;

async function bacakanTeksChat(textToSpeak, btnEl) {
  // Ringkas untuk TTS: tetap tampil full di UI, tapi audio hanya poin penting.
  // Heuristik: ambil bullet/angka langkah + kalimat yang mengandung kata tindakan/kapan ke dokter.
  const ekstrakPoinPenting = (teks) => {
    // Bersihkan HTML tag dan karakter markdown (*)
    const t = (teks || '').replace(/<[^>]*>/g, '').replace(/\*/g, '');

    // Pisahkan berdasarkan baris baru
    const lines = t
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !/^#/.test(l)); // abaikan baris kosong dan heading (###)

    if (lines.length === 0) return '';
    
    const hasilParts = [];
    
    // Baca semua teks
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      // Deteksi awalan bullet (-, •) atau angka (1., 2.)
      const isBullet = /^[-•]/.test(l) || /^\d+[\.)]/.test(l);
      
      if (isBullet) {
        // Jika poin/bernomor, ambil "poin utamanya" saja (potong di tanda ":" atau " - " atau kalimat pertama)
        let poinSingkat = l;
        if (poinSingkat.includes(':')) {
          poinSingkat = poinSingkat.split(':')[0];
        } else if (poinSingkat.includes(' - ')) {
          poinSingkat = poinSingkat.split(' - ')[0];
        } else {
          poinSingkat = poinSingkat.split('. ')[0];
        }
        hasilParts.push(poinSingkat);
      } else {
        // Jika teks biasa (paragraf pembuka/penutup/penjelasan), bacakan seutuhnya
        hasilParts.push(l);
      }
    }

    // Gabungkan dengan jeda titik
    const gabung = hasilParts.join('. ').replace(/\.\./g, '.');
    return gabung.length > 1500 ? gabung.slice(0, 1500) + '...' : gabung;
  };

  textToSpeak = ekstrakPoinPenting(textToSpeak);

  // pastikan teks akhir tersedia untuk TTS
  const finalText = (textToSpeak || '').trim();

  // kunci agar auto-read tidak ikut berbicara selama Bacakan manual
  window.__MANUAL_TTS_LOCK__ = true;

  // indikator manual: paksa tombol supaya bisa diklik lagi
  try {
    const audioBtn = btnEl || document.querySelector('[onclick="toggleVoiceState(this)"]');
    if (audioBtn) audioBtn.disabled = false;
  } catch (e) {}

  const myToken = ++ttsChatToken;

  // --- helper chunking teks (supaya tidak menunggu teks panjang full) ---
  const chunkTeks = (txt, maxChar = 450) => {
    const t = (txt || '').replace(/\s+/g, ' ').trim();
    if (!t) return [];

    // utamakan split per kalimat
    const kalimat = t.split(/(?<=[.!?])\s+/);
    const chunks = [];
    let cur = '';

    for (const k of kalimat) {
      const kk = k.trim();
      if (!kk) continue;

      if ((cur + ' ' + kk).trim().length <= maxChar) {
        cur = (cur ? cur + ' ' : '') + kk;
      } else {
        if (cur) chunks.push(cur);
        // jika satu kalimat kepanjangan, pecah keras per maxChar
        if (kk.length > maxChar) {
          for (let i = 0; i < kk.length; i += maxChar) {
            chunks.push(kk.slice(i, i + maxChar));
          }
          cur = '';
        } else {
          cur = kk;
        }
      }
    }

    if (cur) chunks.push(cur);
    return chunks;
  };

  // TTS sinkron: buat audio sekali saja (tanpa chunk loop) untuk menghilangkan jeda antar-request.

  if (!finalText) return;

  try {
    // stop audio yang sedang diputar (restart mode)
    if (ttsChatAudio) {
      try { ttsChatAudio.pause(); } catch (e) {}
      try { ttsChatAudio.src = ''; } catch (e) {}
      ttsChatAudio = null;
    }

    // Matikan auto-read (voice companion) sementara biar tidak ikut baca berulang
    if (typeof window !== 'undefined') window.isSpeaking = false;
    if (typeof isSpeaking !== 'undefined') isSpeaking = false;

    const originalBtnHTML = btnEl ? btnEl.innerHTML : '';
    if (btnEl) {
      if (btnEl.querySelector('.material-symbols-outlined')) {
        btnEl.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span>';
      } else {
        btnEl.textContent = '⏳ Diproses...';
      }
      btnEl.disabled = true;
    }

    const video = document.getElementById('breathing-video');
    const waveformEl = document.getElementById('waveform');
    const loadingVoice = document.getElementById('loading-voice-indicator');

    // tampilkan indikator loading & state avatar sebelum audio mulai
    try {
      const characterPanel = document.getElementById('character-panel');
      if (characterPanel) {
        characterPanel.classList.remove('w-0', 'opacity-0');
        characterPanel.classList.add('w-full', 'opacity-100', 'is-speaking');
      }

      if (loadingVoice) loadingVoice.style.display = 'flex';

      const speakingIndicator = document.getElementById('speaking-indicator');
      if (speakingIndicator) speakingIndicator.style.display = 'none';

      const scanEffect = document.getElementById('scan-effect');
      if (scanEffect) scanEffect.style.display = 'none';

      if (waveformEl) waveformEl.style.display = 'flex';

      if (video) {
        const characterPanel = document.getElementById('character-panel');
        if (characterPanel) {
          characterPanel.classList.remove('w-0', 'opacity-0');
          characterPanel.classList.add('w-full', 'opacity-100');
        }

        video.style.display = 'block';
        video.muted = true;
        try { video.pause(); video.currentTime = 0; } catch (e) {}
      }
    } catch (e) {}

    // request TTS sekali saja
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: finalText })
    });

    if (!res.ok) {
      let errText = '';
      try {
        const j = await res.json();
        errText = j.error || '';
      } catch (e) {}
      throw new Error(errText || `TTS gagal (${res.status})`);
    }

    const audioBlob = await res.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    if (myToken !== ttsChatToken) {
      URL.revokeObjectURL(audioUrl);
      return;
    }

    const audio = new Audio(audioUrl);
    ttsChatAudio = audio;

    // percepat speaking agar lebih singkron dengan animasi
    // (lebih cepat supaya tanda baca . , spasi tidak terasa telat)




    // sinkronkan visual dengan event audio tanpa memblokir dengan promise
    audio.addEventListener('play', () => {
      try {
        if (btnEl) {
          btnEl.disabled = false;
          if (originalBtnHTML) {
            btnEl.innerHTML = originalBtnHTML;
            if (typeof isSpeaking !== 'undefined' && isSpeaking) {
              const icon = btnEl.querySelector('.material-symbols-outlined');
              if (icon) icon.innerText = 'volume_up';
            }
          } else {
            btnEl.textContent = '🔊 Bacakan';
          }
        }
        if (video) {
          video.play().catch(() => {});
        }
        const characterPanel = document.getElementById('character-panel');
        if (characterPanel) characterPanel.classList.add('is-speaking');
        
        const loadingVoice = document.getElementById('loading-voice-indicator');
        if (loadingVoice) loadingVoice.style.display = 'none';

        const speakingIndicator = document.getElementById('speaking-indicator');
        if (speakingIndicator) speakingIndicator.style.display = 'flex';
        const scanEffect = document.getElementById('scan-effect');
        if (scanEffect) scanEffect.style.display = 'block';
        const waveformEl = document.getElementById('waveform');
        if (waveformEl) waveformEl.style.display = 'flex';
      } catch (e) {}
    });

    audio.addEventListener('pause', () => {
      try {
        if (btnEl) {
          const icon = btnEl.querySelector('.material-symbols-outlined');
          if (icon) icon.innerText = 'volume_off';
        }
        const characterPanel = document.getElementById('character-panel');
        characterPanel?.classList.remove('is-speaking');
        const loadingVoice = document.getElementById('loading-voice-indicator');
        if (loadingVoice) loadingVoice.style.display = 'none';
        const speakingIndicator = document.getElementById('speaking-indicator');
        if (speakingIndicator) speakingIndicator.style.display = 'none';
        const scanEffect = document.getElementById('scan-effect');
        if (scanEffect) scanEffect.style.display = 'none';
        const waveformEl = document.getElementById('waveform');
        if (waveformEl) waveformEl.style.display = 'none';
        if (video) video.pause();
      } catch(e) {}
    });

    audio.addEventListener('ended', () => {
      try { URL.revokeObjectURL(audioUrl); } catch (e) {}
      if (ttsChatAudio === audio) ttsChatAudio = null;
      try {
        if (btnEl) {
          const icon = btnEl.querySelector('.material-symbols-outlined');
          if (icon) icon.innerText = 'volume_off';
        }
        const characterPanel = document.getElementById('character-panel');
        characterPanel?.classList.remove('is-speaking');
        const loadingVoice = document.getElementById('loading-voice-indicator');
        if (loadingVoice) loadingVoice.style.display = 'none';
        const speakingIndicator = document.getElementById('speaking-indicator');
        if (speakingIndicator) speakingIndicator.style.display = 'none';
        const scanEffect = document.getElementById('scan-effect');
        if (scanEffect) scanEffect.style.display = 'none';
        const waveformEl = document.getElementById('waveform');
        if (waveformEl) waveformEl.style.display = 'none';
        if (video) video.pause();
      } catch(e) {}
    });

    audio.addEventListener('error', (err) => {
      console.error('Audio playback error', err);
      try { URL.revokeObjectURL(audioUrl); } catch (e) {}
      if (ttsChatAudio === audio) ttsChatAudio = null;
      try {
        if (btnEl) {
          btnEl.disabled = false;
          if (originalBtnHTML) {
            btnEl.innerHTML = originalBtnHTML;
            const icon = btnEl.querySelector('.material-symbols-outlined');
            if (icon) icon.innerText = 'volume_off';
          } else {
            btnEl.textContent = '🔊 Bacakan';
          }
        }
        const characterPanel = document.getElementById('character-panel');
        characterPanel?.classList.remove('is-speaking');
        const loadingVoice = document.getElementById('loading-voice-indicator');
        if (loadingVoice) loadingVoice.style.display = 'none';
        const speakingIndicator = document.getElementById('speaking-indicator');
        if (speakingIndicator) speakingIndicator.style.display = 'none';
        const scanEffect = document.getElementById('scan-effect');
        if (scanEffect) scanEffect.style.display = 'none';
        const waveformEl = document.getElementById('waveform');
        if (waveformEl) waveformEl.style.display = 'none';
        if (video) video.pause();
      } catch(e) {}
    });

    audio.play().catch((err) => {
      console.error('Audio play failed:', err);
    });

  } catch (e) {
    console.error('Gagal bacakan teks:', e);
    alert('Gagal membacakan teks. Pastikan fitur TTS aktif dan server berjalan.');
    if (btnEl) {
      btnEl.disabled = false;
      if (typeof originalBtnHTML !== 'undefined' && originalBtnHTML) {
        btnEl.innerHTML = originalBtnHTML;
        const icon = btnEl.querySelector('.material-symbols-outlined');
        if (icon) icon.innerText = 'volume_off';
      } else {
        btnEl.textContent = '🔊 Bacakan';
      }
    }
    
    try {
      const loadingVoice = document.getElementById('loading-voice-indicator');
      if (loadingVoice) loadingVoice.style.display = 'none';
      const characterPanel = document.getElementById('character-panel');
      characterPanel?.classList.remove('is-speaking');
      const speakingIndicator = document.getElementById('speaking-indicator');
      if (speakingIndicator) speakingIndicator.style.display = 'none';
    } catch(e) {}
  }
}



// ── UTILITAS KEAMANAN ────────────────────────────────────────
function escHtml(teks) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(teks));
  return div.innerHTML;
}

// Debug helper: biar kita bisa cek kenapa video tidak muncul
function debugBreathingVideo() {
  const v = document.getElementById('breathing-video');
  if (!v) {
    console.warn('[TTS-DEBUG] #breathing-video tidak ada di DOM');
    return;
  }
  console.log('[TTS-DEBUG] breathing-video state:', {
    found: true,
    display: v.style.display,
    muted: v.muted,
    paused: v.paused,
    currentTime: v.currentTime,
    readyState: v.readyState,
    src: v.currentSrc || (v.querySelector('source')?.src || ''),
  });
}


// ── INISIALISASI SAAT HALAMAN DIMUAT ─────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // reset state autoplay/auto-read (agar tidak dobel memutar audio)
  isSpeaking = false;
  renderDaftarGejala();
  muatRiwayatChat();

  // Update nilai slider keparahan
  const slider = document.getElementById("slider-keparahan");
  // Patch untuk menangani slider yang mungkin tidak ada di setiap tab
  const nilaiSlider = document.getElementById("nilai-keparahan") || document.getElementById("severity-value");
  if (slider && nilaiSlider) {
    slider.addEventListener("input", () => {
      nilaiSlider.textContent = slider.value;
    });
  }

  // Filter dan pencarian gejala
  document.getElementById("filter-sistem")?.addEventListener("change", renderDaftarGejala);
  document.getElementById("cari-gejala")?.addEventListener("input", renderDaftarGejala);
  
  // Event listener untuk mengaktifkan/menonaktifkan tombol analisis berdasarkan input
  const updateAnalisisButton = () => {
    const btn = document.getElementById("btn-analisis");
    const deskripsi = document.getElementById("symptoms")?.value.trim() || "";
    if (btn) btn.disabled = state.gejalaTerpilih.length === 0 && !deskripsi;
  };
  document.getElementById("symptoms")?.addEventListener("input", updateAnalisisButton);
  updateTampilGejala(); // Panggil ini untuk inisialisasi awal

  console.log("✅ Asisten Kesehatan AI siap digunakan.");
})