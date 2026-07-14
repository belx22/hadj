# Déploiement — Copilote Hadj (frontend)

Application React (Vite) servie par Nginx dans un conteneur Docker.
Serveur cible : **http://62.169.26.178:4456**

> Le frontend consomme **exclusivement** le backend Spring Boot : `docker compose`
> démarre PostgreSQL + backend + frontend, et Nginx proxifie `/api/` vers le
> conteneur `backend`. Il n'existe aucun repli en mémoire côté navigateur — sans
> backend joignable, l'interface remonte une erreur réseau.

---

## 1. Prérequis sur le serveur

- Docker Engine + plugin Docker Compose (`docker compose version`)
- L'utilisateur doit pouvoir lancer Docker (membre du groupe `docker`, ou `sudo`)
- Le port **4456** doit être ouvert dans le pare-feu

```bash
# Vérifier Docker
docker --version && docker compose version

# Ouvrir le port 4456 (UFW)
sudo ufw allow 4456/tcp
```

## 2. Récupérer le code

```bash
git clone https://github.com/belx22/hadj.git
cd hadj
# ou, si déjà cloné :
git pull origin master
```

## 3. Configurer l'environnement

```bash
cp .env.example .env
# Penser à changer COPILOTE_JWT_SECRET (et le mot de passe PostgreSQL) en production.
```

Variables (`.env`) :

| Variable              | Valeur par défaut | Rôle                                             |
|-----------------------|-------------------|--------------------------------------------------|
| `FRONTEND_PORT`       | `4456`            | Port exposé sur l'hôte (Nginx écoute sur 80 dans le conteneur) |
| `VITE_API_BASE_URL`   | `/api/v1`         | Base des appels API (figée au build)             |
| `VITE_DEFAULT_LOCALE` | `fr`              | Langue par défaut (fr / en / ar)                 |
| `COPILOTE_JWT_SECRET` | *(à changer)*     | Clé HMAC du JWT backend (≥ 32 caractères)        |
| `COPILOTE_SEED_ENABLED` | `true`          | Injecte le jeu de données initial si la base est vide |

## 4. Build + lancement

```bash
docker compose up --build -d
```

Vérifier :

```bash
docker compose ps
curl -I http://localhost:4456/
```

L'application est alors accessible sur **http://62.169.26.178:4456**.

## 5. Mise à jour (après un nouveau push)

```bash
git pull origin master
docker compose up --build -d   # reconstruit et relance sans downtime notable
```

## 6. Commandes utiles

```bash
docker compose logs -f frontend   # suivre les logs Nginx
docker compose restart frontend   # redémarrer
docker compose down               # arrêter et supprimer le conteneur
docker image prune -f             # nettoyer les anciennes images de build
```

---

## Notes techniques

- **Image multi-étapes** (`frontend/Dockerfile`) : étape 1 `node:20-alpine`
  (build Vite) → étape 2 `nginx:1.27-alpine` (sert `dist/` statique).
- **Healthcheck** intégré : `wget http://localhost:80/` toutes les 30 s.
- **SPA fallback** : toute route inconnue retombe sur `index.html` (React Router).
- **Proxy `/api/`** : résolu au runtime via le resolver DNS interne de Docker
  (`127.0.0.11`) vers le service `backend` (port 8080) du réseau
  `copilote-hadj-network` — Nginx démarre même si le backend n'est pas encore prêt.
