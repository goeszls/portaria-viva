let currentUser = null;
let selectedAluno = null;
let html5QrCode = null;
let myChart = null;

// MOTOR DE SINCRONIZAÇÃO EM NUVEM (SIMULADO PARA SUPABASE)
const Cloud = {
    async save(key, data) {
        // Aqui você trocaria pelo fetch do Supabase
        localStorage.setItem('pv_cloud_' + key, JSON.stringify(data));
        console.log(`[Cloud] Sincronizado: ${key}`);
    },
    async load(key) {
        return JSON.parse(localStorage.getItem('pv_cloud_' + key) || '[]');
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();
    atualizarRelogio();
    carregarAlunos();
    
    document.getElementById('formNovoGestor').addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = document.getElementById('newUserName').value;
        const p = document.getElementById('newUserPass').value;
        if(!u || !p) return showToast("Preencha os campos", "error");
        
        let gestores = await Cloud.load('gestores');
        gestores.push({u, p, role: 'staff'});
        await Cloud.save('gestores', gestores);
        showToast("Gestor Criado");
        e.target.reset();
        renderizarGestores();
    });

    // Toggle Justificativa
    document.addEventListener('change', (e) => {
        if(e.target.name === 'motivo') {
            document.getElementById('justificativa').classList.toggle('hidden', e.target.value !== 'Outros');
        }
    });
});

// SISTEMA DE LOGIN
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('loginUser').value;
    const p = document.getElementById('loginPass').value;

    let autentiado = false;
    if(u === 'admin' && p === 'admin') {
        currentUser = {u: 'MASTER ADMIN', role: 'admin'};
        autentiado = true;
    } else {
        const gestores = await Cloud.load('gestores');
        const g = gestores.find(item => item.u === u && item.p === p);
        if(g) { currentUser = g; autentiado = true; }
    }

    if(autentiado) {
        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('mainDashboard').classList.remove('hidden');
        document.getElementById('userStatus').innerText = currentUser.u;
        if(currentUser.role === 'admin') document.getElementById('navAdmin').classList.remove('hidden');
        showToast("Conexão Estabelecida", "success");
        initDashboard();
    } else {
        showToast("Falha na Autenticação", "error");
    }
});

// SCANNER DE QR CODE (ESTRATÉGIA DE VELOCIDADE)
function startScanner() {
    if(html5QrCode) return;
    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 15, qrbox: 250 },
        (decodedText) => {
            const alunoID = decodedText.replace('PV2026_', '');
            processarLeituraQR(alunoID);
        }
    ).catch(err => console.error(err));
}

async function processarLeituraQR(id) {
    const alunos = await Cloud.load('alunos');
    const aluno = alunos.find(a => a.id.toString() === id);
    if(aluno) {
        if(selectedAluno?.id === aluno.id) return; // Evita duplicidade no mesmo segundo
        window.navigator.vibrate?.(100);
        selecionarAlunoAtraso(aluno.id);
        showToast("QR Identificado: " + aluno.nome);
    }
}

// DASHBOARD E GRÁFICOS (CHART.JS)
async function initDashboard() {
    const alunos = await Cloud.load('alunos');
    const hist = await Cloud.load('historico');
    
    document.getElementById('statTotalAlunos').innerText = alunos.length;

    // Lógica de Recidiva
    const contagem = {};
    hist.forEach(h => contagem[h.aluno] = (contagem[h.aluno] || 0) + 1);
    const container = document.getElementById('riscoContainer');
    container.innerHTML = "";
    Object.keys(contagem).forEach(nome => {
        if(contagem[nome] >= 2) {
            container.innerHTML += `
                <div class="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex justify-between items-center animate-pulse">
                    <div><p class="text-white font-black text-[10px] uppercase">${nome}</p><p class="text-red-400 text-[8px] font-bold">${contagem[nome]} ATRASOS</p></div>
                    <i data-lucide="alert-triangle" class="text-red-500 w-4 h-4"></i>
                </div>
            `;
        }
    });

    // Gráfico de Barras
    const ctx = document.getElementById('chartAtrasos').getContext('2d');
    if(myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'],
            datasets: [{
                label: 'Atrasos Registrados',
                data: [12, 19, 3, 5, 2], // Dados simulados (no real viriam do historico)
                backgroundColor: '#6366f1',
                borderRadius: 10
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true, display: false }, x: { grid: { display: false }, ticks: { color: '#475569' } } },
            plugins: { legend: { display: false } }
        }
    });
    lucide.createIcons();
}

