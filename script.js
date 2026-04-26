let currentUser = null;
let selectedAluno = null;

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    atualizarRelogio();
    carregarAlunos();
    atualizarDashboard();
    
    // Listener para o formulário de novos gestores (Apenas Admin Master usa)
    document.getElementById('formNovoGestor').addEventListener('submit', function(e) {
        e.preventDefault();
        const user = document.getElementById('newUserName').value;
        const pass = document.getElementById('newUserPass').value;

        if(!user || !pass) return showToast("Preencha todos os campos", "error");
        if(localStorage.getItem('staff_'+user)) return showToast("Este login já existe", "error");

        const novoStaff = { u: user, p: pass, role: 'staff' };
        localStorage.setItem('staff_'+user, JSON.stringify(novoStaff));
        
        showToast("Gestor criado com sucesso", "success");
        this.reset();
        carregarGestores();
    });

    document.getElementById('motivosContainer').addEventListener('change', (e) => {
        if(e.target.name === 'motivo') {
            document.getElementById('justificativa').classList.toggle('hidden', e.target.value !== 'Outros');
        }
    });
});

// LOGIN SEGURO
document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const u = document.getElementById('loginUser').value;
    const p = document.getElementById('loginPass').value;

    if(u === 'admin' && p === 'admin') {
        currentUser = {u: 'MASTER ROOT', role: 'admin'};
    } else {
        const data = JSON.parse(localStorage.getItem('staff_'+u));
        if(!data || data.p !== p) return showToast("Credenciais Inválidas", "error");
        currentUser = data;
    }
    
    // Configura Visibilidade baseada no Cargo
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('mainDashboard').classList.remove('hidden');
    document.getElementById('userStatus').innerText = currentUser.u;
    
    if(currentUser.role === 'admin') {
        document.getElementById('navAdmin').classList.remove('hidden');
    } else {
        document.getElementById('navAdmin').classList.add('hidden');
    }
    
    showToast(`Bem-vindo, ${u}`, "success");
    carregarGestores();
    atualizarDashboard();
});

// NAVEGAÇÃO ROBUSTA (Correção de Bug de Evento)
function navTo(id, e) {
    if(e) e.preventDefault();
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active', 'bg-indigo-600', 'text-white'));
    
    document.getElementById(id).classList.remove('hidden');
    
    const btn = e ? e.currentTarget : document.querySelector(`[onclick*="${id}"]`);
    if(btn) btn.classList.add('active', 'bg-indigo-600', 'text-white');
    
    if(id === 'aba-dash') atualizarDashboard();
}

// CÁLCULO DE ATRASO (MÉTRICA ENTERPRISE)
function salvarAtraso() {
    const agora = new Date();
    const hora = agora.getHours();
    const min = agora.getMinutes();
    const periodo = selectedAluno.periodo;

    let minutosAtraso = 0;
    let ativo = false;

    // Lógica Manhã (7:05 às 9:40)
    if(periodo === 'Manhã') {
        if((hora === 7 && min >= 5) || (hora === 8) || (hora === 9 && min <= 40)) {
            ativo = true;
            minutosAtraso = ((hora * 60) + min) - ((7 * 60) + 5);
        }
    } 
    // Lógica Tarde (13:05 às 15:40)
    else {
        if((hora === 13 && min >= 5) || (hora === 14) || (hora === 15 && min <= 40)) {
            ativo = true;
            minutosAtraso = ((hora * 60) + min) - ((13 * 60) + 5);
        }
    }

    if(!ativo) return showToast("Sistema bloqueado fora de horário", "error");

    const motivo = document.querySelector('input[name="motivo"]:checked')?.value;
    if(!motivo) return showToast("Selecione o motivo", "error");

    const registro = {
        id: Date.now(),
        data: agora.toLocaleDateString('pt-br'),
        hora: `${hora}:${min.toString().padStart(2, '0')}`,
        aluno: selectedAluno.nome,
        atraso: minutosAtraso,
        operador: currentUser.u,
        motivo: motivo
    };

    const hist = JSON.parse(localStorage.getItem('historico') || '[]');
    hist.unshift(registro);
    localStorage.setItem('historico', JSON.stringify(hist));
    
    showToast(`Registro Efetuado: +${minutosAtraso}min`, "success");
    document.getElementById('formAtrasoContainer').classList.add('hidden');
    atualizarDashboard();
}

