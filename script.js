document.addEventListener('DOMContentLoaded', function () {

    // 1. PEGAR O TOKEN DO CABEÇALHO
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    const tokenValue = csrfMeta ? csrfMeta.getAttribute('content') : '';

    // 2. INJETAR TOKEN EM TODOS OS FORMS (Prevenção CSRF)
    document.querySelectorAll('form[method="POST"]').forEach(function(form) {
        if (!form.querySelector('input[name="csrf_token"]')) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'csrf_token';
            input.value = tokenValue;
            form.appendChild(input);
        }
    });

    // Função auxiliar para pegar o token no AJAX
    function getCsrfToken() { return tokenValue; }

    // --- LÓGICA DE MOSTRAR/ESCONDER RESPOSTAS ---
    function updateReplyCounts() {
        document.querySelectorAll('.toggle-replies-btn').forEach(btn => {
            const targetId = btn.dataset.target;
            const container = document.getElementById(targetId);
            if (container) {
                const count = container.querySelectorAll('.comment-node').length;
                if (count > 0) {
                    btn.closest('div').style.display = 'block';
                } else {
                    btn.closest('div').style.display = 'none';
                }
            }
        });
    }
    updateReplyCounts(); // Roda ao iniciar

    document.body.addEventListener('click', function(event) {
        const toggleBtn = event.target.closest('.toggle-replies-btn');
        if (toggleBtn) {
            const targetId = toggleBtn.dataset.target;
            const container = document.getElementById(targetId);
            if (container) container.classList.toggle('hidden');
        }
    });

    // --- LÓGICA DE CURTIR (LIKE) ---
    document.body.addEventListener('submit', function (event) {
        if (!event.target.classList.contains('like-form')) return;
        
        event.preventDefault(); // IMPEDE A TELA PRETA
        const form = event.target;
        const button = form.querySelector('button');
        const countSpan = form.querySelector('.like-count-text');
        
        // Verifica se é post ou comentário pela URL da ação
        const isPost = form.action.includes('like_post');

        fetch(form.action, {
            method: 'POST',
            headers: { 
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': getCsrfToken() 
            }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // Atualiza o número
                if (countSpan) {
                    countSpan.textContent = data.like_count > 0 ? data.like_count : '';
                }

                // Atualiza a cor e o ícone
                if (data.liked) {
                    button.classList.add('text-blue-600', 'font-bold');
                    button.classList.remove('text-gray-500');
                    // Se for post, troca o ícone
                    const icon = button.querySelector('i');
                    if (icon) {
                        icon.classList.remove('far');
                        icon.classList.add('fas');
                    }
                    // Se for comentário (texto "Curtir")
                    if (!isPost) {
                        const textNode = Array.from(button.childNodes).find(n => n.nodeType === 3);
                        if(textNode && textNode.textContent.trim() === "Curtir") textNode.textContent = "Curtido";
                    }
                } else {
                    button.classList.remove('text-blue-600', 'font-bold');
                    button.classList.add('text-gray-500');
                    const icon = button.querySelector('i');
                    if (icon) {
                        icon.classList.remove('fas');
                        icon.classList.add('far');
                    }
                    if (!isPost) {
                        const textNode = Array.from(button.childNodes).find(n => n.nodeType === 3);
                        if(textNode && textNode.textContent.trim() === "Curtido") textNode.textContent = "Curtir";
                    }
                }
            }
        })
        .catch(err => console.error("Erro no like:", err));
    });

    // --- LÓGICA DE COMENTAR E RESPONDER ---
    
    // 1. Botão "Responder" (Abre o formzinho)
    document.body.addEventListener('click', function (event) {
        const replyBtn = event.target.closest('.reply-button');
        if (replyBtn) {
            const commentId = replyBtn.dataset.commentId;
            const container = document.getElementById(`comment-${commentId}`);
            
            // PROCURA O FORMULÁRIO DENTRO DO CONTAINER DO COMENTÁRIO
            // (Mudança importante: não depende mais de divs intermediárias)
            const form = container.querySelector('.reply-form');
            
            if (form) {
                // Fecha outros forms abertos para não poluir
                document.querySelectorAll('.reply-form').forEach(f => {
                    if (f !== form) f.classList.add('hidden');
                });
                
                form.classList.remove('hidden');
                const area = form.querySelector('textarea');
                area.focus();
            }
        }
        
        // Botão Cancelar
        const cancelBtn = event.target.closest('.cancel-reply-button');
        if (cancelBtn) {
            const form = cancelBtn.closest('.reply-form');
            if (form) form.classList.add('hidden');
        }
    });

    // 2. Enviar o Comentário (Submit)
    function handleCommentSubmit(event) {
        event.preventDefault(); // IMPEDE RECARREGAR PÁGINA
        const form = event.target;
        const textarea = form.querySelector('textarea[name="comment_text"]');
        const commentText = textarea.value;
        const parentId = form.dataset.parentId || null;

        if (!commentText.trim()) return; // Não envia vazio

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Env...';

        fetch(ADD_COMMENT_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify({ comment_text: commentText, parent_id: parentId })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                textarea.value = ''; // Limpa campo

                // Recarrega a página para mostrar o novo comentário 
                // (Maneira mais segura de garantir que o layout não quebre)
                window.location.reload(); 
            } else {
                alert('Erro: ' + data.error);
            }
        })
        .catch(err => console.error(err))
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
    }

    // Intercepta o envio dos forms de comentário
    document.body.addEventListener('submit', function (event) {
        if (event.target.id === 'comment-form' || event.target.classList.contains('reply-form')) {
            handleCommentSubmit(event);
        }
    });
});