// CONFIGURAÇÕES GERAIS E ESTADO DO SISTEMA
const CONFIG = { 
    user: 'admin', 
    pass: '000001', 
    h: { 'Manhã': '07:05', 'Tarde': '13:10' } 
};

// Carregamento inicial de dados (usando as chaves que já possuem dados no seu navegador)
let alunos = JSON.parse(localStorage.getItem('PV_ALUNOS_E') || '[]');
let atrasos = JSON.parse(localStorage.getItem('PV_ATRASOS_E') || '[]');

// --- SISTEMA DE INTERFACE (UI) ---

function notify(msg, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast p-5 rounded-2xl shadow-2xl text-white font-bold flex items-center gap-3 border border-white/10 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`;
    toast.innerHTML = `<i data-lucide="${type === 'success' ? 'shield-check' : 'alert-triangle'}"></i> ${msg}`;
    container.appendChild(toast);
    lucide.createIcons();
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => { 
        toast.classList.remove('show'); 
        setTimeout(() => toast.remove(), 500); 
    }, 3000);
}

// MODAL DE SEGURANÇA (Substitui o confirm nativo)
function perguntar(mensagem, callback) {
    const modal = document.getElementById('customModal');
    document.getElementById('modalText').innerText = mensagem;
    modal.classList.remove('hidden');
    document.getElementById('modalConfirmBtn').onclick = () => {
        callback();
        fecharModal();
    };
}

function fecharModal() { 
    document.getElementById('customModal').classList.add('hidden'); 
}

// NAVEGAÇÃO ENTRE TELAS
function mostrar(id) {
    document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
    const section = document.getElementById(id);
    if (section) section.classList.remove('hidden');
    
    // Controle do Dashboard de Stats (visível apenas no histórico)
    const stats = document.getElementById('statsRow');
    if (stats) stats.classList.toggle('hidden', id !== 'lista');
    
    // Estilo dos botões do Menu
    document.querySelectorAll('nav button').forEach(b => {
        if (b.id === 'nav-' + id) {
            b.className = "px-6 py-3 rounded-xl text-[11px] font-black transition bg-slate-900 text-white shadow-xl";
        } else {
            b.className = "px-6 py-3 rounded-xl text-[11px] font-black transition text-slate-400 hover:text-slate-600";
        }
    });

    if (id === 'cadastro') atualizarListaBD();
    if (id === 'registro') filtrarAlunosNoRegistro();
    if (id === 'lista') { exibirLista(); atualizarStats(); }
    
    lucide.createIcons();
}

// --- LOGICA DE AUTENTICAÇÃO ---

function autenticar() {
    const user = document.getElementById('userLogin').value;
    const pass = document.getElementById('passLogin').value;
    if (user === CONFIG.user && pass === CONFIG.pass) {
        document.getElementById('telaLogin').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        document.getElementById('dataAtual').innerText = new Date().toLocaleDateString('pt-BR', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        mostrar('lista');
    } else { 
        notify('Falha de segurança! Credenciais inválidas.', 'error'); 
    }
}

function logout() { location.reload(); }

// --- GESTÃO DE ALUNOS ---

function salvarAluno() {
    const nome = document.getElementById('nome').value.trim().toUpperCase();
    const turma = document.getElementById('turma').value.trim().toUpperCase();
    if (!nome || !turma) return notify('Preencha todos os campos!', 'error');

    alunos.push({ 
        id: Date.now(), 
        nome, 
        turma, 
        turno: document.getElementById('turno').value 
    });
    
    localStorage.setItem('PV_ALUNOS_E', JSON.stringify(alunos));
    notify('Matrícula vinculada com sucesso!');
    document.getElementById('nome').value = '';
    document.getElementById('turma').value = '';
    atualizarListaBD();
}

function atualizarListaBD() {
    const lista = document.getElementById('listaAlunosBD');
    lista.innerHTML = alunos.map(a => `
        <div class="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 group">
            <div>
                <div class="text-[11px] font-black text-slate-800">${a.nome}</div>
                <div class="text-[9px] font-bold text-blue-500 uppercase">${a.turma} | ${a.turno}</div>
            </div>
            <button onclick="removerAluno(${a.id})" class="text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                <i data-lucide="trash" class="w-4 h-4"></i>
            </button>
        </div>`).join('');
    lucide.createIcons();
}

function removerAluno(id) {
    perguntar('Deseja prosseguir com a revogação permanente desta credencial e de todos os históricos vinculados?', () => {
        alunos = alunos.filter(a => a.id !== id);
        atrasos = atrasos.filter(at => at.idAluno != id);
        localStorage.setItem('PV_ALUNOS_E', JSON.stringify(alunos));
        localStorage.setItem('PV_ATRASOS_E', JSON.stringify(atrasos));
        atualizarListaBD();
        notify('Credencial revogada com sucesso.', 'success');
        atualizarStats();
    });
}

// --- REGISTRO DE ATRASOS ---

function filtrarAlunosNoRegistro() {
    const termo = document.getElementById('inputBuscaAluno').value.toUpperCase();
    const filtrados = alunos.filter(a => a.nome.includes(termo)).sort((a,b) => a.nome.localeCompare(b.nome));
    const sel = document.getElementById('alunoSelect');
    sel.innerHTML = filtrados.length 
        ? filtrados.map(a => `<option value="${a.id}">${a.nome} [${a.turma}]</option>`).join('')
        : '<option>SEM RESULTADOS</option>';
}

function salvarAtraso() {
    const id = document.getElementById('alunoSelect').value;
    const data = document.getElementById('data').value;
    const hora = document.getElementById('hora').value;
    let motivo = document.getElementById('motivo').value;
    
    if (!id || id === 'SEM RESULTADOS' || !data || !hora) return notify('Dados incompletos!', 'error');
    if (motivo === 'Outros') motivo = document.getElementById('motivoCustom').value || 'OUTROS';

    const alu = alunos.find(a => a.id == id);
    const [hE, mE] = hora.split(':').map(Number);
    const [hO, mO] = CONFIG.h[alu.turno].split(':').map(Number);
    const min = (hE * 60 + mE) - (hO * 60 + mO);

    atrasos.push({ 
        id: Date.now(), 
        idAluno: id, 
        data, 
        hora, 
        motivo, 
        atraso: min > 0 ? min : 0 
    });
    
    localStorage.setItem('PV_ATRASOS_E', JSON.stringify(atrasos));
    notify('Entrada registrada no sistema!');
    mostrar('lista');
}

// --- HISTÓRICO E ESTATÍSTICAS ---

function exibirLista() {
    let html = `
        <table class="w-full text-xs">
            <thead>
                <tr class="bg-slate-100 text-slate-400 font-black text-[9px] uppercase">
                    <th class="p-6 text-left">Aluno / Turma</th>
                    <th class="p-6 text-center">Entrada</th>
                    <th class="p-6 text-center">Atraso</th>
                    <th class="p-6">Justificativa</th>
                    <th class="p-6 text-center">Protocolo</th>
                </tr>
            </thead>
            <tbody class="divide-y">`;

    atrasos.slice().reverse().forEach(at => {
        const alu = alunos.find(a => a.id == at.idAluno) || { nome: 'REMOVIDO', turma: '--', turno: '--' };
        const color = at.atraso > 30 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600';
        
        html += `
            <tr class="hover:bg-slate-50 transition">
                <td class="p-6">
                    <div class="font-black text-slate-800">${alu.nome}</div>
                    <div class="text-[8px] text-blue-500 font-black uppercase">${alu.turma}</div>
                </td>
                <td class="p-6 text-center">
                    <div class="font-bold">${at.hora}</div>
                    <div class="text-[8px] text-slate-400">${at.data.split('-').reverse().join('/')}</div>
                </td>
                <td class="p-6 text-center">
                    <span class="px-3 py-1 rounded-full font-black ${color}">${at.atraso}m</span>
                </td>
                <td class="p-6 text-slate-500 italic text-[10px]">${at.motivo}</td>
                <td class="p-6 text-center flex gap-2 justify-center">
                    <button onclick="gerarPDFIndividual(${at.id})" class="text-blue-500 p-2 hover:bg-blue-50 rounded-lg"><i data-lucide="printer" class="w-4 h-4"></i></button>
                    <button onclick="removerRegistro(${at.id})" class="text-slate-200 hover:text-red-500 p-2"><i data-lucide="x-circle" class="w-4 h-4"></i></button>
                </td>
            </tr>`;
    });

    document.getElementById('conteudoLista').innerHTML = html || '<p class="p-20 text-center text-slate-300 font-bold uppercase tracking-widest italic">Aguardando telemetria de registros...</p>';
    lucide.createIcons();
}

function removerRegistro(id) {
    perguntar('Confirmar a exclusão permanente desta ocorrência do banco de dados operacional?', () => {
        atrasos = atrasos.filter(at => at.id !== id);
        localStorage.setItem('PV_ATRASOS_E', JSON.stringify(atrasos));
        exibirLista();
        atualizarStats();
        notify('Registro de entrada anulado.', 'success');
    });
}

function atualizarStats() {
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('stat-alunos').innerText = alunos.length;
    document.getElementById('stat-hoje').innerText = atrasos.filter(a => a.data === hoje).length;
    const totalMin = atrasos.reduce((acc, curr) => acc + curr.atraso, 0);
    const media = atrasos.length ? Math.round(totalMin / atrasos.length) : 0;
    document.getElementById('stat-media').innerText = media + 'm';
}

// --- UTILITÁRIOS ---

function copiarBackup() {
    const dados = JSON.stringify({ alunos, atrasos });
    const blob = new Blob([dados], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PV2026_BACKUP_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    notify('Arquivo de backup gerado com sucesso!');
}

function toggleMotivo() { 
    document.getElementById('motivoCustom').classList.toggle('hidden', document.getElementById('motivo').value !== 'Outros'); 
}

// Inicialização de ícones global
lucide.createIcons();
