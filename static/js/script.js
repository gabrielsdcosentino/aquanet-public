document.addEventListener('DOMContentLoaded', function () {

    // 1. CONFIGURAÇÃO CSRF (Segurança)
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    const tokenValue = csrfMeta ? csrfMeta.getAttribute('content') : '';

    // Injeta token em todos os forms POST
    document.querySelectorAll('form[method="POST"]').forEach(function(form) {
        if (!form.querySelector('input[name="csrf_token"]')) {
            const input = document.createElement('input');
            input.type = 'hidden'; input.name = 'csrf_token'; input.value = tokenValue;
            form.appendChild(input);
        }
    });

    // Injeta token no HTMX
    document.body.addEventListener('htmx:configRequest', function(evt) {
        evt.detail.headers['X-CSRFToken'] = tokenValue;
    });

    // 2. LÓGICA DE MOSTRAR/ESCONDER RESPOSTAS (Do seu script antigo)
    function updateReplyCounts() {
        document.querySelectorAll('.toggle-replies-btn').forEach(btn => {
            const targetId = btn.dataset.target;
            const container = document.getElementById(targetId);
            if (container) {
                const count = container.querySelectorAll('.comment-node').length;
                btn.closest('div').style.display = count > 0 ? 'block' : 'none';
            }
        });
    }
    updateReplyCounts(); // Roda ao iniciar

    // Listener para o botão "Ver Respostas"
    document.body.addEventListener('click', function(event) {
        const toggleBtn = event.target.closest('.toggle-replies-btn');
        if (toggleBtn) {
            const targetId = toggleBtn.dataset.target;
            const container = document.getElementById(targetId);
            if (container) container.classList.toggle('hidden');
        }

        // 3. LÓGICA DO BOTÃO "RESPONDER" (Abre o formzinho)
        const replyBtn = event.target.closest('.reply-button');
        if (replyBtn) {
            const commentId = replyBtn.dataset.commentId;
            const container = document.getElementById(`comment-${commentId}`);
            const form = container.querySelector('.reply-form');
            
            if (form) {
                // Fecha outros forms para não poluir
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

    // 4. SUPER LISTENER DE FORMULÁRIOS (Likes, Comentários, Anti-Duplo Clique)
    // Essa é a versão Otimizada que criamos hoje
    document.body.addEventListener('submit', function(e) {
        const form = e.target;
        const action = form.getAttribute('action') || '';

        // --- A. LIKES (Post e Comentário) ---
        if (action.includes('like')) {
            e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();

            const btn = form.querySelector('button[type="submit"]');
            const isCommentLike = action.includes('comment');
            
            // Feedback Visual Otimista
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
                headers: {'X-CSRFToken': tokenValue},
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
                        // POST LIKE
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

        // --- B. COMENTÁRIOS NOVOS E RESPOSTAS ---
        if (action.includes('comment')) {
            e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();

            const btn = form.querySelector('button[type="submit"]');
            const textarea = form.querySelector('textarea');
            
            if (btn) {
                if (btn.disabled || form.dataset.submitting === "true") return; 
                btn.dataset.originalText = btn.innerHTML;
                btn.disabled = true; form.dataset.submitting = "true";
                btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
            }

            fetch(action, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': tokenValue,
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
                
                // Verifica se é Resposta ou Comentário Principal
                const isReply = form.classList.contains('reply-form');
                
                if (isReply) {
                    // Se for resposta, o ideal é recarregar para manter a árvore correta
                    window.location.reload();
                } else {
                    // Se for comentário principal, tenta injetar sem reload
                    const commentList = document.getElementById('comment-list');
                    const noCommentsMsg = document.getElementById('no-comments-message');
                    if (noCommentsMsg) noCommentsMsg.remove();

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
                    const countSpan = document.getElementById('post-comment-count');
                    if (countSpan) {
                        let current = parseInt(countSpan.innerText) || 0;
                        countSpan.innerText = current + 1;
                    }
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

        // --- C. OUTROS FORMULÁRIOS ---
        if (form.dataset.submitting === "true") { e.preventDefault(); return; }
        const btn2 = form.querySelector('button[type="submit"]');
        if (btn2) {
            form.dataset.submitting = "true";
            const originalText = btn2.innerHTML;
            btn2.disabled = true;
            btn2.style.opacity = "0.7";
            btn2.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> Processando...';
            setTimeout(() => {
                form.dataset.submitting = "false";
                btn2.disabled = false;
                btn2.style.opacity = "1";
                btn2.innerHTML = originalText;
            }, 15000);
        }
    }, true);

    // 5. VALIDAÇÃO DE TAMANHO DE ARQUIVO (Do seu script antigo)
    var fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(function(input) {
        input.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                var fileSize = this.files[0].size; 
                var maxSize = 4.5 * 1024 * 1024; // 4.5MB
                
                if (fileSize > maxSize) {
                    alert('⚠️ O arquivo é muito grande! O limite é 4.5MB para vídeos e fotos.');
                    this.value = ""; 
                }
            }
        });
    });

    // 6. HTMX Listeners (Visual)
    document.body.addEventListener('htmx:afterSwap', function(evt) {
        closeDrawer();
        var loader = document.getElementById('page-loader');
        if(loader) {
            loader.style.width = '100%';
            setTimeout(() => {
                loader.style.opacity = '0';
                loader.style.width = '0%';
            }, 300);
        }
    });
    document.body.addEventListener('htmx:beforeRequest', function(evt) {
        var loader = document.getElementById('page-loader');
        if(loader) {
            loader.style.width = '30%';
            loader.style.opacity = '1';
        }
        closeDrawer();
    });
});

// FUNÇÕES GLOBAIS (Fora do DOMContentLoaded para onclick funcionar)
function toggleMobileSearch() {
    const searchBar = document.getElementById('mobile-search-bar');
    if (searchBar.classList.contains('hidden')) {
        searchBar.classList.remove('hidden');
        searchBar.querySelector('input').focus();
    } else {
        searchBar.classList.add('hidden');
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
    document.documentElement.style.overflow = 'visible';
}

function toggleDrawer() {
    const drawer = document.getElementById('mobile-drawer');
    const overlay = document.getElementById('drawer-overlay');
    
    if (drawer.classList.contains('drawer-closed')) {
        drawer.classList.remove('drawer-closed');
        drawer.classList.add('drawer-open');
        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; 
    } else {
        closeDrawer();
    }
}
