# ⚡ CYBERSTRIKE // PROTOCOL

> **Fondation technique propre et modulaire pour un jeu FPS multijoueur 3D Cyberpunk.**  
> Développé avec **React + TypeScript + Vite**, **Three.js (React Three Fiber)**, **Firebase** et **Photon Realtime**.

---

## 🎯 Architecture & Stack Technique

| Technologie | Rôle dans le projet |
| :--- | :--- |
| **Vite + React + TypeScript** | Environnement moderne, typage strict et performances maximales |
| **Three.js + @react-three/fiber + @react-three/drei** | Moteur de rendu 3D WebGL (scènes, arène, shaders, particules) |
| **Firebase (Firestore + Auth anonyme)** | Persistance des données joueur (monnaie, crédits, skins débloqués, statistiques) |
| **Photon Realtime (SDK JS)** | Couche réseau multijoueur temps réel (lobbies, synchronisation des tirs, positions) |
| **Tailwind CSS + Lucide Icons + Motion** | Interface utilisateur Cyberpunk Néon (noir/bleu nuit, accents cyan/magenta) |
| **Web Audio API** | Effets sonores procéduraux rétro-futuristes sans dépendances mp3 externes |

---

## 📁 Arborescence Détaillée du Projet

```text
├── .env.example                # Modèle des variables d'environnement
├── netlify.toml                # Configuration prête pour déploiement Netlify
├── index.html                  # Point d'entrée HTML avec typographies Cyberpunk
├── metadata.json               # Métadonnées du projet
├── package.json                # Dépendances et scripts de build
├── tsconfig.json               # Configuration TypeScript
├── vite.config.ts              # Configuration Vite & Tailwind
│
├── src/
│   ├── assets/                 # Données de référence et définitions d'armes / cartes
│   │   └── placeholderData.ts  # Arsenal (Railgun, Plasma...), cartes d'arène
│   │
│   ├── components/             # Composants d'interface utilisateur Cyberpunk
│   │   ├── GameHUD.tsx         # Affichage tête haute FPS (Crosshair, HP, Munitions, Hitmarkers)
│   │   ├── MobileControls.tsx  # Contrôles tactiles complets (Joystick, Visée, Tir, Saut, Sprint, Switch)
│   │   ├── LoadingScreen.tsx   # Écran de boot / chargement avec barres animées
│   │   ├── MainMenu.tsx        # Menu principal (Play, Arsenal, Stats, Settings)
│   │   ├── LobbyModal.tsx      # Recherche et création de salons Photon Realtime
│   │   ├── LoadoutModal.tsx    # Personnalisation des armes et skins (Firestore)
│   │   ├── StatsModal.tsx      # Registre de combat & rangs de joueur
│   │   ├── SettingsModal.tsx   # Réglages audio, FOV, sensibilité et diagnostic clés
│   │   └── StatusPill.tsx      # Badges d'état réseau et Firebase
│   │
│   ├── config/
│   │   ├── gameConfig.ts       # Nom du jeu, version, thèmes et réglages par défaut
│   │   └── weaponsConfig.ts    # Architecture modulaire des armes (catalogue extensible)
│   │
│   ├── net/                    # Couche Réseau & Persistance
│   │   ├── firebaseConfig.ts   # Configuration Firebase (à remplir avec vos clés)
│   │   ├── firebaseService.ts  # Service Auth anonyme & collections Firestore
│   │   ├── photonConfig.ts     # Configuration Photon Realtime (à remplir avec votre App ID)
│   │   └── photonClient.ts     # Gestionnaire client Photon (salons, événements, ping)
│   │
│   ├── scenes/                 # Scènes 3D Three.js (React Three Fiber)
│   │   ├── SceneManager.tsx    # Orchestration du Canvas 3D selon l'écran actif
│   │   ├── FPSController.tsx   # Contrôleur Joueur 1ère personne (WASD, saut, sprint, raycast)
│   │   ├── WeaponViewmodel.tsx # Arme 3D (Pistolet laser, recul, muzzle flash, inertie souris)
│   │   ├── TestArenaMap.tsx    # Carte d'arène fermée (murs, obstacles, drones cibles)
│   │   ├── testMapData.ts      # Colliders AABB et positionnement des cibles
│   │   ├── MainMenuScene.tsx   # Cœur cybernétique holographique, anneaux et grille
│   │   ├── LobbyScene.tsx      # Podiums 3D d'attente pour coéquipiers
│   │   └── GameScene.tsx       # Scène d'arène 3D tactique de combat
│   │
│   ├── systems/                # Systèmes sous-jacents du jeu
│   │   ├── audioSystem.ts      # Synthétiseur d'effets sonores Web Audio (tirs laser, impacts, sauts, pas)
│   │   ├── inputSystem.ts      # Gestionnaire d'entrées clavier (ZQSD/WASD), souris & Pointer Lock
│   │   ├── inventorySystem.ts  # Gestionnaire de skins et d'arsenal
│   │   └── statsSystem.ts      # Calculateur K/D, taux de victoires et rangs MMR
│   │
│   ├── types/                  # Définitions TypeScript globales
│   │   ├── fps.ts              # Types de l'arme FPS, stats de combat et effets
│   │   ├── game.ts             # Profil joueur, skins, stats, réglages
│   │   └── network.ts          # Salons Photon, paquets d'événements, états réseau
│   │
│   ├── App.tsx                 # Composant racine orchestrant l'application
│   ├── main.tsx                # Point de montage React
│   └── index.css               # Styles globaux Tailwind et effets néon/scanlines
```

