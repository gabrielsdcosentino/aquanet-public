// 1. CONFIGURAÇÃO GLOBAL E CSRF
// Usamos uma função para pegar o token sempre atualizado
const getCsrfToken = () => {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
};

// Injeta token no HTMX (Persiste mesmo após trocas de página)
document.addEventListener('htmx:configRequest', function(evt) {
    evt.detail.headers['X-CSRFToken'] = getCsrfToken();
});

// 2. LISTENERS GLOBAIS (Usando 'document' para não perder os eventos com HTMX)
document.addEventListener('click', function(event) {
    // Botão de Mostrar/Esconder Respostas
    const toggleBtn = event.target.closest('.toggle-replies-btn');
    if (toggleBtn) {
        const targetId = toggleBtn.dataset.target;
        const container = document.getElementById(targetId);
        if (container) container.classList.toggle('hidden');
    }

    // Botão de Responder Comentário
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
    
    // Botão Cancelar Resposta
    const cancelBtn = event.target.closest('.cancel-reply-button');
    if (cancelBtn) {
        const form = cancelBtn.closest('.reply-form');
        if (form) form.classList.add('hidden');
    }
});

// 3. INTERCEPTAÇÃO DE LIKES E COMENTÁRIOS (Evita o pulo para o topo)
document.addEventListener('submit', function(e) {
    const form = e.target;
    const action = form.getAttribute('action') || '';

    // --- A. LIKES ---
    if (action.includes('like')) {
        // Bloqueia o comportamento padrão do navegador e do HTMX
        e.preventDefault(); 
        e.stopPropagation(); 
        e.stopImmediatePropagation();

        const btn = form.querySelector('button[type="submit"]');
        const isCommentLike = action.includes('comment');
        const token = getCsrfToken();
        
        // Visual Otimista
        if (isCommentLike) {
            const textSpan = btn.querySelector('span');
            if (textSpan) {
                if (textSpan.innerText.trim() === 'Curtido') {
                    textSpan.innerText = 'Curtir';
                    btn.classList.remove('text-blue-600', 'font-bold');
                } else {
                    textSpan.innerText = 'Curtido';
                    btn.classList.add('text-blue-600', 'font-bold');
                }
            }
        } else {
            const icon = btn.querySelector('i');
            if (icon) {
                 if (icon.classList.contains('fas') || icon.classList.contains('fa-solid')) {
                    icon.className = 'far fa-thumbs-up text-lg';
                 } else {
                    icon.className = 'fas fa-thumbs-up text-lg text-blue-600';
                 }
            }
        }
        
        fetch(action, {
            method: 'POST',
            headers: {
                'X-CSRFToken': token,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: new FormData(form)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.liked !== undefined) {
                if (isCommentLike) {
                    const text = data.liked ? 'Curtido' : 'Curtir';
                    const colorClass = data.liked ? 'text-blue-600 font-bold' : '';
                    let html = `<span class="mr-1">${text}</span>`;
                    if (data.like_count > 0) {
                        html += `<i class="fas fa-thumbs-up text-[10px] mr-1"></i><span class="like-count-text">${data.like_count}</span>`;
                    }
                    btn.innerHTML = html;
                    btn.className = `hover:text-blue-600 transition-colors flex items-center ${colorClass}`;
                } else {
                    const icon = btn.querySelector('i');
                    if (btn) {
                        Array.from(btn.childNodes).forEach(node => {
                            if (node !== icon && node.nodeType === 3) node.remove(); 
                            if (node.classList && node.classList.contains('like-count-text')) node.remove();
                        });
                        const countSpan = document.createElement('span');
                        countSpan.className = 'like-count-text font-bold ml-1'; 
                        countSpan.innerText = data.like_count;
                        btn.appendChild(countSpan);
                    }
                    if (icon) {
                        if (data.liked) icon.className = 'fas fa-thumbs-up text-lg text-blue-600';
                        else icon.className = 'far fa-thumbs-up text-lg';
                    }
                    if (data.liked) btn.classList.add('text-blue-600');
                    else btn.classList.remove('text-blue-600');
                }
            }
        })
        .catch(console.error);
        return false;
    }

    // --- B. COMENTÁRIOS ---
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
            headers: {
                'X-CSRFToken': token,
                'X-Requested-With': 'XMLHttpRequest'
            },
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

// 4. VALIDAÇÃO DE ARQUIVO E LOADER HTMX
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

// 5. FUNÇÕES GLOBAIS (MENU)
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
