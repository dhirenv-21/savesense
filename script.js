// CLOUD CONFIG
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
let db = { cap: 0, items: [], friends: [], goal: 0 };
let sessionUser = JSON.parse(localStorage.getItem('ss_verified_user')) || null;

// BEHAVIOR AI CORE
function runAI(score) {
    const status = document.getElementById('ai-status');
    const insight = document.getElementById('ai-insight');
    const bars = document.querySelectorAll('.neural-vis .bar');
    
    if (score > 80) {
        status.innerText = "NEURAL STATUS: OPTIMAL";
        insight.innerText = "Sentinel patterns indicate elite financial discipline.";
    } else {
        status.innerText = "NEURAL STATUS: CRITICAL";
        insight.innerText = "System detects capital erosion. Correction required.";
    }
    bars.forEach(bar => { bar.style.height = (score < 50 ? Math.random() * 85 + 15 : Math.random() * 40 + 10) + "%"; });
}

function onGoogleSignIn(response) {
    const profile = JSON.parse(atob(response.credential.split('.')[1]));
    sessionUser = { name: profile.name, email: profile.email };
    localStorage.setItem('ss_verified_user', JSON.stringify(sessionUser));
    syncWithCloud();
}

function syncWithCloud() {
    if (!sessionUser) return;
    database.ref('users/' + sessionUser.email.replace(/\./g, ',')).on('value', (snap) => {
        db = snap.val() || { cap: 0, items: [], friends: [], goal: 0 };
        renderAppUI();
    });
}

function refreshUI() {
    document.getElementById('auth-portal').style.display = 'none';
    document.getElementById('u-name').innerText = sessionUser.name;
    const total = (db.items || []).reduce((s, i) => s + i.a, 0);
    const score = db.cap > 0 ? Math.round(Math.max(0, 100 - (total/db.cap*100))) : 100;
    document.getElementById('score').innerText = score;
    runAI(score); // Trigger AI Core
}

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('ss_theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
}

function switchView(id, el) { 
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); 
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active')); 
    document.getElementById(id).classList.add('active'); el.classList.add('active'); 
}

function terminateSession() { google.accounts.id.disableAutoSelect(); localStorage.clear(); location.reload(); }
window.onload = () => { if (localStorage.getItem('ss_theme') === 'light') document.body.classList.add('light-mode'); if (sessionUser) syncWithCloud(); };