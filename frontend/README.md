# Copilote Hadj — Frontend (Afriland First Bank)

Frontend React de la plateforme **Copilote Hadj** : digitalisation de la souscription des
pèlerins au Hadj/Oumra pour la Fenêtre Islamique d'Afriland First Bank Cameroun.

> ⚠️ **Périmètre de cette livraison** : uniquement le frontend. Le backend Spring Boot
> n'est pas encore développé — l'application tourne donc en **mode mock** (données
> simulées en mémoire / `localStorage`), prête à être branchée sur l'API réelle plus tard.

## Stack

- React 18 + Vite (JavaScript), routes chargées à la demande (`React.lazy`/`Suspense`)
- React Router 6, Axios
- TailwindCSS (design tokens Afriland : rouge `#C8102E`, noir `#111111`, gris)
- i18next / react-i18next — **Français / Arabe (RTL)**
- Recharts (graphiques du reporting)
- jsPDF / jspdf-autotable (reçus, attestations, rapports PDF côté client)
- SheetJS `xlsx` (import/export Excel et CSV côté client)
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

### Option 1 — Docker Compose (recommandé pour un serveur)

Depuis la racine du dépôt (pas depuis `frontend/`) :

```bash
cp .env.example .env   # ajuster FRONTEND_PORT / VITE_* si besoin
docker compose up --build -d
```

L'application est servie par Nginx sur `http://<votre-serveur>:${FRONTEND_PORT}`
(port `33847` par défaut — ex. serveur de démo : http://62.169.26.178:33847). Le
fichier `docker-compose.yml` ne déclare pour l'instant que le service `frontend`, sur
un réseau bridge dédié (`copilote-hadj-network`) prêt à accueillir les services
`backend` et `postgres` lorsqu'ils seront développés.

Commandes utiles :

```bash
docker compose logs -f frontend   # suivre les logs
docker compose down               # arrêter et supprimer le conteneur
```

### Option 2 — `docker build` / `docker run` directs

```bash
cd frontend
docker build -t copilote-hadj-frontend .
docker run -p 8081:80 copilote-hadj-frontend
```

Dans les deux cas, `nginx.conf` proxifie déjà `/api/` vers un service `backend:8080` —
ce proxy sera actif dès que le service backend sera ajouté au `docker-compose.yml`.

## Mode mock (backend non branché)

Tant que `VITE_USE_MOCK=true` (valeur par défaut, voir `.env.example`), toutes les
fonctions de `src/api/*.js` répondent avec des données simulées définies dans
`src/mock/seedData.js` et `src/mock/mockApi.js` (délai réseau simulé, persistance dans
`localStorage`). Cela permet de démontrer l'ensemble des modules sans backend.

Un lien **« Réinitialiser les données de démonstration »** est disponible en pied de
page (mode mock uniquement) pour revenir au jeu de données initial à tout moment.

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

### Espace pèlerin (`/visa/pelerin`, ou auto-inscription via `/inscription`)

Connexion sans mot de passe, par **CNI/Passeport + téléphone**. Exemple de dossier
de démonstration :
- CNI/Passeport : `1002345678`
- Téléphone : `699112233`

(Voir `src/mock/seedData.js` pour la liste complète des dossiers simulés.)

## Fonctionnalités

- **Module 1 — Bordereau agence** : saisie par l'opérateur, calcul automatique du
  montant (prix officiel × nombre de pèlerins, paramétrable par type de pèlerin et par
  saison), anti-doublon CNI/Passeport, reçu PDF.
- **Module 1 bis — Auto-inscription en ligne** (`/inscription`) : le pèlerin s'inscrit
  lui-même, choisit son encadreur, puis reçoit un **code de paiement** (l'identifiant
  du bordereau) à présenter en agence ou pour son suivi.
- **Paiement au compte-goutte** (`/visa/pelerin/paiement`) : versements successifs par
  Mobile Money (Orange/MTN) ou par déclaration d'un paiement en agence (avec upload
  facultatif d'une photo/scan du reçu). Chaque versement reste **en attente** tant
  qu'un agent habilité n'a pas vérifié la référence et le montant ; une même référence
  ne peut être validée qu'une seule fois, tous bordereaux confondus.
- **Suivi du parcours visa** : un stepper (`VisaJourneyStepper`) affiche au pèlerin
  chaque étape (En attente → En cours → Accordé, avec Refusé/Complément requis comme
  embranchements) et la date à laquelle elle a été atteinte.
- **Notifications** : SMS, email et **WhatsApp** (mock, loggés en console) à chaque
  inscription, versement validé/rejeté ou changement de statut visa.
- **Module 2 — Reporting** (`/dashboard`) : KPIs, graphiques (Recharts), filtres,
  export Excel/PDF, alertes de solde insuffisant.
- **Clients** (`/clients`) : liste de tous les pèlerins et leur statut, filtres
  (région, encadreur, statut), vérification d'anomalies façon Power BI (dossiers payés
  mais toujours en attente, versements en attente depuis trop longtemps), import en
  masse de statuts par fichier Excel/CSV.
