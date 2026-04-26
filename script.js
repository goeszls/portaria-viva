let currentUser = null;
let selectedAluno = null;
let myChart = null;

// LÓGICA DE PERSISTÊNCIA (PREPARADO PARA CLOUD)
const Database = {
    async save(key, data) { localStorage.setItem('pv_data_' + key, JSON.stringify(data)); },
    async load(key) { return JSON.parse(localStorage.getItem('pv_data_' + key) || '[]'); }
};

document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();
    atualizarRelogio();
    carregarAlunos();
    
    // Listener do motivo "Outros"
    document.addEventListener('change', (e) => {
        if(e.target.name === 'motivo') {
            document.getElementById('justificativa').classList.toggle('hidden', e.target.value !== 'Outros');
        }
    });

    // Criar Gestor Staff
    document.getElementById('formNovoGestor').addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = document.getElementById('newUserName').value;
        const p = document.getElementById('newUserPass').value;
        if(!u || !p) return showToast("Campos vazios", "error");
        
        let gestores = await Database.load('gestores');
        gestores.push({u, p, role: 'staff'});
        await Database.save('gestores', gestores);
        showToast("Gestor Criado");
        e.target.reset();
        renderizarGestores();
    });
});

// LOGIN
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('loginUser').value;
    const p = document.getElementById('loginPass').value;

    let success = false;
    if(u === 'admin' && p === 'admin') {
        currentUser = {u: 'ADMIN MASTER', role: 'admin'};
        success = true;
    } else {
        const gestores = await Database.load('gestores');
        const g = gestores.find(i => i.u === u && i.p === p);
        if(g) { currentUser = g; success = true; }
    }

    if(success) {
        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('mainDashboard').classList.remove('hidden');
        document.getElementById('userStatus').innerText = currentUser.u;
        if(currentUser.role === 'admin') document.getElementById('navAdmin').classList.remove('hidden');
        showToast("Acesso Autorizado", "success");
        initDashboard();
    } else {
        showToast("Dados Incorretos", "error");
    }
});

// FILTRO DE BUSCA (MANUAL)
async function filtrarAlunosAtraso() {
    const busca = document.getElementById('searchAluno').value.toLowerCase();
    const res = document.getElementById('resultadoBusca');
    const alunos = await Database.load('alunos');
    
    if(busca.length < 2) {
        res.classList.add('hidden');
        return;
    }

    const filtrados = alunos.filter(a => a.nome.toLowerCase().includes(busca));
    
    res.innerHTML = filtrados.map(a => `
        <div onclick="selecionarAlunoAtraso(${a.id})" class="p-6 hover:bg-white/5 cursor-pointer text-xs font-black text-white uppercase border-b border-white/10 flex justify-between">
            <span>${a.nome}</span>
            <span class="text-slate-600">${a.serie} | ${a.turma}</span>
        </div>
    `).join('');
    
    res.classList.remove('hidden');
}

async function selecionarAlunoAtraso(id) {
    const alunos = await Database.load('alunos');
    selectedAluno = alunos.find(a => a.id === id);
    document.getElementById('resultadoBusca').classList.add('hidden');
    document.getElementById('searchAluno').value = "";
    
    document.getElementById('nomeAlunoSelecionado').innerText = selectedAluno.nome;
    document.getElementById('infoAlunoSelecionado').innerText = `${selectedAluno.serie} - ${selectedAluno.turma} (${selectedAluno.periodo})`;
    document.getElementById('formAtrasoContainer').classList.remove('hidden');
}

// SALVAR ATRASO
async function salvarAtraso() {
    const motivo = document.querySelector('input[name="motivo"]:checked')?.value;
    if(!motivo) return showToast("Selecione um motivo", "error");

    const hist = await Database.load('historico');
    hist.push({
        aluno: selectedAluno.nome,
        serie: selectedAluno.serie,
        data: new Date().toLocaleDateString(),
        hora: new Date().toLocaleTimeString(),
        operador: currentUser.u,
        motivo: motivo
    });
    
    await Database.save('historico', hist);
    showToast("Atraso Registrado!", "success");
    document.getElementById('formAtrasoContainer').classList.add('hidden');
    initDashboard();
}

