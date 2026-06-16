function autoSearch(text) {
            document.getElementById('searchInput').value = text;
            window.scrollTo({ top: document.querySelector('.hero').offsetTop - 50, behavior: 'smooth' });
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
                if (data.hasil) {
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

            if (!o1 || !o2) return alert('Masukkan minimal obat pertama dan kedua!');

            const obatList = [o1, o2];
            if (o3) obatList.push(o3);

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

                if (data.hasil) {
                    let html = `<strong>Hasil Analisis untuk: ${obatList.join(', ')}</strong><br><br>`;
                    html += data.hasil.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    resBox.innerHTML = html;

                    const textLower = data.hasil.toLowerCase();
                    if (textLower.includes('berbahaya')) {
                        resBox.classList.add('danger');
                    } else if (textLower.includes('perlu perhatian')) {
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

        function handleFileScan(input) {
            if (input.files && input.files[0]) {
                const file = input.files[0];
                if (file.size > 5 * 1024 * 1024) {
                    return alert("Ukuran file maksimal 5MB");
                }

                const reader = new FileReader();
                reader.onload = function (e) {
                    const b64 = e.target.result;
                    doScan(b64, file.name);
                };
                reader.readAsDataURL(file);
            }
        }

        async function doScan(b64, filename) {
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

                if (data.hasil && !data.error) {
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

document.addEventListener('DOMContentLoaded', () => {
            const selectors = [
                '.obat-card',
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