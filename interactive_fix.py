from app import app, db, Community
import unicodedata

def generate_safe_slug(name):
    # Mesma lógica do seu app.py atualizado
    nfkd_form = unicodedata.normalize('NFKD', name)
    slug = "".join([c for c in nfkd_form if not unicodedata.combining(c)])
    slug = slug.lower().strip().replace(' ', '-')
    slug = ''.join(c for c in slug if c.isalnum() or c == '-')
    while '--' in slug:
        slug = slug.replace('--', '-')
    return slug.strip('-')

def list_and_fix():
    with app.app_context():
        print("\n=== LISTA DE TODAS AS COMUNIDADES NO BANCO ===")
        communities = Community.query.all()
        
        if not communities:
            print("❌ O banco de dados está vazio! Nenhuma comunidade encontrada.")
            return

        print(f"{'ID':<5} | {'SLUG ATUAL':<30} | {'NOME REAL'}")
        print("-" * 60)
        
        for comm in communities:
            print(f"{comm.id:<5} | {comm.slug:<30} | {comm.name}")
            
        print("-" * 60)
        print("\nOlhe a lista acima. Qual o ID (número da esquerda) da comunidade 'Aquário molinésias'?")
        
        try:
            target_id = int(input("Digite o ID para consertar (ou 0 para sair): "))
        except ValueError:
            print("❌ Por favor, digite apenas números.")
            return

        if target_id == 0:
            print("Saindo...")
            return

        target_comm = Community.query.get(target_id)
        
        if target_comm:
            print(f"\nVocê selecionou: {target_comm.name}")
            new_slug = generate_safe_slug(target_comm.name)
            
            print(f"Slug Antigo: {target_comm.slug}")
            print(f"Novo Slug:   {new_slug}")
            
            confirm = input("Confirmar alteração? (s/n): ")
            if confirm.lower() == 's':
                target_comm.slug = new_slug
                try:
                    db.session.commit()
                    print("✅ SUCESSO! Link corrigido.")
                    print("Reinicie seu servidor (python app.py) para garantir.")
                except Exception as e:
                    db.session.rollback()
                    print(f"❌ Erro ao salvar: {e}")
            else:
                print("Operação cancelada.")
        else:
            print("❌ ID não encontrado.")

if __name__ == '__main__':
    list_and_fix()