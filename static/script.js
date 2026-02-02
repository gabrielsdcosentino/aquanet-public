// ============================================================================
// 1. CONFIGURAÇÃO GLOBAL
// ============================================================================
console.log(">>> SCRIPT AQUANET CARREGADO (VERSÃO FINAL COMPLETA) <<<");

const getCsrfToken = () => {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
};

// HTMX Config: Adiciona o Token CSRF em todas as requisições HTMX
document.addEventListener('htmx:configRequest', function(evt) {
    evt.detail.headers['X-CSRFToken'] = getCsrfToken();
});

// ============================================================================
// 2. LISTENERS DE UI E INTERAÇÕES
// ============================================================================

document.addEventListener('click', function(event) {
    
    // A. Toggle de Ver Respostas (Ex: "Ver 3 respostas")
    const toggleBtn = event.target.closest('.toggle-replies-btn');
    if (toggleBtn) {
        const targetId = toggleBtn.dataset.target;
        const container = document.getElementById(targetId);
        if (container) container.classList.toggle('hidden');
    }

    // B. Botão de Responder (LÓGICA CORRIGIDA)
    const replyBtn = event.target.closest('.reply-button');
    if (replyBtn) {
        event.preventDefault(); // Impede comportamento padrão
        event.stopPropagation(); // Evita conflitos

        const commentId = replyBtn.dataset.commentId;
        const container = document.getElementById(`comment-${commentId}`);
        
        if (container) {
            const form = container.querySelector('.reply-form');
            if (form) {
                // Se o formulário atual já está aberto?
                const isHidden = form.classList.contains('hidden');

                // 1. Fecha TODOS os formulários primeiro para limpar a tela
                document.querySelectorAll('.reply-form').forEach(f => {
                    f.classList.add('hidden');
                });

                // 2. Se estava fechado, abre este específico
                if (isHidden) {
                    form.classList.remove('hidden');
                    const area = form.querySelector('textarea');
                    if (area) setTimeout(() => area.focus(), 50); // Foca no campo
                }
            }
        }
    }
    
    // C. Botão Cancelar Resposta
    const cancelBtn = event.target.closest('.cancel-reply-button');
    if (cancelBtn) {
        const form = cancelBtn.closest('.reply-form');
        if (form) form.classList.add('hidden');
    }
});

// ============================================================================
// 3. INTERCEPTAÇÃO DE FORMULÁRIOS (A PARTE CRÍTICA)
// ============================================================================
document.addEventListener('submit', function(e) {
    const form = e.target;
    
    // --- LÓGICA DE LIKE ---
    if (form.classList.contains('like-form')) {
        e.preventDefault();
        e.stopImmediatePropagation(); // IMPEDE O HTMX DE RECARREGAR A PÁGINA
        
        const btn = form.querySelector('button[type="submit"]');
        const icon = btn.querySelector('i');
        const countSpan = btn.querySelector('.like-count-text');
        
        // Efeito Visual Instantâneo (Feedback Otimista)
        if (icon) {
            if (icon.classList.contains('fas')) { // Se já curtiu -> Descurtir
                icon.classList.replace('fas', 'far');
                btn.classList.remove('text-blue-600', 'font-bold');
            } else { // Se não curtiu -> Curtir
                icon.classList.replace('far', 'fas');
                btn.classList.add('text-blue-600', 'font-bold');
            }
        }

        // Envia para o servidor em segundo plano
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
            // Atualiza o número real de likes vindo do servidor
            if (data.success && countSpan) {
                countSpan.innerText = data.like_count > 0 ? data.like_count : '';
            }
        })
        .catch(err => console.error("Erro no like:", err));
        
        return false;
    }

    // --- LÓGICA DE COMENTÁRIOS E RESPOSTAS ---
    if (form.id === 'comment-form' || form.classList.contains('reply-form')) {
        e.preventDefault();
        e.stopImmediatePropagation(); // IMPEDE O HTMX DE RECARREGAR A PÁGINA
        
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
            // Recarrega a página para mostrar o comentário na ordem certa
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
// 4. UI: MENU DRAWER, BUSCA E ARQUIVOS
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

// Validação de tamanho de arquivo (Upload)
document.addEventListener('change', function(e) {
    if (e.target.tagName === 'INPUT' && e.target.type === 'file') {
        const file = e.target.files[0];
        if (file && file.size > 4.5 * 1024 * 1024) {
            alert('⚠️ O arquivo é muito grande! O limite é 4.5MB.');
            e.target.value = ""; 
        }
    }
});

// Barra de Carregamento do HTMX (Loading azul no topo)
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

// ============================================================================
// 5. SERVICE WORKER (NOTIFICAÇÕES PUSH)
// ============================================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('SW registrado', reg))
        .catch(err => console.log('Falha no SW:', err));
    });
}
