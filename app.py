from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, current_app, send_from_directory
from sqlalchemy.orm import joinedload
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import or_, func
from flask_bcrypt import Bcrypt
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_wtf.csrf import CSRFProtect
from werkzeug.utils import secure_filename
from markupsafe import Markup
from flask import escape
import secrets, os, datetime, unicodedata, re, json
import cloudinary, cloudinary.uploader, cloudinary.api
from authlib.integrations.flask_client import OAuth
from flask_mail import Mail, Message
from itsdangerous import URLSafeTimedSerializer as Serializer
from better_profanity import profanity
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import time
from pywebpush import webpush, WebPushException
import textwrap
import tempfile
import base64

# --- DEFINIÇÃO DE CAMINHOS ---
base_dir = os.path.abspath(os.path.dirname(__file__))

# --- FUNÇÃO DE HORÁRIO BRASIL (UTC-3) ---
def now_br():
    return datetime.datetime.utcnow() - datetime.timedelta(hours=3)

app = Flask(__name__)

# --- FILTRO PARA TORNAR @MENTIONS CLICÁVEIS ---
@app.template_filter('link_mentions')
def link_mentions(text):
    if not text: return ""
    escaped_text = str(escape(text))
    return Markup(re.sub(r'@([a-zA-Z0-9_]+)', r'<a href="/profile/\1" class="text-blue-600 hover:text-blue-800 hover:underline font-bold transition-colors">@\1</a>', escaped_text))

# --- CONFIG ---
app.config['GOOGLE_CLIENT_ID'] = os.environ.get('GOOGLE_CLIENT_ID', '601074892036-k72kp3f9rj9q129qhgbua1g56rm8r9um.apps.googleusercontent.com')
app.config['GOOGLE_CLIENT_SECRET'] = os.environ.get('GOOGLE_CLIENT_SECRET', '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')

uri = os.environ.get('SQLALCHEMY_DATABASE_URI', 'sqlite:///' + os.path.join(base_dir, 'site.db'))
if uri and uri.startswith("postgres://"):
    uri = uri.replace("postgres://", "postgresql://", 1)
app.config['SQLALCHEMY_DATABASE_URI'] = uri

app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'chave-secreta-simples-para-desenvolvimento')
app.config['MAX_CONTENT_LENGTH'] = 4.5 * 1024 * 1024 
app.config['CLOUDINARY_CLOUD_NAME'] = os.environ.get('CLOUDINARY_CLOUD_NAME', 'drucooybh')
app.config['CLOUDINARY_API_KEY'] = os.environ.get('CLOUDINARY_API_KEY')
app.config['CLOUDINARY_API_SECRET'] = os.environ.get('CLOUDINARY_API_SECRET')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    "pool_pre_ping": True,
    "pool_recycle": 300,
}

# MAIL CONFIG
app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.environ.get('MAIL_USE_TLS', 'True') == 'True'
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER')

VAPID_PRIVATE_KEY = os.environ.get(
    "VAPID_PRIVATE_KEY",
    "nWLwHab_lnl9f8wASq2aphuWZWy41SaXByHUsPsVnCk"
)

# --- MODERAÇÃO AVANÇADA ---
CUSTOM_BAD_WORDS = [
    'anal', 'anta', 'arrombado', 'arrombada', 'babaca', 'bacanal', 'batoré', 'besta', 'bicha', 'biscate', 
    'boceta', 'boquete', 'bosta', 'brecha', 'brocha', 'buceta', 'bunda', 'burro', 'burra', 
    'cabaço', 'cabaça', 'cacete', 'cadeluda', 'cagar', 'cagado', 'cagada', 'camisinha', 'caralho', 
    'chupa', 'chupar', 'chupada', 'clitoris', 'cocô', 'comedor', 'corno', 'corna', 'cretino', 'cretina', 
    'cú', 'cu', 'culhão', 'curalho', 'cuzao', 'cuzão', 'cuzinho', 'debil', 'drogado', 'drogada', 
    'escort', 'escroto', 'escrota', 'estupro', 'estuprador', 'foda', 'foda-se', 'fodase', 'foder', 
    'fodendo', 'fudendo', 'fudida', 'fudido', 'grelo', 'grelinho', 'gozo', 'gozar', 'gozada', 
    'idiota', 'imbecil', 'inferno', 'isento', 'kct', 'kralho', 'lixo', 'maconheiro', 'maconheira', 
    'maldito', 'maldita', 'merda', 'mijo', 'mocorongo', 'mongol', 'nazi', 'nazista', 'hitler', 
    'nigga', 'nigger', 'otario', 'otário', 'otaria', 'pau', 'pinto', 'penis', 'pênis', 'perereca', 
    'piroca', 'porra', 'porn', 'porno', 'pornografia', 'prostituta', 'prostituto', 'punheta', 'punheteiro', 
    'puta', 'putaria', 'puteiro', 'puto', 'piranha', 'quenga', 'rabão', 'rabo', 'rabuda', 'retardado', 
    'retardada', 'rola', 'rolinha', 'rolão', 'rosca', 'sacana', 'safada', 'safado', 'siririca', 
    'tarada', 'tarado', 'tesão', 'tesuda', 'tesudo', 'tetas', 'transa', 'transar', 'trepar', 
    'troxa', 'trouxa', 'vadia', 'vagabunda', 'vagabundo', 'vagina', 'viado', 'viadinho', 'xana', 
    'xochota', 'xoxota', 'xxx', 'xvideos', 'hentai', 'sexo', 'sexual',
    'macaco', 'macaca', 'preto sujo', 'preta suja', 'tição', 'senzala', 'escravo', 'negrinho',
    'sapatão', 'sapatona', 'traveco', 'travesti', 'boiola', 'marica', 'baitola', 
    'baleia', 'rolha de poço', 'quatro olhos', 'aleijado', 'autista', 'down', 'negrao', 'negao', 'negão', 'boludo', 
    'bet', 'bet365', 'betano', 'blaze', 'tigrinho', 'jogo do tigre', 'fortune tiger', 
    'cassino', 'casino', 'renda extra', 'ganhar dinheiro', 'urubu do pix', 'pix premiado', 
    'robô do pix', 'fature alto', 'trabalhe de casa', 'pirâmide', 'bitcoin grátis', 
    'crédito fácil', 'empréstimo', 'suplemento', 'viagra', 'cialis', 'aumente seu'
]
profanity.load_censor_words(CUSTOM_BAD_WORDS)

def contains_bad_words(text):
    if not text: return False
    return profanity.contains_profanity(text)

# INICIALIZAÇÃO
db = SQLAlchemy()
bcrypt = Bcrypt()
login_manager = LoginManager()
oauth = OAuth()
mail = Mail()
csrf = CSRFProtect()

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["2000 per day", "500 per hour"],
    storage_uri="memory://"
)

db.init_app(app)
bcrypt.init_app(app)
login_manager.init_app(app)
mail.init_app(app)
csrf.init_app(app)

login_manager.login_view = 'login'
login_manager.login_category = 'info'

if app.config['CLOUDINARY_API_KEY'] and app.config['CLOUDINARY_API_SECRET']:
    try:
        cloudinary.config(
            cloud_name=app.config['CLOUDINARY_CLOUD_NAME'], api_key=app.config['CLOUDINARY_API_KEY'],
            api_secret=app.config['CLOUDINARY_API_SECRET']
        )
    except Exception as e:
        print(f"Erro Config Cloudinary: {e}")

