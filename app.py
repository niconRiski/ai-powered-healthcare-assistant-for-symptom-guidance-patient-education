# ============================================================
#  app.py — Server Web Flask untuk Asisten Kesehatan AI
#  Jalankan: python app.py (Pastikan Anda sudah menjalankan `init_db()` setidaknya sekali)
#  PENTING: Pastikan file google-credentials.json ada di direktori proyek
#  dan variabel lingkungan GOOGLE_APPLICATION_CREDENTIALS sudah di-set.
#  Akses di: http://localhost:5000
# ============================================================

from flask import Flask, render_template, request, jsonify, session, redirect, url_for, g
from ai_engine import (
    analisis_gejala,
    analisis_gejala_dengan_gambar,
    chat_kesehatan,
    info_obat,
    panduan_wellness,
    tips_pencegahan,
    analisis_kesehatan,
    cek_interaksi,
    scan_obat,
)
from werkzeug.security import generate_password_hash, check_password_hash
#  Google Cloud TTS bersifat opsional (bisa gagal jika package/import tidak tersedia)
try:
    from google.cloud import texttospeech
except Exception:
    texttospeech = None
from datetime import datetime
import os
import secrets
import sqlite3
import io
import base64

# TTS offline
try:
    import pyttsx3
except Exception:
    pyttsx3 = None

# edge-tts (opsional)
try:
    import edge_tts  # noqa: F401
except Exception:
    edge_tts = None



# ── INISIALISASI FLASK ───────────────────────────────────────
app = Flask(__name__)
app.secret_key = secrets.token_hex(16)  # Kunci sesi yang aman
app.json.ensure_ascii = False           # Emoji & karakter non-ASCII dikirim apa adanya
app.json.sort_keys = False              # Hemat CPU, urutan JSON sesuai kode


# ── KONFIGURASI PATH & INISIALISASI KLIEN ────────────────────
# Dapatkan path absolut ke direktori aplikasi untuk path file yang andal
basedir = os.path.abspath(os.path.dirname(__file__))
credentials_path = os.path.join(basedir, 'google-credentials.json')
DATABASE = os.path.join(basedir, 'database.db')

TTS_CLIENT = None
TTS_INIT_ERROR = None  # Variabel global untuk menyimpan pesan error inisialisasi TTS

# Pastikan file kredensial Google ada
if not os.path.exists(credentials_path):
    TTS_INIT_ERROR = "File 'google-credentials.json' tidak ditemukan. Fitur Text-to-Speech tidak akan berfungsi."
    print(f"[PERINGATAN] {TTS_INIT_ERROR}")
else:
    os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = credentials_path
    try:
        TTS_CLIENT = texttospeech.TextToSpeechClient()
        print("[OK] Google Text-to-Speech client berhasil diinisialisasi!")
    except Exception as e:
        TTS_INIT_ERROR = f"Gagal menginisialisasi Google TTS client: {e}. Pastikan file kredensial valid dan API Text-to-Speech telah diaktifkan di Google Cloud Console."
        print(f"[PERINGATAN] {TTS_INIT_ERROR}")

def get_db():
    """Membuka koneksi database baru jika belum ada untuk konteks permintaan saat ini."""
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row  # Mengembalikan baris sebagai objek mirip dict
    return db

