document.addEventListener('DOMContentLoaded', function () {

    // 1. CONFIGURAÇÃO CSRF (Segurança)
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    const tokenValue = csrfMeta ? csrfMeta.getAttribute('content') : '';

    // Injeta token em todos os forms POST normais
    document.querySelectorAll('form[method="POST"]').forEach(function(form) {
        if (!form.querySelector('input[name="csrf_token"]')) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'csrf_token';
            input.value = tokenValue;
            form.appendChild(input);
        }
    });

    // Injeta token no HTMX
    document.body.addEventListener('htmx:configRequest', function(evt) {
        evt.detail.headers['X-CSRFToken'] = tokenValue;
    });

    // 2. MOSTRAR/ESCONDER RESPOSTAS
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
    updateReplyCounts();

    // LISTENERS GERAIS DE CLIQUE
    document.body.addEventListener('click', function(event) {

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
                if (area) area.focus();
            }
        }

        const cancelBtn = event.target.closest('.cancel-reply-button');
        if (cancelBtn) {
            const form = cancelBtn.closest('.reply-form');
            if (form) form.classList.add('hidden');
        }
    });

    // 3. SUBMIT GLOBAL (LIKES, COMENTÁRIOS, ETC)
    document.body.addEventListener('submit', function(e) {

        const form = e.target;
        const action = form.getAttribute('action') || '';

        // ======================
        // A. LIKE (POST / COMMENT)
        // ======================
        if (action.includes('like')) {

            // 🔥 FIX DEFINITIVO DO SCROLL
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            const btn = form.querySelector('button[type="submit"]');
            const isCommentLike = action.includes('comment');

            // FEEDBACK VISUAL OTIMISTA
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
                    'X-CSRFToken': tokenValue,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: new FormData(form)
            })
            .then(response => response.json())
            .then(data => {

                if (!data.success) return;

                if (isCommentLike) {
                    const text = data.liked ? 'Curtido' : 'Curtir';
                    const colorClass = data.liked ? 'text-blue-600 font-bold' : '';
                    let html = `<span class="mr-1">${text}</span>`;

                    if (data.like_count > 0) {
                        html += `<i class="fas fa-thumbs-up text-[10px] mr-1"></i>`;
                        html += `<span class="like-count-text">${data.like_count}</span>`;
                    }

                    btn.innerHTML = html;
                    btn.className = `hover:text-blue-600 transition-colors flex items-center ${colorClass}`;

                } else {
                    const icon = btn.querySelector('i');
                    btn.querySelectorAll('.like-count-text').forEach(el => el.remove());

                    const countSpan = document.createElement('span');
                    countSpan.className = 'like-count-text font-bold ml-1';
                    countSpan.innerText = data.like_count;
                    btn.appendChild(countSpan);

                    if (icon) {
                        icon.className = data.liked
                            ? 'fas fa-thumbs-up text-lg text-blue-600'
                            : 'far fa-thumbs-up text-lg';
                    }

                    btn.classList.toggle('text-blue-600', data.liked);
                }
            })
            .catch(console.error);

            return false;
        }

        // ======================
        // B. COMENTÁRIOS
        // ======================
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
            .then(response => response.redirected ? window.location.href = response.url : response.text())
            .then(data => {
                if (!data) return;

                const isReply = form.classList.contains('reply-form');
                if (isReply) {
                    window.location.reload();
                } else {
                    const commentList = document.getElementById('comment-list');
                    const noCommentsMsg = document.getElementById('no-comments-message');
                    if (noCommentsMsg) noCommentsMsg.remove();

                    if (commentList) {
                        try {
                            const json = JSON.parse(data);
                            if (json.html) commentList.insertAdjacentHTML('afterbegin', json.html);
                            else window.location.reload();
                        } catch {
                            commentList.insertAdjacentHTML('afterbegin', data);
                        }
                    }

                    if (textarea) textarea.value = '';
                }

                if (btn) {
                    btn.disabled = false;
                    form.dataset.submitting = "false";
                    btn.innerHTML = btn.dataset.originalText;
                }
            })
            .catch(() => {
                if (btn) {
                    btn.disabled = false;
                    form.dataset.submitting = "false";
                    btn.innerHTML = btn.dataset.originalText;
                }
            });

            return false;
        }

    }, true);

});