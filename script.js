// ===============================
//  STATE
// ===============================
let trip = JSON.parse(localStorage.getItem('evnly_trip') || 'null');
let currentExpenseId = null;
let currentEventId = null;
let currentDay = 0;
let wheelSpinning = false;

const AVATARS = ['🐠','🐗','🐘','🦋','🦊','🐼','🐸','🐙','🦁','🐯','🐺','🦄','🐬','🦩','🐓','🦔'];
const CURRENCIES = [
  'HKD','JPY','USD','THB','KRW','EUR','GBP','TWD','SGD','AUD','CNY','MYR','PHP','VND','IDR','INR','CAD','CHF','NZD','AED'
];
const EXPENSE_TYPES = [
  {id:'food', emoji:'🍜', label:'Food'},
  {id:'transport', emoji:'🚌', label:'Transport'},
  {id:'hotel', emoji:'🏨', label:'Hotel'},
  {id:'shopping', emoji:'🛍️', label:'Shopping'},
  {id:'other', emoji:'📦', label:'Other'},
];
const CAT_COLORS = {food:'#e08840', transport:'#5090d8', hotel:'#9060c0', shopping:'#e05050', other:'#888'};

// ===============================
//  NAVIGATION
// ===============================
function goTo(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  window.scrollTo(0,0);
  if (pageId === 'page-dashboard') renderDashboard();
  if (pageId === 'page-wrap') renderWrap();
  if (pageId === 'page-game') renderWheel();
}

// ===============================
//  CREATE TRIP
// ===============================
let pendingMembers = [];
let selectedAvatar = AVATARS[0];
let pickerMemberIdx = null;

function initCreatePage() {
  // Populate currency select
  const sel = document.getElementById('currencySelect');
  CURRENCIES.forEach(c => {
    const o = document.createElement('option');
    o.value = c; o.textContent = c;
    sel.appendChild(o);
  });
  pendingMembers = [];
  renderMembersList();
  // Default currencies
  trip = trip || { currencies: ['HKD'], members: [], expenses: [], itinerary: {}, name: '', dateStart: '', dateEnd: '' };
  renderCurrencyTags();
}

function addMember() {
  const input = document.getElementById('memberInput');
  const name = input.value.trim();
  if (!name) return;
  if (pendingMembers.find(m => m.name.toLowerCase() === name.toLowerCase())) {
    showToast('Name already added!'); return;
  }
  // Show avatar picker
  pickerMemberIdx = pendingMembers.length;
  pendingMembers.push({ name, avatar: AVATARS[pendingMembers.length % AVATARS.length] });
  input.value = '';
  renderMembersList();
  renderAvatarPicker(pendingMembers.length - 1);
}

function renderAvatarPicker(idx) {
  const picker = document.getElementById('avatarPicker');
  picker.innerHTML = `<div style="width:100%;font-size:12px;color:var(--gray-dark);margin-bottom:8px;font-family:'Quicksand',sans-serif;font-weight:700;">Pick avatar for <b>${pendingMembers[idx].name}</b>:</div>`;
  AVATARS.forEach((a, i) => {
    const btn = document.createElement('div');
    btn.className = 'avatar-opt' + (pendingMembers[idx].avatar === a ? ' selected' : '');
    btn.textContent = a;
    btn.onclick = () => {
      pendingMembers[idx].avatar = a;
      renderMembersList();
      renderAvatarPicker(idx);
    };
    picker.appendChild(btn);
  });
  picker.style.display = 'flex';
}

function removeMember(idx) {
  pendingMembers.splice(idx, 1);
  document.getElementById('avatarPicker').style.display = 'none';
  renderMembersList();
}

function renderMembersList() {
  const list = document.getElementById('membersList');
  list.innerHTML = '';
  pendingMembers.forEach((m, i) => {
    const chip = document.createElement('div');
    chip.className = 'member-chip';
    chip.innerHTML = `<span class="member-avatar">${m.avatar}</span>${m.name}<button class="remove-btn" onclick="removeMember(${i})">×</button>`;
    list.appendChild(chip);
  });
}

function addCurrency() {
  const sel = document.getElementById('currencySelect');
  const val = sel.value;
  if (!val) return;
  if (!trip.currencies) trip.currencies = [];
  if (!trip.currencies.includes(val)) {
    trip.currencies.push(val);
    renderCurrencyTags();
  }
  sel.value = '';
}

