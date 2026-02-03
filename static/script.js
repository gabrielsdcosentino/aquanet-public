// ============================================================================
// AQUANET SCRIPT - VERSÃO CORRIGIDA E REFORÇADA (V4)
// ============================================================================
console.log(">>> SCRIPT AQUANET INICIADO V4 <<<");

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM Completamente Carregado. Iniciando listeners...");
});

// Helper para pegar o token CSRF
const getCsrfToken = () => {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
};

// Configuração HTMX
document.addEventListener('htmx:configRequest', function(evt) {
    evt.detail.headers['X-CSRFToken'] = getCsrfToken();
});

// ============================================================================
// 1. GERENCIADOR DE CLIQUES (UI e Interações)
// ============================================================================
document.addEventListener('click', function(event) {
    
    // --- A. TOGGLE DE RESPOSTAS (Ver X respostas) ---
    const toggleBtn = event.target.closest('.toggle-replies-btn');
    if (toggleBtn) {
        const targetId = toggleBtn.dataset.target;
        const container = document.getElementById(targetId);
        if (container) {
            container.classList.toggle('hidden');
            console.log(`Toggle respostas: ${targetId}`);
        }
    }

    // --- B. BOTÃO RESPONDER (Abre o formulário) ---
    const replyBtn = event.target.closest('.reply-button');
    if (replyBtn) {
        event.preventDefault();
        event.stopPropagation();

        const commentId = replyBtn.dataset.commentId;
        console.log(`Botão Responder Clicado. ID: ${commentId}`);

        // Procura o container principal do comentário
        const container = document.getElementById(`comment-${commentId}`);
        
        if (container) {
            // Procura o formulário DENTRO desse container
            const form = container.querySelector('.reply-form');
            if (form) {
                // Fecha outros formulários abertos para limpar a tela
                document.querySelectorAll('.reply-form').forEach(f => f.classList.add('hidden'));
                
                // Abre o formulário deste comentário
                form.classList.remove('hidden');
                
                // Foca no campo de texto
                const area = form.querySelector('textarea');
                if (area) setTimeout(() => area.focus(), 100);
            } else {
                console.error("Erro: Formulário .reply-form não encontrado dentro do container.");
            }
        } else {
            console.error(`Erro: Container #comment-${commentId} não encontrado.`);
        }
    }
    
    // --- C. BOTÃO CANCELAR RESPOSTA ---
    const cancelBtn = event.target.closest('.cancel-reply-button');
    if (cancelBtn) {
        const form = cancelBtn.closest('.reply-form');
        if (form) form.classList.add('hidden');
    }
});

// ============================================================================
// 2. INTERCEPTAÇÃO DE FORMULÁRIOS (LIKES E COMENTÁRIOS)
// ============================================================================
document.addEventListener('submit', function(e) {
    const form = e.target;
    
    // --- LÓGICA DE LIKE (BLINDAGEM CONTRA RELOAD) ---
    if (form.classList.contains('like-form')) {
        e.preventDefault(); // PARE! Não recarregue a página.
        e.stopImmediatePropagation();
        
        console.log("Like interceptado via JS");

        const btn = form.querySelector('button[type="submit"]');
        const icon = btn.querySelector('i');
        const countSpan = btn.querySelector('.like-count-text');
        
        // Feedback Visual Imediato (Troca o ícone na hora)
        if (icon) {
            if (icon.classList.contains('fas')) { 
                icon.classList.replace('fas', 'far'); // Descurtiu
                btn.classList.remove('text-blue-600', 'font-bold');
            } else { 
                icon.classList.replace('far', 'fas'); // Curtiu
                btn.classList.add('text-blue-600', 'font-bold');
            }
        }

        // Envia para o servidor em segundo plano
        fetch(form.action, {
            method: 'POST',
            headers: { 
                'X-CSRFToken': getCsrfToken(), 
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success && countSpan) {
                // Atualiza o número se o servidor confirmar
                countSpan.innerText = data.like_count > 0 ? data.like_count : '';
            }
        })
        .catch(err => console.error("Erro no like:", err));
        
        return false;
    }

    // --- LÓGICA DE ENVIO DE COMENTÁRIO ---
    if (form.id === 'comment-form' || form.classList.contains('reply-form')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        
        const btn = form.querySelector('button[type="submit"]');
        if (btn) {
            btn.dataset.original = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Enviando...';
        }

        fetch(form.action, {
            method: 'POST',
            headers: { 
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: new FormData(form)
        })
        .then(res => {
            if (res.ok) {
                window.location.reload(); // Recarrega para mostrar o novo comentário
            } else {
                throw new Error('Erro na resposta do servidor');
            }
        })
        .catch(err => {
            console.error(err);
            alert("Erro ao enviar comentário. Tente novamente.");
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = btn.dataset.original;
            }
        });
        
        return false;
    }
});

// ============================================================================
// 3. UI GLOBAIS (MENU, BUSCA, IMAGENS)
// ============================================================================

window.toggleMobileSearch = function() {
    const searchBar = document.getElementById('mobile-search-bar');
    if (searchBar) {
        searchBar.classList.toggle('hidden');
        if (!searchBar.classList.contains('hidden')) {
            const input = searchBar.querySelector('input');
            if(input) input.focus();
        }
    }
};

window.closeDrawer = function() {
    const drawer = document.getElementById('mobile-drawer');
    const overlay = document.getElementById('drawer-overlay');
    if (drawer) {
        drawer.classList.remove('drawer-open');
        drawer.classList.add('drawer-closed');
    }
    if (overlay) overlay.classList.add('hidden');
    document.body.style.overflow = 'visible';
};

window.toggleDrawer = function() {
    const drawer = document.getElementById('mobile-drawer');
    const overlay = document.getElementById('drawer-overlay');
    if (!drawer) return;
    
    if (drawer.classList.contains('drawer-closed')) {
        drawer.classList.remove('drawer-closed');
        drawer.classList.add('drawer-open');
        if (overlay) overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; 
    } else {
        closeDrawer();
    }
};

// Loading bar do HTMX
document.addEventListener('htmx:beforeRequest', function(evt) {
    const loader = document.getElementById('page-loader');
    if(loader) { loader.style.width = '30%'; loader.style.opacity = '1'; }
    closeDrawer();
});
document.addEventListener('htmx:afterSwap', function(evt) {
    const loader = document.getElementById('page-loader');
    if(loader) {
        loader.style.width = '100%';
        setTimeout(() => { loader.style.opacity = '0'; loader.style.width = '0%'; }, 300);
    }
});