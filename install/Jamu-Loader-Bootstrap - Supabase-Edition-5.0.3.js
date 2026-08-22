// ==UserScript==
// @name         Jamu Loader Bootstrap - Supabase Edition
// @namespace    http://jamuloader.local
// @version      5.0.3
// @description  Bootstrap with Supabase + Obfuscated modules (Fallback to GitHub)
// @match        *://*/*
// @run-at       document-start
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_xmlhttpRequest
// @grant        GM_log
// @grant        GM_info
// ==/UserScript==

(function() {
'use strict';

// ============================================================
// FALLBACK: Jika GM_* tidak tersedia
// ============================================================
if (typeof GM_getValue === 'undefined') {
    console.warn('[JamuLoader] ⚠️ GM_* APIs not available, using localStorage fallback');

    window.GM_getValue = function(key, defaultValue) {
        try {
            const val = localStorage.getItem('GM_' + key);
            return val ? JSON.parse(val) : defaultValue;
        } catch(e) { return defaultValue; }
    };

    window.GM_setValue = function(key, value) {
        try {
            localStorage.setItem('GM_' + key, JSON.stringify(value));
        } catch(e) {}
    };

    window.GM_deleteValue = function(key) {
        try {
            localStorage.removeItem('GM_' + key);
        } catch(e) {}
    };

    window.GM_listValues = function() {
        try {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('GM_')) keys.push(key.substring(3));
            }
            return keys;
        } catch(e) { return []; }
    };

    window.GM_addStyle = function(css) {
        try {
            const style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);
        } catch(e) {}
    };

    window.GM_xmlhttpRequest = function(options) {
        console.warn('[JamuLoader] ⚠️ GM_xmlhttpRequest not available, using fetch');
        fetch(options.url, {
            method: options.method || 'GET',
            headers: options.headers || {}
        })
        .then(res => res.text())
        .then(text => {
            if (options.onload) options.onload({ responseText: text, status: 200 });
        })
        .catch(err => {
            if (options.onerror) options.onerror({ error: err.message });
        });
    };

    window.GM_log = console.log;
    window.GM_info = { script: { version: '5.0.3' } };
}

// ============================================================
// 0. CONFIGURATION
// ============================================================
const VERSION = "5.0.3";
const DEBUG = true;

const SUPABASE = {
    url: "https://jxxuqxvblsogurpkvkas.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dXVxeHZibHNvZ3VycGt2a2FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyNTc1ODAsImV4cCI6MjA1NzgzMzU4MH0.Tx7J5pZ8zG9wX6sN2tL4qP8rS6uB9xE0fD",
    functions: {
        getModule: "/functions/v1/get-module",
        validateLicense: "/functions/v1/validate-license",
    }
};

const GITHUB = {
    manifestUrl: "https://perangkat-dev.github.io/jamu-loader/global-manifest.json",
    dashboardId: "jamu-dashboard"
};

// ============================================================
// 1. LOGGING
// ============================================================
const log = (...args) => DEBUG && console.log('[JamuLoader]', ...args);
const warn = (...args) => DEBUG && console.warn('[JamuLoader]', ...args);
const error = (...args) => console.error('[JamuLoader]', ...args);

