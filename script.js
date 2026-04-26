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
            const area = document.getElementById('justificativa');
            if(e.target.value === 'Outros') {
                area.classList.remove('hidden');
                area.classList.add('animate-3d-top');
            } else {
                area.classList.add('hidden');
            }
        }
    });
});

// SISTEMA DE TOASTS MODERNOS
function showToast(msg, type = "info") {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    const icon = type === 'error' ? 'alert-circle' : type === 'success' ? 'check-circle' : 'info';
    const bg = type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-indigo-600' : 'bg-slate-800';
    
    toast.className = `${bg} text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 animate-toast-entry border border-white/10 backdrop-blur-md`;
    toast.innerHTML = `<i data-lucide="${icon}" class="w-5 h-5"></i> <span class="text-[10px] font-black uppercase tracking-widest">${msg}</span>`;
    
    container.appendChild(toast);
    lucide.createIcons();
    
    setTimeout(() => {
        toast.classList.replace('animate-toast-entry', 'animate-toast-exit');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// AUTH
function toggleAuth(isL) {
    document.getElementById('loginForm').classList.toggle('hidden', !isL);
    document.getElementById('registerForm').classList.toggle('hidden', isL);
    document.getElementById('btnShowLogin').className = isL ? "flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all bg-indigo-600 text-white shadow-lg" : "flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all text-slate-400";
    document.getElementById('btnShowReg').className = !isL ? "flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all bg-indigo-600 text-white shadow-lg" : "flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all text-slate-400";
}

document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const u = document.getElementById('loginUser').value;
    const p = document.getElementById('loginPass').value;

    if(u === 'admin' && p === 'admin') {
        currentUser = {u: 'ADMINISTRADOR GERAL', role: 'admin'};
    } else {
        const data = JSON.parse(localStorage.getItem('user_'+u));
        if(!data || data.p !== p) return showToast("Credenciais Inválidas", "error");
        currentUser = data;
    }
    
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('mainDashboard').classList.remove('hidden');
    document.getElementById('userStatus').innerText = currentUser.u;
    
    if(currentUser.role === 'admin') document.getElementById('navAdmin').classList.remove('hidden');
    showToast(`Acesso autorizado: ${u}`, "success");
    carregarGestores();
});

// CADASTRO
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
    showToast("Estudante matriculado com sucesso", "success");
});

// LOGICA DE ATRASO
function salvarAtraso() {
    const agora = new Date();
    const hora = agora.getHours();
    const min = agora.getMinutes();
    const periodo = selectedAluno.periodo;

    let minutosAtraso = 0;
    let ativo = false;

    // Horários definidos
    if(periodo === 'Manhã') {
        if((hora === 7 && min >= 5) || (hora === 8) || (hora === 9 && min <= 40)) {
            ativo = true;
            minutosAtraso = ((hora * 60) + min) - ((7 * 60) + 5);
        }
    } else {
        if((hora === 13 && min >= 5) || (hora === 14) || (hora === 15 && min <= 40)) {
            ativo = true;
            minutosAtraso = ((hora * 60) + min) - ((13 * 60) + 5);
        }
    }

    if(!ativo) return showToast("Sistema inativo para este turno", "error");

    const motivo = document.querySelector('input[name="motivo"]:checked')?.value;
    const just = document.getElementById('justificativa').value;

    if(!motivo) return showToast("Selecione a categoria do atraso", "error");
    if(PALAVROES.some(w => just.toLowerCase().includes(w))) return showToast("Linguagem não permitida!", "error");

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
    
    showToast(`Registro validado: +${minutosAtraso}min`, "success");
    document.getElementById('formAtrasoContainer').classList.add('hidden');
    carregarHistorico();
}

// UTILITARIOS
function navTo(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active', 'bg-indigo-600', 'text-white', 'shadow-indigo-500/50', 'shadow-xl'));
    
    const target = document.getElementById(id);
    target.classList.remove('hidden');
    target.classList.add('animate-3d-entry');
    
    event.currentTarget.classList.add('active', 'bg-indigo-600', 'text-white', 'shadow-indigo-500/50', 'shadow-xl');
}

function carregarAlunos() {
    const lista = JSON.parse(localStorage.getItem('alunos') || '[]');
    document.getElementById('listaAlunos').innerHTML = lista.map(a => `
        <tr class="border-b border-white/5 hover:bg-white/5 transition-colors group">
            <td class="p-6 font-black uppercase text-xs text-white">${a.nome}</td>
            <td class="p-6 text-[10px] text-slate-400 font-bold">${a.serie} | ${a.turma}</td>
            <td class="p-6"><span class="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase">${a.periodo}</span></td>
            <td class="p-6 text-right"><button onclick="removerAluno(${a.id})" class="text-slate-600 hover:text-red-400 transition-colors"><i data-lucide="x-circle" class="w-5 h-5"></i></button></td>
        </tr>
    `).join('');
    lucide.createIcons();
}

