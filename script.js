// CLOUD ENGINE v10.0
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
let db = { cap: 0, items: [], friends: [], splits: [], debts: [], goal: 0 };
let sessionUser = JSON.parse(localStorage.getItem('ss_verified_user')) || null;
let selectedFriends = [];

// THEME CONTROL
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('ss_theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
}

// IDENTITY SERVICES
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
        db = snap.val() || { cap: 0, items: [], friends: [], splits: [], debts: [], goal: 0 };
        renderAppUI();
    });
}

function saveToCloud() {
    if (!sessionUser) return;
    db.cap = parseFloat(document.getElementById('capital').value) || 0;
    db.goal = parseFloat(document.getElementById('goal-in').value) || 0;
    database.ref('users/' + sessionUser.email.replace(/\./g, ',')).set(db);
}

// BILATERAL FRIENDING
function sendRequest() {
    const t = document.getElementById('f-email-req').value;
    if (t && t !== sessionUser.email) {
        database.ref('requests/' + t.replace(/\./g, ',')).push({ from: sessionUser.email, name: sessionUser.name });
        alert("Sentinel Dispatched!");
    }
}

function listenForInvites() {
    database.ref('requests/' + sessionUser.email.replace(/\./g, ',')).on('value', (snap) => {
        const list = document.getElementById('pending-req-list'); list.innerHTML = "";
        snap.forEach(c => {
            const r = c.val();
            list.innerHTML += `<div class="row-item"><div><strong>${r.name}</strong></div><button class="btn" style="width:auto; padding:10px 20px;" onclick="acceptReq('${r.from}', '${c.key}')">LINK</button></div>`;
        });
    });
}

function acceptReq(senderEmail, key) {
    if(!db.friends) db.friends = [];
    db.friends.push({ email: senderEmail });
    saveToCloud();
    const senderPath = 'users/' + senderEmail.replace(/\./g, ',') + '/friends';
    database.ref(senderPath).once('value').then(snap => {
        let fList = snap.val() || []; fList.push({ email: sessionUser.email });
        database.ref(senderPath).set(fList);
    });
    database.ref('requests/' + sessionUser.email.replace(/\./g, ',') + '/' + key).remove();
}

// UI RENDERING ENGINE
function renderAppUI() {
    document.getElementById('auth-portal').style.display = 'none';
    document.getElementById('u-name').innerText = sessionUser.name;
    document.getElementById('capital').value = db.cap || 0;
    document.getElementById('goal-in').value = db.goal || 0;
    refreshUI();
}

function refreshUI() {
    const total = (db.items || []).reduce((s, i) => s + i.a, 0);
    const score = db.cap > 0 ? Math.round(Math.max(0, 100 - (total/db.cap*100))) : 100;
    document.getElementById('score').innerText = score;
    
    // AI Reactivity
    const status = document.getElementById('ai-status');
    const insight = document.getElementById('ai-insight');
    const bars = document.querySelectorAll('.neural-vis .bar');
    if (score > 75) { status.innerText = "STATUS: OPTIMAL"; insight.innerText = "Disciplined behavior detected."; }
    else { status.innerText = "STATUS: CRITICAL"; insight.innerText = "Immediate correction required."; }
    bars.forEach(bar => { bar.style.height = (score < 50 ? Math.random() * 80 + 20 : Math.random() * 30 + 10) + "%"; });

    // Progress
    const surplus = Math.max(0, db.cap - total);
    let prog = db.goal > 0 ? (surplus / db.goal) * 100 : 0;
    document.getElementById('goal-bar').style.width = Math.min(100, prog) + '%';
    document.getElementById('goal-msg').innerText = Math.round(prog) + "% REACHED";

    // Public Network Visibility
    const fList = document.getElementById('friend-list'); fList.innerHTML = "";
    (db.friends || []).forEach(f => {
        database.ref('users/' + f.email.replace(/\./g, ',')).once('value').then(snap => {
            const d = snap.val() || { cap: 0, items: [] };
            const ft = (d.items || []).reduce((s, i) => s + i.a, 0);
            const fs = d.cap > 0 ? Math.round(Math.max(0, 100 - (ft/d.cap*100))) : 100;
            fList.innerHTML += `<div class="row-item"><div>${f.email}</div><div>Health: ${fs}% | Spent: ₹${ft}</div></div>`;
        });
    });

    // Lists logic
    document.getElementById('split-list').innerHTML = Object.entries(db.splits || {}).map(([key, s]) => `
        <div class="row-item ${s.paid ? 'strikethrough' : ''}"><div>₹${s.amount} from ${s.from}<br><small>${s.desc}</small></div>${!s.paid ? `<button class="btn" style="width:auto; padding:10px 20px;" onclick="settleSplit('${key}')">SETTLE</button>` : '<div>PAID</div>'}</div>`).join('');

    document.getElementById('debt-list').innerHTML = (db.debts || []).map(d => `
        <div class="row-item ${d.paid ? 'strikethrough' : ''}"><div>₹${d.amount} to ${d.name}</div>${!d.paid ? `<button class="btn" style="width:auto; padding:10px 20px;" onclick="settleDebt(${d.id})">SETTLE</button>` : '<div>PAID</div>'}</div>`).join('');

    document.getElementById('ledger-list').innerHTML = (db.items || []).map(i => `<div class="row-item"><div>${i.n}</div><div style="color:var(--danger);font-weight:800;">- ₹${i.a}</div></div>`).reverse().join('');
}

// HANDLERS
function addExpense() {
    const n = document.getElementById('exp-name').value, a = parseFloat(document.getElementById('exp-amt').value);
    if (n && a) { if (!db.items) db.items = []; db.items.push({ id: Date.now(), n, a }); saveToCloud(); }
}
function genSplit() {
    const d = document.getElementById('s-desc').value, t = parseFloat(document.getElementById('s-total').value);
    if (d && t && selectedFriends.length > 0) {
        const share = (t / (selectedFriends.length + 1)).toFixed(2);
        selectedFriends.forEach(e => { database.ref('users/' + e.replace(/\./g, ',') + '/splits').push({ from: sessionUser.name, desc: d, amount: share, paid: false }); });
        selectedFriends = []; saveToCloud();
    }
}
function settleSplit(key) { db.splits[key].paid = true; saveToCloud(); }
function addDebt() {
    const n = document.getElementById('d-name').value, a = parseFloat(document.getElementById('d-amt').value);
    if (n && a) { if (!db.debts) db.debts = []; db.debts.push({ id: Date.now(), name: n, amount: a, paid: false }); db.cap += a; saveToCloud(); }
}
function settleDebt(id) { const idx = (db.debts || []).findIndex(d => d.id === id); if(idx !== -1) { db.debts[idx].paid = true; saveToCloud(); } }
function toggleFriend(e) { selectedFriends.includes(e) ? selectedFriends = selectedFriends.filter(x => x !== e) : selectedFriends.push(e); refreshUI(); }
function switchView(id, el) { document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active')); document.getElementById(id).classList.add('active'); el.classList.add('active'); }
function terminateSession() { google.accounts.id.disableAutoSelect(); localStorage.clear(); location.reload(); }
window.onload = () => { if (localStorage.getItem('ss_theme') === 'light') document.body.classList.add('light-mode'); if (sessionUser) { syncWithCloud(); listenForInvites(); } };