@app.teardown_appcontext
def close_connection(exception):
    """Menutup koneksi database pada akhir konteks permintaan."""
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def _safe_ensure_db_schema():
    """Memastikan skema database ada.

    Jika file database korup (mis. "database disk image is malformed"),
    database lama akan di-rename dan database baru dibuat ulang.
    """
    try:
        db = get_db()
        cursor = db.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS chat_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                pengguna TEXT NOT NULL,
                ai TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')

        db.commit()
        return

    except sqlite3.DatabaseError as e:
        # Tangani kasus DB korup
        msg = str(e).lower()
        if "malformed" in msg or "disk image" in msg:
            try:
                # Tutup koneksi bila sempat terbentuk
                db = getattr(g, '_database', None)
                if db is not None:
                    db.close()
            except Exception:
                pass

            # Rename file DB korup -> agar tidak hilang sepenuhnya
            corrupt_ts = datetime.now().strftime('%Y%m%d_%H%M%S')
            corrupt_path = DATABASE + f".corrupt.{corrupt_ts}"

            try:
                if os.path.exists(DATABASE):
                    os.rename(DATABASE, corrupt_path)
                    print(f"[WARN] database.db korup. Di-rename ke: {os.path.basename(corrupt_path)}")
            except Exception as rename_err:
                print(f"[WARN] Gagal rename database korup: {rename_err}. Akan tetap coba buat DB baru.")

            # Buat DB baru dari nol
            if hasattr(g, '_database'):
                try:
                    g._database = None
                except Exception:
                    pass

            # Re-try sekali lagi untuk membuat skema
            db2 = get_db()
            cursor2 = db2.cursor()
            cursor2.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL
                )
            ''')
            cursor2.execute('''
                CREATE TABLE IF NOT EXISTS chat_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    pengguna TEXT NOT NULL,
                    ai TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            ''')
            db2.commit()
            return

        # Jika bukan kasus malformed, re-raise
        raise


def init_db():
    """Menginisialisasi skema database."""
    with app.app_context():
        _safe_ensure_db_schema()


# ── GLOBAL ERROR HANDLER ─────────────────────────────────────
@app.errorhandler(500)
def internal_server_error(e):
    # Log the error for debugging purposes
    app.logger.exception("An internal server error occurred: %s", e)
    return jsonify({"error": "Terjadi kesalahan internal server. Mohon coba lagi nanti."}), 500


# ── HALAMAN LOGIN ────────────────────────────────────────────
@app.route("/login")
def login_page():
    """Menampilkan halaman login."""
    return render_template("login.html")

@app.route("/register", methods=["GET", "POST"])
def register():
    """Menampilkan halaman registrasi dan menangani pembuatan pengguna baru."""
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        error = None

        if not username or not password:
            error = "Username dan password tidak boleh kosong."
        
        if error is None:
            db = get_db()
            try:
                db.execute(
                    "INSERT INTO users (username, password_hash) VALUES (?, ?)",
                    (username, generate_password_hash(password)),
                )
                db.commit()
            except db.IntegrityError:
                error = f"Pengguna {username} sudah terdaftar."
            else:
                # Redirect ke halaman login setelah berhasil registrasi
                return redirect(url_for("login_page"))
        
        # Jika ada error, tampilkan kembali halaman registrasi dengan pesan error
        return render_template("register.html", error=error)

    # Untuk method GET, tampilkan halaman registrasi
    return render_template("register.html")

@app.route("/auth", methods=["POST"])
def auth():
    """Memproses data login."""
    username = (request.form.get("username") or "").strip()
    password = request.form.get("password") or ""
    db = get_db()
    user = db.execute(
        "SELECT * FROM users WHERE username = ?",
        (username,)
    ).fetchone()

    if user and check_password_hash(user["password_hash"], password):
        session.clear()
        session["username"] = user["username"]
        session["user_id"] = user["id"]
        return redirect(url_for("beranda"))

    # Jika login gagal, log untuk debug dan kembalikan ke halaman login
    try:
        users_count = get_db().execute("SELECT COUNT(*) FROM users").fetchone()[0]
        app.logger.error(
            "[DEBUG AUTH] login gagal | username=%r | user_found=%r | users_count=%r | password_ok=%r",
            username,
            user is not None,
            users_count,
            (user is not None and check_password_hash(user["password_hash"], password)),
        )
    except Exception as e:
        app.logger.error(f"[DEBUG AUTH] Exception during login failure logging: {e}")

    return render_template("login.html", error="Username atau kata sandi salah. Silakan coba lagi.")

@app.route("/forgot-password", methods=["GET", "POST"])
def forgot_password():
    """Halaman lupa kata sandi (RESET PASSWORD berbasis token).

    Mode: tanpa email (token ditampilkan untuk dev/testing).
    Input "email" di form dianggap sama dengan username (sesuai pilihan kamu).
    """
    if request.method == "GET":
        return render_template("forgot_password.html", message=None, reset_token=None)

    # POST
    email_or_username = (request.form.get("email") or "").strip()
    if not email_or_username:
        return render_template(
            "forgot_password.html",
            message="Username/email tidak boleh kosong.",
            reset_token=None,
        )

    # Pastikan schema token ada
    with app.app_context():
        try:
            db = get_db()
            cursor = db.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS password_reset_tokens (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    token TEXT UNIQUE NOT NULL,
                    expires_at TEXT NOT NULL,
                    used INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            ''')
            db.commit()
        except Exception:
            # jika gagal, tetap lanjut karena route akan error saat token disimpan
            pass

    # Cari user berdasarkan username
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE username = ?", (email_or_username,)).fetchone()
    if not user:
        # jangan bocorkan apakah user ada/tidak
        return render_template(
            "forgot_password.html",
            message="Jika akun ditemukan, token reset akan ditampilkan.",
            reset_token=None,
        )

    import time
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now().isoformat(timespec='seconds')
    # tambah 15 menit
    expires_dt = datetime.now().timestamp() + 15 * 60
    expires_at = datetime.fromtimestamp(expires_dt).isoformat(timespec='seconds')

    db.execute(
        "INSERT INTO password_reset_tokens (user_id, token, expires_at, used, created_at) VALUES (?, ?, ?, 0, ?)",
        (user["id"], token, expires_at, datetime.now().isoformat(timespec='seconds')),
    )
    db.commit()

    # Mode dev/testing: token akan dirender dan juga diarahkan ke halaman reset.
    return redirect(url_for("reset_password", token=token))




