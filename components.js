// ===== مكونات الواجهة =====

function renderStatCard(title, value, icon, color = 'teal', sub = '') {
  const colors = {
    teal: 'from-teal-500 to-teal-600',
    rose: 'from-rose-500 to-rose-600',
    amber: 'from-amber-500 to-amber-600',
    indigo: 'from-indigo-500 to-indigo-600',
    emerald: 'from-emerald-500 to-emerald-600',
    violet: 'from-violet-500 to-violet-600'
  };
  return `
    <div class="stat-card">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-1">${title}</p>
          <p class="text-2xl font-bold">${value}</p>
          ${sub ? `<p class="text-xs text-slate-400 mt-1">${sub}</p>` : ''}
        </div>
        <div class="w-11 h-11 rounded-xl bg-gradient-to-br ${colors[color] || colors.teal} flex items-center justify-center text-white shadow-lg">
          ${icon}
        </div>
      </div>
    </div>
  `;
}

function renderMemberForm(member = null, onSubmit) {
  const isEdit = !!member;
  const data = getData();
  const typesOptions = data.subscriptionTypes.map(t => 
    `<option value="${t.id}" ${member?.subType === t.id ? 'selected' : ''}>${t.name}</option>`
  ).join('');

  return `
    <div class="p-6">
      <div class="flex items-center justify-between mb-5">
        <h3 class="text-xl font-bold">${isEdit ? 'تعديل بيانات المشتركة' : 'تسجيل مشتركة جديدة'}</h3>
        <button data-close class="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">✕</button>
      </div>
      <form id="member-form" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label">الاسم الكامل *</label>
            <input type="text" name="name" class="form-input" required value="${member?.name || ''}" placeholder="مثال: نورة محمد">
          </div>
          <div class="form-group">
            <label class="form-label">العمر</label>
            <input type="number" name="age" class="form-input" min="10" max="80" value="${member?.age || ''}" placeholder="25">
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label">رقم الجوال *</label>
            <input type="tel" name="phone" class="form-input" required value="${member?.phone || ''}" placeholder="05xxxxxxxx" dir="ltr">
          </div>
          <div class="form-group">
            <label class="form-label">العنوان (اختياري)</label>
            <input type="text" name="address" class="form-input" value="${member?.address || ''}" placeholder="الحي / المدينة">
          </div>
        </div>
        ${!isEdit ? `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label">نوع الاشتراك *</label>
            <select name="subType" id="sub-type" class="form-input" required>
              <option value="">اختر النوع</option>
              ${typesOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">المدة *</label>
            <select name="durationId" id="sub-duration" class="form-input" required>
              <option value="">اختر المدة أولاً</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label">طريقة الدفع *</label>
            <select name="paymentMethod" class="form-input" required>
              <option value="cash">نقدي</option>
              <option value="transfer">تحويل بنكي</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">المبلغ (ريال) *</label>
            <input type="number" name="amount" id="pay-amount" class="form-input" required min="0" placeholder="يتملأ تلقائياً">
          </div>
        </div>
        ` : ''}
        <div class="form-group">
          <label class="form-label">ملاحظات</label>
          <textarea name="notes" class="form-input" rows="2" placeholder="أي ملاحظات إضافية...">${member?.notes || ''}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">صورة شخصية (اختياري)</label>
          <input type="file" name="photo" accept="image/*" class="form-input" id="photo-input">
          <div id="photo-preview" class="mt-2"></div>
        </div>
        <div class="flex gap-3 pt-2">
          <button type="submit" class="btn-primary flex-1 justify-center">
            ${isEdit ? 'حفظ التعديلات' : 'تسجيل الاشتراك'}
          </button>
          <button type="button" data-close class="btn-secondary">إلغاء</button>
        </div>
      </form>
    </div>
  `;
}

function bindMemberFormLogic(modalEl, member, callback) {
  const form = modalEl.querySelector('#member-form');
  const typeSelect = form.querySelector('#sub-type');
  const durSelect = form.querySelector('#sub-duration');
  const amountInput = form.querySelector('#pay-amount');
  const photoInput = form.querySelector('#photo-input');
  const photoPreview = form.querySelector('#photo-preview');

  if (typeSelect) {
    typeSelect.addEventListener('change', () => {
      const data = getData();
      const type = data.subscriptionTypes.find(t => t.id === typeSelect.value);
      durSelect.innerHTML = '<option value="">اختر المدة</option>';
      if (type) {
        type.durations.forEach(d => {
          durSelect.innerHTML += `<option value="${d.id}" data-price="${d.price}" data-months="${d.months}">${d.name} — ${d.price} ر.س</option>`;
        });
      }
      amountInput.value = '';
    });
  }

  if (durSelect) {
    durSelect.addEventListener('change', () => {
      const opt = durSelect.selectedOptions[0];
      if (opt && opt.dataset.price) {
        amountInput.value = opt.dataset.price;
      }
    });
  }

  if (photoInput) {
    photoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          photoPreview.innerHTML = `<img src="${ev.target.result}" class="w-20 h-20 rounded-full object-cover border-2 border-teal-500">`;
          form.dataset.photo = ev.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = {
      name: fd.get('name').trim(),
      age: fd.get('age') ? Number(fd.get('age')) : null,
      phone: fd.get('phone').trim(),
      address: fd.get('address')?.trim() || '',
      notes: fd.get('notes')?.trim() || '',
      photo: form.dataset.photo || member?.photo || null
    };

    if (!member) {
      payload.subType = fd.get('subType');
      payload.durationId = fd.get('durationId');
      payload.paymentMethod = fd.get('paymentMethod');
      payload.amount = Number(fd.get('amount'));
      const opt = durSelect.selectedOptions[0];
      payload.months = opt ? Number(opt.dataset.months) : 1;
    }

    callback(payload);
  });
}

function renderRenewForm(member) {
  const data = getData();
  const typesOptions = data.subscriptionTypes.map(t => 
    `<option value="${t.id}" ${member.subType === t.id ? 'selected' : ''}>${t.name}</option>`
  ).join('');

  return `
    <div class="p-6">
      <div class="flex items-center justify-between mb-5">
        <h3 class="text-xl font-bold">تجديد اشتراك — ${member.name}</h3>
        <button data-close class="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">✕</button>
      </div>
      <div class="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 mb-4 text-sm">
        <p>رقم العضوية: <strong>${member.id}</strong></p>
        <p>تاريخ الانتهاء الحالي: <strong>${formatDate(member.endDate)}</strong></p>
        <p>الحالة: ${statusBadge(getMemberStatus(member))}</p>
      </div>
      <form id="renew-form" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label">نوع الاشتراك *</label>
            <select name="subType" id="renew-type" class="form-input" required>
              ${typesOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">المدة *</label>
            <select name="durationId" id="renew-duration" class="form-input" required>
              <option value="">اختر المدة</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label">طريقة الدفع *</label>
            <select name="paymentMethod" class="form-input" required>
              <option value="cash">نقدي</option>
              <option value="transfer">تحويل بنكي</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">المبلغ (ريال) *</label>
            <input type="number" name="amount" id="renew-amount" class="form-input" required min="0">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">ملاحظات</label>
          <textarea name="notes" class="form-input" rows="2"></textarea>
        </div>
        <div class="flex gap-3 pt-2">
          <button type="submit" class="btn-primary flex-1 justify-center">تأكيد التجديد</button>
          <button type="button" data-close class="btn-secondary">إلغاء</button>
        </div>
      </form>
    </div>
  `;
}
