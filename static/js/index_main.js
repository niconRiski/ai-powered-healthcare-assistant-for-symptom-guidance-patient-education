// ── SC STATE ─────────────────────────────────────────────
                const scState = {
                  gender: 'Laki-laki',
                  durasi: 'hari ini',
                  keparahan: 3,
                  riwayat: [],
                  kondisi: [],
                  followupAnswers: {},
                  lastGejala: []
                };

                // ── Category filter (wires into existing renderDaftarGejala) ──
                function scSetCategory(cat, btn) {
                  document.querySelectorAll('#sc-cat-tabs .sc-cat-tab').forEach(b => b.classList.remove('active'));
                  btn.classList.add('active');
                  const sel = document.getElementById('filter-sistem');
                  if (sel) { sel.value = cat; }
                  else {
                    // inject hidden select if not present
                    let fk = document.getElementById('filter-sistem');
                    if (!fk) {
                      fk = document.createElement('select');
                      fk.id = 'filter-sistem';
                      fk.style.display = 'none';
                      document.body.appendChild(fk);
                      ['semua', 'umum', 'pernapasan', 'jantung', 'kepala', 'pencernaan', 'tulang', 'kulit', 'mental'].forEach(v => {
                        const o = document.createElement('option'); o.value = v; fk.appendChild(o);
                      });
                    }
                    fk.value = cat;
                  }
                  if (typeof renderDaftarGejala === 'function') renderDaftarGejala();
                }

                // ── Gender ───────────────────────────────────────────────
                function scSelectGender(btn, val) {
                  document.querySelectorAll('.sc-radio-btn').forEach(b => b.classList.remove('active'));
                  btn.classList.add('active');
                  scState.gender = val;
                  document.getElementById('pilih-jk').value = val;
                }

                // ── Duration ─────────────────────────────────────────────
                function scSelectDuration(btn, val) {
                  document.querySelectorAll('.sc-dur-btn').forEach(b => b.classList.remove('selected'));
                  btn.classList.add('selected');
                  scState.durasi = val;
                  document.getElementById('pilih-durasi').value = val;
                }

                // ── Severity ─────────────────────────────────────────────
                function scUpdateSeverity(val) {
                  scState.keparahan = parseInt(val);
                  document.getElementById('severity-value').textContent = val;
                }

                // ── Toggle checkboxes ────────────────────────────────────
                function scToggleCheck(btn, group) {
                  const isNone = btn.dataset.none === 'true';
                  const groupEl = document.getElementById('sc-' + group + '-group');
                  if (isNone) {
                    groupEl.querySelectorAll('.sc-checkbox-btn:not([data-none])').forEach(b => b.classList.remove('checked'));
                    btn.classList.toggle('checked');
                  } else {
                    groupEl.querySelector('[data-none]')?.classList.remove('checked');
                    btn.classList.toggle('checked');
                  }
                  scState[group] = [...groupEl.querySelectorAll('.sc-checkbox-btn.checked')].map(b => b.textContent.trim().replace(/^✓ /, '').trim());
                }

                // ── Image Upload ─────────────────────────────────────────
                function scPreviewImage(input) {
                  if (!input.files || !input.files[0]) return;
                  const file = input.files[0];
                  const reader = new FileReader();
                  reader.onload = e => {
                    document.getElementById('sc-preview-img').src = e.target.result;
                    document.getElementById('sc-preview-name').textContent = file.name;
                    document.getElementById('sc-upload-preview').style.display = 'block';
                  };
                  reader.readAsDataURL(file);
                }

                function scHandleDrop(e) {
                  e.preventDefault();
                  document.getElementById('sc-upload-zone').classList.remove('drag-over');
                  const file = e.dataTransfer.files[0];
                  if (file && file.type.startsWith('image/')) {
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    const input = document.getElementById('input-foto-gejala');
                    input.files = dt.files;
                    scPreviewImage(input);
                  }
                }

                function scClearImage() {
                  document.getElementById('input-foto-gejala').value = '';
                  document.getElementById('sc-upload-preview').style.display = 'none';
                  document.getElementById('sc-preview-img').src = '';
                }

                // ── Emergency Triage ─────────────────────────────────────
                function scCheckEmergency() {
                  const g = (typeof state !== 'undefined' ? state.gejalaTerpilih : []).map(x => x.toLowerCase());
                  const txt = (document.getElementById('symptoms')?.value || '').toLowerCase();
                  const all = g.join(' ') + ' ' + txt;
                  let reason = '';
                  if ((all.includes('nyeri dada') || all.includes('dada')) && (all.includes('sesak') || all.includes('nafas')))
                    reason = '⚠️ Nyeri dada + sesak napas — kemungkinan serangan jantung atau emboli paru.';
                  if ((all.includes('pusing') || all.includes('sakit kepala')) && (all.includes('mati rasa') || all.includes('wajah') || all.includes('bicara')))
                    reason = '⚠️ Pusing + mati rasa wajah — kemungkinan stroke.';
                  if ((all.includes('demam') || all.includes('panas')) && all.includes('kaku leher'))
                    reason = '⚠️ Demam + kaku leher — kemungkinan meningitis.';
                  const banner = document.getElementById('sc-emergency-banner');
                  if (reason) {
                    banner.classList.add('visible');
                    document.getElementById('sc-emergency-reason').textContent = reason;
                  } else {
                    banner.classList.remove('visible');
                  }
                }

                // ── Follow-up Questions ──────────────────────────────────
                const SC_FOLLOWUP_MAP = {
                  'Sakit Kepala': [
                    { id: 'sh_nausea', q: 'Apakah sakit kepala disertai mual atau muntah?' },
                    { id: 'sh_light', q: 'Apakah Anda sensitif terhadap cahaya terang?' },
                  ],
                  'Batuk': [
                    { id: 'bt_dahak', q: 'Apakah batuk berdahak?' },
                    { id: 'bt_sesak', q: 'Apakah disertai sesak napas?' },
                  ],
                  'Demam': [
                    { id: 'dm_high', q: 'Apakah suhu tubuh >39°C?' },
                    { id: 'dm_gigil', q: 'Apakah disertai menggigil?' },
                  ],
                  'Mual': [
                    { id: 'ml_muntah', q: 'Apakah disertai muntah?' },
                    { id: 'ml_makan', q: 'Apakah memburuk setelah makan?' },
                  ],
                  'Nyeri Dada': [
                    { id: 'nd_berat', q: 'Apakah nyeri seperti ditekan benda berat?' },
                    { id: 'nd_lengan', q: 'Apakah menjalar ke lengan kiri atau leher?' },
                  ],
                  'Pusing': [
                    { id: 'pz_berputar', q: 'Apakah pusing seperti berputar (vertigo)?' },
                    { id: 'pz_jatuh', q: 'Apakah hampir jatuh saat berdiri?' },
                  ],
                };

                function scShowFollowup() {
                  const gejala = typeof state !== 'undefined' ? state.gejalaTerpilih : [];
                  const questions = [];
                  gejala.forEach(g => {
                    if (SC_FOLLOWUP_MAP[g]) {
                      SC_FOLLOWUP_MAP[g].forEach(q => {
                        if (!questions.find(x => x.id === q.id)) questions.push(q);
                      });
                    }
                  });
                  if (questions.length === 0) {
                    scShowResultDashboard();
                    return;
                  }
                  const container = document.getElementById('sc-followup-questions');
                  container.innerHTML = questions.map(q => `
      <div class="sc-question-card">
        <p class="sc-question-text">❓ ${q.q}</p>
        <div class="sc-answer-row">
          <button class="sc-answer-btn yes" onclick="scAnswer('${q.id}',true,this)">✅ Ya</button>
          <button class="sc-answer-btn no" onclick="scAnswer('${q.id}',false,this)">❌ Tidak</button>
        </div>
      </div>
    `).join('');
                  const section = document.getElementById('sc-followup-section');
                  section.classList.add('visible');
                  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }

                function scAnswer(id, val, btn) {
                  scState.followupAnswers[id] = val;
                  const row = btn.closest('.sc-answer-row');
                  row.querySelectorAll('.sc-answer-btn').forEach(b => { b.classList.remove('yes', 'no', 'selected'); });
                  btn.classList.add('selected', val ? 'yes' : 'no');
                }

                function scSubmitFollowup() {
                  document.getElementById('sc-followup-section').classList.remove('visible');
                  scShowResultDashboard();
                }

                // ── Result Dashboard ─────────────────────────────────────
                function scShowResultDashboard() {
                  const gejala = typeof state !== 'undefined' ? state.gejalaTerpilih : [];
                  const keparahan = scState.keparahan;

                  // Build dummy conditions based on selected symptoms
                  const conditions = scBuildConditions(gejala, keparahan);
                  const condContainer = document.getElementById('sc-conditions-list');
                  condContainer.innerHTML = conditions.map((c, i) => `
      <div class="sc-condition-card">
        <div class="sc-condition-header">
          <span class="sc-condition-name">${i + 1}. ${c.name}</span>
          <span class="sc-condition-pct">${c.pct}%</span>
        </div>
        <div class="sc-progress-bar"><div class="sc-progress-fill" style="width:0%;" data-target="${c.pct}"></div></div>
        <p style="font-size:11px; color:#526069; margin-top:.375rem;">${c.desc}</p>
      </div>
    `).join('');
                  setTimeout(() => {
                    condContainer.querySelectorAll('.sc-progress-fill').forEach(el => {
                      el.style.width = el.dataset.target + '%';
                    });
                  }, 100);

                  // Risk level
                  const risk = scCalcRisk(gejala, keparahan);
                  const riskEl = document.getElementById('sc-risk-indicator');
                  const riskLabel = document.getElementById('sc-risk-label');
                  const riskDesc = document.getElementById('sc-risk-desc');
                  const riskIcon = document.getElementById('sc-risk-icon');
                  const riskStyles = {
                    low: { bg: 'linear-gradient(135deg,#22c55e,#16a34a)', shadow: 'rgba(34,197,94,0.4)', icon: 'check_circle', label: 'Rendah', desc: 'Kondisi dapat dirawat mandiri' },
                    med: { bg: 'linear-gradient(135deg,#eab308,#ca8a04)', shadow: 'rgba(234,179,8,0.4)', icon: 'warning', label: 'Sedang', desc: 'Disarankan konsultasi dokter' },
                    high: { bg: 'linear-gradient(135deg,#f97316,#ea580c)', shadow: 'rgba(249,115,22,0.4)', icon: 'priority_high', label: 'Tinggi', desc: 'Segera temui dokter hari ini' },
                    emergency: { bg: 'linear-gradient(135deg,#ef4444,#dc2626)', shadow: 'rgba(239,68,68,0.5)', icon: 'emergency', label: 'Darurat', desc: 'Segera ke IGD / Hubungi 119' },
                  };
                  const rs = riskStyles[risk];
                  riskEl.style.background = rs.bg;
                  riskEl.style.boxShadow = '0 8px 24px ' + rs.shadow;
                  riskIcon.textContent = rs.icon;
                  riskLabel.textContent = rs.label;
                  riskDesc.textContent = rs.desc;

                  // Recommendations
                  const recos = scBuildRecos(gejala);
                  document.getElementById('sc-reco-grid').innerHTML = recos.map(r => `
      <div class="sc-reco-card">
        <span class="sc-reco-icon">${r.icon}</span>
        <p class="sc-reco-text">${r.text}</p>
      </div>
    `).join('');

                  // Prevention link
                  if (risk === 'high' || risk === 'emergency') {
                    document.getElementById('sc-prevention-link').style.display = 'block';
                    document.getElementById('sc-prevention-risk').textContent = 'Gejala menunjukkan risiko ' + rs.label.toLowerCase() + '. Tindakan pencegahan sangat direkomendasikan.';
                  }

                  // AI Insight
                  scUpdateInsight(gejala, keparahan);

                  const dashboard = document.getElementById('sc-result-dashboard');
                  dashboard.classList.add('visible');
                  dashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }

                function scBuildConditions(gejala, kep) {
                  const all = gejala.map(g => g.toLowerCase()).join(' ');
                  const pool = [];
                  if (all.includes('demam') || all.includes('batuk') || all.includes('pilek')) pool.push({ name: 'Influenza (Flu)', pct: 72 + Math.min(kep, 10) * 2, desc: 'Infeksi virus penyebab demam, batuk, dan pilek.' });
                  if (all.includes('batuk') || all.includes('sesak') || all.includes('tenggorokan')) pool.push({ name: 'ISPA', pct: 65 + Math.min(kep, 8) * 2, desc: 'Infeksi saluran pernapasan atas yang umum.' });
                  if (all.includes('sakit kepala') || all.includes('pusing')) pool.push({ name: 'Tension Headache', pct: 58 + kep * 2, desc: 'Sakit kepala tipe tegang, bisa karena stres atau dehidrasi.' });
                  if (all.includes('mual') || all.includes('diare') || all.includes('perut')) pool.push({ name: 'Gastroenteritis', pct: 60 + kep * 2, desc: 'Infeksi pada saluran pencernaan.' });
                  if (all.includes('gatal') || all.includes('ruam')) pool.push({ name: 'Alergi', pct: 55 + kep, desc: 'Reaksi alergi pada kulit atau sistemik.' });
                  if (pool.length === 0) pool.push({ name: 'Kondisi Umum (Kelelahan)', pct: 50, desc: 'Mungkin disebabkan oleh kelelahan atau kurang istirahat.' });
                  pool.push({ name: 'Infeksi Virus Ringan', pct: Math.max(30, 55 - kep * 3), desc: 'Infeksi virus biasa yang memerlukan istirahat.' });
                  return pool.slice(0, 3).sort((a, b) => b.pct - a.pct).map(c => ({ ...c, pct: Math.min(99, c.pct) }));
                }

                function scCalcRisk(gejala, kep) {
                  const all = gejala.map(g => g.toLowerCase()).join(' ');
                  if ((all.includes('nyeri dada') && (all.includes('sesak') || all.includes('mati rasa'))) || kep >= 9) return 'emergency';
                  if (kep >= 7 || gejala.length >= 5 || all.includes('pingsan') || all.includes('darah')) return 'high';
                  if (kep >= 5 || gejala.length >= 3) return 'med';
                  return 'low';
                }

                function scBuildRecos(gejala) {
                  const all = gejala.map(g => g.toLowerCase()).join(' ');
                  const base = [
                    { icon: '😴', text: 'Istirahat cukup 7-8 jam per malam' },
                    { icon: '💧', text: 'Minum air putih minimal 8 gelas sehari' },
                    { icon: '🌡️', text: 'Pantau suhu tubuh setiap 4-6 jam' },
                    { icon: '🥗', text: 'Konsumsi makanan bergizi, hindari gorengan' },
                    { icon: '🏠', text: 'Tetap di rumah, hindari kerumunan' },
                  ];
                  if (all.includes('demam')) base.push({ icon: '💊', text: 'Konsumsi parasetamol jika demam >38°C' });
                  if (all.includes('batuk')) base.push({ icon: '🍋', text: 'Minum air hangat + madu + lemon' });
                  if (all.includes('mual') || all.includes('diare')) base.push({ icon: '🧂', text: 'Konsumsi oralit untuk rehidrasi' });
                  if (all.includes('sakit kepala')) base.push({ icon: '🕶️', text: 'Istirahat di tempat gelap dan tenang' });
                  base.push({ icon: '👨‍⚕️', text: 'Konsultasi dokter jika gejala memburuk' });
                  return base.slice(0, 8);
                }

                function scUpdateInsight(gejala, kep) {
                  const tinggi = parseFloat(document.getElementById('sc-tinggi')?.value) || 165;
                  const berat = parseFloat(document.getElementById('sc-berat')?.value) || 60;
                  const bmi = (berat / ((tinggi / 100) ** 2)).toFixed(1);
                  document.getElementById('sc-bmi-insight').textContent = bmi;
                  document.getElementById('sc-nutri-insight').textContent = '—';
                  document.getElementById('sc-activity-insight').textContent = '—';
                  document.getElementById('sc-hydration-insight').textContent = '—';
                  document.getElementById('sc-sleep-insight').textContent = '—';

                  // Try sync from pencegahan page data
                  try {
                    const nutRings = document.querySelectorAll('.nutri-ring');
                    if (nutRings.length >= 4) document.getElementById('sc-nutri-insight').textContent = parseInt(nutRings[0].textContent) + '%';
                    const hydEl = document.getElementById('prev-hydration-count');
                    if (hydEl) document.getElementById('sc-hydration-insight').textContent = hydEl.textContent.split('/')[0] + '/8';
                  } catch (e) { }

                  const all = gejala.map(g => g.toLowerCase()).join(' ');
                  let insight = '"Berdasarkan analisis gejala Anda';
                  if (gejala.length > 0) {
                    insight += ` (${gejala.slice(0, 3).join(', ')})`;
                    if (all.includes('kelelahan') || all.includes('lemas')) insight += ', pola tidur dan hidrasi perlu diperhatikan. Tingkatkan istirahat menjadi 7-8 jam dan minum minimal 8 gelas air sehari.';
                    else if (all.includes('demam') || all.includes('batuk')) insight += ', sistem imun Anda sedang bekerja keras. Pastikan asupan nutrisi cukup, terutama vitamin C dan zinc.';
                    else if (all.includes('sakit kepala') || all.includes('pusing')) insight += ', dehidrasi dan kurang tidur sering menjadi pemicu. Perhatikan pola minum dan tidur Anda.';
                    else insight += ', pastikan pola makan, tidur, dan hidrasi tetap terjaga untuk mendukung pemulihan optimal.';
                  } else {
                    insight += ', belum ada gejala yang dipilih. Pilih gejala untuk mendapatkan insight yang lebih personal.';
                  }
                  insight += '"';
                  document.getElementById('sc-insight-text').textContent = insight;
                }


                // ── Wire emergency check to symptom selection ────────────
                document.addEventListener('DOMContentLoaded', function () {
                  // Patch pilihGejala to also check emergency
                  const origPilih = window.pilihGejala;
                  if (origPilih) {
                    window.pilihGejala = function (nama) {
                      origPilih(nama);
                      scCheckEmergency();
                      scState.lastGejala = typeof state !== 'undefined' ? [...state.gejalaTerpilih] : [];
                      scUpdateInsight(scState.lastGejala, scState.keparahan);
                    };
                  }

                  // Patch analisisGejala to show follow-up BEFORE result
                  const origAnalisis = window.analisisGejala;
                  if (origAnalisis) {
                    window.analisisGejala = async function () {
                      await origAnalisis();
                      // After backend result is shown, also show result dashboard
                      setTimeout(() => {
                        const gejala = typeof state !== 'undefined' ? state.gejalaTerpilih : [];
                        if (gejala.length > 0) {
                          scShowFollowup();
                        }
                      }, 800);
                    };
                  }

                  // Sync cari-gejala input to trigger renderDaftarGejala
                  const cariEl = document.getElementById('cari-gejala');
                  if (cariEl) cariEl.addEventListener('input', () => { if (typeof renderDaftarGejala === 'function') renderDaftarGejala(); });

                  // Insert hidden filter-sistem if needed
                  if (!document.getElementById('filter-sistem')) {
                    const fk = document.createElement('select');
                    fk.id = 'filter-sistem';
                    fk.style.display = 'none';
                    ['semua', 'umum', 'pernapasan', 'jantung', 'kepala', 'pencernaan', 'tulang', 'kulit', 'mental'].forEach(v => {
                      const o = document.createElement('option'); o.value = v; fk.appendChild(o);
                    });
                    document.body.appendChild(fk);
                  }

                  // Render gejala on load
                  if (typeof renderDaftarGejala === 'function') renderDaftarGejala();

                  // BMI auto-calc
                  ['sc-tinggi', 'sc-berat'].forEach(id => {
                    document.getElementById(id)?.addEventListener('input', () => {
                      const t = parseFloat(document.getElementById('sc-tinggi')?.value) || 165;
                      const b = parseFloat(document.getElementById('sc-berat')?.value) || 60;
                      document.getElementById('sc-bmi-insight').textContent = (b / ((t / 100) ** 2)).toFixed(1);
                    });
                  });
                });

