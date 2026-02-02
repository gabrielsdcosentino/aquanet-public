// 1. CONFIGURAÇÃO GLOBAL E CSRF
const getCsrfToken = () => {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
};

document.addEventListener('htmx:configRequest', function(evt) {
    evt.detail.headers['X-CSRFToken'] = getCsrfToken();
});

// 2. LISTENERS GLOBAIS
document.addEventListener('click', function(event) {
    const toggleBtn = event.target.closest('.toggle-replies-btn');
    if (toggleBtn) {
        const targetId = toggleBtn.dataset.target;
        const container = document.getElementById(targetId);
        if (container) container.classList.toggle('hidden');
    }

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
    
    const cancelBtn = event.target.closest('.cancel-reply-button');
    if (cancelBtn) {
        const form = cancelBtn.closest('.reply-form');
        if (form) form.classList.add('hidden');
    }
});

// 3. INTERCEPTAÇÃO DE LIKES E COMENTÁRIOS
document.addEventListener('submit', function(e) {
    const form = e.target;
    const action = form.getAttribute('action') || '';

    // A. LIKES
    if (action.includes('like')) {
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        
        const btn = form.querySelector('button[type="submit"]');
        const isCommentLike = action.includes('comment');
        const token = getCsrfToken();

        // --- 1. UI Otimista (Muda o ícone imediatamente antes do servidor responder) ---
        // Isso dá sensação de velocidade instantânea para o usuário
        const icon = btn.querySelector('i');
        if (icon && !isCommentLike) {
            if (icon.classList.contains('fas')) {
                // Se estava preenchido (curtido), desmarca visualmente
                icon.classList.remove('fas', 'text-blue-600');
                icon.classList.add('far');
            } else {
                // Se estava vazio, marca visualmente
                icon.classList.remove('far');
                icon.classList.add('fas', 'text-blue-600');
            }
        }

        // --- 2. Requisição ao Servidor ---
        fetch(action, {
            method: 'POST',
            headers: { 
                'X-CSRFToken': token, 
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json' 
            },
            body: new FormData(form)
        })
        .then(response => {
            // Se o servidor redirecionar (ex: sessão expirou e foi para login), recarrega a página
            if (response.redirected) {
                window.location.reload();
                return null;
            }
            // Garante que a resposta é JSON antes de tentar ler
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                return response.json();
            } else {
                // Se não for JSON (ex: erro 500 do servidor mostrando HTML), lança erro
                throw new Error("Resposta do servidor não foi JSON");
            }
        })
        .then(data => {
            if (!data) return; // Se foi redirecionamento, paramos aqui

            if (data.success && data.liked !== undefined) {
                if (isCommentLike) {
                    // Lógica para Likes de Comentários
                    const text = data.liked ? 'Curtido' : 'Curtir';
                    const colorClass = data.liked ? 'text-blue-600 font-bold' : '';
                    let html = `<span class="mr-1">${text}</span>`;
                    
                    if (data.like_count > 0) {
                        html += `<i class="fas fa-thumbs-up text-[10px] mr-1"></i><span class="like-count-text">${data.like_count}</span>`;
                    }
                    
                    btn.innerHTML = html;
                    btn.className = `hover:text-blue-600 transition-colors flex items-center ${colorClass}`;
                
                } else {
                    // Lógica para Likes de Posts (Mais robusta)
                    
                    // 1. Atualiza o ícone com a "verdade" do servidor
                    if (icon) {
                        // Remove classes antigas para garantir
                        icon.classList.remove('far', 'fas', 'text-blue-600');
                        if (data.liked) {
                            icon.classList.add('fas', 'fa-thumbs-up', 'text-lg', 'text-blue-600');
                            btn.classList.add('text-blue-600');
                        } else {
                            icon.classList.add('far', 'fa-thumbs-up', 'text-lg');
                            btn.classList.remove('text-blue-600');
                        }
                    }

                    // 2. Atualiza o contador sem destruir o botão inteiro
                    let countSpan = btn.querySelector('.like-count-text');
                    
                    if (data.like_count > 0) {
                        if (!countSpan) {
                            // Se não existe contador, cria um
                            countSpan = document.createElement('span');
                            countSpan.className = 'like-count-text font-bold ml-1';
                            btn.appendChild(countSpan);
                        }
                        countSpan.innerText = data.like_count;
                    } else {
                        // Se o contador é zero, remove o span se ele existir
                        if (countSpan) countSpan.remove();
                    }
                }
            }
        })
        .catch(err => {
            console.error("Erro no Like:", err);
            // Opcional: Reverter o ícone se der erro (desfaz a UI otimista)
            if (icon && !isCommentLike) {
                 if (icon.classList.contains('fas')) {
                     icon.classList.remove('fas', 'text-blue-600'); icon.classList.add('far');
                 } else {
                     icon.classList.remove('far'); icon.classList.add('fas', 'text-blue-600');
                 }
            }
        });
        
        return false;
    }

    // B. COMENTÁRIOS
    if (action.includes('comment')) {
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        const btn = form.querySelector('button[type="submit"]');
        const textarea = form.querySelector('textarea');
        const token = getCsrfToken();
        
        if (btn) {
            if (btn.disabled || form.dataset.submitting === "true") return; 
            btn.dataset.originalText = btn.innerHTML;
            btn.disabled = true; form.dataset.submitting = "true";
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
        }

        fetch(action, {
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
                        else if (json.success) window.location.reload();
                    } catch (e) {
                        commentList.insertAdjacentHTML('afterbegin', data);
                    }
                }
                if (textarea) textarea.value = '';
                if (btn) {
                    btn.disabled = false; form.dataset.submitting = "false";
                    btn.innerHTML = btn.dataset.originalText;
                }
            }
        })
        .catch(err => {
            console.error(err);
            if (btn) {
                btn.disabled = false; form.dataset.submitting = "false";
                btn.innerHTML = btn.dataset.originalText;
            }
        });
        return false; 
    }
}, true);

