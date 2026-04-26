let currentUser = null;
let selectedAluno = null;
let myChart = null;

const Database = {
    async save(key, data) { localStorage.setItem('seed_v1_' + key, JSON.stringify(data)); },
    async load(key) { return JSON.parse(localStorage.getItem('seed_v1_' + key) || '[]'); }
};

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
});

// LOGIN
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('loginUser').value.toLowerCase();
    const p = document.getElementById('loginPass').value;

    if(u === 'admin' && p === 'admin') {
        currentUser = {u: 'DIRETORIA SEED', role: 'admin'};
        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('mainDashboard').classList.remove('hidden');
        document.getElementById('userDisplay').innerText = currentUser.u;
        if(currentUser.role === 'admin') document.getElementById('navAdmin').classList.remove('hidden');
        initDashboard();
        atualizarRelogio();
    }
});

// PORTARIA: BUSCA POR RA OU NOME
async function filtrarAlunosAtraso() {
    const busca = document.getElementById('searchAluno').value.toLowerCase();
    const res = document.getElementById('resultadoBusca');
    const alunos = await Database.load('alunos');
    if(busca.length < 1) return res.classList.add('hidden');

    const filtrados = alunos.filter(a => 
        a.nome.toLowerCase().includes(busca) || 
        (a.ra && a.ra.includes(busca))
    ).slice(0, 5);

    res.innerHTML = filtrados.map(a => `
        <div onclick="selecionarAlunoAtraso(${a.id})" class="p-5 hover:bg-indigo-600 cursor-pointer text-xs font-black text-white uppercase border-b border-white/5 flex justify-between transition-colors">
            <div>
                <p>${a.nome}</p>
                <p class="text-[9px] text-indigo-300 font-mono opacity-60">RA: ${a.ra || 'S/ RA'}</p>
            </div>
            <span class="opacity-40 text-[9px] self-center">${a.serie} ${a.turma}</span>
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
    document.getElementById('infoAlunoSelecionado').innerText = `RA: ${selectedAluno.ra} | ${selectedAluno.serie} ${selectedAluno.turma} | TOTAL: ${total} ATRASOS`;
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
        ra: selectedAluno.ra,
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

// DASHBOARD
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

    const contagem = {};
    hist.forEach(h => contagem[h.aluno] = (contagem[h.aluno] || 0) + 1);
    const riscont = document.getElementById('riscoContainer');
    riscont.innerHTML = "";
    Object.keys(contagem).forEach(n => {
        if(contagem[n] >= 3) {
            riscont.innerHTML += `<div class="p-4 rounded-2xl bg-white/5 border-l-4 border-red-600 text-[10px] font-black uppercase text-white flex justify-between items-center">${n} <span class="bg-red-600 px-2 py-1 rounded-lg">${contagem[n]}x</span></div>`;
        }
    });

    const ctx = document.getElementById('chartAtrasos').getContext('2d');
    if(myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'line',
        data: { labels: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'], datasets: [{ data: [4, 8, 5, 9, 3], borderColor: '#6366f1', tension: 0.4, fill: true, backgroundColor: 'rgba(99, 102, 241, 0.1)' }] },
        options: { plugins: { legend: { display: false } }, scales: { y: { display: false }, x: { grid: { display: false }, ticks: { color: '#475569', font: { size: 9, weight: 'bold' } } } } }
    });
    lucide.createIcons();
}

// HISTÓRICO
async function renderizarHistorico() {
    const hist = (await Database.load('historico')).reverse();
    const filtro = document.getElementById('filtroHistorico').value.toLowerCase();
    const corpo = document.getElementById('corpoHistorico');
    
    corpo.innerHTML = hist.filter(h => h.aluno.toLowerCase().includes(filtro)).map(h => `
        <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
            <td class="p-6 text-[10px] text-slate-500 font-mono">${h.hora}</td>
            <td class="p-6 text-[10px] text-indigo-400 font-mono font-black">${h.ra || '---'}</td>
            <td class="p-6 text-xs text-white uppercase">${h.aluno}</td>
            <td class="p-6 text-[10px] font-black uppercase text-slate-500">${h.serie} ${h.turma}</td>
            <td class="p-6 text-[10px] text-slate-400">${h.motivo}</td>
            <td class="p-6 text-right">
                ${currentUser.role === 'admin' ? `<button onclick="removerItem(${h.id}, 'historico')" class="text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : '—'}
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

// ADMINISTRAÇÃO: MATRÍCULA
document.getElementById('formAluno').addEventListener('submit', async (e) => {
    e.preventDefault();
    const ra = document.getElementById('alunoRA').value;
    const nome = document.getElementById('alunoNome').value.toUpperCase();
    if(!nome || !ra) return;

    const a = { id: Date.now(), ra, nome, serie: document.getElementById('alunoSerie').value, turma: document.getElementById('alunoTurma').value };
    let l = await Database.load('alunos');
    l.push(a);
    await Database.save('alunos', l);
    carregarAlunos();
    e.target.reset();
});

async function carregarAlunos() {
    const l = (await Database.load('alunos')).reverse();
    document.getElementById('listaAlunos').innerHTML = l.map(a => `
        <tr class="border-b border-white/5 hover:bg-white/5 transition-all">
            <td class="p-5 font-mono text-indigo-400 text-[10px] font-black tracking-tighter">${a.ra}</td>
            <td class="p-5 uppercase text-xs font-black text-white">${a.nome}</td>
            <td class="p-5 text-slate-500 text-[9px] font-black uppercase">${a.serie} / ${a.turma}</td>
            <td class="p-5 text-right"><button onclick="removerItem(${a.id}, 'alunos')" class="text-red-500/30 hover:text-red-500"><i data-lucide="x-circle" class="w-4 h-4"></i></button></td>
        </tr>
    `).join('');
    lucide.createIcons();
}

async function removerItem(id, banco) {
    let l = await Database.load(banco);
    l = l.filter(i => i.id !== id);
    await Database.save(banco, l);
    banco === 'alunos' ? carregarAlunos() : renderizarHistorico();
    initDashboard();
}

// RELATÓRIO DE IMPRESSÃO A4
async function gerarRelatorioImpressao() {
    const hist = (await Database.load('historico')).reverse();
    if (hist.length === 0) return alert("Sem dados.");
    
    const win = window.open('', '', 'width=900,height=700');
    let rows = hist.map(h => `<tr><td>${h.data} ${h.hora}</td><td><b>${h.ra}</b></td><td>${h.aluno}</td><td>${h.serie} ${h.turma}</td><td>${h.motivo}</td></tr>`).join('');

    win.document.write(`
        <html><head><style>
            body { font-family: sans-serif; padding: 40px; }
            h1 { text-align: center; text-transform: uppercase; font-size: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; font-size: 11px; text-align: left; }
            th { background: #f2f2f2; text-transform: uppercase; font-size: 10px; }
            .footer { margin-top: 50px; text-align: center; font-size: 10px; }
        </style></head>
        <body>
            <h1>Relatório de Atrasos - SEED PR</h1>
            <p>Emissão: ${new Date().toLocaleString('pt-br')}</p>
            <table><thead><tr><th>Data/Hora</th><th>RA</th><th>Aluno</th><th>Turma</th><th>Motivo</th></tr></thead>
            <tbody>${rows}</tbody></table>
            <div class="footer"><p>__________________________________________<br>Assinatura Coordenação</p></div>
            <script>window.onload = function() { window.print(); window.close(); }</script>
        </body></html>
    `);
    win.document.close();
}

// UTILITÁRIOS
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
    setTimeout(atualizarRelogio, 60000);
}

function logout() { location.reload(); }
