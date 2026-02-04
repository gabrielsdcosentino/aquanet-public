// ============================================================================
// AQUANET SCRIPT - V10 (ANTI-DUPLICAÇÃO + PWA + UI)
// ============================================================================
console.log(">>> SCRIPT AQUANET V10 <<<");

let deferredPrompt; 

document.addEventListener('DOMContentLoaded', function() {
    
    // --- LÓGICA DE INSTALAÇÃO PWA ---
    const installCard = document.getElementById('pwa-install-card');
    const installBtn = document.getElementById('pwa-install-btn');
    const closeBtn = document.getElementById('pwa-close-btn');

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
                }, 3000);
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
            localStorage.setItem('aquanet_pwa_dismissed', 'true');
            if(installCard) installCard.remove();
        });
    }

    window.addEventListener('appinstalled', () => {
        localStorage.setItem('aquanet_pwa_installed', 'true');
        if(installCard) installCard.remove();
    });
});

// Helper CSRF
const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
document.addEventListener('htmx:configRequest', (evt) => evt.detail.headers['X-CSRFToken'] = getCsrfToken());

// Eventos Globais
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

// --- INTERCEPTAÇÃO DE FORMULÁRIOS (AQUI ESTÁ A MÁGICA ANTI-DUPLICAÇÃO) ---
document.addEventListener('submit', function(e) {
    const form = e.target;
    
    // Like (AJAX)
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

    // Comentários E POSTAGENS (Bloqueia o botão)
    // Agora verifica se é comentário OU se tem a classe 'post-form'
    if (form.id === 'comment-form' || form.classList.contains('reply-form') || form.classList.contains('post-form')) {
        
        // Se for postagem normal (sem AJAX), não previne o default, apenas bloqueia visualmente
        const isAjax = form.id === 'comment-form' || form.classList.contains('reply-form');
        
        const btn = form.querySelector('button[type="submit"]');
        if(btn) { 
            // Salva o texto original
            btn.dataset.original = btn.innerHTML; 
            // Bloqueia clique
            btn.disabled = true; 
            btn.classList.add('opacity-70', 'cursor-not-allowed');
            // Muda o texto
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i>Publicando...'; 
        }

        // Se for Postagem (NÃO AJAX), deixa o navegador enviar o form normalmente após bloquear o botão
        if (!isAjax) {
            return true; 
        }

        // Se for Comentário (AJAX), processa manualmente
        e.preventDefault(); e.stopImmediatePropagation();
        fetch(form.action, { method: 'POST', headers: { 'X-CSRFToken': getCsrfToken(), 'X-Requested-With': 'XMLHttpRequest' }, body: new FormData(form) })
            .then(res => { if (res.ok) window.location.reload(); else throw new Error('Erro'); })
            .catch(() => { 
                alert("Erro ao enviar."); 
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
