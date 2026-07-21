# Fiche de tests — Copilote Hadj (Frontend)

| Élément | Valeur |
|---|---|
| **Projet** | Copilote Hadj — Afriland First Bank (Fenêtre Islamique) |
| **Périmètre** | Application frontend React / Vite (`frontend/`) |
| **Type** | Tests automatisés — unitaires, composants et intégration UI |
| **Date d'édition** | 2026-07-21 |
| **Réf. commit** | `3d87beb` |
| **Statut global** | ✅ **206 tests — tous verts** |

---

## 1. Synthèse

- **206 tests** répartis sur **14 fichiers**, exécutés en ~50 s.
- **0 échec, 0 test ignoré.**
- **Couverture de code : 85,4 % des lignes** (objectif ≥ 85 % **atteint**), partie de 61 % au début de la campagne.
- Chaîne d'analyse **SonarQube** validée de bout en bout (80 fichiers analysés, rapport de couverture `lcov` ingéré).

---

## 2. Couverture de code

Mesurée par Vitest (moteur v8), export `lcov` consommé par SonarQube.

| Indicateur | Couverture | Seuil garde-fou (`vitest.config.js`) |
|---|---:|---:|
| **Lignes** | **85,4 %** | 84 % |
| **Instructions (statements)** | **85,4 %** | 84 % |
| **Branches** | **75,8 %** | 74 % |
| **Fonctions** | **74,3 %** | 70 % |

**Exclusions de couverture** (code non pertinent pour le test unitaire, aligné sur la philosophie existante) : `utils/pdf.js` et `utils/excel.js` (wrappers de librairies lourdes jsPDF / xlsx), `QrScannerModal` (caméra), `DashboardPage` (rendu graphique Recharts), `AppRouter` / `MainLayout` (câblage de routage), `main.jsx`, `i18n/**`, et le faux backend de test `src/test/**`.

Les seuils sont placés un cran sous le niveau réel pour absorber la légère variance inter-exécutions (timing asynchrone) sans faux échecs en intégration continue.

---

## 3. Environnement & outillage

| Élément | Détail |
|---|---|
| **Framework de test** | Vitest 2.1 |
| **Rendu / interactions** | @testing-library/react, @testing-library/user-event, jsdom |
| **Couverture** | @vitest/coverage-v8 → rapports `text-summary`, `lcov`, `json-summary` |
| **Source de données de test** | Faux backend axios (`src/test/fakeBackend/`) — adaptateur qui intercepte les appels HTTP et rejoue des données de démonstration, en miroir des contrats du backend Spring Boot |
| **Qualité** | SonarQube v26.6 (clé projet `copilote-hadj-frontend`) |

> **Backend (Spring Boot)** : la logique métier (prix, éligibilité, montants cible/solde, validation des paiements, commissions, rapprochement, dépôts) est **autoritaire côté serveur** et rejouée fidèlement par le faux backend des tests, qui sert de contrat. Elle est en outre vérifiée manuellement à chaque déploiement (santé des conteneurs, scénarios de bout en bout).

### Exécution

```bash
cd frontend
npm test            # exécute la suite (206 tests)
npm run coverage    # suite + rapport de couverture + contrôle des seuils
```

Environnement sans Node local : exécution via l'image de build Docker
`docker run --rm -v <frontend>:/app -v /app/node_modules -w /app hadj-fe-build npm run coverage`.

---

## 4. Inventaire des tests

| Fichier de test | Domaine testé — nombre de cas |
|---|---|
| `validators.test.js` | Règles de validation : téléphone, passeport, bordereau — **11** |
| `formatters.test.js` | Formatage des montants (FCFA) et des dates — **12** |
| `constants.test.js` | Référentiels : régions, types, agences, rôles — **9** |
| `importTemplates.test.js` | Génération des modèles d'import Excel — **5** |
| `qrcode.test.js` | Décodage QR des bordereaux papier — **5** |
| `usePagination.test.js` | Hook de pagination : bornage, reset, tranche — **4** |
| `api.test.js` | Modules API : base URL, jeton, remontée des codes d'erreur — **9** |
| `context.test.jsx` | Contextes Auth / Toast / Pèlerin — **4** |
| `components.test.jsx` | Composants UI : badges, cartes, pagination… — **8** |
| `fakeBackend.test.js` | Contrats métier rejoués : inscriptions, versements, visas, commissions, passeports, audit — **46** |
| `pages.smoke.test.jsx` | Rendu de fumée de toutes les pages — *(it.each)* |
| `pages.flows.test.jsx` | Parcours de bout en bout par page — **5** |
| `pages.interactions.test.jsx` | Interactions par page : portail encadreur, inscription, dépôts… — **21** |
| `pages.coverage.test.jsx` | Couverture des handlers : CRUD, imports fichiers, 2FA, rapprochement… — **40** |
| **Total** | **206 tests (runner)** |

