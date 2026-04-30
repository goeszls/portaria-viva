let currentUser = null;
let selectedStaff = null;
let myChart = null;

const Database = {
    async save(key, data) { localStorage.setItem('staff_v1_' + key, JSON.stringify(data)); },
    async load(key) { return JSON.parse(localStorage.getItem('staff_v1_' + key) || '[]'); }
};

document.addEventListener('DOMContentLoaded', () => { lucide.createIcons(); });

// LOGIN
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('loginUser').value.toLowerCase();
    const p = document.getElementById('loginPass').value;

    if(u === 'rh' && p === 'admin') {
        currentUser = {u: 'DEPARTAMENTO RH', role: 'admin'};
        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('mainDashboard').classList.remove('hidden');
        document.getElementById('navAdmin').classList.remove('hidden');
        initDashboard();
        atualizarRelogio();
    }
});

// OPERAÇÃO
async function filtrarFuncionarios() {
    const busca = document.getElementById('searchStaff').value.toLowerCase();
    const res = document.getElementById('resultadoBusca');
    const staff = await Database.load('staff');
    if(busca.length < 1) return res.classList.add('hidden');

    const filtrados = staff.filter(s => s.nome.toLowerCase().includes(busca)).slice(0, 5);
    res.innerHTML = filtrados.map(s => `
        <div onclick="selecionarStaffRegistro(${s.id})" class="p-5 hover:bg-indigo-600 cursor-pointer text-xs font-black text-white uppercase border-b border-white/5 flex justify-between">
            <span>${s.nome}</span>
            <span class="opacity-40 text-[9px]">${s.setor}</span>
        </div>
    `).join('');
    res.classList.remove('hidden');
}

async function selecionarStaffRegistro(id) {
    const staff = await Database.load('staff');
    selectedStaff = staff.find(s => s.id === id);
    document.getElementById('resultadoBusca').classList.add('hidden');
    document.getElementById('searchStaff').value = "";
    document.getElementById('nomeStaffSelecionado').innerText = selectedStaff.nome;
    document.getElementById('infoStaffSelecionado').innerText = `${selectedStaff.cargo} | SETOR: ${selectedStaff.setor}`;
    document.getElementById('formRegistroContainer').classList.remove('hidden');
}

async function salvarRegistro() {
    const tipo = document.querySelector('input[name="motivo"]:checked')?.value;
    if(!tipo) return;

    const logs = await Database.load('logs');
    logs.push({
        id: Date.now(),
        nome: selectedStaff.nome,
        setor: selectedStaff.setor,
        data: new Date().toLocaleDateString('pt-br'),
        hora: new Date().toLocaleTimeString('pt-br', {hour: '2-digit', minute:'2-digit'}),
        tipo: tipo
    });
    
    await Database.save('logs', logs);
    document.getElementById('formRegistroContainer').classList.add('hidden');
    initDashboard();
}

// RH: CADASTRO
document.getElementById('formStaff').addEventListener('submit', async (e) => {
    e.preventDefault();
    const n = document.getElementById('staffNome').value.toUpperCase();
    const s = document.getElementById('staffSetor').value;
    const c = document.getElementById('staffCargo').value.toUpperCase();
    if(!n || !c) return;

    const staff = await Database.load('staff');
    staff.push({ id: Date.now(), nome: n, setor: s, cargo: c });
    await Database.save('staff', staff);
    carregarQuadroStaff();
    e.target.reset();
});

async function carregarQuadroStaff() {
    const s = await Database.load('staff');
    document.getElementById('listaStaff').innerHTML = s.map(i => `
        <tr class="border-b border-white/5">
            <td class="p-5 uppercase text-xs font-black text-white">${i.nome}</td>
            <td class="p-5 text-indigo-400 text-[10px] font-black">${i.setor}</td>
            <td class="p-5 text-slate-500 text-[9px]">${i.cargo}</td>
            <td class="p-5 text-right"><button onclick="removerItem(${i.id}, 'staff')" class="text-red-500/30 hover:text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button></td>
        </tr>
    `).join('');
    lucide.createIcons();
}

// RELATÓRIO
async function imprimirRelatorioRH() {
    const logs = (await Database.load('logs')).reverse();
    const win = window.open('', '', 'width=900,height=700');
    let rows = logs.map(l => `<tr><td>${l.data} ${l.hora}</td><td>${l.nome}</td><td>${l.setor}</td><td>${l.tipo}</td></tr>`).join('');

    win.document.write(`
        <html><head><style>
            body { font-family: sans-serif; padding: 40px; }
            h1 { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; font-size: 11px; }
        </style></head>
        <body>
            <h1>Relatório de Frequência Staff</h1>
            <table><thead><tr><th>Data/Hora</th><th>Funcionário</th><th>Setor</th><th>Tipo</th></tr></thead>
            <tbody>${rows}</tbody></table>
            <script>window.onload = function() { window.print(); window.close(); }</script>
        </body></html>
    `);
    win.document.close();
}

// DASHBOARD
async function initDashboard() {
    const staff = await Database.load('staff');
    document.getElementById('statTotalStaff').innerText = staff.length;
    const ctx = document.getElementById('chartFluxo').getContext('2d');
    if(myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'], datasets: [{ data: [10, 15, 8, 12, 20], backgroundColor: '#6366f1' }] },
        options: { plugins: { legend: { display: false } } }
    });
    lucide.createIcons();
}

// UTILITÁRIOS
function navTo(id, e) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active', 'bg-indigo-600', 'text-white'));
    document.getElementById(id).classList.remove('hidden');
    e.currentTarget.classList.add('active', 'bg-indigo-600', 'text-white');
    if(id === 'aba-admin') carregarQuadroStaff();
}

function atualizarRelogio() {
    const h = document.getElementById('horaAtual');
    if(h) h.innerText = new Date().toLocaleTimeString('pt-br', {hour: '2-digit', minute:'2-digit'});
    setTimeout(atualizarRelogio, 60000);
}

function logout() { location.reload(); }
async function removerItem(id, banco) {
    let l = await Database.load(banco);
    l = l.filter(i => i.id !== id);
    await Database.save(banco, l);
    carregarQuadroStaff();
}
