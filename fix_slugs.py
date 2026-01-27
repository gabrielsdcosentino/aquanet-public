from app import app, db, Community

def fix_communities():
    with app.app_context():
        print("--- Iniciando verificação de comunidades ---")
        communities = Community.query.all()
        count = 0
        
        for comm in communities:
            # Gera o slug correto baseado no nome atual da comunidade
            # Como você já atualizou o app.py, ele vai usar a lógica nova (sem acentos)
            new_slug = Community.generate_slug(comm.name)
            
            # Se o slug atual for diferente do novo (ex: 'aquário' != 'aquario')
            if comm.slug != new_slug:
                print(f"Corrigindo: '{comm.name}'")
                print(f"   Antigo: {comm.slug}")
                print(f"   Novo:   {new_slug}")
                
                # Verifica se o novo slug já existe em OUTRA comunidade (para evitar erro de duplicidade)
                existing = Community.query.filter_by(slug=new_slug).first()
                if existing and existing.id != comm.id:
                    print(f"   ERRO: O slug '{new_slug}' já está em uso por outra comunidade. Pulando...")
                    continue
                
                comm.slug = new_slug
                count += 1
                print("   [OK] Marcado para atualização.")
                print("-" * 30)

        if count > 0:
            try:
                db.session.commit()
                print(f"\nSUCESSO! {count} comunidades foram atualizadas no banco de dados.")
            except Exception as e:
                db.session.rollback()
                print(f"\nERRO AO SALVAR: {e}")
        else:
            print("\nNenhuma correção foi necessária. Todas as comunidades já estão certas!")

if __name__ == '__main__':
    fix_communities()