@app.route("/logout")
def logout():
    """Menghapus sesi pengguna dan mengarahkan ke halaman login."""
    session.clear()
    return redirect(url_for("login_page"))



# ── HALAMAN UTAMA ────────────────────────────────────────────
@app.route("/")
def beranda():
    """Tampilkan halaman utama aplikasi."""
    # Jika pengguna belum login, arahkan ke halaman login
    if "user_id" not in session:
        return redirect(url_for("login_page"))
    return render_template("index.html")

@app.route("/info-obat-page")
def info_obat_page():
    """Tampilkan halaman Info Obat."""
    if "user_id" not in session:
        return redirect(url_for("login_page"))
    return render_template("info_obat.html", username=session.get("username", "User"))


# ── API: ANALISIS GEJALA ─────────────────────────────────────
@app.route("/api/gejala", methods=["POST"])
def api_gejala():
    """
    Endpoint untuk analisis gejala berbasis teks.
    Menerima JSON: {
      "gejala": [...], "keparahan": int, "durasi": str,
      "usia": int, "jenis_kelamin": str,
      "riwayat": str, "kondisi_khusus": str, "alergi": str
    }
    """
    try:
        data = request.get_json()
        deskripsi      = data.get("deskripsi", "").strip()
        gejala         = data.get("gejala", [])
        keparahan      = int(data.get("keparahan", 5))
        durasi         = data.get("durasi", "beberapa hari")
        usia           = int(data.get("usia", 25))
        jenis_kelamin  = data.get("jenis_kelamin", "tidak disebutkan")
        riwayat        = data.get("riwayat", "Tidak ada")
        kondisi_khusus = data.get("kondisi_khusus", "Tidak ada")
        alergi         = data.get("alergi", "Tidak ada")

        if not gejala and not deskripsi:
            return jsonify({"error": "Mohon deskripsikan gejala Anda atau pilih minimal satu dari daftar."}), 400

        hasil = analisis_gejala(
            deskripsi, gejala, keparahan, durasi, usia,
            jenis_kelamin, riwayat, kondisi_khusus, alergi
        )
        return jsonify({"hasil": hasil, "status": "sukses"})

    except Exception as e:
        return jsonify({"error": f"Terjadi kesalahan: {str(e)}"}), 500


