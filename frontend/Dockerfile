# ── Etapa 1: Build de React ─────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

# ── Etapa 2: Servir con nginx ────────────────────────────────
FROM nginx:alpine

# Copiar el build generado
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuracion de nginx para SPA (React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]