# Rotación de secretos Tu Repe

Antes del primer despliegue productivo, rotar **todos** estos valores y no reutilizarlos entre entornos:

1. Administrador (email/password + TOTP nuevo via `npm run create-admin`)
2. `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`
3. MySQL `MYSQL_PASSWORD` y `MYSQL_ROOT_PASSWORD`
4. Backblaze `B2_APPLICATION_KEY_ID` / `B2_APPLICATION_KEY` (scope sólo al bucket privado)
5. Cloudinary API key/secret
6. `MEDIA_AUTH_SECRET` y el password Basic de `authHTTPAddress` en MediaMTX
7. Todas las `streamKey` de canchas (`POST /courts/c/:id/rotate-stream-key`)
8. Turnstile secret (el site key puede permanecer público)

Auditar Git, backups e imágenes Docker con secret scanning. `.env` y `mysql_data/` nunca van al repositorio ni se copian de desarrollo al servidor.

Después de rotar JWT, todos los usuarios deben volver a iniciar sesión. Después de rotar una stream key, actualizar la cámara; la anterior deja de publicar.