# ── API: ANALISIS GEJALA DENGAN GAMBAR (MULTIMODAL) ─────────
@app.route("/api/gejala-image", methods=["POST"])
def api_gejala_image():
    """
    Endpoint untuk analisis gejala + foto (multimodal).
    Menerima multipart/form-data dengan field:
      image (file), deskripsi, keparahan, durasi, usia,
      jenis_kelamin, gejala (JSON array string),
      riwayat, kondisi_khusus, alergi
    """
    try:
        import json as _json

        # ── Data teks dari form-data ──────────────────────────
        deskripsi      = (request.form.get("deskripsi") or "").strip()
        keparahan      = int(request.form.get("keparahan", 5))
        durasi         = (request.form.get("durasi") or "beberapa hari").strip()
        usia           = int(request.form.get("usia", 25))
        jenis_kelamin  = (request.form.get("jenis_kelamin") or "tidak disebutkan").strip()
        riwayat        = (request.form.get("riwayat") or "Tidak ada").strip()
        kondisi_khusus = (request.form.get("kondisi_khusus") or "Tidak ada").strip()
        alergi         = (request.form.get("alergi") or "Tidak ada").strip()

        # ── gejala: JSON array string atau comma-separated ────
        gejala_raw = (request.form.get("gejala") or "").strip()
        gejala = []
        if gejala_raw:
            try:
                maybe = _json.loads(gejala_raw)
                if isinstance(maybe, list):
                    gejala = [str(x) for x in maybe]
            except Exception:
                gejala = [x.strip() for x in gejala_raw.split(",") if x.strip()]

        # ── Validasi file gambar ──────────────────────────────
        if "image" not in request.files:
            return jsonify({"error": "Mohon pilih file gambar gejala (field name: image)."}), 400

        file = request.files["image"]
        if not file or file.filename == "":
            return jsonify({"error": "File gambar kosong."}), 400

        # ── Validasi ukuran file (max 10MB) ───────────────────
        image_bytes = file.read()
        if len(image_bytes) > 10 * 1024 * 1024:
            return jsonify({"error": "Ukuran file terlalu besar. Maksimal 10MB."}), 400

        hasil = analisis_gejala_dengan_gambar(
            image_bytes=image_bytes,
            deskripsi=deskripsi,
            gejala=gejala,
            keparahan=keparahan,
            durasi=durasi,
            usia=usia,
            jenis_kelamin=jenis_kelamin,
            riwayat=riwayat,
            kondisi_khusus=kondisi_khusus,
            alergi=alergi,
        )
        return jsonify({"hasil": hasil, "status": "sukses"})

    except Exception as e:
        return jsonify({"error": f"Terjadi kesalahan: {str(e)}"}), 500


# ── API: CHATBOT KESEHATAN ───────────────────────────────────

