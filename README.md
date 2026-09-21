# Bookly Support Agent

Prototipo para el SE Take-Home: un agente de soporte y compras conversacionales para una librería online ficticia. La aplicación funciona como chat web en `/` y como widget dentro de una landing en `/landing`.

## Qué incluye

- Chat web responsive con estética de tienda de libros.
- Flujo multi-turn para consultar el estado de un pedido.
- Flujo multi-turn para abrir una devolución y generar un caso mock.
- Pregunta de aclaración cuando la intención o el dato clave faltan.
- Herramientas `search_books`, `get_order_status`, `create_return` y checkout conversacional.
- Integración opcional con Supabase para catálogo, pedidos, devoluciones, usuarios, carritos, checkout e histórico.
- Panel `Agent trace` que muestra intención, memoria, decisión y respuesta.
- Adaptador opcional a OpenAI Responses API. Sin `OPENAI_API_KEY`, el demo funciona con respuestas deterministas para que la demo sea reproducible.

## Entregables

- Deck para Decagon: [`output/Bookly-Decagon-solution-deck.pptx`](output/Bookly-Decagon-solution-deck.pptx)
- Escenarios trilingües basados en datos de Supabase: [`output/pdf/Bookly-test-scenarios-trilingual.pdf`](output/pdf/Bookly-test-scenarios-trilingual.pdf)
- Diagrama: [`docs/bookly-agent-flow.svg`](docs/bookly-agent-flow.svg) y [`docs/bookly-agent-flow.md`](docs/bookly-agent-flow.md)
- Validación del take-home: [`docs/DELIVERY-CHECKLIST.md`](docs/DELIVERY-CHECKLIST.md)
- Índice documental: [`docs/README.md`](docs/README.md)

## Ejecutar

Requiere Node.js 20+ porque el proyecto usa `node --env-file` y `fetch` nativo.

```bash
npm install
npm start
```

Abre `http://localhost:3000`.

### Variables de entorno

Copia `.env.example` a `.env` y reemplaza los valores:

```bash
cp .env.example .env
```

Variables disponibles:

- `OPENAI_API_KEY`: opcional; habilita el adaptador LLM.
- `OPENAI_MODEL`: opcional; por defecto `gpt-4.1-mini`.
- `SUPABASE_URL`: opcional; URL del proyecto Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: opcional y solo para servidor. Nunca exponerla en el navegador.

El endpoint `/api/health` indica si OpenAI y Supabase están configurados. Sin credenciales, el demo usa respuestas deterministas y datos mock.

El modelo redacta con contexto verificado por las herramientas; las consultas de Supabase, estados de pedidos, devoluciones y checkout no se delegan ciegamente al modelo.

Para conectar las tablas de Supabase desde el servidor:

```bash
SUPABASE_URL=https://TU_PROJECT_REF.supabase.co \\
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key \\
npm start
```

`SUPABASE_SERVICE_ROLE_KEY` solo debe vivir en el servidor. El bot consulta `bookly_books` para búsquedas, consulta y actualiza `bookly_orders` para estado y devoluciones, guarda usuarios/checkouts y registra cada turno en `bookly_conversation_history`. Si las variables no existen, el demo usa los datos mock incluidos.

Las migraciones reproducibles están en `supabase/migrations/`. Aplica primero `20260918_create_bookly_support_tables.sql` y después `20260918_create_bookly_commerce_tables.sql` desde el SQL Editor de Supabase o con Supabase CLI (`supabase db push`).

Para cargar el catálogo de 20 libros de prueba, configura las variables y ejecuta:

```bash
node scripts/import-amazon-books.mjs
```

El script importa los títulos, autores, géneros, precios, stock, portadas y ASIN/ISBN. Los pedidos de ejemplo están en `supabase/seed/20260918_bookly_orders_examples.sql`. No se versionan credenciales ni datos personales.

El checkout conversacional solicita nombre, email, dirección y método de pago. El carrito se conserva en el navegador y, al completar los datos, el checkout se guarda con estado `payment_pending`; no se procesa ningún cobro real hasta integrar un proveedor de pagos.

La lógica de negocio y las herramientas siguen siendo las fuentes de verdad. El LLM solo redacta la respuesta final con el contexto que recibe.

## Demo sugerida

1. Escribe `¿Dónde está mi pedido?`.
2. Si ejecutas con Supabase, responde `BK-1003`; con fallback mock, responde `BK-1042`.
3. Prueba `Busca libros` y elige una categoría.
4. Reinicia la conversación y escribe `Quiero devolver un libro`.
5. Con Supabase, responde `BK-1005`; con fallback mock, responde `BK-2098`; luego responde `Está dañado`.
6. Pulsa `Comprar`, completa los datos y verifica que el checkout quede `payment_pending`.
7. Cambia el idioma con una bandera o escribiendo explícitamente `can we talk in english`.

Para ejecutar los escenarios completos, consulta [`docs/DELIVERY-CHECKLIST.md`](docs/DELIVERY-CHECKLIST.md) y el PDF trilingüe.

## Decisiones

- Orquestación explícita y pequeña: clasificación de intención, memoria de sesión, tool call y redacción final.
- Datos mock como fallback para mantener el demo ejecutable sin credenciales.
- Respuestas deterministas por defecto para evitar inventar hechos de pedido.
- En producción añadiría autenticación, proveedor de pagos real, idempotencia de mutaciones, observabilidad y handoff humano.

## Seguridad y límites del prototipo

- No subas `.env`, API keys, service-role keys ni tokens.
- El checkout solo registra `payment_pending`; no cobra dinero.
- El adaptador OpenAI es opcional y recibe únicamente contexto de la conversación y herramientas.
- Las portadas del catálogo importado provienen de URLs externas; si una fuente cambia, la interfaz usa fallback visual.
- El flujo está preparado para demo y evaluación; autenticación, pagos reales y controles de producción quedan documentados como siguientes pasos.

## Licencia y referencias

Este repositorio es un prototipo de evaluación. El catálogo de demostración se importa desde la página pública de bestsellers de Amazon mediante `scripts/import-amazon-books.mjs`; las marcas y portadas pertenecen a sus respectivos propietarios. La arquitectura, migraciones y documentación son parte del prototipo Bookly.
