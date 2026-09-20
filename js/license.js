// ===== نظام الترخيص بالسيريال (تحقق محلي بدون إنترنت) =====
// ملاحظة: المفتاح السري موجود في التطبيق وأداة التوليد. لا تشاركي أداة التوليد مع العملاء.

const LICENSE_SECRET = 'AM_GYM_SA_2026_K9x#mQ7p';
const LICENSE_STORAGE_KEY = 'gym_saudi_license_v1';

function licenseHash(str) {
  // هاش بسيط ومستقر (مو تشفير عسكري — مناسب للسيطرة التجارية على الأندية)
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // حول لنص base36
  const n = (h >>> 0).toString(36).toUpperCase();
  return (n + 'XXXXXX').slice(0, 6);
}

/** توليد سيريال من تاريخ انتهاء YYYY-MM-DD */
function generateLicenseSerial(endDateStr, clubTag = '') {
  const compact = String(endDateStr).replace(/-/g, '');
  if (!/^\d{8}$/.test(compact)) throw new Error('تاريخ غير صالح');
  const tag = (clubTag || 'GEN').toString().replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4) || 'GEN';
  const payload = compact + tag;
  const check = licenseHash(payload + LICENSE_SECRET);
  return `AM-${compact}-${tag}-${check}`;
}

/**
 * التحقق من السيريال
 * @returns {{ ok: true, endDate, serial, clubTag } | { ok: false, reason }}
 */