/* --- Extracted Script --- */

function autoSearch(text) {
            document.getElementById('searchInput').value = text;
            searchObat();
        }

        async function searchObat() {
            const input = document.getElementById('searchInput').value.trim();
            if (!input) return;

            document.getElementById('searchText').style.display = 'none';
            document.getElementById('searchLoader').style.display = 'block';
            const resCard = document.getElementById('searchResult');
            resCard.style.display = 'none';

            try {
                const response = await fetch('/info-obat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nama_obat: input })
                });
                const data = await response.json();
                
                document.getElementById('resName').innerText = `Informasi: ${input}`;
                if(data.hasil) {
                    let html = data.hasil
                        .replace(/</g, '&lt;').replace(/>/g, '&gt;')
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/📋|💊|✅|⚠️|🚫|🤰|💡/g, match => `<br><br><span style="font-size:16px;">${match}</span> `);
                    document.getElementById('resContent').innerHTML = html;
                } else {
                    document.getElementById('resContent').innerHTML = data.error || 'Terjadi kesalahan.';
                }
                resCard.style.display = 'block';
            } catch (err) {
                alert('Gagal mengambil informasi obat.');
            } finally {
                document.getElementById('searchText').style.display = 'inline-block';
                document.getElementById('searchLoader').style.display = 'none';
            }
        }

        async function cekInteraksi() {
            const o1 = document.getElementById('obat1').value.trim();
            const o2 = document.getElementById('obat2').value.trim();
            const o3 = document.getElementById('obat3').value.trim();
            
            if(!o1 || !o2) return alert('Masukkan minimal obat pertama dan kedua!');

            const obatList = [o1, o2];
            if(o3) obatList.push(o3);

            document.getElementById('interaksiText').style.display = 'none';
            document.getElementById('interaksiLoader').style.display = 'block';
            const resBox = document.getElementById('interaksiResult');
            resBox.style.display = 'none';
            resBox.className = 'result-box';

            try {
                const response = await fetch('/cek-interaksi', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ obat: obatList })
                });
                const data = await response.json();
                
                if(data.hasil) {
                    let html = `<strong>Hasil Analisis untuk: ${obatList.join(', ')}</strong><br><br>`;
                    html += data.hasil.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    resBox.innerHTML = html;
                    
                    const textLower = data.hasil.toLowerCase();
                    if(textLower.includes('berbahaya')) {
                        resBox.classList.add('danger');
                    } else if(textLower.includes('perlu perhatian')) {
                        resBox.classList.add('warning');
                    } else {
                        resBox.classList.add('safe');
                    }
                    resBox.style.display = 'block';
                } else {
                    alert(data.error || 'Terjadi kesalahan.');
                }
            } catch (err) {
                alert('Gagal mengecek interaksi.');
            } finally {
                document.getElementById('interaksiText').style.display = 'inline-block';
                document.getElementById('interaksiLoader').style.display = 'none';
            }
        }

        let currentScanFile = null;
        let currentScanB64 = null;

        function handleFileScan(input) {
            if (input.files && input.files[0]) {
                const file = input.files[0];
                if(file.size > 5 * 1024 * 1024) {
                    return alert("Ukuran file maksimal 5MB");
                }
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    currentScanB64 = e.target.result;
                    currentScanFile = file;
                    document.getElementById('scanTextPreview').innerText = file.name;
                    document.getElementById('btnScanAction').style.display = 'flex';
                    document.getElementById('scanResult').style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        }

        function triggerScan() {
            if(!currentScanB64) return;
            doScan(currentScanB64, currentScanFile.name);
        }

        async function doScan(b64, filename) {
            document.getElementById('btnScanAction').style.display = 'none';
            document.getElementById('scanLoaderWrapper').style.display = 'block';
            const resBox = document.getElementById('scanResult');
            resBox.style.display = 'none';
            resBox.className = 'result-box';

            try {
                const response = await fetch('/scan-obat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: b64, filename: filename })
                });
                const data = await response.json();
                
                if(data.hasil && !data.error) {
                    let html = data.hasil
                        .replace(/</g, '&lt;').replace(/>/g, '&gt;')
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/📋|💊|✅|⚠️|🚫|🤰|💡/g, match => `<br><br><span style="font-size:16px;">${match}</span> `);
                    resBox.innerHTML = html;
                    resBox.classList.add('safe');
                } else {
                    resBox.innerHTML = data.error || 'Gagal membaca kemasan obat.';
                    resBox.classList.add('danger');
                }
                resBox.style.display = 'block';
            } catch (err) {
                resBox.innerHTML = 'Terjadi kesalahan jaringan saat memproses gambar.';
                resBox.classList.add('danger');
                resBox.style.display = 'block';
            } finally {
                document.getElementById('scanLoaderWrapper').style.display = 'none';
            }
        }

/* --- Extracted Script --- */

function goalUpdate() {
              // Weight progress
              const wCur = parseFloat(document.getElementById('goal-weight-current')?.value) || 70;
              const wTgt = parseFloat(document.getElementById('goal-weight-target')?.value) || 65;
              const wStart = wCur > wTgt ? wCur + 5 : wCur;
              const progress = wCur > wTgt ? Math.max(0, Math.min(100, ((wStart - wCur) / (wStart - wTgt)) * 100)) : 100;
              const wpct = document.getElementById('goal-weight-pct');
              const wbar = document.getElementById('goal-weight-bar');
              if (wpct) wpct.textContent = Math.round(progress) + '%';
              if (wbar) wbar.style.width = Math.round(progress) + '%';
              // Activity weekly
              const actMin = parseFloat(document.getElementById('goal-activity-target')?.value) || 30;
              const weekly = actMin * 7;
              const awEl = document.getElementById('goal-activity-weekly');
              const abar = document.getElementById('goal-activity-bar');
              if (awEl) awEl.textContent = weekly + ' mnt';
              if (abar) abar.style.width = Math.min(100, (actMin / 60) * 100) + '%';
              // Calorie net
              const calIn = parseFloat(document.getElementById('goal-cal-in')?.value) || 2000;
              const deficit = parseFloat(document.getElementById('goal-cal-deficit')?.value) || 500;
              const net = calIn - deficit;
              const netEl = document.getElementById('goal-cal-net');
              if (netEl) netEl.textContent = net;
              const infoEl = document.getElementById('goal-cal-info');
              if (infoEl) {
                const kgPerWeek = (deficit * 7 / 7700).toFixed(2);
                infoEl.textContent = `Defisit ${deficit} kkal/hari = turun ~${kgPerWeek} kg/minggu`;
              }
              // Sync to AHI dashboard weight inputs
              const ahiW = document.getElementById('prev-bmi-weight');
              if (ahiW && !ahiW.dataset.userEdited) ahiW.value = wCur;
            }
            document.addEventListener('DOMContentLoaded', function () { setTimeout(goalUpdate, 400); });

/* --- Extracted Script --- */

function pmChecklistUpdate() {
            const ids = ['pm-cb-sayur', 'pm-cb-buah', 'pm-cb-protein', 'pm-cb-air', 'pm-cb-susu'];
            const checked = ids.filter(id => document.getElementById(id)?.checked).length;
            const total = ids.length;
            const pct = Math.round((checked / total) * 100);
            const bar = document.getElementById('pm-checklist-bar');
            const badge = document.getElementById('pm-checklist-badge');
            if (bar) bar.style.width = pct + '%';
            if (badge) {
              if (checked === total) {
                badge.textContent = total + '/' + total + ' Semua Tercapai!';
                badge.style.background = '#dcfce7';
                badge.style.color = '#166534';
              } else {
                badge.textContent = checked + '/' + total + ' Target Tercapai';
                badge.style.background = checked >= 3 ? '#dbeafe' : '#f1f5f9';
                badge.style.color = checked >= 3 ? '#1d4ed8' : '#526069';
              }
            }
            // Update checklist item styles
            const itemMap = { 'pm-cb-sayur': 'pm-cl-sayur', 'pm-cb-buah': 'pm-cl-buah', 'pm-cb-protein': 'pm-cl-protein', 'pm-cb-air': 'pm-cl-air', 'pm-cb-susu': 'pm-cl-susu' };
            const colMap = { 'pm-cb-sayur': '#0052cc', 'pm-cb-buah': '#22c55e', 'pm-cb-protein': '#f97316', 'pm-cb-air': '#06b6d4', 'pm-cb-susu': '#8b5cf6' };
            ids.forEach(id => {
              const label = document.getElementById(itemMap[id]);
              const cb = document.getElementById(id);
              if (label && cb) {
                const isDark = document.body.classList.contains('dark-theme');
                if (isDark) {
                  label.style.borderColor = cb.checked ? colMap[id] : 'rgba(255,255,255,0.1)';
                  label.style.background = cb.checked ? 'rgba(30,41,59,0.95)' : 'rgba(30,41,59,0.85)';
                } else {
                  label.style.borderColor = cb.checked ? colMap[id] : '#e5eefc';
                  label.style.background = cb.checked ? 'rgba(0,82,204,0.04)' : '#f8faff';
                }
              }
            });
          }
          function pmScrollToNutrisiAnalyzer() {
            const el = document.getElementById('prev-nutrition-analyzer') || document.querySelector('.prev-nutrition-analyzer') || document.getElementById('prev-input-breakfast');
            if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
          }
          function pmRefreshAIInsight() {
            const nutriRings = document.querySelectorAll('.nutri-ring');
            let prot = 85, carb = 40, fiber = 90, vit = 75;
            if (nutriRings.length >= 4) {
              prot = parseInt(nutriRings[0]?.textContent) || 85;
              carb = parseInt(nutriRings[1]?.textContent) || 40;
              fiber = parseInt(nutriRings[2]?.textContent) || 90;
              vit = parseInt(nutriRings[3]?.textContent) || 75;
            }
            const scores = document.getElementById('pm-ai-scores');
            if (scores) {
              const getColor = (v) => v >= 80 ? '#dcfce7,#166534' : v >= 60 ? '#dbeafe,#1d4ed8' : '#fef9c3,#854d0e';
              const pill = (label, val) => { const [bg, cl] = getColor(val).split(','); return `<span style="padding:.25rem .875rem; background:${bg}; color:${cl}; font-size:10px; font-weight:900; border-radius:99px;">${label} ${val}%</span>`; };
              scores.innerHTML = pill('Protein', prot) + pill('Karbo', carb) + pill('Serat', fiber) + pill('Vitamin', vit);
            }
            const insights = [];
            if (prot >= 80) insights.push('Protein Anda sangat baik di angka ' + prot + '%.');
            else insights.push('Asupan protein perlu ditingkatkan (' + prot + '%). Tambahkan ikan, ayam, atau tempe.');
            if (carb < 60) insights.push('Karbohidrat masih rendah di ' + carb + '%. Tambahkan nasi merah atau oat untuk energi stabil.');
            else insights.push('Asupan karbohidrat cukup baik di ' + carb + '%.');
            if (fiber < 70) insights.push('Serat perlu ditambah (' + fiber + '%). Perbanyak sayuran hijau atau buah segar.');
            else insights.push('Asupan serat Anda ideal di ' + fiber + '%.');
            const textEl = document.getElementById('pm-ai-insight-text');
            if (textEl) textEl.querySelector('p').textContent = '“' + insights.join(' ') + '”';
          }
          // Sync water bar with water tracker
          document.addEventListener('DOMContentLoaded', function () {
            setTimeout(function () {
              const hydEl = document.getElementById('prev-hydration-count');
              if (hydEl) {
                const n = parseInt(hydEl.textContent) || 3;
                const bar = document.getElementById('pm-water-bar');
                if (bar) bar.style.width = Math.round((n / 8) * 100) + '%';
              }
            }, 800);
          });

/* --- Extracted Script --- */

