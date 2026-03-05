const firebaseConfig = {
    apiKey: "AIzaSyCDOeHLirq8WBZuje4sVCMhr_o-FgO33RQ",
    authDomain: "savesense-59984.firebaseapp.com",
    databaseURL: "https://savesense-59984-default-rtdb.firebaseio.com",
    projectId: "savesense-59984",
    storageBucket: "savesense-59984.firebasestorage.app",
    messagingSenderId: "443729647388",
    appId: "1:443729647388:web:9a0f0412eb715aae2c0cd9"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
let db = { cap: 0, items: [], friends: [], splits: [], debts: [] };
let sessionUser = JSON.parse(localStorage.getItem('ss_verified_user')) || null;
let selectedFriends = [];

// THEME TOGGLE
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('ss_theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
}

// AUTH HANDLER
function onGoogleSignIn(response) {
    const profile = JSON.parse(atob(response.credential.split('.')[1]));
    sessionUser = { name: profile.name, email: profile.email };
    localStorage.setItem('ss_verified_user', JSON.stringify(sessionUser));
    document.getElementById('auth-portal').style.display = 'none';
    syncWithCloud();
    listenForInvites();
}

function syncWithCloud() {
    if (!sessionUser) return;
    database.ref('users/' + sessionUser.email.replace(/\./g, ',')).on('value', (snap) => {
        db = snap.val() || { cap: 0, items: [], friends: [], splits: [], debts: [] };
        renderUI();
    });
}

// MUTUAL LINKING
function sendRequest() {
    const target = document.getElementById('f-email-req').value;
    if (target && target !== sessionUser.email) {
        database.ref('requests/' + target.replace(/\./g, ',')).push({ from: sessionUser.email, name: sessionUser.name });
        alert("Sentinel Dispatched!");
    }
}

function listenForInvites() {
    database.ref('requests/' + sessionUser.email.replace(/\./g, ',')).on('value', (snap) => {
        const list = document.getElementById('pending-req-list'); list.innerHTML = "";
        snap.forEach(c => {
            const r = c.val();
            list.innerHTML += `<div class="row-item"><div><strong>${r.name}</strong></div><button class="btn" style="width:auto; padding:10px;" onclick="acceptReq('${r.from}', '${c.key}')">LINK</button></div>`;
        });
    });
}

function acceptReq(senderEmail, key) {
    if(!db.friends) db.friends = [];
    db.friends.push({ email: senderEmail });
    database.ref('users/' + sessionUser.email.replace(/\./g, ',') + '/friends').set(db.friends);
    
    // Bilateral update
    const senderPath = 'users/' + senderEmail.replace(/\./g, ',') + '/friends';
    database.ref(senderPath).once('value').then(snap => {
        let fList = snap.val() || []; fList.push({ email: sessionUser.email });
        database.ref(senderPath).set(fList);
    });
    database.ref('requests/' + sessionUser.email.replace(/\./g, ',') + '/' + key).remove();
}

function renderUI() {
    if (!sessionUser) return;
    document.getElementById('auth-portal').style.display = 'none';
    document.getElementById('u-name').innerText = sessionUser.name;
    document.getElementById('capital').value = db.cap || 0;
    
    const total = (db.items || []).reduce((s, i) => s + i.a, 0);
    const score = db.cap > 0 ? Math.round(Math.max(0, 100 - (total/db.cap*100))) : 100;
    document.getElementById('score').innerText = score;

    // AI BEHAVIOR
    const status = document.getElementById('ai-status');
    status.innerText = score > 75 ? "Status: Optimal" : score > 40 ? "Status: Volatile" : "Status: Critical";
    status.style.color = score > 75 ? "var(--accent)" : "var(--danger)";

    // PUBLIC NETWORK STATS
    const fList = document.getElementById('friend-list'); fList.innerHTML = "";
    (db.friends || []).forEach(f => {
        database.ref('users/' + f.email.replace(/\./g, ',')).once('value').then(snap => {
            const data = snap.val() || { cap: 0, items: [] };
            const ft = (data.items || []).reduce((s, i) => s + i.a, 0);
            const fs = data.cap > 0 ? Math.round(Math.max(0, 100 - (ft/data.cap*100))) : 100;
            fList.innerHTML += `<div class="row-item"><div>${f.email}</div><div>Health: ${fs}% | Spent: ₹${ft}</div></div>`;
        });
    });

    // LISTS
    document.getElementById('ledger-list').innerHTML = (db.items || []).map(i => `<div class="row-item"><div>${i.n}</div><div>₹${i.a}</div></div>`).reverse().join('');
}

function addExpense() {
    const n = document.getElementById('exp-name').value, a = parseFloat(document.getElementById('exp-amt').value);
    if (n && a) {
        if (!db.items) db.items = [];
        db.items.push({ id: Date.now(), n, a });
        database.ref('users/' + sessionUser.email.replace(/\./g, ',') + '/items').set(db.items);
    }
}

function saveToCloud() {
    if (!sessionUser) return;
    const cap = parseFloat(document.getElementById('capital').value) || 0;
    database.ref('users/' + sessionUser.email.replace(/\./g, ',') + '/cap').set(cap);
}

function switchView(id, el) { 
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); 
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active')); 
    document.getElementById(id).classList.add('active'); el.classList.add('active'); 
}

function terminateSession() { 
    google.accounts.id.disableAutoSelect(); 
    localStorage.clear(); 
    location.reload(); 
}

window.onload = () => {
    if (localStorage.getItem('ss_theme') === 'light') document.body.classList.add('light-mode');
    if (sessionUser) { syncWithCloud(); listenForInvites(); }
};