// ============================================================
// 2. LICENSE MANAGER
// ============================================================
const LicenseManager = {
    getKey() {
        let key = GM_getValue('jamu_license_key', '');
        if (!key) {
            try {
                const stored = localStorage.getItem('GM_jamu_license_key');
                if (stored) {
                    key = JSON.parse(stored);
                    GM_setValue('jamu_license_key', key);
                }
            } catch(e) {}
        }
        return key || '';
    },

    setKey(key) {
        GM_setValue('jamu_license_key', key);
        try {
            localStorage.setItem('GM_jamu_license_key', JSON.stringify(key));
        } catch(e) {}
    },

    clear() {
        GM_deleteValue('jamu_license_key');
        try {
            localStorage.removeItem('GM_jamu_license_key');
        } catch(e) {}
    },

    async validate(licenseKey) {
        if (!licenseKey) {
            return { valid: false, error: 'No license key' };
        }

        return new Promise((resolve) => {
            const url = `${SUPABASE.url}${SUPABASE.functions.validateLicense}?license_key=${encodeURIComponent(licenseKey)}`;

            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                headers: {
                    'apikey': SUPABASE.anonKey,
                    'Authorization': `Bearer ${SUPABASE.anonKey}`,
                },
                onload: (response) => {
                    try {
                        const data = JSON.parse(response.responseText);
                        resolve(data);
                    } catch (e) {
                        resolve({ valid: false, error: 'Invalid response' });
                    }
                },
                onerror: () => {
                    resolve({ valid: false, error: 'Network error' });
                }
            });
        });
    }
};

// ============================================================
// 3. GM_API SHIM
// ============================================================
function createGmApiShim() {
    return {
        GM_setValue: typeof GM_setValue !== 'undefined' ? GM_setValue : (key, value) => {
            try { localStorage.setItem('GM_' + key, JSON.stringify(value)); } catch(e) {}
        },
        GM_getValue: typeof GM_getValue !== 'undefined' ? GM_getValue : (key, defaultValue) => {
            try { const val = localStorage.getItem('GM_' + key); return val ? JSON.parse(val) : defaultValue; } catch(e) { return defaultValue; }
        },
        GM_deleteValue: typeof GM_deleteValue !== 'undefined' ? GM_deleteValue : (key) => {
            try { localStorage.removeItem('GM_' + key); } catch(e) {}
        },
        GM_listValues: typeof GM_listValues !== 'undefined' ? GM_listValues : () => {
            try {
                const keys = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('GM_')) keys.push(key.substring(3));
                }
                return keys;
            } catch(e) { return []; }
        },
        GM_addStyle: typeof GM_addStyle !== 'undefined' ? GM_addStyle : (css) => {
            try { const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style); } catch(e) {}
        },
        GM_xmlhttpRequest: typeof GM_xmlhttpRequest !== 'undefined' ? GM_xmlhttpRequest : null,
        GM_log: typeof GM_log !== 'undefined' ? GM_log : console.log,
        GM_info: typeof GM_info !== 'undefined' ? GM_info : null,
        unsafeWindow: typeof unsafeWindow !== 'undefined' ? unsafeWindow : window,
        window: window,
        document: document,
        console: console,
    };
}