function renderCurrencyTags() {
  const tags = document.getElementById('currencyTags');
  tags.innerHTML = '';
  (trip.currencies || ['HKD']).forEach(c => {
    const tag = document.createElement('div');
    tag.className = 'currency-tag selected';
    tag.innerHTML = `${c} <span onclick="removeCurrency('${c}')" style="cursor:pointer;margin-left:4px;opacity:0.6;">×</span>`;
    tags.appendChild(tag);
  });
}

function removeCurrency(c) {
  trip.currencies = trip.currencies.filter(x => x !== c);
  renderCurrencyTags();
}

function startTrip() {
  const name = document.getElementById('tripName').value.trim();
  if (!name) { showToast('Please enter a trip name!'); return; }
  if (pendingMembers.length < 1) { showToast('Add at least 1 member!'); return; }

  trip = {
    id: 'trip_' + Date.now(),
    name,
    members: pendingMembers.map(m => ({...m, id: 'mem_'+Math.random().toString(36).slice(2)})),
    currencies: trip.currencies || ['HKD'],
    dateStart: document.getElementById('dateStart').value,
    dateEnd: document.getElementById('dateEnd').value,
    expenses: [],
    itinerary: {}
  };
  saveTrip();
  generateShareLink();
  goTo('page-share');
}

function generateShareLink() {
  const id = trip.id;
  document.getElementById('shareLink').textContent = `evnly.app/trip/${id}`;
}

function copyLink() {
  const text = document.getElementById('shareLink').textContent;
  navigator.clipboard.writeText(text).then(() => showToast('Link copied! 📋'));
}

// ===============================
//  DASHBOARD
// ===============================
function renderDashboard() {
  if (!trip) return;
  document.getElementById('dashTripName').textContent = trip.name;

  let meta = '';
  if (trip.dateStart) meta += formatDate(trip.dateStart);
  if (trip.dateEnd) meta += ' – ' + formatDate(trip.dateEnd);
  if (trip.currencies) meta += (meta ? ' · ' : '') + trip.currencies.join(', ');
  document.getElementById('dashTripMeta').textContent = meta;

  const avatarEl = document.getElementById('dashMemberAvatars');
  avatarEl.innerHTML = trip.members.map(m =>
    `<div class="m-avatar" title="${m.name}">${m.avatar}</div>`
  ).join('');

  renderExpensesTab();
  renderItineraryTab();
}

function renderExpensesTab() {
  renderPieChart();
  renderSettlements();
  renderExpensesList();
}

