from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from sqlalchemy.orm import joinedload

# Importa o banco e as tabelas diretamente do seu app.py
from app import db, Post, Community, User, PostImage

# Cria o agrupador de rotas com o prefixo oficial
api_bp = Blueprint('api', __name__, url_prefix='/api/v1')

@api_bp.route('/feed', methods=['GET'])
@login_required
def api_feed():
    page = request.args.get('page', 1, type=int)
    
    # Busca os posts mais recentes, igual à rota do site
    posts_query = Post.query.options(
        joinedload(Post.author), 
        joinedload(Post.community)
    ).order_by(Post.timestamp.desc()).paginate(page=page, per_page=10)
    
    # Converte os objetos do banco em dicionários puros
    posts_data = []
    for post in posts_query.items:
        # Verifica as mídias da tabela unificada PostImage
        media_list = []
        for img in post.images:
            media_list.append({
                'url': img.image_file,
                'is_video': bool('.mp4' in img.image_file.lower() or '.mov' in img.image_file.lower() or '/video/' in img.image_file.lower())
            })
            
        posts_data.append({
            'id': post.id,
            'content': post.content,
            'timestamp': post.timestamp.isoformat(),
            'author': {
                'id': post.author.id,
                'username': post.author.username,
                'profile_pic_url': post.author.profile_pic_url
            },
            'community': {
                'slug': post.community.slug,
                'name': post.community.name
            },
            'media': media_list,
            'likes_count': len(post.likes),
            'comments_count': len(post.comments),
            'liked_by_me': current_user.has_liked_post(post)
        })
    
    return jsonify({
        'posts': posts_data,
        'has_next': posts_query.has_next,
        'current_page': page
    })

@api_bp.route('/communities', methods=['GET'])
@login_required
def api_communities():
    communities = Community.query.order_by(Community.name).all()
    comms_data = []
    for c in communities:
        comms_data.append({
            'id': c.id,
            'name': c.name,
            'slug': c.slug,
            'description': c.description,
            'initials': c.name[:2].upper()
        })
    return jsonify({'communities': comms_data})