// DASHBOARD E DASHBOARD
async function initDashboard() {
    const alunos = await Database.load('alunos');
    const hist = await Database.load('historico');
    document.getElementById('statTotalAlunos').innerText = alunos.length;

    // Recidiva
    const contagem = {};
    hist.forEach(h => contagem[h.aluno] = (contagem[h.aluno] || 0) + 1);
    const container = document.getElementById('riscoContainer');
    container.innerHTML = "";
    Object.keys(contagem).forEach(nome => {
        if(contagem[nome] >= 2) {
            container.innerHTML += `
                <div class="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex justify-between items-center">
                    <div><p class="text-white font-black text-[10px] uppercase">${nome}</p><p class="text-red-400 text-[8px] font-bold">${contagem[nome]} ATRASOS</p></div>
                    <i data-lucide="alert-circle" class="text-red-500 w-4 h-4"></i>
                </div>
            `;
        }
    });

    const ctx = document.getElementById('chartAtrasos').getContext('2d');
    if(myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'],
            datasets: [{ label: 'Atrasos', data: [5, 12, 8, 15, 6], borderColor: '#6366f1', tension: 0.4 }]
        },
        options: { plugins: { legend: { display: false } }, scales: { y: { display: false }, x: { grid: { display: false } } } }
    });
    lucide.createIcons();
}

// MATRÍCULA
document.getElementById('formAluno').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('alunoNome').value;
    if(!nome) return showToast("Preencha o nome", "error");

    const aluno = {
        id: Date.now(),
        nome,
        serie: document.getElementById('alunoSerie').value,
        turma: document.getElementById('alunoTurma').value,
        periodo: document.getElementById('alunoPeriodo').value
    };

    let l = await Database.load('alunos');
    l.push(aluno);
    await Database.save('alunos', l);
    carregarAlunos();
    e.target.reset();
    showToast("Matrícula Concluída");
});

async function carregarAlunos() {
    const l = await Database.load('alunos');
    document.getElementById('listaAlunos').innerHTML = l.map(a => `
        <tr class="border-b border-white/5">
            <td class="p-6 text-xs font-black text-white uppercase">${a.nome}</td>
            <td class="p-6 text-[10px] text-slate-500 font-bold">${a.serie} / ${a.turma}</td>
            <td class="p-6 text-[9px] font-black uppercase text-indigo-400">${a.periodo}</td>
            <td class="p-6 text-right"><button onclick="removerAluno(${a.id})" class="text-red-500"><i data-lucide="trash" class="w-4 h-4"></i></button></td>
        </tr>
    `).join('');
    lucide.createIcons();
}

// UTILS
function navTo(id, e) {
    if(e) e.preventDefault();
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active', 'bg-indigo-600', 'text-white'));
    document.getElementById(id).classList.remove('hidden');
    if(e) e.currentTarget.classList.add('active', 'bg-indigo-600', 'text-white');
    if(id === 'aba-dash') initDashboard();
}

function showToast(m, type="info") {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `${type==='error'?'bg-red-600':'bg-indigo-600'} text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 animate-toast`;
    t.innerHTML = `<span class="text-[9px] font-black uppercase tracking-widest">${m}</span>`;
    c.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

function atualizarRelogio() {
    const h = document.getElementById('horaAtual');
    if(h) h.innerText = new Date().toLocaleTimeString('pt-br');
    setTimeout(atualizarRelogio, 1000);
}

async function renderizarGestores() {
    const g = await Database.load('gestores');
    document.getElementById('listaGestores').innerHTML = g.map(i => `
        <tr class="border-b border-white/5"><td class="p-6 text-[10px] font-black text-white">${i.u}</td><td class="p-6 text-right text-red-500 font-black text-[9px]">REVOGAR</td></tr>
    `).join('');
}

async function removerAluno(id) {
    if(confirm("Remover aluno?")) {
        let l = await Database.load('alunos');
        l = l.filter(a => a.id !== id);
        await Database.save('alunos', l);
        carregarAlunos();
    }
}

function logout() { location.reload(); }
