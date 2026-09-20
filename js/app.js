// ===== التطبيق الرئيسي =====

let currentPage = 'dashboard';

function navigate(page) {
  if (typeof isAppRestricted === 'function' && isAppRestricted()) {
    if (typeof isPageAllowedWithoutLicense === 'function' && !isPageAllowedWithoutLicense(page)) {
      showToast('غير متاح بدون ترخيص ساري. المتاح: المشتركات، الموظفات، التقارير، الإعدادات', 'error');
      page = 'members';
    }
  }
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.add('hidden');

  const main = document.getElementById('main-content');
  const pages = {
    dashboard: renderDashboard,
    members: renderMembers,
    attendance: renderAttendance,
    present: renderPresent,
    subscriptions: renderSubscriptions,
    employees: renderEmployees,
    salaries: renderSalaries,
    expenses: renderExpenses,
    reports: renderReports,
    notifications: renderNotifications,
    settings: renderSettings
  };
  main.innerHTML = (pages[page] || renderDashboard)();
  window.scrollTo(0, 0);
}

// ===== Members =====
function openAddMember() {
  if (typeof guardFullFeature === 'function' && !guardFullFeature()) return;
  const { el, close } = openModal(renderMemberForm(null));
  bindMemberFormLogic(el, null, (payload) => {
    const data = getData();
    const type = data.subscriptionTypes.find(t => t.id === payload.subType);
    const dur = type?.durations.find(d => d.id === payload.durationId);
    const id = generateMemberId(data);
    const start = todayStr();
    const unit = payload.unit || dur?.unit || 'months';
    const value = payload.value || dur?.value || 1;
    const end = calcEndDate(start, unit, value);

    const member = {
      id,
      name: payload.name,
      age: payload.age,
      phone: payload.phone,
      address: payload.address,
      notes: payload.notes,
      photo: payload.photo,
      subType: payload.subType,
      subTypeName: type?.name || '',
      durationId: payload.durationId,
      durationName: dur?.name || '',
      unit,
      value,
      startDate: start,
      endDate: end,
      visitCount: 0,
      lastVisit: null,
      createdAt: nowISO()
    };

    data.members.push(member);
    data.payments.push({
      id: 'p' + Date.now(),
      memberId: id,
      type: 'new',
      amount: payload.amount,
      method: payload.paymentMethod,
      date: start,
      notes: ''
    });
    saveData(data);
    close();
    showToast(`تم تسجيل ${member.name} بنجاح • رقم العضوية ${id}`);
    navigate('members');

    // عرض QR + خيار واتساب
    setTimeout(() => viewMemberQR(id, true), 400);
  });
}

function editMember(id) {
  const data = getData();
  const member = data.members.find(m => m.id === id);
  if (!member) return;
  const { el, close } = openModal(renderMemberForm(member));
  bindMemberFormLogic(el, member, (payload) => {
    Object.assign(member, {
      name: payload.name,
      age: payload.age,
      phone: payload.phone,
      address: payload.address,
      notes: payload.notes,
      photo: payload.photo || member.photo
    });
    saveData(data);
    close();
    showToast('تم حفظ التعديلات');
    navigate('members');
  });
}

function openRenewMember(id) {
  const data = getData();
  const member = data.members.find(m => m.id === id);
  if (!member) return;
  const { el, close } = openModal(renderRenewForm(member));

  const typeSelect = el.querySelector('#renew-type');
  const durSelect = el.querySelector('#renew-duration');
  const amountInput = el.querySelector('#renew-amount');

  function fillDurations() {
    const type = data.subscriptionTypes.find(t => t.id === typeSelect.value);
    durSelect.innerHTML = '<option value="">اختر المدة</option>';
    if (type) {
      type.durations.forEach(d => {
        durSelect.innerHTML += `<option value="${d.id}" data-price="${d.price}" data-unit="${d.unit || 'months'}" data-value="${d.value || d.months || 1}">${d.name} — ${d.price} ر.س</option>`;
      });
    }
  }
  fillDurations();
  typeSelect.addEventListener('change', fillDurations);
  durSelect.addEventListener('change', () => {
    const opt = durSelect.selectedOptions[0];
    if (opt?.dataset.price) amountInput.value = opt.dataset.price;
  });

  el.querySelector('#renew-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const type = data.subscriptionTypes.find(t => t.id === fd.get('subType'));
    const dur = type?.durations.find(d => d.id === fd.get('durationId'));
    const opt = durSelect.selectedOptions[0];
    const unit = opt?.dataset.unit || dur?.unit || 'months';
    const value = Number(opt?.dataset.value || dur?.value || 1);
    const amount = Number(fd.get('amount'));

    // تجديد من تاريخ الانتهاء الحالي أو من اليوم إذا منتهي
    const base = member.endDate && member.endDate > todayStr() ? member.endDate : todayStr();
    member.endDate = calcEndDate(base, unit, value);
    member.subType = fd.get('subType');
    member.subTypeName = type?.name || '';
    member.durationId = fd.get('durationId');
    member.durationName = dur?.name || '';
    member.unit = unit;
    member.value = value;
    member.graceDays = 0;

    data.payments.push({
      id: 'p' + Date.now(),
      memberId: member.id,
      type: 'renew',
      amount,
      method: fd.get('paymentMethod'),
      date: todayStr(),
      notes: fd.get('notes') || ''
    });
    saveData(data);
    close();
    showToast(`تم تجديد اشتراك ${member.name} حتى ${formatDate(member.endDate)}`);
    navigate('members');

    // واتساب تجديد + صورة الباركود
    setTimeout(() => {
      const msg = prepareWhatsAppMessage(data.settings.whatsappMessages.renew, {
        name: member.name,
        club: data.settings.clubName,
        id: member.id,
        type: member.subTypeName,
        duration: member.durationName,
        endDate: formatDate(member.endDate)
      });
      if (confirm('تبين ترسلي رسالة التجديد مع الباركود على واتساب؟')) {
        sendWhatsAppWithQR(member.phone, msg, member.id, member.name);
      }
    }, 300);
  });
}

