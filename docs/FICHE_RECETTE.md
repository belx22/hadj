# Fiche de recette — Copilote Hadj

Cahier de recette fonctionnelle (UAT) des principales fonctionnalités. À remplir par le testeur : colonne **Statut** (OK / KO / NA) et **Commentaire**.

| Rubrique | Valeur |
|---|---|
| **Application** | Copilote Hadj — Afriland First Bank (Fenêtre Islamique) |
| **Environnement de recette** | http://62.169.26.178:33847 |
| **Version / commit** | `3d87beb` |
| **Date de recette** | ……… / ……… / 20……  |
| **Testeur (nom / rôle)** | ……………………………………………… |

**Légende Statut :** OK = conforme · KO = anomalie · NA = non applicable.

**Comptes de démonstration :** superviseur/`superviseur123` · gestionnaire/`gestionnaire123` · operateur/`operateur123` · encadreur1/`encadreur123` · admin/`admin123`.

---

## 1. Authentification & sécurité

| N° | Fonctionnalité | Étapes | Résultat attendu | Statut | Commentaire |
|---|---|---|---|---|---|
| 1.1 | Connexion agent | Saisir un identifiant et mot de passe valides, cliquer « Se connecter » | Accès à l'espace correspondant au rôle | [ ] OK   [ ] KO | |
| 1.2 | Identifiants invalides | Saisir un mot de passe erroné | Message « Identifiant ou mot de passe incorrect », pas d'accès | [ ] OK   [ ] KO | |
| 1.3 | Double authentification (OTP) | SMTP configuré : se connecter, saisir le code reçu par email | Connexion finalisée après saisie du bon code ; code erroné refusé | [ ] OK   [ ] KO | |
| 1.4 | Mot de passe oublié | Demander un code, saisir le code + nouveau mot de passe | Code valable 5 min ; mot de passe réinitialisé ; connexion possible | [ ] OK   [ ] KO | |
| 1.5 | Déconnexion / session expirée | Se déconnecter ; laisser expirer la session | Retour à l'écran de connexion, accès protégé refusé | [ ] OK   [ ] KO | |
| 1.6 | Cloisonnement par rôle | Se connecter avec un rôle donné | Seuls les menus/pages autorisés au rôle sont visibles | [ ] OK   [ ] KO | |

## 2. Inscription des pèlerins

| N° | Fonctionnalité | Étapes | Résultat attendu | Statut | Commentaire |
|---|---|---|---|---|---|
| 2.1 | Inscription à l'unité | Renseigner le formulaire client (nom, prénom, téléphone, passeport, région, encadreur) | Dossier créé, identifiant + mot de passe de suivi générés | [ ] OK   [ ] KO | |
| 2.2 | Anti-doublon | Inscrire un passeport déjà enregistré pour la saison | Blocage avec message « doublon détecté » | [ ] OK   [ ] KO | |
| 2.3 | Import en masse (Excel) | Importer un fichier (FirstName, LastName, Gender, PassportNumber, Encadreur, Telephone) | Pèlerins créés ; encadreur rattaché par code ; lignes en erreur listées | [ ] OK   [ ] KO | |
| 2.4 | Rattachement encadreur par ligne | Import avec des codes encadreurs différents par ligne | Chaque pèlerin rattaché au bon encadreur | [ ] OK   [ ] KO | |
| 2.5 | Portail encadreur | Depuis l'espace encadreur, inscrire un pèlerin de son groupe | Pèlerin ajouté au groupe de l'encadreur | [ ] OK   [ ] KO | |
| 2.6 | Inscription en ligne (pèlerin) | Depuis la page publique d'inscription, soumettre le formulaire | Dossier créé en ligne | [ ] OK   [ ] KO | |

## 3. Paiements

| N° | Fonctionnalité | Étapes | Résultat attendu | Statut | Commentaire |
|---|---|---|---|---|---|
| 3.1 | Déclaration d'un versement | Espace pèlerin/encadreur : déclarer un versement (moyen + référence) | Versement enregistré « en attente de validation » | [ ] OK   [ ] KO | |
| 3.2 | Montant plein obligatoire | Tenter un versement partiel | Refus : le montant doit couvrir la totalité du solde | [ ] OK   [ ] KO | |
| 3.3 | Versement groupé | Déclarer un versement pour plusieurs bénéficiaires | Un versement par bénéficiaire, même référence, groupe identifié | [ ] OK   [ ] KO | |
| 3.4 | Validation unitaire | Gestionnaire : valider un versement en attente | Statut « Validé », montant comptabilisé | [ ] OK   [ ] KO | |
| 3.5 | Validation en masse | Sélectionner plusieurs versements, valider la sélection | Tous validés ; doublons de référence ignorés/signalés | [ ] OK   [ ] KO | |
| 3.6 | Validation d'un paiement groupé | Valider tous les bénéficiaires d'un même groupe | Tous validés (pas de blocage « référence déjà utilisée ») | [ ] OK   [ ] KO | |
| 3.7 | Rejet d'un versement | Rejeter avec un motif | Statut « Rejeté », motif enregistré, pèlerin notifié | [ ] OK   [ ] KO | |
| 3.8 | Remboursement | Traiter un remboursement (visa refusé) | Remboursement enregistré avec moyen et référence | [ ] OK   [ ] KO | |

