# Runbook de producción — Tu Repe

## Topología

Una VPS. En la instalación con Nginx, el Nginx del host publica 80/443, sirve el `dist` del frontend y envía `/api/*` a `127.0.0.1:5001`. MediaMTX publica 1935 para las cámaras. API, worker, MySQL y RTSP 8554 quedan en la red Docker interna.

El frontend y la API deben verse desde el navegador bajo el mismo origen. Réplicas: API 1 en esta instalación y worker **exactamente 1**.

## Riesgo residual

La búsqueda pública de partidos no puede impedir por completo que un tercero vea un video si conoce o prueba club, cancha y horario. CAPTCHA, rate limits, UUIDs y URLs firmadas de 5 minutos reducen scraping. Los clubes deben señalizar canchas y aceptar la política de 72 h.

## DNS y firewall

- A/AAAA de `DOMAIN` a la VPS.
- Abrir 22 (restringido por IP), 80, 443 y 1935 (o el puerto de publicación de cámaras).
- No publicar 3306, 3000, 8554 ni métricas.

## Variables

Backend: copiar `.env.example` a `.env` en el servidor y rotar todos los secretos. Para evitar caracteres reservados en la URL interna de MediaMTX, generar `MEDIA_AUTH_SECRET` con `openssl rand -hex 32`. Valores importantes:

```env
NODE_ENV=production
PORT=3000
FRONTEND_ORIGIN=https://turepe.aedestec.com
MYSQL_HOST=mysql
COOKIE_SECURE=true
TRUST_PROXY=1
MEDIA_SERVER_RTSP_BASE_URL=rtsp://mediamtx:8554
```

Compose inyecta `MEDIA_AUTH_SECRET` en MediaMTX mediante `MTX_AUTHHTTPADDRESS`; no se debe escribir el secreto en `deploy/mediamtx.yml`.

Frontend: copiar `.env.production.example` a `.env.production`, completar las URLs de Cloudinary y crear claves Turnstile de producción autorizadas para `turepe.aedestec.com`. El frontend debe usar `VITE_BACKEND_API_URL=/api`.

## Primera instalación con Nginx del host

1. Instalar Docker Engine, el plugin Docker Compose, Nginx, Node.js 22 y Certbot. Clonar `tu-repe` y `tu-repe-frontend` bajo `/var/www/turepe/`.
2. Completar el `.env` del backend y `.env.production` del frontend. No copiar secretos de desarrollo.
3. En el frontend ejecutar `npm ci && npm run build`. Confirmar que existe `/var/www/turepe/tu-repe-frontend/dist/index.html`.
4. En el backend ejecutar `docker build -t tu-repe-api:latest .`.
5. Validar la combinación de Compose:

   ```bash
   docker compose -f docker-compose.prod.yml -f docker-compose.nginx.yml config --quiet
   ```

6. Levantar el stack sin Caddy:

   ```bash
   docker compose -f docker-compose.prod.yml -f docker-compose.nginx.yml up -d --remove-orphans
   ```

7. Copiar `deploy/nginx/turepe.conf.example` a `/etc/nginx/sites-available/tu-repe`, habilitarlo, deshabilitar las configuraciones antiguas que repitan esos `server_name`, ejecutar `sudo nginx -t` y luego `sudo systemctl reload nginx`.
8. Crear el administrador:

   ```bash
   docker compose -f docker-compose.prod.yml -f docker-compose.nginx.yml run --rm \
     -e ADMIN_EMAIL='...' -e ADMIN_PASSWORD='...' \
     api node build/scripts/create-admin.js
   ```

   Guardar el TOTP fuera del servidor.
9. Comprobar `https://turepe.aedestec.com/api/health/live` y `https://turepe.aedestec.com/api/health/ready`.
10. Dar de alta clubes/canchas. Anotar stream keys **una sola vez**. El panel copia URLs con formato `rtmp://turepe.aedestec.com:1935/club_{id}/{streamKey}`.

El despliegue alternativo con Caddy sigue disponible levantando únicamente `docker-compose.prod.yml`, pero no debe usarse mientras Nginx ocupe 80/443.

## Migraciones y rollback

- Antes de migrar: `deploy/backup-mysql.sh`.
- En la primera instalación Compose ejecuta `migrate` antes de iniciar API y worker.
- En cada actualización ejecutar explícitamente:

  ```bash
  docker compose -f docker-compose.prod.yml -f docker-compose.nginx.yml run --rm migrate
  ```

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
- Trabajos `appointment_video_jobs` en `failed_permanently` o `processing` con `locked_at` vencido

## Video unificado

La búsqueda pública encola un MP4 por turno. El worker lo arma con `ffmpeg -c copy` dentro de `/var/videos/appointment-merges` y lo sube a B2. La segunda búsqueda del mismo turno reutiliza ese archivo.

Si faltan fragmentos o la unión falla, la API responde `fallback` y el frontend reproduce las partes. `APPOINTMENT_MERGE_ENABLED=false` detiene trabajos nuevos y el worker, sin borrar los objetos ya generados.

Síntomas de disco lleno: logs `DISK_FULL` o `appointment_merge_retry`, y `/health/ready` puede fallar por espacio. No borrar `/var/videos` completo: ahí también están los fragmentos que todavía no se ingirieron. Solo se pueden eliminar directorios `appointment-merges/job-*` más viejos que el lock (20 minutos por defecto).

Rollback: volver el frontend al flujo `GET /videos/urls` y poner `APPOINTMENT_MERGE_ENABLED=false`. La migración 044 es aditiva.

## Incidentes

1. Deshabilitar temporalmente el `location /api/` de Nginx si hay una fuga.
2. Rotar JWT, cookies y stream keys.
3. Revisar logs redactados (no deberían contener cookies ni URLs firmadas).
4. Comunicar a clubes si un video quedó expuesto más de 72 h.

## No Go

No declarar producción si CI falla, restore no está probado, hay hallazgos altos, o los clubes no aceptaron grabación pública y retención de 72 h.
