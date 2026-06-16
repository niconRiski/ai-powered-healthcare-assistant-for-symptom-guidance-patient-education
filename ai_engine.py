# ============================================================
#  ai_engine.py — Mesin AI menggunakan Google Gemini
# ============================================================

import os
import base64
import google.generativeai as genai
from dotenv import load_dotenv, find_dotenv
from prompts import (
    SYSTEM_UMUM,
    PROMPT_GEJALA,
    PROMPT_GEJALA_GAMBAR,
    PROMPT_CHAT,
    PROMPT_OBAT,
    PROMPT_WELLNESS,
    PROMPT_PENCEGAHAN,
    PROMPT_ANALISIS_KESEHATAN,
    PROMPT_CEK_INTERAKSI,
    PROMPT_SCAN_OBAT,
)

# Memuat file .env secara eksplisit dan memaksa menimpa (override) variabel sistem lama
load_dotenv(find_dotenv(), override=True)


# ── KONFIGURASI API ──────────────────────────────────────────
def inisialisasi_api():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY tidak ditemukan. Pastikan file .env ada dan berisi API key Gemini yang valid."
        )
    genai.configure(api_key=api_key)
    return True


try:
    API_SIAP = inisialisasi_api()
    print("[OK] Google Gemini AI berhasil diinisialisasi!")
except Exception as e:
    API_SIAP = False
    print(f"[PERINGATAN] Gagal menginisialisasi AI: {e}")


# ── FUNGSI UTILITAS ──────────────────────────────────────────
def klasifikasi_kondisi_darurat(teks: str) -> str:
    kata_darurat = [
        "tidak sadar",
        "pingsan",
        "sesak nafas berat",
        "nyeri dada hebat",
        "stroke",
        "serangan jantung",
        "kejang",
        "pendarahan hebat",
        "overdosis",
        "keracunan",
        "bunuh diri",
        "mati",
    ]
    kata_urgent = [
        "demam tinggi",
        "muntah darah",
        "nyeri parah",
        "tidak bisa bergerak",
        "bengkak parah",
        "sesak nafas",
        "pusing berat",
        "pingsan",
    ]

    teks_lower = (teks or "").lower()
    for kata in kata_darurat:
        if kata in teks_lower:
            return "DARURAT"
    for kata in kata_urgent:
        if kata in teks_lower:
            return "URGENT"
    return "NORMAL"


def format_respons_darurat() -> str:
    return (
        "🚨 **DARURAT MEDIS TERDETEKSI**\n\n"
        "Berdasarkan gejala yang Anda sebutkan, ini mungkin kondisi darurat medis.\n\n"
        "**Segera lakukan:**\n"
        "- 📞 Hubungi **119** (Ambulans & Gawat Darurat)\n"
        "- 🏥 Pergi ke **UGD Rumah Sakit** terdekat\n"
        "- 👥 Minta bantuan orang di sekitar Anda\n\n"
        "*Jangan tunda — setiap menit sangat berharga!*"
    )


# ── FUNGSI UTAMA PANGGIL AI ──────────────────────────────────
def panggil_ai(prompt: str, system: str = None) -> str:
    if not API_SIAP:
        return "⚠️ Layanan AI tidak tersedia. Periksa GEMINI_API_KEY di .env"

    try:
        # Prioritas: Gemma 3 (Instruct), fallback Gemini flash
        kandidat_model = [
            "gemma-3-27b-it",
            "gemini-2.5-flash",
        ]

        last_error = None
        for model_name in kandidat_model:
            try:
                model = genai.GenerativeModel(
                    model_name=model_name,
                    system_instruction=system or SYSTEM_UMUM,
                )
                response = model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.7,
                        max_output_tokens=8192,
                    ),
                    safety_settings=[
                        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
                    ],
                )
                # Periksa finish_reason — tangani respons terpotong
                try:
                    finish = response.candidates[0].finish_reason
                    finish_name = getattr(finish, 'name', str(finish))
                    if finish_name in ('MAX_TOKENS', '2'):
                        print(f"[PERINGATAN] Respons terpotong MAX_TOKENS oleh {model_name}")
                        partial = ""
                        try:
                            partial = response.text
                        except Exception:
                            pass
                        return (partial or "[Respons terpotong]") + \
                               "\n\n---\n*Catatan: Respons mungkin tidak lengkap. Silakan coba lagi dengan deskripsi lebih singkat.*"
                    elif finish_name in ('SAFETY', '3'):
                        print(f"[PERINGATAN] Respons diblokir SAFETY oleh {model_name}, mencoba model berikutnya")
                        last_error = Exception("Blocked by safety filters")
                        continue
                except Exception as fe:
                    print(f"[DEBUG] Gagal baca finish_reason: {fe}")

                return response.text

            except Exception as e:
                last_error = e
                continue

        error_message = str(last_error) if last_error else "Unknown error"
        if "Quota exceeded" in error_message:
            return (
                "⚠️ Terjadi kesalahan saat menghubungi AI: "
                "Kuota penggunaan AI terlampaui. Mohon coba lagi nanti."
            )
        return f"⚠️ Terjadi kesalahan saat menghubungi AI: {error_message.splitlines()[0]}"

    except Exception as e:
        error_message = str(e)
        if "Quota exceeded" in error_message:
            return (
                "⚠️ Terjadi kesalahan saat menghubungi AI: "
                "Kuota penggunaan AI terlampaui. Mohon coba lagi nanti."
            )
        return f"⚠️ Terjadi kesalahan saat menghubungi AI: {error_message.splitlines()[0]}"