@app.route("/api/chat", methods=["POST"])
def api_chat():
    """
    Endpoint untuk chatbot kesehatan interaktif.
    Menerima JSON: { "pesan": str }
    Menyimpan riwayat chat di database.
    """
    data = request.get_json()
    pesan = data.get("pesan", "").strip()

    if not pesan:
        return jsonify({"error": "Pesan tidak boleh kosong."}), 400

    if "user_id" not in session:
        return jsonify({"error": "Sesi tidak valid, silakan login ulang."}), 401
    
    uid = session["user_id"]

    try:
        db_conn = get_db()
        cursor = db_conn.cursor()

        # Ambil 10 riwayat chat terakhir dari SQLite untuk user ini
        cursor.execute("SELECT pengguna, ai FROM chat_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT 10", (uid,))
        data_db = cursor.fetchall()
        # Format data agar sesuai dengan yang diharapkan ai_engine (list of dicts), urutan dari yang terlama
        riwayat = [{"pengguna": d["pengguna"], "ai": d["ai"]} for d in reversed(data_db)]

        # Dapatkan respons AI
        respons = chat_kesehatan(pesan, riwayat)

        # Simpan pesan baru ke SQLite
        cursor.execute(
            "INSERT INTO chat_history (user_id, pengguna, ai, timestamp) VALUES (?, ?, ?, ?)",
            (uid, pesan, respons, datetime.now().isoformat())
        )
        db_conn.commit()

        return jsonify({"respons": respons, "status": "sukses"})

    except sqlite3.Error as db_err:
        app.logger.error(f"SQLite error in api_chat for user {uid}: {db_err}")
        # Rollback transaction jika terjadi kesalahan
        db = getattr(g, '_database', None)
        if db:
            db.rollback()
        return jsonify({"error": f"Terjadi kesalahan pada database saat memproses chat: {str(db_err)}"}), 500
    except Exception as e:
        app.logger.error(f"Unexpected error in api_chat for user {uid}: {e}")
        return jsonify({"error": f"Terjadi kesalahan tak terduga dalam proses chat: {str(e)}"}), 500


# ── API: INFORMASI OBAT ──────────────────────────────────────
@app.route("/api/obat", methods=["POST"])
def api_obat():
    """
    Endpoint untuk pencarian informasi obat. (Lama, dibiarkan untuk backward compatibility)
    Menerima JSON: { "nama_obat": str }
    """
    try:
        data = request.get_json()
        nama_obat = data.get("nama_obat", "").strip()

        if not nama_obat:
            return jsonify({"error": "Nama obat tidak boleh kosong."}), 400

        hasil = info_obat(nama_obat)
        return jsonify({"hasil": hasil, "status": "sukses"})

    except Exception as e:
        return jsonify({"error": f"Terjadi kesalahan: {str(e)}"}), 500

@app.route("/info-obat", methods=["POST"])
def route_info_obat():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    try:
        data = request.get_json()
        nama_obat = data.get("nama_obat", "").strip()
        if not nama_obat:
            return jsonify({"error": "Nama obat tidak boleh kosong."}), 400
        hasil = info_obat(nama_obat)
        return jsonify({"hasil": hasil, "status": "sukses"})
    except Exception as e:
        return jsonify({"error": f"Terjadi kesalahan: {str(e)}"}), 500

@app.route("/cek-interaksi", methods=["POST"])
def route_cek_interaksi():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    try:
        data = request.get_json()
        obat_list = data.get("obat", [])
        if not isinstance(obat_list, list) or len(obat_list) < 2:
            return jsonify({"error": "Daftar obat tidak valid. Minimal 2 obat."}), 400
        hasil = cek_interaksi(obat_list)
        return jsonify({"hasil": hasil, "status": "sukses"})
    except Exception as e:
        return jsonify({"error": f"Terjadi kesalahan: {str(e)}"}), 500

@app.route("/scan-obat", methods=["POST"])
def route_scan_obat():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    try:
        data = request.get_json()
        b64_image = data.get("image", "")
        filename = data.get("filename", "")
        
        if not b64_image:
            return jsonify({"error": "Gambar tidak ditemukan."}), 400
        
        # Hapus prefix data URI jika ada (misal: data:image/jpeg;base64,...)
        if "," in b64_image:
            b64_image = b64_image.split(",")[1]
            
        try:
            image_bytes = base64.b64decode(b64_image)
        except Exception:
            return jsonify({"error": "Format gambar tidak valid."}), 400
            
        hasil = scan_obat(image_bytes, filename)
        return jsonify({"hasil": hasil, "status": "sukses"})
    except Exception as e:
        return jsonify({"error": f"Terjadi kesalahan: {str(e)}"}), 500



