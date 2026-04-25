let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    carregarUsuarios();
});

// NAVEGAÇÃO ENTRE ABAS
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active-tab'));
    
    document.getElementById(tabId).classList.remove('hidden');
    event.currentTarget.classList.add('active-tab');

    if(tabId === 'tab-historico') carregarHistorico();
}

// RELÓGIO
setInterval(() => {
    const el = document.getElementById('relogio');
    if(el) el.innerText = new Date().toLocaleTimeString('pt-br');
}, 1000);

// NOTIFICAÇÕES (TOAST)
function showToast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    const color = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-slate-800';
    toast.className = `${color} text-white px-6 py-4 rounded-2xl shadow-xl font-bold text-xs uppercase flex items-center gap-3 animate-bounce-short`;
    toast.innerHTML = `<i data-lucide="bell" class="w-4 h-4"></i> ${msg}`;
    container.appendChild(toast);
    lucide.createIcons();
    setTimeout(() => toast.remove(), 3000);
}

// LOGIN
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const user = document.getElementById('loginUser').value;
    const pass = document.getElementById('loginPass').value;
    const dados = JSON.parse(localStorage.getItem('pv_user_' + user));

    if ((user === 'admin' && pass === 'admin') || (dados && dados.pass === pass)) {
        currentUser = dados || { user: 'admin', role: 'admin', entryTime: '08:00' };
        document.getElementById('telaLogin').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        document.getElementById('userStatus').innerText = currentUser.user;
        showToast(`Bem-vindo, ${user}!`, 'success');
    } else {
        showToast('Acesso Negado', 'error');
    }
});

// REGISTRO DE FUNCIONÁRIO
document.getElementById('registerForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const user = document.getElementById('regUser').value;
    const pass = document.getElementById('regPass').value;
    const role = document.getElementById('regRole').value;
    const time = document.getElementById('regTime').value;

    if (!user || !pass) return showToast('Preencha tudo!', 'error');

    localStorage.setItem('pv_user_' + user, JSON.stringify({ user, pass, role, entryTime: time }));
    showToast('Cadastrado!', 'success');
    this.reset();
    carregarUsuarios();
});

function carregarUsuarios() {
    const lista = document.getElementById('userList');
    lista.innerHTML = '';
    for (let i = 0; i < localStorage.length; i++) {
        const chave = localStorage.key(i);
        if (chave.startsWith('pv_user_')) {
            const d = JSON.parse(localStorage.getItem(chave));
            lista.innerHTML += `
                <tr class="border-b border-slate-50">
                    <td class="p-3 font-bold">${d.user} <span class="block text-[9px] text-slate-400">${d.role}</span></td>
                    <td class="p-3 text-xs">${d.entryTime}h</td>
                    <td class="p-3"><button onclick="remover('${chave}')" class="text-red-500 hover:underline">Remover</button></td>
                </tr>`;
        }
    }
}

function remover(chave) {
    if(confirm('Excluir usuário?')) {
        localStorage.removeItem(chave);
        carregarUsuarios();
    }
}

// LOGICA DE PONTO E ATRASO
function baterPonto() {
    const agora = new Date();
    const [hL, mL] = currentUser.entryTime.split(':');
    const limite = new Date();
    limite.setHours(parseInt(hL), parseInt(mL), 0);

    let status = "No Horário";
    if (agora > limite) {
        const diff = Math.floor((agora - limite) / 1000 / 60);
        status = `Atraso: ${diff} min`;
        showToast(status, 'error');
    } else {
        showToast('Ponto batido com sucesso!', 'success');
    }

    const log = { user: currentUser.user, data: agora.toLocaleString('pt-br'), status: status };
    const hist = JSON.parse(localStorage.getItem('pv_historico') || '[]');
    hist.unshift(log);
    localStorage.setItem('pv_historico', JSON.stringify(hist));
}

function carregarHistorico() {
    const lista = document.getElementById('historyList');
    const hist = JSON.parse(localStorage.getItem('pv_historico') || '[]');
    lista.innerHTML = hist.map(l => `
        <tr class="border-b border-slate-50">
            <td class="p-3 font-bold">${l.user}</td>
            <td class="p-3 text-slate-500">${l.data}</td>
            <td class="p-3 font-bold ${l.status.includes('Atraso') ? 'text-red-500' : 'text-green-600'}">${l.status}</td>
        </tr>`).join('');
}

function logout() { location.reload(); }

function gerarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const hist = JSON.parse(localStorage.getItem('pv_historico') || '[]');
    doc.text("Relatorio de Presenca PV-2026", 14, 20);
    doc.autoTable({
        startY: 30,
        head: [['Usuario', 'Data/Hora', 'Status']],
        body: hist.map(l => [l.user, l.data, l.status]),
    });
    doc.save('relatorio.pdf');
}