/* ===== SLEEP TRACKER LOGIC ===== */
            (function () {
              var SLP = {
                rating: 0,
                reminderOn: false,
                reminderTimer: null,
                history: JSON.parse(localStorage.getItem('slp_history') || '[]'),

                // Calc duration in hours from time strings
                calcDuration: function (sleep, wake) {
                  var sp = sleep.split(':').map(Number);
                  var wp = wake.split(':').map(Number);
                  var sm = sp[0] * 60 + sp[1];
                  var wm = wp[0] * 60 + wp[1];
                  if (wm <= sm) wm += 24 * 60; // cross midnight
                  return (wm - sm) / 60;
                },

                getStatus: function (h) {
                  if (h < 6) return { label: 'Kurang', cls: 'background:#fef2f2; color:#dc2626;', emoji: '😴', color: '#ef4444' };
                  if (h < 7) return { label: 'Kurang', cls: 'background:#fef9c3; color:#92400e;', emoji: '😑', color: '#f59e0b' };
                  if (h <= 9) return { label: 'Ideal', cls: 'background:#dcfce7; color:#166534;', emoji: '😊', color: '#10b981' };
                  return { label: 'Lebihan', cls: 'background:#ede9fe; color:#5b21b6;', emoji: '😪', color: '#8b5cf6' };
                },

                getReco: function (h) {
                  if (h < 5) return 'Tidur Anda sangat kurang! Kurang tidur kronis dapat meningkatkan risiko penyakit jantung dan diabetes. Coba tidur lebih awal malam ini.';
                  if (h < 6) return 'Durasi tidur masih di bawah batas minimum. Tambahkan setidaknya 1–2 jam agar tubuh dapat memulihkan diri dengan baik.';
                  if (h < 7) return 'Mendekati ideal! Tambahkan ' + Math.round((7 - h) * 60) + ' menit lagi untuk mencapai batas minimum 7 jam yang disarankan WHO.';
                  if (h <= 8) return 'Durasi tidur Anda ideal! Pertahankan konsistensi jadwal tidur untuk kualitas istirahat yang optimal.';
                  if (h <= 9) return 'Kualitas tidur sangat baik. Anda mendapatkan istirahat penuh — tubuh dan otak siap beraktivitas!';
                  return 'Tidur Anda melebihi 9 jam. Tidur berlebih bisa menjadi tanda kelelahan kronis. Evaluasi pola aktivitas harian Anda.';
                },

                getBarColor: function (h) {
                  if (h < 6) return '#ef4444';
                  if (h < 7) return '#f59e0b';
                  if (h <= 9) return 'linear-gradient(90deg,#10b981,#0052cc)';
                  return '#8b5cf6';
                },

                ratingLabels: ['', 'Sangat Buruk 😞', 'Buruk 😕', 'Cukup 😐', 'Baik 😊', 'Sangat Baik 🌟'],

                calculate: function () {
                  var s = document.getElementById('slp-input-sleep')?.value || '23:00';
                  var w = document.getElementById('slp-input-wake')?.value || '06:30';
                  var h = this.calcDuration(s, w);
                  var errEl = document.getElementById('slp-error-msg');
                  if (h > 18 || h <= 0) { if (errEl) errEl.style.display = 'block'; return; }
                  if (errEl) errEl.style.display = 'none';

                  var st = this.getStatus(h);
                  var pct = Math.min(100, (h / 12) * 100);
                  var hInt = Math.floor(h);
                  var mInt = Math.round((h - hInt) * 60);

                  // Update displays
                  var bigEl = document.getElementById('slp-duration-big');
                  if (bigEl) { bigEl.textContent = hInt + (mInt > 0 ? '.' + Math.round(mInt / 6) : ''); }
                  var lblEl = document.getElementById('slp-duration-label');
                  if (lblEl) lblEl.textContent = hInt + 'j ' + (mInt > 0 ? mInt + 'm' : '');
                  var barEl = document.getElementById('slp-progress-bar');
                  if (barEl) { barEl.style.width = pct + '%'; barEl.style.background = this.getBarColor(h); }
                  var badgeEl = document.getElementById('slp-status-badge');
                  if (badgeEl) { badgeEl.style.cssText += '; ' + st.cls; badgeEl.textContent = st.label; }
                  var moonEl = document.getElementById('slp-moon-icon');
                  if (moonEl) moonEl.textContent = st.emoji;
                  var recoEl = document.getElementById('slp-reco-text');
                  if (recoEl) recoEl.textContent = '"' + this.getReco(h) + '"';

                  // Sync to AHI slider
                  var sliderEl = document.getElementById('prev-sleep-hours');
                  if (sliderEl) { sliderEl.value = Math.round(h * 2) / 2; if (typeof prevAnalisisKesehatanAI === 'function') { } }
                },

                setRating: function (v) {
                  this.rating = v;
                  var stars = document.querySelectorAll('.slp-star');
                  stars.forEach(function (s) {
                    var sv = parseInt(s.getAttribute('data-v'));
                    if (sv <= v) s.classList.add('active');
                    else s.classList.remove('active');
                  });
                  var lbl = document.getElementById('slp-rating-label');
                  if (lbl) lbl.textContent = SLP.ratingLabels[v] || '';
                },

                saveEntry: function () {
                  var s = document.getElementById('slp-input-sleep')?.value || '23:00';
                  var w = document.getElementById('slp-input-wake')?.value || '06:30';
                  var h = this.calcDuration(s, w);
                  if (h > 18 || h <= 0) { alert('Waktu tidak valid!'); return; }
                  var today = new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
                  var entry = { date: today, sleep: s, wake: w, hours: h, rating: this.rating, ts: Date.now() };
                  this.history.unshift(entry);
                  if (this.history.length > 30) this.history = this.history.slice(0, 30);
                  localStorage.setItem('slp_history', JSON.stringify(this.history));
                  this.renderHistory();
                  this.renderChart();

                  // ── Sync ke AI Health Insight Dashboard ──────────────
                  var sliderEl = document.getElementById('prev-sleep-hours');
                  if (sliderEl) {
                    sliderEl.value = Math.round(h * 2) / 2; // round to nearest 0.5
                  }
                  // Juga simpan ke localStorage agar refresh bisa baca ulang
                  localStorage.setItem('slp_last_hours', h.toString());
                  localStorage.setItem('slp_last_sleep', s);
                  localStorage.setItem('slp_last_wake', w);

                  // Update AHI Dashboard otomatis
                  if (typeof ahiUpdate === 'function') {
                    setTimeout(function () {
                      ahiUpdate();
                      // Tampilkan badge sync di dashboard
                      var badge = document.getElementById('ahi-sleep-sync-badge');
                      var badgeText = document.getElementById('ahi-sleep-sync-text');
                      if (badge) {
                        var hI = Math.floor(h), mI = Math.round((h - hI) * 60);
                        if (badgeText) badgeText.textContent = 'Tidur ' + hI + 'j' + (mI ? ' ' + mI + 'm' : '') + ' (' + s + '→' + w + ') tersinkron ke dashboard';
                        badge.style.display = 'flex';
                        // Scroll smooth ke dashboard
                        var dashEl = document.getElementById('ai-health-insight-dashboard');
                        if (dashEl) dashEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        setTimeout(function () { if (badge) badge.style.display = 'none'; }, 5000);
                      }
                    }, 300);
                  }

                  // Feedback tombol simpan
                  var btn = event.currentTarget;
                  var orig = btn.innerHTML;
                  btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;">check_circle</span> Tersimpan & Dashboard Diperbarui!';
                  btn.style.background = 'linear-gradient(135deg,#065f46,#0f4c75)';
                  setTimeout(function () { btn.innerHTML = orig; btn.style.background = 'linear-gradient(135deg,#0f4c75,#10b981)'; }, 2500);
                },

                renderHistory: function () {
                  var el = document.getElementById('slp-history-list');
                  if (!el) return;
                  if (this.history.length === 0) {
                    el.innerHTML = '<p style="font-size:12px; color:#9ca3af; text-align:center; padding:1.5rem 0; font-style:italic;">Belum ada riwayat. Simpan data tidur hari ini!</p>';
                    return;
                  }
                  el.innerHTML = this.history.slice(0, 10).map(function (e) {
                    var st = SLP.getStatus(e.hours);
                    var hI = Math.floor(e.hours), mI = Math.round((e.hours - hI) * 60);
                    var stars = '★'.repeat(e.rating) + '☆'.repeat(5 - e.rating);
                    return '<div class="slp-history-item">' +
                      '<span style="font-size:18px;">' + st.emoji + '</span>' +
                      '<div style="flex:1; min-width:0;">' +
                      '<div style="display:flex; justify-content:space-between; align-items:center;">' +
                      '<span style="font-size:12px; font-weight:800; color:#0f4c75;">' + e.date + '</span>' +
                      '<span style="font-size:10px; font-weight:900; padding:.15rem .6rem; border-radius:6px; ' + st.cls + '">' + st.label + '</span>' +
                      '</div>' +
                      '<div style="display:flex; align-items:center; justify-content:space-between; margin-top:.2rem;">' +
                      '<span style="font-size:11px; color:#526069; font-weight:600;">' + e.sleep + ' → ' + e.wake + ' &nbsp;|&nbsp; ' + hI + 'j' + (mI ? ' ' + mI + 'm' : '') + '</span>' +
                      '<span style="font-size:11px; color:#f59e0b; letter-spacing:1px;">' + stars + '</span>' +
                      '</div>' +
                      '</div>' +
                      '</div>';
                  }).join('');
                },

                renderChart: function () {
                  var chartEl = document.getElementById('slp-chart-container');
                  var labelsEl = document.getElementById('slp-chart-labels');
                  var avgEl = document.getElementById('slp-weekly-avg');
                  if (!chartEl) return;
                  var data = this.history.slice(0, 7).reverse();
                  if (data.length === 0) {
                    chartEl.innerHTML = '<p style="font-size:12px; color:#9ca3af; text-align:center; width:100%; padding:2rem 0; font-style:italic;">Belum ada data grafik.</p>';
                    if (labelsEl) labelsEl.innerHTML = '';
                    if (avgEl) avgEl.textContent = 'Rata-rata: -';
                    return;
                  }
                  var maxH = Math.max(12, Math.max.apply(null, data.map(function (d) { return d.hours; })));
                  var total = data.reduce(function (a, d) { return a + d.hours; }, 0);
                  if (avgEl) avgEl.textContent = 'Rata-rata: ' + (total / data.length).toFixed(1) + 'j';
                  chartEl.innerHTML = data.map(function (d) {
                    var pct = Math.min(100, (d.hours / maxH) * 100);
                    var bg = d.hours < 6 ? '#ef4444' : d.hours < 7 ? '#f59e0b' : 'linear-gradient(to top,#10b981,#0052cc)';
                    var hI = Math.floor(d.hours), mI = Math.round((d.hours - hI) * 60);
                    return '<div class="slp-chart-bar" style="display:flex; flex-direction:column; justify-content:flex-end;">' +
                      '<div class="slp-bar-tooltip">' + hI + 'j' + (mI ? ' ' + mI + 'm' : '') + '</div>' +
                      '<div class="slp-bar-fill" style="height:' + pct + '%; background:' + bg + ';"></div>' +
                      '</div>';
                  }).join('');
                  if (labelsEl) labelsEl.innerHTML = data.map(function (d) {
                    return '<div style="flex:1; text-align:center; font-size:9px; font-weight:700; color:#9ca3af;">' + d.date.split(' ')[0] + '</div>';
                  }).join('');
                },

                clearHistory: function () {
                  if (!confirm('Hapus semua riwayat tidur?')) return;
                  this.history = [];
                  localStorage.removeItem('slp_history');
                  this.renderHistory();
                  this.renderChart();
                },

                toggleReminder: function () {
                  this.reminderOn = !this.reminderOn;
                  var btn = document.getElementById('slp-reminder-toggle');
                  var desc = document.getElementById('slp-reminder-desc');
                  if (btn) btn.classList.toggle('on', this.reminderOn);
                  var t = document.getElementById('slp-reminder-time')?.value || '22:30';
                  if (desc) desc.textContent = this.reminderOn ? ('Aktif · Pengingat jam ' + t) : 'Nonaktif';
                  if (this.reminderOn) {
                    this.scheduleReminder(t);
                  } else {
                    if (this.reminderTimer) clearTimeout(this.reminderTimer);
                    if (desc) desc.textContent = 'Nonaktif';
                  }
                },

                scheduleReminder: function (timeStr) {
                  if (this.reminderTimer) clearTimeout(this.reminderTimer);
                  var now = new Date();
                  var parts = timeStr.split(':').map(Number);
                  var target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parts[0], parts[1], 0);
                  if (target <= now) target.setDate(target.getDate() + 1);
                  var ms = target - now;
                  this.reminderTimer = setTimeout(function () {
                    if ('Notification' in window && Notification.permission === 'granted') {
                      new Notification('🌙 Waktunya Tidur!', { body: 'Segera istirahat untuk kualitas tidur yang optimal.', icon: '/static/karakter5.png' });
                    } else {
                      alert('🌙 Pengingat: Waktunya tidur! Segera istirahat untuk kualitas tidur yang optimal.');
                    }
                  }, ms);
                  // Request notification permission
                  if ('Notification' in window && Notification.permission === 'default') {
                    Notification.requestPermission();
                  }
                },

                showTab: function (tab) {
                  ['input', 'chart', 'history'].forEach(function (t) {
                    var panel = document.getElementById('slp-panel-' + t);
                    var btn = document.getElementById('slp-tab-' + t);
                    if (panel) panel.style.display = t === tab ? 'block' : 'none';
                    if (btn) btn.classList.toggle('active', t === tab);
                  });
                  if (tab === 'chart') SLP.renderChart();
                  if (tab === 'history') SLP.renderHistory();
                },

                init: function () {
                  this.calculate();
                  this.renderHistory();
                  this.renderChart();
                  // Restore rating from last entry if any
                  if (this.history.length > 0) { this.setRating(this.history[0].rating || 0); }
                }
              };
              window.slpCalculate = function () { SLP.calculate(); };
              window.slpSetRating = function (v) { SLP.setRating(v); };
              window.slpSaveEntry = function () { SLP.saveEntry(); };
              window.slpClearHistory = function () { SLP.clearHistory(); };
              window.slpToggleReminder = function () { SLP.toggleReminder(); };
              window.slpShowTab = function (t) { SLP.showTab(t); };

              // Hover fix for star rating
              document.addEventListener('DOMContentLoaded', function () {
                SLP.init();
                var stars = document.querySelectorAll('.slp-star');
                stars.forEach(function (star) {
                  star.addEventListener('mouseenter', function () {
                    var v = parseInt(this.getAttribute('data-v'));
                    stars.forEach(function (s) { s.style.color = parseInt(s.getAttribute('data-v')) <= v ? '#f59e0b' : '#d1d5db'; });
                  });
                  star.addEventListener('mouseleave', function () {
                    stars.forEach(function (s) { s.style.color = parseInt(s.getAttribute('data-v')) <= SLP.rating ? '#f59e0b' : '#d1d5db'; });
                  });
                });
              });
            })();

/* --- Extracted Script --- */

// Sync risk cards with AHI dashboard data
          function riskUpdate() {
            const scoreEl = document.getElementById('ahi-score-num');
            const score = parseInt(scoreEl?.textContent) || 82;
            const el = document.getElementById('risk-overall-score');
            if (el) el.textContent = score;
            const lbl = document.getElementById('risk-overall-label');
            if (lbl) {
              if (score >= 90) { lbl.textContent = 'Risiko Sangat Rendah'; lbl.style.background = '#dcfce7'; lbl.style.color = '#166534'; }
              else if (score >= 75) { lbl.textContent = 'Risiko Rendah'; lbl.style.background = '#dbeafe'; lbl.style.color = '#1d4ed8'; }
              else if (score >= 60) { lbl.textContent = 'Risiko Sedang'; lbl.style.background = '#fef9c3'; lbl.style.color = '#854d0e'; }
              else { lbl.textContent = 'Risiko Tinggi'; lbl.style.background = '#fee2e2'; lbl.style.color = '#991b1b'; }
            }
          }
          document.addEventListener('DOMContentLoaded', function () { setTimeout(riskUpdate, 1500); });

/* --- Extracted Script --- */

