# ─── Etapa 1: Build ──────────────────────────────────────────────────────────
# v3 - migrar storage de Firebase a Supabase
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar manifiestos del monorepo
COPY package.json ./
COPY backend/package.json ./backend/
COPY shared/package.json   ./shared/

# Instalar dependencias (solo producción en build final)
RUN npm install --workspace=backend --workspace=shared

# Copiar código fuente
COPY shared/ ./shared/
COPY backend/ ./backend/

# Compilar shared primero, luego backend
RUN mkdir -p /app/shared/dist && (npm run build --workspace=shared || true)
RUN npm run build --workspace=backend && echo "v4-fix-express-types"

# ─── Etapa 2: Runtime ────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Instalar solo dependencias de producción
COPY package.json ./
COPY backend/package.json ./backend/
COPY shared/package.json   ./shared/
RUN npm install --workspace=backend --workspace=shared --omit=dev

# Copiar build compilado
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/shared/dist  ./shared/dist
COPY startup.js ./

# Crear directorio de logs
RUN mkdir -p /app/logs

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD wget -qO- http://localhost:${PORT:-8080}/health || exit 1

EXPOSE 8080

CMD ["node", "startup.js"]
