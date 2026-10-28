# Despliegue de Tu Repe sin cámaras

Este documento describe el despliegue inicial de Tu Repe en
`turepe.aedestec.com` y cómo habilitar las cámaras más adelante.

## Estado inicial

El servidor tenía MySQL y Adminer en Docker, pero no tenía la API ni el
frontend desplegados. Nginx intentaba servir un directorio `dist` inexistente,
por lo que el sitio devolvía HTTP 500. La configuración separada de la API
apuntaba a `127.0.0.1:5001`, donde no había ningún proceso, y devolvía HTTP 502.

MediaMTX estaba instalado además como servicio de systemd y publicaba los
puertos 1935 y 8554 aunque no hubiera cámaras. Ese servicio se detuvo y
deshabilitó. Adminer también se retiró.

## Topología sin cámaras

- Nginx del host termina TLS y sirve el frontend estático.
- `/api/` se envía a la API en `127.0.0.1:5001`.
- La API y MySQL se ejecutan en Docker.
- El worker y MediaMTX pertenecen al perfil Compose `cameras` y permanecen
  apagados.
- `WORKER_REQUIRED=false` permite que `/health/ready` represente correctamente
  este modo.
- `APPOINTMENT_MERGE_ENABLED=false` evita encolar trabajos de video que no
  podrían procesarse sin worker.

El frontend usa `/api`, de modo que cookies, CORS y CSRF funcionan bajo el
mismo origen: `https://turepe.aedestec.com`.

## Desplegar o actualizar el modo sin cámaras

Desde `/var/www/turepe/tu-repe`:

```bash
docker build -t tu-repe-api:latest .
docker compose -f docker-compose.prod.yml -f docker-compose.nginx.yml \
  run --rm migrate
docker compose -f docker-compose.prod.yml -f docker-compose.nginx.yml \
  up -d --no-deps api
```

No usar `--profile cameras` mientras no haya cámaras. Tampoco iniciar el
servicio systemd histórico `/opt/mediamtx`; el MediaMTX mantenido por el
proyecto es el definido en Compose.

Para construir el frontend:

```bash
cd /var/www/turepe/tu-repe-frontend
npm ci
npm run build
```

El archivo `.env.production` debe contener valores públicos de producción,
incluidos `VITE_BACKEND_API_URL=/api`, el dominio público y la site key de
Turnstile. Nginx sirve el resultado desde `dist/`.

## Verificaciones

```bash
curl -fsS https://turepe.aedestec.com/api/health/live
curl -fsS https://turepe.aedestec.com/api/health/ready
curl -I https://turepe.aedestec.com/
docker compose -f docker-compose.prod.yml -f docker-compose.nginx.yml ps
```

En este modo sólo deben estar activos `mysql` y `api`. Los puertos 1935 y 8554
no deben estar escuchando.

## Habilitar cámaras

Antes de hacerlo:

1. Confirmar que cada club aceptó la política de grabación y retención.
2. Crear un backup de MySQL y probar que puede restaurarse.
3. Verificar espacio en disco, credenciales de B2 y alertas.
4. Cambiar en `.env`:

   ```env
   WORKER_REQUIRED=true
   APPOINTMENT_MERGE_ENABLED=true
   MEDIA_SERVER_RTSP_BASE_URL=rtsp://mediamtx:8554
   ```

5. Mantener cerrada la entrada pública a 8554. Abrir 1935 sólo para las IP de
   las cámaras cuando sea posible.

Construir la imagen y levantar el perfil:

```bash
cd /var/www/turepe/tu-repe
docker build -t tu-repe-api:latest .
docker compose -f docker-compose.prod.yml -f docker-compose.nginx.yml \
  run --rm migrate
docker compose --profile cameras \
  -f docker-compose.prod.yml -f docker-compose.nginx.yml \
  up -d api mediamtx worker
```

El perfil inicia exactamente un worker. Ese proceso contiene:

- scheduler de grabaciones;
- ingestor de segmentos;
- reintentos de subida;
- limpieza y retención;
- generación de videos unificados.

Después de habilitarlo:

```bash
curl -fsS https://turepe.aedestec.com/api/health/ready
docker compose --profile cameras \
  -f docker-compose.prod.yml -f docker-compose.nginx.yml ps
docker compose --profile cameras \
  -f docker-compose.prod.yml -f docker-compose.nginx.yml logs --since=10m worker mediamtx
```

La URL de publicación de cada cámara tiene el formato:

```text
rtmp://turepe.aedestec.com:1935/club_{id}/{streamKey}
```

## Volver al modo sin cámaras

```bash
docker compose --profile cameras \
  -f docker-compose.prod.yml -f docker-compose.nginx.yml stop worker mediamtx
```

Luego restaurar `WORKER_REQUIRED=false` y
`APPOINTMENT_MERGE_ENABLED=false`, y recrear únicamente la API:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.nginx.yml \
  up -d --no-deps --force-recreate api
```

No iniciar el servicio systemd `mediamtx`; debe permanecer deshabilitado para
evitar dos servidores RTMP/RTSP compitiendo por los mismos puertos.
