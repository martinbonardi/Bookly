# Bookly — checklist de entrega

## Requerimiento original

El PDF `SE Take-Home (1).pdf` solicita un prototipo interactivo con:

- una interacción de varios turnos;
- al menos una herramienta o acción real;
- al menos una pregunta de aclaración;
- un deck de 3–5 diapositivas que explique tesis, arquitectura, decisiones y trade-offs;
- instrucciones para ejecutar el proyecto o una grabación;
- profundidad y claridad de criterio por encima de amplitud superficial.

## Validación final

| Punto | Evidencia | Estado |
|---|---|---|
| Prototipo interactivo | `public/index.html`, `public/app.js`, ruta `/` | Entregado |
| Experiencia landing/chat | `public/landing.html`, `public/landing.js`, ruta `/landing` | Entregado |
| Multi-turno | Estado conversacional, devoluciones, checkout y cambio explícito de idioma | Entregado |
| Herramientas/acciones | Búsqueda de libros, estado de pedido, devoluciones y checkout | Entregado |
| Preguntas de aclaración | Número de pedido, motivo de devolución, categoría y datos de compra | Entregado |
| Compra conversacional | Carrito, registro, checkout y cierre de intención | Entregado |
| Multilingüe | Español, portugués e inglés en interfaz y conversación; cambio explícito durante la sesión | Entregado |
| Memoria/histórico | Historial de conversación y persistencia Supabase | Entregado |
| Motor cognitivo | Adaptador opcional de OpenAI con fallback determinista | Entregado |
| 3–5 slide solution deck | `output/Bookly-solution-deck.pptx` | Delivered |
| Casos de prueba | `info/Bookly-test-scenarios-trilingual.pdf` | Entregado |
| Diagrama de funcionamiento | `docs/bookly-agent-flow.svg` y `.md` | Entregado |
| Run instructions | `README.md` | Entregado |

## Puntos que no bloquean el take-home

Estos puntos quedan documentados como endurecimiento de producción, no como faltantes del prototipo:

- autenticación y gestión completa de cuentas;
- integración con un proveedor de pagos real;
- idempotencia y conciliación de pagos;
- observabilidad, alertas y handoff humano;
- aplicación de migraciones Supabase en el proyecto remoto de destino;
- configuración de secretos exclusivamente mediante variables de entorno.

El checkout actual registra el estado `payment_pending` y no realiza un cobro real. Esto está explicado en el deck y en los escenarios de prueba para evitar presentar una simulación como pago procesado.

## Publicación en GitHub

Desde la raíz del proyecto:

```bash
git status
git add docs info/Bookly-test-scenarios-trilingual.pdf output/Bookly-solution-deck.pptx
git commit -m "docs: add solution deck, tests and architecture flow"
git push origin <branch>
```

No incluir `.env`, claves de OpenAI, tokens ni credenciales en el commit. Publicar únicamente `.env.example` con nombres de variables y valores ficticios.