function renderPieChart() {
  const canvas = document.getElementById('pieChart');
  const ctx = canvas.getContext('2d');
  const legend = document.getElementById('pieLegend');
  const expenses = trip.expenses || [];

  // Aggregate by category
  const cats = {};
  expenses.forEach(e => {
    cats[e.type] = (cats[e.type] || 0) + e.amount;
  });

  const total = Object.values(cats).reduce((a,b) => a+b, 0);
  ctx.clearRect(0, 0, 100, 100);

  if (total === 0) {
    ctx.fillStyle = '#e0e0d0';
    ctx.beginPath(); ctx.arc(50,50,46,0,Math.PI*2); ctx.fill();
    legend.innerHTML = '<div style="font-size:12px;color:#888;">No expenses yet</div>';
    return;
  }

  let startAngle = -Math.PI/2;
  const entries = Object.entries(cats);
  entries.forEach(([cat, val]) => {
    const slice = (val/total) * Math.PI * 2;
    ctx.fillStyle = CAT_COLORS[cat] || '#888';
    ctx.beginPath();
    ctx.moveTo(50,50);
    ctx.arc(50,50,46,startAngle,startAngle+slice);
    ctx.closePath(); ctx.fill();
    startAngle += slice;
  });

  // Center hole
  ctx.fillStyle = '#E8E6A5';
  ctx.beginPath(); ctx.arc(50,50,20,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.font = 'bold 9px Quicksand';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(formatCurrency(total, trip.currencies[0] || 'HKD'), 50, 50);

  legend.innerHTML = entries.map(([cat, val]) => {
    const type = EXPENSE_TYPES.find(t => t.id === cat);
    return `<div class="pie-item">
      <div class="pie-dot" style="background:${CAT_COLORS[cat]}"></div>
      <span>${type ? type.emoji + ' ' + type.label : cat}: ${formatCurrency(val, trip.currencies[0])} (${Math.round(val/total*100)}%)</span>
    </div>`;
  }).join('');
}

function renderSettlements() {
  const expenses = trip.expenses || [];
  const members = trip.members || [];
  const balances = {};
  members.forEach(m => balances[m.id] = 0);

  expenses.forEach(e => {
    const paidById = e.paidBy;
    const shareIds = e.sharedBy || [];
    if (shareIds.length === 0) return;
    const perPerson = e.amount / shareIds.length;
    balances[paidById] = (balances[paidById] || 0) + e.amount;
    shareIds.forEach(sid => {
      balances[sid] = (balances[sid] || 0) - perPerson;
    });
  });

  // Settle
  const settlements = [];
  const debtors = members.filter(m => (balances[m.id]||0) < -0.01);
  const creditors = members.filter(m => (balances[m.id]||0) > 0.01);
  debtors.forEach(d => {
    let debt = Math.abs(balances[d.id]);
    creditors.forEach(c => {
      if (debt < 0.01) return;
      const credit = balances[c.id];
      if (credit <= 0) return;
      const amount = Math.min(debt, credit);
      settlements.push({ from: d, to: c, amount });
      debt -= amount;
    });
  });

  const settleList = document.getElementById('settleList');
  const currency = trip.currencies[0] || 'HKD';
  if (settlements.length === 0) {
    settleList.innerHTML = '<div class="text-muted">All settled up! 🎉</div>';
  } else {
    settleList.innerHTML = settlements.map(s =>
      `<div class="settle-row">
        <span>${s.from.avatar} ${s.from.name}</span>
        <span class="settle-arrow">→</span>
        <span>${s.to.avatar} ${s.to.name}</span>
        <span class="settle-amount">${formatCurrency(s.amount, currency)}</span>
      </div>`
    ).join('');
  }
}

function renderExpensesList() {
  const list = document.getElementById('expensesList');
  const expenses = [...(trip.expenses||[])].reverse();
  const currency = trip.currencies[0] || 'HKD';
  if (expenses.length === 0) {
    list.innerHTML = '<div class="text-muted" style="text-align:center;padding:24px;">No expenses yet.<br>Tap + to add one!</div>';
    return;
  }
  list.innerHTML = expenses.map(e => {
    const type = EXPENSE_TYPES.find(t => t.id === e.type);
    const payer = trip.members.find(m => m.id === e.paidBy);
    const sharers = (e.sharedBy||[]).map(sid => trip.members.find(m=>m.id===sid)).filter(Boolean);
    return `<div class="expense-item" onclick="openEditExpense('${e.id}')">
      <div class="expense-emoji">${type ? type.emoji : '📦'}</div>
      <div class="expense-info">
        <div class="expense-name">${e.remark || (type ? type.label : 'Expense')}</div>
        <div class="expense-meta">${payer ? payer.avatar + ' ' + payer.name + ' paid' : ''} · ${e.date || ''}</div>
      </div>
      <div class="expense-right">
        <div class="expense-amount">${formatCurrency(e.amount, e.currency || currency)}</div>
        <div class="expense-payers">${sharers.slice(0,3).map(s=>`<div class="payer-dot">${s.avatar}</div>`).join('')}</div>
      </div>
    </div>`;
  }).join('');
}

// ===============================
//  ADD/EDIT EXPENSE MODAL
// ===============================
let expenseType = 'food';
let expensePayer = null;
let expenseSharers = [];

function openAddModal() {
  currentExpenseId = null;
  expenseType = 'food';
  expensePayer = trip.members[0]?.id || null;
  expenseSharers = trip.members.map(m => m.id);
  document.getElementById('expenseRemark').value = '';
  document.getElementById('expenseAmount').value = '';
  document.getElementById('expenseModalTitle').textContent = 'Add Expense';
  document.getElementById('deleteExpenseBtn').classList.add('hidden');
  renderExpenseTypeGrid();
  renderWhoPaidGrid();
  renderWhoShareGrid();
  renderExpenseCurrencySelect();
  openModal('modal-expense');
}

function openEditExpense(id) {
  const e = trip.expenses.find(ex => ex.id === id);
  if (!e) return;
  currentExpenseId = id;
  expenseType = e.type;
  expensePayer = e.paidBy;
  expenseSharers = [...(e.sharedBy||[])];
  document.getElementById('expenseRemark').value = e.remark || '';
  document.getElementById('expenseAmount').value = e.amount;
  document.getElementById('expenseModalTitle').textContent = 'Edit Expense';
  document.getElementById('deleteExpenseBtn').classList.remove('hidden');
  renderExpenseTypeGrid();
  renderWhoPaidGrid();
  renderWhoShareGrid();
  renderExpenseCurrencySelect(e.currency);
  openModal('modal-expense');
}

function renderExpenseTypeGrid() {
  const grid = document.getElementById('expenseTypeGrid');
  grid.innerHTML = EXPENSE_TYPES.map(t =>
    `<div class="type-btn${expenseType===t.id?' selected':''}" onclick="selectType('${t.id}')">
      <span>${t.emoji}</span><span>${t.label}</span>
    </div>`
  ).join('');
}

function selectType(id) { expenseType = id; renderExpenseTypeGrid(); }

function renderWhoPaidGrid() {
  const grid = document.getElementById('whoPaidGrid');
  grid.innerHTML = trip.members.map(m =>
    `<div class="who-btn${expensePayer===m.id?' selected':''}" onclick="selectPayer('${m.id}')">
      <span>${m.avatar}</span><span>${m.name}</span>
    </div>`
  ).join('');
}

function selectPayer(id) { expensePayer = id; renderWhoPaidGrid(); }

function renderWhoShareGrid() {
  const grid = document.getElementById('whoShareGrid');
  grid.innerHTML = trip.members.map(m =>
    `<div class="who-btn${expenseSharers.includes(m.id)?' selected':''}" onclick="toggleSharer('${m.id}')">
      <span>${m.avatar}</span><span>${m.name}</span>
    </div>`
  ).join('');
}

function toggleSharer(id) {
  if (expenseSharers.includes(id)) {
    expenseSharers = expenseSharers.filter(x => x !== id);
  } else {
    expenseSharers.push(id);
  }
  renderWhoShareGrid();
}

function renderExpenseCurrencySelect(selected) {
  const sel = document.getElementById('expenseCurrency');
  sel.innerHTML = (trip.currencies || ['HKD']).map(c =>
    `<option value="${c}"${(selected||trip.currencies[0])===c?' selected':''}>${c}</option>`
  ).join('');
}

function saveExpense() {
  const amount = parseFloat(document.getElementById('expenseAmount').value);
  if (!amount || amount <= 0) { showToast('Enter a valid amount!'); return; }
  if (!expensePayer) { showToast('Select who paid!'); return; }
  if (expenseSharers.length === 0) { showToast('Select who shares!'); return; }

  const currency = document.getElementById('expenseCurrency').value;
  const remark = document.getElementById('expenseRemark').value.trim();

  if (currentExpenseId) {
    const idx = trip.expenses.findIndex(e => e.id === currentExpenseId);
    if (idx > -1) {
      trip.expenses[idx] = {...trip.expenses[idx], type: expenseType, remark, paidBy: expensePayer, sharedBy: expenseSharers, amount, currency};
    }
  } else {
    trip.expenses.push({
      id: 'exp_'+Date.now(),
      type: expenseType, remark,
      paidBy: expensePayer, sharedBy: expenseSharers,
      amount, currency,
      date: new Date().toLocaleDateString()
    });
  }
  saveTrip();
  closeModal('modal-expense');
  renderExpensesTab();
  showToast(currentExpenseId ? 'Expense updated! ✅' : 'Expense added! ✅');
}

function deleteExpense() {
  if (!currentExpenseId) return;
  trip.expenses = trip.expenses.filter(e => e.id !== currentExpenseId);
  saveTrip();
  closeModal('modal-expense');
  renderExpensesTab();
  showToast('Expense deleted');
}

// ===============================
//  ITINERARY
// ===============================
function renderItineraryTab() {
  if (!trip) return;
  const dayTabs = document.getElementById('dayTabs');
  const itinEvents = document.getElementById('itinEvents');

  // Generate days from dates
  const days = getTripDays();

  dayTabs.innerHTML = days.map((d, i) =>
    `<button class="day-tab${i===currentDay?' active':''}" onclick="selectDay(${i})">${d}</button>`
  ).join('');

  const dayKey = days[currentDay] || 'Day 1';
  const events = (trip.itinerary[dayKey] || []).sort((a,b) => a.time.localeCompare(b.time));

  if (events.length === 0) {
    itinEvents.innerHTML = '<div class="text-muted" style="text-align:center;padding:16px;">No events for this day yet.</div>';
  } else {
    itinEvents.innerHTML = events.map(ev =>
      `<div class="itin-event">
        <div class="itin-time">${ev.time || '--:--'}</div>
        <div style="flex:1;">
          <div class="itin-event-name">${ev.name}</div>
          ${ev.addr ? `<div class="itin-event-loc">📍 ${ev.addr}</div>` : ''}
        </div>
        <div class="itin-actions">
          ${ev.addr ? `<button class="itin-icon-btn" onclick="openGoogleMaps('${encodeURIComponent(ev.addr)}')">🗺️</button>` : ''}
          <button class="itin-icon-btn" onclick="openEditEvent('${dayKey}','${ev.id}')">✏️</button>
        </div>
      </div>`
    ).join('');
  }
}

function getTripDays() {
  if (trip.dateStart && trip.dateEnd) {
    const start = new Date(trip.dateStart);
    const end = new Date(trip.dateEnd);
    const days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
      days.push(d.toLocaleDateString('en-GB', {month:'short', day:'numeric'}));
    }
    return days.length > 0 ? days : ['Day 1'];
  }
  // Fallback: generate days from itinerary keys or default
  const keys = Object.keys(trip.itinerary || {});
  return keys.length > 0 ? keys : ['Day 1','Day 2','Day 3'];
}

