let currentUser = null;
let selectedAluno = null;
const PALAVROES = ["porra", "caralho", "merda", "foda", "puta"];

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    atualizarRelogio();
    carregarAlunos();
    carregarHistorico();
    
    document.addEventListener('change', (e) => {
        if(e.target.name === 'motivo') {
            document.getElementById('justificativa').classList.toggle('hidden', e.target.value !== 'Outros');
        }
    });
});

// LOGIN E REGISTRO
document.getElementById('registerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const u = document.getElementById('regUser').value;
    const p = document.getElementById('regPass').value;
    if(localStorage.getItem('user_'+u)) return showToast("Usuário já existe", "error");
    localStorage.setItem('user_'+u, JSON.stringify({u, p, role: 'staff'}));
    showToast("Gestor cadastrado!", "success");
    toggleAuth(true);
});

document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const u = document.getElementById('loginUser').value;
    const p = document.getElementById('loginPass').value;

    if(u === 'admin' && p === 'admin') {
        currentUser = {u: 'ADMIN MASTER', role: 'admin'};
    } else {
        const data = JSON.parse(localStorage.getItem('user_'+u));
        if(!data || data.p !== p) return showToast("Dados incorretos", "error");
        currentUser = data;
    }
    
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('mainDashboard').classList.remove('hidden');
    
    // VISIBILIDADE POR CARGO
    if(currentUser.role === 'admin') {
        document.getElementById('navAdmin').classList.remove('hidden');
        document.getElementById('contentAtraso').classList.remove('hidden');
        document.getElementById('lockAtraso').classList.add('hidden');
    } else {
        document.getElementById('contentAtraso').classList.add('hidden');
        document.getElementById('lockAtraso').classList.remove('hidden');
    }
    
    showToast("Acesso Liberado", "success");
    carregarGestores();
});

// CALCULO DE ATRASO
function salvarAtraso() {
    const agora = new Date();
    const hora = agora.getHours();
    const min = agora.getMinutes();
    const periodo = selectedAluno.periodo; // 'Manhã' ou 'Tarde'

    let minutosAtraso = 0;
    let ativo = false;

    if(periodo === 'Manhã') {
        // 7:05 às 9:40
        if((hora === 7 && min >= 5) || (hora === 8) || (hora === 9 && min <= 40)) {
            ativo = true;
            const totalMinutosAtual = (hora * 60) + min;
            const totalMinutosLimite = (7 * 60) + 5;
            minutosAtraso = totalMinutosAtual - totalMinutosLimite;
        }
    } else {
        // 13:05 às 15:40
        if((hora === 13 && min >= 5) || (hora === 14) || (hora === 15 && min <= 40)) {
            ativo = true;
            const totalMinutosAtual = (hora * 60) + min;
            const totalMinutosLimite = (13 * 60) + 5;
            minutosAtraso = totalMinutosAtual - totalMinutosLimite;
        }
    }

    if(!ativo) return showToast("Fora do horário de registro!", "error");

    const motivo = document.querySelector('input[name="motivo"]:checked')?.value;
    const just = document.getElementById('justificativa').value;

    if(!motivo) return showToast("Selecione um motivo", "error");
    if(PALAVROES.some(w => just.toLowerCase().includes(w))) return showToast("Linguagem imprópria!", "error");

    const registro = {
        data: agora.toLocaleDateString('pt-br'),
        hora: `${hora}:${min.toString().padStart(2, '0')}`,
        aluno: selectedAluno.nome,
        atraso: minutosAtraso,
        motivo: motivo,
        justificativa: just
    };

    const hist = JSON.parse(localStorage.getItem('historico') || '[]');
    hist.unshift(registro);
    localStorage.setItem('historico', JSON.stringify(hist));
    
    showToast(`Registrado: ${minutosAtraso} min de atraso`);
    document.getElementById('formAtrasoContainer').classList.add('hidden');
    carregarHistorico();
}

// FUNÇÕES AUXILIARES (IGUAIS AO ANTERIOR COM AJUSTES DE FILTRO)
function carregarAlunos() {
    const lista = JSON.parse(localStorage.getItem('alunos') || '[]');
    document.getElementById('listaAlunos').innerHTML = lista.map(a => `
        <tr class="border-b border-slate-50">
            <td class="p-4 font-bold uppercase text-xs">${a.nome}</td>
            <td class="p-4 text-[10px] font-bold text-slate-500">${a.serie} | ${a.turma}</td>
            <td class="p-4 text-[10px] font-black text-indigo-400">${a.periodo.toUpperCase()}</td>
            <td class="p-4 text-right"><button onclick="removerAluno(${a.id})" class="text-red-300 hover:text-red-600"><i data-lucide="trash" class="w-4 h-4 inline"></i></button></td>
        </tr>
    `).join('');
    lucide.createIcons();
}