function deleteMember(id) {
  confirmDialog('حذف المشتركة', 'هل أنتِ متأكدة من حذف هذه المشتركة؟ لا يمكن التراجع.', () => {
    updateData(d => {
      d.members = d.members.filter(m => m.id !== id);
      d.present = d.present.filter(p => p.memberId !== id);
      return d;
    });
    showToast('تم الحذف');
    navigate('members');
  });
}

function viewMemberQR(id, afterCreate = false) {
  const data = getData();
  const m = data.members.find(x => x.id === id);
  if (!m) return;
  const qrData = `GYM-${m.id}`;
  openModal(`
    <div class="p-6 text-center">
      <h3 class="text-xl font-bold mb-1">${m.name}</h3>
      <p class="text-slate-500 text-sm mb-4">رقم العضوية: ${m.id}</p>
      <div class="qr-box mx-auto mb-4" id="qr-preview"></div>
      <p class="text-xs text-slate-400 mb-4">امسحي هذا الكود لتسجيل الدخول والخروج</p>
      <div class="flex flex-col sm:flex-row gap-2 justify-center flex-wrap">
        <button onclick="sendWhatsAppMember('${m.id}')" class="btn-primary justify-center">إرسال واتساب + الباركود</button>
        <button onclick="downloadMemberQR('${m.id}', '${(m.name || '').replace(/'/g, '')}')" class="btn-secondary justify-center">تحميل صورة الباركود</button>
        <button data-close class="btn-secondary justify-center">إغلاق</button>
      </div>
    </div>
  `);
  setTimeout(() => generateQRCode(qrData, 'qr-preview', 200), 50);
}

function sendWhatsAppMember(id) {
  const data = getData();
  const m = data.members.find(x => x.id === id);
  if (!m) return;
  const msg = prepareWhatsAppMessage(data.settings.whatsappMessages.newMember, {
    name: m.name,
    club: data.settings.clubName,
    id: m.id,
    type: m.subTypeName,
    duration: m.durationName,
    endDate: formatDate(m.endDate)
  });
  // نص + صورة الباركود (تحميل أو مشاركة مباشرة)
  sendWhatsAppWithQR(m.phone, msg, m.id, m.name);
}

async function downloadMemberQR(id, name) {
  try {
    const blob = await buildQRImageBlob(`GYM-${id}`, 300);
    downloadBlob(blob, `باركود-${id}-${(name || '').replace(/\s+/g, '-')}.png`);
    showToast('تم تحميل صورة الباركود');
  } catch (e) {
    showToast('فشل تحميل الصورة', 'error');
  }
}

// ===== Attendance =====
function resolveMemberFromInput(raw) {
  const q = (raw || '').trim();
  if (!q) return null;
  const data = getData();
  // بالرقم أو GYM-xxx
  const byId = q.replace(/^GYM-/i, '');
  let member = data.members.find(m => m.id === byId);
  if (member) return member;
  // بالاسم (تطابق جزئي)
  const lower = q.toLowerCase();
  const matches = data.members.filter(m => (m.name || '').toLowerCase().includes(lower));
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    showToast('في أكثر من مشتركة بهذا الاسم، اختاري من القائمة أو أدخلي الرقم', 'info');
    return null;
  }
  return null;
}

