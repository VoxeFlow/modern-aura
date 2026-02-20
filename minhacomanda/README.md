# MinhaComanda (MVP)
SaaS multi-tenant para bares e restaurantes com pedido por QR Code, chamado da equipe e pagamento via Pix.

Domínio alvo: `minhacomanda.pro`

## Stack
- Frontend: Next.js (App Router) + TypeScript + Tailwind CSS
- Backend: Supabase (Postgres + Auth + Realtime)
- Notificações: Telegram Bot API
- Pix: Mercado Pago (com fallback por chave Pix estática)
- Deploy: Cloudflare Workers (OpenNext) + opção Docker Compose (Next.js em container, Supabase externo)

## Escopo implementado (MVP)
- Cliente sem login:
  - `/m/[qrToken]` cardápio por mesa
  - `/m/[qrToken]/cart` carrinho + observações + envio de pedido
  - `/m/[qrToken]/order/[orderId]` status com atualização automática e pagamento Pix
  - botão “Chamar garçom” (Atendimento, Pedir conta, Outro)
- Admin com Supabase Auth:
  - `/admin/login`
  - `/admin` resumo de pedidos/chamados (com Supabase Realtime)
  - `/admin/menu` CRUD simples de categorias e produtos
  - `/admin/tables` CRUD de mesas + download de QR PNG
  - `/admin/orders` lista/filtro + atualização de status
  - `/admin/settings` dados básicos, Telegram e Pix
- API routes (server-side):
  - menu público, criação/consulta de pedido, chamado, Pix, webhooks Telegram e Pix
- Multi-tenant:
  - isolamento por `restaurant_id`
  - RLS habilitado em todas as tabelas
  - leitura pública do cliente feita via API server-side (sem leitura direta anon das tabelas)

## Estrutura principal
```text
src/
  app/
    admin/
    api/
    m/
  components/
    admin/
    client/
  lib/
  services/
supabase/
  migrations/
  seed.sql
scripts/
  seed-demo.mjs
```

## Variáveis de ambiente
Copie `.env.example` para `.env.local` (dev) e `.env` (docker/prod):

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
PIX_PROVIDER=mercadopago
PIX_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_SECRET=
APP_BASE_URL=http://localhost:3000
```

## Setup Supabase (produção ou dev remoto)
1. Crie o projeto no Supabase.
2. No SQL Editor, execute a migration:
   - `supabase/migrations/20260219170000_initial_schema.sql`
3. Execute seed demo (opcional):
   - `supabase/seed.sql`
   - ou via script: `npm run seed:demo`
4. Crie um usuário admin em Auth (email/senha).
5. Vincule o usuário ao restaurante:

```sql
insert into public.admin_users (restaurant_id, auth_user_id, role)
values ('11111111-1111-1111-1111-111111111111', '<UUID_DO_AUTH_USER>', 'owner');
```

## RLS (resumo)
- RLS habilitado em todas as tabelas do domínio.
- Políticas admin: acesso apenas para usuários autenticados vinculados em `admin_users` ao `restaurant_id`.
- Rotas públicas do cliente não usam leitura direta com anon key para dados do restaurante; usam API server-side com validação de `qr_token`.

## Telegram
1. Crie bot via `@BotFather` e pegue o token (`TELEGRAM_BOT_TOKEN`).
2. Adicione o bot no grupo/canal do restaurante.
3. Descubra `chat_id` e salve em `/admin/settings` (`telegram_chat_id`).
4. Configure webhook:

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://minhacomanda.pro/api/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

Webhook espera header `x-telegram-bot-api-secret-token`.

## Pix (Mercado Pago)
1. Configure no `.env`:
   - `PIX_PROVIDER=mercadopago`
   - `PIX_ACCESS_TOKEN=<token de produção ou sandbox>`
   - `MERCADOPAGO_WEBHOOK_SECRET=<secret de assinatura do webhook>`
2. Configure webhook no Mercado Pago para:
   - `https://minhacomanda.pro/api/pix/webhook`
3. Quando aprovado:
   - `orders.payment_status` -> `paid`
   - `orders.status` -> `closed`

### Fallback Pix (sem credenciais)
Se `PIX_PROVIDER`/`PIX_ACCESS_TOKEN` não estiverem ativos, o sistema usa fallback:
- mostra “Pix copia e cola” com `restaurants.pix_key`
- instrução para apresentar comprovante
- mantém fluxo de “chamar garçom”

## Rodando local
```bash
npm install
cp .env.example .env.local
npm run dev
```