// ── Water Tracker ─────────────────────────────
        (function initWaterTracker() {
          const container = document.getElementById('prev-water-tracker');
          if (!container) return;
          let filled = 3;
          const total = 8;
          function render() {
            container.innerHTML = '';
            for (let i = 0; i < total; i++) {
              const div = document.createElement('div');
              div.className = 'water-glass ' + (i < filled ? 'filled' : 'empty');
              div.innerHTML = '<span class="material-symbols-outlined" style="font-size:22px;">water_drop</span>';
              div.addEventListener('click', () => {
                filled = (i < filled) ? i : i + 1;
                render();
                const statusEl = document.getElementById('prev-hydration-status');
                const countEl = document.getElementById('prev-hydration-count');
                if (countEl) countEl.textContent = filled + '/' + total + ' Gelas';
                if (statusEl) {
                  if (filled < 4) { statusEl.textContent = 'Kurang'; statusEl.style.color = '#f97316'; }
                  else if (filled < 7) { statusEl.textContent = 'Cukup'; statusEl.style.color = '#3b82f6'; }
                  else { statusEl.textContent = 'Optimal'; statusEl.style.color = '#16a34a'; }
                }
              });
              container.appendChild(div);
            }
          }
          render();
        })();
        // ── BMI Calculator ───────────────────────────
        function prevCalculateBMI() {
          const h = parseFloat(document.getElementById('prev-bmi-height').value) / 100;
          const w = parseFloat(document.getElementById('prev-bmi-weight').value);
          if (!h || !w || h <= 0 || w <= 0) return;
          const bmi = (w / (h * h)).toFixed(1);
          document.getElementById('prev-bmi-result').textContent = bmi;
          const pct = Math.max(10, Math.min(100, ((bmi - 15) / 25) * 100));
          const bar = document.getElementById('prev-bmi-bar');
          const status = document.getElementById('prev-bmi-status');
          if (bar) bar.style.width = pct + '%';
          if (status) {
            if (bmi < 18.5) { status.textContent = 'Kurus'; status.style.color = '#2563eb'; status.style.borderColor = '#bfdbfe'; bar && (bar.style.background = '#3b82f6'); }
            else if (bmi < 25) { status.textContent = 'Normal'; status.style.color = '#16a34a'; status.style.borderColor = '#bbf7d0'; bar && (bar.style.background = '#22c55e'); }
            else if (bmi < 30) { status.textContent = 'Overweight'; status.style.color = '#d97706'; status.style.borderColor = '#fde68a'; bar && (bar.style.background = '#f59e0b'); }
            else { status.textContent = 'Obesitas'; status.style.color = '#dc2626'; status.style.borderColor = '#fecaca'; bar && (bar.style.background = '#ef4444'); }
          }
        }
        // ── Activity Prediction ──────────────────────
        function prevCalculatePrediction() {
          const dur = parseInt(document.getElementById('prev-activity-duration').value);
          const cal = Math.round(dur * 8 + 50);
          const score = Math.min(100, Math.round(dur / 1.5));
          document.getElementById('prev-pred-calories').textContent = cal;
          document.getElementById('prev-pred-score').textContent = score;
          const daily = -(cal / 7700).toFixed(3);
          document.getElementById('prev-proj-daily').textContent = daily.toFixed(2) + 'kg';
          document.getElementById('prev-proj-weekly').textContent = (daily * 7).toFixed(2) + 'kg';
          document.getElementById('prev-proj-monthly').textContent = (daily * 30).toFixed(1) + 'kg';
          const fbPct = Math.min(100, Math.round(score * 0.85));
          document.getElementById('prev-fat-burn-pct').textContent = fbPct + '%';
          const bar = document.getElementById('prev-fat-burn-bar');
          if (bar) bar.style.width = fbPct + '%';
        }
        // ── Nutrition Analyzer — inline result, no redirect to chat ─
        function prevAnalyzeNutrition() {
          const breakfast = document.getElementById('prev-input-breakfast').value.trim();
          const lunch = document.getElementById('prev-input-lunch').value.trim();
          const dinner = document.getElementById('prev-input-dinner').value.trim();
          const snack = document.getElementById('prev-input-snack').value.trim();
          if (!breakfast && !lunch && !dinner && !snack) {
            alert('Silakan isi minimal satu menu makanan terlebih dahulu.');
            return;
          }

          // ── Food keyword → nutrient score heuristics ──────────────
          const foods = [breakfast, lunch, dinner, snack].join(' ').toLowerCase();
          function hasAny(arr) { return arr.some(k => foods.includes(k)); }

          // Protein score
          let prot = 50;
          if (hasAny(['ayam', 'ikan', 'telur', 'tahu', 'tempe', 'daging', 'salmon', 'tuna', 'udang', 'sapi', 'kambing'])) prot += 30;
          if (hasAny(['kacang', 'edamame', 'susu', 'keju', 'yogurt', 'protein'])) prot += 15;
          if (hasAny(['roti putih', 'nasi putih', 'mie instan', 'goreng', 'junk'])) prot -= 10;
          prot = Math.min(99, Math.max(20, prot));

          // Carbs score
          let carb = 45;
          if (hasAny(['nasi merah', 'oat', 'oatmeal', 'kentang', 'ubi', 'quinoa', 'gandum'])) carb += 35;
          if (hasAny(['nasi putih', 'roti', 'mie', 'pasta', 'singkong'])) carb += 20;
          if (hasAny(['sayur', 'salad', 'buah', 'rendah karbohidrat', 'diet'])) carb -= 10;
          carb = Math.min(99, Math.max(20, carb));

          // Fiber score
          let fiber = 40;
          if (hasAny(['sayur', 'bayam', 'brokoli', 'wortel', 'kangkung', 'sawi', 'salad', 'selada'])) fiber += 35;
          if (hasAny(['buah', 'apel', 'pisang', 'pepaya', 'jeruk', 'mangga', 'semangka', 'melon'])) fiber += 25;
          if (hasAny(['oat', 'oatmeal', 'gandum', 'kacang', 'tempe', 'tahu'])) fiber += 15;
          if (hasAny(['nasi putih', 'mie instan', 'roti putih', 'goreng'])) fiber -= 10;
          fiber = Math.min(99, Math.max(15, fiber));

          // Vitamin score
          let vit = 50;
          if (hasAny(['sayur', 'buah', 'bayam', 'brokoli', 'wortel', 'tomat', 'pepaya', 'mangga', 'jeruk', 'alpukat'])) vit += 35;
          if (hasAny(['susu', 'telur', 'ikan', 'salmon'])) vit += 15;
          if (hasAny(['goreng', 'mie instan', 'junk', 'fastfood', 'burger'])) vit -= 15;
          vit = Math.min(99, Math.max(15, vit));

          // AI composite score
          const aiScore = Math.round(prot * 0.3 + carb * 0.2 + fiber * 0.3 + vit * 0.2);

          // ── Update nutri-ring circles ─────────────────────────────
          const ringProt = document.getElementById('nutri-ring-protein');
          const ringCarb = document.getElementById('nutri-ring-carbs');
          const ringFiber = document.getElementById('nutri-ring-fiber');
          const ringVit = document.getElementById('nutri-ring-vitamin');
          const scoreNum = document.getElementById('nutri-ai-score-num');
          const scoreBox = document.getElementById('nutri-ai-score-box');

          function animateRing(el, val) {
            if (!el) return;
            el.style.transform = 'scale(1.12)';
            setTimeout(() => {
              el.textContent = val + '%';
              el.style.transform = 'scale(1)';
            }, 220);
          }

          animateRing(ringProt, prot);
          animateRing(ringCarb, carb);
          animateRing(ringFiber, fiber);
          animateRing(ringVit, vit);

          // Color the score box based on score level
          if (scoreNum) {
            scoreNum.style.transform = 'scale(1.2)';
            setTimeout(() => {
              scoreNum.textContent = aiScore;
              scoreNum.style.transform = 'scale(1)';
            }, 220);
          }
          if (scoreBox) {
            const bg = aiScore >= 80 ? '#16a34a' : aiScore >= 65 ? '#0052cc' : aiScore >= 50 ? '#d97706' : '#dc2626';
            scoreBox.style.background = bg;
          }

          // ── Build insight text ────────────────────────────────────
          const insights = [];
          if (prot >= 75) insights.push('✅ Protein sangat baik (' + prot + '%) — asupan protein tercukupi.');
          else insights.push('⚠️ Protein perlu ditingkatkan (' + prot + '%) — tambahkan ikan, ayam, tahu, atau tempe.');
          if (carb >= 60) insights.push('✅ Karbohidrat cukup (' + carb + '%) — energi harian terjaga.');
          else insights.push('⚠️ Karbohidrat masih rendah (' + carb + '%) — coba tambahkan nasi merah atau oat.');
          if (fiber >= 65) insights.push('✅ Serat ideal (' + fiber + '%) — pencernaan sehat.');
          else insights.push('⚠️ Serat kurang (' + fiber + '%) — perbanyak sayuran hijau dan buah.');
          if (vit >= 70) insights.push('✅ Vitamin mencukupi (' + vit + '%) — imunitas terjaga.');
          else insights.push('⚠️ Vitamin perlu ditambah (' + vit + '%) — konsumsi lebih banyak buah & sayur segar.');

          const panel = document.getElementById('nutri-result-panel');
          const textEl = document.getElementById('nutri-result-text');
          const tagsEl = document.getElementById('nutri-result-tags');

          if (panel && textEl && tagsEl) {
            textEl.innerHTML = insights.join('<br>');
            const scoreColor = aiScore >= 80 ? '#16a34a' : aiScore >= 65 ? '#1d4ed8' : aiScore >= 50 ? '#b45309' : '#dc2626';
            const scoreBg = aiScore >= 80 ? '#dcfce7' : aiScore >= 65 ? '#dbeafe' : aiScore >= 50 ? '#fef9c3' : '#fee2e2';
            const scoreLabel = aiScore >= 80 ? 'Sangat Baik' : aiScore >= 65 ? 'Baik' : aiScore >= 50 ? 'Cukup' : 'Perlu Perhatian';
            tagsEl.innerHTML = `
              <span style="padding:.25rem .875rem; background:${scoreBg}; color:${scoreColor}; font-size:11px; font-weight:900; border-radius:99px;">Skor AI: ${aiScore}/100 — ${scoreLabel}</span>
              <span style="padding:.25rem .875rem; background:#f0fdf4; color:#166534; font-size:11px; font-weight:700; border-radius:99px;">Protein ${prot}%</span>
              <span style="padding:.25rem .875rem; background:#fff7ed; color:#c2410c; font-size:11px; font-weight:700; border-radius:99px;">Karbo ${carb}%</span>
              <span style="padding:.25rem .875rem; background:#f0fdf4; color:#15803d; font-size:11px; font-weight:700; border-radius:99px;">Serat ${fiber}%</span>
              <span style="padding:.25rem .875rem; background:#eff6ff; color:#1d4ed8; font-size:11px; font-weight:700; border-radius:99px;">Vitamin ${vit}%</span>
            `;
            panel.style.display = 'block';
            panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }

          // Refresh the global AHI dashboard with new nutrition values
          if (typeof ahiUpdate === 'function') setTimeout(ahiUpdate, 350);
        }

        // ══════════════════════════════════════════════════════════
        //  AI HEALTH INSIGHT DASHBOARD — Calculation Engine
        // ══════════════════════════════════════════════════════════
        function ahiGetStatus(score) {
          if (score >= 90) return { label: 'Excellent', bg: '#dcfce7', color: '#166534' };
          if (score >= 75) return { label: 'Good', bg: '#dbeafe', color: '#1d4ed8' };
          if (score >= 60) return { label: 'Fair', bg: '#fef9c3', color: '#854d0e' };
          return { label: 'Poor', bg: '#fee2e2', color: '#991b1b' };
        }
        function ahiGetIcon(score) {
          if (score >= 90) return { icon: 'check_circle', color: '#22c55e' };
          if (score >= 75) return { icon: 'thumb_up', color: '#3b82f6' };
          if (score >= 60) return { icon: 'warning', color: '#f59e0b' };
          return { icon: 'cancel', color: '#ef4444' };
        }
        function ahiScoreLabel(s) {
          if (s >= 90) return { text: 'Sangat Baik', bg: '#dcfce7', color: '#166534' };
          if (s >= 75) return { text: 'Baik', bg: '#dbeafe', color: '#1d4ed8' };
          if (s >= 60) return { text: 'Cukup', bg: '#fef9c3', color: '#854d0e' };
          return { text: 'Perlu Perhatian', bg: '#fee2e2', color: '#991b1b' };
        }
        function ahiSetBar(id, pct, color) {
          const el = document.getElementById(id);
          if (el) { el.style.width = pct + '%'; el.style.background = color; }
        }
        function ahiSet(id, val) {
          const el = document.getElementById(id);
          if (el) el.textContent = val;
        }
        function ahiSetHTML(id, val) {
          const el = document.getElementById(id);
          if (el) el.innerHTML = val;
        }
        function ahiUpdateCard(idBadge, idIcon, idDesc, score, icon, desc) {
          const st = ahiGetStatus(score);
          const ic = ahiGetIcon(score);
          const badge = document.getElementById(idBadge);
          const iconEl = document.getElementById(idIcon);
          const descEl = document.getElementById(idDesc);
          if (badge) { badge.textContent = st.label; badge.style.background = st.bg; badge.style.color = st.color; }
          if (iconEl) { iconEl.textContent = icon || ic.icon; iconEl.style.color = ic.color; }
          if (descEl) descEl.textContent = desc;
        }

        function ahiUpdate() {
          // ── 1. BMI ──────────────────────────────────
          const weightVal = parseFloat(document.getElementById('prev-bmi-weight')?.value) || 65;
          const heightCm = parseFloat(document.getElementById('prev-bmi-height')?.value) || 170;
          const heightM = heightCm / 100;
          const bmi = weightVal / (heightM * heightM);
          let bmiScore = 0;
          if (bmi >= 18.5 && bmi < 25) bmiScore = 100;
          else if (bmi >= 17 && bmi < 27.5) bmiScore = 75;
          else if (bmi >= 15 && bmi < 30) bmiScore = 50;
          else bmiScore = 25;
          let bmiDesc = bmi < 18.5 ? 'Berat badan kurang, perlu asupan lebih'
            : bmi < 25 ? 'BMI ideal — pertahankan!'
              : bmi < 30 ? 'Sedikit overweight, kurangi kalori'
                : 'BMI tinggi, konsultasikan ke dokter';

          // ── 2. Aktivitas ─────────────────────────────
          const actDur = parseFloat(document.getElementById('prev-activity-duration')?.value) || 0;
          const actCal = Math.round(actDur * 8 + 50);
          const actScore2 = Math.min(100, Math.round(actDur / 1.5));
          let actDesc = actDur === 0 ? 'Tidak ada aktivitas hari ini'
            : actDur < 20 ? 'Aktivitas ringan, tambah durasi'
              : actDur < 45 ? 'Aktivitas cukup baik'
                : 'Aktivitas sangat aktif, luar biasa!';
          ahiSet('ahi-cal-burned', actCal);
          const actBarPct = Math.min(100, actDur / 60 * 100);
          const actBarEl = document.getElementById('ahi-actbar');
          if (actBarEl) actBarEl.style.width = actBarPct + '%';

          // ── 3. Nutrisi ───────────────────────────────
          const nutriRings = document.querySelectorAll('.nutri-ring');
          let prot = 85, carb = 40, fiber = 90, vit = 75;
          if (nutriRings.length >= 4) {
            prot = parseInt(nutriRings[0]?.textContent) || 85;
            carb = parseInt(nutriRings[1]?.textContent) || 40;
            fiber = parseInt(nutriRings[2]?.textContent) || 90;
            vit = parseInt(nutriRings[3]?.textContent) || 75;
          }
          const nutScore = Math.round((prot * 0.3 + carb * 0.2 + fiber * 0.3 + vit * 0.2));
          let nutDesc = nutScore >= 80 ? 'Nutrisi seimbang, pertahankan!'
            : nutScore >= 60 ? 'Nutrisi cukup, tingkatkan serat'
              : 'Nutrisi kurang, perbaiki pola makan';

          // ── 4. Hidrasi ───────────────────────────────
          const hydText = document.getElementById('prev-hydration-count')?.textContent || '3/8 Gelas';
          const hydNum = parseInt(hydText) || 3;
          const hydScore = Math.round(Math.min(100, (hydNum / 8) * 100));
          let hydDesc = hydNum < 4 ? `Hanya ${hydNum} gelas — tambah segera!`
            : hydNum < 6 ? `${hydNum} gelas — cukup, tambah lagi`
              : `${hydNum} gelas — hidrasi terjaga`;

          // ── 5. Tidur ─────────────────────────────────
          const sleepH = parseFloat(document.getElementById('prev-sleep-hours')?.value) || 7.5;
          const sleepScore = sleepH >= 7 && sleepH <= 9 ? 100
            : (sleepH >= 6 && sleepH < 7) || (sleepH > 9 && sleepH <= 10) ? 70
              : 40;
          let sleepDesc = sleepH < 6 ? 'Kurang tidur, sangat berisiko'
            : sleepH < 7 ? 'Tidur sedikit kurang dari ideal'
              : sleepH <= 9 ? 'Durasi tidur ideal!'
                : 'Tidur terlalu lama, evaluasi';

          // ── 6. Composite Health Score ────────────────
          const healthScore = Math.round(
            bmiScore * 0.20 +
            actScore2 * 0.25 +
            nutScore * 0.25 +
            hydScore * 0.15 +
            sleepScore * 0.15
          );

          // ── Update gauge ─────────────────────────────
          const circumference = 439.8;
          const offset = circumference - (healthScore / 100) * circumference;
          const ring = document.getElementById('ahi-score-ring');
          if (ring) ring.style.strokeDashoffset = offset;
          ahiSet('ahi-score-num', healthScore);
          const lbl = ahiScoreLabel(healthScore);
          const badge = document.getElementById('ahi-score-badge');
          if (badge) { badge.textContent = lbl.text; badge.style.background = lbl.bg; badge.style.color = lbl.color; }

          // ── Update breakdown bars ─────────────────────
          ahiSetBar('ahi-bar-bmi', bmiScore, '#0052cc');
          ahiSetBar('ahi-bar-act', actScore2, '#06b6d4');
          ahiSetBar('ahi-bar-nut', nutScore, '#22c55e');
          ahiSetBar('ahi-bar-hyd', hydScore, '#f97316');
          ahiSetBar('ahi-bar-slp', sleepScore, '#8b5cf6');

          // ── Update status cards ───────────────────────
          ahiUpdateCard('ahi-badge-met', 'ahi-icon-met', 'ahi-desc-met', bmiScore, null, bmiDesc);
          ahiUpdateCard('ahi-badge-nut', 'ahi-icon-nut', 'ahi-desc-nut', nutScore, 'nutrition', nutDesc);
          ahiUpdateCard('ahi-badge-hyd', 'ahi-icon-hyd', 'ahi-desc-hyd', hydScore, 'water_drop', hydDesc);
          ahiUpdateCard('ahi-badge-slp', 'ahi-icon-slp', 'ahi-desc-slp', sleepScore, 'bedtime', sleepDesc);
          ahiUpdateCard('ahi-badge-act', 'ahi-icon-act', 'ahi-desc-act', actScore2, 'directions_run', actDesc);

          // ── Weight tracker ────────────────────────────
          const targetW = 65;
          const startW = 75; // assumed start
          ahiSet('ahi-weight-current', weightVal.toFixed(1));
          ahiSet('ahi-weight-target', targetW);
          const diff = weightVal - targetW;
          if (diff > 0) {
            const progress = Math.max(0, Math.min(100, ((startW - weightVal) / (startW - targetW)) * 100));
            ahiSet('ahi-weight-pct', Math.round(progress) + '%');
            const wbar = document.getElementById('ahi-weight-bar');
            if (wbar) wbar.style.width = Math.round(progress) + '%';
            const deficit = Math.round(diff * 7700 / 70); // kcal/day deficit to reach in 70 days
            const weeks = Math.round(diff * 7700 / 500 / 7 * 10) / 10;
            ahiSet('ahi-deficit', deficit);
            ahiSet('ahi-eta', weeks);
          } else {
            ahiSet('ahi-weight-pct', '100%');
            const wbar = document.getElementById('ahi-weight-bar');
            if (wbar) wbar.style.width = '100%';
            ahiSet('ahi-deficit', '0');
            ahiSet('ahi-eta', 'Tercapai!');
          }

          // ── AI Recommendations ────────────────────────
          const recos = [];
          if (bmiScore < 75) recos.push({ icon: 'monitor_weight', title: 'Kelola Berat Badan', desc: 'Sesuaikan asupan kalori dengan target harian Anda.' });
          if (actScore2 < 60) recos.push({ icon: 'directions_run', title: 'Tambah Aktivitas', desc: 'Targetkan minimal 30 menit olahraga setiap hari.' });
          if (nutScore < 75) recos.push({ icon: 'nutrition', title: 'Perbaiki Nutrisi', desc: 'Perbanyak protein, serat, dan vitamin dari sayuran.' });
          if (hydScore < 75) recos.push({ icon: 'water_drop', title: 'Tingkatkan Hidrasi', desc: `Minum ${8 - hydNum} gelas lagi hari ini untuk target 8 gelas.` });
          if (sleepScore < 75) recos.push({ icon: 'bedtime', title: 'Perbaiki Tidur', desc: 'Tidur 7-9 jam per malam untuk pemulihan optimal.' });
          if (recos.length < 3) recos.push({ icon: 'favorite', title: 'Jaga Konsistensi', desc: 'Pertahankan pola hidup sehat Anda setiap hari.' });
          if (recos.length < 3) recos.push({ icon: 'self_improvement', title: 'Kelola Stres', desc: 'Meditasi 10 menit sehari membantu kesehatan mental.' });

          const recoList = document.getElementById('ahi-reco-list');
          if (recoList) {
            recoList.innerHTML = recos.slice(0, 6).map(r => `
              <div class="bg-white" style="border-radius:16px; border:1px solid #e5eefc; padding:1.25rem; display:flex; flex-direction:column; gap:.625rem; transition:box-shadow .2s; cursor:default;"
                onmouseover="this.style.boxShadow='0 4px 16px rgba(0,82,204,0.12)'"
                onmouseout="this.style.boxShadow='none'">
                <div style="display:flex; align-items:center; gap:.625rem;">
                  <div style="width:32px; height:32px; background:#eff4ff; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <span class="material-symbols-outlined" style="font-size:16px; color:#0052cc; font-variation-settings:'FILL' 1;">${r.icon}</span>
                  </div>
                  <span style="font-size:12px; font-weight:800; color:#0b1c30;">${r.title}</span>
                </div>
                <p style="font-size:11px; color:#526069; line-height:1.6; margin:0;">${r.desc}</p>
              </div>`).join('');
          }
        }

        // Fungsi manual refresh AHI
        window.ahiRefreshAll = function () {
          var btnIcon = document.getElementById('ahi-refresh-icon');
          if (btnIcon) {
            btnIcon.classList.add('animate-spin');
            setTimeout(() => {
                btnIcon.classList.remove('animate-spin');
            }, 1000);
          }

          // Sinkronisasi ulang data tidur dari localStorage
          var lastSleep = localStorage.getItem('slp_last_hours');
          if (lastSleep) {
            var sliderEl = document.getElementById('prev-sleep-hours');
            if (sliderEl) sliderEl.value = parseFloat(lastSleep);
          }

          // Force update AHI
          ahiUpdate();

          // Berikan notifikasi singkat
          var badge = document.getElementById('ahi-sleep-sync-badge');
          var badgeText = document.getElementById('ahi-sleep-sync-text');
          if (badge) {
            if (badgeText) badgeText.textContent = 'Semua data tersinkron!';
            badge.style.display = 'flex';
            setTimeout(function () {
              if (badge) badge.style.display = 'none';
              if (btnIcon) btnIcon.style.animation = '';
            }, 3000);
          }
        };

        // Wire events for auto-update
        document.addEventListener('DOMContentLoaded', function () {
          // Ambil data tidur terakhir jika ada
          var lastSleep = localStorage.getItem('slp_last_hours');
          if (lastSleep) {
            var sliderEl = document.getElementById('prev-sleep-hours');
            if (sliderEl) sliderEl.value = parseFloat(lastSleep);
          }

          // Initial calc after short delay
          setTimeout(ahiUpdate, 600);

          // Watch inputs that affect the dashboard
          ['prev-bmi-weight', 'prev-bmi-height', 'prev-activity-duration'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', ahiUpdate);
          });

          // Override prevCalculateBMI to also refresh dashboard
          const origCalcBMI = window.prevCalculateBMI;
          window.prevCalculateBMI = function () {
            if (origCalcBMI) origCalcBMI();
            setTimeout(ahiUpdate, 100);
          };

          // Override prevCalculatePrediction
          const origCalcPred = window.prevCalculatePrediction;
          window.prevCalculatePrediction = function () {
            if (origCalcPred) origCalcPred();
            setTimeout(ahiUpdate, 100);
          };
        });

        // ── Animate on tab open ──────────────────────
        document.addEventListener('DOMContentLoaded', function () {
          const origGantiTab = window.gantiTab;
          if (origGantiTab) {
            window.gantiTab = function (tab) {
              if (tab !== 'chat') {
                try {
                  if (typeof stopSpeaking === 'function') stopSpeaking();
                  if (typeof ttsChatAudio !== 'undefined' && ttsChatAudio) {
                    ttsChatAudio.pause();
                  }
                  const video = document.getElementById('breathing-video');
                  if (video) video.pause();
                } catch (e) { }
              }
              origGantiTab(tab);
              if (tab === 'pencegahan') {
                document.querySelectorAll('#tab-pencegahan .prev-fade-in').forEach((el, i) => {
                  el.style.opacity = '0';
                  el.style.animationDelay = (i * 0.08) + 's';
                  el.style.animationName = 'none';
                  setTimeout(() => { el.style.animationName = 'prevFadeIn'; }, 10);
                });
                // Refresh dashboard when tab opens
                setTimeout(ahiUpdate, 400);
              }
            };
          }
        });

