document.addEventListener('DOMContentLoaded', function () {

    // =============================
    // 1. CONFIGURAÇÃO CSRF
    // =============================
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    const tokenValue = csrfMeta ? csrfMeta.getAttribute('content') : '';

    document.querySelectorAll('form[method="POST"]').forEach(form => {
        if (!form.querySelector('input[name="csrf_token"]')) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'csrf_token';
            input.value = tokenValue;
            form.appendChild(input);
        }
    });

    document.body.addEventListener('htmx:configRequest', evt => {
        evt.detail.headers['X-CSRFToken'] = tokenValue;
    });

    // =============================
    // 2. RESPOSTAS / REPLIES
    // =============================
    function updateReplyCounts() {
        document.querySelectorAll('.toggle-replies-btn').forEach(btn => {
            const targetId = btn.dataset.target;
            const container = document.getElementById(targetId);
            if (!container) return;
            const count = container.querySelectorAll('.comment-node').length;
            btn.closest('div').style.display = count > 0 ? 'block' : 'none';
        });
    }
    updateReplyCounts();

    document.body.addEventListener('click', function (event) {

        const toggleBtn = event.target.closest('.toggle-replies-btn');
        if (toggleBtn) {
            const container = document.getElementById(toggleBtn.dataset.target);
            if (container) container.classList.toggle('hidden');
        }

        const replyBtn = event.target.closest('.reply-button');
        if (replyBtn) {
            const container = document.getElementById(`comment-${replyBtn.dataset.commentId}`);
            const form = container?.querySelector('.reply-form');
            if (form) {
                document.querySelectorAll('.reply-form').forEach(f => {
                    if (f !== form) f.classList.add('hidden');
                });
                form.classList.remove('hidden');
                form.querySelector('textarea')?.focus();
            }
        }

        const cancelBtn = event.target.closest('.cancel-reply-button');
        if (cancelBtn) cancelBtn.closest('.reply-form')?.classList.add('hidden');
    });

    // =============================
    // 3. SUBMIT GLOBAL
    // =============================
    document.body.addEventListener('submit', function (e) {

        const form = e.target;
        const action = form.getAttribute('action') || '';

        // ==================================================
        // A. LIKE — FIX DEFINITIVO DO SCROLL
        // ==================================================
        if (action.includes('like')) {

            // 🔒 TRAVA A POSIÇÃO DO SCROLL
            const scrollY = window.scrollY;

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            requestAnimationFrame(() => {
                window.scrollTo({ top: scrollY, left: 0, behavior: 'instant' });
            });

            const btn = form.querySelector('button[type="submit"]');
            const isCommentLike = action.includes('comment');

            // FEEDBACK VISUAL
            if (isCommentLike) {
                const span = btn.querySelector('span');
                if (span) {
                    const liked = span.innerText.trim() === 'Curtido';
                    span.innerText = liked ? 'Curtir' : 'Curtido';
                    btn.classList.toggle('text-blue-600', !liked);
                    btn.classList.toggle('font-bold', !liked);
                }
            } else {
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.className = icon.classList.contains('fas')
                        ? 'far fa-thumbs-up text-lg'
                        : 'fas fa-thumbs-up text-lg text-blue-600';
                }
            }

            fetch(action, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': tokenValue,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: new FormData(form)
            })
            .then(r => r.json())
            .then(data => {
                if (!data.success) return;

                if (isCommentLike) {
                    let html = `<span class="mr-1">${data.liked ? 'Curtido' : 'Curtir'}</span>`;
                    if (data.like_count > 0) {
                        html += `<i class="fas fa-thumbs-up text-[10px] mr-1"></i>`;
                        html += `<span class="like-count-text">${data.like_count}</span>`;
                    }
                    btn.innerHTML = html;
                } else {
                    btn.querySelectorAll('.like-count-text').forEach(el => el.remove());
                    const count = document.createElement('span');
                    count.className = 'like-count-text font-bold ml-1';
                    count.innerText = data.like_count;
                    btn.appendChild(count);
                }

                // 🔒 RESTAURA SCROLL (PÓS DOM UPDATE)
                requestAnimationFrame(() => {
                    window.scrollTo({ top: scrollY, left: 0, behavior: 'instant' });
                });
            })
            .catch(console.error);

            return false;
        }

        // ==================================================
        // B. COMENTÁRIOS
        // ==================================================
        if (action.includes('comment')) {

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            const btn = form.querySelector('button[type="submit"]');
            const textarea = form.querySelector('textarea');

            if (btn) {
                if (btn.disabled || form.dataset.submitting === "true") return;
                btn.dataset.originalText = btn.innerHTML;
                btn.disabled = true;
                form.dataset.submitting = "true";
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
            .then(r => r.redirected ? location.href = r.url : r.text())
            .then(() => location.reload())
            .catch(() => {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = btn.dataset.originalText;
                    form.dataset.submitting = "false";
                }
            });

            return false;
        }

    }, true);
});