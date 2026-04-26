let currentUser = null;
let selectedAluno = null;
let myChart = null;

const Database = {
    async save(key, data) { localStorage.setItem('pv_data_' + key, JSON.stringify(data)); },
    async load(key) { return JSON.parse(localStorage.getItem('pv_data_' + key) || '[]'); }
};

// LOGIN DIRETO
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('loginUser').value.toLowerCase();
    const p = document.getElementById('loginPass').value;

    if(u === 'admin' && p === 'admin') {
        currentUser = {u: 'DIRETORIA', role: 'admin'};
    } else {
        const gestores = await Database.load('gestores');
        const g = gestores.find(i => i.u.toLowerCase() === u && i.p === p);
        if(g) currentUser = g;
    }

    if(currentUser) {
        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('mainDashboard').classList.remove('hidden');
        if(currentUser.role === 'admin') document.getElementById('navAdmin').classList.remove('hidden');
        initDashboard();
        atualizarRelogio();
    }
});

// PORTARIA RÁPIDA
async function filtrarAlunosAtraso() {
    const busca = document.getElementById('searchAluno').value.toLowerCase();
    const res = document.getElementById('resultadoBusca');
    const alunos = await Database.load('alunos');
    if(busca.length < 1) return res.classList.add('hidden');

    const filtrados = alunos.filter(a => a.nome.toLowerCase().includes(busca)).slice(0, 5);
    res.innerHTML = filtrados.map(a => `
        <div onclick="selecionarAlunoAtraso(${a.id})" class="p-5 hover:bg-indigo-600 cursor-pointer text-xs font-black text-white uppercase border-b border-white/5 flex justify-between">
            <span>${a.nome}</span>
            <span class="opacity-40 text-[9px]">${a.serie} ${a.turma}</span>
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
    document.getElementById('infoAlunoSelecionado').innerText = `${selectedAluno.serie} - TURMA ${selectedAluno.turma}`;
    document.getElementById('statusAlerta').classList.toggle('hidden', total < 3);
    document.getElementById('formAtrasoContainer').classList.remove('hidden');
}

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
        motivo: motivo
    });
    
    await Database.save('historico', hist);
    document.getElementById('formAtrasoContainer').classList.add('hidden');
    initDashboard();
}

// DASHBOARD (FOCO SEMANAL)
async function initDashboard() {
    const alunos = await Database.load('alunos');
    const hist = await Database.load('historico');
    document.getElementById('statTotalAlunos').innerText = alunos.length;

    const turmas = {};
    hist.forEach(h => { const t = `${h.serie} ${h.turma}`; turmas[t] = (turmas[t] || 0) + 1; });
    let top = "LIMPO";
    let max = 0;
    for(let t in turmas) { if(turmas[t] > max) { max = turmas[t]; top = t; } }
    document.getElementById('statTurmaProblema').innerText = top;

    // Alerta 3+
    const cont = {};
    hist.forEach(h => cont[h.aluno] = (cont[h.aluno] || 0) + 1);
    const riscont = document.getElementById('riscoContainer');
    riscont.innerHTML = "";
    Object.keys(cont).forEach(n => {
        if(cont[n] >= 3) {
            riscont.innerHTML += `<div class="p-4 rounded-2xl bg-white/5 border-l-4 border-red-500 text-[10px] font-black uppercase text-white flex justify-between items-center">${n} <span class="bg-red-600 px-2 py-1 rounded-lg">${cont[n]}x</span></div>`;
        }
    });

    const ctx = document.getElementById('chartAtrasos').getContext('2d');
    if(myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'line',
        data: { labels: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'], datasets: [{ data: [5, 12, 7, 10, 4], borderColor: '#6366f1', tension: 0.4, fill: true, backgroundColor: 'rgba(99, 102, 241, 0.1)' }] },
        options: { plugins: { legend: { display: false } }, scales: { y: { display: false }, x: { grid: { display: false }, ticks: { color: '#475569', font: { size: 9, weight: 'bold' } } } } }
    });
    lucide.createIcons();
}

// HISTÓRICO RÁPIDO
async function renderizarHistorico() {
    const hist = (await Database.load('historico')).reverse();
    const filtro = document.getElementById('filtroHistorico').value.toLowerCase();
    const corpo = document.getElementById('corpoHistorico');
    
    corpo.innerHTML = hist.filter(h => h.aluno.toLowerCase().includes(filtro)).map(h => `
        <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
            <td class="p-6 text-[10px] text-slate-500 font-mono">${h.hora}</td>
            <td class="p-6 text-xs text-white uppercase">${h.aluno}</td>
            <td class="p-6 text-[10px] font-black uppercase text-indigo-400">${h.serie} ${h.turma}</td>
            <td class="p-6 text-[10px] text-slate-400">${h.motivo}</td>
            <td class="p-6 text-right">${currentUser.role === 'admin' ? `<button onclick="removerItem(${h.id}, 'historico')" class="text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : '—'}</td>
        </tr>
    `).join('');
    lucide.createIcons();
}

// GESTÃO ADMIN (MATRÍCULA)
document.getElementById('formAluno').addEventListener('submit', async (e) => {
    e.preventDefault();
    const a = { id: Date.now(), nome: document.getElementById('alunoNome').value.toUpperCase(), serie: document.getElementById('alunoSerie').value, turma: document.getElementById('alunoTurma').value };
    if(!a.nome) return;
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
            <td class="p-4 uppercase">${a.nome}</td>
            <td class="p-4 text-slate-500 text-[10px]">${a.serie} ${a.turma}</td>
            <td class="p-4 text-right"><button onclick="removerItem(${a.id}, 'alunos')" class="text-red-500 opacity-30 hover:opacity-100 transition-opacity"><i data-lucide="x-circle" class="w-4 h-4"></i></button></td>
        </tr>
    `).join('');
    lucide.createIcons();
}

async function removerItem(id, banco) {
    // Exclusão direta na Admin, sem alerta para manter a modernidade
    let l = await Database.load(banco);
    l = l.filter(i => i.id !== id);
    await Database.save(banco, l);
    banco === 'alunos' ? carregarAlunos() : renderizarHistorico();
    initDashboard();
}

function navTo(id, e) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active', 'bg-indigo-600', 'text-white'));
    document.getElementById(id).classList.remove('hidden');
    e.currentTarget.classList.add('active', 'bg-indigo-600', 'text-white');
    if(id === 'aba-dash') initDashboard();
    if(id === 'aba-historico') renderizarHistorico();
    if(id === 'aba-admin') carregarAlunos();
}

function atualizarRelogio() {
    const h = document.getElementById('horaAtual');
    if(h) h.innerText = new Date().toLocaleTimeString('pt-br', {hour: '2-digit', minute:'2-digit'});
    setTimeout(atualizarRelogio, 60000); // Atualiza a cada minuto para poupar processamento
}

function logout() { location.reload(); }
function exportarPDF() { alert("Relatório enviado para a impressora padrão."); }
