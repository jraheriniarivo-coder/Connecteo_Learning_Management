# Mode d'emploi — Connecteo Learning LMS

Bienvenue sur **Connecteo Learning**, votre plateforme de formation, de suivi des compétences et de pilotage pédagogique. Ce guide détaille toutes les options et fonctionnalités disponibles selon votre profil.

---

## 1. Connexion et démarrage initial

### A. Premier démarrage (Configuration Administrateur)
Lors du tout premier lancement de la plateforme (si aucun administrateur n'a encore été configuré) :
1. L'onglet **Premier démarrage** s'affiche automatiquement sur l'écran de connexion.
2. Renseignez votre **Nom complet** (ex. `Dylan`), votre **Adresse email** (ex. `dylan@connecteo.fr`) et choisissez un **Mot de passe** d'au moins 6 caractères.
3. Cliquez sur **Créer l'administrateur et entrer** : votre compte est chiffré côté serveur et vous accédez immédiatement au tableau de bord complet.

*(Option déploiement)* : Vous pouvez également définir la variable d'environnement `ADMIN_PASSCODE` dans les Secrets du serveur pour imposer un code administrateur prédéfini.

### B. Connexion classique
1. Sélectionnez l'onglet **Connexion**.
2. Saisissez votre **Adresse email** et votre **Mot de passe**.
3. En cas d'oubli, cliquez sur **Mot de passe oublié ?** pour afficher les consignes de réinitialisation via votre administrateur.

### C. Inscription Apprenant
1. Sélectionnez l'onglet **Inscription apprenant**.
2. Créez un compte personnel : par sécurité, les comptes auto-inscrits reçoivent automatiquement le rôle **Apprenant** (`staff`).

---

## 2. Barre supérieure (Topbar) & Barre latérale

- **Fil d'Ariane (Breadcrumb)** : Indique à tout moment la rubrique ouverte (`ESPACE FORMATION / ...`).
- **Prévisualiser le rôle** *(réservé aux rôles Administrateur et Management)* :
  Permet de tester l'interface visuelle du point de vue d'un autre rôle (**Management**, **Formateur**, **Manager**, **Apprenant**, **Administrateur**) sans modifier vos droits réels sur le serveur.
- **Sélecteur de langue (`FR` / `EN`)** : Traduit instantanément l'ensemble de la plateforme (menus, KPIs, cours, quiz, tableaux et exports).
- **Notifications (icône cloche)** : Affiche le compteur de notifications non lues (nouvelles affectations, niveaux validés, cours créés) avec un bouton **Tout marquer comme lu**.
- **Menu Profil (Avatar avec initiales)** :
  - Affiche votre nom et votre rôle connecté.
  - Permet d'accéder rapidement aux **Paramètres** ou de cliquer sur **Se déconnecter** (révoque immédiatement votre session sur le serveur).
- **Menu latéral (`•••` en bas à gauche)** : Raccourci rapide vers les paramètres de compte. Sur mobile, utilisez l'icône **Menu (`☰`)** en haut à gauche.

---

## 3. Vue d'ensemble (Tableau de bord)

Accessible depuis **Vue d'ensemble** :
- **Bouton `↓ Exporter les données`** *(Management, Administrateur, Formateur, Manager)* : Télécharge un fichier `.csv` compatible Excel contenant le suivi des apprenants (protégé contre l'injection de formules).
- **Bouton `+ Nouveau cours`** *(Management, Administrateur, Formateur)* : Ouvre le formulaire de création d'un nouveau parcours de formation en 4 modules.
- **Indicateurs clés (KPIs)** *(masqués en vue Apprenant)* :
  - **Apprenants actifs** : Nombre total d'apprenants suivis.
  - **Taux de complétion** : Progression moyenne sur les parcours affectés.
  - **Score moyen** : Moyenne des résultats obtenus aux quiz de validation.
  - **Heures de formation** : Volume horaire cumulé validé.
- **Activité d'apprentissage (Graphique)** : Compare votre complétion mensuelle réelle à l'objectif de `85 %`. Utilisez le menu déroulant pour basculer entre **6 derniers mois** et **3 derniers mois**. Survolez les barres pour voir le détail exact.
- **Priorités de développement** : Affiche l'avancement des compétences clés (*Agilité intellectuelle*, *Relation client d'excellence*, *Sécurité de l'information*) avec un lien **Voir tout →**.
- **Cours à suivre** : Aperçu direct des parcours disponibles avec barre de progression et bouton **Commencer / Continuer / Revoir le cours**.
- **Activité récente** : Tableau récapitulatif des apprenants, progressions, scores et statuts (*En cours*, *Terminé*, *En retard*).

---

## 4. Lecteur de cours interactif (4 niveaux)

En cliquant sur n'importe quel cours :
1. La colonne de gauche liste les **4 niveaux séquentiels** du parcours. Le Niveau 1 est ouvert dès le départ ; les niveaux suivants se débloquent automatiquement dès validation du niveau précédent.
2. La zone principale présente :
   - Le **résumé pédagogique** du niveau et sa durée estimée ;
   - Une **Mise en situation Connecteo** tirée de cas réels ;
   - Une **Vérification des acquis** (QCM interactif).
3. Choisissez vos réponses et cliquez sur **Valider le niveau** :
   - Avec un score supérieur ou égal à **50 %**, le niveau est validé sur le serveur, le niveau suivant est débloqué, vos heures, compétences et KPIs sont mis à jour en direct.
   - En dessous de **50 %**, un message vous invite à relire la mise en situation et réessayer.

---

## 5. Catalogue des cours

Accessible depuis **Catalogue des cours** :
- **Barre de recherche** : Filtre les formations par titre en temps réel.
- **Filtres par statut** : *Tous*, *En cours*, *À commencer*, *Terminés*.
- **Création de parcours (`+ Nouveau cours`)** : Permet aux formateurs et administrateurs d'ajouter un cours bilingue (FR/EN), de le relier à une compétence du référentiel et de nommer ses premiers modules.

---

## 6. Affectations

Accessible depuis **Affectations** :
- **Pour Management / Administrateur / Formateur / Manager** : Formulaire dédié permettant de sélectionner un **Apprenant**, un **Parcours de formation** et une **Date d'échéance**, puis de cliquer sur **Affecter la formation**. Une notification est envoyée à l'apprenant concerné.
- **Pour tous les rôles** : Tableau de suivi des affectations avec statut calculé automatiquement (*En retard* si l'échéance est dépassée et la progression < 100 %) et bouton d'ouverture directe du cours.

---

## 7. Compétences

Accessible depuis **Compétences** :
- Présente le référentiel de compétences Connecteo, le niveau actuel atteint (`Niveau X/4`), la description métier et un raccourci **Ouvrir le parcours associé →** pour progresser directement.

---

## 8. Rapports

Accessible depuis **Rapports** *(réservé aux rôles Management, Administrateur et Manager)* :
- Filtres rapides par statut (*Tous*, *En cours*, *Terminés*, *En retard*).
- Tableau complet incluant apprenant, formation, progression, score, échéance et statut.
- Bouton **Exporter les données** pour télécharger le rapport CSV complet.

---

## 9. Paramètres & Gestion des utilisateurs

Accessible depuis **Paramètres** *(masqué en vue Apprenant)* :
- **Langue de l'interface** : Bascule FR / EN et récapitulatif de votre profil connecté.
- **Sécurité de session active** : Rappel des protections appliquées (mots de passe hachés par `scrypt`, jetons Bearer en mémoire vive, vérification des droits sur chaque route API, protection des exports CSV).
- **Gestion des utilisateurs et rôles** *(Administrateur et Management)* :
  - **Ajouter un utilisateur** : Créez des comptes de test (Formateur, Manager, Management, Apprenant, Administrateur) avec nom, email, mot de passe et rôle.
  - **Modifier un rôle** : Changez le rôle d'un utilisateur via la liste déroulante dans le tableau (le dernier administrateur est protégé contre une rétrogradation accidentelle).

---

## 10. Rappel des permissions par rôle

| Option / Section | Administrateur & Management | Formateur | Manager | Apprenant |
| :--- | :---: | :---: | :---: | :---: |
| Tableau de bord & KPIs globaux | Oui | Oui | Oui | Vue personnelle (KPIs globaux masqués) |
| Créer un cours | Oui | Oui | Non | Non |
| Affecter une formation | Oui | Oui | Oui | Non |
| Suivre les cours & quiz | Oui | Oui | Oui | Oui |
| Rapports & Export CSV | Oui | Export CSV | Oui | Non |
| Gestion des utilisateurs & rôles | Oui | Non | Non | Non |
| Prévisualiser un autre rôle | Oui | Non | Non | Non |