// ============================================================
// 4. MODULE LOADER
// ============================================================
const ModuleLoader = {
    _cache: {},

    async loadModule(moduleId, licenseKey, manifest) {
        const cached = this._cache[moduleId];
        if (cached && (Date.now() - cached.timestamp < 300000)) {
            log(`📦 Cache hit: ${moduleId}`);
            return cached.data;
        }

        if (licenseKey) {
            try {
                const result = await this._loadFromSupabase(moduleId, licenseKey);
                if (result) {
                    this._cache[moduleId] = { data: result, timestamp: Date.now() };
                    log(`✅ ${moduleId} from Supabase`);
                    return result;
                }
            } catch (e) {
                warn(`Supabase failed for ${moduleId}: ${e.message}`);
            }
        }

        if (manifest) {
            try {
                const result = await this._loadFromGitHub(moduleId, manifest);
                if (result) {
                    this._cache[moduleId] = { data: result, timestamp: Date.now() };
                    log(`✅ ${moduleId} from GitHub (fallback)`);
                    return result;
                }
            } catch (e) {
                error(`GitHub fallback failed for ${moduleId}: ${e.message}`);
            }
        }

        throw new Error(`Module ${moduleId} not found`);
    },

    _loadFromSupabase(moduleId, licenseKey) {
        return new Promise((resolve, reject) => {
            const url = `${SUPABASE.url}${SUPABASE.functions.getModule}?license_key=${encodeURIComponent(licenseKey)}&module_name=${encodeURIComponent(moduleId)}`;

            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                headers: {
                    'apikey': SUPABASE.anonKey,
                    'Authorization': `Bearer ${SUPABASE.anonKey}`,
                },
                onload: (response) => {
                    if (response.status === 200) {
                        try {
                            const data = JSON.parse(response.responseText);
                            if (data && data.code) {
                                resolve({
                                    code: data.code,
                                    version: data.version || '1.0.0',
                                    meta: data.meta || { id: moduleId },
                                    source: 'supabase'
                                });
                            } else {
                                reject(new Error('No code in response'));
                            }
                        } catch (e) {
                            reject(e);
                        }
                    } else {
                        reject(new Error(`HTTP ${response.status}`));
                    }
                },
                onerror: (err) => {
                    reject(new Error('Network error: ' + (err.error || 'Unknown')));
                }
            });
        });
    },

    _loadFromGitHub(moduleId, manifest) {
        const moduleInfo = manifest.modules?.find(m => m.id === moduleId);
        if (!moduleInfo) {
            throw new Error(`Module ${moduleId} not found in manifest`);
        }

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: moduleInfo.scriptUrl,
                onload: (response) => {
                    if (response.status === 200) {
                        resolve({
                            code: response.responseText,
                            version: moduleInfo.version,
                            meta: moduleInfo,
                            source: 'github'
                        });
                    } else {
                        reject(new Error(`HTTP ${response.status}`));
                    }
                },
                onerror: (err) => {
                    reject(new Error('Network error: ' + (err.error || 'Unknown')));
                }
            });
        });
    },

    executeModule(moduleData, gmApis) {
        const { code, meta } = moduleData;

        const context = {
            ...gmApis,
            __meta__: meta,
            __module_source__: moduleData.source || 'unknown',
        };

        try {
            const func = new Function(
                ...Object.keys(context),
                `"use strict";\n${code}`
            );
            func(...Object.values(context));
            log(`✅ ${meta.id || 'unknown'} executed (${moduleData.source})`);
            return true;
        } catch (err) {
            error(`❌ Error executing ${meta.id || 'unknown'}:`, err);
            return false;
        }
    }
};

// ============================================================
// 5. LOAD MANIFEST
// ============================================================
async function loadManifest() {
    return new Promise((resolve) => {
        GM_xmlhttpRequest({
            method: 'GET',
            url: GITHUB.manifestUrl,
            onload: (response) => {
                if (response.status === 200) {
                    try {
                        const manifest = JSON.parse(response.responseText);
                        log(`✅ Manifest loaded (${manifest.modules?.length || 0} modules)`);
                        resolve(manifest);
                    } catch (e) {
                        error('Manifest parse error:', e);
                        resolve(null);
                    }
                } else {
                    error(`Manifest HTTP ${response.status}`);
                    resolve(null);
                }
            },
            onerror: () => {
                error('Manifest network error');
                resolve(null);
            }
        });
    });
}