oauth.init_app(app)
oauth.register(
    name='google',
    client_id=app.config['GOOGLE_CLIENT_ID'], client_secret=app.config['GOOGLE_CLIENT_SECRET'],
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope':'profile email'}, access_token_url='https://oauth2.googleapis.com/token',
    authorize_url='https://accounts.google.com/o/oauth2/auth', api_base_url='https://www.googleapis.com/oauth2/v3/userinfo'
)

# --- TABELAS DE ASSOCIAÇÃO ---
likes = db.Table(
    'likes', db.Column('user_id',db.Integer,db.ForeignKey('user.id',ondelete='CASCADE'),primary_key=True),
    db.Column('post_id',db.Integer,db.ForeignKey('post.id',ondelete='CASCADE'),primary_key=True)
)
followers_table = db.Table(
    'follow', db.Column('follower_id',db.Integer,db.ForeignKey('user.id',ondelete='CASCADE'),primary_key=True),
    db.Column('followed_id',db.Integer,db.ForeignKey('user.id',ondelete='CASCADE'),primary_key=True)
)
comment_likes_table = db.Table(
    'comment_likes', db.Column('user_id',db.Integer,db.ForeignKey('user.id',ondelete='CASCADE'),primary_key=True),
    db.Column('comment_id',db.Integer,db.ForeignKey('comment.id',ondelete='CASCADE'),primary_key=True)
)
community_members = db.Table(
    'community_members', db.Column('user_id',db.Integer,db.ForeignKey('user.id',ondelete='CASCADE'),primary_key=True),
    db.Column('community_id',db.Integer,db.ForeignKey('community.id',ondelete='CASCADE'),primary_key=True)
)

# --- TABELA DE MEDALHAS DO USUÁRIO ---
user_badges = db.Table(
    'user_badges',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), primary_key=True),
    db.Column('badge_id', db.Integer, db.ForeignKey('badge.id', ondelete='CASCADE'), primary_key=True)
)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# UTILS
_cache_popular = {'data': [], 'timestamp': 0}

def get_popular_communities():
    global _cache_popular
    current_time = time.time()
    if _cache_popular['data'] and (current_time - _cache_popular['timestamp'] < 600):
        return _cache_popular['data']
    try:
        results = (
            db.session.query(Community, func.count(Post.id).label('post_count'))
            .join(Post, Community.id == Post.community_id, isouter=True)
            .group_by(Community.id)
            .order_by(db.desc('post_count'))
            .limit(5)
            .all()
        )
        data = [c[0] for c in results]
        _cache_popular = {'data': data, 'timestamp': current_time}
        return data
    except Exception as e:
        print(f"Erro ao buscar comunidades populares: {e}")
        return _cache_popular.get('data', [])


@app.route('/debug/push')
@login_required
def debug_push():
    subs = PushSubscription.query.filter_by(user_id=current_user.id).all()
    results = []
    
    # Agora recebemos uma STRING perfeita
    pem_key_string = VAPID_PRIVATE_KEY
    
    if not pem_key_string:
        return jsonify(["ERRO: Não foi possível processar a chave privada."])

    for sub in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth}
                },
                data=json.dumps({"title": "Teste AquaNet", "body": "Funcionou! Aleluia!", "url": "/"}),
                vapid_private_key=pem_key_string, # Passamos a STRING aqui
                vapid_claims={"sub": "mailto:bielcosen14@gmail.com"}
            )
            results.append(f"Sucesso para ID {sub.id}")
        except Exception as ex:
            msg = str(ex)
            results.append(f"Erro no ID {sub.id}: {msg}")
            
            # Limpeza automática de inscrições mortas
            if "410" in msg or "404" in msg:
                db.session.delete(sub)
                db.session.commit()
            
    return jsonify(results)

# --- SISTEMA DE EMAIL ---
def send_email_notification(to_email, subject, html_body):
    if not to_email: return
    sender = f"AquaNet <{app.config.get('MAIL_USERNAME', 'noreply@aquanet.app')}>" 
    msg = Message(subject, sender=sender, recipients=[to_email], html=html_body)
    try:
        mail.send(msg)
    except Exception as e:
        print(f"ERRO CRÍTICO AO ENVIAR EMAIL: {e}")

def send_reset_email(user, mail_app):
    token = user.get_reset_token()
    sender_address = f"AquaNet <{current_app.config['MAIL_USERNAME']}>" 
    msg = Message('Redefinição de Senha', sender=sender_address, recipients=[user.email])
    msg.body = f'Para redefinir sua senha, clique no link: {url_for("reset_token", token=token, _external=True)}'
    try: mail_app.send(msg)
    except Exception as e: print(f"ERRO EMAIL: {e}")

# --- MODELO DE MEDALHAS ---
class Badge(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(50), unique=True, nullable=False) # ex: cientista-1
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(200), nullable=False)
    icon = db.Column(db.String(50), nullable=False) # Classe do FontAwesome
    color = db.Column(db.String(20), default='blue') # blue, yellow, red...

# MODELS
class User(db.Model, UserMixin):
    id = db.Column(db.Integer,primary_key=True)
    username = db.Column(db.String(80),unique=True,nullable=False)
    email = db.Column(db.String(120),unique=True,nullable=True)
    password_hash = db.Column(db.String(128),nullable=False)
    profile_pic_url = db.Column(db.String(200),nullable=False,default='https://res.cloudinary.com/demo/image/upload/w_150,h_150,c_fill,g_face,r_max/default_avatar.png')
    posts = db.relationship('Post',backref='author',lazy=True)
    comments = db.relationship('Comment',backref='comment_author',lazy=True)
    liked_posts = db.relationship('Post',secondary=likes,lazy='subquery',backref=db.backref('likes',lazy=True))
    created_communities = db.relationship('Community',backref='creator',lazy=True)
    joined_communities = db.relationship('Community',secondary=community_members,backref=db.backref('members',lazy='dynamic'))
    notifications = db.relationship('Notification',foreign_keys='Notification.recipient_id',backref='recipient',lazy='dynamic',cascade='all, delete-orphan')
    liked_comments = db.relationship('Comment',secondary=comment_likes_table,lazy='subquery',backref=db.backref('likes',lazy=True))
    aquariums = db.relationship('Aquarium',backref='owner',lazy=True,cascade="all, delete-orphan")
    google_id = db.Column(db.String(120),unique=True,nullable=True)
    followed = db.relationship(
        'User', secondary=followers_table, primaryjoin=(followers_table.c.follower_id==id),
        secondaryjoin=(followers_table.c.followed_id==id), backref=db.backref('followers',lazy='dynamic'), lazy='dynamic'
    )
    # --- RELAÇÃO DE MEDALHAS ---
    badges = db.relationship('Badge', secondary=user_badges, backref='owners', lazy='subquery')

    def get_reset_token(self,expires_sec=1800):
        s = Serializer(current_app.config['SECRET_KEY']); return s.dumps({'user_id': self.id})
    @staticmethod
    def verify_reset_token(token,expires_sec=1800):
        s = Serializer(app.config['SECRET_KEY']); 
        try: data = s.loads(token,max_age=expires_sec)
        except: return None
        return User.query.get(data['user_id'])
    def set_password(self,password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    def check_password(self,password):
        return bcrypt.check_password_hash(self.password_hash,password)
    def has_liked_post(self,post): return post in self.liked_posts
    def has_liked_comment(self,comment): return comment in self.liked_comments
    def follow_user(self,user):
        if not self.is_following(user): self.followed.append(user); db.session.commit()
    def unfollow_user(self,user):
        if self.is_following(user): self.followed.remove(user); db.session.commit()
    def is_following(self,user):
        return self.followed.filter(followers_table.c.followed_id==user.id).count() > 0
    def join_community(self,community):
        if not self.is_member(community): self.joined_communities.append(community); db.session.commit()
    def leave_community(self,community):
        if self.is_member(community): self.joined_communities.remove(community); db.session.commit()
    def is_member(self,community): return community in self.joined_communities
    
class Community(db.Model):
    id = db.Column(db.Integer, primary_key=True); slug = db.Column(db.String(100), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False); description = db.Column(db.String(300), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=now_br) 
    creator_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='SET NULL'), nullable=True)
    posts = db.relationship('Post', backref='community', lazy=True)
    
    @staticmethod
    def generate_slug(name):
        nfkd_form = unicodedata.normalize('NFKD', name)
        slug = "".join([c for c in nfkd_form if not unicodedata.combining(c)])
        slug = slug.lower().strip().replace(' ', '-')
        slug = ''.join(c for c in slug if c.isalnum() or c == '-')
        while '--' in slug:
            slug = slug.replace('--', '-')
        slug = slug.strip('-')
        return slug

