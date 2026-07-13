# Copilote Hadj — Backend (Spring Boot + PostgreSQL)

API REST correspondant au frontend React « Copilote Hadj » (Afriland First Bank,
Fenêtre Islamique). Tous les endpoints appelés par le frontend sont implémentés.

## Stack

- Java 17, Spring Boot 3.3 (Web, Data JPA, Security, Validation, Actuator)
- PostgreSQL 16
- Authentification par **JWT** (jjwt), mots de passe **BCrypt**
- Conteneurisé (Dockerfile multi-étapes) + `docker-compose.yml` à la racine du repo

## Contexte & base d'URL

L'API est servie sous `/api/v1` (context-path). Le frontend l'appelle via
`VITE_API_BASE_URL=/api/v1`, proxifié par Nginx (`/api` → `backend:8080`).

## Démarrage full-stack (recommandé)

Depuis la racine du dépôt :

```bash
docker compose up --build -d          # postgres + backend + frontend (mock OFF)
# Frontend :  http://localhost:4456
# API :       http://localhost:4456/api/v1/...
```

Le frontend est alors bâti avec `VITE_USE_MOCK=false` : il consomme le backend
réel. Pour revenir à la démo autonome (mock front, sans backend) :

```bash
VITE_USE_MOCK=true docker compose up -d --no-deps --build frontend
```

## Lancer le backend seul (dev)

```bash
# PostgreSQL requis (docker compose up -d postgres)
cd backend
mvn spring-boot:run
```

Variables d'environnement principales (voir `application.yml`) :

| Variable | Défaut | Rôle |
|---|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/copilote_hadj` | Connexion PostgreSQL |
| `SPRING_DATASOURCE_USERNAME` / `_PASSWORD` | `copilote` / `copilote` | Identifiants BDD |
| `COPILOTE_JWT_SECRET` | (clé de dev) | Clé HMAC du JWT — **à changer en prod** |
| `COPILOTE_JWT_EXPIRATION_MS` | `28800000` (8 h) | Durée du token |
| `COPILOTE_CORS_ORIGINS` | localhost… | Origines autorisées (CSV) |
| `COPILOTE_SEED_ENABLED` | `true` | Injecte le jeu de démo si la base est vide |

## Comptes de démonstration (seed)

| Rôle | Identifiant | Mot de passe |
|---|---|---|
| Admin DSI | `admin` | `admin123` |
| Superviseur | `superviseur` | `superviseur123` |
| Gestionnaire Hadj | `gestionnaire` | `gestionnaire123` |
| Opérateur Hadj | `operateur` | `operateur123` |
| Encadreur | `encadreur1` | `encadreur123` |

Pèlerins de démo : connexion espace pèlerin par CNI + téléphone (ex. `1002345678` / `699112233`).

## Architecture

```
controller/   Endpoints REST (auth, bordereaux, versements, visa, référentiels,
              reporting, attestations, audit)
service/      Logique métier (prix, éligibilité, commissions, versements, visa,
              passeports, reporting) + mapper des champs dérivés
entity/       Entités JPA
repository/   Spring Data JPA
config/       Sécurité JWT + CORS
seed/         Jeu de données de démonstration (CommandLineRunner)
web/          Gestion des erreurs (ApiException + handler global)
```

## Notes

- `ddl-auto=update` : le schéma est créé/mis à jour automatiquement (démo). Pour
  la production, prévoir des migrations (Flyway/Liquibase).
- Les envois SMS/WhatsApp/Email sont *mockés* (journalisés) — brancher les vrais
  fournisseurs dans `NotificationService`.