# ── FITUR 1: ANALISIS GEJALA (Teks) ────────────────────────
def analisis_gejala(
    deskripsi,
    gejala,
    keparahan=5,
    durasi="beberapa hari",
    usia=25,
    jenis_kelamin="tidak disebutkan",
    riwayat="Tidak ada",
    kondisi_khusus="Tidak ada",
    alergi="Tidak ada",
):
    gejala_dari_tombol = ", ".join(gejala) if gejala else ""
    gejala_lengkap = deskripsi

    if gejala_dari_tombol:
        if gejala_lengkap:
            gejala_lengkap += f" (Gejala tambahan: {gejala_dari_tombol})"
        else:
            gejala_lengkap = gejala_dari_tombol

    level = klasifikasi_kondisi_darurat(gejala_lengkap)
    if level == "DARURAT":
        return format_respons_darurat()

    prompt = PROMPT_GEJALA.format(
        system=SYSTEM_UMUM,
        gejala=gejala_lengkap,
        keparahan=keparahan,
        durasi=durasi,
        usia=usia,
        jenis_kelamin=jenis_kelamin,
        riwayat=riwayat or "Tidak ada",
        kondisi_khusus=kondisi_khusus or "Tidak ada",
        alergi=alergi or "Tidak ada",
    )

    respons = panggil_ai(prompt)

    if level == "URGENT":
        respons += "\n\n---\n⚠️ **Perhatian:** Gejala Anda mungkin memerlukan perhatian medis segera. Jangan tunda konsultasi."
    return respons


# ── FITUR 2: CHAT KESEHATAN ────────────────────────────────
def chat_kesehatan(pertanyaan: str, riwayat_chat: list = None) -> str:
    level = klasifikasi_kondisi_darurat(pertanyaan)
    if level == "DARURAT":
        return format_respons_darurat()

    konteks_str = ""
    if riwayat_chat:
        history_lines = []
        for item in riwayat_chat[-5:]:
            history_lines.append(f"Pengguna: {item.get('pengguna', '')}")
            history_lines.append(f"AI: {item.get('ai', '')}")
        konteks_str = "Ini adalah riwayat percakapan sebelumnya:\n" + "\n".join(history_lines) + "\n"

    prompt = PROMPT_CHAT.format(
        system=SYSTEM_UMUM,
        konteks_chat=konteks_str,
        pertanyaan=pertanyaan,
    )
    return panggil_ai(prompt)


# ── FITUR 3: INFO OBAT ───────────────────────────────────────
def info_obat(nama_obat: str) -> str:
    if not nama_obat or len(nama_obat.strip()) < 2:
        return "⚠️ Nama obat tidak valid."

    prompt = PROMPT_OBAT.format(
        system=SYSTEM_UMUM,
        nama_obat=nama_obat.strip().title(),
    )
    return panggil_ai(prompt)


# ── FITUR 3A: CEK INTERAKSI OBAT ─────────────────────────────
def cek_interaksi(obat_list: list) -> str:
    if not obat_list or len(obat_list) < 2:
        return "⚠️ Minimal 2 obat diperlukan untuk mengecek interaksi."
    
    obat_str = "\n".join([f"- {obat.strip()}" for obat in obat_list if obat.strip()])
    prompt = PROMPT_CEK_INTERAKSI.format(
        system=SYSTEM_UMUM,
        obat_list=obat_str,
    )
    return panggil_ai(prompt)