function selectDay(i) {
  currentDay = i;
  renderItineraryTab();
}

function openAddEventModal() {
  currentEventId = null;
  document.getElementById('eventName').value = '';
  document.getElementById('eventTime').value = '';
  document.getElementById('eventAddr').value = '';
  document.getElementById('deleteEventBtn').classList.add('hidden');
  openModal('modal-event');
}

function openEditEvent(dayKey, eventId) {
  const events = trip.itinerary[dayKey] || [];
  const ev = events.find(e => e.id === eventId);
  if (!ev) return;
  currentEventId = eventId;
  document.getElementById('eventName').value = ev.name;
  document.getElementById('eventTime').value = ev.time;
  document.getElementById('eventAddr').value = ev.addr || '';
  document.getElementById('deleteEventBtn').classList.remove('hidden');
  document.getElementById('deleteEventBtn').onclick = () => deleteEvent(dayKey, eventId);
  openModal('modal-event');
}

function saveEvent() {
  const name = document.getElementById('eventName').value.trim();
  if (!name) { showToast('Enter an event name!'); return; }
  const time = document.getElementById('eventTime').value;
  const addr = document.getElementById('eventAddr').value.trim();
  const days = getTripDays();
  const dayKey = days[currentDay] || 'Day 1';

  if (!trip.itinerary[dayKey]) trip.itinerary[dayKey] = [];

  if (currentEventId) {
    const idx = trip.itinerary[dayKey].findIndex(e => e.id === currentEventId);
    if (idx > -1) trip.itinerary[dayKey][idx] = {...trip.itinerary[dayKey][idx], name, time, addr};
  } else {
    trip.itinerary[dayKey].push({ id: 'ev_'+Date.now(), name, time, addr });
  }
  saveTrip();
  closeModal('modal-event');
  renderItineraryTab();
  showToast('Event saved! 🗓️');
}

