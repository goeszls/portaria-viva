let currentUser = null;
let selectedAluno = null;
const PALAVROES = ["porra", "caralho", "merda", "foda", "puta"];

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    atualizarRelogio();
    carregarAlunos();
    carregarHistorico();
    atualizarDashboard();
    
    document.addEventListener('change', (e) => {
        if(e.target.name === 'motivo') {
            const area = document.getElementById('justificativa');
            area.classList.toggle('hidden', e.target.value !== 'Outros');
        }
    });
});

// DASHBOARD DE INTELIGÊNCIA
function atualizarDashboard() {
    const alunos = JSON.parse(localStorage.getItem('alunos') || '[]');
    const hist = JSON.parse(localStorage.getItem('historico') || '[]');
    
    document.getElementById('statTotalAlunos').innerText = alunos.length;
    document.getElementById('statAtrasosMes').innerText = hist.length;

    // Lógica de Recidiva (Alunos com > 2 atrasos)
    const contagem = {};
    hist.forEach(h => contagem[h.aluno] = (contagem[h.aluno] || 0) + 1);

    const riscoContainer = document.getElementById('riscoContainer');
    riscoContainer.innerHTML = "";
    
    Object.keys(contagem).forEach(nome => {
        if(contagem[nome] >= 2) {
            riscoContainer.innerHTML += `
                <div class="p-6 rounded-[2rem] bg-red-500/10 border border-red-500/20 flex justify-between items-center animate-pulse">
                    <div>
                        <p class="text-white font-black text-sm uppercase">${nome}</p>
                        <p class="text-red-400 text-[9px] font-black uppercase tracking-widest">${contagem[nome]} ATRASOS ACUMULADOS</p>
                    </div>
                    <i data-lucide="alert-triangle" class="text-red-500 w-6 h-6"></i>
                </div>
            `;
        }
    });
    lucide.createIcons();
}

// TOASTS PREMIUM
function showToast(msg, type = "info") {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    const color = type === 'error' ? 'bg-red-600' : 'bg-indigo-600';
    t.className = `${color} text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 animate-toast border border-white/10 backdrop-blur-md`;
    t.innerHTML = `<i data-lucide="shield" class="w-5 h-5"></i> <span class="text-[10px] font-black uppercase tracking-[0.2em]">${msg}</span>`;
    c.appendChild(t);
    lucide.createIcons();
    setTimeout(() => t.remove(), 4000);
}

// LOGIN COM AUDITORIA
document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const u = document.getElementById('loginUser').value;
    const p = document.getElementById('loginPass').value;

    if(u === 'admin' && p === 'admin') {
        currentUser = {u: 'ADMIN MASTER', role: 'admin'};
    } else {
        const data = JSON.parse(localStorage.getItem('user_'+u));
        if(!data || data.p !== p) return showToast("Acesso Negado", "error");
        currentUser = data;
    }
    
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('mainDashboard').classList.remove('hidden');
    document.getElementById('userStatus').innerText = currentUser.u;
    
    if(currentUser.role === 'admin') document.getElementById('navAdmin').classList.remove('hidden');
    showToast("Sistema PV-2026 Autenticado", "success");
    atualizarDashboard();
});

// SALVAR ATRASO COM LOG DE OPERADOR (AUDITORIA)
function salvarAtraso() {
    const agora = new Date();
    const hora = agora.getHours();
    const min = agora.getMinutes();
    const periodo = selectedAluno.periodo;

    let minutosAtraso = 0;
    let ativo = false;

    // Regras de Horário Escolares
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

    if(!ativo) return showToast("Acesso bloqueado: fora do horário", "error");

    const motivo = document.querySelector('input[name="motivo"]:checked')?.value;
    const just = document.getElementById('justificativa').value;

    if(!motivo) return showToast("Selecione o motivo do registro", "error");
    if(PALAVROES.some(w => just.toLowerCase().includes(w))) return showToast("Linguagem imprópria detectada", "error");

    const registro = {
        data: agora.toLocaleDateString('pt-br'),
        hora: `${hora}:${min.toString().padStart(2, '0')}`,
        aluno: selectedAluno.nome,
        atraso: minutosAtraso,
        operador: currentUser.u, // Rastreabilidade Enterprise
        motivo: motivo,
        justificativa: just
    };

    const hist = JSON.parse(localStorage.getItem('historico') || '[]');
    hist.unshift(registro);
    localStorage.setItem('historico', JSON.stringify(hist));
    
    showToast(`Entrada validada: ${minutosAtraso} min`);
    document.getElementById('formAtrasoContainer').classList.add('hidden');
    carregarHistorico();
    atualizarDashboard();
}

