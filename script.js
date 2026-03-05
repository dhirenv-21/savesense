// CLOUD ENGINE v11.0
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
let db = { cap: 0, items: [], friends: [], splits: [], goal: 0 };
let sessionUser = JSON.parse(localStorage.getItem('ss_verified_user')) || null;
let selectedFriends = [];

// NEURAL AI ANALYSIS
function runAI(score) {
    const status = document.getElementById('ai-status');
    const insight = document.getElementById('ai-insight');
    const bars = document.querySelectorAll('.neural-vis .bar');
    if (score > 80) {
        status.innerText = "NEURAL STATUS: OPTIMAL";
        insight.innerText = "Behavior patterns indicate peak sentinel discipline.";
        status.style.color = "var(--accent)";
    } else {
        status.innerText = "NEURAL STATUS: CRITICAL";
        insight.innerText = "System detects capital erosion. Modification required.";
        status.style.color = "#f43f5e";
    }
    bars.forEach(bar => { bar.style.height = (score < 50 ? Math.random() * 80 + 20 : Math.random() * 30 + 10) + "%"; });
}

// IDENTITY HANDLER
function onGoogleSignIn(response) {
    const profile = JSON.parse(atob(response.credential.split('.')[1]));
    sessionUser = { name: profile.name, email: profile.email };
    localStorage.setItem('ss_verified_user', JSON.stringify(sessionUser));
    syncWithCloud();
}

function syncWithCloud() {
    if (!sessionUser) return;
    database.ref('users/' + sessionUser.email.replace(/\./g, ',')).on('value', (snap) => {
        db = snap.val() || { cap: 0, items: [], friends: [], splits: [], goal: 0 };
        renderAppUI();
    });
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
            list.innerHTML += `<div class="row-item"><div>${r.name}</div><button class="btn" style="width:auto; padding:10px 20px;" onclick="acceptReq('${r.from}', '${c.key}')">LINK</button></div>`;
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
    refreshUI();
}

function refreshUI() {
    const total = (db.items || []).reduce((s, i) => s + i.a, 0);
    const score = db.cap > 0 ? Math.round(Math.max(0, 100 - (total/db.cap*100))) : 100;
    document.getElementById('score').innerText = score;
    runAI(score);

    // Public Stats Visibility
    const fList = document.getElementById('friend-list'); fList.innerHTML = "";
    (db.friends || []).forEach(f => {
        database.ref('users/' + f.email.replace(/\./g, ',')).once('value').then(snap => {
            const data = snap.val() || { cap: 0, items: [] };
            const ft = (data.items || []).reduce((s, i) => s + i.a, 0);
            const fs = data.cap > 0 ? Math.round(Math.max(0, 100 - (ft/data.cap*100))) : 100;
            fList.innerHTML += `<div class="row-item"><div><strong>${f.email}</strong></div><div>Health: ${fs}% | Spent: ₹${ft}</div></div>`;
        });
    });

    // Ledger & Splits logic remains as before...
    document.getElementById('ledger-list').innerHTML = (db.items || []).map(i => `<div class="row-item"><div>${i.n}</div><div style="color:#f43f5e; font-weight:800;">-₹${i.a}</div></div>`).reverse().join('');
    listenForInvites();
}

// HELPERS
function saveToCloud() {
    if (!sessionUser) return;
    db.cap = parseFloat(document.getElementById('capital').value) || 0;
    database.ref('users/' + sessionUser.email.replace(/\./g, ',')).set(db);
}
function addExpense() {
    const n = document.getElementById('exp-name').value, a = parseFloat(document.getElementById('exp-amt').value);
    if (n && a) { if (!db.items) db.items = []; db.items.push({ id: Date.now(), n, a }); saveToCloud(); }
}
function toggleTheme() { document.body.classList.toggle('light-mode'); localStorage.setItem('ss_theme', document.body.classList.contains('light-mode') ? 'light' : 'dark'); }
function switchView(id, el) { document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active')); document.getElementById(id).classList.add('active'); el.classList.add('active'); }
function terminateSession() { google.accounts.id.disableAutoSelect(); localStorage.clear(); location.reload(); }
window.onload = () => { if (localStorage.getItem('ss_theme') === 'light') document.body.classList.add('light-mode'); if (sessionUser) syncWithCloud(); };