function filterAttendanceSuggestions(q) {
  const box = document.getElementById('attendance-suggestions');
  const list = document.getElementById('member-suggestions');
  if (!box) return;
  const query = (q || '').trim().toLowerCase();
  if (query.length < 1) {
    box.classList.add('hidden');
    box.innerHTML = '';
    return;
  }
  const data = getData();
  const matches = data.members.filter(m =>
    (m.name || '').toLowerCase().includes(query) ||
    (m.id || '').includes(query) ||
    (m.phone || '').includes(query)
  ).slice(0, 8);
  if (matches.length === 0) {
    box.classList.add('hidden');
    return;
  }
  box.classList.remove('hidden');
  box.innerHTML = matches.map(m => `
    <button type="button" class="w-full text-right px-3 py-2 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/30 text-sm flex justify-between"
      onclick="document.getElementById('attendance-code').value='${m.id}'; document.getElementById('attendance-suggestions').classList.add('hidden');">
      <span class="font-medium">${m.name}</span>
      <span class="text-slate-400 font-mono">${m.id}</span>
    </button>
  `).join('');
  if (list) {
    list.innerHTML = matches.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
  }
}

function openQRScanner() {
  openModal(`
    <div class="p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-bold">مسح الباركود / QR</h3>
        <button data-close class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">✕</button>
      </div>
      <div id="qr-reader" class="w-full rounded-xl overflow-hidden bg-black min-h-[260px]"></div>
      <p class="text-xs text-slate-400 text-center mt-3">وجهي الكاميرا نحو كود العضوية</p>
      <div id="qr-scan-result" class="text-center mt-2 text-sm text-teal-600 font-medium"></div>
    </div>
  `);
  // تحميل مكتبة المسح إن لم تكن موجودة
  if (!window.Html5Qrcode) {
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
    s.onload = () => startQRScanner();
    document.head.appendChild(s);
  } else {
    startQRScanner();
  }
}

function startQRScanner() {
  const el = document.getElementById('qr-reader');
  if (!el || !window.Html5Qrcode) return;
  const scanner = new Html5Qrcode('qr-reader');
  window._qrScanner = scanner;
  scanner.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 220, height: 220 } },
    (decoded) => {
      const id = decoded.replace(/^GYM-/i, '').trim();
      const input = document.getElementById('attendance-code');
      if (input) input.value = id;
      document.getElementById('qr-scan-result').textContent = 'تم المسح: ' + id;
      scanner.stop().then(() => {
        document.querySelector('.modal-overlay')?.remove();
        showToast('تم قراءة الكود بنجاح');
      }).catch(() => {});
    },
    () => {}
  ).catch(err => {
    document.getElementById('qr-scan-result').textContent = 'ما قدرنا نفتح الكاميرا. تأكدي من الصلاحيات.';
    console.error(err);
  });
  // إيقاف عند إغلاق المودال
  const overlay = document.querySelector('.modal-overlay');
  if (overlay) {
    const orig = overlay.onclick;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay && window._qrScanner) {
        window._qrScanner.stop().catch(() => {});
      }
    });
  }
}

function doCheckIn() {
  const raw = document.getElementById('attendance-code')?.value.trim();
  if (!raw) return showToast('أدخلي الاسم أو رقم العضوية', 'error');
  const member = resolveMemberFromInput(raw);
  if (!member) return showToast('ما لقينا المشتركة. جربي الرقم أو اختاري من القائمة', 'error');
  const id = member.id;
  const data = getData();

  if (data.present.some(p => p.memberId === id)) {
    return showToast('المشتركة متواجدة أصلاً', 'info');
  }

  data.present.push({ memberId: id, checkIn: nowISO() });
  data.attendance.push({
    memberId: id,
    checkIn: nowISO(),
    checkOut: null,
    date: todayStr(),
    durationMinutes: 0
  });
  member.visitCount = (member.visitCount || 0) + 1;
  member.lastVisit = todayStr();

  if (member.endDate && member.endDate < todayStr()) {
    member.graceDays = calcGraceDays(member, data.attendance);
  }

  saveData(data);
  showToast(`تم تسجيل دخول ${member.name}`);
  const input = document.getElementById('attendance-code');
  if (input) input.value = '';
  document.getElementById('attendance-suggestions')?.classList.add('hidden');
  if (currentPage === 'attendance') navigate('attendance');
  else if (currentPage === 'present') navigate('present');
}

function doCheckOut() {
  const raw = document.getElementById('attendance-code')?.value.trim();
  if (!raw) return showToast('أدخلي الاسم أو رقم العضوية', 'error');
  const member = resolveMemberFromInput(raw);
  if (!member) return showToast('ما لقينا المشتركة', 'error');
  doCheckOutById(member.id);
}

