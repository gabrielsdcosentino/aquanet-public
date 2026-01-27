from app import app, db, Community

def force_update_slug():
    with app.app_context():
        print("--- Iniciando Correção Cirúrgica ---")
        
        # 1. Busca a comunidade pelo NOME (que sabemos que tem acento)
        # Usamos o ilike para ignorar maiúsculas/minúsculas por segurança
        target_name = "Aquário molinésias"
        comm = Community.query.filter(Community.name.ilike(target_name)).first()
        
        if comm:
            print(f"✅ Encontrada: '{comm.name}'")
            print(f"   Dono (ID): {comm.creator_id} (Isso será mantido!)")
            print(f"   Slug Atual (Problemático): '{comm.slug}'")
            
            # 2. Define o novo slug manualmente e corretamente
            new_safe_slug = "aquario-molinesias"
            
            if comm.slug == new_safe_slug:
                print("⚠️ O slug já parece estar correto. Verifique se não é cache do navegador.")
            else:
                comm.slug = new_safe_slug
                try:
                    db.session.commit()
                    print(f"✅ SUCESSO! Slug alterado para: '{new_safe_slug}'")
                    print("   O dono continua o mesmo e a comunidade agora deve abrir.")
                except Exception as e:
                    db.session.rollback()
                    print(f"❌ Erro ao salvar no banco: {e}")
        else:
            print(f"❌ Não encontrei nenhuma comunidade com o nome '{target_name}'.")
            # Tenta listar parecidas para ajudar
            print("   Listando comunidades que contêm 'moli':")
            similars = Community.query.filter(Community.name.like('%moli%')).all()
            for s in similars:
                print(f"   - {s.name} (Slug: {s.slug})")

if __name__ == '__main__':
    force_update_slug()