---

## 🚀 1. Lancement du Projet en Local

### Prérequis
- **Node.js** version 18 ou supérieure
- **npm** (inclus avec Node.js)

### Étapes d'installation

1. **Cloner ou ouvrir le projet dans votre terminal :**
   ```bash
   cd chemin/vers/le/projet
   ```

2. **Installer les dépendances :**
   ```bash
   npm install
   ```

3. **Lancer le serveur de développement Vite :**
   ```bash
   npm run dev
   ```

4. **Accéder à l'application :**  
   Ouvrez votre navigateur sur **`http://localhost:3000`** (ou l'adresse affichée par le terminal).

> 💡 **Mode Démo Immédiat :** L'application fonctionne **immédiatement**, même avant d'avoir configuré vos clés Firebase ou Photon ! Un système de simulation local prend le relais de façon transparente.

---

## 🔑 2. Configuration de Firebase (Données Joueur)

Firebase gère l'**authentification anonyme** (permettant à chaque visiteur d'avoir un compte unique sans formulaire de connexion) et **Cloud Firestore** pour la sauvegarde de ses crédits, skins et statistiques.

### Étape par étape :
1. Rendez-vous sur la console Google Firebase : [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Créez un nouveau projet (ex: `cyberstrike-fps`).
3. Dans le menu de gauche :
   - Cliquez sur **Build > Authentication** -> **Get Started** -> **Sign-in method** -> Activez **Anonymous (Anonyme)**.
   - Cliquez sur **Build > Firestore Database** -> **Create database** -> Choisissez l'emplacement le plus proche (ex: `europe-west`).
4. Dans les paramètres du projet (**Project Settings ⚙️**), ajoutez une application Web (`</>`) pour obtenir vos clés.
5. Deux méthodes pour renseigner vos clés :

#### Méthode A : Via le fichier de configuration séparé
Éditez directement le fichier `src/net/firebaseConfig.ts` :
```typescript
export const firebaseConfig: FirebaseClientConfig = {
  apiKey: "AIzaSyVotreCleApiReelle...",
  authDomain: "cyberstrike-fps.firebaseapp.com",
  projectId: "cyberstrike-fps",
  storageBucket: "cyberstrike-fps.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef...",
};
```

#### Méthode B : Via variables d'environnement (.env)
Copiez `.env.example` en `.env` :
```bash
cp .env.example .env
```
Et remplissez les variables `VITE_FIREBASE_*`.

---

## 🌐 3. Configuration de Photon Realtime (Multijoueur)

Photon Realtime gère la synchronisation en temps réel, le matchmaking et les salles de jeu.

### Étape par étape :
1. Créez un compte gratuit sur [https://dashboard.photonengine.com/](https://dashboard.photonengine.com/).
2. Sur le tableau de bord, cliquez sur **"Create a new App"**.
3. Sélectionnez le type : **Photon Realtime**.
4. Donnez un nom à votre jeu (ex: `Cyberstrike`).
5. Copiez l'**App ID** généré (suite de 36 caractères).
6. Renseignez l'App ID dans `src/net/photonConfig.ts` ou dans votre `.env` :
   ```env
   VITE_PHOTON_APP_ID="votre-app-id-ici"
   VITE_PHOTON_REGION="eu"
   ```

---

## ☁️ 4. Builder et Déployer sur Netlify

Le projet inclut déjà un fichier **`netlify.toml`** préconfiguré pour router automatiquement toutes les routes SPA vers `index.html`.

### Méthode 1 : Déploiement Automatique via Git (Recommandée)

1. Poussez votre code sur **GitHub**, **GitLab** ou **Bitbucket**.
2. Connectez-vous sur [https://app.netlify.com/](https://app.netlify.com/).
3. Cliquez sur **"Add new site"** > **"Import an existing project"**.
4. Sélectionnez votre dépôt Git. Netlify détecte automatiquement :
   - **Build command :** `npm run build`
   - **Publish directory :** `dist`
5. Dans **Site configuration > Environment variables**, ajoutez vos clés de production :
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_PHOTON_APP_ID`
   - `VITE_PHOTON_REGION`
6. Cliquez sur **Deploy site**. Votre FPS est en ligne avec HTTPS automatique !

### Méthode 2 : Déploiement Manuel via Netlify CLI

Si vous préférez déployer depuis votre terminal sans lier de dépôt Git :

1. Installez Netlify CLI :
   ```bash
   npm install -g netlify-cli
   ```
2. Buildez le projet en local :
   ```bash
   npm run build
   ```
3. Déployez le dossier `dist` en production :
   ```bash
   netlify deploy --prod --dir=dist
   ```

---

## 🔫 5. Système d'Armes Modulaire (`src/config/weaponsConfig.ts`)

Le jeu dispose d'un système d'armes piloté par les données (Data-Driven Architecture). Pour ajouter une 4e, 5e ou 8e arme au jeu :
- Ajoutez simplement un nouvel objet dans `WEAPONS_CATALOG` dans **`src/config/weaponsConfig.ts`**.
- Le modèle 3D paramétrique, les sons synthétisés, l'UI du HUD, les munitions, le réticule et le rechargement s'adaptent **automatiquement** sans toucher au code du contrôleur.

### Armes incluses :
1. **VOLT-9 SUB-PLASMA** (Touche `1`) : Mitraillette SMG foudroyante (750 RPM, 32 munitions, rechargement 0.85s, plasma rose néon).
2. **PHOTON RIFLE MK-II** (Touche `2`) : Fusil d'assaut à impulsions équilibré (375 RPM, 20 munitions, 34 dégâts, laser cyan).
3. **NOVA-X RAILGUN** (Touche `3`) : Fusil de précision électromagnétique (90 dégâts / 270 en critique, rayon rémanent or électrique).

### Commandes Clavier & Souris (Desktop) :
- **Touches [ZQSD] ou [WASD]** : Déplacements du joueur
- **Souris** : Orientation de la caméra / Visée (Pointer Lock)
- **Clic Gauche** : Tirer (avec cadence, recul et dispersion propres)
- **Touche [R]** : Recharger (durée adaptée à l'arme)
- **Touches [1], [2], [3]** ou **Molette** : Changement direct d'arme
- **Maj / Shift** : Sprint | **Espace** : Saut | **Échap** : Pause & Sensibilité

### 📱 Contrôles Mobiles & Tactiles Dédiés :
- **Joystick Virtuel Dynamique (Gauche)** : Déplacement fluide et réactif dans toutes les directions (WASD)
- **Zone Tactile de Visée (Droite)** : Balayage intuitif pour orienter la vue à 360° et viser précisément
- **Bouton de Tir Néon (TIRER)** : Grand bouton d'action tactile ergonomique (tap ou tir continu / rafale)
- **Bouton Saut [SAUT]** : Saut tactile instantané
- **Bouton Turbo [RUN]** : Bascule ou maintien du sprint tactique
- **Bouton Rechargement [R]** : Rechargement rapide du chargeur plasma
- **Sélecteur Tactile d'Armes [1], [2], [3]** : Changement instantané d'arme avec indicateur de munitions et couleur néon
- **Bouton Pause** : Accès rapide aux réglages, à la sensibilité tactile et au respawn immédiat

---

## ✏️ 6. Personnaliser le Nom du Jeu

Pour modifier le nom `[NOM DU JEU]`, ouvrez simplement **`src/config/gameConfig.ts`** :
```typescript
export const GAME_CONFIG = {
  TITLE: "VOTRE NOM DU JEU ICI",
  CODENAME: "PROJECT_NAME",
  VERSION: "0.1.0-ALPHA",
  SUBTITLE: "TACTICAL MULTIPLAYER CYBERPUNK FPS",
  // ...
};
```
Le nom sera immédiatement synchronisé sur l'ensemble de l'interface, des scènes et des modales.

---

## 🛠️ Scripts Disponibles

- `npm run dev` : Lance le serveur de développement Vite (port 3000)
- `npm run build` : Compile l'application TypeScript en bundles de production dans `/dist`
- `npm run preview` : Prévisualise le build de production localement
- `npm run lint` : Vérifie la validité des types TypeScript (`tsc --noEmit`)

---

## 🎯 Prochaines Étapes pour le Gameplay

La fondation technique est maintenant posée. Vous pouvez désormais implémenter :
1. Le contrôleur FPS première personne (Caméra POV, Pointer Lock API via `src/systems/inputSystem.ts`).
2. Le rendu de l'arme tenue en main (Viewmodel 3D dans `src/scenes/GameScene.tsx`).
3. L'envoi des coordonnées de déplacement et des tirs via `photonClient.raiseEvent('PLAYER_MOVE', ...)`.
4. La détection des tirs (Raycasting Three.js) et la persistance des kills dans Firestore via `firebaseService.updateStats()`.
