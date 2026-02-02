// ============================================================================
// 1. CONFIGURAÇÃO GLOBAL E CSRF
// ============================================================================
console.log(">>> SCRIPT COMPLETO CARREGADO (VERSÃO FINAL AJAX) <<<");

const getCsrfToken = () => {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
};

document.addEventListener('htmx:configRequest', function(evt) {
    evt.detail.headers['X-CSRFToken'] = getCsrfToken();
});

// ============================================================================
// 2. LISTENERS DE UI (Respostas, Menus)
// ============================================================================
document.addEventListener('click', function(event) {
    // Botão de ver respostas
    const toggleBtn = event.target.closest('.toggle-replies-btn');
    if (toggleBtn) {
        const targetId = toggleBtn.dataset.target;
        const container = document.getElementById(targetId);
        if (container) container.classList.toggle('hidden');
    }

    // Botão de responder
    const replyBtn = event.target.closest('.reply-button');
    if (replyBtn) {
        const commentId = replyBtn.dataset.commentId;
        const container = document.getElementById(`comment-${commentId}`);
        const form = container ? container.querySelector('.reply-form') : null;
        if (form) {
            document.querySelectorAll('.reply-form').forEach(f => {
                if (f !== form) f.classList.add('hidden');
            });
            form.classList.remove('hidden');
            const area = form.querySelector('textarea');
            if(area) area.focus();
        }
    }
    
    // Botão cancelar resposta
    const cancelBtn = event.target.closest('.cancel-reply-button');
    if (cancelBtn) {
        const form = cancelBtn.closest('.reply-form');
        if (form) form.classList.add('hidden');
    }
});

// ============================================================================
// 3. INTERCEPTAÇÃO DE FORMULÁRIOS (O CORAÇÃO DO AJAX)
// ============================================================================
document.addEventListener('submit', function(e) {
    const form = e.target;
    
    // ------------------------------------------------------------------------
    // A. LÓGICA DE LIKE (BLINDADA)
    // ------------------------------------------------------------------------
    if (form.classList.contains('like-form')) {
        // PARAR O RECARREGAMENTO IMEDIATAMENTE
        e.preventDefault();
        e.stopPropagation();
        
        console.log(">>> Like interceptado via JS! <<<");

        const btn = form.querySelector('button[type="submit"]');
        const icon = btn.querySelector('i');
        const isCommentLike = form.action.includes('comment'); 
        const token = getCsrfToken();

        // 1. UI Otimista (Muda visualmente AGORA)
        if (icon && !isCommentLike) {
            if (icon.classList.contains('fas')) {
                // Descurtir
                icon.classList.remove('fas', 'text-blue-600');
                icon.classList.add('far');
                btn.classList.remove('text-blue-600', 'font-bold');
            } else {
                // Curtir
                icon.classList.remove('far');
                icon.classList.add('fas', 'text-blue-600');
                btn.classList.add('text-blue-600', 'font-bold');
            }
        } else if (isCommentLike) {
            const spanText = btn.querySelector('span');
            if(spanText) {
                if(spanText.innerText === 'Curtido') {
                    spanText.innerText = 'Curtir';
                    btn.classList.remove('text-blue-600', 'font-bold');
                } else {
                    spanText.innerText = 'Curtido';
                    btn.classList.add('text-blue-600', 'font-bold');
                }
            }
        }

        // 2. Envia para o servidor silenciosamente
        fetch(form.action, {
            method: 'POST',
            headers: { 
                'X-CSRFToken': token, 
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            },
            body: new FormData(form)
        })
        .then(response => {
            if (response.redirected) { window.location.reload(); return null; }
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                return response.json();
            }
            return null;
        })
        .then(data => {
            if (!data) return;

            if (data.success) {
                // Atualiza Contador com dados reais
                let countSpan = btn.querySelector('.like-count-text');
                
                if (data.like_count > 0) {
                    if (!countSpan) {
                        countSpan = document.createElement('span');
                        countSpan.className = 'like-count-text font-bold ml-1';
                        if(isCommentLike) countSpan.classList.add('text-xs');
                        btn.appendChild(countSpan);
                    }
                    countSpan.innerText = data.like_count;
                    countSpan.classList.remove('hidden');
                } else {
                    if (countSpan) countSpan.remove();
                }

                // Sincronização final do ícone
                if (icon && !isCommentLike) {
                    if (data.liked) {
                        icon.classList.remove('far');
                        icon.classList.add('fas', 'text-blue-600');
                        btn.classList.add('text-blue-600', 'font-bold');
                    } else {
                        icon.classList.remove('fas', 'text-blue-600');
                        icon.classList.add('far');
                        btn.classList.remove('text-blue-600', 'font-bold');
                    }
                }
            }
        })
        .catch(err => console.error("Erro no like:", err));
        
        return false; // Garante que não recarrega
    }

    // ------------------------------------------------------------------------
    // B. LÓGICA DE COMENTÁRIOS
    // ------------------------------------------------------------------------
    if (form.action.includes('api') && form.action.includes('comment')) {
        e.preventDefault(); e.stopPropagation();
        
        const btn = form.querySelector('button[type="submit"]');
        const textarea = form.querySelector('textarea');
        const token = getCsrfToken();
        
        if (btn) {
            if (btn.disabled) return; 
            btn.dataset.originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
        }

        fetch(form.action, {
            method: 'POST',
            headers: { 'X-CSRFToken': token, 'X-Requested-With': 'XMLHttpRequest' },
            body: new FormData(form)
        })
        .then(response => {
            if (response.redirected) { window.location.href = response.url; return null; }
            return response.text(); 
        })
        .then(data => {
            if (!data) return;
            const isReply = form.classList.contains('reply-form');
            if (isReply) {
                window.location.reload();
            } else {
                const commentList = document.getElementById('comment-list');
                if (commentList) {
                    try {
                        const json = JSON.parse(data);
                        if (json.html) commentList.insertAdjacentHTML('afterbegin', json.html);
                        else window.location.reload();
                    } catch (e) {
                        commentList.insertAdjacentHTML('afterbegin', data);
                    }
                }
                if (textarea) textarea.value = '';
            }
        })
        .catch(err => console.error(err))
        .finally(() => {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = btn.dataset.originalText;
            }
        });
        return false; 
    }
}, true); // UseCapture=true ajuda a pegar eventos antes de outros scripts

