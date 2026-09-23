# Matriz de validación staging (Go/No-Go)

Ejecutar en un compose idéntico a producción, sin `node_modules` locales.

| # | Prueba | Resultado | Fecha | Notas |
|---|---|---|---|---|
| 1 | Build/install desde cero y `docker compose -f docker-compose.prod.yml up` | pendiente | | |
| 2 | Migraciones en base vacía y en snapshot anonimizado; backup+restore+rollback | pendiente | | |
| 3 | Mutaciones anónimas = 401; DTO públicos sin streamKey/cameraPath/b2FilePath | pendiente | | |
| 4 | Owner A vs club/cancha B = 403 | pendiente | | |
| 5 | Fuerza bruta login, CAPTCHA, rate limit y CSRF detrás de Caddy (IP real) | pendiente | | |
| 6 | Grabar stream y reiniciar worker en cada etapa de ingestión: un solo video | pendiente | | |
| 7 | Búsqueda con horario no alineado; primer/último fragmento en UTC | pendiente | | |
| 8 | Upload grande + clips inválidos/abortados; RAM/CPU/disco sin huérfanos | pendiente | | |
| 9 | Retención abreviada borra B2+BD; restaurar 72 h | pendiente | | |
| 10 | CI, `npm audit --omit=dev --audit-level=high`, secret scan, smoke Playwright | pendiente | | |
| 11 | Logs redactados; disparar alertas de prueba | pendiente | | |
| 12 | Rotar stream key; la anterior deja de publicar | pendiente | | |

Go sólo si no quedan hallazgos críticos/altos, CI verde, restore probado, monitoreo activo y clubes aceptaron la política de `/privacidad`.
