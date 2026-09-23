# Runbook de producción — Tu Repe

## Topología

Una VPS. Caddy publica 80/443. MediaMTX publica 1935 (cámaras). API, worker, MySQL y RTSP 8554 quedan en la red Docker interna.

Réplicas: API N, worker **exactamente 1**.

## Riesgo residual

La búsqueda pública de partidos no puede impedir por completo que un tercero vea un video si conoce o prueba club, cancha y horario. CAPTCHA, rate limits, UUIDs y URLs firmadas de 5 minutos reducen scraping. Los clubes deben señalizar canchas y aceptar la política de 72 h.

## DNS y firewall

- A/AAAA de `DOMAIN` a la VPS.
- Abrir 22 (restringido por IP), 80, 443 y 1935 (o el puerto de publicación de cámaras).
- No publicar 3306, 3000, 8554 ni métricas.

## Variables

Copiar `.env.example` a `.env` en el servidor. Rotar todos los secretos. `FRONTEND_ORIGIN=https://DOMAIN`. `MEDIA_SERVER_RTSP_BASE_URL=rtsp://mediamtx:8554`. Reemplazar `MEDIAMTX_SECRET_PLACEHOLDER` en la URL `authHTTPAddress` de `deploy/mediamtx.yml` por el mismo `MEDIA_AUTH_SECRET`. Si tiene caracteres reservados de URL (`@`, `:`, `/`, `#`, `?`), percent-encodearlos.

## Primera instalación

1. Instalar Docker. Clonar repos. Completar `.env`.
2. `docker build -t tu-repe-api:latest .` en backend.
3. `docker build -t tu-repe-frontend:latest .` en frontend (Vite mode production, sin localhost).
4. `mysqldump` no aplica en vacío. `docker compose -f docker-compose.prod.yml up -d`
5. `docker compose -f docker-compose.prod.yml run --rm api node build/scripts/create-admin.js` con `ADMIN_EMAIL` y `ADMIN_PASSWORD`. Guardar TOTP.
6. Alta de clubes/canchas. Anotar stream keys **una sola vez**. Configurar cámaras RTMP a `rtmp://DOMAIN:1935/club_{id}/{streamKey}`.

## Migraciones y rollback

- Antes de migrar: `deploy/backup-mysql.sh`.
- Compose ejecuta el servicio `migrate` una vez.
- Rollback: restaurar dump (`gunzip -c backup.sql.gz | docker compose exec -T mysql mysql ...`) y redeploy de la imagen anterior.

## Restore de prueba

En staging: crear dump, borrar un club de prueba, restaurar, confirmar que el club vuelve. Documentar fecha del último restore exitoso.

## Rotación de secretos

Ver `docs/SECRETS_ROTATION.md`. Tras rotar JWT todos los usuarios reingresan. Tras rotar stream key, actualizar la cámara; la anterior deja de publicar.

## Cámaras

Admin crea/rota stream key. Nunca listar keys. Si una cámara no publica: verificar path, secret MediaMTX interno y heartbeat del worker.

## Monitoreo y alertas

- `/health/live` API
- `/health/ready` (MySQL + heartbeat worker + disco)
- Disco > 80%
- Jobs `failed_permanently`
- ffmpeg inactivo en horario de club
- Errores B2
- Videos expirados no eliminados (`npm run retention:dry-run` en worker)

## Incidentes

1. Dejar de publicar Caddy `/api` si hay fuga.
2. Rotar JWT, cookies y stream keys.
3. Revisar logs redactados (no deberían contener cookies ni URLs firmadas).
4. Comunicar a clubes si un video quedó expuesto más de 72 h.

## No Go

No declarar producción si CI falla, restore no está probado, hay hallazgos altos, o los clubes no aceptaron grabación pública y retención de 72 h.
