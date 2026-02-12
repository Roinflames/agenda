# Cloudflare (DNS + SSL) para Render

1. En Cloudflare DNS crea `CNAME`:
- `app` -> `boxmagic-web.onrender.com`
- `api` -> `boxmagic-api.onrender.com`

2. En Render, agrega Custom Domains:
- `app.tu-dominio.com` en el servicio web
- `api.tu-dominio.com` en el servicio api

3. SSL/TLS:
- Deja Cloudflare en Full (strict) si Render emite cert valido.
- Activa WAF/basics (opcional): rate limiting y reglas simples.