---

## 5. Scénarios fonctionnels couverts

### Authentification & sécurité
- Connexion agent (identifiants valides / invalides).
- **Double authentification (2FA)** : connexion en deux étapes avec code OTP par email, saisie et validation du code.
- Mot de passe oublié : demande d'OTP, validations client (force du mot de passe, concordance) et erreurs serveur (OTP invalide/expiré).
- Garde de route (`ProtectedRoute`) : redirection selon session et rôle.
- Expiration de session (`SessionWatcher`) : déconnexion sur `auth:unauthorized`.

### Souscription & clients
- Inscription d'un client à l'unité (bordereau) et via le **portail encadreur**.
- **Import en masse** de pèlerins depuis un fichier Excel (colonnes FirstName/LastName/Gender/PassportNumber/Encadreur/Telephone) — parsing réel du fichier.
- Vérification anti-doublon et rattachement à l'encadreur par code (par ligne).
- Recherche, filtres (région / encadreur / statut visa) et exports Excel/PDF.

### Paiements
- Déclaration d'un versement (pèlerin et encadreur) ; versement groupé multi-bénéficiaires.
- **Validation** unitaire et **en masse** ; rejet avec motif ; remboursement.
- **Rapprochement bancaire par fichier BI** : validation par « Référence lettrage » **avec contrôle du montant** (montant égal → validé ; écart → signalé sans validation ; référence absente → non trouvée).
- Historique (filtres date/statut, exports) et contrôle anti-réutilisation de référence.

### Passeports & attestations
- Dépôt/annulation **en masse** par sélection (page attestations, staff).
- Dépôt par l'**encadreur** pour son propre groupe (portail pèlerin-encadreur).
- Import des dépôts par fichier ; téléchargement de l'**attestation officielle** de dépôt de passeports.

### Administration & référentiels
- CRUD **utilisateurs** (création selon rôle autorisé, édition, activation/désactivation, import).
- CRUD **encadreurs** (création, édition, statut, import, code sur 3 caractères).
- CRUD **saisons** (création, ouverture/clôture, prix par type, commission).
- **Commissions encadreurs** (places acquises, reliquat, commission due) par saison.
- **Connecteur Power BI** (statistiques et export du jeu de données).

### Suivi visa
- Espace pèlerin : dossier, historique de versements, éligibilité.
- Portail encadreur : suivi du groupe (lecture seule du statut visa) et pagination.

---

## 6. Hors périmètre du test unitaire

Non couverts par les tests unitaires (par nature ou choix explicite d'exclusion) :

- Génération réelle des **PDF** (jsPDF) et **Excel** (xlsx) : effets de téléchargement navigateur, neutralisés en test ; la logique en amont (données passées) est, elle, testée.
- **Scanner QR** (`QrScannerModal`) : accès caméra (`getUserMedia`) indisponible en jsdom.
- **Graphiques** du tableau de bord (Recharts) : nécessitent un vrai layout.
- Câblage de **routage/navigation** global (`AppRouter`, `MainLayout`).
- Envoi **réel** d'emails SMTP : validé séparément lors des déploiements.

---

## 7. Annexe — commandes utiles

```bash
# Suite complète
cd frontend && npm test

# Couverture + seuils
cd frontend && npm run coverage

# Analyse SonarQube (serveur local)
cd frontend
sonar-scanner -Dsonar.host.url=http://localhost:9000 -Dsonar.token=<TOKEN>
```

---

*Fiche générée automatiquement à partir de la suite de tests réelle du dépôt (commit `3d87beb`).*
