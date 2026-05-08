let alunos = JSON.parse(localStorage.getItem('pv_alunos')) || [];
let historico = JSON.parse(localStorage.getItem('pv_historico')) || [];
let equipe = JSON.parse(localStorage.getItem('pv_equipe')) || [{user:'ADMIN', role:'GESTOR'}];
let alunoSelecionado = null;

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    atualizarStats();
    setInterval(() => {
        document.getElementById('horaAtual').innerText = new Date().toLocaleTimeString('pt-BR');
    }, 1000);
});

function navTo(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.remove('hidden');
    event.currentTarget.classList.add('active');
    if(tabId === 'aba-gestao-dados') renderizarGestao();
}

function login() {
    const u = document.getElementById('loginUser').value.toUpperCase();
    const p = document.getElementById('loginPass').value;
    if(u === 'ADMIN' && p === '2026') {
        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('mainDashboard').classList.remove('hidden');
    }
}

function adicionarAluno() {
    const nome = document.getElementById('alunoNome').value.toUpperCase();
    const serie = document.getElementById('alunoSerie').value;
    const turma = document.getElementById('alunoTurma').value;
    if(!nome || !serie || !turma) return alert('Campos vazios!');
    alunos.push({ id: Date.now(), nome, turma: `${serie}º ${turma}` });
    localStorage.setItem('pv_alunos', JSON.stringify(alunos));
    document.getElementById('alunoNome').value = '';
    atualizarStats();
    alert('Matriculado!');
}

function buscarAluno() {
    const termo = document.getElementById('searchAluno').value.toUpperCase();
    const res = document.getElementById('resultadoBusca');
    res.innerHTML = '';
    if(termo.length < 2) return res.classList.add('hidden');
    alunos.filter(a => a.nome.includes(termo)).forEach(a => {
        const d = document.createElement('div');
        d.className = 'p-4 hover:bg-indigo-600 cursor-pointer border-b border-white/5 font-bold text-xs';
        d.innerText = `${a.nome} (${a.turma})`;
        d.onclick = () => {
            alunoSelecionado = a;
            res.classList.add('hidden');
            document.getElementById('formAtrasoContainer').classList.remove('hidden');
            document.getElementById('nomeAlunoSelecionado').innerText = a.nome;
        };
        res.appendChild(d);
    });
    res.classList.remove('hidden');
}

function salvarAtraso() {
    const mot = document.querySelector('input[name="motivo"]:checked')?.value;
    if(!mot) return;
    historico.unshift({ data: new Date().toLocaleString(), nome: alunoSelecionado.nome, turma: alunoSelecionado.turma, motivo: mot });
    localStorage.setItem('pv_historico', JSON.stringify(historico));
    document.getElementById('formAtrasoContainer').classList.add('hidden');
    document.getElementById('searchAluno').value = '';
    atualizarStats();
}

function renderizarGestao() {
    document.getElementById('listaGestaoAlunos').innerHTML = alunos.map((a, i) => `
        <tr class="border-b border-white/5"><td class="p-4">${a.nome}</td><td class="p-4 text-right">
        <button onclick="excluirItem('alunos', ${i})" class="text-red-500">EXCLUIR</button></td></tr>`).join('');
    
    document.getElementById('listaGestaoHistorico').innerHTML = historico.map((h, i) => `
        <tr class="border-b border-white/5"><td class="p-4">${h.nome}</td><td class="p-4 text-right">
        <button onclick="excluirItem('historico', ${i})" class="text-red-500">EXCLUIR</button></td></tr>`).join('');
}

function excluirItem(tipo, index) {
    if(!confirm('Deseja excluir?')) return;
    if(tipo === 'alunos') alunos.splice(index, 1);
    else historico.splice(index, 1);
    localStorage.setItem(`pv_${tipo}`, JSON.stringify(tipo === 'alunos' ? alunos : historico));
    renderizarGestao();
    atualizarStats();
}

function atualizarStats() {
    document.getElementById('statTotalAlunos').innerText = alunos.length;
    document.getElementById('corpoHistorico').innerHTML = historico.map(h => `
        <tr class="border-b border-white/5"><td class="p-6 text-indigo-400">${h.data}</td>
        <td class="p-6 uppercase">${h.nome}</td><td class="p-6">${h.turma}</td><td class="p-6 uppercase">${h.motivo}</td></tr>`).join('');
}

function criarFuncionario() {
    const u = document.getElementById('newStaffUser').value.toUpperCase();
    const r = document.getElementById('newStaffRole').value;
    if(!u) return;
    equipe.push({user:u, role:r});
    localStorage.setItem('pv_equipe', JSON.stringify(equipe));
    renderizarEquipe();
}

function renderizarEquipe() {
    document.getElementById('corpoGestor').innerHTML = equipe.map(f => `
        <tr class="border-b border-white/5"><td class="p-4">${f.user}</td><td class="p-4">${f.role}</td></tr>`).join('');
}
