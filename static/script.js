// ============================================================================
// AQUANET SCRIPT - V12 (PWA & INJEÇÃO COM SCROLL FOCADO NO CENTRO)
// ============================================================================
console.log(">>> SCRIPT AQUANET V12 <<<");

let deferredPrompt; 

document.addEventListener('DOMContentLoaded', function() {
    // --- LÓGICA DE INSTALAÇÃO PWA ---
    const installCard = document.getElementById('pwa-install-card');
    const installBtn = document.getElementById('pwa-install-btn');
    const closeBtn = document.getElementById('pwa-close-btn');

    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
        if (installCard) installCard.remove();
        return;
    }

    const isDismissed = localStorage.getItem('aquanet_pwa_dismissed') === 'true';
    const isInstalled = localStorage.getItem('aquanet_pwa_installed') === 'true';

    if ((isDismissed || isInstalled) && installCard) {
        installCard.remove();
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        if (!localStorage.getItem('aquanet_pwa_dismissed') && !localStorage.getItem('aquanet_pwa_installed')) {
            if(installCard) {
                setTimeout(() => {
                    installCard.classList.remove('hidden');
                    installCard.classList.add('flex');
                }, 4000);
            }
        }
    });

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

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            console.log("PWA recusado.");
            localStorage.setItem('aquanet_pwa_dismissed', 'true');
            if(installCard) installCard.remove();
        });
    }

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

    // COMENTÁRIOS E POSTAGENS (Injeta e guia a visão com precisão mecânica)
    if (form.id === 'comment-form' || form.classList.contains('reply-form') || form.classList.contains('post-form')) {
        const isAjax = form.id === 'comment-form' || form.classList.contains('reply-form');
        const btn = form.querySelector('button[type="submit"]');
        
        if(btn) { 
            btn.dataset.original = btn.innerHTML; 
            btn.disabled = true; 
            btn.classList.add('opacity-70', 'cursor-not-allowed');
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i>Processando...'; 
        }

        if (!isAjax) return true;

        e.preventDefault(); e.stopImmediatePropagation();
        
        fetch(form.action, { 
            method: 'POST', 
            headers: { 'X-CSRFToken': getCsrfToken(), 'X-Requested-With': 'XMLHttpRequest' }, 
            body: new FormData(form) 
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                if (data.parent_id) {
                    const parentContainer = document.getElementById(`comment-${data.parent_id}`);
                    if (parentContainer) {
                        const repliesDiv = parentContainer.querySelector('.replies-container');
                        if (repliesDiv) {
                            repliesDiv.classList.remove('hidden');
                            repliesDiv.insertAdjacentHTML('beforeend', data.html);
                            
                            // Dedução de Watson: Esperar 100ms pela pintura mecânica e focar no centro
                            setTimeout(() => {
                                const newElement = repliesDiv.lastElementChild;
                                if (newElement) {
                                    newElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                            }, 100);
                        }
                        parentContainer.querySelector('.reply-form')?.classList.add('hidden');
                    }
                } else {
                    const commentList = document.getElementById('comment-list');
                    const noCommentsMsg = document.getElementById('no-comments-message');
                    if (noCommentsMsg) noCommentsMsg.remove();
                    
                    if (commentList) {
                        commentList.insertAdjacentHTML('beforeend', data.html);
                        
                        // Dedução de Watson: Deslizar de forma óbvia para o centro do ecrã
                        setTimeout(() => {
                            const newElement = commentList.lastElementChild;
                            if (newElement) {
                                newElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                        }, 100);
                    }
                }

                const countElem = document.getElementById('post-comment-count');
                if (countElem) countElem.innerText = data.total_comments;

                form.reset();

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
