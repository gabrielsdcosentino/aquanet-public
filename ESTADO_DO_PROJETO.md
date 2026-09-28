# PROMPT DE CONTEXTO (INSTRUÇÕES PARA A IA)
Você é o assistente de desenvolvimento do Gabriel. Estamos construindo o **AquaNet**, a principal rede social de aquarismo.
Nossa arquitetura atual é híbrida:
- **Backend:** Flask (Python) conectado a um banco Neon (PostgreSQL) e Cloudinary para imagens.
- **Web Frontend (Legado Ativo):** Templates Jinja2 + HTMX + Tailwind CSS.
- **Mobile Frontend (Novo):** React Native com Expo.

**Regras de Atuação:**
1. O site web não pode morrer. Todas as rotas novas para o aplicativo React Native devem ser criadas com o prefixo `/api/v1/` e devem retornar APENAS `JSON`.
2. Nunca remova os `render_template` das rotas web existentes.
3. Toda vez que finalizarmos uma rota nova, um modelo de banco ou uma tela no React Native, você (a IA) DEVE fornecer a versão atualizada deste arquivo `ESTADO_DO_PROJETO.md` para eu salvar e manter o contexto.

---

# ESTADO DO PROJETO: AQUANET

## 1. Banco de Dados (Modelos Atuais)
* **User**: id, username, email, password_hash, profile_pic_url, google_id.
* **Community**: id, slug, name, description, created_at, creator_id.
* **Post**: id, content, timestamp, user_id, image_file, image_public_id, community_id.
* **PostImage**: id, post_id, image_file, image_public_id (Suporta fotos e vídeos).
* **Comment**: id, text, timestamp, user_id, post_id, parent_id.
* **Notification**: id, recipient_id, sender_id, action, post_id, comment_id, timestamp, is_read, count.
* **PushSubscription**: id, endpoint, p256dh, auth, user_id.
* **Aquarium**: id, name, aquarium_type, volume, setup_date, description, created_at, user_id.
* **ParameterLog**: id, aquarium_id, date, ph, ammonia, nitrite, nitrate, temperature, notes.
* **MaintenanceLog**: id, aquarium_id, date, maintenance_type, description.
* **Fauna**: id, aquarium_id, name, quantity, fauna_type.
* **EncyclopediaEntry**: id, title, slug, category, content, image_file, updated_at, last_editor_id.
* **Badge**: id, slug, name, description, icon, color.

## 2. API REST do Aplicativo (Rotas `/api/v1/`)
*Aqui listaremos as rotas puras em JSON construídas para o React Native.*

- [ ] **Autenticação:** Login Google nativo e Login Email/Senha retornando JWT ou Session Cookie seguro.
- [ ] **Feed:** Rota para buscar os posts com paginação e carrossel de mídia.
- [ ] **Comunidades:** Listagem, entrar/sair e feed específico.
- [ ] **Aquários:** CRUD completo dos aquários e logs de parâmetros/manutenção.
- [ ] **Perfil & Gamificação:** Busca de dados do usuário, seguidores e medalhas.

## 3. Próximos Passos Imediatos
1. Preparar o Flask para ser uma API REST (Configurar serialização de JSON e tratar sessão no mobile).
2. Criar as primeiras rotas de leitura: `/api/v1/feed` e `/api/v1/communities`.
3. Iniciar o projeto Expo (React Native) no Codespaces.