function deleteEvent(dayKey, eventId) {
  if (!dayKey) {
    const days = getTripDays();
    dayKey = days[currentDay] || 'Day 1';
    eventId = currentEventId;
  }
  if (trip.itinerary[dayKey]) {
    trip.itinerary[dayKey] = trip.itinerary[dayKey].filter(e => e.id !== eventId);
  }
  saveTrip();
  closeModal('modal-event');
  renderItineraryTab();
  showToast('Event deleted');
}

function openGoogleMaps(addr) {
  window.open(`https://maps.google.com/?q=${addr}`, '_blank');
}

// ===============================
//  TRIP WRAP
// ===============================
function renderWrap() {
  if (!trip) return;
  const expenses = trip.expenses || [];
  const members = trip.members || [];
  const currency = trip.currencies[0] || 'HKD';

  const total = expenses.reduce((a,e) => a+e.amount, 0);

  // Big spender
  const spent = {};
  members.forEach(m => spent[m.id] = 0);
  expenses.forEach(e => spent[e.paidBy] = (spent[e.paidBy]||0) + e.amount);
  const bigSpenderId = Object.entries(spent).sort((a,b)=>b[1]-a[1])[0]?.[0];
  const bigSpender = members.find(m => m.id === bigSpenderId);

  // Top category
  const cats = {};
  expenses.forEach(e => cats[e.type] = (cats[e.type]||0) + e.amount);
  const topCat = Object.entries(cats).sort((a,b)=>b[1]-a[1])[0];
  const topCatType = EXPENSE_TYPES.find(t => topCat && t.id === topCat[0]);

  // Most expensive
  const mostExp = [...expenses].sort((a,b)=>b.amount-a.amount)[0];
  const mostExpPayer = mostExp ? members.find(m => m.id === mostExp.paidBy) : null;

  // Night owl (expenses without time we'll simulate)
  const nightOwl = members[Math.floor(Math.random() * members.length)];

  // Michelin guide (most food spending)
  const foodSpent = {};
  members.forEach(m => foodSpent[m.id] = 0);
  expenses.filter(e => e.type === 'food').forEach(e => foodSpent[e.paidBy] = (foodSpent[e.paidBy]||0)+e.amount);
  const michelinId = Object.entries(foodSpent).sort((a,b)=>b[1]-a[1])[0]?.[0];
  const michelin = members.find(m => m.id === michelinId);

  const body = document.getElementById('wrapBody');
  body.innerHTML = `
    <div class="wrap-card yellow">
      <div class="wrap-card-label">YOUR TRIP</div>
      <div style="font-family:'Quicksand',sans-serif;font-size:28px;font-weight:700;">${trip.name}</div>
      <div style="font-size:13px;margin-top:6px;opacity:0.7;">${members.map(m=>m.avatar+' '+m.name).join(' · ')}</div>
    </div>

    <div class="wrap-card dark">
      <div class="wrap-card-label">TOTAL SPENT</div>
      <div class="wrap-card-value">${formatCurrency(total, currency)}</div>
      <div class="wrap-card-sub">across ${expenses.length} expense${expenses.length!==1?'s':''}</div>
    </div>

    ${bigSpender ? `
    <div class="wrap-card dark">
      <div class="wrap-card-label">💰 BIG SPENDER</div>
      <div class="wrap-card-value">${bigSpender.avatar} ${bigSpender.name}</div>
      <div class="wrap-card-sub">Paid ${formatCurrency(spent[bigSpender.id], currency)} in total (deep pockets!)</div>
    </div>` : ''}

    ${topCatType ? `
    <div class="wrap-card dark">
      <div class="wrap-card-label">🍕 TOP CATEGORY</div>
      <div class="wrap-card-value">${topCatType.emoji} ${topCatType.label}</div>
      <div class="wrap-card-sub">${Math.round(topCat[1]/total*100)}% of total budget — ${formatCurrency(topCat[1], currency)}</div>
    </div>` : ''}

    ${mostExp ? `
    <div class="wrap-card dark">
      <div class="wrap-card-label">💎 MOST EXPENSIVE MOMENT</div>
      <div class="wrap-card-value">${formatCurrency(mostExp.amount, currency)}</div>
      <div class="wrap-card-sub">${mostExp.remark || 'Unnamed expense'}${mostExpPayer ? ' — paid by ' + mostExpPayer.name : ''}</div>
    </div>` : ''}

    <div style="font-family:'Quicksand',sans-serif;font-weight:700;font-size:16px;color:var(--yellow);margin-top:8px;">🏆 AWARDS</div>
    <div class="wrap-awards">
      ${bigSpender ? `<div class="award-card">
        <div class="award-emoji">🏧</div>
        <div class="award-title">"ATM"</div>
        <div class="award-name">${bigSpender.avatar} ${bigSpender.name}</div>
        <div class="award-desc">Most total payments</div>
      </div>` : ''}
      ${michelin ? `<div class="award-card">
        <div class="award-emoji">🍽️</div>
        <div class="award-title">"Michelin Guide"</div>
        <div class="award-name">${michelin.avatar} ${michelin.name}</div>
        <div class="award-desc">Top food spender</div>
      </div>` : ''}
      ${nightOwl ? `<div class="award-card">
        <div class="award-emoji">🦉</div>
        <div class="award-title">"Night Owl"</div>
        <div class="award-name">${nightOwl.avatar} ${nightOwl.name}</div>
        <div class="award-desc">The last one up</div>
      </div>` : ''}
      ${members.length > 1 ? `<div class="award-card">
        <div class="award-emoji">👑</div>
        <div class="award-title">"Mileage King"</div>
        <div class="award-name">${members[0].avatar} ${members[0].name}</div>
        <div class="award-desc">Longest distance traveled</div>
      </div>` : ''}
    </div>
  `;
}

