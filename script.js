// BANCO DE DADOS
let alunos = JSON.parse(localStorage.getItem('pv_alunos')) || [];
let historico = JSON.parse(localStorage.getItem('pv_historico')) || [];
let equipe = JSON.parse(localStorage.getItem('pv_equipe')) || [{user:'ADMIN', role:'GESTOR'}];
let alunoSelecionado = null;
let acaoConfirmacao = null;

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    atualizarStats();
    setInterval(() => {
        document.getElementById('horaAtual').innerText = new Date().toLocaleTimeString('pt-BR');
    }, 1000);
});

// SISTEMA DE ALERTAS (TOASTS)
function showToast(mensagem, tipo = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    const icon = tipo === 'success' ? 'check-circle' : (tipo === 'error' ? 'x-circle' : 'info');
    
    toast.className = `toast-card toast-${tipo}`;
    toast.innerHTML = `
        <i data-lucide="${icon}" class="w-5 h-5 ${tipo === 'success' ? 'text-emerald-400' : 'text-red-400'}"></i>
        <span class="text-[11px] font-black uppercase tracking-wider text-white">${mensagem}</span>
    `;
    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        toast.style.transition = '0.5s';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// MODAL DE CONFIRMAÇÃO
function openModal(titulo, texto, callback) {
    document.getElementById('modalTitle').innerText = titulo;
    document.getElementById('modalText').innerText = texto;
    document.getElementById('customModal').classList.remove('hidden');
    document.getElementById('customModal').classList.add('flex');
    acaoConfirmacao = callback;
}

function closeModal() {
    document.getElementById('customModal').classList.add('hidden');
    document.getElementById('customModal').classList.remove('flex');
}

document.getElementById('modalConfirmBtn').onclick = () => {
    if(acaoConfirmacao) acaoConfirmacao();
    closeModal();
};

// NAVEGAÇÃO
function navTo(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.remove('hidden');
    if(event) event.currentTarget.classList.add('active');
    
    if(tabId === 'aba-gestao-dados') renderizarGestao();
    if(tabId === 'aba-gestor') renderizarEquipe();
}

// FUNCIONALIDADES
function login() {
    const u = document.getElementById('loginUser').value.toUpperCase();
    const p = document.getElementById('loginPass').value;
    if(u === 'ADMIN' && p === '2026') {
        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('mainDashboard').classList.remove('hidden');
        showToast('Acesso Autorizado. Bem-vindo!', 'success');
    } else {
        showToast('Usuário ou senha inválidos!', 'error');
    }
}

function adicionarAluno() {
    const nome = document.getElementById('alunoNome').value.toUpperCase();
    const serie = document.getElementById('alunoSerie').value;
    const turma = document.getElementById('alunoTurma').value;
    
    if(!nome || !serie || !turma) return showToast('Preencha todos os campos!', 'error');

    alunos.push({ id: Date.now(), nome, turma: `${serie}º ${turma}` });
    localStorage.setItem('pv_alunos', JSON.stringify(alunos));
    document.getElementById('alunoNome').value = '';
    atualizarStats();
    showToast('Matrícula salva com sucesso!');
}

function buscarAluno() {
    const termo = document.getElementById('searchAluno').value.toUpperCase();
    const res = document.getElementById('resultadoBusca');
    res.innerHTML = '';
    if(termo.length < 2) return res.classList.add('hidden');

    const filtrados = alunos.filter(a => a.nome.includes(termo));
    filtrados.forEach(a => {
        const d = document.createElement('div');
        d.className = 'p-4 hover:bg-indigo-600 cursor-pointer border-b border-white/5 font-bold text-xs';
        d.innerText = `${a.nome} (${a.turma})`;
        d.onclick = () => {
            alunoSelecionado = a;
            res.classList.add('hidden');
            document.getElementById('formAtrasoContainer').classList.remove('hidden');
            document.getElementById('nomeAlunoSelecionado').innerText = a.nome;
            document.getElementById('infoAlunoSelecionado').innerText = `TURMA: ${a.turma}`;
        };
        res.appendChild(d);
    });
    res.classList.remove('hidden');
}

function salvarAtraso() {
    const mot = document.querySelector('input[name="motivo"]:checked')?.value;
    if(!mot) return showToast('Selecione um motivo!', 'info');

    historico.unshift({ data: new Date().toLocaleString(), nome: alunoSelecionado.nome, turma: alunoSelecionado.turma, motivo: mot });
    localStorage.setItem('pv_historico', JSON.stringify(historico));
    document.getElementById('formAtrasoContainer').classList.add('hidden');
    document.getElementById('searchAluno').value = '';
    atualizarStats();
    showToast('Entrada validada!');
}

function renderizarGestao() {
    document.getElementById('listaGestaoAlunos').innerHTML = alunos.map((a, i) => `
        <tr class="border-b border-white/5 hover:bg-white/5 transition-all">
            <td class="p-4">${a.nome}</td>
            <td class="p-4 text-right"><button onclick="excluirItem('alunos', ${i})" class="text-red-500 font-black text-[9px] hover:text-white">EXCLUIR</button></td>
        </tr>`).join('');
    
    document.getElementById('listaGestaoHistorico').innerHTML = historico.map((h, i) => `
        <tr class="border-b border-white/5 hover:bg-white/5 transition-all">
            <td class="p-4">${h.nome}</td>
            <td class="p-4 text-right"><button onclick="excluirItem('historico', ${i})" class="text-red-500 font-black text-[9px] hover:text-white">REMOVER</button></td>
        </tr>`).join('');
}

function excluirItem(tipo, index) {
    const msg = tipo === 'alunos' ? 'Deseja remover este aluno permanentemente?' : 'Deseja apagar este registro de portaria?';
    openModal('Atenção', msg, () => {
        if(tipo === 'alunos') alunos.splice(index, 1);
        else historico.splice(index, 1);
        localStorage.setItem(`pv_${tipo}`, JSON.stringify(tipo === 'alunos' ? alunos : historico));
        renderizarGestao();
        atualizarStats();
        showToast('Item excluído com sucesso.', 'error');
    });
}

function atualizarStats() {
    document.getElementById('statTotalAlunos').innerText = alunos.length;
    document.getElementById('corpoHistorico').innerHTML = historico.map(h => `
        <tr class="border-b border-white/5"><td class="p-6 text-indigo-400">${h.data}</td>
        <td class="p-6 uppercase">${h.nome}</td><td class="p-6">${h.turma}</td><td class="p-6 uppercase"><span class="bg-white/5 px-3 py-1 rounded-full text-[10px]">${h.motivo}</span></td></tr>`).join('');
}

function criarFuncionario() {
    const u = document.getElementById('newStaffUser').value.toUpperCase();
    const r = document.getElementById('newStaffRole').value;
    if(!u) return showToast('Digite o usuário!', 'info');
    equipe.push({user:u, role:r});
    localStorage.setItem('pv_equipe', JSON.stringify(equipe));
    renderizarEquipe();
    showToast('Novo acesso criado.');
}

function renderizarEquipe() {
    document.getElementById('corpoGestor').innerHTML = equipe.map(f => `
        <tr class="border-b border-white/5"><td class="p-4">${f.user}</td><td class="p-4 text-indigo-400 text-[10px] font-black uppercase">${f.role}</td></tr>`).join('');
}