/* --- Extracted Script --- */

// ── ANALISIS KESEHATAN AI ───────────────────────────────────
    async function prevAnalisisKesehatanAI() {
      // Tampilkan modal dengan loading
      const modal = document.getElementById('modal-analisis-kesehatan');
      const loadingEl = document.getElementById('analisis-loading');
      const hasilEl = document.getElementById('analisis-hasil');
      const footerEl = document.getElementById('analisis-footer');
      if (!modal) return;

      modal.style.display = 'flex';
      loadingEl.style.display = 'block';
      hasilEl.style.display = 'none';
      footerEl.style.display = 'none';

      // Set loading state on button
      const btn = document.getElementById('btn-analisis-kesehatan-ai');
      const originalHTML = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px; animation:spin 1s linear infinite;">sync</span> Menganalisis...';
      }

      try {
        // Kumpulkan data dari halaman
        const bmiText = document.getElementById('prev-bmi-result')?.textContent?.trim() || 'N/A';
        const bmiWeight = document.getElementById('prev-bmi-weight')?.value || 'N/A';
        const bmiHeight = document.getElementById('prev-bmi-height')?.value || 'N/A';

        // Durasi aktivitas
        const activityDur = document.getElementById('prev-activity-duration')?.value || '0';
        const predCal = document.getElementById('prev-pred-calories')?.textContent || '0';
        const predScore = document.getElementById('prev-pred-score')?.textContent || '0';

        // Nutrisi rings (dari teks yang tampil)
        const nutriRings = document.querySelectorAll('.nutri-ring');
        let protein = '85', carb = '40', fiber = '90', vitamin = '75';
        if (nutriRings.length >= 4) {
          protein = nutriRings[0]?.textContent?.replace('%', '').trim() || '85';
          carb = nutriRings[1]?.textContent?.replace('%', '').trim() || '40';
          fiber = nutriRings[2]?.textContent?.replace('%', '').trim() || '90';
          vitamin = nutriRings[3]?.textContent?.replace('%', '').trim() || '75';
        }

        // Air minum dari water tracker
        const hydrationCount = document.getElementById('prev-hydration-count')?.textContent || '3/8 Gelas';
        const waterGlasses = hydrationCount.split('/')[0]?.trim() || '3';

        // Tidur (slider jam tidur dari halaman pencegahan)
        const sleepSlider = document.getElementById('prev-sleep-hours');
        const sleepHours = sleepSlider?.value || '7.5';

        // Health score (dari AI Score display)
        const aiScoreEl = document.querySelector('#tab-pencegahan .nutri-ring + .nutri-ring + .nutri-ring + .nutri-ring + div p:last-child');
        const healthScore = aiScoreEl?.textContent?.trim() || '82';

        // Kirim ke API
        const response = await fetch('/api/analisis-kesehatan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bmi: bmiText,
            current_weight: bmiWeight,
            target_weight: '65',
            activity: `Durasi aktivitas: ${activityDur} menit, Prediksi kalori terbakar: ${predCal} kkal, Skor aktivitas: ${predScore}`,
            calories_burned: predCal,
            protein_score: protein,
            carb_score: carb,
            fiber_score: fiber,
            vitamin_score: vitamin,
            water_glasses: waterGlasses,
            sleep_hours: sleepHours,
            health_score: healthScore,
          })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        // Tampilkan hasil (format markdown sederhana)
        const rawHtml = (typeof formatMarkdown === 'function')
          ? formatMarkdown(data.hasil)
          : data.hasil.replace(/\n/g, '<br>');

        hasilEl.innerHTML = rawHtml;
        hasilEl.style.display = 'block';
        loadingEl.style.display = 'none';
        footerEl.style.display = 'flex';

      } catch (err) {
        hasilEl.innerHTML = `<div style="text-align:center; padding:2rem; color:#dc2626;">
          <span class="material-symbols-outlined" style="font-size:48px; margin-bottom:1rem; display:block;">error</span>
          <p style="font-weight:700; margin-bottom:.5rem;">Gagal menganalisis data</p>
          <p style="font-size:13px; color:#64748b;">${err.message}</p>
        </div>`;
        hasilEl.style.display = 'block';
        loadingEl.style.display = 'none';
        footerEl.style.display = 'flex';
      } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = originalHTML; }
      }
    }

    function tutupModalAnalisisKesehatan() {
      const modal = document.getElementById('modal-analisis-kesehatan');
      if (modal) modal.style.display = 'none';
    }

    function prevAnalisisCetak() {
      const content = document.getElementById('analisis-hasil')?.innerHTML || '';
      const win = window.open('', '_blank');
      win.document.write(`<!DOCTYPE html><html><head><title>Laporan Kesehatan AI</title>
        </head>
        <body><h1 style="color:#0052cc;text-align:center;">Laporan Analisis Kesehatan AI</h1>
        <p style="text-align:center;color:#64748b;font-size:13px;">Dibuat oleh Medika AI — ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <hr style="border-color:#e5eefc;margin:1.5rem 0;">
        ${content}</body></html>`);
      win.document.close();
      win.print();
    }

    // Tutup modal saat klik di luar
    document.addEventListener('click', function (e) {
      const modal = document.getElementById('modal-analisis-kesehatan');
      if (modal && e.target === modal) tutupModalAnalisisKesehatan();
    });

/* --- Extracted Script --- */