class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True); content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=now_br) 
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    image_file = db.Column(db.String(200), nullable=True); image_public_id = db.Column(db.String(100), nullable=True)
    comments = db.relationship('Comment', backref='parent_post', lazy=True, cascade="all, delete-orphan")
    community_id = db.Column(db.Integer, db.ForeignKey('community.id', ondelete='CASCADE'), nullable=False)

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True); text = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=now_br) 
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey('post.id', ondelete='CASCADE'), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('comment.id', ondelete='CASCADE'), nullable=True)
    replies = db.relationship(
        'Comment', backref=db.backref('parent', remote_side=[id]), lazy='dynamic',
        cascade='all, delete-orphan', order_by='Comment.timestamp.asc()'
    )

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    recipient_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=True)
    action = db.Column(db.String(50), nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey('post.id', ondelete='CASCADE'), nullable=True)
    comment_id = db.Column(db.Integer, db.ForeignKey('comment.id', ondelete='CASCADE'), nullable=True)
    timestamp = db.Column(db.DateTime, index=True, default=now_br) 
    is_read = db.Column(db.Boolean, default=False)
    count = db.Column(db.Integer, default=1)
    sender = db.relationship('User', foreign_keys=[sender_id], backref='sent_notifications')

# --- NOVO MODELO PARA PUSH NOTIFICATIONS ---
class PushSubscription(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    endpoint = db.Column(db.Text, nullable=False)
    p256dh = db.Column(db.String(200), nullable=False)
    auth = db.Column(db.String(200), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)

class Aquarium(db.Model):
    id = db.Column(db.Integer, primary_key=True); name = db.Column(db.String(100), nullable=False)
    aquarium_type = db.Column(db.String(50), nullable=True); volume = db.Column(db.Float, nullable=True)
    setup_date = db.Column(db.Date, nullable=True); description = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=now_br) 
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)

class ParameterLog(db.Model):
    id = db.Column(db.Integer, primary_key=True); aquarium_id = db.Column(db.Integer, db.ForeignKey('aquarium.id', ondelete='CASCADE'), nullable=False)
    date = db.Column(db.DateTime, default=now_br); ph = db.Column(db.Float, nullable=True) 
    ammonia = db.Column(db.Float, nullable=True); nitrite = db.Column(db.Float, nullable=True)
    nitrate = db.Column(db.Float, nullable=True); temperature = db.Column(db.Float, nullable=True)
    notes = db.Column(db.String(200), nullable=True)
    aquarium = db.relationship('Aquarium', backref=db.backref('parameters', lazy=True, cascade="all, delete-orphan"))

class MaintenanceLog(db.Model):
    id = db.Column(db.Integer, primary_key=True); aquarium_id = db.Column(db.Integer, db.ForeignKey('aquarium.id', ondelete='CASCADE'), nullable=False)
    date = db.Column(db.DateTime, default=now_br); maintenance_type = db.Column(db.String(50), nullable=False) 
    description = db.Column(db.String(200), nullable=True)
    aquarium = db.relationship('Aquarium', backref=db.backref('maintenance_logs', lazy=True, cascade="all, delete-orphan"))

class Fauna(db.Model):
    id = db.Column(db.Integer, primary_key=True); aquarium_id = db.Column(db.Integer, db.ForeignKey('aquarium.id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(100), nullable=False); quantity = db.Column(db.Integer, default=1)
    fauna_type = db.Column(db.String(50), default='Peixe')
    aquarium = db.relationship('Aquarium', backref=db.backref('fauna', lazy=True, cascade="all, delete-orphan"))

class EncyclopediaEntry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    content = db.Column(db.Text, nullable=False)
    image_file = db.Column(db.String(200), nullable=True)
    updated_at = db.Column(db.DateTime, default=now_br, onupdate=now_br) 
    last_editor_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    last_editor = db.relationship('User', backref='wiki_edits')

# --- FUNÇÃO AUXILIAR PARA ENVIAR PUSH ---
def send_push_notification(user, title, body, url='/'):
    subs = PushSubscription.query.filter_by(user_id=user.id).all()
    if not subs: return
    
    # Usa a função de limpeza robusta
    pem_key = VAPID_PRIVATE_KEY
    if not pem_key: 
        print("ERRO: VAPID_PRIVATE_KEY não encontrada ou inválida")
        return

    for sub in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth}
                },
                data=json.dumps({"title": title, "body": body, "url": url}),
                vapid_private_key=pem_key,
                vapid_claims={"sub": "mailto:admin@aquanet.app.br"}
            )
        except WebPushException as ex:
            if ex.response and ex.response.status_code == 410:
                db.session.delete(sub)
                db.session.commit()
            print(f"Erro Push: {ex}")

# --- FUNÇÃO CREATE_NOTIFICATION COM EMAIL E PUSH (ATUALIZADA) ---
def create_notification(recipient, action, sender=None, post=None, comment=None):
    if sender and recipient == sender: return
    recipient_id = recipient.id if recipient else None
    sender_id = sender.id if sender else None
    if not recipient_id: return
    
    existing = Notification.query.filter_by(
        recipient_id=recipient_id, sender_id=sender_id, action=action,
        post_id=post.id if post else None, comment_id=comment.id if comment else None, is_read=False
    ).first()
    
    if existing: 
        existing.timestamp = now_br(); existing.count += 1; db.session.commit()
        if action != 'mention': return

    if not existing:
        notif = Notification(recipient_id=recipient_id, sender_id=sender_id, action=action, post_id=post.id if post else None, comment_id=comment.id if comment else None, count=1)
        db.session.add(notif); db.session.commit()

    msg_text = "Nova interação"
    sender_name = sender.username if sender else "AquaNet"
    
    if action == 'mention': msg_text = f"@{sender_name} te marcou em um post"
    elif action == 'comment': msg_text = f"@{sender_name} comentou no seu post"
    elif action == 'reply': msg_text = f"@{sender_name} respondeu seu comentário"
    elif action == 'follow': msg_text = f"@{sender_name} começou a te seguir"
    elif action == 'like_post': msg_text = f"@{sender_name} curtiu seu post"
    elif action == 'like_comment': msg_text = f"@{sender_name} curtiu seu comentário"
    elif action == 'badge': msg_text = f"🏅 Você ganhou a medalha {comment.name}!" # Hack: usando comment para passar o objeto medalha

    target_url = url_for('profile', username=recipient.username, _external=True)
    if post: target_url = url_for('post_detail', post_id=post.id, _external=True)
    
    try:
        send_push_notification(recipient, "AquaNet", msg_text, target_url)
    except Exception as e:
        print(f"Erro ao disparar push: {e}")

    try:
        if action in ['mention', 'comment', 'reply'] and recipient.email:
            subject = f"Nova notificação no AquaNet: {msg_text}"
            msg_body = f"""
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #2563EB; margin-bottom: 20px;">Olá {recipient.username},</h2>
                <p style="font-size: 16px; line-height: 1.5;">
                    <b>@{sender_name}</b> interagiu com você no AquaNet:
                </p>
                <div style="background-color: #f9fafb; padding: 15px; border-left: 4px solid #2563EB; margin: 20px 0; font-style: italic; color: #555;">
                    "{comment.text if comment and hasattr(comment, 'text') else post.content if post else '...'}"
                </div>
                <div style="text-align: center; margin-top: 30px;">
                    <a href="{target_url}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 50px; font-weight: bold; display: inline-block;">Ver Publicação</a>
                </div>
                <p style="text-align: center; margin-top: 30px; font-size: 12px; color: #aaa;">
                    AquaNet - A Rede Social do Aquarismo<br>
                    <a href="{url_for('home', _external=True)}" style="color: #aaa; text-decoration: none;">aquanet.app.br</a>
                </p>
            </div>
            """
            send_email_notification(recipient.email, subject, msg_body)
    except Exception as e:
        print(f"Erro ao enviar email de notificação: {e}")