// GESTÃO DE ALUNOS
document.getElementById('formAluno').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = Date.now();
    const nome = document.getElementById('alunoNome').value;
    const novo = {
        id, nome, 
        serie: document.getElementById('alunoSerie').value,
        periodo: document.getElementById('alunoPeriodo').value,
        qr: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=PV2026_${id}`
    };
    
    let l = await Cloud.load('alunos');
    l.push(novo);
    await Cloud.save('alunos', l);
    
    window.open(novo.qr, '_blank'); // Abre QR para impressão
    carregarAlunos();
    e.target.reset();
    showToast("Aluno Matriculado!");
});

async function carregarAlunos() {
    const l = await Cloud.load('alunos');
    document.getElementById('listaAlunos').innerHTML = l.map(a => `
        <tr class="border-b border-white/5">
            <td class="p-6 text-xs font-black text-white uppercase">${a.nome}</td>
            <td class="p-6 text-[10px] text-slate-500 font-bold">${a.serie}</td>
            <td class="p-6 text-[9px] font-mono text-indigo-400">${a.id}</td>
            <td class="p-6 text-right"><button onclick="removerAluno(${a.id})" class="text-red-500"><i data-lucide="trash" class="w-4 h-4"></i></button></td>
        </tr>
    `).join('');
    lucide.createIcons();
}

// NAVEGAÇÃO
function navTo(id, e) {
    if(e) e.preventDefault();
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active', 'bg-indigo-600', 'text-white'));
    
    document.getElementById(id).classList.remove('hidden');
    const btn = e ? e.currentTarget : document.querySelector(`[onclick*="${id}"]`);
    if(btn) btn.classList.add('active', 'bg-indigo-600', 'text-white');

    if(id === 'aba-atrasos') startScanner();
    if(id === 'aba-dash') initDashboard();
    if(id === 'aba-admin') renderizarGestores();
}

// OUTROS UTILS
function showToast(m, type="info") {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `${type==='error'?'bg-red-600':'bg-indigo-600'} text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 border border-white/10 animate-toast`;
    t.innerHTML = `<i data-lucide="bell" class="w-4 h-4"></i><span class="text-[9px] font-black uppercase tracking-widest">${m}</span>`;
    c.appendChild(t);
    lucide.createIcons();
    setTimeout(() => t.remove(), 4000);
}

function atualizarRelogio() {
    const h = document.getElementById('horaAtual');
    if(h) h.innerText = new Date().toLocaleTimeString('pt-br');
    setTimeout(atualizarRelogio, 1000);
}

async function renderizarGestores() {
    const g = await Cloud.load('gestores');
    document.getElementById('listaGestores').innerHTML = g.map(i => `
        <tr class="border-b border-white/5">
            <td class="p-6 text-[10px] font-black text-white">${i.u}</td>
            <td class="p-6 text-right"><button class="text-red-500 text-[9px] font-black uppercase">Revogar</button></td>
        </tr>
    `).join('');
}

async function selecionarAlunoAtraso(id) {
    const l = await Cloud.load('alunos');
    selectedAluno = l.find(a => a.id.toString() === id.toString());
    document.getElementById('nomeAlunoSelecionado').innerText = selectedAluno.nome;
    document.getElementById('formAtrasoContainer').classList.remove('hidden');
}

async function salvarAtraso() {
    const hist = await Cloud.load('historico');
    hist.push({
        aluno: selectedAluno.nome,
        data: new Date().toLocaleDateString(),
        operador: currentUser.u,
        motivo: document.querySelector('input[name="motivo"]:checked')?.value || 'Outros'
    });
    await Cloud.save('historico', hist);
    showToast("Atraso Gravado na Nuvem");
    document.getElementById('formAtrasoContainer').classList.add('hidden');
    initDashboard();
}

function logout() { location.reload(); }