// ============================================================================
// 4. UTILITÁRIOS E HTMX
// ============================================================================
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
// 5. FUNÇÕES DE UI (DRAWER, BUSCA)
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

// ============================================================================
// 6. NOTIFICAÇÕES PUSH E SERVICE WORKER
// ============================================================================
const PUBLIC_KEY = 'BD-4Z2LNfjJBfLFrSGt9Zbx9Cp8hpOCZRvnZiYpUwv3qQukHfW1wrbxU9syK5gI2Jmzd3pMgLJpLG9ITXW3agIw';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Verifica status e pinta o sino
async function checkSubscriptionStatus() {
    if (!('serviceWorker' in navigator)) return;
    
    try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        const bellIcon = document.getElementById('notification-bell-icon');
        const btnSubscribe = document.getElementById('btn-subscribe-push'); 
        
        if (sub) {
            // Inscrito: Sino Amarelo/Cheio
            if(bellIcon) {
                bellIcon.classList.remove('far', 'fa-bell-slash');
                bellIcon.classList.add('fas', 'fa-bell', 'text-yellow-500');
            }
            if(btnSubscribe) btnSubscribe.style.display = 'none';
        } else {
            // Não Inscrito: Sino Contorno
            if(bellIcon) {
                bellIcon.classList.remove('fas', 'fa-bell', 'text-yellow-500');
                bellIcon.classList.add('far', 'fa-bell');
            }
            if(btnSubscribe) btnSubscribe.style.display = 'flex';
        }
    } catch (e) {
        console.error('Erro checando status push:', e);
    }
}

// Inicialização do SW
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
        .then(reg => {
            console.log('SW registrado', reg);
            checkSubscriptionStatus();
        })
        .catch(err => console.log('Falha no SW:', err));
    });
}

// Função de Inscrição
async function subscribeUser() {
    if (!('serviceWorker' in navigator)) return alert('Seu navegador não suporta notificações.');
    
    try {
        const reg = await navigator.serviceWorker.ready;
        
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            alert('Você precisa permitir as notificações no navegador!');
            return;
        }

        const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY)
        });

        // Salva no Backend
        const response = await fetch('/api/save-subscription', {
            method: 'POST',
            body: JSON.stringify(sub),
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() }
        });

        if (response.ok) {
            alert('Notificações ativadas! 🔔');
            checkSubscriptionStatus();
        } else {
            alert('Erro ao salvar inscrição no servidor.');
        }

    } catch (e) {
        console.error("Erro no subscribe:", e);
        // Se já existe, apenas atualiza visual
        checkSubscriptionStatus();
    }
}