// ============================================================
// 6. INJECT DASHBOARD - (FIXED: SET WINDOW GLOBALS)
// ============================================================
async function loadDashboard(manifest, licenseKey) {
    log('📡 Loading dashboard...');

    try {
        let moduleData = null;

        if (licenseKey) {
            try {
                moduleData = await ModuleLoader._loadFromSupabase(GITHUB.dashboardId, licenseKey);
                log('✅ Dashboard from Supabase');
            } catch (e) {
                warn(`Dashboard Supabase failed: ${e.message}`);
            }
        }

        if (!moduleData && manifest) {
            try {
                moduleData = await ModuleLoader._loadFromGitHub(GITHUB.dashboardId, manifest);
                log('✅ Dashboard from GitHub (fallback)');
            } catch (e) {
                error(`Dashboard GitHub failed: ${e.message}`);
                return false;
            }
        }

        if (!moduleData) {
            error('❌ Dashboard not found');
            return false;
        }

        // ============================================================
        // 🔥 FIX: SET WINDOW GLOBALS SEBELUM EKSEKUSI DASHBOARD
        // ============================================================
        window.__JAMU_MANIFEST__ = manifest;
        window.__JAMU_VERSION__ = VERSION;
        window.__JAMU_LICENSE_KEY__ = licenseKey;
        window.__JAMU_MODULE_LOADER__ = ModuleLoader;
        window.__JAMU_LICENSE_MANAGER__ = LicenseManager;

        log('✅ Window globals set: __JAMU_MANIFEST__, __JAMU_VERSION__, __JAMU_LICENSE_KEY__');

        const gmShim = createGmApiShim();
        const context = {
            ...gmShim,
            __JAMU_MANIFEST__: manifest,
            __JAMU_VERSION__: VERSION,
            __JAMU_LICENSE_KEY__: licenseKey,
            __JAMU_MODULE_LOADER__: ModuleLoader,
            __JAMU_LICENSE_MANAGER__: LicenseManager,
        };

        const func = new Function(
            ...Object.keys(context),
            `"use strict";\n${moduleData.code}`
        );
        func(...Object.values(context));

        log(`✅ Dashboard injected (${moduleData.source})`);
        return true;

    } catch (err) {
        error('❌ Dashboard failed:', err);
        return false;
    }
}

// ============================================================
// 7. START
// ============================================================
async function init() {
    log(`🚀 Bootstrap v${VERSION} starting...`);

    try {
        let licenseKey = LicenseManager.getKey();
        log(`🔑 License key: ${licenseKey ? licenseKey.substring(0, 20) + '...' : '(none)'}`);

        if (licenseKey) {
            const result = await LicenseManager.validate(licenseKey);
            if (result.valid) {
                log(`✅ License valid: ${result.tier} (${result.puskesmas_id})`);
            } else {
                warn(`⚠️ License invalid: ${result.error}`);
                licenseKey = '';
            }
        }

        const manifest = await loadManifest();
        if (!manifest) {
            error('❌ Cannot continue without manifest');
            return;
        }

        await loadDashboard(manifest, licenseKey);

        window.JamuLoader = {
            version: VERSION,
            debug: DEBUG,
            licenseKey: licenseKey,
            LicenseManager: LicenseManager,
            ModuleLoader: ModuleLoader,
            manifest: manifest,
            reload: () => { window.location.reload(); },
            setLicense: (key) => {
                LicenseManager.setKey(key);
                window.location.reload();
            },
            clearLicense: () => {
                LicenseManager.clear();
                window.location.reload();
            }
        };

        log(`✅ Bootstrap ready!`);

    } catch (err) {
        error('❌ Initialization failed:', err);
    }
}

// ============================================================
// 8. EXPOSE
// ============================================================
window.JamuBootstrap = {
    version: VERSION,
    get debug() { return DEBUG; },
    set debug(value) {
        const newDebug = !!value;
        localStorage.setItem('jamu_debug', JSON.stringify(newDebug));
    },
    init: init,
};

// ============================================================
// 9. AUTO-RUN
// ============================================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

console.log(`💡 Jamu Bootstrap v${VERSION} loaded`);
console.log(`💡 Set window.JamuBootstrap.debug = true untuk console log`);
console.log(`💡 License: window.JamuLoader.setLicense("your-key")`);

})();

// ============================================================
// 🔥 FIX: EXPOSE MANIFEST KE WINDOW (FALLBACK)
// ============================================================
setTimeout(() => {
    if (typeof window.JamuLoader !== 'undefined' && window.JamuLoader.manifest) {
        window.__JAMU_MANIFEST__ = window.JamuLoader.manifest;
        console.log('[JamuLoader] ✅ Manifest exposed to window.__JAMU_MANIFEST__');
    }

    if (typeof window.__JAMU_MANIFEST__ !== 'undefined') {
        console.log('[JamuLoader] ✅ window.__JAMU_MANIFEST__ has', window.__JAMU_MANIFEST__.modules?.length || 0, 'modules');
    }
}, 1000);