// ============================================================
    //  MENTAL HEALTH CHECK (MHC) LOGIC
    // ============================================================
    const mhcQuestions = [
      "Apakah Anda merasa stres hari ini?",
      "Apakah Anda sulit tidur belakangan ini?",
      "Apakah Anda merasa cemas atau khawatir berlebihan?",
      "Apakah Anda kehilangan semangat dalam beraktivitas?"
    ];
    
    const mhcOptions = [
      { text: "Tidak Pernah", score: 0 },
      { text: "Jarang", score: 1 },
      { text: "Kadang", score: 2 },
      { text: "Sering", score: 3 },
      { text: "Sangat Sering", score: 4 }
    ];

    let mhcCurrentQuestion = 0;
    let mhcTotalScore = 0;

    function mhcStart() {
      mhcCurrentQuestion = 0;
      mhcTotalScore = 0;
      document.getElementById('modal-mhc').classList.remove('hidden');
      document.getElementById('modal-mhc').classList.add('flex');
      
      // Delay opacity for animation
      setTimeout(() => {
        document.getElementById('modal-mhc').classList.remove('opacity-0');
        document.getElementById('modal-mhc').firstElementChild.classList.remove('scale-95');
      }, 10);
      
      mhcRenderQuestion();
    }

    function mhcClose() {
      document.getElementById('modal-mhc').classList.add('opacity-0');
      document.getElementById('modal-mhc').firstElementChild.classList.add('scale-95');
      setTimeout(() => {
        document.getElementById('modal-mhc').classList.add('hidden');
        document.getElementById('modal-mhc').classList.remove('flex');
      }, 300);
    }

    function mhcRenderQuestion() {
      const container = document.getElementById('mhc-content');
      
      let html = `
        <div class="mb-6 flex justify-between items-center">
          <span class="text-sm font-bold text-[#0052cc] dark:text-sky-400">Pertanyaan ${mhcCurrentQuestion + 1} dari ${mhcQuestions.length}</span>
          <div class="flex gap-1">
            ${mhcQuestions.map((_, i) => `<div class="h-2 w-8 rounded-full ${i <= mhcCurrentQuestion ? 'bg-[#0052cc] dark:bg-sky-400' : 'bg-slate-200 dark:bg-slate-700'} transition-colors duration-300"></div>`).join('')}
          </div>
        </div>
        <h2 class="text-xl md:text-2xl font-bold text-slate-800 dark:text-white mb-8">${mhcQuestions[mhcCurrentQuestion]}</h2>
        <div class="flex flex-col gap-3">
      `;

      mhcOptions.forEach(opt => {
        html += `<button onclick="mhcAnswer(${opt.score})" class="mhc-option-btn">
          <span>${opt.text}</span>
          <span class="material-symbols-outlined text-slate-400 dark:text-slate-500 text-[20px]">chevron_right</span>
        </button>`;
      });

      html += `</div>`;
      container.innerHTML = html;
    }

    function mhcAnswer(score) {
      mhcTotalScore += score;
      mhcCurrentQuestion++;
      
      if (mhcCurrentQuestion < mhcQuestions.length) {
        mhcRenderQuestion();
      } else {
        mhcRenderLoading();
      }
    }

    function mhcRenderLoading() {
      const container = document.getElementById('mhc-content');
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12 text-center">
          <div class="w-16 h-16 border-4 border-[#0052cc]/20 border-t-[#0052cc] dark:border-sky-400/20 dark:border-t-sky-400 rounded-full animate-spin mb-6"></div>
          <h3 class="text-xl font-bold text-slate-800 dark:text-white mb-2">AI Sedang Menganalisis...</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400">Menghitung skor dan mempersonalisasi rekomendasi untuk Anda.</p>
        </div>
      `;
      
      setTimeout(mhcShowResult, 1500); // Fake delay for UX
    }

    function mhcShowResult() {
      // Save to localStorage
      const today = new Date().toLocaleDateString('id-ID', { weekday: 'short' });
      let history = JSON.parse(localStorage.getItem('medika_mhc_history') || '[]');
      
      // Calculate category
      let category = "";
      let colorClass = "";
      let emoji = "";
      let tips = "";
      
      if (mhcTotalScore <= 4) {
        category = "Kondisi Baik";
        colorClass = "text-emerald-500";
        emoji = "😊";
        tips = "Kesehatan mental Anda terjaga dengan baik. Pertahankan pola hidup sehat dan terus bersyukur.";
      } else if (mhcTotalScore <= 8) {
        category = "Stres Ringan";
        colorClass = "text-blue-500 dark:text-sky-400";
        emoji = "😌";
        tips = "Anda mungkin sedikit terbebani. Cobalah relaksasi ringan, perhatikan pola tidur, dan luangkan waktu untuk diri sendiri.";
      } else if (mhcTotalScore <= 12) {
        category = "Stres Sedang";
        colorClass = "text-amber-500";
        emoji = "😟";
        tips = "Stres mulai memengaruhi Anda. Cobalah tidur lebih awal, kurangi screen time, dan lakukan teknik pernapasan dalam (meditasi).";
      } else {
        category = "Kelelahan Mental";
        colorClass = "text-rose-500";
        emoji = "😫";
        tips = "Tingkat stres Anda cukup tinggi. Sangat disarankan untuk beristirahat total, mencari dukungan teman/keluarga, atau berbicara dengan konselor profesional.";
      }
      
      // Push to history
      history.push({ day: today, score: mhcTotalScore });
      if (history.length > 7) history.shift(); // Keep last 7 days
      localStorage.setItem('medika_mhc_history', JSON.stringify(history));

      const percentage = Math.round((mhcTotalScore / 16) * 100);
      
      // Build History Chart HTML
      let chartHtml = '';
      const maxScore = 16;
      history.forEach((h, idx) => {
        const hPct = (h.score / maxScore) * 100;
        const isActive = (idx === history.length - 1) ? 'active' : '';
        chartHtml += `
          <div class="mhc-bar-col">
            <div class="mhc-bar ${isActive}" style="height: ${Math.max(hPct, 5)}%"></div>
            <div style="position:relative; width:100%; height:20px;">
              <span class="mhc-bar-label">${h.day}</span>
            </div>
          </div>
        `;
      });
      
      const container = document.getElementById('mhc-content');
      container.innerHTML = `
        <div class="flex flex-col items-center mb-6">
          <div class="mhc-progress-circle mb-4" style="--p: ${percentage}%">
            <div class="mhc-progress-inner">
              <span class="text-4xl">${emoji}</span>
              <span class="text-sm font-bold text-slate-800 dark:text-white mt-1">${mhcTotalScore}/16</span>
            </div>
          </div>
          <h2 class="text-2xl font-bold ${colorClass}">${category}</h2>
        </div>
        
        <div class="bg-blue-50 dark:bg-slate-700/50 rounded-2xl p-5 mb-6 border border-blue-100 dark:border-slate-600">
          <div class="flex items-center gap-2 mb-2">
            <span class="material-symbols-outlined text-[#0052cc] dark:text-sky-400 text-[20px]">psychiatry</span>
            <span class="font-bold text-sm text-[#0b1c30] dark:text-white">Rekomendasi AI MEDIKA</span>
          </div>
          <p class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">${tips}</p>
        </div>
        
        <div class="mb-6">
          <h3 class="font-bold text-sm text-slate-800 dark:text-white mb-2">Riwayat Mental Health (7 Tes Terakhir)</h3>
          <div class="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
            <div class="mhc-bar-wrapper">
              ${chartHtml}
            </div>
          </div>
        </div>
        
        <div class="text-center mb-2">
          <p class="text-[11px] text-slate-400 dark:text-slate-500 italic">Disclaimer: Hasil ini adalah evaluasi mandiri awal berbasis AI dan bukan merupakan diagnosis medis profesional.</p>
        </div>
        
        <button onclick="mhcClose()" class="w-full py-3.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-xl font-bold text-sm transition-colors border-none cursor-pointer">
          Tutup & Kembali
        </button>
      `;
    }

    // ============================================================
    //  Kalkulator BMI (inline untuk halaman Pencegahan)
    // ============================================================
    function hitungBMI() {
      const bbEl = document.getElementById('bmi-bb');
      const tbEl = document.getElementById('bmi-tb');
      const outEl = document.getElementById('bmi-result');
      const metricBmi = document.getElementById('metric-bmi');
      const bb = parseFloat(bbEl?.value);
      const tbCm = parseFloat(tbEl?.value);
      if (!outEl) return;
      if (!bb || !tbCm || bb <= 0 || tbCm <= 0) {
        outEl.querySelector('.bmi-result-value').textContent = '—';
        outEl.querySelector('.bmi-result-desc').textContent = 'Masukkan berat & tinggi yang valid.';
        if (metricBmi) metricBmi.textContent = '—';
        return;
      }
      const tbM = tbCm / 100;
      const bmi = bb / (tbM * tbM);
      const bmiRounded = Math.round(bmi * 10) / 10;
      let kategori = '';
      if (bmiRounded < 18.5) kategori = 'Kurus';
      else if (bmiRounded < 25) kategori = 'Normal';
      else if (bmiRounded < 30) kategori = 'Overweight';
      else kategori = 'Obesitas';
      outEl.querySelector('.bmi-result-value').textContent = `${bmiRounded} (${kategori})`;
      outEl.querySelector('.bmi-result-desc').textContent = 'Gunakan ini sebagai referensi umum. Konsultasikan ke dokter bila perlu.';
      if (metricBmi) {
        metricBmi.textContent = `${bmiRounded}`;
      }
    }
    document.addEventListener('DOMContentLoaded', () => {
      // Set nilai metric BMI saat kalkulator terisi (opsional)
      const bbEl = document.getElementById('bmi-bb');
      const tbEl = document.getElementById('bmi-tb');
      const metricBmi = document.getElementById('metric-bmi');
      const outEl = document.getElementById('bmi-result');
      if (!bbEl || !tbEl || !outEl) return;
      const sync = () => {
        // hanya update metric saat input valid
        const bb = parseFloat(bbEl.value);
        const tbCm = parseFloat(tbEl.value);
        if (!metricBmi) return;
        if (!bb || !tbCm || bb <= 0 || tbCm <= 0) { metricBmi.textContent = '—'; return; }
        const tbM = tbCm / 100;
        const bmi = bb / (tbM * tbM);
        const bmiRounded = Math.round(bmi * 10) / 10;
        metricBmi.textContent = `${bmiRounded}`;
      };
      bbEl.addEventListener('input', () => { sync(); });
      tbEl.addEventListener('input', () => { sync(); });
    });
    // ============================================================
    // ============================================================
    //  DATABASE BERITA KESEHATAN DI LEVEL HTML
    // ============================================================
    let DATA_BERITA_KESEHATAN = [
      {
        id: 1,
        kategori: "Riset Medis",
        waktu: "Hari Ini",
        judul: "Perkembangan Terbaru dalam Terapi Gen untuk Penyakit Langka",
        ringkasan: "Studi klinis fase III menunjukkan hasil menjanjikan untuk pengobatan penyakit genetik sel sabit, membuka harapan kesembuhan permanen.",
        gambar: "https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=800&q=80",
        isi: `Riset medis global dikejutkan dengan hasil studi klinis Fase III terbaru yang dipublikasikan di *The New England Journal of Medicine*. Terapi berbasis pengeditan gen CRISPR-Cas9 berhasil menyembuhkan pasien dengan kelainan sel sabit bawaan secara permanen.\n\n### Bagaimana Ini Bekerja?\nTeknologi ini bekerja dengan mengedit sel punca darah pasien secara langsung di laboratorium untuk memicu produksi hemoglobin janin yang sehat, kemudian memasukkannya kembali ku tubuh pasien. Hasilnya menunjukkan tingkat keberhasilan hingga 94% tanpa komplikasi jangka panjang.\n\n### Harapan Baru Bagi Jutaan Orang\nPencapaian ini membuka pintu bagi penyembuhan berbagai kelainan genetik langka lainnya seperti Thalassemia Major, Distrofi Otot, dan penyakit Huntington. Kedokteran presisi kini bukan lagi masa depan, melainkan realitas medis masa kini.`,
        promptAI: "Halo MEDIKA AI, tolong jelaskan secara sederhana bagaimana teknologi terapi gen pengeditan sel CRISPR bekerja untuk menyembuhkan penyakit sel sabit!"
      },
      {
        id: 2,
        kategori: "Pencegahan",
        waktu: "Kemarin",
        judul: "Panduan Lengkap Menjaga Imunitas di Musim Pancaroba",
        ringkasan: "Pakar kesehatan membagikan protokol nutrisi dan gaya hidup berbasis bukti untuk meminimalkan risiko infeksi saluran pernapasan selama pergantian musim.",
        gambar: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80",
        isi: `Pergantian musim atau pancaroba sering kali diiringi dengan lonjakan kasus infeksi saluran pernapasan akut (ISPA) dan flu. Perubahan suhu yang drastis dikombinasikan dengan kelembapan udara yang tidak stabil membuat virus lebih mudah bertahan hidup dan menginfeksi inang.\n\n### Langkah-Langkah Pencegahan Utama:\n1. **Optimalkan Nutrisi Mikro**: Pastikan asupan Vitamin C (dari buah sitrus), Vitamin D3, dan Zinc tercukupi untuk mendukung kemotaksis sel imun.\n2. **Kualitas Hidrasi**: Air hangat membantu menjaga kelembapan membran mukosa saluran napas, yang bertindak sebagai penghalang fisik pertama virus.\n3. **Regulasi Ritme Sirkadian**: Tidur minimal 7-8 jam semalam krusial untuk pelepasan sitokin pelindung tubuh.\n\nDengan mematuhi protokol sederhana ini, Anda dapat meminimalkan risiko sakit hingga 60% selama puncak musim pancaroba.`,
        promptAI: "Halo MEDIKA AI, apa saja asupan makanan dan langkah-langkah proteksi alami terbaik untuk menjaga kekebalan tubuh selama musim pancaroba?"
      },
      {
        id: 3,
        kategori: "Kesehatan Mental",
        waktu: "3 Hari Lalu",
        judul: "Mengatasi Burnout di Era Digital: Panduan Detoks Mental Praktis",
        ringkasan: "Paparan layar terus-menerus dan batasan kerja yang kabur memicu gelombang stres baru. Pelajari cara mengembalikan fokus batin.",
        gambar: "https://images.unsplash.com/photo-1527689368864-3a821dbccc34?auto=format&fit=crop&w=800&q=80",
        isi: `Di era kerja jarak jauh (remote work), batasan antara kehidupan pribadi dan profesional semakin kabur. Notifikasi pesan kantor yang masuk di malam hari memicu kewaspadaan konstan, yang berujung pada kelelahan emosional atau *burnout*.\n\n### Tanda-Tanda Anda Mengalami Burnout:\n• Sinisme atau hilangnya antusiasme kerja secara mendalam.\n• Sakit kepala tegang dan gangguan pencernaan kronis tanpa penyebab medis yang jelas.\n• Perasaan tidak berdaya dan performa kerja yang mundur tajam.\n\n### Solusi Detoks Mental:\nLakukan latihan *Digital Sunset* (mematikan perangkat kerja 1 jam sebelum tidur), tetapkan batasan waktu kerja yang jelas, dan luangkan waktu minimal 10 menit sehari untuk relaksasi pernapasan (*mindful breathing*). Kesehatan mental Anda jauh lebih berharga daripada kotak masuk email yang selalu kosong.`,
        promptAI: "Halo MEDIKA AI, tolong berikan tips atau langkah konkret untuk melakukan detoks digital demi meredakan kecemasan dan stres kerja!"
      }
    ];
    // ── FUNGSI LOAD & RENDER BERITA OTOMATIS ──
    function renderBerita() {
      const container = document.getElementById("kontainer-berita-dinamis");
      if (!container) return;
      const terfilter = DATA_BERITA_KESEHATAN;
      if (terfilter.length === 0) {
        container.innerHTML = `
      <div class="text-center py-8 text-text-dim text-sm">
        📭 Tidak ada berita yang cocok dengan filter atau kata kunci pencarian Anda.
      </div>`;
        return;
      }
      container.innerHTML = terfilter
        .map(
          (b) => `
    <div onclick="bukaModalBerita(${b.id})" class="group flex flex-col sm:flex-row gap-6 p-4 rounded-xl hover:bg-slate-50 transition-all duration-300 cursor-pointer border border-outline-variant/35 bg-white clinical-shadow">
      <div class="w-full sm:w-48 h-32 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-outline-variant/20 shadow-inner">
        <img alt="${b.judul}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${b.gambar}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80';">
      </div>
      <div class="flex flex-col justify-center">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-text-muted text-xs">${b.waktu}</span>
        </div>
        <h3 class="text-base font-semibold text-on-surface mb-2 group-hover:text-primary transition-colors line-clamp-1">${b.judul}</h3>
        <p class="text-xs text-text-muted line-clamp-2">${b.ringkasan}</p>
        <span class="text-[11px] text-primary font-bold mt-2 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
          Baca Selengkapnya <span class="material-symbols-outlined text-[12px]">arrow_forward</span>
        </span>
      </div>
    </div>
    <div class="h-px bg-outline-variant/10 w-full"></div>`
        )
        .join("");
    }

    async function muatBeritaHarian() {
      try {
        const container = document.getElementById("kontainer-berita-dinamis");
        if (container) {
          container.innerHTML = `<div class="text-center py-8 text-text-dim text-sm"><span class="material-symbols-outlined animate-spin text-primary inline-block">sync</span> Memuat berita terbaru...</div>`;
        }

        // Menggunakan RSS2JSON untuk mengkonversi RSS Google News (Topik: Kesehatan) ke JSON
        const response = await fetch("https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fnews.google.com%2Frss%2Fsearch%3Fq%3Dkesehatan%26hl%3Did%26gl%3DID%26ceid%3DID%3Aid");
        const data = await response.json();

        if (data.status === "ok" && data.items && data.items.length > 0) {
          DATA_BERITA_KESEHATAN = data.items.slice(0, 5).map((item, index) => {
            // Bersihkan tag HTML dari description untuk ringkasan
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = item.description;
            const ringkasan = tempDiv.textContent || tempDiv.innerText || "";

            // Format tanggal publikasi
            const date = new Date(item.pubDate);
            const waktu = date.toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' });

            // Daftar gambar cadangan (distinct) agar berita tidak terlihat seperti copy-paste
            const backupImages = [
              "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80",
              "https://images.unsplash.com/photo-1532938911079-1b06ac7ce122?auto=format&fit=crop&w=800&q=80",
              "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80",
              "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80",
              "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80",
              "https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?auto=format&fit=crop&w=800&q=80",
              "https://images.unsplash.com/photo-1551076805-e1869043e560?auto=format&fit=crop&w=800&q=80",
              "https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?auto=format&fit=crop&w=800&q=80",
              "https://images.unsplash.com/photo-1583324113626-70df0f4deaab?auto=format&fit=crop&w=800&q=80",
              "https://images.unsplash.com/photo-1576092762791-dd9e2220c951?auto=format&fit=crop&w=800&q=80",
              "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80",
              "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80",
              "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=800&q=80",
              "https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&w=800&q=80",
              "https://images.unsplash.com/photo-1578496479531-32e296d5c6e1?auto=format&fit=crop&w=800&q=80",
              "https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=800&q=80",
              "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=800&q=80",
              "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=800&q=80",
              "https://images.unsplash.com/photo-1581056771107-24ca5f033842?auto=format&fit=crop&w=800&q=80",
              "https://images.unsplash.com/photo-1638202993928-7267aad84c31?auto=format&fit=crop&w=800&q=80"
            ];

            // Ambil gambar (berikan default yang berbeda untuk setiap indeks jika thumbnail tidak ada)
            let gambar = backupImages[index % backupImages.length];

            return {
              id: index + 1,
              waktu: waktu,
              judul: item.title,
              ringkasan: ringkasan.substring(0, 140) + "...",
              gambar: gambar,
              isi: (item.content || ringkasan) + `<br><br><a href="${item.link}" target="_blank" style="color: #0052cc; font-weight: bold;">Baca selengkapnya di Google News ➔</a>`,
              promptAI: "Halo MEDIKA AI, apa pendapatmu tentang berita kesehatan ini: " + item.title
            };
          });
        }
      } catch (error) {
        console.error("Gagal memuat berita harian (menggunakan data cadangan):", error);
      } finally {
        renderBerita();
      }
    }
    function saringBerita() {
      renderBerita();
    }
    function bukaModalBerita(id) {
      const b = DATA_BERITA_KESEHATAN.find((item) => item.id === id);
      if (!b) return;
      const modal = document.getElementById("modal-berita");
      const konten = document.getElementById("modal-berita-konten");
      if (!modal || !konten) return;
      konten.innerHTML = `
    <div class="flex flex-col gap-4 text-slate-800">
      <div class="flex items-center gap-2">
        <span class="bg-primary/10 text-primary px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">${b.kategori}</span>
        <span class="text-slate-500 text-xs">${b.waktu} · Publikasi Medika AI</span>
      </div>
      <h2 class="text-xl md:text-2xl font-bold text-slate-950 tracking-tight leading-tight">${b.judul}</h2>
      
      <div class="w-full h-48 md:h-64 rounded-xl overflow-hidden border border-slate-200">
        <img src="${b.gambar}" class="w-full h-full object-cover" alt="${b.judul}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80';">
      </div>
      <div class="text-sm text-slate-600 leading-relaxed space-y-4">
        ${formatMarkdown(b.isi)}
      </div>
      <div class="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
        <button onclick="tanyaAITentangBerita('${escQuotes(b.promptAI)}')" class="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-blue-bright border-none cursor-pointer">
          <span class="material-symbols-outlined text-[18px]">smart_toy</span>
          Tanyakan MEDIKA AI
        </button>
        <button onclick="tutupModalBerita()" class="btn-secondary w-full sm:w-auto flex items-center justify-center border border-slate-300 cursor-pointer">
          Tutup Artikel
        </button>
      </div>
    </div>`;
      modal.classList.remove("hidden");
      modal.classList.add("flex");
      document.body.style.overflow = "hidden";
    }
    function tutupModalBerita() {
      const modal = document.getElementById("modal-berita");
      if (modal) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
        document.body.style.overflow = "";
      }
    }
    // ── INTEGRASI LINKING ARTIKEL KEMBALI KE ASISTEN CHAT AI ──
    function tanyaAITentangBerita(prompt) {
      tutupModalBerita();
      gantiTab("chat");

      const inputEl = document.getElementById("input-chat");
      if (inputEl) {
        inputEl.value = prompt;
        setTimeout(() => {
          kirimChat();
        }, 500);
      }
    }
    function escQuotes(str) {
      return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
    }
    // ── MOOD TRACKER & BREATHING TECHNIQUES ──
    function catatMood(mood) {
      const inputWellness = document.getElementById("input-wellness");
      if (inputWellness) {
        inputWellness.value = `Saya merasa "${mood}" hari ini. Berikan dukungan psikologis singkat, analisis suasana hati, dan 3 tips praktis meditasi.`;
        cariWellnessKustom();
      }
    }
    function focusInputChat(prompt) {
      const inputEl = document.getElementById("input-chat");
      if (inputEl) {
        inputEl.value = prompt;
      }
    }
    let runningBreathSession = null;
    function bukaSesiNafas() {
      const modal = document.getElementById("modal-breath");
      if (!modal) return;
      modal.classList.remove("hidden");
      modal.classList.add("flex");
      document.body.style.overflow = "hidden";
      mulaiMeditasiBreathing();
    }
    function tutupSesiNafas() {
      const modal = document.getElementById("modal-breath");
      if (modal) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
        document.body.style.overflow = "";
      }
      if (runningBreathSession) {
        clearTimeout(runningBreathSession);
        runningBreathSession = null;
      }
    }
    function mulaiMeditasiBreathing() {
      const txt = document.getElementById("breath-text");
      const count = document.getElementById("breath-count");
      const cycleDisplay = document.getElementById("breath-cycle-count");
      const circ = document.getElementById("breath-indicator");
      let cycle = 1;

      function runCycle() {
        if (cycle > 4) {
          txt.textContent = "Sesi Selesai!";
          count.textContent = "✓";
          circ.className = "breath-circle exhale flex items-center justify-center";
          cycleDisplay.textContent = "Luar Biasa, Anda telah rileks!";
          return;
        }
        cycleDisplay.textContent = `Siklus: ${cycle} / 4`;

        // 1. INHALE (4 Seconds)
        txt.textContent = "Tarik Napas perlahan...";
        circ.className = "breath-circle inhale flex items-center justify-center";
        let timer = 4;

        function countInhale() {
          if (timer > 0) {
            count.textContent = timer;
            timer--;
            runningBreathSession = setTimeout(countInhale, 1000);
          } else {
            // 2. HOLD (7 Seconds)
            txt.textContent = "Tahan Napas Anda...";
            circ.className = "breath-circle hold flex items-center justify-center";
            timer = 7;
            countHold();
          }
        }
        function countHold() {
          if (timer > 0) {
            count.textContent = timer;
            timer--;
            runningBreathSession = setTimeout(countHold, 1000);
          } else {
            // 3. EXHALE (8 Seconds)
            txt.textContent = "Hembuskan lewat mulut...";
            circ.className = "breath-circle exhale flex items-center justify-center";
            timer = 8;
            countExhale();
          }
        }
        function countExhale() {
          if (timer > 0) {
            count.textContent = timer;
            timer--;
            runningBreathSession = setTimeout(countExhale, 1000);
          } else {
            cycle++;
            runCycle();
          }
        }
        countInhale();
      }
      runCycle();
    }
    // ── VIDEO HERO AUTOPLAY ──
    document.addEventListener('DOMContentLoaded', function () {
      muatBeritaHarian();
      const vid = document.getElementById('hero-video');
      if (!vid) return;

      vid.style.display = 'block';
      vid.style.width = '100%';
      vid.style.height = '100%';
      vid.style.objectFit = 'cover';
      vid.muted = true;

      const tryPlay = () => {
        vid.play().catch(function (e) {
          console.warn('Video autoplay tertunda:', e.message);
        });
      };

      tryPlay();

      document.addEventListener('click', tryPlay, { once: true });
      document.addEventListener('touchstart', tryPlay, { once: true });

      vid.addEventListener('error', function () {
        console.warn('Video gagal dimuat, menampilkan fallback gradient');
      });
    });
    // ── FITUR PETA INTERAKTIF LEAFLET + OVERPASS API ──────────
    function loadLeaflet(cb) {
      if (window.L) { cb(); return; }
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(css);
      const js = document.createElement('script');
      js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      js.onload = cb;
      document.head.appendChild(js);
    }

    function haversineKm(lat1, lng1, lat2, lng2) {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function getFacilityInfo(tags) {
      if (tags.amenity === 'hospital') return { tipe: 'Rumah Sakit', icon: '\u{1F3E5}', badgeColor: '#dcfce7', badgeText: '#166534' };
      if (tags.amenity === 'clinic') return { tipe: 'Klinik', icon: '\u{1F3E8}', badgeColor: '#dbeafe', badgeText: '#1d4ed8' };
      if (tags.amenity === 'doctors') return { tipe: 'Dokter / Puskesmas', icon: '\u{1F3EA}', badgeColor: '#fef9c3', badgeText: '#854d0e' };
      if (tags.amenity === 'health_post') return { tipe: 'Posyandu / Puskesmas', icon: '\u{1F3EA}', badgeColor: '#fef9c3', badgeText: '#854d0e' };
      if (tags.amenity === 'pharmacy') return { tipe: 'Apotek', icon: '\u{1F48A}', badgeColor: '#ede9fe', badgeText: '#6d28d9' };
      return { tipe: 'Fasilitas Kesehatan', icon: '\u2695\uFE0F', badgeColor: '#f0fdf4', badgeText: '#15803d' };
    }

    let scLeafletMap = null;

    function cariRumahSakitTerdekat() {
      const btn = document.getElementById('btn-cari-rs');
      const btnLabel = document.getElementById('btn-cari-rs-label');
      const status = document.getElementById('peta-status');
      const placeholder = document.getElementById('peta-placeholder');
      const subtitle = document.getElementById('sc-facility-subtitle');

      if (!navigator.geolocation) {
        status.innerHTML = '\u274C Browser Anda tidak mendukung geolokasi';
        status.style.cssText = 'background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;padding:.625rem 1rem;border-radius:10px;font-size:12px;font-weight:700;margin:.75rem 0;';
        return;
      }

      btn.disabled = true;
      if (btnLabel) btnLabel.textContent = '\u23F3 Mendapatkan GPS...';
      status.innerHTML = '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#0052cc;animation:sc-pulse 1s infinite;margin-right:.5rem;vertical-align:middle;"></span> Mendapatkan koordinat GPS Anda...';
      status.style.cssText = 'background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;padding:.625rem 1rem;border-radius:10px;font-size:12px;font-weight:700;margin:.75rem 0;';

      navigator.geolocation.getCurrentPosition(
        function (pos) {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          status.innerHTML = '<span style="color:#16a34a;">&#9679;</span> Lokasi ditemukan! Mencari fasilitas kesehatan di sekitar Anda...';
          if (subtitle) subtitle.textContent = 'Berdasarkan lokasi GPS Anda \u2014 OpenStreetMap';

          loadLeaflet(function () {
            if (placeholder) placeholder.style.display = 'none';
            const mapEl = document.getElementById('leaflet-map');
            if (mapEl) mapEl.style.display = 'block';

            if (scLeafletMap) { scLeafletMap.remove(); scLeafletMap = null; }
            scLeafletMap = L.map('leaflet-map', { zoomControl: true }).setView([lat, lng], 14);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '\u00A9 <a href="https://openstreetmap.org">OpenStreetMap</a>',
              maxZoom: 19
            }).addTo(scLeafletMap);

            const userIcon = L.divIcon({
              html: '<div style="width:18px;height:18px;border-radius:50%;background:#0052cc;border:3px solid #fff;box-shadow:0 0 0 4px rgba(0,82,204,0.3),0 2px 8px rgba(0,0,0,0.3);"></div>',
              iconSize: [18, 18], iconAnchor: [9, 9], className: ''
            });
            L.marker([lat, lng], { icon: userIcon })
              .addTo(scLeafletMap)
              .bindPopup('<b>\u{1F4CD} Lokasi Anda</b><br>' + lat.toFixed(5) + ', ' + lng.toFixed(5))
              .openPopup();

            L.circle([lat, lng], {
              radius: 3000, color: '#0052cc', fillColor: '#0052cc',
              fillOpacity: 0.05, weight: 1.5, dashArray: '6,4'
            }).addTo(scLeafletMap);

            const radius = 5000;
            const q = `[out:json][timeout:25];(node["amenity"~"^(hospital|clinic|health_post|doctors|pharmacy)$"](around:${radius},${lat},${lng});way["amenity"~"^(hospital|clinic|health_post|doctors|pharmacy)$"](around:${radius},${lat},${lng}););out center tags;`;

            fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: q, headers: { 'Content-Type': 'text/plain' } })
              .then(r => r.json())
              .then(data => {
                let facilities = (data.elements || []).map(el => {
                  const elLat = el.lat || (el.center && el.center.lat);
                  const elLng = el.lon || (el.center && el.center.lon);
                  if (!elLat || !elLng) return null;
                  const tags = el.tags || {};
                  const nama = tags.name || tags['name:id'] || tags['name:en'] || 'Fasilitas Kesehatan';
                  const dist = haversineKm(lat, lng, elLat, elLng);
                  return { nama, lat: elLat, lng: elLng, dist, tags, info: getFacilityInfo(tags) };
                }).filter(Boolean);

                facilities.sort((a, b) => a.dist - b.dist);
                facilities = facilities.slice(0, 9);

                if (facilities.length === 0) {
                  status.innerHTML = '\u26A0\uFE0F Tidak ditemukan fasilitas dalam radius 5km.';
                  status.style.cssText = 'background:#fffbeb;color:#92400e;border:1px solid #fde68a;padding:.625rem 1rem;border-radius:10px;font-size:12px;font-weight:700;margin:.75rem 0;';
                  btn.disabled = false;
                  if (btnLabel) btnLabel.textContent = '\u{1F504} Coba Lagi';
                  return;
                }

                facilities.forEach(f => {
                  const hIcon = L.divIcon({
                    html: `<div style="width:34px;height:34px;border-radius:10px;background:#fff;border:2.5px solid #0052cc;display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 3px 10px rgba(0,0,0,0.18);cursor:pointer;">${f.info.icon}</div>`,
                    iconSize: [34, 34], iconAnchor: [17, 34], className: ''
                  });
                  const phone = f.tags['contact:phone'] || f.tags.phone || '';
                  const distStr = f.dist < 1 ? (f.dist * 1000).toFixed(0) + ' m' : f.dist.toFixed(2) + ' km';
                  const dirUrl = `https://www.google.com/maps/dir/${lat},${lng}/${f.lat},${f.lng}`;
                  const popup = `<div style="font-family:'Outfit',sans-serif;min-width:190px;padding:.25rem 0;">
                  <div style="font-weight:800;font-size:14px;color:#0b1c30;margin-bottom:.25rem;">${f.info.icon} ${f.nama}</div>
                  <div style="font-size:11px;color:#526069;font-weight:600;margin-bottom:.375rem;">${f.info.tipe}</div>
                  <div style="font-size:12px;color:#0052cc;font-weight:700;margin-bottom:.5rem;">\u{1F4CD} ${distStr} dari Anda</div>
                  ${phone ? `<div style="font-size:11px;margin-bottom:.375rem;">\u{1F4DE} <a href="tel:${phone}" style="color:#0052cc;">${phone}</a></div>` : ''}
                  <a href="${dirUrl}" target="_blank" style="display:inline-block;margin-top:.375rem;padding:.375rem .875rem;background:#0052cc;color:#fff;border-radius:8px;font-size:11px;font-weight:800;text-decoration:none;">\u{1F5FA}\uFE0F Petunjuk Arah</a>
                  </div>`;
                  L.marker([f.lat, f.lng], { icon: hIcon }).addTo(scLeafletMap).bindPopup(popup, { maxWidth: 250 });
                });

                const allPts = [[lat, lng], ...facilities.map(f => [f.lat, f.lng])];
                scLeafletMap.fitBounds(allPts, { padding: [40, 40], maxZoom: 15 });
                renderFacilityCards(facilities, lat, lng);

                status.innerHTML = `\u2705 Ditemukan <strong>${facilities.length} fasilitas</strong> dalam radius 5km`;
                status.style.cssText = 'background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;padding:.625rem 1rem;border-radius:10px;font-size:12px;font-weight:700;margin:.75rem 0;';
                btn.disabled = false;
                if (btnLabel) btnLabel.textContent = '\u{1F504} Perbarui Lokasi';
              })
              .catch(err => {
                status.innerHTML = '\u26A0\uFE0F Gagal memuat data fasilitas. Periksa koneksi dan coba lagi.';
                status.style.cssText = 'background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;padding:.625rem 1rem;border-radius:10px;font-size:12px;font-weight:700;margin:.75rem 0;';
                btn.disabled = false;
                if (btnLabel) btnLabel.textContent = '\u{1F504} Coba Lagi';
              });
          });
        },
        function (err) {
          let pesan = '\u274C Gagal mendapatkan lokasi.';
          if (err.code === 1) pesan = '\u274C Izin lokasi ditolak. Mohon izinkan di pengaturan browser.';
          else if (err.code === 2) pesan = '\u274C GPS tidak tersedia. Pastikan Location aktif.';
          else if (err.code === 3) pesan = '\u274C Waktu habis. Coba lagi.';
          status.innerHTML = pesan;
          status.style.cssText = 'background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;padding:.625rem 1rem;border-radius:10px;font-size:12px;font-weight:700;margin:.75rem 0;';
          btn.disabled = false;
          if (btnLabel) btnLabel.textContent = '\u{1F4CD} Gunakan Lokasi Saya';
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
      );
    }

    function renderFacilityCards(facilities, userLat, userLng) {
      const grid = document.getElementById('sc-facility-grid');
      if (!grid) return;
      grid.innerHTML = facilities.map((f, i) => {
        const mapsUrl = `https://www.google.com/maps/dir/${userLat},${userLng}/${f.lat},${f.lng}`;
        const phone = f.tags['contact:phone'] || f.tags.phone || '';
        const distStr = f.dist < 1 ? (f.dist * 1000).toFixed(0) + ' m' : f.dist.toFixed(2) + ' km';
        const rank = i === 0 ? '\u{1F947} Terdekat' : i === 1 ? '\u{1F948} No. 2' : i === 2 ? '\u{1F949} No. 3' : '\u{1F4CD} #' + (i + 1);
        return `<div class="sc-facility-card" onclick="window.open('${mapsUrl}','_blank')" style="cursor:pointer;position:relative;">
          <div style="position:absolute;top:.75rem;right:.75rem;font-size:1.5rem;">${f.info.icon}</div>
          <span style="display:inline-block;padding:.25rem .625rem;background:${f.info.badgeColor};color:${f.info.badgeText};font-size:10px;font-weight:900;border-radius:99px;margin-bottom:.625rem;">${rank}</span>
          <p class="sc-facility-type" style="margin:.375rem 0 .25rem;">${f.info.tipe}</p>
          <p class="sc-facility-name" style="margin:0 0 .375rem;padding-right:2.5rem;">${f.nama}</p>
          <p class="sc-facility-dist">\u{1F4CD} ${distStr} dari Anda</p>
          <div style="display:flex;gap:.5rem;margin-top:.875rem;flex-wrap:wrap;">
            <button onclick="event.stopPropagation();window.open('${mapsUrl}','_blank')" class="sc-appt-btn">\u{1F5FA}\uFE0F Arah</button>
            ${phone ? `<button onclick="event.stopPropagation();window.open('tel:${phone}')" style="padding:.5rem .75rem;background:#eff6ff;border:none;border-radius:10px;cursor:pointer;font-size:12px;font-weight:700;color:#1d4ed8;">\u{1F4DE}</button>` : ''}
          </div>
        </div>`;
      }).join('');
    }

    // ── VOICE COMPANION DR. AURA AI CONTROLLER ──
    let isSpeaking = false;
    let currentAudio = null;
    async function speakIndonesia(text) {
      // Hentikan audio yang sedang berjalan jika ada
      if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
      }
      // Membersihkan teks dari tag HTML dan karakter Markdown untuk dikirim ke API
      let cleanText = text.replace(/<[^>]*>/g, '');
      cleanText = cleanText.replace(/[\*\#\_]/g, '');
      if (!cleanText.trim()) return;
      const indicator = document.getElementById('speaking-indicator');
      const waveform = document.getElementById('waveform');
      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: cleanText }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Gagal menghasilkan audio.');
        }
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        currentAudio = audio;
        // Event saat audio mulai diputar
        audio.onplay = () => {
          if (indicator) indicator.style.display = 'flex';
          if (waveform) waveform.style.display = 'flex';
        };
        // Event saat audio selesai
        audio.onended = () => {
          if (indicator) indicator.style.display = 'none';
          if (waveform) waveform.style.display = 'none';
          URL.revokeObjectURL(audioUrl); // Bebaskan memori
          currentAudio = null;
        };
        audio.play();
      } catch (error) {
        console.error('Error pada Text-to-Speech:', error);
        // Sembunyikan indikator jika terjadi error
        if (indicator) indicator.style.display = 'none';
        if (waveform) waveform.style.display = 'none';
      }
    }
    function stopSpeaking() {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
      }
      try {
        if (typeof ttsChatAudio !== 'undefined' && ttsChatAudio) {
          ttsChatAudio.pause();
        }
        if (typeof ttsChatToken !== 'undefined') {
          ttsChatToken++; // Increment token to abort any pending fetches
        }
      } catch (e) { }
      try {
        const video = document.getElementById('breathing-video');
        if (video) video.pause();
      } catch (e) { }
      // Sembunyikan juga indikatornya
      const indicator = document.getElementById('speaking-indicator');
      const waveform = document.getElementById('waveform');
      const loadingVoice = document.getElementById('loading-voice-indicator');
      if (indicator) indicator.style.display = 'none';
      if (waveform) waveform.style.display = 'none';
      if (loadingVoice) loadingVoice.style.display = 'none';

      // Reset semua tombol baca ke kondisi awal (volume_off)
      try {
        const voiceBtns = document.querySelectorAll('[onclick="toggleVoiceState(this)"]');
        voiceBtns.forEach(btn => {
          btn.disabled = false;
          const icon = btn.querySelector('.material-symbols-outlined');
          if (icon) icon.innerText = 'volume_off';
        });
      } catch (e) { }
    }
    function toggleVoiceState(btn) {
      // Cek apakah sedang ada audio yang bisa di-pause atau di-resume
      try {
        if (typeof ttsChatAudio !== 'undefined' && ttsChatAudio) {
          if (!ttsChatAudio.paused && !ttsChatAudio.ended) {
            // Audio sedang jalan, kita pause
            ttsChatAudio.pause();
            isSpeaking = false;
            try {
              const icon = btn?.querySelector('.material-symbols-outlined');
              if (icon) icon.innerText = 'volume_off';
            } catch (e) { }
            // Matikan animasi video saat dipause
            try {
              const video = document.getElementById('breathing-video');
              if (video) video.pause();
              const characterPanel = document.getElementById('character-panel');
              if (characterPanel) characterPanel.classList.remove('is-speaking');
            } catch (e) { }
            return;
          } else if (ttsChatAudio.paused && !ttsChatAudio.ended && ttsChatAudio.currentTime > 0) {
            // Audio sedang di-pause, kita resume
            ttsChatAudio.play();
            isSpeaking = true;
            try {
              const icon = btn?.querySelector('.material-symbols-outlined');
              if (icon) icon.innerText = 'volume_up';
            } catch (e) { }
            // Nyalakan animasi video saat diresume
            try {
              const video = document.getElementById('breathing-video');
              if (video) video.play();
              const characterPanel = document.getElementById('character-panel');
              if (characterPanel) characterPanel.classList.add('is-speaking');
            } catch (e) { }
            return;
          }
        }
      } catch (e) { }

      // Jika tidak ada audio yang bisa di-pause/resume, maka buat audio baru dari teks terakhir
      try { stopSpeaking(); } catch (e) { }
      isSpeaking = false;

      try {
        const icon = btn?.querySelector('.material-symbols-outlined');
        if (icon) {
          icon.innerText = 'volume_off';
        }
      } catch (e) { }

      // Ambil teks AI terakhir dari chat
      try {
        const chat = document.getElementById('pesan-chat');
        if (!chat) return;
        const aiBubbles = chat.querySelectorAll('.pesan.ai .gelembung-ai');
        // fallback: elemen ai terakhir yang punya teks
        const lastBubble = aiBubbles.length ? aiBubbles[aiBubbles.length - 1] : null;
        const text = lastBubble ? lastBubble.innerText.trim() : '';
        // Jika ada teks, bacakan manual
        if (text) {
          isSpeaking = true;
          // ubah icon sebagai ON
          try {
            const icon = btn?.querySelector('.material-symbols-outlined');
            if (icon) icon.innerText = 'volume_up';
          } catch (e) { }
          // panggil bacakanTeksChat dari static/script.js
          if (typeof bacakanTeksChat === 'function') {
            bacakanTeksChat(text, btn).catch(() => { });
          }
        }
      } catch (e) { }
      // Matikan panel companion biar tidak terlihat “berbicaraâ€.
      const characterPanel = document.getElementById('character-panel');
      const chatPanel = document.getElementById('chat-panel');
      const glitchEffect = document.getElementById('glitch-effect');
      const speakingIndicator = document.getElementById('speaking-indicator');
      const scanEffect = document.getElementById('scan-effect');
      const waveform = document.getElementById('waveform');
      const video = document.getElementById('breathing-video');
      // Saat suara OFF panel disembunyikan
      // Saat suara ON (toggle icon jadi volume_off lalu bacakan), panel harus tetap tampil
      // Jadi: hanya sembunyikan panel ketika audio dimatikan (volume_off).
      // Karena fungsi ini dipanggil saat klik tombol, kita cek icon state.
      try {
        const iconEl = btn?.querySelector('.material-symbols-outlined');
        const iconText = iconEl ? (iconEl.innerText || '').trim() : '';
        if (characterPanel) {
          if (iconText === 'volume_off') {
            characterPanel.classList.remove('w-full', 'opacity-100', 'is-speaking');
            characterPanel.classList.add('w-0', 'opacity-0');
          } else {
            characterPanel.classList.remove('w-0', 'opacity-0');
            characterPanel.classList.add('w-full', 'opacity-100');
          }
        }
      } catch (e) {
        if (characterPanel) {
          characterPanel.classList.remove('w-0', 'opacity-0');
          characterPanel.classList.add('w-full', 'opacity-100');
        }
      }
      if (chatPanel) {
        chatPanel.classList.add('lg:max-w-[800px]');
        chatPanel.classList.remove('lg:w-[450px]', 'xl:w-[500px]');
      }
      if (glitchEffect) glitchEffect.classList.remove('animate-glitch');
      const iconEl2 = btn?.querySelector('.material-symbols-outlined');
      const iconText2 = iconEl2 ? (iconEl2.innerText || '').trim() : '';
      if (characterPanel) {
        if (iconText2 === 'volume_off') {
          characterPanel.classList.remove('is-speaking');
          if (speakingIndicator) speakingIndicator.style.display = 'none';
          if (scanEffect) scanEffect.style.display = 'none';
          if (waveform) waveform.style.display = 'none';
          if (video) video.pause();
        } else {
          // ON: aktifkan animasi pulse wave melalui class is-speaking
          characterPanel.classList.add('is-speaking');
          if (speakingIndicator) speakingIndicator.style.display = 'flex';
          if (scanEffect) scanEffect.style.display = 'block';
          if (waveform) waveform.style.display = 'flex';
        }
      }
    }
    // ── MUTATION OBSERVER UNTUK AUTOREAD PESAN BARU DARI AI ──
    // Dimatikan supaya hanya tombol manual (🔊 Bacakan) yang memicu suara.
    // (Observer sebelumnya memanggil speakIndonesia otomatis.)
    document.addEventListener('DOMContentLoaded', () => { });
    function tampilkanDaftarRS(lat, lng) {
      const rsList = document.getElementById('rs-list');
      if (!rsList) return;
      rsList.style.display = 'grid';
      rsList.className = "grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-slate-50 border-t border-slate-100";
      const daftarContoh = [
        { nama: 'RS Medika Utama', detail: 'Rumah Sakit Umum Pusat', jarak: '1.2 km', tipe: '🏥', telp: '021123456', mapQuery: 'RS+Medika+Utama' },
        { nama: 'Klinik Sehat Bersama', detail: 'Klinik Pratama Rawat Jalan', jarak: '2.5 km', tipe: '🏨', telp: '021654321', mapQuery: 'Klinik+Sehat+Bersama' },
        { nama: 'RSIA Harapan Ibu', detail: 'Rumah Sakit Ibu dan Anak', jarak: '3.8 km', tipe: '🏥', telp: '021987654', mapQuery: 'RSIA+Harapan+Ibu' },
      ];
      rsList.innerHTML = `
    <div class="col-span-full font-label-md text-xs font-bold text-text-dim uppercase tracking-wider mb-2">Fasilitas Medis Sekitar Anda</div>
    ${daftarContoh.map(rs => `
      <div class="bg-white rounded-2xl border border-outline-variant/20 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow cursor-pointer group hover:border-primary/40" onclick="window.open('https://www.google.com/maps/search/${rs.mapQuery}/@${lat},${lng},14z', '_blank')">
        <div class="flex justify-between items-start gap-2">
          <h3 class="font-bold text-base text-on-surface leading-tight">${rs.nama}</h3>
          <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">Buka 24 Jam</span>
        </div>
        <p class="text-xs text-text-muted">${rs.detail} · <strong>${rs.jarak}</strong> dari Anda</p>
        <div class="flex gap-2 mt-2">
          <button class="flex-grow inline-flex items-center justify-center py-2 text-xs font-semibold text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors gap-xs cursor-pointer">
            <span class="material-symbols-outlined text-[16px]">directions</span>
            Arahkan
          </button>
          <button class="flex-grow inline-flex items-center justify-center py-2 text-xs font-semibold text-on-surface-variant bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors gap-xs cursor-pointer" onclick="event.stopPropagation(); window.open('tel:${rs.telp}')">
            <span class="material-symbols-outlined text-[16px]">call</span>
            Telepon
          </button>
        </div>
      </div>
    `).join('')}
    <div class="col-span-full text-center text-xs text-text-muted mt-4">
📍 Posisi Anda: ${lat.toFixed(4)}, ${lng.toFixed(4)} ·
      <a href="https://www.google.com/maps/search/rumah+sakit/@${lat},${lng},14z" 
         target="_blank" class="text-primary hover:underline font-bold">Buka Lengkap di Google Maps ↗</a>
    </div>`;
    }
    // ── PATCH CSS HASIL ──
    document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style');
      style.textContent = `
    .kotak-hasil .hasil-header { color: var(--blue-accent); }
    .kotak-hasil .disclaimer-box { background:rgba(255,160,0,0.04); border:1px solid rgba(255,160,0,0.15); color:#b7791f; }
  `;
      document.head.appendChild(style);
    });

