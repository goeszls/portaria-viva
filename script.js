// BANCO DE DADOS LOCAL (SIMULADO)
let alunos = JSON.parse(localStorage.getItem('pv_alunos')) || [];
let historico = JSON.parse(localStorage.getItem('pv_historico')) || [];
let equipe = JSON.parse(localStorage.getItem('pv_equipe')) || [
    { user: 'ADMIN', role: 'GESTOR' }
];

let alunoSelecionado = null;

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    atualizarStats();
    setInterval(atualizarHora, 1000);
    renderizarEquipe();
});

// NAVEGAÇÃO
function navTo(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.remove('hidden');
    event.currentTarget.classList.add('active');
}

// LOGIN SIMPLES
function login() {
    const user = document.getElementById('loginUser').value.toUpperCase();
    const pass = document.getElementById('loginPass').value;

    if(user === 'ADMIN' && pass === '2026') {
        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('mainDashboard').classList.remove('hidden');
    } else {
        alert('Acesso Negado!');
    }
}

// GESTÃO DE ALUNOS
function adicionarAluno() {
    const nome = document.getElementById('alunoNome').value.toUpperCase();
    const serie = document.getElementById('alunoSerie').value;
    const turma = document.getElementById('alunoTurma').value;

    if(!nome || !serie || !turma) return alert('Preencha tudo!');

    const novo = { id: Date.now(), nome, turma: `${serie}º ${turma}` };
    alunos.push(novo);
    localStorage.setItem('pv_alunos', JSON.stringify(alunos));
    
    alert('Matrícula Realizada!');
    document.getElementById('alunoNome').value = '';
    atualizarStats();
}

// PORTARIA / BUSCA
function buscarAluno() {
    const termo = document.getElementById('searchAluno').value.toUpperCase();
    const res = document.getElementById('resultadoBusca');
    res.innerHTML = '';

    if(termo.length < 2) return res.classList.add('hidden');

    const filtrados = alunos.filter(a => a.nome.includes(termo));
    filtrados.forEach(a => {
        const div = document.createElement('div');
        div.className = 'p-4 hover:bg-indigo-600 cursor-pointer border-b border-white/5 font-bold text-xs';
        div.innerText = `${a.nome} (${a.turma})`;
        div.onclick = () => selecionarAluno(a);
        res.appendChild(div);
    });
    res.classList.remove('hidden');
}

function selecionarAluno(aluno) {
    alunoSelecionado = aluno;
    document.getElementById('resultadoBusca').classList.add('hidden');
    document.getElementById('formAtrasoContainer').classList.remove('hidden');
    document.getElementById('nomeAlunoSelecionado').innerText = aluno.nome;
    document.getElementById('infoAlunoSelecionado').innerText = `TURMA: ${aluno.turma}`;
}

function salvarAtraso() {
    const motivo = document.querySelector('input[name="motivo"]:checked')?.value;
    if(!motivo) return alert('Selecione um motivo!');

    const registro = {
        data: new Date().toLocaleString('pt-BR'),
        nome: alunoSelecionado.nome,
        turma: alunoSelecionado.turma,
        motivo: motivo
    };

    historico.unshift(registro);
    localStorage.setItem('pv_historico', JSON.stringify(historico));
    renderizarHistorico();
    
    alert('Entrada Validada!');
    document.getElementById('formAtrasoContainer').classList.add('hidden');
    document.getElementById('searchAluno').value = '';
}

// GESTÃO DE EQUIPE
function criarFuncionario() {
    const user = document.getElementById('newStaffUser').value.toUpperCase();
    const role = document.getElementById('newStaffRole').value;
    if(!user) return;

    equipe.push({ user, role });
    localStorage.setItem('pv_equipe', JSON.stringify(equipe));
    renderizarEquipe();
}

function renderizarEquipe() {
    const corpo = document.getElementById('corpoGestor');
    corpo.innerHTML = equipe.map((f, i) => `
        <tr class="border-b border-white/5">
            <td class="p-4">${f.user}</td>
            <td class="p-4"><span class="px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded-lg text-[8px]">${f.role}</span></td>
            <td class="p-4 text-right"><button onclick="removerEquipe(${i})" class="text-red-500 hover:text-red-400">Excluir</button></td>
        </tr>
    `).join('');
}

function removerEquipe(index) {
    equipe.splice(index, 1);
    localStorage.setItem('pv_equipe', JSON.stringify(equipe));
    renderizarEquipe();
}

// UTILITÁRIOS
function atualizarHora() {
    document.getElementById('horaAtual').innerText = new Date().toLocaleTimeString('pt-BR');
}

function atualizarStats() {
    document.getElementById('statTotalAlunos').innerText = alunos.length;
    renderizarHistorico();
}

function renderizarHistorico() {
    const corpo = document.getElementById('corpoHistorico');
    corpo.innerHTML = historico.map(h => `
        <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
            <td class="p-6 text-indigo-400">${h.data}</td>
            <td class="p-6 font-black">${h.nome}</td>
            <td class="p-6">${h.turma}</td>
            <td class="p-6"><span class="bg-white/10 px-3 py-1 rounded-full text-[10px]">${h.motivo}</span></td>
        </tr>
    `).join('');
}