function doCheckOutById(id) {
  const data = getData();
  const idx = data.present.findIndex(p => p.memberId === id);
  if (idx === -1) return showToast('المشتركة غير متواجدة', 'error');

  const presentRec = data.present[idx];
  const att = data.attendance.find(a => a.memberId === id && !a.checkOut && a.date === todayStr());
  if (att) {
    att.checkOut = nowISO();
    att.durationMinutes = Math.floor((new Date(att.checkOut) - new Date(att.checkIn)) / 60000);
  }
  data.present.splice(idx, 1);
  saveData(data);
  const m = data.members.find(x => x.id === id);
  showToast(`تم تسجيل خروج ${m?.name || id}`);
  if (currentPage === 'attendance' || currentPage === 'present') navigate(currentPage);
}

// ===== Subscriptions pricing =====
function openAddSubType() {
  openModal(`
    <div class="p-6">
      <h3 class="text-xl font-bold mb-4">إضافة نوع اشتراك</h3>
      <form id="add-type-form" class="space-y-3">
        <div class="form-group">
          <label class="form-label">اسم النوع</label>
          <input name="name" class="form-input" required placeholder="مثال: يوغا">
        </div>
        <p class="text-sm text-slate-500">بعد الإضافة تقدري تعدلين الأسعار والمدة</p>
        <div class="flex gap-2">
          <button type="submit" class="btn-primary flex-1 justify-center">إضافة</button>
          <button type="button" data-close class="btn-secondary">إلغاء</button>
        </div>
      </form>
    </div>
  `);
  document.getElementById('add-type-form').onsubmit = (e) => {
    e.preventDefault();
    const name = new FormData(e.target).get('name').trim();
    updateData(d => {
      d.subscriptionTypes.push({
        id: 't' + Date.now(),
        name,
        durations: [
          { id: '1d', name: 'يوم', unit: 'days', value: 1, price: 25 },
          { id: '15d', name: 'نصف شهر', unit: 'days', value: 15, price: 100 },
          { id: '1m', name: 'شهر', unit: 'months', value: 1, price: 200 },
          { id: '3m', name: 'ثلاثة أشهر', unit: 'months', value: 3, price: 500 },
          { id: '6m', name: 'ستة أشهر', unit: 'months', value: 6, price: 900 },
          { id: '12m', name: 'سنة', unit: 'months', value: 12, price: 1600 }
        ]
      });
      return d;
    });
    document.querySelector('.modal-overlay')?.remove();
    showToast('تمت الإضافة');
    navigate('subscriptions');
  };
}

function editSubType(id) {
  const data = getData();
  const type = data.subscriptionTypes.find(t => t.id === id);
  if (!type) return;
  openModal(`
    <div class="p-6">
      <h3 class="text-xl font-bold mb-4">تعديل: ${type.name}</h3>
      <form id="edit-type-form" class="space-y-3">
        <div class="form-group">
          <label class="form-label">اسم النوع</label>
          <input name="name" class="form-input" value="${type.name}" required>
        </div>
        <p class="text-xs text-slate-500 mb-2">تقدري تحددين المدة بالأيام أو بالأشهر لكل خيار</p>
        ${type.durations.map((d, i) => `
          <div class="border border-slate-200 dark:border-slate-600 rounded-xl p-3 space-y-2">
            <div class="form-group mb-0">
              <label class="form-label">اسم المدة</label>
              <input name="dname_${i}" class="form-input" value="${d.name}" required>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div class="form-group mb-0">
                <label class="form-label">السعر (ر.س)</label>
                <input type="number" name="price_${i}" class="form-input" value="${d.price}" min="0">
              </div>
              <div class="form-group mb-0">
                <label class="form-label">الوحدة</label>
                <select name="unit_${i}" class="form-input">
                  <option value="days" ${(d.unit || 'months') === 'days' ? 'selected' : ''}>أيام</option>
                  <option value="months" ${(d.unit || 'months') === 'months' ? 'selected' : ''}>أشهر</option>
                </select>
              </div>
              <div class="form-group mb-0">
                <label class="form-label">العدد</label>
                <input type="number" name="value_${i}" class="form-input" value="${d.value || d.months || 1}" min="1">
              </div>
            </div>
          </div>
        `).join('')}
        <div class="flex gap-2 pt-2">
          <button type="submit" class="btn-primary flex-1 justify-center">حفظ</button>
          <button type="button" data-close class="btn-secondary">إلغاء</button>
        </div>
      </form>
    </div>
  `);
  document.getElementById('edit-type-form').onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    type.name = fd.get('name');
    type.durations.forEach((d, i) => {
      d.name = fd.get('dname_' + i);
      d.price = Number(fd.get('price_' + i));
      d.unit = fd.get('unit_' + i) || 'months';
      d.value = Number(fd.get('value_' + i) || 1);
      // توافق قديم
      if (d.unit === 'months') d.months = d.value;
    });
    saveData(data);
    document.querySelector('.modal-overlay')?.remove();
    showToast('تم الحفظ');
    navigate('subscriptions');
  };
}

