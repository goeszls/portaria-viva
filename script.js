// --- ESTADO GLOBAL ---
let alunos = JSON.parse(localStorage.getItem('pv_alunos')) || [];
let historico = JSON.parse(localStorage.getItem('pv_historico')) || [];
let alunoSelecionado = null;

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    setInterval(atualizarRelogio, 1000);
    atualizarDashboard();
});

function atualizarRelogio() {
    const el = document.getElementById('horaAtual');
    if(el) el.innerText = new Date().toLocaleTimeString('pt-BR');
}

// --- AUTENTICAÇÃO E NAVEGAÇÃO ---
function login() {
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('mainDashboard').classList.remove('hidden');
}

function navTo(abaId) {
    document.querySelectorAll('.tab-content').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(abaId).classList.remove('hidden');
    event.currentTarget.classList.add('active');

    if(abaId === 'aba-historico') renderizarHistorico();
}

// --- GESTÃO DE ALUNOS ---
function adicionarAluno() {
    const nome = document.getElementById('alunoNome').value.toUpperCase();
    const turma = document.getElementById('alunoTurma').value.toUpperCase();
    
    if(!nome || !turma) return alert("Preencha tudo!");

    const novo = { id: Date.now(), nome, turma };
    alunos.push(novo);
    localStorage.setItem('pv_alunos', JSON.stringify(alunos));
    
    document.getElementById('alunoNome').value = '';
    document.getElementById('alunoTurma').value = '';
    atualizarDashboard();
    alert("Aluno matriculado!");
}

// --- PORTARIA ---
function buscarAluno() {
    const termo = document.getElementById('searchAluno').value.toUpperCase();
    const res = document.getElementById('resultadoBusca');
    
    if(termo.length < 2) { res.classList.add('hidden'); return; }

    const filtrados = alunos.filter(a => a.nome.includes(termo));
    res.innerHTML = filtrados.map(a => `
        <div onclick="selecionarAluno(${a.id})" class="p-5 hover:bg-indigo-600/20 cursor-pointer border-b border-white/5">
            <p class="font-black text-xs uppercase">${a.nome}</p>
            <p class="text-[9px] opacity-50 font-bold">${a.turma}</p>
        </div>
    `).join('');
    res.classList.remove('hidden');
}

function selecionarAluno(id) {
    alunoSelecionado = alunos.find(a => a.id === id);
    document.getElementById('nomeAlunoSelecionado').innerText = alunoSelecionado.nome;
    document.getElementById('infoAlunoSelecionado').innerText = `TURMA: ${alunoSelecionado.turma}`;
    document.getElementById('formAtrasoContainer').classList.remove('hidden');
    document.getElementById('resultadoBusca').classList.add('hidden');
    document.getElementById('searchAluno').value = '';
}

function toggleJustificativa(show) {
    const campo = document.getElementById('justificativaOutros');
    campo.classList.toggle('hidden', !show);
    if(show) campo.focus();
}

function salvarAtraso() {
    const radio = document.querySelector('input[name="motivo"]:checked');
    if(!radio) return alert("Escolha um motivo!");

    let motivoFinal = radio.value;
    if(motivoFinal === 'Outros') {
        const txt = document.getElementById('justificativaOutros').value;
        motivoFinal = txt ? `OUTROS: ${txt.toUpperCase()}` : "OUTROS (NÃO ESPECIFICADO)";
    }

    const reg = {
        dataHora: new Date().toLocaleString('pt-BR'),
        nome: alunoSelecionado.nome,
        turma: alunoSelecionado.turma,
        motivo: motivoFinal
    };

    historico.unshift(reg);
    localStorage.setItem('pv_historico', JSON.stringify(historico));
    
    alert("Entrada registrada!");
    document.getElementById('formAtrasoContainer').classList.add('hidden');
    document.querySelectorAll('input[name="motivo"]').forEach(r => r.checked = false);
    toggleJustificativa(false);
}

// --- EXPORTAÇÃO PDF ---
function exportarPDF(tipo) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const agora = new Date().toLocaleString();

    // Design do Header do PDF
    doc.setFillColor(2, 6, 23); // Cor do sistema
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("PV-2026 PRO | RELATÓRIO", 15, 22);
    doc.setFontSize(9);
    doc.text(`GERADO EM: ${agora} | TIPO: ${tipo.toUpperCase()}`, 15, 32);

    if(tipo === 'dashboard') {
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.text("SUMÁRIO EXECUTIVO", 15, 55);
        doc.autoTable({
            startY: 60,
            head: [['Métrica', 'Valor']],
            body: [
                ['Total de Alunos Matriculados', alunos.length],
                ['Total de Atrasos Registrados', historico.length],
                ['Status do Servidor', 'Operacional'],
                ['Licença', 'PV-2026 Enterprise']
            ],
            theme: 'grid'
        });
    } else {
        const dados = historico.map(h => [h.dataHora, h.nome, h.turma, h.motivo]);
        doc.autoTable({
            startY: 50,
            head: [['Data/Hora', 'Estudante', 'Turma', 'Motivo da Entrada']],
            body: dados,
            headStyles: { fillColor: [79, 70, 229] },
            styles: { fontSize: 8 }
        });
    }

    doc.save(`Relatorio_${tipo}_${Date.now()}.pdf`);
}

function renderizarHistorico() {
    const corpo = document.getElementById('corpoHistorico');
    corpo.innerHTML = historico.map(h => `
        <tr class="border-b border-white/5">
            <td class="p-6 text-[10px] text-slate-500">${h.dataHora}</td>
            <td class="p-6 uppercase">${h.nome}</td>
            <td class="p-6 uppercase">${h.turma}</td>
            <td class="p-6 text-indigo-400 italic">${h.motivo}</td>
        </tr>
    `).join('');
}

function atualizarDashboard() {
    document.getElementById('statTotalAlunos').innerText = alunos.length;
}
