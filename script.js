// CONFIGURAÇÕES INICIAIS
let currentUser = null;
let selectedAluno = null;
const PALAVROES = ["porra", "caralho", "merda", "foda", "puta"]; // Adicione mais conforme necessário

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    atualizarRelogio();
    carregarAlunos();
    carregarHistorico();
    
    // Toggle Justificativa
    document.addEventListener('change', (e) => {
        if(e.target.name === 'motivo') {
            document.getElementById('justificativa').classList.toggle('hidden', e.target.value !== 'Outros');
        }
    });
});

// 1. GESTÃO DE AUTH
function toggleAuth(isLogin) {
    document.getElementById('loginForm').classList.toggle('hidden', !isLogin);
    document.getElementById('registerForm').classList.toggle('hidden', isLogin);
    document.getElementById('btnShowLogin').classList.toggle('text-indigo-600', isLogin);
    document.getElementById('btnShowLogin').classList.toggle('border-b-2', isLogin);
    document.getElementById('btnShowReg').classList.toggle('text-indigo-600', !isLogin);
    document.getElementById('btnShowReg').classList.toggle('border-b-2', !isLogin);
}

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
    if(currentUser.role === 'admin') document.getElementById('navAdmin').classList.remove('hidden');
    showToast("Bem-vindo ao PV-2026", "success");
    carregarGestores();
});

// 2. GESTÃO DE ALUNOS
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
    document.getElementById('formAluno').reset();
    carregarAlunos();
    showToast("Aluno matriculado!");
});

function carregarAlunos() {
    const lista = JSON.parse(localStorage.getItem('alunos') || '[]');
    document.getElementById('listaAlunos').innerHTML = lista.map(a => `
        <tr class="border-b border-slate-50">
            <td class="p-4 font-bold">${a.nome}</td>
            <td class="p-4 text-slate-500">${a.serie}º ${a.turma}</td>
            <td class="p-4"><span class="px-3 py-1 rounded-full bg-slate-100 text-[10px] font-black">${a.periodo}</span></td>
            <td class="p-4 text-right"><button onclick="removerAluno(${a.id})" class="text-red-400 hover:text-red-600"><i data-lucide="trash-2" class="w-4 h-4 inline"></i></button></td>
        </tr>
    `).join('');
    lucide.createIcons();
}

function removerAluno(id) {
    if(!confirm("Excluir matrícula?")) return;
    let lista = JSON.parse(localStorage.getItem('alunos') || '[]');
    lista = lista.filter(a => a.id !== id);
    localStorage.setItem('alunos', JSON.stringify(lista));
    carregarAlunos();
}

// 3. GESTÃO DE ATRASOS
function filtrarAlunosAtraso() {
    const busca = document.getElementById('searchAluno').value.toLowerCase();
    const res = document.getElementById('resultadoBusca');
    const alunos = JSON.parse(localStorage.getItem('alunos') || '[]');
    
    if(busca.length < 2) return res.classList.add('hidden');
    
    const filtrados = alunos.filter(a => a.nome.toLowerCase().includes(busca));
    res.innerHTML = filtrados.map(a => `
        <div onclick="selecionarAlunoAtraso(${a.id})" class="p-4 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 font-bold text-sm">
            ${a.nome} (${a.serie}º ${a.turma})
        </div>
    `).join('');
    res.classList.remove('hidden');
}

function selecionarAlunoAtraso(id) {
    const alunos = JSON.parse(localStorage.getItem('alunos') || '[]');
    selectedAluno = alunos.find(a => a.id === id);
    document.getElementById('resultadoBusca').classList.add('hidden');
    document.getElementById('nomeAlunoSelecionado').innerText = `Registrando: ${selectedAluno.nome}`;
    document.getElementById('formAtrasoContainer').classList.remove('hidden');
}