function deleteSubType(id) {
  confirmDialog('حذف النوع', 'هل أنتِ متأكدة؟', () => {
    updateData(d => {
      d.subscriptionTypes = d.subscriptionTypes.filter(t => t.id !== id);
      return d;
    });
    showToast('تم الحذف');
    navigate('subscriptions');
  });
}

// ===== Employees =====
function openAddEmployee() {
  openModal(`
    <div class="p-6">
      <h3 class="text-xl font-bold mb-4">إضافة موظفة</h3>
      <form id="emp-form" class="space-y-3">
        <div class="form-group"><label class="form-label">الاسم *</label><input name="name" class="form-input" required></div>
        <div class="form-group"><label class="form-label">الجوال</label><input name="phone" class="form-input" dir="ltr"></div>
        <div class="form-group"><label class="form-label">رقم الهوية</label><input name="nationalId" class="form-input"></div>
        <div class="form-group"><label class="form-label">تاريخ التوظيف</label><input type="date" name="hireDate" class="form-input" value="${todayStr()}"></div>
        <div class="form-group"><label class="form-label">الراتب الأساسي</label><input type="number" name="baseSalary" class="form-input" value="0"></div>
        <div class="form-group"><label class="form-label">ملاحظات</label><textarea name="notes" class="form-input" rows="2"></textarea></div>
        <div class="flex gap-2">
          <button type="submit" class="btn-primary flex-1 justify-center">حفظ</button>
          <button type="button" data-close class="btn-secondary">إلغاء</button>
        </div>
      </form>
    </div>
  `);
  document.getElementById('emp-form').onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    updateData(d => {
      d.employees.push({
        id: 'e' + (d.nextEmployeeId++),
        name: fd.get('name'),
        phone: fd.get('phone'),
        nationalId: fd.get('nationalId'),
        hireDate: fd.get('hireDate'),
        baseSalary: Number(fd.get('baseSalary')),
        notes: fd.get('notes'),
        photo: null,
        lastSalaryDate: null
      });
      return d;
    });
    document.querySelector('.modal-overlay')?.remove();
    showToast('تمت إضافة الموظفة');
    navigate('employees');
  };
}

function editEmployee(id) {
  const data = getData();
  const emp = data.employees.find(e => e.id === id);
  if (!emp) return;
  openModal(`
    <div class="p-6">
      <h3 class="text-xl font-bold mb-4">تعديل موظفة</h3>
      <form id="emp-edit-form" class="space-y-3">
        <div class="form-group"><label class="form-label">الاسم</label><input name="name" class="form-input" value="${emp.name}" required></div>
        <div class="form-group"><label class="form-label">الجوال</label><input name="phone" class="form-input" value="${emp.phone || ''}" dir="ltr"></div>
        <div class="form-group"><label class="form-label">الراتب الأساسي</label><input type="number" name="baseSalary" class="form-input" value="${emp.baseSalary || 0}"></div>
        <div class="form-group"><label class="form-label">ملاحظات</label><textarea name="notes" class="form-input" rows="2">${emp.notes || ''}</textarea></div>
        <div class="flex gap-2">
          <button type="submit" class="btn-primary flex-1 justify-center">حفظ</button>
          <button type="button" data-close class="btn-secondary">إلغاء</button>
        </div>
      </form>
    </div>
  `);
  document.getElementById('emp-edit-form').onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    emp.name = fd.get('name');
    emp.phone = fd.get('phone');
    emp.baseSalary = Number(fd.get('baseSalary'));
    emp.notes = fd.get('notes');
    saveData(data);
    document.querySelector('.modal-overlay')?.remove();
    showToast('تم الحفظ');
    navigate('employees');
  };
}

function deleteEmployee(id) {
  confirmDialog('حذف الموظفة', 'هل أنتِ متأكدة؟', () => {
    updateData(d => { d.employees = d.employees.filter(e => e.id !== id); return d; });
    showToast('تم الحذف');
    navigate('employees');
  });
}