function parseAndValidateSerial(serialRaw) {
  if (!serialRaw || typeof serialRaw !== 'string') {
    return { ok: false, reason: 'أدخلي رمز التفعيل' };
  }
  const serial = serialRaw.trim().toUpperCase().replace(/\s+/g, '');
  const parts = serial.split('-');
  // AM-YYYYMMDD-TAG-CHECK
  if (parts.length !== 4 || parts[0] !== 'AM') {
    return { ok: false, reason: 'شكل السيريال غير صحيح' };
  }
  const compact = parts[1];
  const tag = parts[2];
  const check = parts[3];
  if (!/^\d{8}$/.test(compact)) {
    return { ok: false, reason: 'تاريخ السيريال غير صالح' };
  }
  const expected = licenseHash(compact + tag + LICENSE_SECRET);
  if (check !== expected) {
    return { ok: false, reason: 'سيريال غير صالح أو مزور' };
  }
  const endDate = `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
  const t = Date.parse(endDate);
  if (Number.isNaN(t)) {
    return { ok: false, reason: 'تاريخ انتهاء غير صالح' };
  }
  return { ok: true, endDate, serial, clubTag: tag };
}

function loadLicenseRecord() {
  try {
    const raw = localStorage.getItem(LICENSE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveLicenseRecord(rec) {
  localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(rec));
}

function clearLicenseRecord() {
  localStorage.removeItem(LICENSE_STORAGE_KEY);
}

/**
 * حالة الترخيص الحالية
 * @returns {{ status: 'none'|'active'|'expired', endDate?: string, daysLeft?: number, serial?: string, clubTag?: string }}
 */
function getLicenseStatus() {
  const rec = loadLicenseRecord();
  if (!rec || !rec.endDate) {
    return { status: 'none' };
  }
  // إعادة التحقق من السيريال المخزن
  if (rec.serial) {
    const v = parseAndValidateSerial(rec.serial);
    if (!v.ok) {
      return { status: 'none' };
    }
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(rec.endDate + 'T00:00:00');
  const daysLeft = Math.floor((end - today) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) {
    return {
      status: 'expired',
      endDate: rec.endDate,
      daysLeft,
      serial: rec.serial,
      clubTag: rec.clubTag
    };
  }
  return {
    status: 'active',
    endDate: rec.endDate,
    daysLeft,
    serial: rec.serial,
    clubTag: rec.clubTag,
    activatedAt: rec.activatedAt
  };
}

function activateLicense(serialRaw) {
  const v = parseAndValidateSerial(serialRaw);
  if (!v.ok) return v;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(v.endDate + 'T00:00:00');
  if (end < today) {
    return { ok: false, reason: 'هذا السيريال منتهي مسبقاً' };
  }
  const rec = {
    serial: v.serial,
    endDate: v.endDate,
    clubTag: v.clubTag,
    activatedAt: new Date().toISOString()
  };
  saveLicenseRecord(rec);
  return { ok: true, ...rec, daysLeft: Math.floor((end - today) / (1000 * 60 * 60 * 24)) };
}

function isLicenseActive() {
  return getLicenseStatus().status === 'active';
}

/** واجهة شاشة التفعيل / القفل */
function renderLicenseGate(status) {
  const expired = status.status === 'expired';
  return `
    <div id="license-gate" class="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style="background: linear-gradient(145deg, #0f766e 0%, #134e4a 50%, #0f172a 100%);">
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 text-center">
        <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg">AM</div>
        <h1 class="text-xl font-bold mb-1 text-slate-800 dark:text-white">نظام إدارة النادي النسائي</h1>
        <p class="text-sm text-slate-500 mb-6">${expired ? 'انتهت مدة الترخيص' : 'يلزم تفعيل الترخيص للمتابعة'}</p>

        ${expired ? `
          <div class="mb-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-sm">
            انتهى الترخيص بتاريخ <strong>${status.endDate || '—'}</strong><br>
            تواصلي مع المزوّد للحصول على سيريال تجديد
          </div>
        ` : `
          <p class="text-sm text-slate-600 dark:text-slate-300 mb-4">
            أدخلي رمز التفعيل الذي وصلكِ بعد الاشتراك
          </p>
        `}

        <div class="text-right mb-3">
          <label class="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">رمز التفعيل (السيريال)</label>
          <input type="text" id="license-serial-input" dir="ltr"
            class="w-full px-3 py-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-900 text-center font-mono text-sm tracking-wide"
            placeholder="AM-20261231-GEN-XXXXXX" autocomplete="off">
        </div>
        <p id="license-error" class="text-rose-600 text-sm mb-3 hidden"></p>
        <button type="button" id="license-activate-btn"
          class="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition">
          تفعيل الترخيص
        </button>
        <button type="button" id="license-continue-limited"
          class="w-full mt-2 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm">
          المتابعة بالوضع المحدود (قوائم وتقارير فقط)
        </button>
        <p class="text-xs text-slate-400 mt-4">التفعيل يتم على هذا الجهاز بدون إنترنت</p>
      </div>
    </div>
  `;
}

function showLicenseGate() {
  // إخفاء التطبيق
  const app = document.getElementById('app');
  if (app) app.style.display = 'none';
  document.getElementById('app-signature')?.style.setProperty('display', 'none');

  let gate = document.getElementById('license-gate');
  if (gate) gate.remove();

  const status = getLicenseStatus();
  document.body.insertAdjacentHTML('beforeend', renderLicenseGate(status));

  document.getElementById('license-activate-btn')?.addEventListener('click', () => {
    const input = document.getElementById('license-serial-input');
    const err = document.getElementById('license-error');
    const result = activateLicense(input?.value || '');
    if (!result.ok) {
      if (err) {
        err.textContent = result.reason || 'فشل التفعيل';
        err.classList.remove('hidden');
      }
      return;
    }
    // نجاح
    document.getElementById('license-gate')?.remove();
    if (app) app.style.display = '';
    document.getElementById('app-signature')?.style.setProperty('display', '');
    window.__licenseRestricted = false;
    if (typeof updateLicenseBanner === 'function') updateLicenseBanner();
    if (typeof showToast === 'function') {
      showToast(`تم التفعيل بنجاح — ساري حتى ${result.endDate} (${result.daysLeft} يوم)`);
    }
    if (typeof bootstrapApp === 'function') bootstrapApp();
    else if (typeof navigate === 'function') navigate('dashboard');
  });

  document.getElementById('license-serial-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('license-activate-btn')?.click();
  });

  document.getElementById('license-continue-limited')?.addEventListener('click', () => {
    document.getElementById('license-gate')?.remove();
    if (app) app.style.display = '';
    document.getElementById('app-signature')?.style.setProperty('display', '');
    window.__licenseRestricted = true;
    if (typeof updateLicenseBanner === 'function') updateLicenseBanner();
    if (typeof bootstrapApp === 'function') bootstrapApp();
    else if (typeof navigate === 'function') navigate('members');
  });
}

/** الصفحات المسموحة بدون ترخيص ساري */
const RESTRICTED_ALLOWED_PAGES = ['members', 'employees', 'reports', 'settings', 'notifications'];

function isPageAllowedWithoutLicense(page) {
  return RESTRICTED_ALLOWED_PAGES.includes(page);
}

function isAppRestricted() {
  return !!window.__licenseRestricted;
}

function updateLicenseBanner() {
  let bar = document.getElementById('license-banner');
  const status = getLicenseStatus();
  if (status.status === 'active') {
    window.__licenseRestricted = false;
    bar?.remove();
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.remove('opacity-40', 'pointer-events-none');
    });
    return;
  }
  window.__licenseRestricted = true;
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'license-banner';
    bar.className = 'sticky top-0 z-50 px-4 py-2.5 text-sm text-center text-white';
    bar.style.background = 'linear-gradient(90deg,#b91c1c,#c2410c)';
    const header = document.querySelector('header');
    if (header) header.insertAdjacentElement('afterend', bar);
    else document.body.prepend(bar);
  }
  const msg = status.status === 'expired'
    ? `انتهى الترخيص بتاريخ ${status.endDate || '—'} — الوضع المحدود مفعّل (قوائم / تقارير / نسخ احتياطي / تفعيل سيريال فقط)`
    : 'الترخيص غير مفعّل — الوضع المحدود: تصدير القوائم والتقارير والنسخ الاحتياطي وتفعيل سيريال فقط';
  bar.innerHTML = `
    <div class="flex flex-col sm:flex-row items-center justify-center gap-2 max-w-5xl mx-auto">
      <span>${msg}</span>
      <button type="button" onclick="showLicenseGate()" class="bg-white text-rose-700 font-bold px-3 py-1 rounded-lg text-xs shrink-0">تفعيل / تجديد السيريال</button>
    </div>
  `;
  // تعطيل عناصر القائمة غير المسموحة بصرياً
  document.querySelectorAll('.nav-item').forEach(el => {
    const page = el.dataset.page;
    if (page && !isPageAllowedWithoutLicense(page)) {
      el.classList.add('opacity-40');
    } else {
      el.classList.remove('opacity-40');
    }
  });
}

function ensureLicenseOrGate() {
  const status = getLicenseStatus();
  if (status.status === 'active') {
    window.__licenseRestricted = false;
    return true;
  }
  // وضع محدود بدل الإغلاق الكامل — يقدرون يصدّرون بياناتهم ويجددون
  window.__licenseRestricted = true;
  return true;
}

function guardFullFeature(actionName) {
  if (!isAppRestricted()) return true;
  if (typeof showToast === 'function') {
    showToast('هذه العملية تحتاج ترخيص ساري. صدّري بياناتك أو جدّدي السيريال من الإعدادات', 'error');
  }
  return false;
}
