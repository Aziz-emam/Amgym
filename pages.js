// ===== صفحات التطبيق =====

function renderDashboard() {
  const data = getData();
  const today = todayStr();
  const members = data.members;
  const active = members.filter(m => getMemberStatus(m) === 'active' || getMemberStatus(m) === 'soon').length;
  const expired = members.filter(m => getMemberStatus(m) === 'expired').length;
  const soon = members.filter(m => getMemberStatus(m) === 'soon').length;
  const presentCount = data.present.length;
  const todayPayments = data.payments.filter(p => p.date === today);
  const todayIncome = todayPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const todayExpenses = data.expenses.filter(e => e.date === today).reduce((s, e) => s + (e.amount || 0), 0);

  // alerts
  const expireToday = members.filter(m => m.endDate === today);
  const expireSoon = members.filter(m => {
    if (!m.endDate || m.endDate < today) return false;
    const d = daysBetween(today, m.endDate);
    return d > 0 && d <= 7;
  });

  return `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold">لوحة التحكم</h2>
          <p class="text-slate-500 text-sm mt-1">${formatDate(today)} • مرحباً بك</p>
        </div>
        <button onclick="openAddMember()" class="btn-primary">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          مشتركة جديدة
        </button>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        ${renderStatCard('إجمالي المشتركات', members.length, '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>', 'teal')}
        ${renderStatCard('متواجدات الآن', presentCount, '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1z"/></svg>', 'emerald')}
        ${renderStatCard('منتهية', expired, '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>', 'rose')}
        ${renderStatCard('تنتهي خلال 7 أيام', soon, '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>', 'amber')}
        ${renderStatCard('إيرادات اليوم', formatMoney(todayIncome), '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>', 'indigo')}
        ${renderStatCard('مصروفات اليوم', formatMoney(todayExpenses), '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/></svg>', 'violet')}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="stat-card">
          <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
            <span class="w-2 h-2 bg-amber-500 rounded-full"></span>
            تنبيهات الاشتراكات
          </h3>
          ${expireToday.length === 0 && expireSoon.length === 0 ? 
            '<p class="text-slate-400 text-sm py-6 text-center">ما في تنبيهات حالياً ✨</p>' :
            `<div class="space-y-3 max-h-64 overflow-y-auto">
              ${expireToday.map(m => `
                <div class="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl">
                  <div class="flex items-center gap-3">
                    ${avatar(m.name, m.photo, 'w-9 h-9')}
                    <div>
                      <p class="font-medium text-sm">${m.name}</p>
                      <p class="text-xs text-rose-600">تنتهي اليوم</p>
                    </div>
                  </div>
                  <button onclick="openRenewMember('${m.id}')" class="text-xs btn-primary py-1 px-3">تجديد</button>
                </div>
              `).join('')}
              ${expireSoon.map(m => `
                <div class="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                  <div class="flex items-center gap-3">
                    ${avatar(m.name, m.photo, 'w-9 h-9')}
                    <div>
                      <p class="font-medium text-sm">${m.name}</p>
                      <p class="text-xs text-amber-700">تنتهي ${formatDate(m.endDate)}</p>
                    </div>
                  </div>
                  <button onclick="openRenewMember('${m.id}')" class="text-xs btn-secondary py-1 px-3">تجديد</button>
                </div>
              `).join('')}
            </div>`
          }
        </div>

        <div class="stat-card">
          <h3 class="font-bold text-lg mb-4">آخر الاشتراكات</h3>
          ${members.slice(-5).reverse().length === 0 ?
            '<p class="text-slate-400 text-sm py-6 text-center">ما في مشتركات بعد</p>' :
            `<div class="space-y-3">
              ${members.slice(-5).reverse().map(m => `
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    ${avatar(m.name, m.photo, 'w-9 h-9')}
                    <div>
                      <p class="font-medium text-sm">${m.name}</p>
                      <p class="text-xs text-slate-400">${m.subTypeName || ''} • ${formatDate(m.startDate)}</p>
                    </div>
                  </div>
                  ${statusBadge(getMemberStatus(m))}
                </div>
              `).join('')}
            </div>`
          }
        </div>
      </div>
    </div>
  `;
}

