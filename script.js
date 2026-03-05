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
let db = { cap: 0, items: [], friends: [], splits: [] };
let sessionUser = JSON.parse(localStorage.getItem('ss_verified_user')) || null;
let selectedFriends = [];

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('ss_theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
}

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
        renderUI();
    });
}

function saveToCloud() {
    if (!sessionUser) return;
    db.cap = parseFloat(document.getElementById('capital').value) || 0;
    database.ref('users/' + sessionUser.email.replace(/\./g, ',')).set(db);
}

// MUTUAL FRIENDING LOGIC
function sendRequest() {
    const t = document.getElementById('f-email-req').value;
    if (t && t !== sessionUser.email) {
        database.ref('requests/' + t.replace(/\./g, ',')).push({ from: sessionUser.email, name: sessionUser.name });
        alert("Invitation Sent!");
    }
}

function listenForInvites() {
    database.ref('requests/' + sessionUser.email.replace(/\./g, ',')).on('value', (snap) => {
        const list = document.getElementById('pending-req-list'); list.innerHTML = "";
        snap.forEach(c => {
            const r = c.val();
            list.innerHTML += `<div class="row-item"><div>${r.name}</div><button class="btn" style="width:auto; padding:5px 15px;" onclick="acceptReq('${r.from}', '${c.key}')">LINK</button></div>`;
        });
    });
}

function acceptReq(senderEmail, key) {
    if(!db.friends) db.friends = [];
    db.friends.push({ email: senderEmail });
    saveToCloud();
    // Mutual Link logic
    const senderPath = 'users/' + senderEmail.replace(/\./g, ',') + '/friends';
    database.ref(senderPath).once('value').then(snap => {
        let fList = snap.val() || []; fList.push({ email: sessionUser.email });
        database.ref(senderPath).set(fList);
    });
    database.ref('requests/' + sessionUser.email.replace(/\./g, ',') + '/' + key).remove();
}

// BEHAVIOR AI
function runAI(score) {
    const status = document.getElementById('ai-status');
    const insight = document.getElementById('ai-insight');
    if (score > 80) {
        status.innerText = "Status: Optimal";
        insight.innerText = "Financial pattern indicates extreme discipline. Sentinel integrity high.";
    } else if (score > 50) {
        status.innerText = "Status: Stable";
        insight.innerText = "Leakage detected. Behavior AI suggests reducing network splits.";
    } else {
        status.innerText = "Status: Critical";
        insight.innerText = "Warning: Severe capital erosion. Shutdown non-essential spending.";
        status.style.color = "var(--danger)";
    }
}

function addExpense() {
    const n = document.getElementById('exp-name').value, a = parseFloat(document.getElementById('exp-amt').value);
    if (n && a) {
        if (!db.items) db.items = [];
        db.items.push({ id: Date.now(), n, a });
        saveToCloud();
    }
}

function genSplit() {
    const d = document.getElementById('s-desc').value, t = parseFloat(document.getElementById('s-total').value);
    if (d && t && selectedFriends.length > 0) {
        const share = (t / (selectedFriends.length + 1)).toFixed(2);
        selectedFriends.forEach(e => {
            database.ref('users/' + e.replace(/\./g, ',') + '/splits').push({ from: sessionUser.name, desc: d, amount: share, paid: false });
        });
        selectedFriends = []; saveToCloud();
    }
}

function settleSplit(key) { db.splits[key].paid = true; saveToCloud(); }

function renderUI() {
    document.getElementById('auth-portal').style.display = 'none';
    document.getElementById('u-name').innerText = sessionUser.name;
    document.getElementById('capital').value = db.cap || 0;
    
    const total = (db.items || []).reduce((s, i) => s + i.a, 0);
    const score = db.cap > 0 ? Math.round(Math.max(0, 100 - (total/db.cap*100))) : 100;
    document.getElementById('score').innerText = score;
    runAI(score);

    // Friend Stats (Public Network)
    const fList = document.getElementById('friend-list');
    fList.innerHTML = "";
    (db.friends || []).forEach(f => {
        database.ref('users/' + f.email.replace(/\./g, ',')).once('value').then(snap => {
            const data = snap.val() || { cap: 0, items: [] };
            const fT = (data.items || []).reduce((s, i) => s + i.a, 0);
            const fS = data.cap > 0 ? Math.round(Math.max(0, 100 - (fT/data.cap*100))) : 100;
            fList.innerHTML += `<div class="row-item"><div>${f.email}</div><div>Health: ${fS}% | Spent: ₹${fT}</div></div>`;
        });
    });

    document.getElementById('split-list').innerHTML = Object.entries(db.splits || {}).map(([k, s]) => `
        <div class="row-item ${s.paid?'strikethrough':''}"><div>₹${s.amount} from ${s.from}</div>${!s.paid?`<button onclick="settleSplit('${k}')">SETTLE</button>`:'<div>PAID</div>'}</div>`).join('');
    
    document.getElementById('f-selection').innerHTML = (db.friends || []).map(f => `<span onclick="toggleFriend('${f.email}')" style="cursor:pointer; padding:5px; border:1px solid var(--border); border-radius:10px; margin-right:5px; ${selectedFriends.includes(f.email)?'background:var(--accent); color:#000;':''}">${f.email}</span>`).join('');
}

function toggleFriend(e) { selectedFriends.includes(e) ? selectedFriends = selectedFriends.filter(x => x !== e) : selectedFriends.push(e); renderUI(); }
function switchView(id, el) { document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active')); document.getElementById(id).classList.add('active'); el.classList.add('active'); }
function terminateSession() { google.accounts.id.disableAutoSelect(); localStorage.removeItem('ss_verified_user'); location.reload(); }

window.onload = () => {
    if (localStorage.getItem('ss_theme') === 'light') document.body.classList.add('light-mode');
    if (sessionUser) { syncWithCloud(); listenForInvites(); }
};