# ── API: WELLNESS & KESEHATAN MENTAL ────────────────────────
@app.route("/api/wellness", methods=["POST"])
def api_wellness():
    """
    Endpoint untuk panduan kesehatan mental.
    Menerima JSON: { "topik": str }
    """
    try:
        data = request.get_json()
        topik = data.get("topik", "").strip()

        if not topik:
            return jsonify({"error": "Topik tidak boleh kosong."}), 400

        hasil = panduan_wellness(topik)
        return jsonify({"hasil": hasil, "status": "sukses"})

    except Exception as e:
        return jsonify({"error": f"Terjadi kesalahan: {str(e)}"}), 500


# ── API: TIPS PENCEGAHAN ─────────────────────────────────────
@app.route("/api/pencegahan", methods=["POST"])
def api_pencegahan():
    """
    Endpoint untuk tips pencegahan penyakit.
    Menerima JSON: { "topik": str }
    """
    try:
        data = request.get_json()
        topik = data.get("topik", "").strip()

        if not topik:
            return jsonify({"error": "Topik tidak boleh kosong."}), 400

        hasil = tips_pencegahan(topik)
        return jsonify({"hasil": hasil, "status": "sukses"})

    except Exception as e:
        return jsonify({"error": f"Terjadi kesalahan: {str(e)}"}), 500


# ── API: ANALISIS KESEHATAN KOMPREHENSIF (PERSONAL HEALTH COACH) ───
@app.route("/api/analisis-kesehatan", methods=["POST"])
def api_analisis_kesehatan():
    """
    Endpoint untuk analisis kesehatan lengkap menggunakan data dari halaman Pencegahan.
    Menerima JSON dengan parameter kesehatan lengkap dan mengembalikan analisis AI.
    """
    try:
        data = request.get_json() or {}

        hasil = analisis_kesehatan(
            bmi=str(data.get("bmi", "N/A")),
            current_weight=str(data.get("current_weight", "N/A")),
            target_weight=str(data.get("target_weight", "N/A")),
            activity=str(data.get("activity", "Tidak ada data")),
            calories_burned=str(data.get("calories_burned", "0")),
            protein_score=str(data.get("protein_score", "0")),
            carb_score=str(data.get("carb_score", "0")),
            fiber_score=str(data.get("fiber_score", "0")),
            vitamin_score=str(data.get("vitamin_score", "0")),
            water_glasses=str(data.get("water_glasses", "0")),
            sleep_hours=str(data.get("sleep_hours", "0")),
            health_score=str(data.get("health_score", "0")),
        )
        return jsonify({"hasil": hasil, "status": "sukses"})

    except Exception as e:
        return jsonify({"error": f"Terjadi kesalahan: {str(e)}"}), 500


# ── API: AMBIL RIWAYAT CHAT ──────────────────────────────────
@app.route("/api/chat-history", methods=["GET"])
def get_chat_history():
    """Ambil riwayat percakapan chat dari database untuk sesi ini."""
    if "user_id" not in session:
        return jsonify({"riwayat": []})
        
    uid = session.get("user_id")
    if not uid:
        return jsonify({"riwayat": []})

    db_conn = get_db()
    cursor = db_conn.cursor()
    try:
        cursor.execute("SELECT pengguna, ai, timestamp FROM chat_history WHERE user_id = ? ORDER BY timestamp ASC", (uid,))
        data_db = cursor.fetchall()
        # Format agar kompatibel dengan frontend
        riwayat = [{
            "pengguna": d["pengguna"], 
            "ai": d["ai"],
            "timestamp": d["timestamp"]
        } for d in data_db]
        return jsonify({"riwayat": riwayat})
    except Exception as e:
        app.logger.error(f"SQLite error during chat history retrieval for user {uid}: {e}") # Log error
        return jsonify({"error": f"Terjadi kesalahan saat memuat riwayat chat dari database: {str(e)}"}), 500


