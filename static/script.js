// ============================================================================
// AQUANET SCRIPT - V11 (PWA: MODO "NÃO PERTURBE")
// ============================================================================
console.log(">>> SCRIPT AQUANET V11 <<<");

let deferredPrompt; 

document.addEventListener('DOMContentLoaded', function() {
    
    // --- LÓGICA DE INSTALAÇÃO PWA ---
    const installCard = document.getElementById('pwa-install-card');
    const installBtn = document.getElementById('pwa-install-btn');
    const closeBtn = document.getElementById('pwa-close-btn');

    // 1. CHECAGEM INICIAL: Se já estiver rodando como APP, esconde tudo e para.
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
        if (installCard) installCard.remove();
        return; // Encerra o script PWA aqui
    }

    // 2. MEMÓRIA: Verifica se o usuário já recusou ou instalou antes
    const isDismissed = localStorage.getItem('aquanet_pwa_dismissed') === 'true';
    const isInstalled = localStorage.getItem('aquanet_pwa_installed') === 'true';

    // Se já recusou/instalou, remove o HTML para garantir que não apareça
    if ((isDismissed || isInstalled) && installCard) {
        installCard.remove();
    }

    // 3. EVENTO DO NAVEGADOR
    window.addEventListener('beforeinstallprompt', (e) => {
        // Impede que o Chrome mostre a barra nativa (nós queremos usar a nossa)
        e.preventDefault();
        deferredPrompt = e;
        
        // Só mostra o card se o usuário NUNCA tiver fechado ou instalado antes
        if (!localStorage.getItem('aquanet_pwa_dismissed') && !localStorage.getItem('aquanet_pwa_installed')) {
            if(installCard) {
                // Pequeno delay para não ser intrusivo logo no carregamento
                setTimeout(() => {
                    installCard.classList.remove('hidden');
                    installCard.classList.add('flex');
                }, 4000);
            }
        }
    });

    // Ação do Botão INSTALAR
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    localStorage.setItem('aquanet_pwa_installed', 'true');
                }
                deferredPrompt = null;
                if(installCard) installCard.remove();
            }
        });
    }

    // Ação do Botão FECHAR (X) - O MAIS IMPORTANTE AGORA
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            console.log("PWA recusado. Não mostrará mais neste navegador.");
            // Grava na memória permanente do navegador
            localStorage.setItem('aquanet_pwa_dismissed', 'true');
            // Remove o card visualmente
            if(installCard) installCard.remove();
        });
    }

    // Se a instalação ocorrer com sucesso (detectado pelo sistema)
    window.addEventListener('appinstalled', () => {
        localStorage.setItem('aquanet_pwa_installed', 'true');
        if(installCard) installCard.remove();
    });
});

// ============================================================================
// HELPER CSRF E FUNÇÕES GLOBAIS
// ============================================================================
const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
document.addEventListener('htmx:configRequest', (evt) => evt.detail.headers['X-CSRFToken'] = getCsrfToken());

document.addEventListener('click', function(event) {
    const toggleBtn = event.target.closest('.toggle-replies-btn');
    if (toggleBtn) {
        document.getElementById(toggleBtn.dataset.target)?.classList.toggle('hidden');
    }
    const replyBtn = event.target.closest('.reply-button');
    if (replyBtn) {
        event.preventDefault(); event.stopPropagation();
        const container = document.getElementById(`comment-${replyBtn.dataset.commentId}`);
        if (container) {
            document.querySelectorAll('.reply-form').forEach(f => f.classList.add('hidden'));
            const form = container.querySelector('.reply-form');
            form?.classList.remove('hidden');
            setTimeout(() => form?.querySelector('textarea')?.focus(), 100);
        }
    }
    const cancelBtn = event.target.closest('.cancel-reply-button');
    if (cancelBtn) cancelBtn.closest('.reply-form')?.classList.add('hidden');
});