# --- PROCESSADOR DE MENÇÕES ---
def process_mentions(content, sender, post, comment=None):
    usernames = set(re.findall(r'@([a-zA-Z0-9_]+)', content))
    for username in usernames:
        user = User.query.filter_by(username=username).first()
        if user and user != sender:
            create_notification(user, 'mention', sender, post, comment)

# --- SISTEMA DE GAMIFICAÇÃO ---
def assign_badge(user, slug):
    badge = Badge.query.filter_by(slug=slug).first()
    if badge and badge not in user.badges:
        user.badges.append(badge)
        db.session.commit()
        
        # Cria notificação explícita
        # Usamos o campo 'action' como 'badge' e 'sender' nulo (Sistema)
        msg = f"Você conquistou: {badge.name}"
        # Criamos a notificação manualmente para garantir o texto
        notif = Notification(recipient_id=user.id, action='badge', count=1, timestamp=now_br())
        db.session.add(notif)
        db.session.commit()
        
        # Envia Push (se ativo)
        send_push_notification(user, "Nova Conquista! 🏆", msg, url_for('profile', username=user.username, _external=True))

def check_badges(user):
    # 1. AQUARISTA (Logs de Parâmetros)
    log_count = ParameterLog.query.join(Aquarium).filter(Aquarium.user_id == user.id).count()
    if log_count >= 1: assign_badge(user, 'aquarista-iniciante')
    if log_count >= 10: assign_badge(user, 'aquarista-dedicado')
    if log_count >= 50: assign_badge(user, 'aquarista-master')
    
    # 2. TAGARELA (Comentários)
    comment_count = Comment.query.filter_by(user_id=user.id).count()
    if comment_count >= 5: assign_badge(user, 'tagarela-junior')
    if comment_count >= 50: assign_badge(user, 'tagarela-senior')

    # 3. CRIADOR (Posts)
    post_count = Post.query.filter_by(user_id=user.id).count()
    if post_count >= 1: assign_badge(user, 'criador-conteudo')
    if post_count >= 20: assign_badge(user, 'influenciador')

    # 4. FOTÓGRAFO (Fotos Postadas)
    # Conta quantos posts do usuário têm imagem (image_file não é None)
    photo_count = Post.query.filter_by(user_id=user.id).filter(Post.image_file.isnot(None)).count()
    if photo_count >= 5: assign_badge(user, 'fotografo')

    # 5. COLECIONADOR (Qtd Aquários)
    aqua_count = len(user.aquariums)
    if aqua_count >= 3: assign_badge(user, 'colecionador')

    # 6. POPULAR (Seguidores)
    follower_count = user.followers.count()
    if follower_count >= 10: assign_badge(user, 'popular')

    # 7. VETERANO (Fundador/Primeiros Usuários)
    if user.username == 'bielcosen14' or user.id <= 10:
        assign_badge(user, 'veterano')

with app.app_context():
    db.create_all()

# --- ROTAS ---
@app.route('/login/google')
def login_google():
    if current_user.is_authenticated: return redirect(url_for('home'))
    return oauth.google.authorize_redirect(url_for('auth_google', _external=True))

@app.route('/auth/google')
def auth_google():
    try:
        token = oauth.google.authorize_access_token()
        user_info = oauth.google.get('https://www.googleapis.com/oauth2/v3/userinfo').json()
        google_id = user_info['sub']; google_email = user_info.get('email')
        google_username = google_email.split('@')[0]; profile_pic_url = user_info.get('picture')
        user = User.query.filter_by(google_id=google_id).first()
        if user is None:
            user_by_email = User.query.filter_by(email=google_email).first()
            if user_by_email:
                user_by_email.google_id = google_id
                user_by_email.profile_pic_url = user_by_email.profile_pic_url or profile_pic_url
                db.session.commit(); user = user_by_email
            else:
                base = google_username; count = 1
                while User.query.filter_by(username=google_username).first():
                    google_username = f"{base}_{count}"; count += 1
                user = User(
                    username=google_username, email=google_email,
                    password_hash=bcrypt.generate_password_hash(secrets.token_hex(16)).decode('utf-8'),
                    profile_pic_url=profile_pic_url, google_id=google_id
                )
                db.session.add(user); db.session.commit()
        login_user(user); return redirect(url_for('home'))
    except Exception as e:
        flash(f"Erro Google OAuth: {e}", 'danger'); return redirect(url_for('login'))

@app.route("/register", methods=['GET', 'POST'])
@limiter.limit("5 per hour")
def register():
    if current_user.is_authenticated: return redirect(url_for('home'))
    if request.method == 'POST':
        username = request.form.get('username'); email = request.form.get('email'); password = request.form.get('password')
        if contains_bad_words(username): flash('Nome impróprio.', 'danger'); return redirect(url_for('register'))
        if ' ' in username: flash('Nome sem espaços.', 'danger'); return redirect(url_for('register'))
        if User.query.filter_by(username=username).first(): flash('Nome em uso.', 'danger'); return redirect(url_for('register'))
        if User.query.filter_by(email=email).first(): flash('Email em uso.', 'danger'); return redirect(url_for('register'))
        new_user = User(username=username, email=email, profile_pic_url=f"https://ui-avatars.com/api/?name={username}&background=random&color=fff&size=150")
        new_user.set_password(password); db.session.add(new_user); db.session.commit()
        flash('Conta criada!', 'success'); return redirect(url_for('login'))
    return render_template("register.html")

@app.route('/reset_password', methods=['GET', 'POST'])
def reset_request():
    if current_user.is_authenticated: return redirect(url_for('home'))
    if request.method == 'POST':
        email = request.form.get('email'); user = User.query.filter_by(email=email).first()
        if user: send_reset_email(user, mail)
        flash('Verifique seu email.', 'info'); return redirect(url_for('login'))
    return render_template('reset_request.html', title='Redefinir Senha')