function salvarAtraso() {
    const motivo = document.querySelector('input[name="motivo"]:checked')?.value;
    const just = document.getElementById('justificativa').value;

    if(!motivo) return showToast("Selecione um motivo", "error");

    // FILTRO DE SEGURANÇA (PALAVRÕES)
    const hasBadWords = PALAVROES.some(word => just.toLowerCase().includes(word));
    if(hasBadWords) {
        showToast("Linguagem imprópria detectada. Registro negado.", "error");
        return;
    }

    const atraso = {
        data: new Date().toLocaleDateString('pt-br'),
        hora: new Date().toLocaleTimeString('pt-br'),
        aluno: selectedAluno.nome,
        serie: `${selectedAluno.serie}º${selectedAluno.turma}`,
        motivo: motivo,
        justificativa: just || "N/A"
    };

    const historico = JSON.parse(localStorage.getItem('historico') || '[]');
    historico.unshift(atraso);
    localStorage.setItem('historico', JSON.stringify(historico));
    
    showToast("Atraso validado com sucesso!", "success");
    document.getElementById('formAtrasoContainer').classList.add('hidden');
    document.getElementById('searchAluno').value = "";
    carregarHistorico();
}

// 4. HISTÓRICO E PDF
function carregarHistorico() {
    const hist = JSON.parse(localStorage.getItem('historico') || '[]');
    document.getElementById('tabelaHistorico').innerHTML = hist.map(h => `
        <tr class="border-b border-slate-50">
            <td class="p-4 text-xs font-bold">${h.data}</td>
            <td class="p-4 text-xs">${h.hora}</td>
            <td class="p-4 font-black">${h.aluno}</td>
            <td class="p-4">${h.serie}</td>
            <td class="p-4"><span class="text-red-500 font-bold">${h.motivo}</span></td>
            <td class="p-4 text-xs italic text-slate-400">${h.justificativa}</td>
        </tr>
    `).join('');
}

function exportarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const hist = JSON.parse(localStorage.getItem('historico') || '[]');
    
    doc.setFontSize(18);
    doc.text("PV-2026 | RELATÓRIO DE ATRASOS ESCOLARES", 14, 15);
    
    doc.autoTable({
        startY: 25,
        head: [['Data', 'Hora', 'Aluno', 'Série', 'Motivo', 'Justificativa']],
        body: hist.map(h => [h.data, h.hora, h.aluno, h.serie, h.motivo, h.justificativa]),
        theme: 'grid',
        headStyles: {fillColor: [15, 23, 42]}
    });
    
    doc.save(`atrasos_escola_${Date.now()}.pdf`);
}

// 5. UTILITÁRIOS
function navTo(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active', 'bg-indigo-600', 'text-white'));
    
    document.getElementById(tabId).classList.remove('hidden');
    event.currentTarget.classList.add('active', 'bg-indigo-600', 'text-white');
}

function carregarGestores() {
    const lista = document.getElementById('listaGestores');
    lista.innerHTML = "";
    for(let i=0; i<localStorage.length; i++){
        const key = localStorage.key(i);
        if(key.startsWith('user_')){
            const user = JSON.parse(localStorage.getItem(key));
            lista.innerHTML += `
                <tr class="border-b border-slate-50">
                    <td class="p-4 font-bold uppercase text-xs">${user.u}</td>
                    <td class="p-4 text-right"><button onclick="removerGestor('${key}')" class="text-red-500 font-bold text-[10px]">REMOVER ACESSO</button></td>
                </tr>
            `;
        }
    }
}

function removerGestor(key) {
    if(confirm("Remover este gestor?")) {
        localStorage.removeItem(key);
        carregarGestores();
    }
}

function atualizarRelogio() {
    const agora = new Date();
    document.getElementById('dataAtual').innerText = agora.toLocaleDateString('pt-br', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('horaAtual').innerText = agora.toLocaleTimeString('pt-br');
    setTimeout(atualizarRelogio, 1000);
}

function showToast(m, type="info") {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `p-4 rounded-2xl shadow-2xl text-white font-bold text-xs uppercase animate-in slide-in-from-right ${type === 'error' ? 'bg-red-500' : 'bg-slate-900'}`;
    t.innerText = m;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

function logout() { location.reload(); }