function renderMembers() {
  const data = getData();
  const members = data.members.map(m => {
    m.graceDays = calcGraceDays(m, data.attendance);
    m.status = getMemberStatus(m);
    return m;
  });

  return `
    <div class="space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold">المشتركات</h2>
          <p class="text-slate-500 text-sm">${members.length} مشتركة</p>
        </div>
        <div class="flex gap-2">
          <input type="search" id="member-search" placeholder="بحث بالاسم أو الجوال أو الرقم..." class="form-input max-w-xs" oninput="filterMembers(this.value)">
          <button onclick="openAddMember()" class="btn-primary whitespace-nowrap">
            + مشتركة جديدة
          </button>
        </div>
      </div>

      <div class="table-container bg-white dark:bg-slate-800">
        <table>
          <thead>
            <tr>
              <th>الصورة</th>
              <th>الاسم</th>
              <th>الجوال</th>
              <th>رقم العضوية</th>
              <th>الاشتراك</th>
              <th>البداية</th>
              <th>الانتهاء</th>
              <th>الزيارات</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody id="members-tbody">
            ${members.length === 0 ? `
              <tr><td colspan="10" class="text-center py-12 text-slate-400">ما في مشتركات مسجلة بعد. ابدئي بإضافة مشتركة جديدة.</td></tr>
            ` : members.map(m => `
              <tr data-search="${(m.name + m.phone + m.id).toLowerCase()}">
                <td>${avatar(m.name, m.photo, 'w-10 h-10')}</td>
                <td class="font-medium">${m.name}</td>
                <td dir="ltr">${m.phone}</td>
                <td class="font-mono text-sm">${m.id}</td>
                <td class="text-sm">${m.subTypeName || '—'} <span class="text-slate-400">(${m.durationName || ''})</span></td>
                <td class="text-sm">${formatDate(m.startDate)}</td>
                <td class="text-sm">${formatDate(m.endDate)}</td>
                <td>${m.visitCount || 0}</td>
                <td>${statusBadge(m.status)}${m.graceDays > 0 ? ` <span class="text-xs text-violet-600">(+${m.graceDays} يوم)</span>` : ''}</td>
                <td>
                  <div class="flex gap-1 flex-wrap">
                    <button onclick="viewMemberQR('${m.id}')" class="text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200" title="QR">QR</button>
                    <button onclick="openRenewMember('${m.id}')" class="text-xs px-2 py-1 rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-900/40">تجديد</button>
                    <button onclick="sendWhatsAppMember('${m.id}')" class="text-xs px-2 py-1 rounded-lg bg-green-50 text-green-700 dark:bg-green-900/40">واتساب</button>
                    <button onclick="editMember('${m.id}')" class="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/40">تعديل</button>
                    <button onclick="deleteMember('${m.id}')" class="text-xs px-2 py-1 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-900/40">حذف</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function filterMembers(q) {
  const query = q.toLowerCase().trim();
  document.querySelectorAll('#members-tbody tr[data-search]').forEach(tr => {
    tr.style.display = tr.dataset.search.includes(query) ? '' : 'none';
  });
}

function renderAttendance() {
  return `
    <div class="space-y-6">
      <div>
        <h2 class="text-2xl font-bold">الحضور والانصراف</h2>
        <p class="text-slate-500 text-sm mt-1">امسحي QR أو أدخلي رقم العضوية</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="stat-card">
          <h3 class="font-bold mb-4">تسجيل دخول / خروج</h3>
          <div class="space-y-4">
            <div class="form-group">
              <label class="form-label">رقم العضوية أو مسح QR</label>
              <input type="text" id="attendance-code" class="form-input text-center text-xl font-mono tracking-widest" placeholder="أدخلي الرقم أو امسحي" autofocus>
            </div>
            <div class="flex gap-3">
              <button onclick="doCheckIn()" class="btn-primary flex-1 justify-center">تسجيل دخول</button>
              <button onclick="doCheckOut()" class="btn-secondary flex-1 justify-center">تسجيل خروج</button>
            </div>
            <p class="text-xs text-slate-400 text-center">يمكنك استخدام كاميرا التابلت لمسح QR مباشرة (افتحي الكاميرا ووجهيها للكود)</p>
          </div>
        </div>

        <div class="stat-card">
          <h3 class="font-bold mb-4">آخر الحركات اليوم</h3>
          <div id="today-attendance-list" class="space-y-2 max-h-72 overflow-y-auto">
            ${renderTodayAttendance()}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderTodayAttendance() {
  const data = getData();
  const today = todayStr();
  const list = data.attendance.filter(a => a.date === today).slice(-15).reverse();
  if (list.length === 0) return '<p class="text-slate-400 text-sm text-center py-8">ما في حركات اليوم بعد</p>';
  return list.map(a => {
    const m = data.members.find(x => x.id === a.memberId);
    return `
      <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/40">
        <div class="flex items-center gap-3">
          ${avatar(m?.name, m?.photo, 'w-8 h-8')}
          <div>
            <p class="text-sm font-medium">${m?.name || a.memberId}</p>
            <p class="text-xs text-slate-400">${a.checkOut ? 'خروج' : 'دخول'} • ${formatTime(a.checkIn)}</p>
          </div>
        </div>
        <span class="text-xs ${a.checkOut ? 'text-slate-500' : 'text-emerald-600 font-medium'}">${a.checkOut ? formatTime(a.checkOut) : 'متواجدة'}</span>
      </div>
    `;
  }).join('');
}

function renderPresent() {
  const data = getData();
  const present = data.present.map(p => {
    const m = data.members.find(x => x.id === p.memberId);
    const minutes = Math.floor((Date.now() - new Date(p.checkIn).getTime()) / 60000);
    return { ...p, member: m, minutes };
  }).sort((a, b) => b.minutes - a.minutes);

  return `
    <div class="space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold">المتواجدات حالياً</h2>
          <p class="text-slate-500 text-sm">${present.length} مشتركة داخل النادي</p>
        </div>
        <button onclick="navigate('attendance')" class="btn-secondary">تسجيل حضور</button>
      </div>

      ${present.length === 0 ? `
        <div class="stat-card text-center py-16">
          <p class="text-4xl mb-3">🚪</p>
          <p class="text-slate-400">ما في أحد متواجد حالياً</p>
        </div>
      ` : `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          ${present.map(p => `
            <div class="stat-card">
              <div class="flex items-center gap-4">
                ${avatar(p.member?.name, p.member?.photo, 'w-14 h-14')}
                <div class="flex-1 min-w-0">
                  <p class="font-bold truncate">${p.member?.name || p.memberId}</p>
                  <p class="text-xs text-slate-400">دخلن الساعة ${formatTime(p.checkIn)}</p>
                  <p class="text-sm font-medium text-teal-600 mt-1">${Math.floor(p.minutes / 60)}س ${p.minutes % 60}د</p>
                  <div class="mt-1">${statusBadge(getMemberStatus(p.member || {}))}</div>
                </div>
              </div>
              <button onclick="doCheckOutById('${p.memberId}')" class="btn-secondary w-full mt-3 text-sm justify-center">تسجيل خروج</button>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

function renderSubscriptions() {
  const data = getData();
  return `
    <div class="space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold">تسعير الاشتراكات</h2>
          <p class="text-slate-500 text-sm">تحكمي كامل من هنا بدون تعديل برمجي</p>
        </div>
        <button onclick="openAddSubType()" class="btn-primary">+ نوع جديد</button>
      </div>

      <div class="space-y-4">
        ${data.subscriptionTypes.map(type => `
          <div class="stat-card">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-lg">${type.name}</h3>
              <div class="flex gap-2">
                <button onclick="editSubType('${type.id}')" class="text-sm text-teal-600">تعديل</button>
                <button onclick="deleteSubType('${type.id}')" class="text-sm text-rose-600">حذف</button>
              </div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              ${type.durations.map(d => `
                <div class="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-center">
                  <p class="font-medium">${d.name}</p>
                  <p class="text-teal-600 font-bold mt-1">${d.price} ر.س</p>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderEmployees() {
  const data = getData();
  return `
    <div class="space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold">الموظفات والمدربات</h2>
          <p class="text-slate-500 text-sm">${data.employees.length} موظفة</p>
        </div>
        <button onclick="openAddEmployee()" class="btn-primary">+ موظفة جديدة</button>
      </div>
      <div class="table-container bg-white dark:bg-slate-800">
        <table>
          <thead>
            <tr>
              <th>الصورة</th>
              <th>الاسم</th>
              <th>الجوال</th>
              <th>تاريخ التوظيف</th>
              <th>الراتب الأساسي</th>
              <th>آخر راتب</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${data.employees.length === 0 ? `<tr><td colspan="7" class="text-center py-10 text-slate-400">ما في موظفات مسجلات بعد</td></tr>` :
              data.employees.map(e => `
                <tr>
                  <td>${avatar(e.name, e.photo, 'w-10 h-10')}</td>
                  <td class="font-medium">${e.name}</td>
                  <td dir="ltr">${e.phone || '—'}</td>
                  <td>${formatDate(e.hireDate)}</td>
                  <td>${formatMoney(e.baseSalary)}</td>
                  <td>${e.lastSalaryDate ? formatDate(e.lastSalaryDate) : '—'}</td>
                  <td>
                    <button onclick="editEmployee('${e.id}')" class="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-700">تعديل</button>
                    <button onclick="deleteEmployee('${e.id}')" class="text-xs px-2 py-1 rounded-lg bg-rose-50 text-rose-700">حذف</button>
                  </td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderSalaries() {
  const data = getData();
  return `
    <div class="space-y-5">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold">الرواتب</h2>
        <button onclick="openAddSalary()" class="btn-primary">+ صرف راتب</button>
      </div>
      <div class="table-container bg-white dark:bg-slate-800">
        <table>
          <thead>
            <tr><th>الموظفة</th><th>المبلغ</th><th>التاريخ</th><th>ملاحظات</th><th></th></tr>
          </thead>
          <tbody>
            ${data.salaries.length === 0 ? `<tr><td colspan="5" class="text-center py-10 text-slate-400">ما في رواتب مسجلة</td></tr>` :
              data.salaries.slice().reverse().map(s => {
                const emp = data.employees.find(e => e.id === s.employeeId);
                return `
                  <tr>
                    <td>${emp?.name || s.employeeId}</td>
                    <td class="font-medium">${formatMoney(s.amount)}</td>
                    <td>${formatDate(s.date)}</td>
                    <td class="text-sm text-slate-500">${s.notes || '—'}</td>
                    <td><button onclick="deleteSalary('${s.id}')" class="text-xs text-rose-600">حذف</button></td>
                  </tr>
                `;
              }).join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderExpenses() {
  const data = getData();
  return `
    <div class="space-y-5">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold">المصروفات</h2>
        <button onclick="openAddExpense()" class="btn-primary">+ مصروف جديد</button>
      </div>
      <div class="table-container bg-white dark:bg-slate-800">
        <table>
          <thead>
            <tr><th>الفئة</th><th>المبلغ</th><th>التاريخ</th><th>ملاحظات</th><th></th></tr>
          </thead>
          <tbody>
            ${data.expenses.length === 0 ? `<tr><td colspan="5" class="text-center py-10 text-slate-400">ما في مصروفات</td></tr>` :
              data.expenses.slice().reverse().map(e => `
                <tr>
                  <td><span class="badge badge-active">${e.category}</span></td>
                  <td class="font-medium">${formatMoney(e.amount)}</td>
                  <td>${formatDate(e.date)}</td>
                  <td class="text-sm">${e.notes || '—'}</td>
                  <td><button onclick="deleteExpense('${e.id}')" class="text-xs text-rose-600">حذف</button></td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderReports() {
  const data = getData();
  const today = todayStr();
  const todayPay = data.payments.filter(p => p.date === today);
  const newSubs = todayPay.filter(p => p.type === 'new');
  const renews = todayPay.filter(p => p.type === 'renew');
  const todayAtt = data.attendance.filter(a => a.date === today);
  const todayExp = data.expenses.filter(e => e.date === today);
  const income = todayPay.reduce((s, p) => s + p.amount, 0);
  const expense = todayExp.reduce((s, e) => s + e.amount, 0);

  return `
    <div class="space-y-6">
      <h2 class="text-2xl font-bold">التقارير</h2>

      <div class="stat-card">
        <h3 class="font-bold text-lg mb-4">التقرير اليومي — ${formatDate(today)}</h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          ${renderStatCard('اشتراكات جديدة', newSubs.length, '', 'teal', formatMoney(newSubs.reduce((s,p)=>s+p.amount,0)))}
          ${renderStatCard('تجديدات', renews.length, '', 'indigo', formatMoney(renews.reduce((s,p)=>s+p.amount,0)))}
          ${renderStatCard('الزيارات', todayAtt.length, '', 'emerald')}
          ${renderStatCard('صافي اليوم', formatMoney(income - expense), '', income >= expense ? 'teal' : 'rose')}
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div class="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl">
            <p class="text-slate-500 mb-1">الإيرادات</p>
            <p>نقدي: ${formatMoney(todayPay.filter(p=>p.method==='cash').reduce((s,p)=>s+p.amount,0))}</p>
            <p>تحويل: ${formatMoney(todayPay.filter(p=>p.method==='transfer').reduce((s,p)=>s+p.amount,0))}</p>
          </div>
          <div class="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl">
            <p class="text-slate-500 mb-1">المصروفات</p>
            <p>${formatMoney(expense)}</p>
          </div>
          <div class="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl">
            <p class="text-slate-500 mb-1">المتجاوزات (حضور بعد الانتهاء)</p>
            <p>${data.members.filter(m => calcGraceDays(m, data.attendance) > 0).length}</p>
          </div>
        </div>
      </div>

      <div class="stat-card">
        <h3 class="font-bold text-lg mb-4">تقارير مخصصة</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div class="form-group">
            <label class="form-label">من تاريخ</label>
            <input type="date" id="report-from" class="form-input" value="${today}">
          </div>
          <div class="form-group">
            <label class="form-label">إلى تاريخ</label>
            <input type="date" id="report-to" class="form-input" value="${today}">
          </div>
          <div class="form-group">
            <label class="form-label">نوع التقرير</label>
            <select id="report-type" class="form-input">
              <option value="payments">الاشتراكات والتجديدات</option>
              <option value="attendance">الحضور</option>
              <option value="expenses">المصروفات</option>
              <option value="salaries">الرواتب</option>
              <option value="expired">المشتركات المنتهية</option>
            </select>
          </div>
        </div>
        <button onclick="generateCustomReport()" class="btn-primary">إصدار التقرير</button>
        <div id="custom-report-result" class="mt-6"></div>
      </div>
    </div>
  `;
}

function renderShifts() {
  const data = getData();
  const shift = data.currentShift;
  return `
    <div class="space-y-5">
      <h2 class="text-2xl font-bold">الورديات</h2>
      ${shift ? `
        <div class="stat-card border-2 border-teal-500">
          <div class="flex items-center justify-between mb-4">
            <div>
              <p class="text-sm text-teal-600 font-medium">الوردية مفتوحة حالياً</p>
              <p class="font-bold text-lg">${shift.employeeName || 'موظفة'}</p>
              <p class="text-sm text-slate-500">بدأت: ${formatDate(shift.date)} ${formatTime(shift.openedAt)}</p>
            </div>
            <button onclick="closeShift()" class="btn-danger">إغلاق الوردية</button>
          </div>
        </div>
      ` : `
        <div class="stat-card text-center py-10">
          <p class="mb-4 text-slate-500">ما في وردية مفتوحة</p>
          <button onclick="openShift()" class="btn-primary">فتح وردية جديدة</button>
        </div>
      `}

      <div class="stat-card">
        <h3 class="font-bold mb-4">سجل الورديات السابقة</h3>
        ${data.shifts.length === 0 ? '<p class="text-slate-400 text-sm">ما في سجل بعد</p>' : `
          <div class="space-y-2">
            ${data.shifts.slice().reverse().slice(0, 10).map(s => `
              <div class="flex justify-between p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl text-sm">
                <div>
                  <p class="font-medium">${s.employeeName}</p>
                  <p class="text-slate-400">${formatDate(s.date)}</p>
                </div>
                <div class="text-left">
                  <p>صافي: ${formatMoney(s.net || 0)}</p>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </div>
  `;
}

function renderSettings() {
  const data = getData();
  const s = data.settings;
  return `
    <div class="space-y-6 max-w-2xl">
      <h2 class="text-2xl font-bold">الإعدادات</h2>

      <div class="stat-card space-y-4">
        <h3 class="font-bold">هوية النادي</h3>
        <div class="form-group">
          <label class="form-label">اسم النادي</label>
          <input type="text" id="set-club-name" class="form-input" value="${s.clubName}">
        </div>
        <div class="form-group">
          <label class="form-label">شعار النادي (صورة)</label>
          <input type="file" id="set-logo" accept="image/*" class="form-input">
        </div>
        <button onclick="saveClubIdentity()" class="btn-primary">حفظ الهوية</button>
      </div>

      <div class="stat-card space-y-4">
        <h3 class="font-bold">الثيم والألوان</h3>
        <div class="flex flex-wrap gap-3">
          ${['teal', 'rose', 'purple', 'blue'].map(t => `
            <button onclick="setTheme('${t}')" class="w-12 h-12 rounded-xl border-2 ${s.theme === t ? 'border-slate-800 dark:border-white scale-110' : 'border-transparent'} transition"
              style="background: ${t === 'teal' ? '#0d9488' : t === 'rose' ? '#e11d48' : t === 'purple' ? '#7c3aed' : '#2563eb'}"></button>
          `).join('')}
        </div>
        <div class="flex items-center gap-3 mt-3">
          <label class="form-label mb-0">الوضع الداكن</label>
          <button onclick="toggleDark()" class="btn-secondary text-sm">${s.darkMode ? 'إيقاف' : 'تفعيل'}</button>
        </div>
      </div>

      <div class="stat-card space-y-4">
        <h3 class="font-bold">الرسائل التلقائية (واتساب)</h3>
        <p class="text-sm text-slate-500">الرسالة تتجهز وتفتح واتساب الجهاز مباشرة بدون رسوم إضافية.</p>
        <div class="form-group">
          <label class="form-label">رسالة اشتراك جديد</label>
          <textarea id="msg-new" class="form-input" rows="4">${s.whatsappMessages.newMember}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">رسالة تجديد</label>
          <textarea id="msg-renew" class="form-input" rows="3">${s.whatsappMessages.renew}</textarea>
        </div>
        <button onclick="saveMessages()" class="btn-primary">حفظ الرسائل</button>
      </div>

      <div class="stat-card space-y-4">
        <h3 class="font-bold">النسخ الاحتياطي</h3>
        <div class="flex flex-wrap gap-3">
          <button onclick="exportJSON()" class="btn-primary">تصدير نسخة احتياطية</button>
          <label class="btn-secondary cursor-pointer">
            استيراد نسخة
            <input type="file" accept=".json" class="hidden" onchange="importJSON(this.files[0])">
          </label>
        </div>
        <p class="text-xs text-slate-400">البيانات محفوظة محلياً في المتصفح. صدّري نسخة دورياً.</p>
      </div>
    </div>
  `;
}
