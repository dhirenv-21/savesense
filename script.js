// CLOUD CONFIGURATION
const firebaseConfig = {
    apiKey: "AIzaSyCDOeHLirq8WBZuje4sVCMhr_o-FgO33RQ",
    authDomain: "savesense-59984.firebaseapp.com",
    databaseURL: "https://savesense-59984-default-rtdb.firebaseio.com",
    projectId: "savesense-59984",
    storageBucket: "savesense-59984.firebasestorage.app",
    messagingSenderId: "443729647388",
    appId: "1:443729647388:web:9a0f0412eb715aae2c0cd9",
    measurementId: "G-S43Q1QXYT4"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let db = { cap: 0, goal: 0, items: [], friends: [], splits: [], debts: [] };
let sessionUser = JSON.parse(localStorage.getItem('ss_verified_user')) || null;
let selectedFriends = [];

// AUTHENTICATION
function onGoogleSignIn(response) {
    const profile = JSON.parse(atob(response.credential.split('.')[1]));
    sessionUser = { name: profile.name, email: profile.email };
    localStorage.setItem('ss_verified_user', JSON.stringify(sessionUser));
    syncWithCloud();
    listenForInvites();
}

function syncWithCloud() {
    if (!sessionUser) return;
    database.ref('users/' + sessionUser.email.replace(/\./g, ',')).on('value', (snap) => {
        if (snap.exists()) db = snap.val();
        renderAppUI();
    });
}

function saveToCloud() {
    if (!sessionUser) return;
    db.cap = parseFloat(document.getElementById('capital').value) || 0;
    db.goal = parseFloat(document.getElementById('goal-in').value) || 0;
    database.ref('users/' + sessionUser.email.replace(/\./g, ',')).set(db);
}

// MUTUAL SOCIAL LOGIC
function sendRequest() {
    const t = document.getElementById('f-email-req').value;
    if (t && t !== sessionUser.email) {
        database.ref('requests/' + t.replace(/\./g, ',')).push({ from: sessionUser.email, name: sessionUser.name });
        alert("Invitation Dispatched!");
    }
}

function listenForInvites() {
    database.ref('requests/' + sessionUser.email.replace(/\./g, ',')).on('value', (snap) => {
        const list = document.getElementById('pending-req-list'); list.innerHTML = "";
        snap.forEach(c => {
            const r = c.val();
            list.innerHTML += `<div class="row-item"><div><strong>${r.name}</strong><br><small>${r.from}</small></div><button class="btn" style="padding: 12px; width: auto;" onclick="acceptReq('${r.from}', '${c.key}')">ACCEPT</button></div>`;
        });
    });
}

function acceptReq(senderEmail, key) {
    if(!db.friends) db.friends = [];
    db.friends.push({ email: senderEmail });
    saveToCloud();

    // Bi-directional friend link
    const senderPath = 'users/' + senderEmail.replace(/\./g, ',') + '/friends';
    database.ref(senderPath).once('value').then(snap => {
        let fList = snap.val() || [];
        fList.push({ email: sessionUser.email });
        database.ref(senderPath).set(fList);
    });

    database.ref('requests/' + sessionUser.email.replace(/\./g, ',') + '/' + key).remove();
}

// SPLIT & DEBT LOGIC
function genSplit() {
    const d = document.getElementById('s-desc').value, t = parseFloat(document.getElementById('s-total').value);
    if (d && t && selectedFriends.length > 0) {
        const share = (t / (selectedFriends.length + 1)).toFixed(2);
        selectedFriends.forEach(e => {
            database.ref('users/' + e.replace(/\./g, ',') + '/splits').push({ id: Date.now()+Math.random(), from: sessionUser.name, desc: d, amount: share, paid: false });
        });
        selectedFriends = []; saveToCloud();
    }
}

function settleSplit(key) {
    if(!db.splits) return;
    db.splits[key].paid = true;
    saveToCloud();
}

function addDebt() {
    const n = document.getElementById('d-name').value, a = parseFloat(document.getElementById('d-amt').value);
    if (n && a) {
        if (!db.debts) db.debts = [];
        db.debts.push({ id: Date.now(), name: n, amount: a, paid: false });
        db.cap += a; saveToCloud();
    }
}

function settleDebt(id) {
    const dIdx = (db.debts || []).findIndex(d => d.id === id);
    if(dIdx !== -1) { db.debts[dIdx].paid = true; saveToCloud(); }
}

function addExpense() {
    const n = document.getElementById('exp-name').value, a = parseFloat(document.getElementById('exp-amt').value);
    if (n && a) {
        if (!db.items) db.items = [];
        db.items.push({ id: Date.now(), n, a });
        saveToCloud();
        document.getElementById('exp-name').value = ''; document.getElementById('exp-amt').value = '';
    }
}

// UI RENDERING
function renderAppUI() {
    document.getElementById('auth-portal').style.display = 'none';
    document.getElementById('u-name').innerText = sessionUser.name;
    document.getElementById('capital').value = db.cap || 0;
    document.getElementById('goal-in').value = db.goal || 0;
    refreshUI();
}

function refreshUI() {
    const total = (db.items || []).reduce((s, i) => s + i.a, 0);
    document.getElementById('spent').innerText = total.toLocaleString('en-IN');
    document.getElementById('score').innerText = Math.round(db.cap > 0 ? Math.max(0, 100 - (total/db.cap*100)) : 100);
    
    // Savings progress
    const surplus = Math.max(0, db.cap - total);
    let prog = db.goal > 0 ? (surplus / db.goal) * 100 : 0;
    document.getElementById('goal-bar').style.width = Math.min(100, prog) + '%';
    document.getElementById('goal-msg').innerText = Math.round(prog) + "% OBJECTIVE REACHED";

    // Owed counter
    const owed = Object.values(db.splits || {}).filter(s => !s.paid).reduce((s, it) => s + parseFloat(it.amount), 0);
    document.getElementById('total-owed-ui').innerText = `Total Owed: ₹${owed.toLocaleString('en-IN')}`;

    // Lists
    document.getElementById('friend-list').innerHTML = (db.friends || []).map(f => `<div class="row-item">${f.email}</div>`).join('');
    
    document.getElementById('split-list').innerHTML = Object.entries(db.splits || {}).map(([key, s]) => `
        <div class="row-item ${s.paid ? 'strikethrough' : ''}">
            <div><strong>₹${s.amount}</strong> to ${s.from}<br><small>${s.desc}</small></div>
            ${!s.paid ? `<button class="btn" style="padding: 10px; width: auto; font-size: 10px;" onclick="settleSplit('${key}')">SETTLE</button>` : '<div>✓ SETTLED</div>'}
        </div>`).join('');

    document.getElementById('debt-list').innerHTML = (db.debts || []).map(d => `
        <div class="row-item ${d.paid ? 'strikethrough' : ''}">
            <div><strong>₹${d.amount}</strong> from ${d.name}</div>
            ${!d.paid ? `<button class="btn" style="padding: 10px; width: auto; font-size: 10px;" onclick="settleDebt(${d.id})">SETTLE</button>` : '<div>✓ SETTLED</div>'}
        </div>`).join('');

    document.getElementById('ledger-list').innerHTML = (db.items || []).map(i => `<div class="row-item"><div>${i.n}</div><div style="color:var(--danger);font-weight:800;">- ₹${i.a}</div></div>`).reverse().join('');
    
    const target = document.getElementById('f-selection');
    if(target) target.innerHTML = (db.friends || []).map(f => `<div class="friend-chip ${selectedFriends.includes(f.email)?'selected':''}" onclick="toggleFriend('${f.email}')">${f.email}</div>`).join('');
    
    renderCalendar();
}

function renderCalendar() {
    const body = document.getElementById('cal-body');
    if (!body) return; body.innerHTML = "";
    const now = new Date(), m = now.getMonth(), y = now.getFullYear();
    const days = new Date(y, m + 1, 0).getDate();
    const start = new Date(y, m, 1).getDay();

    for (let x = 0; x < start; x++) body.innerHTML += `<div class="cal-day" style="opacity:0;"></div>`;
    for (let i = 1; i <= days; i++) {
        const dayExp = (db.items || []).filter(item => {
            const d = new Date(item.id);
            return d.getDate() === i && d.getMonth() === m;
        }).reduce((s, it) => s + it.a, 0);
        const today = i === now.getDate() ? "border-color:var(--accent); background: #111;" : "";
        body.innerHTML += `<div class="cal-day" style="${today}"><div>${i}</div>${dayExp > 0 ? `<div style="color:var(--danger);font-weight:800;margin-top:10px;">₹${dayExp}</div>` : ''}</div>`;
    }
}

function toggleFriend(e) { selectedFriends.includes(e) ? selectedFriends = selectedFriends.filter(x => x !== e) : selectedFriends.push(e); refreshUI(); }
function switchView(id, el) { document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active')); document.getElementById(id).classList.add('active'); el.classList.add('active'); }
function terminateSession() { google.accounts.id.disableAutoSelect(); localStorage.removeItem('ss_verified_user'); location.reload(); }
window.onload = () => { if (sessionUser) { syncWithCloud(); listenForInvites(); } };