// ===============================
//  LUCKY WHEEL GAME
// ===============================
function renderWheel() {
  if (!trip || !trip.members || trip.members.length === 0) return;
  const canvas = document.getElementById('wheelCanvas');
  const ctx = canvas.getContext('2d');
  drawWheel(ctx, 0);
}

const WHEEL_COLORS = ['#E8E6A5','#5090d8','#e08840','#9060c0','#e05050','#50b870','#888','#111'];

function drawWheel(ctx, rotation) {
  const members = trip.members || [];
  const cx = 120, cy = 120, r = 116;
  ctx.clearRect(0, 0, 240, 240);
  const slice = (Math.PI * 2) / members.length;
  members.forEach((m, i) => {
    ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, rotation + i * slice, rotation + (i+1) * slice);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation + i * slice + slice/2);
    ctx.textAlign = 'right';
    ctx.fillStyle = i % 2 === 0 ? '#111' : '#fff';
    ctx.font = 'bold 13px Quicksand, sans-serif';
    ctx.fillText(m.avatar + ' ' + m.name, r - 8, 5);
    ctx.restore();
  });
  // Center
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(cx,cy,18,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.font = 'bold 10px Quicksand, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('SPIN', cx, cy);
}

let wheelAngle = 0;
function spinWheel() {
  if (wheelSpinning) return;
  if (!trip.members || trip.members.length === 0) { showToast('Add members first!'); return; }
  wheelSpinning = true;
  document.getElementById('wheelResult').textContent = '🎡 Spinning...';
  const canvas = document.getElementById('wheelCanvas');
  const ctx = canvas.getContext('2d');
  const totalSpin = Math.PI * 2 * (5 + Math.random() * 5);
  const duration = 4000;
  const start = performance.now();
  const startAngle = wheelAngle;

  function animate(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 4);
    wheelAngle = startAngle + totalSpin * ease;
    drawWheel(ctx, wheelAngle);
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      wheelSpinning = false;
      // Determine winner (arrow at top = -PI/2)
      const members = trip.members;
      const slice = (Math.PI * 2) / members.length;
      const normalized = (((-wheelAngle - Math.PI/2) % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);
      const winnerIdx = Math.floor(normalized / slice) % members.length;
      const winner = members[winnerIdx];
      document.getElementById('wheelResult').textContent = `🎉 ${winner.avatar} ${winner.name} pays next!`;
    }
  }
  requestAnimationFrame(animate);
}