document.getElementById('formAluno').addEventListener('submit', (e) => {
    e.preventDefault();
    const aluno = {
        id: Date.now(),
        nome: document.getElementById('alunoNome').value,
        serie: document.getElementById('alunoSerie').value,
        turma: document.getElementById('alunoTurma').value,
        periodo: document.getElementById('alunoPeriodo').value
    };
    const lista = JSON.parse(localStorage.getItem('alunos') || '[]');
    lista.push(aluno);
    localStorage.setItem('alunos', JSON.stringify(lista));
    carregarAlunos();
    e.target.reset();
});

function filtrarAlunosAtraso() {
    const busca = document.getElementById('searchAluno').value.toLowerCase();
    const res = document.getElementById('resultadoBusca');
    const alunos = JSON.parse(localStorage.getItem('alunos') || '[]');
    if(busca.length < 2) return res.classList.add('hidden');
    const filtrados = alunos.filter(a => a.nome.toLowerCase().includes(busca));
    res.innerHTML = filtrados.map(a => `<div onclick="selecionarAlunoAtraso(${a.id})" class="p-4 hover:bg-slate-50 cursor-pointer text-xs font-bold border-b border-slate-50">${a.nome} (${a.serie})</div>`).join('');
    res.classList.remove('hidden');
}

function selecionarAlunoAtraso(id) {
    const alunos = JSON.parse(localStorage.getItem('alunos') || '[]');
    selectedAluno = alunos.find(a => a.id === id);
    document.getElementById('resultadoBusca').classList.add('hidden');
    document.getElementById('nomeAlunoSelecionado').innerText = selectedAluno.nome;
    document.getElementById('formAtrasoContainer').classList.remove('hidden');
}

function carregarHistorico() {
    const hist = JSON.parse(localStorage.getItem('historico') || '[]');
    document.getElementById('tabelaHistorico').innerHTML = hist.map(h => `
        <tr class="border-b border-slate-50">
            <td class="p-4 text-xs">${h.data}</td>
            <td class="p-4 text-xs">${h.hora}</td>
            <td class="p-4 font-bold uppercase text-xs">${h.aluno}</td>
            <td class="p-4"><span class="bg-red-50 text-red-600 px-2 py-1 rounded font-black text-xs">${h.atraso} MIN</span></td>
            <td class="p-4 text-xs font-medium text-slate-500">${h.motivo}</td>
        </tr>
    `).join('');
}

function carregarGestores() {
    const lista = document.getElementById('listaGestores');
    lista.innerHTML = "";
    for(let i=0; i<localStorage.length; i++){
        const key = localStorage.key(i);
        if(key.startsWith('user_')){
            const user = JSON.parse(localStorage.getItem(key));
            lista.innerHTML += `<tr class="border-b border-slate-50"><td class="p-4 font-bold text-xs">${user.u}</td><td class="p-4 text-right"><button onclick="removerGestor('${key}')" class="text-red-500 font-bold text-[10px]">REMOVER</button></td></tr>`;
        }
    }
}

function toggleAuth(isL) {
    document.getElementById('loginForm').classList.toggle('hidden', !isL);
    document.getElementById('registerForm').classList.toggle('hidden', isL);
}

function navTo(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active', 'bg-indigo-600', 'text-white'));
    document.getElementById(id).classList.remove('hidden');
    event.currentTarget.classList.add('active', 'bg-indigo-600', 'text-white');
}

function atualizarRelogio() {
    const agora = new Date();
    document.getElementById('dataAtual').innerText = agora.toLocaleDateString('pt-br', { weekday: 'long', day: 'numeric', month: 'long' });
    document.getElementById('horaAtual').innerText = agora.toLocaleTimeString('pt-br');
    setTimeout(atualizarRelogio, 1000);
}

function removerAluno(id) { if(confirm("Remover?")) { let l = JSON.parse(localStorage.getItem('alunos')); l = l.filter(a => a.id !== id); localStorage.setItem('alunos', JSON.stringify(l)); carregarAlunos(); } }
function removerGestor(k) { localStorage.removeItem(k); carregarGestores(); }
function logout() { location.reload(); }
function showToast(m, t="info") { const c = document.getElementById('toastContainer'); const div = document.createElement('div'); div.className = `p-4 rounded-2xl shadow-2xl text-white font-bold text-[10px] uppercase ${t==='error'?'bg-red-500':'bg-slate-900'}`; div.innerText = m; c.appendChild(div); setTimeout(() => div.remove(), 3000); }

function exportarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const hist = JSON.parse(localStorage.getItem('historico') || '[]');
    doc.setFontSize(16); doc.text("PV-2026 - RELATÓRIO DE ATRASOS", 14, 20);
    doc.autoTable({ startY: 30, head: [['Data', 'Hora', 'Aluno', 'Atraso (Min)', 'Motivo']], body: hist.map(h => [h.data, h.hora, h.aluno, h.atraso, h.motivo]) });
    doc.save('atrasos.pdf');
}