// 4. VALIDAÇÃO E HTMX
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

// 5. FUNÇÕES DE MENU
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

// 6. PWA & NOTIFICAÇÕES (ATUALIZADO E CORRIGIDO)
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

// Função NOVA: Verifica se já é inscrito para pintar o sino
async function checkSubscriptionStatus() {
    if (!('serviceWorker' in navigator)) return;
    
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    
    // Tenta achar o ícone pelo ID
    const bellIcon = document.getElementById('notification-bell-icon');
    
    if (sub) {
        console.log("Usuário já inscrito - Pintando sino");
        if(bellIcon) {
            bellIcon.classList.remove('far', 'fa-bell-slash');
            bellIcon.classList.add('fas', 'fa-bell', 'text-yellow-500'); // Amarelo/Preenchido
        }
    } else {
        console.log("Usuário não inscrito");
        if(bellIcon) {
            bellIcon.classList.remove('fas', 'fa-bell', 'text-yellow-500');
            bellIcon.classList.add('far', 'fa-bell'); // Normal
        }
    }
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
        .then(reg => {
            console.log('SW registrado', reg);
            // Chama a verificação assim que carregar
            checkSubscriptionStatus();
        })
        .catch(err => console.log('Erro SW', err));
    });
}

async function subscribeUser() {
    if (!('serviceWorker' in navigator)) return alert('Seu navegador não suporta notificações.');
    
    try {
        const reg = await navigator.serviceWorker.ready;
        
        // Solicita permissão
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            alert('Você precisa permitir as notificações no navegador!');
            return;
        }

        // Inscreve no navegador
        const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY)
        });

        // Salva no Banco de Dados
        const response = await fetch('/api/save-subscription', {
            method: 'POST',
            body: JSON.stringify(sub),
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() }
        });

        if (response.ok) {
            alert('Notificações ativadas com sucesso! 🔔');
            // Atualiza o visual do sino imediatamente
            checkSubscriptionStatus();
        } else {
            alert('Erro ao salvar no servidor.');
        }

    } catch (e) {
        console.error("Erro no subscribe:", e);
        // Se o erro for "subscription already exists", a gente ignora e só atualiza o visual
        checkSubscriptionStatus();
    }
}