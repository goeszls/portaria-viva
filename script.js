let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    carregarUsuarios();
});

// SISTEMA DE NOTIFICAÇÃO (TOAST)
function showToast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    const color = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-slate-800';
    
    toast.className = `${color} text-white px-6 py-4 rounded-2xl shadow-xl animate-in slide-in-from-right-10 duration-300 font-bold text-xs uppercase flex items-center gap-3`;
    toast.innerHTML = `<i data-lucide="bell" class="w-4 h-4"></i> ${msg}`;
    
    container.appendChild(toast);
    lucide.createIcons();
    
    setTimeout(() => {
        toast.classList.add('animate-out', 'fade-out', 'slide-out-to-right-10');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// LOGIN
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const user = document.getElementById('loginUser').value;
    const pass = document.getElementById('loginPass').value;

    const dados = JSON.parse(localStorage.getItem('pv_user_' + user));

    if ((user === 'admin' && pass === 'admin') || (dados && dados.pass === pass)) {
        currentUser = dados || { user: 'admin', role: 'admin' };
        entrarNoSistema();
    } else {
        showToast('Credenciais Inválidas', 'error');
    }
});

// REGISTRO
document.getElementById('registerForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const user = document.getElementById('regUser').value;
    const pass = document.getElementById('regPass').value;
    const role = document.getElementById('regRole').value;

    if (localStorage.getItem('pv_user_' + user)) {
        showToast('Usuário já existe!', 'error');
        return;
    }

    const novoUsuario = { user, pass, role };
    localStorage.setItem('pv_user_' + user, JSON.stringify(novoUsuario));
    
    showToast('Usuário registrado!', 'success');
    this.reset();
    carregarUsuarios();
});

function entrarNoSistema() {
    document.getElementById('telaLogin').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.body.classList.remove('flex', 'items-center', 'justify-center'); // Ajuste para o dashboard fluir
    document.getElementById('userStatus').innerText = `LOGADO COMO: ${currentUser.user.toUpperCase()} (${currentUser.role})`;
    lucide.createIcons();
}

function logout() {
    location.reload(); 
}

function carregarUsuarios() {
    const lista = document.getElementById('userList');
    lista.innerHTML = '';

    for (let i = 0; i < localStorage.length; i++) {
        const chave = localStorage.key(i);
        if (chave.startsWith('pv_user_')) {
            const dados = JSON.parse(localStorage.getItem(chave));
            
            // Só Admin pode deletar usuários
            const deleteBtn = (currentUser && currentUser.role === 'admin') 
                ? `<button class="text-red-500 font-bold hover:underline" onclick="remover('${chave}')">Excluir</button>` 
                : `<span class="text-slate-300">Bloqueado</span>`;

            const linha = `
                <tr class="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td class="p-3 font-semibold">${dados.user}</td>
                    <td class="p-3"><span class="px-2 py-1 rounded-md text-[10px] font-bold ${dados.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">${dados.role.toUpperCase()}</span></td>
                    <td class="p-3">${deleteBtn}</td>
                </tr>
            `;
            lista.innerHTML += linha;
        }
    }
}

function remover(chave) {
    if (confirm('Deseja realmente remover este acesso?')) {
        localStorage.removeItem(chave);
        showToast('Usuário removido');
        carregarUsuarios();
    }
}

// GERAÇÃO DE PDF
function gerarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("RELATÓRIO DE USUÁRIOS - PV-2026", 14, 20);
    
    const rows = [];
    for (let i = 0; i < localStorage.length; i++) {
        const chave = localStorage.key(i);
        if (chave.startsWith('pv_user_')) {
            const d = JSON.parse(localStorage.getItem(chave));
            rows.push([d.user, d.role]);
        }
    }

    doc.autoTable({
        startY: 30,
        head: [['Nome de Usuário', 'Nível de Acesso']],
        body: rows,
    });

    doc.save('usuarios_pv2026.pdf');
    showToast('PDF Gerado com sucesso!', 'success');
}