// ===============================
//  SETTINGS MODAL
// ===============================
function showSettingsModal() {
  const content = document.getElementById('settingsContent');
  content.innerHTML = `
    <div class="form-group">
      <label class="form-label">Trip Name</label>
      <input class="form-input" id="settingsTripName" value="${trip.name}">
    </div>
    <div class="form-group">
      <label class="form-label">Trip Dates</label>
      <div class="date-row">
        <input class="form-input" id="settingsDateStart" type="date" value="${trip.dateStart||''}">
        <input class="form-input" id="settingsDateEnd" type="date" value="${trip.dateEnd||''}">
      </div>
    </div>
    <div class="settings-row">
      <div>
        <div class="settings-label">Members</div>
        <div class="settings-val">${trip.members.map(m=>m.avatar+' '+m.name).join(', ')}</div>
      </div>
    </div>
    <div class="settings-row">
      <div>
        <div class="settings-label">Currencies</div>
        <div class="settings-val">${(trip.currencies||[]).join(', ')}</div>
      </div>
    </div>
    <div class="settings-row">
      <div>
        <div class="settings-label">Share Link</div>
        <div class="settings-val" style="word-break:break-all;">evnly.app/trip/${trip.id}</div>
      </div>
      <button class="copy-btn" style="border-radius:8px;" onclick="copyLink();showToast('Link copied!')">COPY</button>
    </div>
  `;
  openModal('modal-settings');
}

