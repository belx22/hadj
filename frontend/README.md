# Copilote Hadj — Frontend (Afriland First Bank)

Frontend React de la plateforme **Copilote Hadj** : digitalisation de la souscription des
pèlerins au Hadj/Oumra pour la Fenêtre Islamique d'Afriland First Bank Cameroun.

> ⚠️ **Périmètre de cette livraison** : uniquement le frontend. Le backend Spring Boot
> n'est pas encore développé — l'application tourne donc en **mode mock** (données
> simulées en mémoire / `localStorage`), prête à être branchée sur l'API réelle plus tard.

## Stack

- React 18 + Vite (JavaScript)
- React Router 6, Axios
- TailwindCSS (design tokens Afriland : rouge `#C8102E`, noir `#111111`, gris)
- i18next / react-i18next — **Français / Arabe (RTL)**
- Recharts (graphiques du reporting)
- jsPDF / jspdf-autotable (reçus, attestations, rapports PDF côté client)
- SheetJS `xlsx` (export Excel côté client)
- Nginx (image de production)

## Démarrer en local

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

L'application démarre sur http://localhost:5173.

## Démarrer avec Docker

```bash
cd frontend
docker build -t copilote-hadj-frontend .
docker run -p 8081:80 copilote-hadj-frontend
```

L'application est alors servie par Nginx sur http://localhost:8081. Le fichier
`nginx.conf` proxifie déjà `/api/` vers un service `backend:8080` — ce proxy sera actif
dès que le service backend sera ajouté au `docker-compose.yml` (à venir).

## Mode mock (backend non branché)

Tant que `VITE_USE_MOCK=true` (valeur par défaut, voir `.env.example`), toutes les
fonctions de `src/api/*.js` répondent avec des données simulées définies dans
`src/mock/seedData.js` et `src/mock/mockApi.js` (délai réseau simulé, persistance des
bordereaux créés dans `localStorage`). Cela permet de démontrer les 3 modules sans
backend.

**Pour brancher le vrai backend Spring Boot plus tard** :
1. Mettre `VITE_USE_MOCK=false` dans `.env`.
2. Renseigner `VITE_API_BASE_URL` (ex. `http://localhost:8080/api/v1`).
3. Les fonctions de `src/api/*.js` basculeront automatiquement sur les appels Axios
   réels — aucun changement de composant nécessaire, car les pages n'appellent que
   les fonctions de `src/api/*.js`, jamais `mockApi.js` directement.

## Comptes de démonstration

### Espace agent / direction (`/login/staff`)

| Rôle | Identifiant | Mot de passe |
|---|---|---|
| Superviseur | `superviseur` | `superviseur123` |
| Gestionnaire Hadj | `gestionnaire` | `gestionnaire123` |
| Opérateur Hadj | `operateur` | `operateur123` |
| Encadreur | `encadreur1` | `encadreur123` |
| Admin DSI | `admin` | `admin123` |

### Espace pèlerin (`/visa/pelerin`)

Connexion sans mot de passe, par **CNI/Passeport + téléphone**. Exemple de dossier
de démonstration :
- CNI/Passeport : `1002345678`
- Téléphone : `699112233`

(Voir `src/mock/seedData.js` pour la liste complète des dossiers simulés.)

## Structure du projet

```
frontend/
├── src/
│   ├── api/            # Couche d'accès API (bascule mock ↔ backend réel)
│   ├── mock/            # Données de démo + implémentation mock des endpoints
│   ├── i18n/            # fr.json, ar.json, initialisation i18next + RTL
│   ├── assets/           # Logo (placeholder) et illustrations
│   ├── components/
│   │   ├── layout/       # Header, Footer, MainLayout, AuthLayout
│   │   ├── ui/            # Composants UI réutilisables (badges, cartes, etc.)
│   │   └── illustrations/ # SVG arabesques / Kaaba stylisée / arches
│   ├── context/          # AuthContext (agents/encadreurs), PilgrimContext
│   ├── pages/
│   │   ├── auth/          # Choix d'espace, connexion agent
│   │   ├── bordereau/     # Module 1 — saisie et liste des bordereaux
│   │   ├── dashboard/      # Module 2 — reporting temps réel
│   │   ├── visa/           # Module 3 — portail pèlerin & encadreur
│   │   └── audit/          # Journal d'audit (Admin DSI / Superviseur)
│   ├── router/            # Déclaration des routes + garde par rôle
│   └── utils/              # Constantes métier, formatters, validateurs, PDF, Excel
```

## Remplacer le logo

Remplacez `src/assets/logo-afriland.svg` par le logo officiel (même nom de fichier,
ou mettez à jour l'import dans `src/components/layout/Header.jsx` et
`src/components/layout/AuthLayout.jsx` si vous changez de format/nom).

## Ajouter ou modifier des traductions

Toutes les chaînes d'interface sont dans `src/i18n/fr.json` et `src/i18n/ar.json`
(mêmes clés dans les deux fichiers). La bascule RTL est automatique : sélectionner
« AR » dans le sélecteur de langue applique `dir="rtl"` sur `<html>` et charge la
police arabe (`font-arabic`, cf. `tailwind.config.js`).

## Rôles applicatifs

- `SUPERVISEUR` — lecture, export, tableau de bord, audit
- `GESTIONNAIRE_HADJ` — bordereaux, tableau de bord, paramétrage prix officiel
- `OPERATEUR_HADJ` — saisie et liste des bordereaux de son agence
- `ENCADREUR` — portail de suivi de son groupe de pèlerins
- `ADMIN_DSI` — tableau de bord, journal d'audit

Le routage protège chaque page via `src/components/ui/ProtectedRoute.jsx` selon le
rôle de l'utilisateur connecté (`src/router/AppRouter.jsx`).

## Prochaines étapes (backend)

Ce frontend est conçu pour consommer une API REST `/api/v1/...` (Spring Boot) sans
modification de composants : il suffit de désactiver le mode mock (voir plus haut).
Les contrats attendus par page se déduisent des fonctions de `src/api/*.js`.
