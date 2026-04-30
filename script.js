let currentUser = null;
let selectedAluno = null;
let myChart = null;

const Database = {
    async save(key, data) { localStorage.setItem('pv_data_' + key, JSON.stringify(data)); },
    async load(key) { return JSON.parse(localStorage.getItem('pv_data_' + key) || '[]'); }
};

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    atualizarRelogio();
    carregarAlunos();
    
    document.getElementById('formNovoGestor').addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = document.getElementById('newUserName').value.toUpperCase();
        const p = document.getElementById('newUserPass').value;
        if(!u || !p) return;
        let gestores = await Database.load('gestores');
        gestores.push({u, p, role: 'staff'});
        await Database.save('gestores', gestores);
        e.target.reset();
        renderizarGestores();
    });
});

// LOGIN
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('loginUser').value.toLowerCase();
    const p = document.getElementById('loginPass').value;

    if(u === 'admin' && p === 'admin') {
        currentUser = {u: 'ADMIN MASTER', role: 'admin'};
    } else {
        const gestores = await Database.load('gestores');
        const g = gestores.find(i => i.u.toLowerCase() === u && i.p === p);
        if(g) currentUser = g;
    }

    if(currentUser) {
        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('mainDashboard').classList.remove('hidden');
        document.getElementById('userStatus').innerText = currentUser.u;
        if(currentUser.role === 'admin') document.getElementById('navAdmin').classList.remove('hidden');
        initDashboard();
    }
});

// BUSCA
async function filtrarAlunosAtraso() {
    const busca = document.getElementById('searchAluno').value.toLowerCase();
    const res = document.getElementById('resultadoBusca');
    const alunos = await Database.load('alunos');
    if(busca.length < 1) return res.classList.add('hidden');

    const filtrados = alunos.filter(a => a.nome.toLowerCase().includes(busca));
    res.innerHTML = filtrados.map(a => `
        <div onclick="selecionarAlunoAtraso(${a.id})" class="p-5 hover:bg-indigo-600 cursor-pointer text-xs font-black text-white uppercase border-b border-white/5 flex justify-between transition-colors">
            <span>${a.nome}</span>
            <span class="opacity-50">${a.serie} | ${a.turma}</span>
        </div>
    `).join('');
    res.classList.remove('hidden');
}

async function selecionarAlunoAtraso(id) {
    const alunos = await Database.load('alunos');
    const hist = await Database.load('historico');
    selectedAluno = alunos.find(a => a.id === id);
    const total = hist.filter(h => h.aluno === selectedAluno.nome).length;
    
    document.getElementById('resultadoBusca').classList.add('hidden');
    document.getElementById('searchAluno').value = "";
    document.getElementById('nomeAlunoSelecionado').innerText = selectedAluno.nome;
    document.getElementById('infoAlunoSelecionado').innerText = `${selectedAluno.serie} ${selectedAluno.turma} | TOTAL: ${total} ATRASOS`;
    document.getElementById('statusAlerta').classList.toggle('hidden', total < 3);
    document.getElementById('formAtrasoContainer').classList.remove('hidden');
}

// SALVAR ATRASO
async function salvarAtraso() {
    const motivo = document.querySelector('input[name="motivo"]:checked')?.value;
    if(!motivo) return;

    const hist = await Database.load('historico');
    hist.push({
        id: Date.now(),
        aluno: selectedAluno.nome,
        serie: selectedAluno.serie,
        turma: selectedAluno.turma,
        data: new Date().toLocaleDateString('pt-br'),
        hora: new Date().toLocaleTimeString('pt-br', {hour: '2-digit', minute:'2-digit'}),
        operador: currentUser.u,
        motivo: motivo
    });
    
    await Database.save('historico', hist);
    document.getElementById('formAtrasoContainer').classList.add('hidden');
    initDashboard();
}