# ── FITUR 3B: SCAN KEMASAN OBAT ──────────────────────────────
def scan_obat(image_bytes: bytes, filename: str = "") -> str:
    if not API_SIAP:
        return "⚠️ Layanan AI tidak tersedia. Periksa GEMINI_API_KEY di .env"

    try:
        kandidat_model = [
            "gemini-2.5-flash",
            "gemini-1.5-flash",
        ]

        mime_type = "image/jpeg"
        if image_bytes[:4] == b'\x89PNG':
            mime_type = "image/png"
        elif image_bytes[:4] == b'RIFF' and image_bytes[8:12] == b'WEBP':
            mime_type = "image/webp"
        elif image_bytes[:3] == b'GIF':
            mime_type = "image/gif"

        b64 = base64.b64encode(image_bytes).decode("utf-8")
        inline_image = {
            "inline_data": {
                "mime_type": mime_type,
                "data": b64,
            }
        }

        user_prompt = PROMPT_SCAN_OBAT.format(system=SYSTEM_UMUM)

        last_error = None
        for model_name in kandidat_model:
            try:
                model = genai.GenerativeModel(
                    model_name=model_name,
                    system_instruction=SYSTEM_UMUM,
                )
                response = model.generate_content(
                    [user_prompt, inline_image],
                    generation_config=genai.types.GenerationConfig(temperature=0.3, max_output_tokens=2048)
                )
                
                # Check for truncated or blocked response
                try:
                    finish_name = getattr(response.candidates[0].finish_reason, 'name', str(response.candidates[0].finish_reason))
                    if finish_name in ('SAFETY', '3'):
                        continue
                except Exception:
                    pass

                return response.text
            except Exception as e:
                last_error = e
                continue
        
        # If vision model failed, fallback to generic prompt (not very useful without image, but requested by prompt)
        return "⚠️ AI tidak dapat membaca kemasan obat dari gambar yang diberikan. Silakan cari nama obat secara manual melalui fitur pencarian."

    except Exception as e:
        return f"⚠️ Terjadi kesalahan saat memproses gambar kemasan obat: {str(e)}"


# ── FITUR 4: WELLNESS ────────────────────────────────────────
def panduan_wellness(topik: str) -> str:
    prompt = PROMPT_WELLNESS.format(
        system=SYSTEM_UMUM,
        topik=topik.strip(),
    )
    return panggil_ai(prompt)


# ── FITUR 5: PENCEGAHAN ──────────────────────────────────────
def tips_pencegahan(topik: str) -> str:
    prompt = PROMPT_PENCEGAHAN.format(
        system=SYSTEM_UMUM,
        topik=topik.strip(),
    )
    return panggil_ai(prompt)


# ── FITUR 6: ANALISIS KESEHATAN KOMPREHENSIF ─────────────────
def analisis_kesehatan(
    bmi: str = "N/A",
    current_weight: str = "N/A",
    target_weight: str = "N/A",
    activity: str = "Tidak ada data",
    calories_burned: str = "0",
    protein_score: str = "0",
    carb_score: str = "0",
    fiber_score: str = "0",
    vitamin_score: str = "0",
    water_glasses: str = "0",
    sleep_hours: str = "0",
    health_score: str = "0",
) -> str:
    prompt = PROMPT_ANALISIS_KESEHATAN.format(
        system=SYSTEM_UMUM,
        bmi=bmi,
        current_weight=current_weight,
        target_weight=target_weight,
        activity=activity,
        calories_burned=calories_burned,
        protein_score=protein_score,
        carb_score=carb_score,
        fiber_score=fiber_score,
        vitamin_score=vitamin_score,
        water_glasses=water_glasses,
        sleep_hours=sleep_hours,
        health_score=health_score,
    )
    return panggil_ai(prompt)


