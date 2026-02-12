# Deploy Online (Cloudflare Pages)

## 1) Checklist local

```bash
cd "/Users/jeffersonreis/Documents/New project"
npm install
npm run release:check
```

Esperado: build OK e lint sem erros (apenas warnings opcionais).

## 2) Segurança de chaves (obrigatório)

- Nao coloque chave da OpenAI em variavel `VITE_*` em producao.
- Use apenas variavel de servidor no Cloudflare Pages:
  - `OPENAI_API_KEY`
- Se alguma chave foi exposta em testes locais, gere uma nova no provedor antes do deploy.

## 3) Configurar variaveis no Cloudflare Pages

Projeto: `modern-aura` (ou o nome do seu projeto no Pages)

Adicionar em **Settings > Environment variables**:

- `OPENAI_API_KEY` = sua chave valida
- `VITE_SUPABASE_URL` = URL do projeto Supabase
- `VITE_SUPABASE_ANON_KEY` = chave anon public do Supabase
- `VITE_MASTER_EMAIL` = email master (ex: drjeffersonreis@gmail.com)
- (opcional) `AI_PROXY_URL` = URL de proxy externo, se nao quiser usar `functions/api/ai.js`

Repita em:
- `Production`
- `Preview`

## 4) Build e output no Cloudflare

Configurar no Pages:
- Build command: `npm run build`
- Build output directory: `dist`

Ja existe no repo:
- `wrangler.toml` com `pages_build_output_dir = "dist"`
- `functions/api/ai.js` para rota `/api/ai`
- `public/_redirects` para rota `/app/*`

## 5) Deploy

### Opcao A (recomendada): Git integrado no Cloudflare Pages

1. Commit/push para branch de deploy (ex: `main`).
2. Cloudflare faz build automatico.

### Opcao B: CLI

```bash
npx wrangler pages deploy dist --project-name modern-aura
```

## 6) Smoke test apos subir

1. Abrir landing:
   - `https://SEU-DOMINIO/`
2. Abrir app:
   - `https://SEU-DOMINIO/app/`
3. Testar proxy AI:

```bash
curl -i -X POST https://SEU-DOMINIO/api/ai \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Diga ok"}],"max_tokens":5}'
```

Esperado: status `200` e resposta JSON com `choices`.

## 7) Go-live sem risco

- Publicar primeiro em Preview.
- Validar:
  - login
  - lista de mensagens
  - CRM drag-and-drop
  - resposta sugerida IA
  - envio de audio
- So depois promover para Production.

## 8) Fase 2 Multi-tenant (obrigatorio para SaaS com isolamento)

1. No Supabase SQL Editor, execute:
   - `supabase/migrations/20260212_phase2_multitenant.sql`
2. Confirme as tabelas:
   - `tenants`
   - `tenant_memberships`
   - `user_profiles`
3. Confirme RLS ativado nas tres tabelas.
4. Faça deploy da `main` novamente para ativar bootstrap de tenant no app.
