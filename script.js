let currentUser = null;
let selectedAluno = null;
let myChart = null;

const Database = {
    async save(key, data) { localStorage.setItem('pv_data_' + key, JSON.stringify(data)); },
    async load(key) { return JSON.parse(localStorage.getItem('pv_data_' + key) || '[]'); }
};

document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();
    atualizarRelogio();
    carregarAlunos();
    
    document.addEventListener('change', (e) => {
        if(e.target.name === 'motivo') {
            document.getElementById('justificativa').classList.toggle('hidden', e.target.value !== 'Outros');
        }
    });

    document.getElementById('formNovoGestor').addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = document.getElementById('newUserName').value;
        const p = document.getElementById('newUserPass').value;
        if(!u || !p) return showToast("Preencha todos os campos", "error");
        
        let gestores = await Database.load('gestores');
        gestores.push({u, p, role: 'staff'});
        await Database.save('gestores', gestores);
        showToast("Operador Staff Ativado");
        e.target.reset();
        renderizarGestores();
    });
});

// LOGIN COM SUPORTE A ADMIN MASTER
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
        showToast("Sistema Autenticado", "success");
        initDashboard();
    } else {
        showToast("Credenciais Inválidas", "error");
    }
});

// BUSCA MANUAL
async function filtrarAlunosAtraso() {
    const busca = document.getElementById('searchAluno').value.toLowerCase();
    const res = document.getElementById('resultadoBusca');
    const alunos = await Database.load('alunos');
    
    if(busca.length < 1) {
        res.classList.add('hidden');
        return;
    }

    const filtrados = alunos.filter(a => a.nome.toLowerCase().includes(busca));
    res.innerHTML = filtrados.map(a => `
        <div onclick="selecionarAlunoAtraso(${a.id})" class="p-6 hover:bg-indigo-600 cursor-pointer text-xs font-black text-white uppercase border-b border-white/5 flex justify-between transition-colors">
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
    
    // Calcular atrasos acumulados para o limite (Ideia 5)
    const totalAtrasos = hist.filter(h => h.aluno === selectedAluno.nome).length;
    
    document.getElementById('resultadoBusca').classList.add('hidden');
    document.getElementById('searchAluno').value = "";
    document.getElementById('nomeAlunoSelecionado').innerText = selectedAluno.nome;
    document.getElementById('infoAlunoSelecionado').innerText = `${selectedAluno.serie} - ${selectedAluno.turma} | TOTAL: ${totalAtrasos} ATRASOS`;
    
    // Alerta visual de limite (Ideia 5)
    const alerta = document.getElementById('statusAlerta');
    if(totalAtrasos >= 3) {
        alerta.classList.remove('hidden');
    } else {
        alerta.classList.add('hidden');
    }

    document.getElementById('formAtrasoContainer').classList.remove('hidden');
}

// SALVAR ATRASO
async function salvarAtraso() {
    const motivo = document.querySelector('input[name="motivo"]:checked')?.value;
    if(!motivo) return showToast("Selecione o motivo", "error");

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
    showToast("Atraso Registrado com Sucesso!");
    document.getElementById('formAtrasoContainer').classList.add('hidden');
    initDashboard();
}

// EXPORTAÇÃO PDF (Ideia 2)
async function exportarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const hist = await Database.load('historico');
    const hoje = new Date().toLocaleDateString();
    
    const dadosFiltrados = hist.filter(h => h.data === hoje);

    doc.setFontSize(18);
    doc.text("RELATÓRIO DE ATRASOS - PV-2026", 14, 20);
    doc.setFontSize(10);
    doc.text(`Data: ${hoje} | Gerado por: ${currentUser.u}`, 14, 28);

    const rows = dadosFiltrados.map(h => [h.hora, h.aluno, h.serie, h.motivo]);
    
    doc.autoTable({
        head: [['Hora', 'Aluno', 'Série', 'Motivo']],
        body: rows,
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`atrasos_${hoje.replace(/\//g, '-')}.pdf`);
}

// DASHBOARD E LIMITES (Ideia 5)
async function initDashboard() {
    const alunos = await Database.load('alunos');
    const hist = await Database.load('historico');
    document.getElementById('statTotalAlunos').innerText = alunos.length;

    const contagem = {};
    hist.forEach(h => contagem[h.aluno] = (contagem[h.aluno] || 0) + 1);
    
    const container = document.getElementById('riscoContainer');
    container.innerHTML = "";
    Object.keys(contagem).forEach(nome => {
        if(contagem[nome] >= 3) {
            container.innerHTML += `
                <div class="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex justify-between items-center animate-pulse">
                    <div><p class="text-white font-black text-[9px] uppercase">${nome}</p><p class="text-red-400 text-[8px] font-bold">${contagem[nome]} ATRASOS REGISTRADOS</p></div>
                    <i data-lucide="shield-alert" class="text-red-500 w-4 h-4"></i>
                </div>
            `;
        }
    });

    const ctx = document.getElementById('chartAtrasos').getContext('2d');
    if(myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'],
            datasets: [{ label: 'Atrasos', data: [4, 8, 12, 5, 3], backgroundColor: '#6366f1', borderRadius: 8 }]
        },
        options: { plugins: { legend: { display: false } }, scales: { y: { display: false }, x: { grid: { display: false }, ticks: { color: '#475569', font: { size: 9 } } } } }
    });
    lucide.createIcons();
}

// MATRÍCULA (REMOVIDO QR CODE)
document.getElementById('formAluno').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('alunoNome').value;
    if(!nome) return showToast("Nome é obrigatório", "error");

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
    showToast("Matrícula Finalizada!");
});

async function carregarAlunos() {
    const l = await Database.load('alunos');
    document.getElementById('listaAlunos').innerHTML = l.map(a => `
        <tr class="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
            <td class="p-6 text-xs font-black text-white uppercase">${a.nome}</td>
            <td class="p-6 text-[10px] text-slate-500 font-bold">${a.serie} / ${a.turma}</td>
            <td class="p-6 text-[9px] font-black uppercase text-indigo-400">${a.periodo}</td>
            <td class="p-6 text-right">
                ${currentUser?.role === 'admin' ? `<button onclick="removerAluno(${a.id})" class="text-red-500 p-2 hover:bg-red-500/10 rounded-xl transition-all"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : `<i data-lucide="lock" class="w-4 h-4 text-slate-700"></i>`}
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

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
    t.className = `${type==='error'?'bg-red-600 shadow-red-500/20':'bg-indigo-600 shadow-indigo-500/20'} text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-toast border border-white/10`;
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
        <tr class="border-b border-white/5"><td class="p-6 text-[10px] font-black text-white">${i.u}</td>
        <td class="p-6 text-right">
            ${currentUser?.role === 'admin' ? `<button onclick="removerGestor('${i.u}')" class="text-red-500 font-black text-[9px] hover:underline">REVOGAR</button>` : `<span class="text-[9px] text-slate-700">PROTEGIDO</span>`}
        </td></tr>
    `).join('');
}

async function removerAluno(id) {
    if(currentUser.role !== 'admin') return showToast("Acesso Negado (Apenas Admin Master)", "error");
    if(confirm("Deseja excluir este registro permanentemente?")) {
        let l = await Database.load('alunos');
        l = l.filter(a => a.id !== id);
        await Database.save('alunos', l);
        carregarAlunos();
        showToast("Registro Excluído");
    }
}

function logout() { location.reload(); }
