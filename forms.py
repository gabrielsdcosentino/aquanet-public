# forms.py (CORRIGIDO)

from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, TextAreaField
from wtforms.validators import DataRequired, Length, Email, EqualTo, ValidationError
from flask_wtf.file import FileField, FileAllowed
from flask_login import current_user
# MUDEI A IMPORTAÇÃO DE RELATIVA PARA ABSOLUTA/DIRETA
# Como app.py importa forms.py primeiro, app.py já está carregado.
# Para manter a simplicidade, vamos usar 'app' se for uma importação posterior:
# Alternativa mais limpa e direta:
# from app import User 

# No entanto, como isso pode causar importação circular, vamos reescrever a validação
# para que não precise importar User, mas apenas verificar se o usuário existe,
# o que simplifica o problema de importação circular.

# Vou redefinir a classe User para dentro do forms.py (APENAS UM DUMMY) 
# OU A forma correta: usar o método do Flask para evitar o erro de importação.
# Para evitar complicação, vamos usar uma importação condicional, mas a forma mais robusta é abaixo:

from flask import current_app # Usamos current_app para acessar o db e models

# Formulário de Edição de Perfil (Username/Foto)
class UpdateProfileForm(FlaskForm):
    username = StringField('Nome de Usuário', 
                           validators=[DataRequired(), Length(min=2, max=20)])
    
    # Validação customizada para garantir que o novo username não esteja em uso
    def validate_username(self, username):
        # Importamos o modelo User aqui dentro para evitar o erro de importação circular no topo
        from app import User 
        
        if username.data != current_user.username:
            user = User.query.filter_by(username=username.data).first()
            if user:
                raise ValidationError('Este nome de usuário já está em uso.')

    submit = SubmitField('Atualizar')