@app.route("/reset_password/<token>", methods=['GET', 'POST'])
def reset_token(token):
    if current_user.is_authenticated: return redirect(url_for('home'))
    user = User.verify_reset_token(token)
    if user is None: flash('Token inválido.', 'danger'); return redirect(url_for('reset_request'))
    if request.method == 'POST':
        password = request.form.get('password'); confirm = request.form.get('confirm_password')
        if password != confirm: flash('Senhas não conferem.', 'danger'); return render_template('reset_token.html', token=token)
        user.set_password(password); db.session.commit()
        flash('Senha alterada!', 'success'); return redirect(url_for('login'))
    return render_template('reset_token.html', token=token)

@app.route("/login", methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated: return redirect(url_for('home'))
    if request.method == 'POST':
        username = request.form.get('username'); password = request.form.get('password')
        user = User.query.filter_by(username=username).first()
        if not user or not user.check_password(password): flash('Login inválido.', 'danger'); return redirect(url_for('login'))
        login_user(user); return redirect(url_for('home'))
    return render_template("login.html")
    
@app.route("/logout")
def logout():
    logout_user(); flash('Tchau!', 'info'); return redirect(url_for('login'))

@app.route("/")
@login_required
def home():
    page = request.args.get('page', 1, type=int)
    posts = Post.query.options(joinedload(Post.author), joinedload(Post.community)).order_by(Post.timestamp.desc()).paginate(page=page, per_page=10)
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest': return render_template('post_list.html', posts=posts, current_community=None)
    subscribed = current_user.joined_communities[:5] if current_user.is_authenticated else []
    return render_template('index.html', posts=posts, communities=Community.query.all(), popular_communities=get_popular_communities(), subscribed_communities=subscribed)

@app.route("/feed")
@login_required
def feed():
    page = request.args.get('page', 1, type=int)
    followed = Post.query.join(followers_table, (Post.user_id == followers_table.c.followed_id)).filter(followers_table.c.follower_id == current_user.id)
    own = Post.query.filter(Post.user_id == current_user.id)
    posts = followed.union(own).order_by(Post.timestamp.desc()).options(joinedload(Post.author), joinedload(Post.community)).paginate(page=page, per_page=10)
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest': return render_template('post_list.html', posts=posts, current_community=None)
    return render_template('feed.html', posts=posts, communities=Community.query.all(), popular_communities=get_popular_communities())

@app.route('/c/<community_slug>', methods=['GET', 'POST'])
@login_required
@limiter.limit("5 per minute", methods=['POST'])
def community_feed(community_slug):
    community = Community.query.filter_by(slug=community_slug).first_or_404()
    if request.method == 'POST':
        if not current_user.is_member(community): flash('Entre na comunidade para postar.', 'warning'); return redirect(url_for('community_feed', community_slug=community.slug))
        content = request.form.get('content'); pic = request.files.get('image')
        if not content or not content.strip(): flash('Vazio.', 'danger'); return redirect(url_for('community_feed', community_slug=community.slug))
        if contains_bad_words(content): flash('Impróprio.', 'danger'); return redirect(url_for('community_feed', community_slug=community.slug))
        last_post = Post.query.filter_by(author=current_user).order_by(Post.timestamp.desc()).first()
        if last_post and last_post.content == content and (now_br() - last_post.timestamp).total_seconds() < 30: flash('Duplicado.', 'warning'); return redirect(url_for('community_feed', community_slug=community.slug))
        img_url = None; img_id = None
        if pic and app.config['CLOUDINARY_API_KEY']:
            try: uploaded = cloudinary.uploader.upload(pic, folder="aquanet_posts", resource_type="auto", transformation=[{'width': 600, 'crop': 'limit', 'quality': 'auto:good', 'fetch_format': 'auto'}]); img_url = uploaded['secure_url']; img_id = uploaded['public_id']
            except: pass
        
        new_post = Post(content=content, author=current_user, image_file=img_url, image_public_id=img_id, community_id=community.id)
        db.session.add(new_post); db.session.commit()
        
        process_mentions(content, current_user, post=new_post)
        
        # CHECAR CONQUISTAS (POST)
        check_badges(current_user)
        
        return redirect(url_for('community_feed', community_slug=community.slug))
    page = request.args.get('page', 1, type=int)
    posts = Post.query.filter_by(community=community).options(joinedload(Post.author), joinedload(Post.community)).order_by(Post.timestamp.desc()).paginate(page=page, per_page=10)
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest': return render_template('post_list.html', posts=posts, current_community=community)
    return render_template('index.html', posts=posts, current_community=community, communities=Community.query.all(), popular_communities=get_popular_communities())

@app.route('/create_community', methods=['GET', 'POST'])
@login_required
def create_community():
    if request.method == 'POST':
        name = request.form.get('name'); description = request.form.get('description')
        if contains_bad_words(name): flash('Nome impróprio.', 'danger'); return redirect(url_for('create_community'))
        slug = Community.generate_slug(name)
        if not slug: flash('Nome inválido.', 'danger'); return redirect(url_for('create_community'))
        if Community.query.filter_by(slug=slug).first(): flash('Já existe.', 'danger'); return redirect(url_for('create_community'))
        new_comm = Community(name=name, slug=slug, description=description, creator=current_user)
        db.session.add(new_comm); current_user.joined_communities.append(new_comm); db.session.commit()
        return redirect(url_for('community_feed', community_slug=slug))
    return render_template('create_community.html')

@app.route('/c/<community_slug>/join', methods=['POST'])
@login_required
def join_community(community_slug):
    community = Community.query.filter_by(slug=community_slug).first_or_404()
    current_user.join_community(community)
    flash(f'Bem-vindo à {community.name}!', 'success')
    return redirect(url_for('community_feed', community_slug=community_slug))

@app.route('/c/<community_slug>/leave', methods=['POST'])
@login_required
def leave_community(community_slug):
    community = Community.query.filter_by(slug=community_slug).first_or_404()
    current_user.leave_community(community)
    flash(f'Saiu de {community.name}.', 'info')
    return redirect(url_for('community_feed', community_slug=community_slug))

@app.route('/c/<community_slug>/delete', methods=['POST'])
@login_required
def delete_community(community_slug):
    community = Community.query.filter_by(slug=community_slug).first_or_404()
    if community.creator_id != current_user.id and current_user.username != 'bielcosen14': flash('Negado.', 'danger'); return redirect(url_for('community_feed', community_slug=community_slug))
    db.session.delete(community); db.session.commit()
    flash('Comunidade apagada.', 'success'); return redirect(url_for('communities_directory'))

@app.route('/profile/<username>')
@login_required
def profile(username):
    user = User.query.filter_by(username=username).first_or_404()
    posts = Post.query.filter_by(author=user).order_by(Post.timestamp.desc()).all()
    # PASSAR TODAS AS MEDALHAS PARA O TEMPLATE
    all_badges = Badge.query.all()
    return render_template('profile.html', user=user, posts=posts, popular_communities=get_popular_communities(), all_badges=all_badges)

@app.route('/edit_profile', methods=['GET', 'POST'])
@login_required
def edit_profile():
    if request.method == 'POST':
        username = request.form.get('username'); email = request.form.get('email'); pic = request.files.get('profile_pic')
        if contains_bad_words(username): flash('Nome impróprio.', 'danger'); return redirect(url_for('edit_profile'))
        if current_user.username != username:
            if User.query.filter_by(username=username).first(): flash('Nome em uso.', 'danger'); return redirect(url_for('edit_profile'))
            current_user.username = username
        if current_user.email != email:
            if User.query.filter_by(email=email).first(): flash('Email em uso.', 'danger'); return redirect(url_for('edit_profile'))
            current_user.email = email
        if pic and pic.filename != '':
            if app.config['CLOUDINARY_API_KEY']:
                try: uploaded = cloudinary.uploader.upload(pic, folder="profile_pics", transformation=[{'width': 150, 'height': 150, 'crop': 'fill', 'gravity': 'face', 'quality': 'auto:good', 'fetch_format': 'auto'}]); current_user.profile_pic_url = uploaded['secure_url']
                except: pass
        db.session.commit(); flash('Atualizado!', 'success'); return redirect(url_for('profile', username=current_user.username))
    return render_template('edit_profile.html')

@app.route('/post/<int:post_id>')
@login_required
def post_detail(post_id):
    post = Post.query.get_or_404(post_id)
    top_level_comments = Comment.query.filter_by(post_id=post.id, parent_id=None).order_by(Comment.timestamp.asc()).all()
    return render_template('post_detail.html', post=post, top_level_comments=top_level_comments, popular_communities=get_popular_communities())

@app.route('/delete_post/<int:post_id>')
@login_required
def delete_post(post_id):
    post = Post.query.get_or_404(post_id); slug = post.community.slug
    if post.user_id != current_user.id and not (post.community.creator_id == current_user.id): flash('Negado.', 'danger'); return redirect(url_for('home'))
    if post.image_public_id and app.config['CLOUDINARY_API_KEY']: cloudinary.uploader.destroy(post.image_public_id)
    db.session.delete(post); db.session.commit(); flash('Apagado.', 'success'); return redirect(url_for('community_feed', community_slug=slug))

@app.route('/delete_comment/<int:comment_id>')
@login_required
def delete_comment(comment_id):
    comment = Comment.query.get_or_404(comment_id)
    if comment.user_id != current_user.id and not (comment.parent_post.community.creator_id == current_user.id) and current_user.username != 'bielcosen14': flash('Negado.', 'danger'); return redirect(request.referrer)
    db.session.delete(comment); db.session.commit(); flash('Apagado.', 'success'); return redirect(request.referrer)

@app.route('/api/like_post/<int:post_id>', methods=['POST'])
@login_required
@limiter.limit("60 per minute")
def api_like_post(post_id):
    post = Post.query.get_or_404(post_id)
    liked = False
    if current_user.has_liked_post(post): current_user.liked_posts.remove(post)
    else: current_user.liked_posts.append(post); liked = True; create_notification(post.author, 'like_post', current_user, post=post)
    db.session.commit()
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest': return jsonify({'success': True, 'liked': liked, 'like_count': len(post.likes)})
    return redirect(request.referrer)

@app.route('/api/post/<int:post_id>/comment', methods=['POST'])
@login_required
@limiter.limit("10 per minute")
def api_add_comment(post_id):
    post = Post.query.get_or_404(post_id)
    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest' or request.is_json
    text = request.get_json().get('comment_text') if request.is_json else request.form.get('comment_text')
    parent_id = request.get_json().get('parent_id') if request.is_json else request.form.get('parent_id')
    
    if not text or not text.strip() or contains_bad_words(text):
        if is_ajax: return jsonify({'success': False, 'error': 'Inválido.'})
        flash('Texto inválido.', 'danger'); return redirect(url_for('post_detail', post_id=post.id))
        
    parent_comment = Comment.query.get(parent_id) if parent_id else None
    new_comment = Comment(text=text.strip(), comment_author=current_user, parent_post=post, parent=parent_comment)
    db.session.add(new_comment); db.session.commit()
    
    # Notificações e Emails
    create_notification(post.author, 'comment', current_user, post=post, comment=new_comment)
    if parent_comment: create_notification(parent_comment.comment_author, 'reply', current_user, post=post, comment=new_comment)
    process_mentions(text, current_user, post=post, comment=new_comment)
    
    # CHECAR CONQUISTAS (COMENTÁRIO)
    check_badges(current_user)
    
    if is_ajax: return jsonify({'success': True, 'comment': {'id': new_comment.id, 'text': new_comment.text, 'author_username': new_comment.comment_author.username, 'author_profile_url': url_for('profile', username=new_comment.comment_author.username)}, 'total_comments': Comment.query.filter_by(post_id=post.id).count()})
    return redirect(url_for('post_detail', post_id=post.id))

@app.route('/api/like_comment/<int:comment_id>', methods=['POST'])
@login_required
@limiter.limit("60 per minute")
def api_like_comment(comment_id):
    comment = Comment.query.get_or_404(comment_id)
    liked = False
    if current_user.has_liked_comment(comment): current_user.liked_comments.remove(comment)
    else: current_user.liked_comments.append(comment); liked = True; create_notification(comment.comment_author, 'like_comment', current_user, post=comment.parent_post, comment=comment)
    db.session.commit()
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest': return jsonify({'success': True, 'liked': liked, 'like_count': len(comment.likes)})
    return redirect(request.referrer)

@app.route('/api/save-subscription', methods=['POST'])
@login_required
def save_subscription():
    data = request.json
    if not data: return jsonify({'success': False})
    
    exists = PushSubscription.query.filter_by(endpoint=data['endpoint']).first()
    if not exists:
        sub = PushSubscription(
            endpoint=data['endpoint'],
            p256dh=data['keys']['p256dh'],
            auth=data['keys']['auth'],
            user_id=current_user.id
        )
        db.session.add(sub)
        db.session.commit()
    
    return jsonify({'success': True})

@app.route('/search')
@login_required
def search():
    q = request.args.get('q'); s = f"%{q}%"
    return render_template(
        'search_results.html', query=q,
        communities_results=Community.query.filter(or_(Community.name.ilike(s), Community.description.ilike(s))).all(),
        encyclopedia_results=EncyclopediaEntry.query.filter(or_(EncyclopediaEntry.title.ilike(s), EncyclopediaEntry.content.ilike(s))).all(),
        posts_results=Post.query.filter(Post.content.ilike(s)).order_by(Post.timestamp.desc()).all(),
        comments_results=Comment.query.filter(Comment.text.ilike(s)).order_by(Comment.timestamp.desc()).all(),
        popular_communities=get_popular_communities()
    )

# --- ENCICLOPÉDIA ---
CATEGORIES_WIKI = {'peixes': 'Peixes', 'plantas': 'Plantas', 'invertebrados': 'Invertebrados', 'aquarios': 'Aquários', 'equipamentos': 'Equipamentos', 'doencas': 'Doenças', 'alimentos': 'Alimentos', 'quimica-da-agua': 'Química da Água'}

@app.route('/encyclopedia')
def encyclopedia():
    return render_template('encyclopedia.html', categories=CATEGORIES_WIKI, popular_communities=get_popular_communities())

@app.route('/encyclopedia/<category_slug>')
def encyclopedia_category(category_slug):
    if category_slug not in CATEGORIES_WIKI: return redirect(url_for('encyclopedia'))
    entries = EncyclopediaEntry.query.filter_by(category=category_slug).order_by(EncyclopediaEntry.title).all()
    return render_template('encyclopedia_category.html', category=CATEGORIES_WIKI[category_slug], entries=entries, popular_communities=get_popular_communities())

@app.route('/encyclopedia/create', methods=['GET', 'POST'])
@login_required
def create_entry():
    if request.method == 'POST':
        title = request.form.get('title').strip(); category = request.form.get('category'); content = request.form.get('content'); pic = request.files.get('image')
        if contains_bad_words(title) or contains_bad_words(content): flash('Impróprio.', 'danger'); return redirect(url_for('create_entry'))
        slug = Community.generate_slug(title)
        if EncyclopediaEntry.query.filter_by(slug=slug).first(): return redirect(url_for('edit_entry', slug=slug))
        img_url = None
        if pic and app.config['CLOUDINARY_API_KEY']:
            try: uploaded = cloudinary.uploader.upload(pic, folder="wiki_images", transformation=[{'width': 800, 'crop': 'limit', 'quality': 'auto:good', 'fetch_format': 'auto'}]); img_url = uploaded['secure_url']
            except: pass
        db.session.add(EncyclopediaEntry(title=title, slug=slug, category=category, content=content, image_file=img_url, last_editor=current_user))
        db.session.commit(); return redirect(url_for('view_entry', slug=slug))
    return render_template('encyclopedia_form.html', categories=CATEGORIES_WIKI, legend="Criar Tópico")

@app.route('/encyclopedia/topic/<slug>')
def view_entry(slug):
    entry = EncyclopediaEntry.query.filter_by(slug=slug).first_or_404()
    return render_template('encyclopedia_topic.html', entry=entry, popular_communities=get_popular_communities())

@app.route('/encyclopedia/edit/<slug>', methods=['GET', 'POST'])
@login_required
def edit_entry(slug):
    entry = EncyclopediaEntry.query.filter_by(slug=slug).first_or_404()
    if request.method == 'POST':
        entry.content = request.form.get('content')
        if contains_bad_words(entry.content): flash('Impróprio.', 'danger'); return redirect(url_for('edit_entry', slug=slug))
        pic = request.files.get('image')
        if pic and app.config['CLOUDINARY_API_KEY']:
            try: uploaded = cloudinary.uploader.upload(pic, folder="wiki_images", transformation=[{'width': 800, 'crop': 'limit', 'quality': 'auto:good', 'fetch_format': 'auto'}]); entry.image_file = uploaded['secure_url']
            except: pass
        entry.last_editor = current_user; db.session.commit()
        return redirect(url_for('view_entry', slug=entry.slug))
    return render_template('encyclopedia_form.html', categories=CATEGORIES_WIKI, entry=entry, legend="Editar")

@app.route('/encyclopedia/delete/<slug>', methods=['POST'])
@login_required
def delete_entry(slug):
    if current_user.username != 'bielcosen14': return redirect(url_for('view_entry', slug=slug))
    entry = EncyclopediaEntry.query.filter_by(slug=slug).first_or_404(); cat = entry.category
    db.session.delete(entry); db.session.commit()
    return redirect(url_for('encyclopedia_category', category_slug=cat))

# --- OUTRAS ROTAS ---
@app.route('/my_aquariums')
@login_required
def my_aquariums(): return render_template('my_aquariums.html', aquariums=current_user.aquariums, popular_communities=get_popular_communities())

@app.route('/create_aquarium', methods=['GET', 'POST'])
@login_required
@limiter.limit("5 per minute", methods=['POST'])
def create_aquarium():
    if request.method == 'POST':
        name = request.form.get('name')
        last_aqua = Aquarium.query.filter_by(owner=current_user, name=name).order_by(Aquarium.created_at.desc()).first()
        if last_aqua and (now_br() - last_aqua.created_at).total_seconds() < 30: flash('Duplicado.', 'warning'); return redirect(url_for('my_aquariums'))
        dt = datetime.datetime.strptime(request.form.get('setup_date'), '%Y-%m-%d').date() if request.form.get('setup_date') else None
        db.session.add(Aquarium(name=name, aquarium_type=request.form.get('aquarium_type'), volume=float(request.form.get('volume') or 0), description=request.form.get('description'), setup_date=dt, owner=current_user))
        db.session.commit(); return redirect(url_for('my_aquariums'))
    return render_template('create_aquarium.html')

@app.route('/aquarium/<int:aquarium_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_aquarium(aquarium_id):
    aqua = Aquarium.query.get_or_404(aquarium_id)
    if aqua.user_id != current_user.id: flash('Negado.', 'danger'); return redirect(url_for('my_aquariums'))
    if request.method == 'POST':
        aqua.name = request.form.get('name'); aqua.aquarium_type = request.form.get('aquarium_type'); aqua.description = request.form.get('description')
        try: aqua.volume = float(request.form.get('volume') or 0)
        except: pass
        if request.form.get('setup_date'): aqua.setup_date = datetime.datetime.strptime(request.form.get('setup_date'), '%Y-%m-%d').date()
        db.session.commit(); flash('Atualizado!', 'success'); return redirect(url_for('my_aquariums'))
    return render_template('create_aquarium.html', aquarium=aqua, legend="Editar")

@app.route('/aquarium/<int:aquarium_id>')
@login_required
def aquarium_dashboard(aquarium_id):
    aqua = Aquarium.query.get_or_404(aquarium_id)
    if aqua.user_id != current_user.id: return redirect(url_for('my_aquariums'))
    return render_template(
        'aquarium_dashboard.html', aquarium=aqua, 
        latest_log=ParameterLog.query.filter_by(aquarium_id=aqua.id).order_by(ParameterLog.date.desc()).first(), 
        latest_maint=MaintenanceLog.query.filter_by(aquarium_id=aqua.id).order_by(MaintenanceLog.date.desc()).first(), 
        history_logs=ParameterLog.query.filter_by(aquarium_id=aqua.id).order_by(ParameterLog.date.desc()).all(), 
        history_maint=MaintenanceLog.query.filter_by(aquarium_id=aqua.id).order_by(MaintenanceLog.date.desc()).all(), 
        share_text="📊 Atualização: " + aqua.name, all_communities=Community.query.order_by(Community.name).all(), popular_communities=get_popular_communities(), today=now_br()
    )

@app.route('/aquarium/<int:aquarium_id>/log_parameters', methods=['GET', 'POST'])
@login_required
def log_parameters(aquarium_id):
    if request.method == 'POST':
        ph = float(request.form.get('ph') or 0); ammonia = float(request.form.get('ammonia') or 0); nitrite = float(request.form.get('nitrite') or 0)
        if ammonia > 0.25 or nitrite > 0.5: flash('🚨 PERIGO! Parâmetros letais. Faça TPA!', 'danger')
        elif ph > 8.5 or (ph < 6.4 and ph > 0): flash('⚠️ Atenção ao pH.', 'warning')
        else: flash('✅ Parâmetros ótimos!', 'success')
        db.session.add(ParameterLog(aquarium_id=aquarium_id, ph=ph, ammonia=ammonia, nitrite=nitrite, nitrate=float(request.form.get('nitrate') or 0), temperature=float(request.form.get('temperature') or 0), notes=request.form.get('notes')))
        db.session.commit()
        
        # CHECAR CONQUISTAS (LOG)
        check_badges(current_user)
        
        return redirect(url_for('aquarium_dashboard', aquarium_id=aquarium_id))
    return render_template('log_parameters.html', aquarium=Aquarium.query.get(aquarium_id))

@app.route('/aquarium/<int:aquarium_id>/log_maintenance', methods=['GET', 'POST'])
@login_required
def log_maintenance(aquarium_id):
    if request.method == 'POST':
        db.session.add(MaintenanceLog(aquarium_id=aquarium_id, maintenance_type=request.form.get('maintenance_type'), description=request.form.get('description')))
        db.session.commit(); return redirect(url_for('aquarium_dashboard', aquarium_id=aquarium_id))
    return render_template('log_maintenance.html', aquarium=Aquarium.query.get(aquarium_id))

@app.route('/aquarium/<int:aquarium_id>/add_fauna', methods=['GET', 'POST'])
@login_required
def add_fauna(aquarium_id):
    if request.method == 'POST':
        db.session.add(Fauna(aquarium_id=aquarium_id, name=request.form.get('name'), fauna_type=request.form.get('fauna_type'), quantity=int(request.form.get('quantity') or 1)))
        db.session.commit(); return redirect(url_for('aquarium_dashboard', aquarium_id=aquarium_id))
    return render_template('add_fauna.html', aquarium=Aquarium.query.get(aquarium_id))

@app.route('/delete_fauna/<int:fauna_id>')
@login_required
def delete_fauna(fauna_id):
    f = Fauna.query.get_or_404(fauna_id); aid = f.aquarium_id; db.session.delete(f); db.session.commit()
    return redirect(url_for('aquarium_dashboard', aquarium_id=aid))

@app.route('/aquarium/<int:aquarium_id>/delete', methods=['POST'])
@login_required
def delete_aquarium(aquarium_id):
    db.session.delete(Aquarium.query.get_or_404(aquarium_id)); db.session.commit(); return redirect(url_for('my_aquariums'))

@app.route('/calculators')
def calculators(): return render_template('calculators.html', popular_communities=get_popular_communities())

@app.route('/notifications')
@login_required
def notifications():
    notifs = current_user.notifications.order_by(Notification.timestamp.desc()).all()
    for n in notifs: n.is_read = True
    db.session.commit(); return render_template('notifications.html', notifications=notifs, popular_communities=get_popular_communities())

@app.route('/communities')
@login_required
def communities_directory(): return render_template('communities_directory.html', communities=Community.query.order_by(Community.name).all(), popular_communities=get_popular_communities())

@app.route('/create_post')
@login_required
def create_post(): return render_template('create_post.html', communities=Community.query.order_by(Community.name).all(), popular_communities=get_popular_communities())

@app.route('/follow/<username>', methods=['POST'])
@login_required
def follow(username):
    user = User.query.filter_by(username=username).first_or_404()
    if user != current_user: current_user.follow_user(user); create_notification(user, 'follow', current_user)
    return redirect(url_for('profile', username=username))

@app.route('/unfollow/<username>', methods=['POST'])
@login_required
def unfollow(username):
    user = User.query.filter_by(username=username).first_or_404(); current_user.unfollow_user(user); return redirect(url_for('profile', username=username))

@app.route('/api/wake_up')
def wake_up():
    try: User.query.first(); return jsonify({'status': 'awake'})
    except Exception as e: return jsonify({'status': 'error', 'details': str(e)}), 500

@app.route('/aquarium/<int:aquarium_id>/sos')
@login_required
def create_post_help(aquarium_id):
    aqua = Aquarium.query.get_or_404(aquarium_id)
    if aqua.user_id != current_user.id: return redirect(url_for('home'))
    log = ParameterLog.query.filter_by(aquarium_id=aqua.id).order_by(ParameterLog.date.desc()).first()
    if not log: flash('Sem dados.', 'info'); return redirect(url_for('aquarium_dashboard', aquarium_id=aqua.id))
    problems = []
    if log.ammonia and log.ammonia > 0.25: problems.append(f"Amônia: {log.ammonia}")
    if log.nitrite and log.nitrite > 0.5: problems.append(f"Nitrito: {log.nitrite}")
    if log.ph and (log.ph > 8.0 or log.ph < 6.4): problems.append(f"pH: {log.ph}")
    content = f"SOCORRO! {', '.join(problems)}. Aquário: {aqua.name} ({aqua.volume}L). Ajuda!"
    return render_template('create_post.html', communities=Community.query.order_by(Community.name).all(), popular_communities=get_popular_communities(), prefilled_content=content)

@app.route('/sw.js')
def service_worker(): return send_from_directory(app.static_folder, 'sw.js')

@app.route('/manifest.json')
def manifest(): return send_from_directory(app.static_folder, 'manifest.json')

@app.route('/icon-512.png')
def app_icon(): return send_from_directory(app.static_folder, 'icon-512.png')

# --- ROTA PARA INICIAR AS MEDALHAS ---
@app.route('/init_badges')
@login_required
def init_badges():
    if current_user.username != 'bielcosen14': return "Acesso negado"
    
    badges_data = [
        {'slug': 'aquarista-iniciante', 'name': 'Aquarista Iniciante', 'desc': 'Registrou o primeiro parâmetro.', 'icon': 'fas fa-vial', 'color': 'green'},
        {'slug': 'aquarista-dedicado', 'name': 'Aquarista Dedicado', 'desc': 'Registrou parâmetros 10 vezes.', 'icon': 'fas fa-flask', 'color': 'teal'},
        {'slug': 'aquarista-master', 'name': 'Aquarista Master', 'desc': 'Registrou parâmetros 50 vezes.', 'icon': 'fas fa-dna', 'color': 'purple'},
        
        {'slug': 'tagarela-junior', 'name': 'Tagarela', 'desc': 'Fez 5 comentários.', 'icon': 'fas fa-comments', 'color': 'blue'},
        {'slug': 'tagarela-senior', 'name': 'Debatedor', 'desc': 'Fez 50 comentários.', 'icon': 'fas fa-bullhorn', 'color': 'orange'},
        
        {'slug': 'criador-conteudo', 'name': 'Criador', 'desc': 'Fez a primeira postagem.', 'icon': 'fas fa-pen-nib', 'color': 'red'},
        {'slug': 'influenciador', 'name': 'Influenciador', 'desc': 'Fez 20 postagens.', 'icon': 'fas fa-star', 'color': 'yellow'},
        
        {'slug': 'fotografo', 'name': 'Fotógrafo', 'desc': 'Postou 5 fotos.', 'icon': 'fas fa-camera', 'color': 'pink'},
        
        {'slug': 'colecionador', 'name': 'Colecionador', 'desc': 'Tem 3 ou mais aquários.', 'icon': 'fas fa-layer-group', 'color': 'cyan'},
        
        {'slug': 'popular', 'name': 'Popular', 'desc': 'Tem 10 seguidores.', 'icon': 'fas fa-crown', 'color': 'indigo'},
        
        {'slug': 'veterano', 'name': 'Veterano', 'desc': 'Membro fundador.', 'icon': 'fas fa-medal', 'color': 'gray'},
    ]
    
    count = 0
    for b in badges_data:
        badge = Badge.query.filter_by(slug=b['slug']).first()
        if not badge:
            db.session.add(Badge(slug=b['slug'], name=b['name'], description=b['desc'], icon=b['icon'], color=b['color']))
            count += 1
        else:
            # Atualiza se já existir (para garantir os nomes novos)
            badge.name = b['name']
            badge.description = b['desc']
            badge.icon = b['icon']
            badge.color = b['color']
    
    db.session.commit()
    return f"Sucesso! {count} medalhas novas criadas e as antigas atualizadas."

@app.route('/update_all_badges')
@login_required
def update_all_badges():
    # Só você pode rodar isso
    if current_user.username != 'bielcosen14': 
        return "Acesso negado", 403
    
    users = User.query.all()
    for user in users:
        check_badges(user)
    
    return f"Sucesso! Medalhas verificadas e entregues para {len(users)} usuários."

if __name__ == '__main__':
    app.run(debug=False)