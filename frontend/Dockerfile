# --- Étape 1 : build de l'application React (Vite) ---
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Variables d'environnement injectées au build (Vite les fige dans le bundle).
ARG VITE_API_BASE_URL=/api/v1
# Le backend est déployé avec le frontend (docker compose) : on consomme l'API
# réelle. Le mock reste une option de démo autonome (build-arg à "true").
ARG VITE_USE_MOCK=false
ARG VITE_DEFAULT_LOCALE=fr
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_USE_MOCK=$VITE_USE_MOCK
ENV VITE_DEFAULT_LOCALE=$VITE_DEFAULT_LOCALE

RUN npm run build

# --- Étape 2 : image de production servie par Nginx ---
FROM nginx:1.27-alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# On cible 127.0.0.1 (et non localhost) : dans le conteneur, "localhost" peut
# résoudre en IPv6 ::1 alors que Nginx n'écoute qu'en IPv4 (listen 80),
# ce qui ferait échouer le healthcheck ("connection refused").
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
