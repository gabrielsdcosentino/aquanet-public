// ============================================================================
// 1. CONFIGURAÇÃO GLOBAL
// ============================================================================
console.log(">>> SCRIPT AQUANET CARREGADO (VERSÃO ONCLICK) <<<");

const getCsrfToken = () => {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
};

// HTMX Config: Adiciona o Token CSRF em todas as requisições HTMX
document.addEventListener('htmx:configRequest', function(evt) {
    evt.detail.headers['X-CSRFToken'] = getCsrfToken();
});

// ============================================================================
// 2. FUNÇÕES GLOBAIS (Chamadas diretamente do HTML)
// ============================================================================

// NOVA FUNÇÃO DE RESPONDER - Chamada via onclick="" no HTML
window.toggleReply = function(commentId) {
    // console.log("Tentando responder ao ID:", commentId);

    const container = document.getElementById(`comment-${commentId}`);
    if (!container) {
        alert('Erro: Container do comentário ' + commentId + ' não encontrado.');
        return;
    }

    const form = container.querySelector('.reply-form');
    if (!form) {
        alert('Erro: Formulário de resposta não encontrado dentro do comentário.');
        return;
    }

    // Verifica se já está aberto
    const isHidden = form.classList.contains('hidden');

    // 1. Fecha TODOS os outros formulários abertos para limpar a tela
    document.querySelectorAll('.reply-form').forEach(f => {
        f.classList.add('hidden');
    });

    // 2. Se o que clicamos estava fechado, agora abrimos
    if (isHidden) {
        form.classList.remove('hidden');
        
        // Tenta focar no campo de texto
        setTimeout(() => {
            const area = form.querySelector('textarea');
            if(area) area.focus();
        }, 50);
    }
};

// ============================================================================
// 3. LISTENERS GERAIS
// ============================================================================

document.addEventListener('click', function(event) {
    // A. Toggle de "Ver Respostas"
    const toggleBtn = event.target.closest('.toggle-replies-btn');
    if (toggleBtn) {
        const targetId = toggleBtn.dataset.target;
        const container = document.getElementById(targetId);
        if (container) container.classList.toggle('hidden');
    }

    // B. Botão Cancelar Resposta
    const cancelBtn = event.target.closest('.cancel-reply-button');
    if (cancelBtn) {
        const form = cancelBtn.closest('.reply-form');
        if (form) form.classList.add('hidden');
    }
});

// ============================================================================
// 4. INTERCEPTAÇÃO DE FORMULÁRIOS
// ============================================================================
document.addEventListener('submit', function(e) {
    const form = e.target;
    
    // --- LÓGICA DE LIKE ---
    if (form.classList.contains('like-form')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        
        const btn = form.querySelector('button[type="submit"]');
        const icon = btn.querySelector('i');
        const countSpan = btn.querySelector('.like-count-text');
        
        // Feedback Visual Instantâneo
        if (icon) {
            if (icon.classList.contains('fas')) { // Descurtir
                icon.classList.replace('fas', 'far');
                btn.classList.remove('text-blue-600', 'font-bold');
            } else { // Curtir
                icon.classList.replace('far', 'fas');
                btn.classList.add('text-blue-600', 'font-bold');
            }
        }

        fetch(form.action, {
            method: 'POST',
            headers: { 
                'X-CSRFToken': getCsrfToken(), 
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success && countSpan) {
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
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
        }

        fetch(form.action, {
            method: 'POST',
            headers: { 
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: new FormData(form)
        })
        .then(res => res.text())
        .then(html => {
            window.location.reload(); 
        })
        .catch(err => console.error(err))
        .finally(() => {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = btn.dataset.original;
            }
        });
        return false;
    }
});

// ============================================================================
// 5. UI: MENU, BUSCA E UPLOAD
// ============================================================================
function toggleMobileSearch() {
    const searchBar = document.getElementById('mobile-search-bar');
    if (searchBar) {
        searchBar.classList.toggle('hidden');
        if (!searchBar.classList.contains('hidden')) searchBar.querySelector('input').focus();
    }
}

function closeDrawer() {
    const drawer = document.getElementById('mobile-drawer');
    const overlay = document.getElementById('drawer-overlay');
    if (drawer) {
        drawer.classList.remove('drawer-open');
        drawer.classList.add('drawer-closed');
    }
    if (overlay) overlay.classList.add('hidden');
    document.body.style.overflow = 'visible';
}

function toggleDrawer() {
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
}

document.addEventListener('change', function(e) {
    if (e.target.tagName === 'INPUT' && e.target.type === 'file') {
        const file = e.target.files[0];
        if (file && file.size > 4.5 * 1024 * 1024) {
            alert('⚠️ O arquivo é muito grande! O limite é 4.5MB.');
            e.target.value = ""; 
        }
    }
});

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
