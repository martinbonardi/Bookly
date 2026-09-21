# Bookly Support Agent

Bookly is a conversational support and shopping prototype for an online bookstore. It runs as a full support chat at `/` and as a customer-facing chat widget inside a landing page at `/landing`.

## Features

- Responsive book-store chat UI.
- Multi-turn order status and return flows.
- Clarifying questions when intent or required data is missing.
- `search_books`, `get_order_status`, `create_return`, and conversational checkout actions.
- Optional Supabase integration for the catalog, orders, returns, users, carts, checkouts, and conversation history.
- Agent trace showing intent, memory, decision, and response.
- Optional OpenAI Responses API adapter. Without `OPENAI_API_KEY`, the demo uses deterministic replies for reproducible runs.
- Spanish, Portuguese, and English interface and conversation support, including explicit language switching.

## Deliverables

- Solution deck: [`output/Bookly-solution-deck.pptx`](output/Bookly-solution-deck.pptx)
- Trilingual test scenarios based on Supabase data: [`output/pdf/Bookly-test-scenarios-trilingual.pdf`](output/pdf/Bookly-test-scenarios-trilingual.pdf)
- Architecture diagram: [`docs/bookly-agent-flow.svg`](docs/bookly-agent-flow.svg) and [`docs/bookly-agent-flow.md`](docs/bookly-agent-flow.md)
- Requirements validation: [`docs/DELIVERY-CHECKLIST.md`](docs/DELIVERY-CHECKLIST.md)
- Documentation index: [`docs/README.md`](docs/README.md)

## Run locally

Requires Node.js 20 or newer because the project uses `node --env-file` and native `fetch`.

```bash
npm install
npm start
```

Open:

- `http://localhost:3000/` for the support-agent experience.
- `http://localhost:3000/landing` for the bookstore landing page and chat widget.

## One-service deployment

GitHub Pages only serves static files and cannot run `server.mjs`, so it cannot host the complete Bookly experience. The repository includes [`render.yaml`](render.yaml) for a single Render web service that serves the frontend, chat APIs, Supabase integration, OpenAI adapter, and image proxy from one URL.

### Deploy to Render

1. Open [Render Blueprint](https://render.com/deploy?repo=https://github.com/martinbonardi/Bookly).
2. Connect the GitHub repository and create the `bookly` web service.
3. Add `OPENAI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` in Render's environment settings.
4. Deploy. Render runs `npm install`, starts `npm start`, and checks `/api/health`.
5. Open the generated Render URL. The full experience is available at `/` and `/landing`.

The service keeps secrets server-side. Do not place OpenAI or Supabase service-role keys in frontend files.

## Environment variables

Copy `.env.example` to `.env` and replace the placeholder values:

```bash
cp .env.example .env
```

Available variables:

- `OPENAI_API_KEY`: optional; enables the cognitive adapter.
- `OPENAI_MODEL`: optional; defaults to `gpt-4.1-mini`.
- `SUPABASE_URL`: optional; Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: optional and server-only. Never expose it in browser code.

The `/api/health` endpoint reports whether OpenAI and Supabase are configured. Without credentials, the app falls back to deterministic replies and mock data.

The model receives verified context from the orchestration layer. Supabase lookups, order status, return mutations, and checkout persistence are not delegated blindly to the model.

## Supabase setup

Set the server variables before starting the app:

```bash
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
npm start
```

Apply the migrations in this order from the Supabase SQL Editor or with the Supabase CLI:

1. `supabase/migrations/20260918_create_bookly_support_tables.sql`
2. `supabase/migrations/20260918_create_bookly_commerce_tables.sql`

To load the 20-book demonstration catalog:

```bash
node scripts/import-amazon-books.mjs
```

The import script loads titles, authors, genres, prices, stock, covers, and ISBN/ASIN values. Example orders are defined in `supabase/seed/20260918_bookly_orders_examples.sql`.

The conversational checkout asks for a name, email, shipping address, and payment method. It stores the checkout as `payment_pending`; it does not process a real payment.

## Suggested demo

1. Type `Where is my order?` or `¿Dónde está mi pedido?`.
2. With Supabase enabled, reply `BK-1003`; with mock fallback, reply `BK-1042`.
3. Type `Search books` or `Busca libros` and choose a category.
4. Start a new conversation and type `I want to return a book`.
5. With Supabase enabled, reply `BK-1005`; with mock fallback, reply `BK-2098`; then reply `It is damaged`.
6. Press `Buy`, complete the checkout fields, and verify the `payment_pending` status.
7. Switch languages with a flag or type `can we talk in english`.

For the complete test suite, see [`docs/DELIVERY-CHECKLIST.md`](docs/DELIVERY-CHECKLIST.md) and the trilingual PDF.

## Design decisions

- Small explicit orchestrator: intent classification, session memory, tool call, and final response drafting.
- Mock data fallback keeps the demo runnable without credentials.
- Deterministic operational replies reduce unsupported order and payment claims.
- The production roadmap includes authentication, a real payment provider, mutation idempotency, observability, and human handoff.

## Security and prototype limits

- Never commit `.env`, API keys, service-role keys, tokens, or customer data.
- The checkout records `payment_pending`; it does not charge money.
- OpenAI is optional and receives conversation context plus verified tool results.
- Imported book covers use external URLs and may fall back if a source changes.
- Authentication, real payments, and production controls are documented as next steps.

## License and references

This repository is an evaluation prototype. The demonstration catalog is imported from the public Amazon bestsellers page by `scripts/import-amazon-books.mjs`; trademarks and cover images belong to their respective owners. The Bookly architecture, migrations, application code, and documentation are part of this prototype.