// ===== Salaries =====
function openAddSalary() {
  const data = getData();
  const opts = data.employees.map(e => `<option value="${e.id}">${e.name} (${formatMoney(e.baseSalary)})</option>`).join('');
  openModal(`
    <div class="p-6">
      <h3 class="text-xl font-bold mb-4">صرف راتب</h3>
      <form id="sal-form" class="space-y-3">
        <div class="form-group">
          <label class="form-label">الموظفة</label>
          <select name="employeeId" class="form-input" required>${opts || '<option value="">لا يوجد موظفات</option>'}</select>
        </div>
        <div class="form-group">
          <label class="form-label">المبلغ</label>
          <input type="number" name="amount" class="form-input" required min="0">
        </div>
        <div class="form-group">
          <label class="form-label">التاريخ</label>
          <input type="date" name="date" class="form-input" value="${todayStr()}">
        </div>
        <div class="form-group">
          <label class="form-label">ملاحظات</label>
          <textarea name="notes" class="form-input" rows="2"></textarea>
        </div>
        <div class="flex gap-2">
          <button type="submit" class="btn-primary flex-1 justify-center">صرف</button>
          <button type="button" data-close class="btn-secondary">إلغاء</button>
        </div>
      </form>
    </div>
  `);
  document.getElementById('sal-form').onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const empId = fd.get('employeeId');
    const amount = Number(fd.get('amount'));
    updateData(d => {
      d.salaries.push({
        id: 's' + Date.now(),
        employeeId: empId,
        amount,
        date: fd.get('date'),
        notes: fd.get('notes')
      });
      const emp = d.employees.find(x => x.id === empId);
      if (emp) emp.lastSalaryDate = fd.get('date');
      // أضف كمصروف
      d.expenses.push({
        id: 'x' + Date.now(),
        category: 'رواتب',
        amount,
        date: fd.get('date'),
        notes: `راتب ${emp?.name || ''}`
      });
      return d;
    });
    document.querySelector('.modal-overlay')?.remove();
    showToast('تم صرف الراتب وإضافته للمصروفات');
    navigate('salaries');
  };
}

function deleteSalary(id) {
  confirmDialog('حذف', 'تأكيد الحذف؟', () => {
    updateData(d => { d.salaries = d.salaries.filter(s => s.id !== id); return d; });
    showToast('تم');
    navigate('salaries');
  });
}

// ===== Expenses =====
function openAddExpense() {
  const data = getData();
  const cats = data.expenseCategories.map(c => `<option value="${c}">${c}</option>`).join('');
  openModal(`
    <div class="p-6">
      <h3 class="text-xl font-bold mb-4">إضافة مصروف</h3>
      <form id="exp-form" class="space-y-3">
        <div class="form-group">
          <label class="form-label">الفئة</label>
          <select name="category" class="form-input">${cats}</select>
        </div>
        <div class="form-group">
          <label class="form-label">المبلغ</label>
          <input type="number" name="amount" class="form-input" required min="0">
        </div>
        <div class="form-group">
          <label class="form-label">التاريخ</label>
          <input type="date" name="date" class="form-input" value="${todayStr()}">
        </div>
        <div class="form-group">
          <label class="form-label">ملاحظات</label>
          <textarea name="notes" class="form-input" rows="2"></textarea>
        </div>
        <div class="flex gap-2">
          <button type="submit" class="btn-primary flex-1 justify-center">حفظ</button>
          <button type="button" data-close class="btn-secondary">إلغاء</button>
        </div>
      </form>
    </div>
  `);
  document.getElementById('exp-form').onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    updateData(d => {
      d.expenses.push({
        id: 'x' + Date.now(),
        category: fd.get('category'),
        amount: Number(fd.get('amount')),
        date: fd.get('date'),
        notes: fd.get('notes')
      });
      return d;
    });
    document.querySelector('.modal-overlay')?.remove();
    showToast('تم إضافة المصروف');
    navigate('expenses');
  };
}

function deleteExpense(id) {
  confirmDialog('حذف', 'تأكيد؟', () => {
    updateData(d => { d.expenses = d.expenses.filter(e => e.id !== id); return d; });
    showToast('تم');
    navigate('expenses');
  });
}