Acesse:
- Cliente demo: `http://localhost:3000/m/demo-table-1`
- Admin: `http://localhost:3000/admin/login`

## Testes e qualidade
```bash
npm run lint
npm run test
npm run build
```

## Deploy online no Cloudflare (recomendado)
Este projeto já está preparado com:
- `wrangler.jsonc`
- `open-next.config.ts`
- scripts `build:cf`, `preview:cf`, `deploy:cf`

### 1) Login no Cloudflare
```bash
npx wrangler whoami
```

Se não estiver autenticado:
```bash
npx wrangler login
```

### 2) Configure variáveis no ambiente de deploy
Opção rápida (local): exporte no shell antes do deploy:

```bash
export NEXT_PUBLIC_SUPABASE_URL="..."
export NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
export SUPABASE_SERVICE_ROLE_KEY="..."
export TELEGRAM_BOT_TOKEN="..."
export TELEGRAM_WEBHOOK_SECRET="..."
export PIX_PROVIDER="mercadopago"
export PIX_ACCESS_TOKEN="..."
export MERCADOPAGO_WEBHOOK_SECRET="..."
export APP_BASE_URL="https://minhacomanda.pro"
```

Ou configure no dashboard Cloudflare (Workers > Settings > Variables and Secrets), usando os mesmos nomes.

### 3) Build e deploy
```bash
npm run deploy:cf
```

Se quiser testar local no runtime do Workers:
```bash
npm run preview:cf
```

### 4) Domínio
- No Worker `minhacomanda-pro`, associe rota/domínio customizado `minhacomanda.pro`.
- Após subir domínio, atualize:
  - `APP_BASE_URL=https://minhacomanda.pro`
  - webhook Telegram para `https://minhacomanda.pro/api/telegram/webhook`
  - webhook Pix para `https://minhacomanda.pro/api/pix/webhook`

## Deploy com Docker Compose (Hetzner)
1. Suba o código na VPS.
2. Crie `.env` com variáveis de produção.
3. Build e start:

```bash
docker compose up -d --build
```

4. Coloque um reverse proxy (Nginx/Caddy) para TLS e domínio `minhacomanda.pro` apontando para `:3000`.

## Endpoints
### Públicos
- `GET /api/public/menu?qrToken=...`
- `POST /api/public/order/create`
- `GET /api/public/order/get?qrToken=...&orderId=...`
- `POST /api/public/waiter/call`
- `POST /api/pix/create-charge`

### Webhooks
- `POST /api/telegram/webhook`
- `POST /api/pix/webhook`

## Tabelas
- `restaurants`
- `admin_users`
- `tables`
- `categories`
- `products`
- `orders`
- `order_items`
- `waiter_calls`
- `order_events`

## Fluxo ponta-a-ponta em 10 minutos
1. Rode migration + seed.
2. Crie usuário no Auth e vincule em `admin_users`.
3. Faça login em `/admin/login`.
4. Confira cardápio em `/admin/menu` e mesas em `/admin/tables`.
5. Abra `/m/demo-table-1` no celular e faça pedido.
6. Valide pedido em `/admin/orders`.
7. Clique “Chamar garçom” no cliente e valide no `/admin`.
8. Configure `telegram_chat_id` e valide notificações no Telegram.
9. Clique “Pagar com Pix” no pedido:
   - com provider real: gera QR e webhook fecha pagamento.
   - sem provider: usa fallback de chave Pix.

## Plano de commits/PRs lógicos
1. `chore: bootstrap nextjs + tooling + docker`
2. `feat(db): supabase schema + rls + seed`
3. `feat(api): public order/menu/waiter + telegram webhook`
4. `feat(payment): pix provider interface + mercadopago + fallback`
5. `feat(client): fluxo mesa (menu, carrinho, status, waiter call)`
6. `feat(admin): login + dashboard + menu/tables/orders/settings`
7. `test/docs: testes unitários + readme operacional`

## Definition of Done (MVP)
- [x] 1) Admin consegue logar e configurar mesas e cardápio.
- [x] 2) QR abre cardápio, cliente faz pedido e acompanha status.
- [x] 3) Restaurante recebe pedido no Telegram e atualiza status por botões.
- [x] 4) Cliente chama garçom/pede conta e restaurante recebe aviso.
- [x] 5) Cliente paga via Pix (real ou fallback).
- [x] 6) Multi-tenant com RLS + isolamento por `restaurant_id`.
- [x] 7) Projeto sobe via Docker Compose com documentação completa.