# ── API: RESET RIWAYAT CHAT ──────────────────────────────────
@app.route("/api/reset-chat", methods=["POST"])
def reset_chat():
    """Hapus riwayat percakapan chat dari database untuk sesi ini."""
    if "user_id" not in session:
        return jsonify({"status": "gagal", "pesan": "Tidak ada sesi aktif."}), 401

    uid = session.get("user_id")
    if not uid:
        return jsonify({"status": "gagal", "pesan": "ID pengguna tidak ditemukan."}), 400

    db_conn = get_db()
    cursor = db_conn.cursor()
    try:
        cursor.execute("DELETE FROM chat_history WHERE user_id = ?", (uid,))
        db_conn.commit()
        return jsonify({"pesan": "Riwayat chat berhasil dihapus.", "status": "sukses"})
    except Exception as e:
        app.logger.error(f"SQLite error during chat history reset for user {uid}: {e}") # Log error
        return jsonify({"status": "gagal", "pesan": f"Terjadi kesalahan saat menghapus riwayat chat: {str(e)}"}), 500


# ── API: TEXT-TO-SPEECH (TTS) ────────────────────────────────
@app.route("/api/tts", methods=["POST"])
def api_tts():
    """Ubah teks jadi audio.

    Default prioritas:
    - Google Cloud TTS jika TTS_CLIENT tersedia
    - fallback offline gratis pakai pyttsx3 jika Google tidak tersedia

    Menerima JSON: { "text": str }
    Mengembalikan audio (wav) dengan Content-Type: audio/wav
    """
    try:
        data = request.get_json() or {}
        text_to_speak = str(data.get("text", "")).strip()
        if not text_to_speak:
            return jsonify({"error": "Teks tidak boleh kosong."}), 400

        # 1) Google Cloud TTS jika tersedia
        if TTS_CLIENT:
            synthesis_input = texttospeech.SynthesisInput(text=text_to_speak)

            voice = texttospeech.VoiceSelectionParams(
                language_code="id-ID", name="id-ID-Wavenet-A"
            )

            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3
            )

            response = TTS_CLIENT.synthesize_speech(
                input=synthesis_input, voice=voice, audio_config=audio_config
            )

            return response.audio_content, 200, {'Content-Type': 'audio/mpeg'}

        # 2) Fallback offline/gratis pakai edge-tts (butuh koneksi untuk ambil suara)
        try:
            import asyncio
            from edge_tts import Communicate

            async def _edge_speak():
                # voice ID-Indonesia: "id-ID" (default), variasi voice bisa tergantung akun/voice availability
                comm = Communicate(text_to_speak, voice="id-ID-ArdiNeural")
                chunks = []
                async for chunk in comm.stream():
                    if chunk['type'] == 'audio':
                        chunks.append(chunk['data'])
                return b''.join(chunks)

            audio_bytes = asyncio.run(_edge_speak())
            if not audio_bytes:
                raise RuntimeError('edge-tts menghasilkan audio kosong')
            return audio_bytes, 200, {'Content-Type': 'audio/wav'}
        except Exception:
            # 3) fallback terakhir: pyttsx3 offline
            if not pyttsx3:
                error_message = TTS_INIT_ERROR or "Layanan Text-to-Speech tidak tersedia." 
                return jsonify({"error": error_message}), 500

        # pyttsx3 perlu file output; generate ke buffer WAV
        import tempfile
        import subprocess

        # Tulis WAV
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
            wav_path = tmp.name

        engine = pyttsx3.init()

        # Set bahasa/voice Indonesia (tergantung voice engine Windows). Jika tidak ada, fallback.
        try:
            voices = engine.getProperty('voices')
            # Karena voice Windows yang terpasang kemungkinan hanya EN (David/Zira),
            # kita paksa Zira untuk suara wanita dan tetap pakai fallback offline.
            chosen = None
            for v in voices:
                name = (getattr(v, 'name', '') or '').lower()
                if 'zira' in name:
                    chosen = v
                    break
            if not chosen and voices:
                # fallback: pilih voice pertama
                chosen = voices[0]
            if chosen:
                engine.setProperty('voice', chosen.id)

        except Exception:
            pass

        engine.save_to_file(text_to_speak, wav_path)
        engine.runAndWait()
        engine.stop()

        # Baca file WAV ke bytes
        with open(wav_path, 'rb') as f:
            audio_bytes = f.read()

        # Bersihkan file sementara
        try:
            os.remove(wav_path)
        except Exception:
            pass

        return audio_bytes, 200, {'Content-Type': 'audio/wav'}

    except Exception as e:
        app.logger.exception(f"[TTS] Error in TTS API: {e}")
        return jsonify({"error": f"Terjadi kesalahan pada layanan Text-to-Speech: {str(e)}"}), 500


