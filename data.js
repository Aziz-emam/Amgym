// ===== نظام إدارة النادي الرياضي النسائي - طبقة البيانات =====
const STORAGE_KEY = 'gym_saudi_data_v1';

const defaultData = {
  settings: {
    clubName: 'نادي اللياقة النسائي',
    clubLogo: null,
    loginBg: null,
    homeBg: null,
    theme: 'teal', // teal | rose | purple | blue
    darkMode: false,
    whatsappMessages: {
      newMember: `مرحباً أستاذة {name}
تم تسجيل عضويتك بنجاح في {club}.
رقم العضوية: {id}
نوع الاشتراك: {type} - {duration}
تاريخ الانتهاء: {endDate}
يرجى الاحتفاظ بالباركود التالي لإتمام تسجيل الدخول والخروج من النادي.
شكراً لاختياركم {club}.`,
      renew: `مرحباً أستاذة {name}
تم تجديد اشتراكك بنجاح في {club}.
رقم العضوية: {id}
نوع الاشتراك: {type} - {duration}
تاريخ الانتهاء الجديد: {endDate}
شكراً لثقتكم.`,
      expire7: `أستاذة {name}، اشتراكك في {club} بينتهي بعد 7 أيام ({endDate}). تجديد الاشتراك يسهل عليك الاستمرار.`,
      expire3: `أستاذة {name}، اشتراكك بينتهي بعد 3 أيام. تفضلي بالتجديد عشان ما توقفين.`,
      expireToday: `أستاذة {name}، اشتراكك ينتهي اليوم. ننتظرك للتجديد إن شاء الله.`
    }
  },
  subscriptionTypes: [
    {
      id: 'gym',
      name: 'جيم',
      durations: [
        { id: '1m', name: 'شهر', months: 1, price: 250 },
        { id: '2m', name: 'شهرين', months: 2, price: 450 },
        { id: '3m', name: 'ثلاثة أشهر', months: 3, price: 650 },
        { id: '6m', name: 'ستة أشهر', months: 6, price: 1100 },
        { id: '12m', name: 'سنة', months: 12, price: 2000 }
      ]
    },
    {
      id: 'sauna',
      name: 'ساونا',
      durations: [
        { id: '1m', name: 'شهر', months: 1, price: 180 },
        { id: '2m', name: 'شهرين', months: 2, price: 320 },
        { id: '3m', name: 'ثلاثة أشهر', months: 3, price: 450 },
        { id: '6m', name: 'ستة أشهر', months: 6, price: 800 },
        { id: '12m', name: 'سنة', months: 12, price: 1400 }
      ]
    },
    {
      id: 'fitness',
      name: 'لياقة',
      durations: [
        { id: '1m', name: 'شهر', months: 1, price: 220 },
        { id: '2m', name: 'شهرين', months: 2, price: 400 },
        { id: '3m', name: 'ثلاثة أشهر', months: 3, price: 580 },
        { id: '6m', name: 'ستة أشهر', months: 6, price: 1000 },
        { id: '12m', name: 'سنة', months: 12, price: 1800 }
      ]
    },
    {
      id: 'group',
      name: 'حصص جماعية',
      durations: [
        { id: '1m', name: 'شهر', months: 1, price: 150 },
        { id: '2m', name: 'شهرين', months: 2, price: 280 },
        { id: '3m', name: 'ثلاثة أشهر', months: 3, price: 400 },
        { id: '6m', name: 'ستة أشهر', months: 6, price: 700 },
        { id: '12m', name: 'سنة', months: 12, price: 1200 }
      ]
    }
  ],
  members: [],
  employees: [],
  salaries: [],
  expenses: [],
  expenseCategories: ['رواتب', 'إيجار', 'كهرباء', 'ماء', 'إنترنت', 'صيانة', 'أدوات رياضية', 'فواتير', 'أخرى'],
  attendance: [], // { memberId, checkIn, checkOut, date, durationMinutes }
  present: [], // currently checked-in memberIds with checkIn time
  shifts: [],
  currentShift: null,
  payments: [], // { id, memberId, type: 'new'|'renew', amount, method: 'cash'|'transfer', date, notes }
  nextMemberId: 10001,
  nextEmployeeId: 1
};

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveData(defaultData);
      return structuredClone(defaultData);
    }
    const data = JSON.parse(raw);
    // merge missing keys from default
    for (const key of Object.keys(defaultData)) {
      if (data[key] === undefined) data[key] = structuredClone(defaultData[key]);
    }
    return data;
  } catch (e) {
    console.error('Load error', e);
    return structuredClone(defaultData);
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getData() {
  return loadData();
}

function updateData(updater) {
  const data = loadData();
  const newData = typeof updater === 'function' ? updater(data) : { ...data, ...updater };
  saveData(newData);
  return newData;
}

// Helpers
function generateMemberId(data) {
  const id = data.nextMemberId;
  data.nextMemberId = id + 1;
  return id.toString();
}

function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function nowISO() {
  return new Date().toISOString();
}

function formatDate(d) {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatTime(d) {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}

function daysBetween(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  return Math.floor((e - s) / (1000 * 60 * 60 * 24));
}

function getMemberStatus(member) {
  const today = todayStr();
  if (!member.endDate) return 'active';
  if (member.endDate >= today) {
    const daysLeft = daysBetween(today, member.endDate);
    if (daysLeft <= 7) return 'soon';
    return 'active';
  }
  // expired - check if has grace (attendance after expiry)
  const graceDays = member.graceDays || 0;
  if (graceDays > 0) return 'grace';
  return 'expired';
}

function calcGraceDays(member, attendanceList) {
  if (!member.endDate || member.endDate >= todayStr()) return 0;
  const after = attendanceList.filter(a => a.memberId === member.id && a.date > member.endDate);
  if (after.length === 0) return 0;
  // unique days after expiry
  const uniqueDays = new Set(after.map(a => a.date));
  return uniqueDays.size;
}
