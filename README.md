# SUH CONCEPT

Loja em React + Vite no frontend e Express + Prisma no backend.

## Identidade do projeto

Este repositório é exclusivo da `SUH CONCEPT`.

- Loja: `SUH CONCEPT`
- Domínio: `https://suhconcept.com`
- Gateway deste projeto: `PagBank`
- Repositório remoto: `https://github.com/calebesaraiva/suhconcept.git`

Não usar aqui:

- token da ZAYEH
- webhook da ZAYEH
- domínio da ZAYEH
- credenciais Mercado Pago da ZAYEH

## Rodar local

Frontend:

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

Backend:

```bash
cd backend
npm install
npm run dev
```

URLs locais:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:3333/health`

## Build

Frontend:

```bash
npm run build
```

Backend:

```bash
cd backend
npm run build
```

## Produção

Campos importantes para a SUH:

- `PUBLIC_SITE_URL=https://suhconcept.com`
- `PAGBANK_TOKEN`
- `FRONTEND_URL`
- `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`
- `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID` e `APPLE_PRIVATE_KEY`

Webhook do PagBank:

- `https://suhconcept.com/api/payments/pagbank/webhook`