// ===== Reports =====
function generateCustomReport() {
  const from = document.getElementById('report-from').value;
  const to = document.getElementById('report-to').value;
  const type = document.getElementById('report-type').value;
  const data = getData();
  let html = '';

  if (type === 'profit') {
    const pays = data.payments.filter(p => p.date >= from && p.date <= to);
    const exps = data.expenses.filter(e => e.date >= from && e.date <= to);
    const income = pays.reduce((s, p) => s + (p.amount || 0), 0);
    const expense = exps.reduce((s, e) => s + (e.amount || 0), 0);
    const net = income - expense;
    const cash = pays.filter(p => p.method === 'cash').reduce((s, p) => s + p.amount, 0);
    const transfer = pays.filter(p => p.method === 'transfer').reduce((s, p) => s + p.amount, 0);
    html = `
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div class="p-4 rounded-xl bg-teal-50 dark:bg-teal-900/20">
          <p class="text-sm text-slate-500">إجمالي الإيرادات</p>
          <p class="text-xl font-bold text-teal-700 dark:text-teal-300">${formatMoney(income)}</p>
          <p class="text-xs mt-1">نقدي: ${formatMoney(cash)} · تحويل: ${formatMoney(transfer)}</p>
        </div>
        <div class="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20">
          <p class="text-sm text-slate-500">إجمالي المصروفات</p>
          <p class="text-xl font-bold text-rose-700 dark:text-rose-300">${formatMoney(expense)}</p>
        </div>
        <div class="p-4 rounded-xl ${net >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}">
          <p class="text-sm text-slate-500">صافي الربح</p>
          <p class="text-xl font-bold">${formatMoney(net)}</p>
          <p class="text-xs mt-1">إيرادات − مصروفات للفترة</p>
        </div>
      </div>
      <p class="text-sm text-slate-500">الفترة: ${formatDate(from)} → ${formatDate(to)} · عمليات إيراد: ${pays.length} · مصروفات: ${exps.length}</p>
    `;
  } else if (type === 'payments') {
    const list = data.payments.filter(p => p.date >= from && p.date <= to);
    const total = list.reduce((s, p) => s + p.amount, 0);
    html = `<p class="mb-3 font-medium">عدد العمليات: ${list.length} • الإجمالي: ${formatMoney(total)}</p>
      <div class="table-container"><table><thead><tr><th>التاريخ</th><th>النوع</th><th>المبلغ</th><th>الطريقة</th></tr></thead><tbody>
      ${list.map(p => `<tr><td>${formatDate(p.date)}</td><td>${p.type === 'new' ? 'جديد' : 'تجديد'}</td><td>${formatMoney(p.amount)}</td><td>${p.method === 'cash' ? 'نقدي' : 'تحويل'}</td></tr>`).join('')}
      </tbody></table></div>`;
  } else if (type === 'attendance') {
    const list = data.attendance.filter(a => a.date >= from && a.date <= to);
    html = `<p class="mb-3">عدد الزيارات: ${list.length}</p>`;
  } else if (type === 'expenses') {
    const list = data.expenses.filter(e => e.date >= from && e.date <= to);
    const total = list.reduce((s, e) => s + e.amount, 0);
    html = `<p class="mb-3">الإجمالي: ${formatMoney(total)}</p>
      <div class="table-container"><table><thead><tr><th>التاريخ</th><th>الفئة</th><th>المبلغ</th></tr></thead><tbody>
      ${list.map(e => `<tr><td>${formatDate(e.date)}</td><td>${e.category}</td><td>${formatMoney(e.amount)}</td></tr>`).join('')}
      </tbody></table></div>`;
  } else if (type === 'salaries') {
    const list = data.salaries.filter(s => s.date >= from && s.date <= to);
    html = `<p class="mb-3">عدد الرواتب: ${list.length} • ${formatMoney(list.reduce((s,x)=>s+x.amount,0))}</p>`;
  } else if (type === 'expired') {
    const list = data.members.filter(m => m.endDate && m.endDate < todayStr());
    html = `<p class="mb-3">${list.length} مشتركة منتهية</p>
      <ul class="space-y-1">${list.map(m => `<li>${m.name} — انتهى ${formatDate(m.endDate)}</li>`).join('')}</ul>`;
  }

  document.getElementById('custom-report-result').innerHTML = html || '<p class="text-slate-400">ما في بيانات</p>';
}

// ===== Shifts =====
function openShift() {
  const data = getData();
  const opts = data.employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('') || '<option value="admin">مديرة النظام</option>';
  openModal(`
    <div class="p-6">
      <h3 class="text-xl font-bold mb-4">فتح وردية</h3>
      <form id="shift-form" class="space-y-3">
        <div class="form-group">
          <label class="form-label">الموظفة المسؤولة</label>
          <select name="employeeId" class="form-input">${opts}</select>
        </div>
        <button type="submit" class="btn-primary w-full justify-center">فتح الوردية</button>
      </form>
    </div>
  `);
  document.getElementById('shift-form').onsubmit = (e) => {
    e.preventDefault();
    const empId = new FormData(e.target).get('employeeId');
    const emp = data.employees.find(x => x.id === empId);
    updateData(d => {
      d.currentShift = {
        employeeId: empId,
        employeeName: emp?.name || 'مديرة النظام',
        date: todayStr(),
        openedAt: nowISO()
      };
      return d;
    });
    document.querySelector('.modal-overlay')?.remove();
    showToast('تم فتح الوردية');
    navigate('shifts');
  };
}

function closeShift() {
  const data = getData();
  if (!data.currentShift) return;
  const today = todayStr();
  const income = data.payments.filter(p => p.date === today).reduce((s, p) => s + p.amount, 0);
  const expense = data.expenses.filter(e => e.date === today).reduce((s, e) => s + e.amount, 0);
  const shiftReport = {
    ...data.currentShift,
    closedAt: nowISO(),
    income,
    expense,
    net: income - expense,
    newSubs: data.payments.filter(p => p.date === today && p.type === 'new').length,
    renews: data.payments.filter(p => p.date === today && p.type === 'renew').length,
    attendance: data.attendance.filter(a => a.date === today).length
  };
  updateData(d => {
    d.shifts.push(shiftReport);
    d.currentShift = null;
    return d;
  });
  showToast(`تم إغلاق الوردية • صافي اليوم ${formatMoney(shiftReport.net)}`);
  navigate('shifts');
}

