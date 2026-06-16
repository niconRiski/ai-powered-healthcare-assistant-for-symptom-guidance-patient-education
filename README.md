# AI-Powered Healthcare Assistant for Symptom Guidance & Patient Education

# Medika AI: Asisten Kesehatan Bertenaga AI untuk Bimbingan Gejala & Edukasi Pasien

Proyek ini bertujuan untuk mengembangkan asisten perawatan kesehatan bertenaga AI (*Artificial Intelligence*) yang dirancang untuk memberikan panduan diagnosis awal berbasis gejala, tips kesehatan, informasi pengobatan, dan saran perawatan kesehatan pencegahan. 

Aplikasi ini memanfaatkan model bahasa besar (LLM) untuk menawarkan tanggapan informatif terhadap pertanyaan pengguna secara *real-time*, mempromosikan kesadaran, serta edukasi kesehatan. Proyek ini menekankan pengembangan AI yang bertanggung jawab dan antarmuka (UI/UX) yang modern serta ramah pengguna. 

> **⚠️ Peringatan Penting:** Sistem ini dimaksudkan **hanya untuk tujuan informasi dan edukasi**. Keputusan dari AI ini **bukan** merupakan pengganti saran medis profesional, diagnosis, atau perawatan dari dokter.

---

## ✨ Fitur Utama

Aplikasi ini tidak sekadar chatbot biasa, melainkan asisten kesehatan holistik yang dilengkapi dengan fitur-fitur mutakhir:

- 🔒 **Sistem Autentikasi Pengguna:** Dilengkapi dengan fitur Login, Registrasi, dan Lupa Kata Sandi. Setiap pengguna memiliki sesi yang aman (*encrypted*) dan riwayat datanya dikelola secara terpisah.
- 💬 **Chatbot Kesehatan AI Interaktif:** Pengguna dapat berkonsultasi seputar masalah kesehatan. Aplikasi akan secara cerdas menyimpan, memuat ulang, serta mengelola riwayat percakapan sebelumnya (*Chat History*) secara lokal.
- 📸 **Analisis Gejala Multimodal (Teks & Gambar):** Pengguna tidak hanya bisa mengetik keluhan gejala, durasi, dan tingkat keparahan, tetapi juga bisa **mengunggah foto keluhan (seperti ruam kulit)** agar AI memberikan analisis visual.
- 💊 **Pencarian & Pemindai Obat (Scan Obat):** Terdapat fitur pencarian informasi obat lengkap, termasuk **Cek Interaksi Obat** jika pengguna mengonsumsi lebih dari satu jenis obat. Tersedia juga fitur memindai gambar obat untuk identifikasi otomatis.
- 🧘‍♀️ **Edukasi Kesehatan Mental & Pencegahan:** Modul khusus untuk memberikan dukungan psikologis dasar (*wellness*) serta edukasi pencegahan berbagai penyakit menular/tidak menular.
- 📊 **Analisis Kesehatan Komprehensif (Personal Health Coach):** Mengukur tingkat kesehatan pengguna melalui parameter personal seperti BMI, kualitas tidur, asupan nutrisi, kalori, dan rutinitas olahraga.
- 🗣️ **Fitur Text-to-Speech (AI Voice):** Balasan dari asisten AI dapat dibacakan langsung melalui suara (mendukung integrasi premium *Google Cloud TTS* atau mode offline bawaan).

## 🛠️ Teknologi yang Digunakan

Aplikasi ini beroperasi menggunakan arsitektur *web-based* tanpa bergantung pada server *database* eksternal skala besar (*standalone*):

- **Backend:** Python dengan Framework Flask.
- **Frontend:** HTML5, CSS3, JavaScript, dibalut dengan *Tailwind CSS* untuk antarmuka yang responsif dan modern.
- **Database:** SQLite (beroperasi secara lokal sepenuhnya untuk menyimpan data akun dan riwayat *chat* demi menjaga privasi).
- **AI & Integrasi:** Memanfaatkan Model LLM untuk mesin utamanya, serta berbagai modul TTS (*pyttsx3*, *edge-tts*, dan *Google TTS*).


**Status:** in_progress
**Domain:** Healthcare
**Progress:** 

---
*Synced from Zaby LMS Capstone Workspace*
<img width="1277" height="899" alt="image" src="https://github.com/user-attachments/assets/da08c092-4e5c-4ee8-a2bc-ede49cab8966" />
<img width="1270" height="905" alt="image" src="https://github.com/user-attachments/assets/f5ecdfdf-3630-4417-91b5-361298c51aff" />
<img width="1276" height="898" alt="image" src="https://github.com/user-attachments/assets/fadfed2b-a935-4466-b6ea-74b52f188b0a" />
<img width="1278" height="907" alt="image" src="https://github.com/user-attachments/assets/110e0261-7a2f-4b0e-8c4f-c335c0d17b03" />
<img width="1269" height="908" alt="image" src="https://github.com/user-attachments/assets/8ac4c1e3-7b07-43dd-a100-188c1f448485" />
<img width="1270" height="911" alt="image" src="https://github.com/user-attachments/assets/c7635027-5e76-465c-b722-6ba3616749b1" />