- **Validation des paiements** (`/paiements`) : file des versements en attente
  (valider/rejeter) + historique filtrable par statut et par période/jour précis.
- **Connecteur Power BI** (`/parametrage/powerbi`) : export du jeu de données détaillé
  par versement, prêt à charger dans Power BI Desktop.
- **Paramétrage** : gestion des encadreurs (CRUD + import Excel/CSV), des utilisateurs
  (CRUD, tous rôles), des saisons Hadj (mois/année + prix par type de pèlerin).
- **Journal d'audit** (`/audit`) : traçabilité des actions sensibles.
- Toutes les listes sont **paginées** (`usePagination` + `Pagination`), les actions
  silencieuses affichent une **notification toast**, et une session expirée (401)
  redirige proprement vers la connexion.

## Structure du projet

```
frontend/
├── src/
│   ├── api/              # Couche d'accès API (bascule mock ↔ backend réel)
│   ├── mock/              # Données de démo + implémentation mock des endpoints
│   ├── i18n/              # fr.json, ar.json, initialisation i18next + RTL
│   ├── assets/             # Logo Afriland (PNG) + icône (SVG) + illustrations
│   ├── components/
│   │   ├── layout/         # Header, Footer, MainLayout, AuthLayout
│   │   ├── ui/              # Composants réutilisables (badges, pagination, toasts,
│   │   │                      stepper de parcours visa, error boundary, etc.)
│   │   └── illustrations/   # SVG arabesques / Kaaba stylisée / arches
│   ├── context/            # Auth, Pilgrim, Toast (contextes React)
│   ├── hooks/               # usePagination, etc.
│   ├── pages/
│   │   ├── auth/            # Choix d'espace, connexion agent
│   │   ├── bordereau/       # Module 1 — saisie et liste des bordereaux
│   │   ├── pilgrim/          # Auto-inscription en ligne
│   │   ├── visa/             # Portail pèlerin (dossier, paiement) & encadreur
│   │   ├── dashboard/         # Module 2 — reporting temps réel
│   │   ├── clients/           # Liste des clients, vérification BI, import statuts
│   │   ├── payments/          # Validation des paiements + historique
│   │   ├── admin/              # Encadreurs, utilisateurs, saisons, Power BI
│   │   └── audit/              # Journal d'audit
│   ├── router/              # Déclaration des routes (lazy) + garde par rôle
│   └── utils/                # Constantes métier, formatters, validateurs, PDF, Excel
```

## Remplacer le logo

Remplacez `src/assets/logo-afriland.png` (logo complet, header/écrans de connexion)
et `src/assets/logo-afriland-icon.svg` (favicon) par les fichiers officiels, en
conservant les mêmes noms, ou mettez à jour les imports dans
`src/components/layout/Header.jsx`, `src/components/layout/AuthLayout.jsx` et
`index.html` si vous changez de nom/format.

## Ajouter ou modifier des traductions

Toutes les chaînes d'interface sont dans `src/i18n/fr.json` et `src/i18n/ar.json`
(mêmes clés dans les deux fichiers). La bascule RTL est automatique : sélectionner
« AR » dans le sélecteur de langue applique `dir="rtl"` sur `<html>` et charge la
police arabe (`font-arabic`, cf. `tailwind.config.js`).

## Rôles applicatifs

- `SUPERVISEUR` — tableau de bord, clients, validation des paiements, Power BI, audit
- `GESTIONNAIRE_HADJ` — bordereaux, tableau de bord, clients, validation des paiements,
  Power BI, paramétrage (encadreurs, utilisateurs, saisons/prix officiels)
- `OPERATEUR_HADJ` — saisie et liste des bordereaux de son agence
- `ENCADREUR` — portail de suivi de son groupe de pèlerins
- `ADMIN_DSI` — tableau de bord, clients, validation des paiements, Power BI,
  paramétrage (encadreurs, utilisateurs), audit

Le routage protège chaque page via `src/components/ui/ProtectedRoute.jsx` selon le
rôle de l'utilisateur connecté (`src/router/AppRouter.jsx`).

## Prochaines étapes (backend)

Ce frontend est conçu pour consommer une API REST `/api/v1/...` (Spring Boot) sans
modification de composants : il suffit de désactiver le mode mock (voir plus haut).
Les contrats attendus par page se déduisent des fonctions de `src/api/*.js`. Le
connecteur Power BI (export manuel) sera remplacé par un flux live (API OData/REST)
une fois le backend disponible.