# ── RESET PASSWORD TOKEN FLOW ──────────────────────────────

@app.route("/reset-password/<token>", methods=["GET", "POST"])
def reset_password(token: str):
    """Set password baru berdasarkan token.

    Mode dev/testing: token ditampilkan di halaman lupa kata sandi.
    """
    token = (token or "").strip()
    if not token:
        return render_template("reset_password.html", message="Token tidak valid.")

    # Pastikan token table ada
    db = get_db()
    db.execute('''
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at TEXT NOT NULL,
            used INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    db.commit()

    if request.method == "GET":
        return render_template("reset_password.html", message=None, token=token)

    # POST: update password
    new_password = request.form.get("password") or ""
    confirm_password = request.form.get("confirm_password") or ""

    if not new_password or len(new_password) < 4:
        return render_template("reset_password.html", message="Password terlalu pendek.", token=token)

    if new_password != confirm_password:
        return render_template("reset_password.html", message="Konfirmasi password tidak cocok.", token=token)

    row = db.execute(
        "SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0",
        (token,),
    ).fetchone()

    if not row:
        return render_template("reset_password.html", message="Token sudah digunakan atau tidak valid.", token=token)

    # cek expired
    expires_at = row["expires_at"]
    try:
        exp_ts = datetime.fromisoformat(expires_at).timestamp()
    except Exception:
        return render_template("reset_password.html", message="Format expired_at tidak valid.", token=token)

    if datetime.now().timestamp() > exp_ts:
        return render_template("reset_password.html", message="Token sudah kedaluwarsa.", token=token)

    # update user password_hash
    db.execute(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        (generate_password_hash(new_password), row["user_id"]),
    )
    db.execute(
        "UPDATE password_reset_tokens SET used = 1 WHERE id = ?",
        (row["id"],),
    )
    db.commit()

    return render_template("reset_password.html", message="Password berhasil diubah. Silakan login.", token=None)


# ── JALANKAN SERVER ──────────────────────────────────────────
if __name__ == "__main__":
    init_db() # Pastikan tabel database dibuat sebelum aplikasi berjalan


    # AUTO-ADD akun default agar login bisa langsung digunakan saat users masih kosong
    try:
        conn = sqlite3.connect(DATABASE)
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM users")
        users_count = cur.fetchone()[0]
        conn.close()

        if users_count == 0:
            # default admin (silakan ganti password di kode jika perlu)
            default_username = "admin"
            default_password = "admin123"
            conn = sqlite3.connect(DATABASE)
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO users (username, password_hash) VALUES (?, ?)",
                (default_username, generate_password_hash(default_password)),
            )
            conn.commit()
        print("  🏥 Asisten Kesehatan AI — Server Berjalan")
        print("=" * 55)
        print("  Buka browser: http://localhost:5000")
        print("  Tekan Ctrl+C untuk menghentikan server")
        print("=" * 55)
        app.run(debug=True, host="0.0.0.0", port=5000)
    except Exception as e:
        print(f"[WARN] Gagal auto-add admin user: {e}")
        print("=" * 55)
        print("  🏥 Asisten Kesehatan AI — Server Berjalan")
        print("=" * 55)
        app.run(debug=True, host="0.0.0.0", port=5000)