document.addEventListener('submit', function(e) {
    const form = e.target;
    
    // LIKE (Sem recarregar)
    if (form.classList.contains('like-form')) {
        e.preventDefault(); e.stopImmediatePropagation();
        const btn = form.querySelector('button');
        const icon = btn.querySelector('i');
        const countSpan = btn.querySelector('.like-count-text');
        
        if (icon) {
            if (icon.classList.contains('fas')) { icon.classList.replace('fas', 'far'); btn.classList.remove('text-blue-600', 'font-bold'); }
            else { icon.classList.replace('far', 'fas'); btn.classList.add('text-blue-600', 'font-bold'); }
        }
        fetch(form.action, { method: 'POST', headers: { 'X-CSRFToken': getCsrfToken(), 'X-Requested-With': 'XMLHttpRequest' } })
            .then(res => res.json())
            .then(data => { if (data.success && countSpan) countSpan.innerText = data.like_count > 0 ? data.like_count : ''; });
        return false;
    }

    // COMENTÁRIOS E POSTAGENS (Bloqueia clique duplo, injeta sem reload e guia o foco visual)
    if (form.id === 'comment-form' || form.classList.contains('reply-form') || form.classList.contains('post-form')) {
        const isAjax = form.id === 'comment-form' || form.classList.contains('reply-form');
        const btn = form.querySelector('button[type="submit"]');
        
        if(btn) { 
            btn.dataset.original = btn.innerHTML; 
            btn.disabled = true; 
            btn.classList.add('opacity-70', 'cursor-not-allowed');
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i>Processando...'; 
        }

        if (!isAjax) return true; // Post normal de nova publicação: deixa enviar nativamente

        e.preventDefault(); e.stopImmediatePropagation();
        
        fetch(form.action, { 
            method: 'POST', 
            headers: { 'X-CSRFToken': getCsrfToken(), 'X-Requested-With': 'XMLHttpRequest' }, 
            body: new FormData(form) 
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // 1. Onde vamos injetar o HTML?
                if (data.parent_id) {
                    // É uma resposta a outro comentário
                    const parentContainer = document.getElementById(`comment-${data.parent_id}`);
                    if (parentContainer) {
                        const repliesDiv = parentContainer.querySelector('.replies-container');
                        if (repliesDiv) {
                            // Garante que o container de respostas esteja visível
                            repliesDiv.classList.remove('hidden');
                            // Injeta o novo comentário no final da lista de respostas
                            repliesDiv.insertAdjacentHTML('beforeend', data.html);
                            
                            // Deduz a localização exata do novo elemento e rola a tela suavemente até ele
                            const newElement = repliesDiv.lastElementChild;
                            if (newElement) {
                                newElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            }
                        }
                        // Esconde o formulário de resposta que acabou de ser usado
                        parentContainer.querySelector('.reply-form')?.classList.add('hidden');
                    }
                } else {
                    // É um comentário raiz (comentário direto no post)
                    const commentList = document.getElementById('comment-list');
                    const noCommentsMsg = document.getElementById('no-comments-message');
                    if (noCommentsMsg) noCommentsMsg.remove(); // Tira a mensagem de "Seja o primeiro"
                    
                    if (commentList) {
                        commentList.insertAdjacentHTML('beforeend', data.html);
                        
                        // Deduz a localização exata do novo comentário raiz e rola a tela suavemente até ele
                        const newElement = commentList.lastElementChild;
                        if (newElement) {
                            newElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                    }
                }

                // 2. Atualiza os contadores de comentários na interface
                const countElem = document.getElementById('post-comment-count');
                if (countElem) countElem.innerText = data.total_comments;

                // 3. Limpa a caixa de texto
                form.reset();

                // 4. Restaura o botão
                if (btn) {
                    btn.disabled = false;
                    btn.classList.remove('opacity-70', 'cursor-not-allowed');
                    btn.innerHTML = btn.dataset.original;
                }
            } else {
                throw new Error(data.error || 'Erro ao processar comentário');
            }
        })
        .catch(err => { 
            alert("Erro ao enviar comentário."); 
            if(btn) { 
                btn.disabled = false; 
                btn.classList.remove('opacity-70', 'cursor-not-allowed');
                btn.innerHTML = btn.dataset.original; 
            } 
        });
        
        return false;
    }
});

window.toggleMobileSearch = function() { const sb = document.getElementById('mobile-search-bar'); if(sb) { sb.classList.toggle('hidden'); sb.querySelector('input')?.focus(); }};
window.closeDrawer = function() { document.getElementById('mobile-drawer')?.classList.remove('drawer-open'); document.getElementById('mobile-drawer')?.classList.add('drawer-closed'); document.getElementById('drawer-overlay')?.classList.add('hidden'); document.body.style.overflow = ''; };
window.toggleDrawer = function() { const d = document.getElementById('mobile-drawer'); if(!d) return; if(d.classList.contains('drawer-closed')) { d.classList.remove('drawer-closed'); d.classList.add('drawer-open'); document.getElementById('drawer-overlay')?.classList.remove('hidden'); document.body.style.overflow = 'hidden'; } else { closeDrawer(); }};