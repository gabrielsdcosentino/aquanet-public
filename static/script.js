// ============================================================================
// 1. CONFIGURAÇÃO GLOBAL
// ============================================================================
console.log(">>> SCRIPT AQUANET CARREGADO (FIX FINAL) <<<");

const getCsrfToken = () => {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
};

// HTMX Config
document.addEventListener('htmx:configRequest', function(evt) {
    evt.detail.headers['X-CSRFToken'] = getCsrfToken();
});

// ============================================================================
// 2. LISTENERS DE UI E INTERAÇÕES
// ============================================================================

document.addEventListener('click', function(event) {
    // A. Toggle de Ver Respostas
    const toggleBtn = event.target.closest('.toggle-replies-btn');
    if (toggleBtn) {
        const targetId = toggleBtn.dataset.target;
        const container = document.getElementById(targetId);
        if (container) container.classList.toggle('hidden');
    }

    // B. Botão de Responder (CORRIGIDO)
    const replyBtn = event.target.closest('.reply-button');
    if (replyBtn) {
        const commentId = replyBtn.dataset.commentId;
        // Procura o formulário específico dentro do mesmo container do comentário
        const container = document.getElementById(`comment-${commentId}`);
        const form = container ? container.querySelector(`.reply-form[data-parent-id="${commentId}"]`) : null;
        
        if (form) {
            // Fecha outros formulários abertos para não poluir
            document.querySelectorAll('.reply-form').forEach(f => {
                if (f !== form) f.classList.add('hidden');
            });
            
            form.classList.toggle('hidden');
            
            if (!form.classList.contains('hidden')) {
                const area = form.querySelector('textarea');
                if(area) area.focus();
            }
        } else {
            console.error("Formulário de resposta não encontrado para ID:", commentId);
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
// 3. INTERCEPTAÇÃO DE FORMULÁRIOS (LIKES E COMENTÁRIOS)
// ============================================================================
document.addEventListener('submit', function(e) {
    const form = e.target;
    
    // --- LÓGICA DE LIKE ---
    if (form.classList.contains('like-form')) {
        e.preventDefault();
        e.stopImmediatePropagation(); // Garante que o HTMX não execute
        
        const btn = form.querySelector('button[type="submit"]');
        const icon = btn.querySelector('i');
        const countSpan = btn.querySelector('.like-count-text');
        const isComment = form.action.includes('comment');
        
        // Feedback Visual Imediato (Otimista)
        const isLiked = icon && icon.classList.contains('fas');
        
        if (icon) {
            if (isLiked) {
                icon.classList.replace('fas', 'far');
                if(!isComment) {
                    icon.classList.remove('text-blue-600');
                    btn.classList.remove('text-blue-600');
                } else {
                    btn.classList.remove('text-blue-600', 'font-bold');
                    const txt = btn.querySelector('span');
                    if(txt && txt.innerText === 'Curtido') txt.innerText = 'Curtir';
                }
            } else {
                icon.classList.replace('far', 'fas');
                if(!isComment) {
                    icon.classList.add('text-blue-600');
                    btn.classList.add('text-blue-600');
                } else {
                    btn.classList.add('text-blue-600', 'font-bold');
                    const txt = btn.querySelector('span');
                    if(txt && txt.innerText === 'Curtir') txt.innerText = 'Curtido';
                }
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

    // --- LÓGICA DE COMENTÁRIO E RESPOSTA ---
    if (form.id === 'comment-form' || form.classList.contains('reply-form')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        
        const btn = form.querySelector('button[type="submit"]');
        const textarea = form.querySelector('textarea');
        
        if (!textarea.value.trim()) return;
        
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
            // Se for resposta, recarrega para manter a ordem da árvore (simples e eficaz)
            if (form.classList.contains('reply-form')) {
                window.location.reload();
            } else {
                // Se for comentário principal, injeta no topo da lista
                try {
                    const json = JSON.parse(html);
                    // Caso o back-end retorne JSON
                    window.location.reload();
                } catch {
                    // Caso o back-end retorne HTML (fragmento)
                    const list = document.getElementById('comment-list');
                    const noComments = document.getElementById('no-comments-message');
                    if (noComments) noComments.remove();
                    if (list) list.insertAdjacentHTML('afterbegin', html);
                    textarea.value = '';
                    
                    // Atualiza contador se existir
                    const counter = document.getElementById('post-comment-count');
                    if(counter) counter.innerText = parseInt(counter.innerText || 0) + 1;
                }
            }
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
// 4. UI: DRAWER, BUSCA E FILE UPLOAD
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

document.addEventListener('htmx:afterSwap', function(evt) {
    closeDrawer();
    const loader = document.getElementById('page-loader');
    if(loader) {
        loader.style.width = '100%';
        setTimeout(() => { loader.style.opacity = '0'; loader.style.width = '0%'; }, 300);
    }
});

document.addEventListener('htmx:beforeRequest', function(evt) {
    const loader = document.getElementById('page-loader');
    if(loader) { loader.style.width = '30%'; loader.style.opacity = '1'; }
    closeDrawer();
});

// ============================================================================
// 5. SERVICE WORKER E PUSH
// ============================================================================
const PUBLIC_KEY_JS = 'BD-4Z2LNfjJBfLFrSGt9Zbx9Cp8hpOCZRvnZiYpUwv3qQukHfW1wrbxU9syK5gI2Jmzd3pMgLJpLG9ITXW3agIw';

function urlBase64ToUint8ArrayJs(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('SW registrado', reg))
        .catch(err => console.log('Falha no SW:', err));
    });
}