/* --- Extracted Script --- */

function toggleJadwal(checkbox) {
      const container = checkbox.closest('.flex.items-center.justify-between');
      const title = container.querySelector('h4');
      if (checkbox.checked) {
        title.classList.add('line-through', 'text-slate-400');
        title.classList.remove('text-slate-800');
      } else {
        title.classList.remove('line-through', 'text-slate-400');
        title.classList.add('text-slate-800');
      }
    }

    function showCustomToast(message) {
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl z-[9999] flex items-center gap-3 transition-all duration-300 transform translate-y-10 opacity-0';
      toast.innerHTML = `<span class="material-symbols-outlined text-emerald-400">info</span> <span class="text-sm font-medium">${message}</span>`;
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
      }, 10);
      
      setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }

    // --- LOGIKA OBAT PREMIUM MEDIKA AI ---
    const DATA_OBAT_DUMMY = [
      { id: 1, nama: "Paracetamol 500mg", kategori: "Pereda Nyeri", img: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ad?auto=format&fit=crop&w=600&q=80", fungsi: "Meredakan sakit kepala, sakit gigi, dan menurunkan demam dengan cepat.", aman: "Aman", dosis: "1-2 kaplet / 8 jam", stok: 24, exp: "12 Des 2026", efek_samping: "Mual ringan, ruam kulit jarang terjadi.", cara_minum: "Sesudah makan dengan air putih", interaksi: "Hindari alkohol", peringatan: "Tidak untuk penderita gangguan hati berat" },
      { id: 2, nama: "Amoxicillin 500mg", kategori: "Antibiotik", img: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=600&q=80", fungsi: "Antibiotik untuk mengobati berbagai infeksi bakteri pada saluran pernapasan.", aman: "Resep Dokter", dosis: "1 kapsul / 8 jam", stok: 10, exp: "05 Jan 2026", efek_samping: "Diare, mual, ruam alergi.", cara_minum: "Harus dihabiskan sesuai resep", interaksi: "Pil KB menjadi kurang efektif", peringatan: "Alergi penisilin dilarang minum" },
      { id: 3, nama: "Antasida Doen", kategori: "Pencernaan", img: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=600&q=80", fungsi: "Mengurangi gejala kelebihan asam lambung, gastritis, dan tukak lambung.", aman: "Aman", dosis: "1-2 tab / sblm makan", stok: 15, exp: "20 Agu 2027", efek_samping: "Sembelit atau diare.", cara_minum: "Dikunyah 1 jam sebelum makan", interaksi: "Mengurangi penyerapan obat lain", peringatan: "Jangan konsumsi terus menerus > 2 minggu" },
      { id: 4, nama: "Cetirizine 10mg", kategori: "Alergi", img: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=600&q=80", fungsi: "Antihistamin untuk meredakan alergi mata berair, hidung meler, dan bersin.", aman: "Bebas Terbatas", dosis: "1 tablet / hari", stok: 5, exp: "10 Feb 2026", efek_samping: "Kantuk ringan, mulut kering.", cara_minum: "Malam hari sebelum tidur", interaksi: "Obat penenang meningkatkan kantuk", peringatan: "Hati-hati jika mengemudi" },
      { id: 5, nama: "Vitamin C 1000mg", kategori: "Vitamin", img: "https://images.unsplash.com/photo-1577401239170-897942555fb3?auto=format&fit=crop&w=600&q=80", fungsi: "Suplemen antioksidan untuk menjaga daya tahan tubuh secara optimal.", aman: "Aman", dosis: "1 tablet effervescent", stok: 30, exp: "15 Nov 2027", efek_samping: "Gangguan lambung jika dosis berlebih.", cara_minum: "Dilarutkan dalam air, sesudah makan", interaksi: "Besi diserap lebih baik", peringatan: "Penderita maag akut harap hati-hati" },
      { id: 6, nama: "OBH Combi Plus", kategori: "Obat Batuk", img: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ad?auto=format&fit=crop&w=600&q=80", fungsi: "Meredakan batuk berdahak disertai flu dan hidung tersumbat.", aman: "Bebas Terbatas", dosis: "1 sdm / 8 jam", stok: 2, exp: "01 Sep 2025", efek_samping: "Jantung berdebar ringan, kantuk.", cara_minum: "Kocok dahulu, sesudah makan", interaksi: "Kafein", peringatan: "Stok hampir habis!" },
      { id: 7, nama: "Ibuprofen 400mg", kategori: "Pereda Nyeri", img: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=600&q=80", fungsi: "Obat antiinflamasi nonsteroid untuk nyeri haid, sendi, dan gigi.", aman: "Bebas Terbatas", dosis: "1 tab / 8 jam (bila perlu)", stok: 18, exp: "10 Mar 2027", efek_samping: "Iritasi lambung, mual.", cara_minum: "Wajib sesudah makan", interaksi: "Obat darah tinggi", peringatan: "Jangan gunakan saat perut kosong" },
      { id: 8, nama: "Promag Tablet", kategori: "Pencernaan", img: "https://images.unsplash.com/photo-1550572017-edd951b55104?auto=format&fit=crop&w=600&q=80", fungsi: "Mengatasi sakit maag, nyeri lambung, dan kembung dengan cepat.", aman: "Aman", dosis: "1-2 tab dikunyah", stok: 20, exp: "30 Apr 2026", efek_samping: "Perubahan pola BAB.", cara_minum: "Dikunyah segera saat keluhan muncul", interaksi: "-", peringatan: "Tunggu 2 jam jika minum obat lain" },
      { id: 9, nama: "Rhinos SR", kategori: "Obat Batuk", img: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=600&q=80", fungsi: "Meredakan hidung tersumbat dan rhinitis alergi parah.", aman: "Resep Dokter", dosis: "1 kapsul / 12 jam", stok: 12, exp: "15 Mei 2026", efek_samping: "Insomnia, jantung berdebar.", cara_minum: "Ditelan utuh, jangan dikunyah", interaksi: "Obat MAOI dilarang", peringatan: "Hanya untuk dewasa" },
      { id: 10, nama: "Enervon-C", kategori: "Vitamin", img: "https://images.unsplash.com/photo-1577401239170-897942555fb3?auto=format&fit=crop&w=600&q=80", fungsi: "Membantu menjaga daya tahan tubuh dengan kombinasi Vitamin C dan B Kompleks.", aman: "Aman", dosis: "1 tablet / hari", stok: 45, exp: "01 Jan 2028", efek_samping: "Urine kuning cerah (normal).", cara_minum: "Pagi hari sesudah sarapan", interaksi: "-", peringatan: "Aman dikonsumsi harian" }
    ];

    function renderMedicineCards(data) {
      const container = document.getElementById('obat-card-container');
      if (!container) return;
      container.innerHTML = '';
      if (data.length === 0) {
        container.innerHTML = `<div class="col-span-full py-10 text-center text-slate-500">Pencarian tidak menemukan obat.</div>`;
        return;
      }
      data.forEach(obat => {
        let badgeConfig = obat.aman === 'Aman' 
          ? { bg: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-100', icon: 'verified_user' }
          : (obat.aman === 'Bebas Terbatas' ? { bg: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-100', icon: 'warning' }
          : { bg: 'bg-rose-500', text: 'text-rose-600', border: 'border-rose-100', icon: 'emergency' });
        
        let cardHTML = `
          <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_10px_30px_rgba(0,82,204,0.08)] hover:-translate-y-1 transition-all duration-300 overflow-hidden group flex flex-col relative">
            <div class="absolute top-3 right-3 z-20 w-8 h-8 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-white transition-colors cursor-pointer shadow-sm">
              <span class="material-symbols-outlined text-[18px]">favorite_border</span>
            </div>
            <div class="h-40 relative overflow-hidden bg-slate-100 dark:bg-slate-700 rounded-t-3xl p-2">
              <img src="${obat.img}" alt="${obat.nama}" class="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-transform duration-500">
              <div class="absolute top-4 left-4 bg-white/95 backdrop-blur ${badgeConfig.text} font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full shadow-sm border ${badgeConfig.border} flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[12px]">${badgeConfig.icon}</span> ${obat.aman}
              </div>
            </div>
            <div class="p-5 md:p-6 flex flex-col flex-grow">
              <div class="flex justify-between items-start mb-2">
                <h3 class="font-bold text-lg md:text-xl text-slate-800 dark:text-white">${obat.nama}</h3>
              </div>
              <p class="text-slate-500 text-sm mb-4 line-clamp-2 leading-relaxed h-10">${obat.fungsi}</p>
              <div class="flex items-center gap-4 mb-4 text-[11px] font-semibold">
                <span class="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">Stok: ${obat.stok}</span>
                <span class="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">Exp: ${obat.exp}</span>
              </div>
              <div class="mt-auto pt-4 border-t border-slate-100/80 dark:border-slate-700 flex justify-between items-center gap-2">
                <button onclick="bukaModalDetailObat(${obat.id})" class="flex-1 py-2 rounded-xl border-2 border-primary/20 text-primary font-bold text-sm hover:bg-primary/5 transition-colors">Detail</button>
                <button onclick="jadwalkanObat(${obat.id})" class="flex-1 py-2 rounded-xl bg-primary text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm shadow-primary/30">Jadwalkan</button>
              </div>
            </div>
          </div>
        `;
        container.innerHTML += cardHTML;
      });
    }

    function pencarianObatLokal() {
      const q = document.getElementById('input-obat').value.toLowerCase();
      if (!q) { renderMedicineCards(DATA_OBAT_DUMMY); return; }
      const filtered = DATA_OBAT_DUMMY.filter(o => o.nama.toLowerCase().includes(q) || o.fungsi.toLowerCase().includes(q) || o.kategori.toLowerCase().includes(q));
      renderMedicineCards(filtered);
    }

    function isiNamaObat(kategoriName) {
      document.getElementById('input-obat').value = kategoriName;
      pencarianObatLokal();
    }

    function bukaModalDetailObat(id) {
      const obat = DATA_OBAT_DUMMY.find(o => o.id === id);
      if (!obat) return;
      
      let badgeColor = obat.aman === 'Aman' ? 'text-emerald-500' : (obat.aman === 'Bebas Terbatas' ? 'text-amber-500' : 'text-rose-500');
      
      const html = `
        <div class="flex items-center gap-4 border-b border-slate-100 dark:border-slate-700 pb-4 mb-5">
          <div class="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center ${badgeColor}">
            <span class="material-symbols-outlined text-[28px]">vaccines</span>
          </div>
          <div>
            <h2 class="text-2xl font-bold text-slate-800 dark:text-white">${obat.nama}</h2>
            <p class="text-sm font-semibold ${badgeColor}">${obat.aman}</p>
          </div>
        </div>
        <div class="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <div><h4 class="font-bold text-slate-800 dark:text-slate-200 mb-1">Fungsi Utama:</h4><p>${obat.fungsi}</p></div>
          <div class="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-700/50 p-4 rounded-2xl">
            <div><h4 class="font-bold text-slate-800 dark:text-slate-200 mb-1">Dosis Penggunaan:</h4><p>${obat.dosis}</p></div>
            <div><h4 class="font-bold text-slate-800 dark:text-slate-200 mb-1">Cara Minum:</h4><p>${obat.cara_minum}</p></div>
          </div>
          <div><h4 class="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1"><span class="material-symbols-outlined text-[16px] text-amber-500">warning</span> Efek Samping:</h4><p>${obat.efek_samping}</p></div>
          <div class="grid grid-cols-2 gap-4">
            <div><h4 class="font-bold text-slate-800 dark:text-slate-200 mb-1">Interaksi:</h4><p>${obat.interaksi}</p></div>
            <div><h4 class="font-bold text-slate-800 dark:text-slate-200 mb-1">Peringatan:</h4><p class="text-rose-500 font-medium">${obat.peringatan}</p></div>
          </div>
        </div>
        <div class="mt-8">
          <button onclick="jadwalkanObat(${obat.id}); tutupModalDetailObat();" class="w-full py-3.5 rounded-2xl bg-primary text-white font-bold hover:bg-blue-700 transition-all shadow-lg shadow-primary/30">Tambah ke Jadwal Minum</button>
        </div>
      `;
      document.getElementById('modalDetailObatContent').innerHTML = html;
      
      const modal = document.getElementById('modalDetailObat');
      modal.classList.remove('hidden');
      setTimeout(() => modal.classList.remove('opacity-0'), 10);
    }

    function tutupModalDetailObat() {
      const modal = document.getElementById('modalDetailObat');
      modal.classList.add('opacity-0');
      setTimeout(() => modal.classList.add('hidden'), 300);
    }

    function jadwalkanObat(id) {
      const obat = DATA_OBAT_DUMMY.find(o => o.id === id);
      showCustomToast(`✔️ ${obat.nama} telah ditambahkan ke Jadwal Minum Anda!`);
    }

    function tutupModalScan() {
      const modal = document.getElementById('modalScanObat');
      modal.classList.add('opacity-0');
      document.getElementById('loadingScanObat').classList.add('hidden');
      document.getElementById('dropzoneObat').classList.remove('hidden');
      setTimeout(() => modal.classList.add('hidden'), 300);
    }

    function prosesScanObat(input) {
      if (input.files && input.files[0]) {
        document.getElementById('dropzoneObat').classList.add('hidden');
        document.getElementById('loadingScanObat').classList.remove('hidden');
        document.getElementById('loadingScanObat').classList.add('flex');
        
        // Simulasi proses AI OCR
        setTimeout(() => {
          tutupModalScan();
          document.getElementById('input-obat').value = "Amoxicillin";
          pencarianObatLokal();
          showCustomToast("✔️ Gambar berhasil dipindai! Menemukan: Amoxicillin");
        }, 2500);
      }
    }

    // Rekomendasi AI Interaktif
    function tanyaAIObat() {
      showCustomToast("🤖 Memproses gejala Anda... Disarankan konsultasi dokter terlebih dahulu.");
    }

    document.addEventListener('DOMContentLoaded', function() {
      renderMedicineCards(DATA_OBAT_DUMMY);
      
      const ctx = document.getElementById('medicationChart');
      if (ctx) {
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
            datasets: [{
              label: 'Kepatuhan (%)',
              data: [100, 85, 100, 60, 90, 100, 85],
              borderColor: '#0052cc',
              backgroundColor: 'rgba(0, 82, 204, 0.1)',
              borderWidth: 3,
              pointBackgroundColor: '#fff',
              pointBorderColor: '#0052cc',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
              fill: true,
              tension: 0.4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#1e293b',
                bodyColor: '#1e293b',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                padding: 10,
                displayColors: false,
                callbacks: {
                  label: function(context) {
                    return context.parsed.y + '% Tepat Waktu';
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                max: 100,
                ticks: {
                  stepSize: 25,
                  color: '#94a3b8',
                  font: { size: 10 }
                },
                grid: {
                  color: '#f1f5f9',
                  drawBorder: false
                }
              },
              x: {
                ticks: {
                  color: '#64748b',
                  font: { size: 11, weight: 'bold' }
                },
                grid: {
                  display: false,
                  drawBorder: false
                }
              }
            },
            interaction: {
              intersect: false,
              mode: 'index',
            },
          }
        });
      }
    });

/* --- Extracted Script --- */

document.addEventListener('DOMContentLoaded', () => {
      const selectors = [
        '.sc-card', 
        '.prev-glass-card', 
        '.bg-white.rounded-2xl', 
        '.glass-card', 
        'section.bg-white', 
        '.pro-card'
      ].join(', ');
      
      const cards = document.querySelectorAll(selectors);
      
      cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(40px)';
        card.style.transition = 'opacity 0.7s cubic-bezier(0.25, 1, 0.5, 1), transform 0.7s cubic-bezier(0.25, 1, 0.5, 1)';
        const delay = (index % 4) * 0.1;
        card.style.transitionDelay = `${delay}s`;
      });

      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            obs.unobserve(entry.target);
          }
        });
      }, {
        root: null,
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      });

      cards.forEach(card => observer.observe(card));
    });