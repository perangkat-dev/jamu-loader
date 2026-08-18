// ==UserScript==
// @name         Jamu Loader Bootstrap versi beta
// @namespace    http://jamuloader.local
// @version      2.0.0
// @description  Bootstrap ringan untuk Jamu Loader
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // ============================================================
    // 1. KONFIGURASI
    // ============================================================
    const VERSION = "2.0.0";
    const MANIFEST_URL = "https://perangkat-dev.github.io/jamu-loader/global-manifest.json";
    const DASHBOARD_ID = "jamu-dashboard";

    // ============================================================
    // 2. LOAD MANIFEST
    // ============================================================
    async function loadManifest() {
        try {
            console.log(`[JamuLoader] 📡 Fetching manifest...`);
            const res = await fetch(MANIFEST_URL);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const manifest = await res.json();
            console.log(`[JamuLoader] ✅ Manifest loaded`);
            return manifest;
        } catch (err) {
            console.error(`[JamuLoader] ❌ Manifest failed:`, err);
            return null;
        }
    }

    // ============================================================
    // 3. INJECT DASHBOARD (DENGAN FIX TrustedScript)
    // ============================================================
    async function loadDashboard(manifest) {
        const dashboard = manifest.modules?.find(m => m.id === DASHBOARD_ID);
        if (!dashboard) {
            console.error(`[JamuLoader] ❌ Dashboard "${DASHBOARD_ID}" not found`);
            return;
        }

        console.log(`[JamuLoader] 📡 Fetching dashboard...`);

        try {
            const res = await fetch(dashboard.scriptUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const code = await res.text();
            console.log(`[JamuLoader] ✅ Dashboard loaded (${code.length} chars)`);

            const wrappedCode = `
                (function() {
                    try {
                        window.__JAMU_MANIFEST__ = ${JSON.stringify(manifest)};
                        window.__JAMU_VERSION__ = "${VERSION}";
                        ${code}
                    } catch (err) {
                        console.error('[JamuLoader] ❌ Dashboard error:', err);
                    }
                })();
            `;

            // 🔥 Coba inject dengan berbagai cara
            try {
                // Cara 1: innerHTML
                const script = document.createElement('script');
                script.innerHTML = wrappedCode;
                (document.head || document.documentElement).appendChild(script);
                script.remove();
                console.log(`[JamuLoader] ✅ Dashboard injected (innerHTML)`);
            } catch (e1) {
                try {
                    // Cara 2: eval
                    console.warn('[JamuLoader] ⚠️ innerHTML failed, trying eval...');
                    eval(wrappedCode);
                    console.log(`[JamuLoader] ✅ Dashboard injected (eval)`);
                } catch (e2) {
                    // Cara 3: Function constructor
                    console.warn('[JamuLoader] ⚠️ eval failed, trying Function...');
                    const fn = new Function(wrappedCode);
                    fn();
                    console.log(`[JamuLoader] ✅ Dashboard injected (Function)`);
                }
            }

        } catch (err) {
            console.error(`[JamuLoader] ❌ Dashboard failed:`, err);
        }
    }

    // ============================================================
    // 4. START
    // ============================================================
    async function init() {
        console.log(`[JamuLoader] 🚀 Bootstrap v${VERSION} starting...`);
        const manifest = await loadManifest();
        if (manifest) {
            await loadDashboard(manifest);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