# ── FITUR MULTIMODAL: ANALISIS GEJALA DENGAN GAMBAR ─────────
def analisis_gejala_dengan_gambar(
    image_bytes: bytes,
    deskripsi: str,
    gejala: list = None,
    keparahan: int = 5,
    durasi: str = "beberapa hari",
    usia: int = 25,
    jenis_kelamin: str = "tidak disebutkan",
    riwayat: str = "Tidak ada",
    kondisi_khusus: str = "Tidak ada",
    alergi: str = "Tidak ada",
) -> str:
    if not API_SIAP:
        return "⚠️ Layanan AI tidak tersedia. Periksa GEMINI_API_KEY di .env"

    gejala = gejala or []
    gejala_dari_tombol = ", ".join(gejala) if gejala else "-"

    # Gabungkan teks untuk klasifikasi darurat
    teks_for_klasifikasi = (deskripsi or "").strip()
    if gejala_dari_tombol and gejala_dari_tombol != "-":
        teks_for_klasifikasi = (teks_for_klasifikasi + "\n" + gejala_dari_tombol).strip()

    if teks_for_klasifikasi:
        level = klasifikasi_kondisi_darurat(teks_for_klasifikasi)
        if level == "DARURAT":
            return format_respons_darurat()

    try:
        # Model yang mendukung multimodal (vision)
        # gemma-3 tidak support inline image — gunakan gemini-2.5-flash / gemini-1.5-pro
        kandidat_model = [
            "gemini-2.5-flash",
            "gemini-1.5-flash",
            "gemini-1.5-pro",
        ]

        # Buat prompt menggunakan template PROMPT_GEJALA_GAMBAR
        user_prompt = PROMPT_GEJALA_GAMBAR.format(
            deskripsi=deskripsi.strip() if deskripsi else "Tidak ada deskripsi tambahan",
            gejala_list=gejala_dari_tombol,
            keparahan=keparahan,
            durasi=durasi,
            usia=usia,
            jenis_kelamin=jenis_kelamin,
            riwayat=riwayat or "Tidak ada",
            kondisi_khusus=kondisi_khusus or "Tidak ada",
            alergi=alergi or "Tidak ada",
        )

        # Deteksi mime_type dari bytes header
        mime_type = "image/jpeg"  # default
        if image_bytes[:4] == b'\x89PNG':
            mime_type = "image/png"
        elif image_bytes[:4] == b'RIFF' and image_bytes[8:12] == b'WEBP':
            mime_type = "image/webp"
        elif image_bytes[:3] == b'GIF':
            mime_type = "image/gif"

        b64 = base64.b64encode(image_bytes).decode("utf-8")
        inline_image = {
            "inline_data": {
                "mime_type": mime_type,
                "data": b64,
            }
        }

        last_error = None
        for model_name in kandidat_model:
            try:
                model = genai.GenerativeModel(
                    model_name=model_name,
                    system_instruction=SYSTEM_UMUM,
                )

                response = model.generate_content(
                    [
                        user_prompt,
                        inline_image,
                    ],
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.35,
                        max_output_tokens=8192,
                    ),
                    safety_settings=[
                        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
                    ],
                )

                # Periksa finish_reason
                result = ""
                try:
                    finish = response.candidates[0].finish_reason
                    finish_name = getattr(finish, 'name', str(finish))
                    if finish_name in ('MAX_TOKENS', '2'):
                        print(f"[PERINGATAN] Respons gambar terpotong MAX_TOKENS oleh {model_name}")
                        partial = ""
                        try:
                            partial = response.text
                        except Exception:
                            pass
                        result = (partial or "[Respons terpotong]") + \
                                 "\n\n---\n*Catatan: Analisis mungkin tidak lengkap. Silakan coba lagi.*"
                    elif finish_name in ('SAFETY', '3'):
                        print(f"[PERINGATAN] Respons gambar diblokir SAFETY oleh {model_name}")
                        last_error = Exception("Blocked by safety filters")
                        continue
                    else:
                        result = response.text
                except Exception as fe:
                    print(f"[DEBUG] Gagal baca finish_reason gambar: {fe}")
                    result = response.text

                # Tambahkan peringatan URGENT jika perlu
                level_check = klasifikasi_kondisi_darurat(teks_for_klasifikasi)
                if level_check == "URGENT":
                    result += "\n\n---\n⚠️ **Perhatian:** Berdasarkan gejala yang dilaporkan, kondisi ini mungkin memerlukan perhatian medis segera."

                return result

            except Exception as e:
                last_error = e
                continue

        msg = str(last_error) if last_error else "Unknown error"

        # Fallback: jika model vision tidak tersedia, gunakan analisis teks
        if "429" in msg or "rate limit" in msg.lower() or "quota" in msg.lower() or "not supported" in msg.lower():
            return analisis_gejala(
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

        return f"⚠️ Terjadi kesalahan saat menganalisis gambar: {msg.splitlines()[0]}"

    except Exception as e:
        return f"⚠️ Terjadi kesalahan saat memproses gambar: {str(e)}"