// EXPORTAÇÃO EXCEL (CSV ENTERPRISE)
function exportarExcel() {
    const hist = JSON.parse(localStorage.getItem('historico') || '[]');
    let csv = "Data;Hora;Aluno;Atraso(min);Operador;Motivo;Justificativa\n";
    
    hist.forEach(h => {
        csv += `${h.data};${h.hora};${h.aluno};${h.atraso};${h.operador};${h.motivo};${h.justificativa}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "auditoria_escolar_pv2026.csv");
    document.body.appendChild(link);
    link.click();
    showToast("Planilha CSV gerada", "success");
}

// NAVEGAÇÃO E UTILS
function navTo(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active', 'bg-indigo-600', 'text-white'));
    document.getElementById(id).classList.remove('hidden');
    event.currentTarget.classList.add('active', 'bg-indigo-600', 'text-white');
    atualizarDashboard();
}

function carregarAlunos() {
    const lista = JSON.parse(localStorage.getItem('alunos') || '[]');
    document.getElementById('listaAlunos').innerHTML = lista.map(a => `
        <tr class="border-b border-white/5 hover:bg-white/5 transition-all">
            <td class="p-6 font-black uppercase text-xs text-white">${a.nome}</td>
            <td class="p-6 text-[10px] text-slate-500 font-bold">${a.serie} | ${a.turma}</td>
            <td class="p-6"><span class="px-4 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase">${a.periodo}</span></td>
            <td class="p-6 text-right"><button onclick="removerAluno(${a.id})" class="text-slate-600 hover:text-red-500"><i data-lucide="trash-2" class="w-4 h-4 inline"></i></button></td>
        </tr>
    `).join('');
    lucide.createIcons();
}

function carregarHistorico() {
    const hist = JSON.parse(localStorage.getItem('historico') || '[]');
    document.getElementById('tabelaHistorico').innerHTML = hist.map(h => `
        <tr class="border-b border-white/5">
            <td class="p-8 text-[10px] font-bold text-slate-500 uppercase">${h.data} | ${h.hora}</td>
            <td class="p-8 text-xs font-black uppercase text-white tracking-tighter">${h.aluno}</td>
            <td class="p-8"><span class="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 font-black text-[9px]">+${h.atraso}m</span></td>
            <td class="p-8 text-[10px] font-black text-indigo-400 uppercase italic">${h.operador}</td>
            <td class="p-8 text-[10px] font-bold text-slate-500 uppercase">${h.motivo}</td>
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
            lista.innerHTML += `<tr class="border-b border-white/5"><td class="p-6 font-black text-white text-xs uppercase">${user.u}</td><td class="p-6 text-right"><button onclick="removerGestor('${key}')" class="text-red-500 font-black text-[9px] uppercase hover:underline">Revogar Acesso</button></td></tr>`;
        }
    }
}

function filtrarAlunosAtraso() {
    const busca = document.getElementById('searchAluno').value.toLowerCase();
    const res = document.getElementById('resultadoBusca');
    const alunos = JSON.parse(localStorage.getItem('alunos') || '[]');
    if(busca.length < 2) return res.classList.add('hidden');
    const filtrados = alunos.filter(a => a.nome.toLowerCase().includes(busca));
    res.innerHTML = filtrados.map(a => `<div onclick="selecionarAlunoAtraso(${a.id})" class="p-6 hover:bg-white/5 cursor-pointer text-xs font-black text-white uppercase border-b border-white/5">${a.nome} <span class="text-slate-600 ml-4">${a.serie}</span></div>`).join('');
    res.classList.remove('hidden');
}

function selecionarAlunoAtraso(id) {
    const alunos = JSON.parse(localStorage.getItem('alunos') || '[]');
    selectedAluno = alunos.find(a => a.id === id);
    document.getElementById('resultadoBusca').classList.add('hidden');
    document.getElementById('nomeAlunoSelecionado').innerText = selectedAluno.nome;
    document.getElementById('formAtrasoContainer').classList.remove('hidden');
}

document.getElementById('formAluno').addEventListener('submit', (e) => {
    e.preventDefault();
    const aluno = { id: Date.now(), nome: document.getElementById('alunoNome').value, serie: document.getElementById('alunoSerie').value, turma: document.getElementById('alunoTurma').value, periodo: document.getElementById('alunoPeriodo').value };
    const lista = JSON.parse(localStorage.getItem('alunos') || '[]');
    lista.push(aluno);
    localStorage.setItem('alunos', JSON.stringify(lista));
    carregarAlunos(); e.target.reset(); showToast("Matrícula Confirmada");
});

function atualizarRelogio() {
    const agora = new Date();
    document.getElementById('dataAtual').innerText = agora.toLocaleDateString('pt-br', { weekday: 'long', day: 'numeric', month: 'long' });
    document.getElementById('horaAtual').innerText = agora.toLocaleTimeString('pt-br');
    setTimeout(atualizarRelogio, 1000);
}

function logout() { location.reload(); }
function removerAluno(id) { if(confirm("Deseja deletar?")) { let l = JSON.parse(localStorage.getItem('alunos')); l = l.filter(a => a.id !== id); localStorage.setItem('alunos', JSON.stringify(l)); carregarAlunos(); } }
function removerGestor(k) { if(confirm("Revogar?")) { localStorage.removeItem(k); carregarGestores(); } }