function carregarHistorico() {
    const hist = JSON.parse(localStorage.getItem('historico') || '[]');
    document.getElementById('tabelaHistorico').innerHTML = hist.map(h => `
        <tr class="border-b border-white/5">
            <td class="p-6 text-[10px] font-bold text-slate-500">${h.data}</td>
            <td class="p-6 text-[10px] font-bold text-white italic">${h.hora}</td>
            <td class="p-6 text-xs font-black uppercase text-indigo-300">${h.aluno}</td>
            <td class="p-6"><span class="px-3 py-1 rounded-lg bg-red-500/10 text-red-400 font-black text-[9px]">+${h.atraso} MIN</span></td>
            <td class="p-6 text-[10px] font-bold uppercase text-slate-500">${h.motivo}</td>
        </tr>
    `).join('');
}

function filtrarAlunosAtraso() {
    const busca = document.getElementById('searchAluno').value.toLowerCase();
    const res = document.getElementById('resultadoBusca');
    const alunos = JSON.parse(localStorage.getItem('alunos') || '[]');
    if(busca.length < 2) return res.classList.add('hidden');
    const filtrados = alunos.filter(a => a.nome.toLowerCase().includes(busca));
    res.innerHTML = filtrados.map(a => `<div onclick="selecionarAlunoAtraso(${a.id})" class="p-5 hover:bg-white/10 cursor-pointer text-[10px] font-black text-white uppercase border-b border-white/5 transition-all">${a.nome} <span class="text-slate-500 ml-2">${a.serie}</span></div>`).join('');
    res.classList.remove('hidden');
}

function selecionarAlunoAtraso(id) {
    const alunos = JSON.parse(localStorage.getItem('alunos') || '[]');
    selectedAluno = alunos.find(a => a.id === id);
    document.getElementById('resultadoBusca').classList.add('hidden');
    document.getElementById('nomeAlunoSelecionado').innerText = selectedAluno.nome;
    document.getElementById('formAtrasoContainer').classList.remove('hidden');
    document.getElementById('formAtrasoContainer').classList.add('animate-3d-entry');
}

function carregarGestores() {
    const lista = document.getElementById('listaGestores');
    lista.innerHTML = "";
    for(let i=0; i<localStorage.length; i++){
        const key = localStorage.key(i);
        if(key.startsWith('user_')){
            const user = JSON.parse(localStorage.getItem(key));
            lista.innerHTML += `<tr class="border-b border-white/5"><td class="p-6 font-black text-white text-xs uppercase italic">${user.u}</td><td class="p-6 text-right"><button onclick="removerGestor('${key}')" class="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all font-black text-[9px] uppercase">Revogar</button></td></tr>`;
        }
    }
}

function atualizarRelogio() {
    const agora = new Date();
    document.getElementById('dataAtual').innerText = agora.toLocaleDateString('pt-br', { weekday: 'long', day: 'numeric', month: 'long' });
    document.getElementById('horaAtual').innerText = agora.toLocaleTimeString('pt-br');
    setTimeout(atualizarRelogio, 1000);
}

function logout() { location.reload(); }
function removerAluno(id) { if(confirm("Deseja remover este estudante?")) { let l = JSON.parse(localStorage.getItem('alunos')); l = l.filter(a => a.id !== id); localStorage.setItem('alunos', JSON.stringify(l)); carregarAlunos(); showToast("Removido", "error"); } }
function removerGestor(k) { if(confirm("Revogar acesso deste gestor?")) { localStorage.removeItem(k); carregarGestores(); showToast("Acesso Revogado"); } }

function exportarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const hist = JSON.parse(localStorage.getItem('historico') || '[]');
    doc.setFontSize(18); doc.text("LOG DE EVENTOS - PV-2026", 14, 20);
    doc.autoTable({ 
        startY: 30, 
        head: [['DATA', 'HORA', 'ALUNO', 'ATRASO', 'MOTIVO']], 
        body: hist.map(h => [h.data, h.hora, h.aluno, h.atraso + "m", h.motivo]),
        headStyles: { fillColor: [79, 70, 229] },
        styles: { font: 'helvetica', fontSize: 8 }
    });
    doc.save('relatorio_atrasos.pdf');
    showToast("Documento gerado", "success");
}
