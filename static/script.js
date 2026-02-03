// ============================================================================
// AQUANET SCRIPT - V6 (PWA RESTAURADO)
// ============================================================================
console.log(">>> SCRIPT AQUANET V6 - PWA Ativo <<<");

let deferredPrompt; // Guarda o evento de instalação

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM Carregado.");
    
    // --- LÓGICA DE INSTALAÇÃO PWA ---
    const installCard = document.getElementById('pwa-install-card');
    const installBtn = document.getElementById('pwa-install-btn');
    const closeBtn = document.getElementById('pwa-close-btn');

    // 1. O navegador dispara esse evento se o site for "instalável"
    window.addEventListener('beforeinstallprompt', (e) => {
        // Previne a barra padrão do Chrome (para mostrarmos o nosso card)
        e.preventDefault();
        deferredPrompt = e;
        
        // Mostra o nosso card personalizado
        if (installCard) {
            setTimeout(() => {
                installCard.classList.remove('hidden');
                installCard.classList.add('flex');
            }, 3000); // Espera 3s para não ser intrusivo
        }
    });

    // 2. Clique no botão "Instalar"
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt(); // Mostra o prompt nativo do celular
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`Resultado da instalação: ${outcome}`);
                deferredPrompt = null;
                // Esconde o card
                if (installCard) installCard.classList.add('hidden');
            }
        });
    }

    // 3. Botão Fechar (X)
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (installCard) installCard.classList.add('hidden');
        });
    }
});

// Helper CSRF
const getCsrfToken = () => {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
};
document.addEventListener('htmx:configRequest', function(evt) {
    evt.detail.headers['X-CSRFToken'] = getCsrfToken();
});

// ============================================================================
// FUNCIONALIDADES GLOBAIS (Likes, Comentários, Menus)
// ============================================================================
document.addEventListener('click', function(event) {
    // Toggle Respostas
    const toggleBtn = event.target.closest('.toggle-replies-btn');
    if (toggleBtn) {
        const targetId = toggleBtn.dataset.target;
        const container = document.getElementById(targetId);
        if (container) container.classList.toggle('hidden');
    }
    // Botão Responder
    const replyBtn = event.target.closest('.reply-button');
    if (replyBtn) {
        event.preventDefault(); event.stopPropagation();
        const commentId = replyBtn.dataset.commentId;
        const container = document.getElementById(`comment-${commentId}`);
        if (container) {
            const form = container.querySelector('.reply-form');
            if (form) {
                document.querySelectorAll('.reply-form').forEach(f => f.classList.add('hidden'));
                form.classList.remove('hidden');
                const area = form.querySelector('textarea');
                if (area) setTimeout(() => area.focus(), 100);
            }
        }
    }
    // Cancelar Resposta
    const cancelBtn = event.target.closest('.cancel-reply-button');
    if (cancelBtn) {
        const form = cancelBtn.closest('.reply-form');
        if (form) form.classList.add('hidden');
    }
});

// Interceptação de Forms (Like/Comentário)
document.addEventListener('submit', function(e) {
    const form = e.target;
    
    // Like
    if (form.classList.contains('like-form')) {
        e.preventDefault(); e.stopImmediatePropagation();
        const btn = form.querySelector('button[type="submit"]');
        const icon = btn.querySelector('i');
        const countSpan = btn.querySelector('.like-count-text');
        
        // UI Otimista
        if (icon) {
            if (icon.classList.contains('fas')) { 
                icon.classList.replace('fas', 'far'); 
                btn.classList.remove('text-blue-600', 'font-bold');
            } else { 
                icon.classList.replace('far', 'fas'); 
                btn.classList.add('text-blue-600', 'font-bold');
            }
        }
        
        fetch(form.action, {
            method: 'POST',
            headers: { 'X-CSRFToken': getCsrfToken(), 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success && countSpan) countSpan.innerText = data.like_count > 0 ? data.like_count : '';
        })
        .catch(err => console.error("Erro Like:", err));
        return false;
    }

    // Comentário
    if (form.id === 'comment-form' || form.classList.contains('reply-form')) {
        e.preventDefault(); e.stopImmediatePropagation();
        const btn = form.querySelector('button[type="submit"]');
        if (btn) {
            btn.dataset.original = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
        }
        fetch(form.action, {
            method: 'POST',
            headers: { 'X-CSRFToken': getCsrfToken(), 'X-Requested-With': 'XMLHttpRequest' },
            body: new FormData(form)
        })
        .then(res => {
            if (res.ok) window.location.reload();
            else throw new Error('Erro servidor');
        })
        .catch(err => {
            alert("Erro ao enviar.");
            if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.original; }
        });
        return false;
    }
});

// UI Globais
window.toggleMobileSearch = function() {
    const sb = document.getElementById('mobile-search-bar');
    if(sb) { sb.classList.toggle('hidden'); if(!sb.classList.contains('hidden')) sb.querySelector('input')?.focus(); }
};
window.closeDrawer = function() {
    document.getElementById('mobile-drawer')?.classList.remove('drawer-open');
    document.getElementById('mobile-drawer')?.classList.add('drawer-closed');
    document.getElementById('drawer-overlay')?.classList.add('hidden');
    document.body.style.overflow = 'visible';
};
window.toggleDrawer = function() {
    const d = document.getElementById('mobile-drawer');
    const o = document.getElementById('drawer-overlay');
    if(!d) return;
    if(d.classList.contains('drawer-closed')) {
        d.classList.remove('drawer-closed'); d.classList.add('drawer-open');
        o?.classList.remove('hidden'); document.body.style.overflow = 'hidden';
    } else { closeDrawer(); }
};
document.addEventListener('htmx:beforeRequest', () => { document.getElementById('page-loader').style.width='30%'; document.getElementById('page-loader').style.opacity='1'; closeDrawer(); });
document.addEventListener('htmx:afterSwap', () => { const l=document.getElementById('page-loader'); l.style.width='100%'; setTimeout(()=>{l.style.opacity='0';l.style.width='0%'},300); });
