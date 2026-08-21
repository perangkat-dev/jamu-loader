// ============================================================
// Module: kessan-bpjs-auto
// Backup Date: 2026-08-21T12:20:40.476Z
// ============================================================
// ==UserScript==
// @name         KESSAN BPJS Auto
// @namespace    http://jamu.local/
// @version      5.0
// @description  Otomatis mengisi KESSAN BPJS Kesehatan dari daftar No. BPJS
// @author       Jamu
// @match        https://kesan.bpjs-kesehatan.go.id/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // ===================== STATE =====================
    let nikList = [];
    let currentIndex = 0;
    let isRunning = false;
    let stopRequested = false;
    let currentPhase = 'idle'; // idle | waiting_captcha | waiting_page | filling

    // ===================== UI =====================
    const UI_ID = 'kessan-panel';

    function createUI() {
        if (document.getElementById(UI_ID)) return;

        const panel = document.createElement('div');
        panel.id = UI_ID;
        panel.innerHTML = `
            <div id="kessan-header">
                <span>⚡ KESSAN Auto Fill</span>
                <button id="kessan-minimize" title="Minimize">−</button>
            </div>
            <div id="kessan-body">
                <textarea id="kessan-input" placeholder="Masukkan No. BPJS, satu per baris&#10;Contoh:&#10;0001132333018&#10;0001132333019"></textarea>
                <div id="kessan-progress-wrap">
                    <div id="kessan-progress-bar"></div>
                </div>
                <div id="kessan-progress-text">0 / 0</div>
                <div id="kessan-status">Siap</div>
                <div id="kessan-actions">
                    <button id="kessan-start">▶ Mulai</button>
                    <button id="kessan-stop" disabled>■ Stop</button>
                </div>
                <div id="kessan-log-wrap">
                    <div id="kessan-log"></div>
                </div>
            </div>
        `;

        // Styles
        const style = document.createElement('style');
        style.textContent = `
            #kessan-panel {
                position: fixed;
                top: 60px;
                right: 20px;
                width: 290px;
                background: #1a1f2e;
                border: 1px solid #2d3554;
                border-radius: 10px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                z-index: 999999;
                font-family: 'Segoe UI', sans-serif;
                font-size: 13px;
                color: #c8d0e7;
                user-select: none;
            }
            #kessan-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: #0f4c81;
                color: #fff;
                padding: 8px 12px;
                border-radius: 10px 10px 0 0;
                cursor: move;
                font-weight: 600;
                font-size: 13px;
            }
            #kessan-minimize {
                background: none;
                border: 1px solid rgba(255,255,255,0.4);
                color: #fff;
                width: 20px;
                height: 20px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                line-height: 1;
                padding: 0;
            }
            #kessan-body {
                padding: 12px;
            }
            #kessan-input {
                width: 100%;
                height: 90px;
                background: #0d1117;
                border: 1px solid #2d3554;
                border-radius: 6px;
                color: #c8d0e7;
                padding: 7px 9px;
                font-size: 12px;
                resize: vertical;
                box-sizing: border-box;
                font-family: 'Courier New', monospace;
            }
            #kessan-input:focus { outline: 1px solid #0f4c81; }
            #kessan-progress-wrap {
                background: #0d1117;
                border-radius: 20px;
                height: 8px;
                margin: 10px 0 4px;
                overflow: hidden;
                border: 1px solid #2d3554;
            }
            #kessan-progress-bar {
                height: 100%;
                width: 0%;
                background: linear-gradient(90deg, #0f4c81, #1a8fe3);
                border-radius: 20px;
                transition: width 0.4s ease;
            }
            #kessan-progress-text {
                text-align: right;
                font-size: 11px;
                color: #6b7a9e;
                margin-bottom: 6px;
            }
            #kessan-status {
                background: #0d1117;
                border: 1px solid #2d3554;
                border-radius: 6px;
                padding: 5px 9px;
                font-size: 12px;
                min-height: 28px;
                margin-bottom: 8px;
                color: #a0b0d0;
                word-break: break-word;
            }
            #kessan-actions {
                display: flex;
                gap: 8px;
                margin-bottom: 8px;
            }
            #kessan-actions button {
                flex: 1;
                padding: 7px 0;
                border-radius: 6px;
                border: none;
                font-weight: 600;
                font-size: 12px;
                cursor: pointer;
                transition: opacity 0.2s;
            }
            #kessan-start {
                background: #0f7a3c;
                color: #fff;
            }
            #kessan-start:hover:not(:disabled) { opacity: 0.85; }
            #kessan-stop {
                background: #8b2525;
                color: #fff;
            }
            #kessan-stop:hover:not(:disabled) { opacity: 0.85; }
            #kessan-actions button:disabled { opacity: 0.35; cursor: not-allowed; }
            #kessan-log-wrap {
                max-height: 120px;
                overflow-y: auto;
                background: #0d1117;
                border: 1px solid #2d3554;
                border-radius: 6px;
                padding: 5px 8px;
            }
            #kessan-log {
                font-size: 11px;
                font-family: 'Courier New', monospace;
                color: #6b7a9e;
                line-height: 1.6;
            }
            #kessan-log .log-ok  { color: #3ecf8e; }
            #kessan-log .log-skip { color: #f0a500; }
            #kessan-log .log-err  { color: #e05c5c; }
            #kessan-log .log-info { color: #4ea8de; }

            /* Spinner overlay (kiri atas halaman) */
            #kessan-spinner {
                position: fixed;
                top: 16px;
                left: 16px;
                width: 34px;
                height: 34px;
                z-index: 999998;
                display: none;
            }
            #kessan-spinner svg {
                animation: kessan-spin 0.8s linear infinite;
            }
            @keyframes kessan-spin {
                from { transform: rotate(0deg); }
                to   { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(panel);

        // Spinner
        const spinner = document.createElement('div');
        spinner.id = 'kessan-spinner';
        spinner.innerHTML = `<svg viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="17" cy="17" r="14" stroke="#2d3554" stroke-width="3"/>
            <path d="M17 3 A14 14 0 0 1 31 17" stroke="#1a8fe3" stroke-width="3" stroke-linecap="round"/>
        </svg>`;
        document.body.appendChild(spinner);

        // Drag
        makeDraggable(panel, document.getElementById('kessan-header'));

        // Events
        document.getElementById('kessan-start').addEventListener('click', startProcess);
        document.getElementById('kessan-stop').addEventListener('click', requestStop);
        document.getElementById('kessan-minimize').addEventListener('click', toggleMinimize);
    }

    function toggleMinimize() {
        const body = document.getElementById('kessan-body');
        const btn = document.getElementById('kessan-minimize');
        if (body.style.display === 'none') {
            body.style.display = '';
            btn.textContent = '−';
        } else {
            body.style.display = 'none';
            btn.textContent = '+';
        }
    }

    function makeDraggable(el, handle) {
        let ox = 0, oy = 0, mx = 0, my = 0;
        handle.onmousedown = function (e) {
            e.preventDefault();
            mx = e.clientX; my = e.clientY;
            document.onmousemove = drag;
            document.onmouseup = stopDrag;
        };
        function drag(e) {
            ox = mx - e.clientX; oy = my - e.clientY;
            mx = e.clientX; my = e.clientY;
            el.style.top  = (el.offsetTop - oy) + 'px';
            el.style.left = (el.offsetLeft - ox) + 'px';
            el.style.right = 'auto';
        }
        function stopDrag() {
            document.onmousemove = null;
            document.onmouseup = null;
        }
    }

    function setStatus(msg) {
        const el = document.getElementById('kessan-status');
        if (el) el.textContent = msg;
    }

    function addLog(msg, type = 'info') {
        const log = document.getElementById('kessan-log');
        if (!log) return;
        const line = document.createElement('div');
        line.className = `log-${type}`;
        const now = new Date();
        const t = now.toTimeString().slice(0,8);
        line.textContent = `[${t}] ${msg}`;
        log.appendChild(line);
        log.scrollTop = log.scrollHeight;
    }

    function updateProgress() {
        const total = nikList.length;
        const done  = currentIndex;
        const pct   = total ? Math.round((done / total) * 100) : 0;
        const bar   = document.getElementById('kessan-progress-bar');
        const txt   = document.getElementById('kessan-progress-text');
        if (bar) bar.style.width = pct + '%';
        if (txt) txt.textContent  = `${done} / ${total}`;
    }

    function showSpinner(show) {
        const s = document.getElementById('kessan-spinner');
        if (s) s.style.display = show ? 'block' : 'none';
    }

    function setBtnState(running) {
        const btnStart = document.getElementById('kessan-start');
        const btnStop  = document.getElementById('kessan-stop');
        if (btnStart) btnStart.disabled = running;
        if (btnStop)  btnStop.disabled  = !running;
    }

    // ===================== HELPERS =====================
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function waitFor(selectorFn, timeout = 15000, interval = 300) {
        return new Promise((resolve, reject) => {
            const start = Date.now();
            const check = () => {
                if (stopRequested) return reject(new Error('STOP'));
                const el = selectorFn();
                if (el) return resolve(el);
                if (Date.now() - start > timeout) return reject(new Error('TIMEOUT: ' + selectorFn.toString()));
                setTimeout(check, interval);
            };
            check();
        });
    }

    function clickEl(el) {
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }

    // ===================== PHASE DETECTION =====================
    function detectPhase() {
        // Phase: form input NIK
        const nikInput = document.querySelector('input#nik');
        if (nikInput) return 'input';

        // Phase: riwayat pelayanan (list kunjungan)
        const ribbonHeader = document.querySelector('.ribbon.ribbon-primary.ribbon-shape');
        if (ribbonHeader && ribbonHeader.textContent.trim() === 'Riwayat Pelayanan') return 'riwayat';

        // Phase: form KESSAN (tabel soal)
        const kesanTable = document.querySelector('tbody[formarrayname="soal"]');
        if (kesanTable) return 'kessan';

        return 'unknown';
    }

    // ===================== MAIN PROCESS =====================
    async function startProcess() {
        const raw = document.getElementById('kessan-input').value.trim();
        nikList = raw.split('\n').map(s => s.trim()).filter(Boolean);
        if (!nikList.length) {
            setStatus('❌ Masukkan minimal 1 No. BPJS!');
            return;
        }
        currentIndex = 0;
        isRunning = true;
        stopRequested = false;
        setBtnState(true);
        updateProgress();
        addLog(`Memulai proses ${nikList.length} No. BPJS`, 'info');
        await runNext();
    }

    function requestStop() {
        stopRequested = true;
        isRunning = false;
        showSpinner(false);
        setStatus('⏹ Dihentikan');
        setBtnState(false);
        addLog('Proses dihentikan oleh user', 'skip');
    }

    async function runNext() {
        if (stopRequested) {
            setBtnState(false);
            isRunning = false;
            return;
        }
        if (currentIndex >= nikList.length) {
            setStatus('✅ Semua selesai!');
            setBtnState(false);
            isRunning = false;
            showSpinner(false);
            addLog(`Selesai! Total: ${nikList.length}`, 'ok');
            return;
        }

        const noKartu = nikList[currentIndex];
        setStatus(`⏳ [${currentIndex + 1}/${nikList.length}] Memproses ${noKartu}`);

        const phase = detectPhase();

        if (phase === 'input') {
            await handleInputPhase(noKartu);
        } else if (phase === 'riwayat') {
            await handleRiwayatPhase(noKartu);
        } else if (phase === 'kessan') {
            await handleKessanPhase(noKartu);
        } else {
            setStatus('⚠ Halaman tidak dikenali, tunggu...');
            await sleep(1500);
            await runNext();
        }
    }

    // ===================== PHASE: INPUT =====================
    async function handleInputPhase(noKartu) {
        try {
            // Isi NIK
            const nikInput = await waitFor(() => document.querySelector('input#nik'), 10000);
            nikInput.focus();
            nikInput.value = '';
            // Trigger Angular reactive form
            nikInput.dispatchEvent(new Event('input', { bubbles: true }));
            await sleep(200);
            nikInput.value = noKartu;
            nikInput.dispatchEvent(new Event('input', { bubbles: true }));
            nikInput.dispatchEvent(new Event('change', { bubbles: true }));
            await sleep(300);

            setStatus(`⏳ Menunggu CAPTCHA diisi manual...`);
            addLog(`[${noKartu}] Menunggu captcha...`, 'info');

            // Tunggu captcha terisi (g-recaptcha-response tidak kosong)
            await waitFor(() => {
                const ta = document.querySelector('textarea#g-recaptcha-response, textarea.g-recaptcha-response');
                return ta && ta.value && ta.value.length > 10 ? ta : null;
            }, 180000, 500); // tunggu max 3 menit

            setStatus(`✅ Captcha OK, klik Cari Data...`);
            await sleep(400);

            // Klik tombol Cari Data
            const btnCari = await waitFor(() => {
                const btns = document.querySelectorAll('button[type="submit"]');
                for (const b of btns) {
                    if (b.textContent.includes('Cari Data') && !b.disabled) return b;
                }
                return null;
            }, 10000);

            clickEl(btnCari);
            addLog(`[${noKartu}] Klik Cari Data`, 'info');

            // Tunggu hasil: toast "tidak ditemukan" atau halaman riwayat
            setStatus(`⏳ Menunggu hasil pencarian...`);
            const result = await waitForResult(noKartu);

            if (result === 'not_found') {
                addLog(`[${noKartu}] Tidak ditemukan → lewati`, 'skip');
                currentIndex++;
                updateProgress();
                await sleep(800);
                await runNext();
            } else if (result === 'found') {
                // Halaman riwayat sudah muncul, lanjut
                await handleRiwayatPhase(noKartu);
            }

        } catch (e) {
            if (e.message === 'STOP') return;
            addLog(`[${noKartu}] Error: ${e.message}`, 'err');
            setStatus(`❌ Error: ${e.message}`);
            currentIndex++;
            updateProgress();
            await sleep(1000);
            await runNext();
        }
    }

    async function waitForResult(noKartu) {
        return new Promise((resolve, reject) => {
            const start = Date.now();
            const timeout = 20000;
            const check = () => {
                if (stopRequested) return reject(new Error('STOP'));
                if (Date.now() - start > timeout) return reject(new Error('Timeout menunggu hasil'));

                // Cek toast tidak ditemukan
                const toasts = document.querySelectorAll('.toast-body');
                for (const t of toasts) {
                    if (t.textContent.includes('tidak ditemukan') || t.textContent.includes('Tidak ditemukan')) {
                        return resolve('not_found');
                    }
                }

                // Cek halaman riwayat pelayanan
                const ribbon = document.querySelector('.ribbon.ribbon-primary.ribbon-shape');
                if (ribbon && ribbon.textContent.trim() === 'Riwayat Pelayanan') {
                    return resolve('found');
                }

                setTimeout(check, 400);
            };
            check();
        });
    }

    // ===================== PHASE: RIWAYAT =====================
    async function handleRiwayatPhase(noKartu) {
        try {
            // Tunggu halaman Riwayat benar-benar selesai render konten baru (anti-stale DOM)
            setStatus(`⏳ Menunggu halaman Riwayat stabil...`);
            await waitForRiwayatStable();

            // Cek "Tidak Ada Data" (multi-selector untuk berbagai versi halaman)
            const noDataEl = document.querySelector('.no-results h5, .no-results.show h5, h5.text-center');
            const isNoData = noDataEl && noDataEl.textContent.includes('Tidak Ada Data');
            const allCards = document.querySelectorAll('.card.ribbon-box');
            const hasCards = allCards.length > 0;

            if (isNoData || !hasCards) {
                addLog(`[${noKartu}] Tidak ada data → lewati`, 'skip');
                const btnKembali = await waitFor(() => {
                    const btns = document.querySelectorAll('button');
                    for (const b of btns) if (b.textContent.trim() === 'Kembali') return b;
                    return null;
                }, 8000);
                clickEl(btnKembali);
                currentIndex++;
                updateProgress();
                await sleep(600);
                await runNext();
                return;
            }

            // Ada data kunjungan: ambil ulang setelah stable (anti-stale reference)
            const freshCards = document.querySelectorAll('.card.ribbon-box');
            const firstCard  = freshCards[0];
            const firstLink  = firstCard.querySelector('a[href="javascript:void(0);"], a[href="javascript:;"], button');
            if (!firstLink) throw new Error('Link kunjungan tidak ditemukan di card pertama');

            addLog(`[${noKartu}] Klik kunjungan pertama (${freshCards.length} tersedia)`, 'info');
            clickEl(firstLink);

            // Tunggu form KESSAN
            await waitFor(() => document.querySelector('tbody[formarrayname="soal"]'), 15000);
            await sleep(500);
            await handleKessanPhase(noKartu);

        } catch (e) {
            if (e.message === 'STOP') return;
            addLog(`[${noKartu}] Error riwayat: ${e.message}`, 'err');
            setStatus(`❌ Error riwayat: ${e.message}`);
            currentIndex++;
            updateProgress();
            await sleep(1000);
            await runNext();
        }
    }

    // Tunggu halaman Riwayat stabil: ada card ATAU ada "Tidak Ada Data",
    // tidak ada loading, dan kondisi konsisten selama 600ms
    function waitForRiwayatStable(timeout = 20000) {
        return new Promise((resolve, reject) => {
            const start = Date.now();
            let stableSince = null;
            const STABLE_MS = 600;
            const check = () => {
                if (stopRequested) return reject(new Error('STOP'));
                if (Date.now() - start > timeout) return reject(new Error('Timeout menunggu halaman Riwayat stabil'));

                const isLoading = !!document.querySelector(
                    '.loading-overlay:not([style*="display: none"]), .spinner-border:not([style*="display: none"])'
                );
                const hasCards  = document.querySelectorAll('.card.ribbon-box').length > 0;
                const noDataEl  = document.querySelector('.no-results h5, .no-results.show h5, h5.text-center');
                const hasNoData = noDataEl && noDataEl.textContent.includes('Tidak Ada Data');
                const isReady   = !isLoading && (hasCards || hasNoData);

                if (isReady) {
                    if (!stableSince) stableSince = Date.now();
                    else if (Date.now() - stableSince >= STABLE_MS) return resolve();
                } else {
                    stableSince = null;
                }
                setTimeout(check, 150);
            };
            check();
        });
    }


    // ===================== PHASE: KESSAN =====================
    async function handleKessanPhase(noKartu) {
        try {
            showSpinner(true);
            setStatus(`⏳ [${currentIndex + 1}/${nikList.length}] Mengisi KESSAN ${noKartu}`);

            // Ambil semua baris soal
            const rows = document.querySelectorAll('tbody[formarrayname="soal"] tr');
            addLog(`[${noKartu}] ${rows.length} soal ditemukan`, 'info');

            for (let i = 0; i < rows.length; i++) {
                if (stopRequested) throw new Error('STOP');

                const row = rows[i];
                // Cari semua radio di baris ini
                const radios = row.querySelectorAll('input[type="radio"]');
                if (!radios.length) continue;

                // Pilih yang terakhir = "Sangat Setuju"
                const lastRadio = radios[radios.length - 1];
                lastRadio.focus();
                lastRadio.checked = true;
                lastRadio.dispatchEvent(new Event('change', { bubbles: true }));
                lastRadio.dispatchEvent(new MouseEvent('click', { bubbles: true }));

                setStatus(`⏳ Soal ${i + 1}/${rows.length} → Sangat Setuju`);
                await sleep(500);
            }

            // Pastikan textarea ulasan kosong
            const ulasan = document.querySelector('textarea#ulasan');
            if (ulasan) {
                ulasan.value = '';
                ulasan.dispatchEvent(new Event('input', { bubbles: true }));
            }

            // Pastikan checkbox "sembunyikan identitas" tidak dicentang
            const cbHidden = document.querySelector('input[formcontrolname="ishidden"]');
            if (cbHidden && cbHidden.checked) {
                clickEl(cbHidden);
                await sleep(200);
            }

            showSpinner(false);
            await sleep(400);

            // Klik Simpan
            const btnSimpan = await waitFor(() => {
                const btns = document.querySelectorAll('button');
                for (const b of btns) {
                    if (b.textContent.includes('Simpan') && !b.disabled) return b;
                }
                return null;
            }, 8000);

            setStatus(`⏳ Klik Simpan...`);
            clickEl(btnSimpan);
            addLog(`[${noKartu}] Klik Simpan`, 'info');

            // Tunggu popup konfirmasi SweetAlert "Apa anda yakin?"
            await waitFor(() => {
                const title = document.querySelector('.swal2-title');
                return title && title.textContent.includes('Apa anda yakin') ? title : null;
            }, 10000);

            await sleep(400);
            // Klik "Ya, lanjutkan!"
            const btnYa = await waitFor(() => {
                const btns = document.querySelectorAll('.swal2-confirm');
                for (const b of btns) {
                    if (b.textContent.includes('Ya') || b.textContent.includes('lanjutkan')) return b;
                }
                return btns[0] || null;
            }, 8000);

            clickEl(btnYa);
            addLog(`[${noKartu}] Konfirmasi Ya`, 'info');

            // Tunggu popup sukses "Terima kasih"
            await waitFor(() => {
                const title = document.querySelector('.swal2-title');
                return title && (title.textContent.includes('Terima kasih') || title.textContent.includes('terima kasih')) ? title : null;
            }, 15000);

            await sleep(500);
            // Klik OK
            const btnOK = await waitFor(() => {
                const btns = document.querySelectorAll('.swal2-confirm');
                for (const b of btns) {
                    if (b.textContent.trim() === 'OK') return b;
                }
                return btns[0] || null;
            }, 8000);

            clickEl(btnOK);
            addLog(`[${noKartu}] ✅ Berhasil!`, 'ok');

            currentIndex++;
            updateProgress();
            setStatus(`✅ ${noKartu} selesai!`);
            await sleep(1000);

            // Setelah OK, app redirect ke halaman Riwayat "Tidak Ada Data"
            // Tunggu halaman riwayat muncul lalu klik Kembali
            await waitFor(() => document.querySelector('.ribbon.ribbon-primary.ribbon-shape'), 10000);
            await sleep(400);

            const btnKembaliAfter = await waitFor(() => {
                const btns = document.querySelectorAll('button');
                for (const b of btns) if (b.textContent.trim() === 'Kembali') return b;
                return null;
            }, 8000);
            clickEl(btnKembaliAfter);
            addLog(`[${noKartu}] Klik Kembali setelah sukses`, 'info');

            // Tunggu halaman input NIK
            await waitFor(() => document.querySelector('input#nik'), 15000);
            await sleep(300);
            await runNext();

        } catch (e) {
            showSpinner(false);
            if (e.message === 'STOP') return;
            addLog(`[${noKartu}] Error kessan: ${e.message}`, 'err');
            setStatus(`❌ Error: ${e.message}`);
            currentIndex++;
            updateProgress();
            await sleep(1000);
            await runNext();
        }
    }

    // ===================== INIT =====================
    function init() {
        createUI();
        // Deteksi halaman saat load ulang (jika script aktif di tengah-tengah flow)
        const phase = detectPhase();
        if (phase !== 'unknown') {
            addLog(`Halaman terdeteksi: ${phase}`, 'info');
        }
    }

    // Tunggu DOM siap
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 800);
    }

})();