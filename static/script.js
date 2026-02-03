// ============================================================================
// AQUANET SCRIPT - VERSÃO V5 (MATADOR DE CACHE)
// ============================================================================
console.log(">>> SCRIPT AQUANET V5 - Tentando limpar Service Workers... <<<");

// 1. FORÇAR REMOÇÃO DE SERVICE WORKERS ANTIGOS
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
            console.log('🚨 Service Worker encontrado. Desinstalando para limpar cache:', registration);
            registration.unregister();
        }
        if(registrations.length > 0) {
            console.log("♻️ SW removido. Recarregando página em 1s...");
            // Opcional: Recarregar a página automaticamente uma vez para garantir a limpeza
            // setTimeout(() => window.location.reload(), 1000); 
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM Completamente Carregado. Listeners ativos.");
});

// Helper para pegar o token CSRF
const getCsrfToken = () => {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
};

// Configuração HTMX
document.addEventListener('htmx:configRequest', function(evt) {
    evt.detail.headers['X-CSRFToken'] = getCsrfToken();
});

// ============================================================================
// 2. GERENCIADOR DE CLIQUES (UI e Interações)
// ============================================================================
document.addEventListener('click', function(event) {
    
    // --- A. TOGGLE DE RESPOSTAS ---
    const toggleBtn = event.target.closest('.toggle-replies-btn');
    if (toggleBtn) {
        const targetId = toggleBtn.dataset.target;
        const container = document.getElementById(targetId);
        if (container) container.classList.toggle('hidden');
    }

    // --- B. BOTÃO RESPONDER ---
    const replyBtn = event.target.closest('.reply-button');
    if (replyBtn) {
        event.preventDefault();
        event.stopPropagation();
        const commentId = replyBtn.dataset.commentId;
        const container = document.getElementById(`comment-${commentId}`);
        
        if (container) {
            const form = container.querySelector('.reply-form');
            if (form) {
                document.querySelectorAll('.reply-form').forEach(f => f.classList.add('hidden')); // Fecha outros
                form.classList.remove('hidden'); // Abre este
                const area = form.querySelector('textarea');
                if (area) setTimeout(() => area.focus(), 100);
            }
        }
    }
    
    // --- C. BOTÃO CANCELAR RESPOSTA ---
    const cancelBtn = event.target.closest('.cancel-reply-button');
    if (cancelBtn) {
        const form = cancelBtn.closest('.reply-form');
        if (form) form.classList.add('hidden');
    }
});

// ============================================================================
// 3. INTERCEPTAÇÃO DE FORMULÁRIOS (BLINDAGEM CONTRA RELOAD)
// ============================================================================
document.addEventListener('submit', function(e) {
    const form = e.target;
    
    // --- LÓGICA DE LIKE ---
    if (form.classList.contains('like-form')) {
        e.preventDefault(); // IMPEDE RELOAD
        e.stopImmediatePropagation();
        
        console.log("Like interceptado via JS (V5)");
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

    // --- LÓGICA DE COMENTÁRIOS ---
    if (form.id === 'comment-form' || form.classList.contains('reply-form')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        
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

// ============================================================================
// 4. UI GLOBAIS
// ============================================================================
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