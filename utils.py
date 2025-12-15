# utils.py (VERSÃO 76.3 - REMOÇÃO DE create_notification)

from flask_mail import Message
from flask import current_app, url_for
from sqlalchemy import func

# Removida importação global para evitar ciclo e contexto ruim.

def get_popular_communities():
    from app import app, db, Community, Post
    from sqlalchemy import func

    with app.app_context():
        results = (
            db.session.query(Community, func.count(Post.id).label('post_count'))
            .join(Post, Community.id == Post.community_id, isouter=True)
            .group_by(Community.id)
            .order_by(db.desc('post_count'))
            .limit(5)
            .all()
        )

    return [c[0] for c in results]


def send_reset_email(user, mail_app):
    token = user.get_reset_token()
    
    sender_address = f"AquaNet <{current_app.config['MAIL_USERNAME']}>" 

    msg = Message(
        'Redefinição de Senha',
        sender=sender_address, 
        recipients=[user.email]
    )

    msg.body = f'''Para redefinir sua senha, clique no link:
{url_for('reset_token', token=token, _external=True)}

Se você não solicitou isso, ignore o e-mail.
O link expira em 30 minutos.
'''

    try:
        mail_app.send(msg)
    except Exception as e:
        print(f"ERRO AO ENVIAR EMAIL: {e}")
