# ─── Etapa 1: Build ──────────────────────────────────────────────────────────
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
RUN npm run build --workspace=backend

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

EXPOSE 8080

CMD ["node", "backend/dist/index.js"]