## 4. Rapprochement bancaire (fichier BI)

| N° | Fonctionnalité | Étapes | Résultat attendu | Statut | Commentaire |
|---|---|---|---|---|---|
| 4.1 | Import de l'extrait BI | Page Validation des paiements : importer le fichier BI | Fichier lu (colonnes « Référence lettrage » + « Montant ») | [ ] OK   [ ] KO | |
| 4.2 | Validation par référence + montant | Ligne dont la référence correspond et le montant est identique | Versement validé automatiquement | [ ] OK   [ ] KO | |
| 4.3 | Écart de montant | Référence correspondante mais montant différent | Versement NON validé, écart signalé (montant déclaré vs banque) | [ ] OK   [ ] KO | |
| 4.4 | Référence absente | Référence du fichier sans versement en attente | Listée en « non trouvée », aucune modification | [ ] OK   [ ] KO | |

## 5. Passeports & attestations

| N° | Fonctionnalité | Étapes | Résultat attendu | Statut | Commentaire |
|---|---|---|---|---|---|
| 5.1 | Dépôt en masse (staff) | Page Attestations : sélectionner des pèlerins, « Marquer déposé » | Statut de dépôt mis à jour pour toute la sélection | [ ] OK   [ ] KO | |
| 5.2 | Sélectionner tout un encadreur | Filtrer par encadreur, tout sélectionner, marquer déposé | Tous les passeports du groupe passés à « déposé » | [ ] OK   [ ] KO | |
| 5.3 | Dépôt par l'encadreur | Portail pèlerin-encadreur : sélectionner ses pèlerins, valider les dépôts | Dépôts enregistrés pour son groupe uniquement | [ ] OK   [ ] KO | |
| 5.4 | Import des dépôts (Excel) | Importer un fichier (N° passeport + Dépôt OUI/NON) | Statuts mis à jour ; lignes non trouvées listées | [ ] OK   [ ] KO | |
| 5.5 | Attestation officielle | Télécharger l'attestation de dépôt du groupe | PDF au modèle officiel (logo, « autorisons à déposer N passeports… ») | [ ] OK   [ ] KO | |

## 6. Administration & référentiels

| N° | Fonctionnalité | Étapes | Résultat attendu | Statut | Commentaire |
|---|---|---|---|---|---|
| 6.1 | Gestion des utilisateurs | Créer / modifier / (dés)activer un utilisateur | Compte géré ; rôles créables limités selon le profil | [ ] OK   [ ] KO | |
| 6.2 | Gestion des encadreurs | Créer / modifier un encadreur (code 3 caractères) | Encadreur enregistré ; code unique contrôlé | [ ] OK   [ ] KO | |
| 6.3 | Gestion des saisons | Créer une saison, définir les prix et la commission | Saison créée ; ouverture/clôture possible | [ ] OK   [ ] KO | |
| 6.4 | Commissions encadreurs | Consulter les commissions par saison | Places acquises, reliquat et commission due corrects | [ ] OK   [ ] KO | |
| 6.5 | Paramètres SMTP | Renseigner hôte/identifiant/mot de passe, enregistrer | Paramètres sauvegardés ; mot de passe jamais réaffiché | [ ] OK   [ ] KO | |
| 6.6 | Import référentiels | Importer utilisateurs / encadreurs par fichier | Lignes créées ; doublons ignorés | [ ] OK   [ ] KO | |

## 7. Suivi, reporting & ergonomie

| N° | Fonctionnalité | Étapes | Résultat attendu | Statut | Commentaire |
|---|---|---|---|---|---|
| 7.1 | Tableau de bord | Ouvrir le tableau de bord | Indicateurs (encaissements, éligibles, par région/encadreur) affichés | [ ] OK   [ ] KO | |
| 7.2 | Connecteur Power BI | Exporter le jeu de données | Fichier .xlsx exporté, exploitable dans Power BI | [ ] OK   [ ] KO | |
| 7.3 | Suivi visa (pèlerin) | Espace pèlerin : consulter dossier, versements, éligibilité | Informations à jour et cohérentes | [ ] OK   [ ] KO | |
| 7.4 | Pagination des listes | Parcourir une liste de plus d'une page | Navigation par page fonctionnelle sur tous les tableaux | [ ] OK   [ ] KO | |
| 7.5 | Multilingue | Basculer FR / EN / AR | Interface traduite ; sens RTL correct en arabe | [ ] OK   [ ] KO | |
| 7.6 | Exports | Exporter une liste en Excel et en PDF | Fichiers générés et conformes | [ ] OK   [ ] KO | |

---

## Bilan de recette

| Élément | Valeur |
|---|---|
| **Nombre de cas testés** | ……… / 41 |
| **Conformes (OK)** | ……… |
| **Anomalies (KO)** | ……… |
| **Non applicables (NA)** | ……… |
| **Décision** | [ ] Recette prononcée    [ ] Recette avec réserves    [ ] Rejetée |

**Réserves / anomalies bloquantes :**

……………………………………………………………………………………………………………………………………

……………………………………………………………………………………………………………………………………

| Rôle | Nom | Date | Signature |
|---|---|---|---|
| Testeur métier | ………………………… | …… / …… / …… | |
| Responsable projet | ………………………… | …… / …… / …… | |
| Validation MOA | ………………………… | …… / …… / …… | |