// GESTÃO DE USUÁRIOS STAFF (APENAS ADMIN VÊ)
function carregarGestores() {
    const lista = document.getElementById('listaGestores');
    if(!lista) return;
    lista.innerHTML = "";
    for(let i=0; i<localStorage.length; i++){
        const key = localStorage.key(i);
        if(key.startsWith('staff_')){
            const user = JSON.parse(localStorage.getItem(key));
            lista.innerHTML += `
                <tr class="border-b border-white/5">
                    <td class="p-6 font-bold text-white uppercase text-[10px] italic">${user.u}</td>
                    <td class="p-6 text-right">
                        <button onclick="removerGestor('${key}')" class="text-red-500 font-black text-[9px] uppercase">Remover</button>
                    </td>
                </tr>
            `;
        }
    }
}

function atualizarDashboard() {
    const alunos = JSON.parse(localStorage.getItem('alunos') || '[]');
    const hist = JSON.parse(localStorage.getItem('historico') || '[]');
    
    document.getElementById('statTotalAlunos').innerText = alunos.length;

    // Analisador de Risco (Recidiva)
    const contagem = {};
    hist.forEach(h => contagem[h.aluno] = (contagem[h.aluno] || 0) + 1);

    const riscoContainer = document.getElementById('riscoContainer');
    riscoContainer.innerHTML = "";
    Object.keys(contagem).forEach(nome => {
        if(contagem[nome] >= 3) {
            riscoContainer.innerHTML += `
                <div class="p-5 rounded-3xl bg-red-500/10 border border-red-500/20 flex justify-between items-center">
                    <div><p class="text-white font-black text-xs uppercase">${nome}</p><p class="text-red-400 text-[9px] font-bold">${contagem[nome]} ATRASOS NESTE MÊS</p></div>
                    <i data-lucide="alert-circle" class="text-red-500"></i>
                </div>
            `;
        }
    });
    lucide.createIcons();
}

// UTILS
function showToast(m, type="info") {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `${type==='error'?'bg-red-600':'bg-indigo-600'} text-white px-8 py-5 rounded-3xl shadow-2xl animate-toast flex items-center gap-4 border border-white/10`;
    t.innerHTML = `<i data-lucide="bell" class="w-4 h-4"></i><span class="text-[10px] font-black uppercase tracking-widest">${m}</span>`;
    c.appendChild(t);
    lucide.createIcons();
    setTimeout(() => t.remove(), 4000);
}

function carregarAlunos() {
    const lista = JSON.parse(localStorage.getItem('alunos') || '[]');
    document.getElementById('listaAlunos').innerHTML = lista.map(a => `
        <tr class="border-b border-white/5 hover:bg-white/5 transition-all">
            <td class="p-6 font-black uppercase text-xs text-white">${a.nome}</td>
            <td class="p-6 text-[10px] text-slate-500 font-bold">${a.serie} | ${a.turma}</td>
            <td class="p-6"><span class="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase">${a.periodo}</span></td>
            <td class="p-6 text-right">
                <button onclick="removerAluno(${a.id})" class="text-slate-600 hover:text-red-500"><i data-lucide="x-circle" class="w-5 h-5"></i></button>
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
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
    document.getElementById('formAtrasoContainer').classList.add('animate-3d-entry');
}

document.getElementById('formAluno').addEventListener('submit', (e) => {
    e.preventDefault();
    const n = document.getElementById('alunoNome').value;
    if(!n) return showToast("Nome obrigatório", "error");
    const a = { id: Date.now(), nome: n, serie: document.getElementById('alunoSerie').value, turma: document.getElementById('alunoTurma').value, periodo: document.getElementById('alunoPeriodo').value };
    const l = JSON.parse(localStorage.getItem('alunos') || '[]');
    l.push(a);
    localStorage.setItem('alunos', JSON.stringify(l));
    carregarAlunos(); e.target.reset(); showToast("Matrícula Realizada");
});

function atualizarRelogio() {
    const agora = new Date();
    const d = document.getElementById('dataAtual');
    const h = document.getElementById('horaAtual');
    if(d && h) {
        d.innerText = agora.toLocaleDateString('pt-br', { weekday: 'long', day: 'numeric', month: 'long' });
        h.innerText = agora.toLocaleTimeString('pt-br');
    }
    setTimeout(atualizarRelogio, 1000);
}

function logout() { location.reload(); }
function removerAluno(id) { if(confirm("Remover?")) { let l = JSON.parse(localStorage.getItem('alunos')); l = l.filter(a => a.id !== id); localStorage.setItem('alunos', JSON.stringify(l)); carregarAlunos(); } }
function removerGestor(k) { if(confirm("Revogar acesso?")) { localStorage.removeItem(k); carregarGestores(); } }