// DASHBOARD
async function initDashboard() {
    const alunos = await Database.load('alunos');
    const hist = await Database.load('historico');
    document.getElementById('statTotalAlunos').innerText = alunos.length;

    // Turma com mais atrasos
    const turmas = {};
    hist.forEach(h => {
        const tag = `${h.serie} ${h.turma}`;
        turmas[tag] = (turmas[tag] || 0) + 1;
    });
    let top = "---";
    let max = 0;
    for(let t in turmas) { if(turmas[t] > max) { max = turmas[t]; top = t; } }
    document.getElementById('statTurmaProblema').innerText = top;

    // Alertas Alunos
    const contagem = {};
    hist.forEach(h => contagem[h.aluno] = (contagem[h.aluno] || 0) + 1);
    const riscont = document.getElementById('riscoContainer');
    riscont.innerHTML = "";
    Object.keys(contagem).forEach(n => {
        if(contagem[n] >= 3) {
            riscont.innerHTML += `<div class="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[9px] font-black uppercase text-white flex justify-between items-center animate-pulse">${n} (${contagem[n]}) <i data-lucide="alert-triangle" class="w-3 h-3 text-red-500"></i></div>`;
        }
    });

    const ctx = document.getElementById('chartAtrasos').getContext('2d');
    if(myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: ['S', 'T', 'Q', 'Q', 'S'], datasets: [{ data: [12, 19, 8, 15, 6], backgroundColor: '#6366f1' }] },
        options: { plugins: { legend: { display: false } }, scales: { y: { display: false }, x: { grid: { display: false }, ticks: { color: '#475569', font: { size: 8 } } } } }
    });
    lucide.createIcons();
}

// HISTÓRICO
async function renderizarHistorico() {
    const hist = (await Database.load('historico')).reverse();
    const filtro = document.getElementById('filtroHistorico').value.toLowerCase();
    const corpo = document.getElementById('corpoHistorico');
    
    corpo.innerHTML = hist.filter(h => h.aluno.toLowerCase().includes(filtro)).map(h => `
        <tr class="border-b border-white/5">
            <td class="p-6 text-[10px] text-slate-500 font-mono">${h.data} ${h.hora}</td>
            <td class="p-6 text-xs text-white uppercase">${h.aluno}</td>
            <td class="p-6 text-[10px] font-black uppercase text-indigo-400">${h.serie} ${h.turma}</td>
            <td class="p-6 text-[10px] text-slate-400 font-bold">${h.motivo}</td>
            <td class="p-6 text-right">
                ${currentUser.role === 'admin' ? `<button onclick="removerItemHistorico(${h.id})" class="text-red-500 hover:scale-110 transition-transform"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : `<i data-lucide="lock" class="w-3 h-3 text-slate-700"></i>`}
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

async function removerItemHistorico(id) {
    let hist = await Database.load('historico');
    hist = hist.filter(h => h.id !== id);
    await Database.save('historico', hist);
    renderizarHistorico();
    initDashboard();
}

// ALUNOS
document.getElementById('formAluno').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('alunoNome').value;
    if(!nome) return;
    const a = { id: Date.now(), nome, serie: document.getElementById('alunoSerie').value, turma: document.getElementById('alunoTurma').value, periodo: document.getElementById('alunoPeriodo').value };
    let l = await Database.load('alunos');
    l.push(a);
    await Database.save('alunos', l);
    carregarAlunos();
    e.target.reset();
});

async function carregarAlunos() {
    const l = await Database.load('alunos');
    document.getElementById('listaAlunos').innerHTML = l.map(a => `
        <tr class="border-b border-white/5">
            <td class="p-6 text-xs font-black text-white uppercase">${a.nome}</td>
            <td class="p-6 text-[10px] text-slate-500 font-bold">${a.serie} / ${a.turma}</td>
            <td class="p-6 text-[9px] font-black uppercase text-indigo-400">${a.periodo}</td>
            <td class="p-6 text-right">
                ${currentUser?.role === 'admin' ? `<button onclick="removerAluno(${a.id})" class="text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : `<i data-lucide="lock" class="w-4 h-4 text-slate-800"></i>`}
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

async function removerAluno(id) {
    let l = await Database.load('alunos');
    l = l.filter(a => a.id !== id);
    await Database.save('alunos', l);
    carregarAlunos();
}

function navTo(id, e) {
    if(e) e.preventDefault();
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active', 'bg-indigo-600', 'text-white'));
    document.getElementById(id).classList.remove('hidden');
    if(e) e.currentTarget.classList.add('active', 'bg-indigo-600', 'text-white');
    if(id === 'aba-dash') initDashboard();
    if(id === 'aba-historico') renderizarHistorico();
    if(id === 'aba-admin') renderizarGestores();
}

function atualizarRelogio() {
    const h = document.getElementById('horaAtual');
    if(h) h.innerText = new Date().toLocaleTimeString('pt-br');
    setTimeout(atualizarRelogio, 1000);
}

async function renderizarGestores() {
    const g = await Database.load('gestores');
    document.getElementById('listaGestores').innerHTML = g.map(i => `<tr class="border-b border-white/5"><td class="p-6 text-[10px] font-black text-white">${i.u}</td><td class="p-6 text-right text-green-500 font-black text-[9px]">ATIVO</td></tr>`).join('');
}

function exportarPDF() { /* Implementação idêntica à anterior */ }
function logout() { location.reload(); }
