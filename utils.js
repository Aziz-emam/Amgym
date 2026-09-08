// ===== أدوات مساعدة =====

function showToast(message, type = 'success', duration = 3500) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ'
  };
  toast.innerHTML = `<span class="font-bold text-lg">${icons[type] || '•'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function openModal(html, onClose) {
  const modals = document.getElementById('modals');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-content">${html}</div>`;
  modals.appendChild(overlay);

  const close = () => {
    overlay.remove();
    if (onClose) onClose();
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // bind close buttons
  overlay.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', close);
  });

  return { close, el: overlay };
}

function confirmDialog(title, message, onConfirm) {
  openModal(`
    <div class="p-6">
      <h3 class="text-lg font-bold mb-2">${title}</h3>
      <p class="text-slate-600 dark:text-slate-300 mb-6">${message}</p>
      <div class="flex gap-3 justify-end">
        <button data-close class="btn-secondary">إلغاء</button>
        <button id="confirm-yes" class="btn-danger">تأكيد</button>
      </div>
    </div>
  `, null);
  document.getElementById('confirm-yes').onclick = () => {
    document.querySelector('.modal-overlay')?.remove();
    onConfirm();
  };
}

function generateQRCode(text, containerId, size = 180) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';
  new QRCode(el, {
    text: text,
    width: size,
    height: size,
    colorDark: '#0f172a',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });
}

function prepareWhatsAppMessage(template, vars) {
  let msg = template;
  for (const [k, v] of Object.entries(vars)) {
    msg = msg.replaceAll(`{${k}}`, v || '');
  }
  return msg;
}

function openWhatsApp(phone, message) {
  // تنظيف رقم الجوال السعودي
  let clean = (phone || '').replace(/\D/g, '');
  if (clean.startsWith('05')) clean = '966' + clean.slice(1);
  if (clean.startsWith('5') && clean.length === 9) clean = '966' + clean;
  if (!clean.startsWith('966')) clean = '966' + clean;

  const url = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

function exportJSON() {
  const data = getData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gym-backup-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('تم تصدير النسخة الاحتياطية بنجاح');
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      saveData(data);
      showToast('تم استيراد البيانات بنجاح، جاري التحديث...');
      setTimeout(() => location.reload(), 800);
    } catch (err) {
      showToast('ملف غير صالح', 'error');
    }
  };
  reader.readAsText(file);
}

function applyTheme() {
  const data = getData();
  const root = document.documentElement;
  if (data.settings.darkMode) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  root.setAttribute('data-theme', data.settings.theme || 'teal');
  // update club name & logo
  const nameEl = document.getElementById('club-name');
  if (nameEl) nameEl.textContent = data.settings.clubName || 'نادي اللياقة النسائي';
  const logoEl = document.getElementById('club-logo');
  if (logoEl) {
    if (data.settings.clubLogo) {
      logoEl.innerHTML = `<img src="${data.settings.clubLogo}" class="w-full h-full rounded-full object-cover">`;
    } else {
      logoEl.textContent = (data.settings.clubName || 'ن')[0];
      logoEl.className = 'w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-lg shadow';
    }
  }
}

function formatMoney(n) {
  return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n || 0);
}

function statusBadge(status) {
  const map = {
    active: { text: 'سارية', cls: 'badge-active' },
    soon: { text: 'قريبة الانتهاء', cls: 'badge-soon' },
    expired: { text: 'منتهية', cls: 'badge-expired' },
    grace: { text: 'تجاوز', cls: 'badge-grace' }
  };
  const s = map[status] || map.active;
  return `<span class="badge ${s.cls}">${s.text}</span>`;
}

function avatar(name, photo, size = 'w-10 h-10') {
  if (photo) {
    return `<img src="${photo}" class="${size} rounded-full object-cover border-2 border-white shadow">`;
  }
  const initial = (name || '?')[0];
  return `<div class="${size} rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold shadow">${initial}</div>`;
}