// ===== Settings =====
function saveClubIdentity() {
  const name = document.getElementById('set-club-name').value.trim();
  updateData(d => {
    d.settings.clubName = name || d.settings.clubName;
    return d;
  });
  const file = document.getElementById('set-logo').files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      updateData(d => { d.settings.clubLogo = e.target.result; return d; });
      applyTheme();
      showToast('تم حفظ الهوية');
    };
    reader.readAsDataURL(file);
  } else {
    applyTheme();
    showToast('تم حفظ الاسم');
  }
}

function setTheme(theme) {
  updateData(d => { d.settings.theme = theme; return d; });
  applyTheme();
  showToast('تم تغيير الثيم');
}

function setBgTheme(bgTheme) {
  updateData(d => { d.settings.bgTheme = bgTheme; return d; });
  applyTheme();
  showToast('تم تغيير شكل الخلفية');
  if (currentPage === 'settings') navigate('settings');
}

function applyCustomColor(hex) {
  if (!hex) return;
  const root = document.documentElement;
  root.style.setProperty('--color-primary', hex);
  root.style.setProperty('--color-primary-dark', hex);
  root.style.setProperty('--sig-color1', hex);
  root.style.setProperty('--sig-color2', hex);
}

function saveCustomColor(hex) {
  updateData(d => {
    d.settings.primaryColor = hex;
    d.settings.theme = 'custom';
    return d;
  });
  applyTheme();
  showToast('تم حفظ اللون');
}

function toggleDark() {
  updateData(d => { d.settings.darkMode = !d.settings.darkMode; return d; });
  applyTheme();
}

function saveMessages() {
  updateData(d => {
    d.settings.whatsappMessages.newMember = document.getElementById('msg-new').value;
    d.settings.whatsappMessages.renew = document.getElementById('msg-renew').value;
    return d;
  });
  showToast('تم حفظ الرسائل');
}

function openRenewLicenseBox() {
  openModal(`
    <div class="p-6">
      <h3 class="text-xl font-bold mb-2">تجديد الترخيص</h3>
      <p class="text-sm text-slate-500 mb-4">أدخلي السيريال الجديد بعد سداد التجديد</p>
      <input type="text" id="renew-serial-input" dir="ltr" class="form-input font-mono text-center mb-3" placeholder="AM-YYYYMMDD-TAG-XXXXXX">
      <p id="renew-serial-err" class="text-rose-600 text-sm mb-3 hidden"></p>
      <div class="flex gap-2">
        <button type="button" id="renew-serial-btn" class="btn-primary flex-1 justify-center">تفعيل</button>
        <button type="button" data-close class="btn-secondary">إلغاء</button>
      </div>
    </div>
  `);
  document.getElementById('renew-serial-btn').onclick = () => {
    const val = document.getElementById('renew-serial-input')?.value || '';
    const result = activateLicense(val);
    const err = document.getElementById('renew-serial-err');
    if (!result.ok) {
      if (err) {
        err.textContent = result.reason || 'فشل';
        err.classList.remove('hidden');
      }
      return;
    }
    document.querySelector('.modal-overlay')?.remove();
    showToast(`تم التجديد — ساري حتى ${result.endDate}`);
    navigate('settings');
  };
}

let appBootstrapped = false;

function bootstrapApp() {
  if (appBootstrapped) {
    if (typeof updateLicenseBanner === 'function') updateLicenseBanner();
    navigate(isAppRestricted && isAppRestricted() ? 'members' : 'dashboard');
    return;
  }
  appBootstrapped = true;

  // Sidebar toggle
  document.getElementById('menu-btn')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('hidden');
  });
  document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.add('hidden');
  });

  // Nav clicks
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(el.dataset.page);
    });
  });

  // Theme toggle
  document.getElementById('theme-toggle')?.addEventListener('click', toggleDark);

  // Enter key on attendance
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.activeElement?.id === 'attendance-code') {
      doCheckIn();
    }
  });

  if (typeof updateLicenseBanner === 'function') updateLicenseBanner();
  navigate(typeof isAppRestricted === 'function' && isAppRestricted() ? 'members' : 'dashboard');
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();

  // فحص الترخيص قبل تشغيل التطبيق
  if (!ensureLicenseOrGate()) {
    return; // شاشة التفعيل ظاهرة — بعد النجاح تستدعي bootstrapApp
  }

  bootstrapApp();
});