function saveSettings() {
  trip.name = document.getElementById('settingsTripName').value.trim() || trip.name;
  trip.dateStart = document.getElementById('settingsDateStart').value;
  trip.dateEnd = document.getElementById('settingsDateEnd').value;
  saveTrip();
  closeModal('modal-settings');
  renderDashboard();
  showToast('Settings saved! ✅');
}

// ===============================
//  FOOTER MODALS
// ===============================
const footerContent = {
  about: {
    title: 'About Us',
    content: 'Evnly is a no-login group expense tracker and travel companion built for friends who love to travel together. We believe splitting bills should be easy, fair, and even a little fun. No accounts, no hassle — just start a trip and go.'
  },
  privacy: {
    title: 'Privacy Policy',
    content: 'Evnly stores all trip data locally on your device using browser storage. We do not collect personal information or send your data to external servers. Your trip data is private and accessible only through your browser.'
  },
  contact: {
    title: 'Contact Us',
    content: 'Have feedback or questions? We\'d love to hear from you!\n\n📧 hello@evnly.app\n\nWe\'ll get back to you as soon as possible.'
  },
  faq: {
    title: 'FAQ',
    content: `Q: Do I need to sign up?\nA: No! Just create a trip and go.\n\nQ: How do I share with friends?\nA: Copy the trip link and send it to your group.\n\nQ: Is my data saved?\nA: Yes, your data is saved locally in your browser.\n\nQ: Can I use multiple currencies?\nA: Yes! Add multiple currencies when creating your trip.\n\nQ: What is Trip Wrapped?\nA: A fun Spotify-style summary of your trip spending and stats.`
  }
};

function showFooterModal(type) {
  const data = footerContent[type];
  document.getElementById('footerModalTitle').textContent = data.title;
  document.getElementById('footerModalContent').innerHTML = data.content.replace(/\n/g, '<br>');
  openModal('modal-footer');
}

// ===============================
//  LANGUAGE (stub)
// ===============================
function showLangModal() { openModal('modal-lang'); }
function setLang(lang) {
  showToast(`Language set: ${lang}`);
  closeModal('modal-lang');
}

// ===============================
//  TAB SWITCHING
// ===============================
function switchTab(tabId, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-'+tabId).classList.add('active');
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

function setFabActive(btnId) {
  document.querySelectorAll('.fab-tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(btnId)?.classList.add('active');
}

// ===============================
//  MODALS
// ===============================
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ===============================
//  TOAST
// ===============================
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ===============================
//  UTILS
// ===============================
function saveTrip() {
  localStorage.setItem('evnly_trip', JSON.stringify(trip));
}

function formatCurrency(amount, currency) {
  if (!amount) return `${currency || ''} 0`;
  return `${currency || ''} ${amount.toLocaleString('en', {minimumFractionDigits:0, maximumFractionDigits:2})}`;
}

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('en-GB', {day:'numeric', month:'short'});
}

// ===============================
//  INIT
// ===============================
window.addEventListener('DOMContentLoaded', () => {
  if (!trip) trip = { currencies: ['HKD'], members: [], expenses: [], itinerary: {}, name: '' };
  initCreatePage();

  // If there's an existing trip, offer to resume
  const saved = JSON.parse(localStorage.getItem('evnly_trip') || 'null');
  if (saved && saved.name) {
    trip = saved;
    // Show resume option on landing page
    const hero = document.querySelector('.cta-section');
    hero.insertAdjacentHTML('beforeend', `
      <div style="margin-top:20px;padding:16px;background:var(--white);border-radius:16px;border:2px solid var(--black);">
        <div style="font-family:'Quicksand',sans-serif;font-weight:700;margin-bottom:8px;">Resume last trip: ${saved.name}</div>
        <button class="btn-primary" style="width:100%;text-align:center;" onclick="goTo('page-dashboard')">Continue →</button>
      </div>
    `);
  }
});