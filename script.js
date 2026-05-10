// BANCO DE DADOS
let alunos = JSON.parse(localStorage.getItem('pv_alunos')) || [];
let historico = JSON.parse(localStorage.getItem('pv_historico')) || [];
let alunoSelecionado = null;
let acaoConfirmacao = null;
let chartInstance = null;

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    atualizarStats();
    
    // Recuperar sessão de login se houver
    if(localStorage.getItem('pv_session') === 'active') {
        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('mainDashboard').classList.remove('hidden');
    }

    setInterval(() => {
        const el = document.getElementById('horaAtual');
        if(el) el.innerText = new Date().toLocaleTimeString('pt-BR');
    }, 1000);
});

// LOGIN
function login() {
    const u = document.getElementById('loginUser').value.toUpperCase();
    const p = document.getElementById('loginPass').value;
    if(u === 'ADMIN' && p === '2026') {
        localStorage.setItem('pv_session', 'active');
        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('mainDashboard').classList.remove('hidden');
        showToast('Bem-vindo, Gestor!', 'success');
        atualizarStats();
    } else {
        showToast('Acesso negado!', 'error');
    }
}

function logout() {
    localStorage.removeItem('pv_session');
    location.reload();
}

// NAVEGAÇÃO
function navTo(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.remove('hidden');
    event.currentTarget.classList.add('active');
    
    if(tabId === 'aba-gestao-dados') renderizarGestao();
}

// MATRÍCULA
function adicionarAluno() {
    const nome = document.getElementById('alunoNome').value.toUpperCase();
    const serie = document.getElementById('alunoSerie').value;
    const turma = document.getElementById('alunoTurma').value;
    
    if(!nome || !serie || !turma) return showToast('Preencha tudo!', 'error');

    alunos.push({ id: Date.now(), nome, turma: `${serie}º ${turma}` });
    localStorage.setItem('pv_alunos', JSON.stringify(alunos));
    document.getElementById('alunoNome').value = '';
    atualizarStats();
    showToast('Estudante matriculado!');
}

// PORTARIA (BUSCA E SALVAMENTO)
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
    if(!mot) return showToast('Selecione o motivo!', 'info');

    historico.unshift({ 
        data: new Date().toLocaleString('pt-BR'), 
        nome: alunoSelecionado.nome, 
        turma: alunoSelecionado.turma, 
        motivo: mot 
    });
    
    localStorage.setItem('pv_historico', JSON.stringify(historico));
    document.getElementById('formAtrasoContainer').classList.add('hidden');
    document.getElementById('searchAluno').value = '';
    atualizarStats();
    showToast('Entrada registrada!');
}

// ATUALIZAÇÃO DE UI E GRÁFICOS
function atualizarStats() {
    document.getElementById('statTotalAlunos').innerText = alunos.length;
    document.getElementById('statTotalAtrasos').innerText = historico.length;
    renderTableHistorico(historico);
    initChart();
}

function initChart() {
    const ctx = document.getElementById('graficoAtrasos').getContext('2d');
    const counts = historico.reduce((acc, curr) => {
        acc[curr.motivo] = (acc[curr.motivo] || 0) + 1;
        return acc;
    }, {});

    if(chartInstance) chartInstance.destroy();
    
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(counts),
            datasets: [{
                data: Object.values(counts),
                backgroundColor: ['#6366f1', '#10b981', '#f59e0b'],
                borderWidth: 0
            }]
        },
        options: { plugins: { legend: { labels: { color: '#94a3b8', font: { weight: 'bold', size: 10 } } } } }
    });
}

// FILTROS E EXPORTAÇÃO
function filtrarHistorico() {
    const busca = document.getElementById('searchHist').value.toUpperCase();
    const filtrados = historico.filter(h => h.nome.includes(busca));
    renderTableHistorico(filtrados);
}

function renderTableHistorico(dados) {
    document.getElementById('corpoHistorico').innerHTML = dados.map(h => `
        <tr class="border-b border-white/5">
            <td class="p-6 text-indigo-400 text-xs">${h.data}</td>
            <td class="p-6 uppercase">${h.nome}</td>
            <td class="p-6">${h.turma}</td>
            <td class="p-6 uppercase"><span class="bg-white/5 px-3 py-1 rounded-full text-[10px]">${h.motivo}</span></td>
        </tr>`).join('');
}

function exportarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("RELATÓRIO DE PORTARIA - PV-2026", 14, 15);
    const rows = historico.map(h => [h.data, h.nome, h.turma, h.motivo]);
    doc.autoTable({ head: [['Data', 'Aluno', 'Turma', 'Motivo']], body: rows, startY: 25 });
    doc.save('relatorio_portaria.pdf');
}

// GESTÃO E MODAL
function renderizarGestao() {
    document.getElementById('listaGestaoAlunos').innerHTML = alunos.map((a, i) => `
        <tr class="border-b border-white/5">
            <td class="p-4">${a.nome}</td>
            <td class="p-4 text-right"><button onclick="excluir('alunos', ${i})" class="text-red-500 font-black text-[9px]">EXCLUIR</button></td>
        </tr>`).join('');
    
    document.getElementById('listaGestaoHistorico').innerHTML = historico.map((h, i) => `
        <tr class="border-b border-white/5">
            <td class="p-4">${h.nome} (${h.data})</td>
            <td class="p-4 text-right"><button onclick="excluir('historico', ${i})" class="text-red-500 font-black text-[9px]">REMOVER</button></td>
        </tr>`).join('');
}

function excluir(tipo, idx) {
    openModal('Atenção', 'Deseja remover este registro permanentemente?', () => {
        if(tipo === 'alunos') alunos.splice(idx, 1);
        else historico.splice(idx, 1);
        localStorage.setItem(`pv_${tipo}`, JSON.stringify(tipo === 'alunos' ? alunos : historico));
        renderizarGestao();
        atualizarStats();
    });
}

function showToast(msg, tipo = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast-card toast-${tipo}`;
    toast.innerHTML = `<span class="text-[11px] font-black uppercase text-white">${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 3000);
}

function openModal(t, txt, cb) {
    document.getElementById('modalTitle').innerText = t;
    document.getElementById('modalText').innerText = txt;
    document.getElementById('customModal').classList.remove('hidden');
    document.getElementById('customModal').classList.add('flex');
    acaoConfirmacao = cb;
}

function closeModal() { document.getElementById('customModal').classList.add('hidden'); }
document.getElementById('modalConfirmBtn').onclick = () => { acaoConfirmacao(); closeModal(); };
