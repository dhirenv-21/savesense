// ... [Firebase Config stays the same] ...

function runAI(score) {
    const status = document.getElementById('ai-status');
    const insight = document.getElementById('ai-insight');
    const bars = document.querySelectorAll('.neural-vis .bar');
    
    if (score > 80) {
        status.innerText = "STATUS: OPTIMAL";
        insight.innerText = "Financial pattern indicates extreme sentinel discipline.";
    } else {
        status.innerText = "STATUS: CRITICAL";
        insight.innerText = "Immediate behavioral correction required to prevent erosion.";
    }
    
    bars.forEach(bar => {
        bar.style.height = (score < 50 ? Math.random() * 80 + 20 : Math.random() * 30 + 10) + "%";
    });
}

function refreshUI() {
    const total = (db.items || []).reduce((s, i) => s + i.a, 0);
    const score = db.cap > 0 ? Math.round(Math.max(0, 100 - (total/db.cap*100))) : 100;
    document.getElementById('score').innerText = score;
    
    // PUBLIC VISIBILITY LOGIC
    const fList = document.getElementById('friend-list'); fList.innerHTML = "";
    (db.friends || []).forEach(f => {
        database.ref('users/' + f.email.replace(/\./g, ',')).once('value').then(snap => {
            const data = snap.val() || { cap: 0, items: [] };
            const fT = (data.items || []).reduce((s, i) => s + i.a, 0);
            const fS = data.cap > 0 ? Math.round(Math.max(0, 100 - (fT/data.cap*100))) : 100;
            fList.innerHTML += `<div class="row-item"><div><strong>${f.email}</strong></div><div>Health: ${fS}% | Spent: ₹${fT}</div></div>`;
        });
    });

    runAI(score);
    // ... [Other list logic stays same] ...
}

function switchView(id, el) { 
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); 
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active')); 
    document.getElementById(id).classList.add('active'); el.classList.add('active'); 
}