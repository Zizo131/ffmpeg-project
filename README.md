# 🎵 YouTube MP3 Converter

Application web de conversion audio YouTube → MP3, orientée musique (type SnapTube / NoTube), pour usage personnel.

## ⚠️ Avertissement légal

Cette application doit être utilisée **uniquement pour du contenu libre de droits** ou **dont vous détenez les droits d'auteur**. L'utilisateur est seul responsable du respect des lois sur les droits d'auteur et de la propriété intellectuelle de sa juridiction.

---

## 📋 Architecture

```
.
├── server/                # Backend Node.js + Express
│   ├── server.js          # Serveur principal
│   ├── package.json       # Dépendances
│   ├── .env.example       # Exemple de configuration
│   └── scripts/
│       └── download-ytdlp.js   # Télécharge yt-dlp au build
├── client/                # Frontend React + Vite
│   ├── index.html         # HTML d'entrée
│   ├── package.json       # Dépendances
│   ├── vite.config.js     # Configuration Vite
│   ├── tailwind.config.js # Configuration Tailwind CSS
│   └── src/
│       ├── App.jsx        # Composant principal
│       ├── api.js         # Client API
│       ├── index.css      # Styles globaux
│       └── components/    # Composants réutilisables
└── README.md              # Ce fichier
```

---

## 🚀 Installation locale

### Prérequis

- **Node.js** 18+ (https://nodejs.org)
- **npm** ou **pnpm** (fourni avec Node.js)

### Backend

1. **Cloner le dépôt et naviguer vers `server/`**
   ```bash
   git clone https://github.com/Zizo131/ffmpeg-project.git
   cd ffmpeg-project/server
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Télécharger le binaire `yt-dlp`**
   ```bash
   npm run build
   ```
   Cela crée un dossier `bin/` contenant `yt-dlp` exécutable.

4. **Créer `.env` depuis `.env.example`**
   ```bash
   cp .env.example .env
   ```
   Adapter si nécessaire (port, URL du frontend, durée max, chemin yt-dlp).

5. **Lancer le serveur en développement**
   ```bash
   npm run dev
   ```
   Le serveur démarre sur `http://localhost:3000`.

   Pour la production :
   ```bash
   npm start
   ```

### Frontend

1. **Naviguer vers `client/`**
   ```bash
   cd ../client
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Lancer le dev server**
   ```bash
   npm run dev
   ```
   L'app s'ouvre généralement sur `http://localhost:5173`.

4. **Construire pour la production**
   ```bash
   npm run build
   ```
   Génère un dossier `dist/` optimisé.

---

## 🔧 Variables d'environnement

### Backend (`server/.env`)

| Variable | Défaut | Description |
|----------|--------|-------------|
| `PORT` | `3000` | Port d'écoute du serveur |
| `FRONTEND_URL` | `http://localhost:5173` | URL du frontend (CORS) |
| `YTDLP_PATH` | `bin/yt-dlp` | Chemin vers le binaire yt-dlp |
| `MAX_DURATION_SECONDS` | `900` | Durée maximale d'une vidéo (15 min par défaut) |

### Frontend (`client/.env`)

| Variable | Défaut | Description |
|----------|--------|-------------|
| `VITE_API_URL` | `http://localhost:3000` | URL du backend |

---

## 📡 API Endpoints

### `GET /api/info?url=<url>`

Récupère les métadonnées d'une vidéo YouTube.

**Paramètres :**
- `url` (string, required) : URL YouTube (youtube.com, youtu.be, music.youtube.com)

**Réponse (200):**
```json
{
  "title": "Example Song",
  "thumbnail": "https://i.ytimg.com/...",
  "duration": 180,
  "channel": "Artist Name"
}
```

**Erreurs:**
- `400` : URL invalide
- `502` : Vidéo privée, indisponible, ou blocage anti-bot

---

### `GET /api/download?url=<url>&quality=<quality>`

Stream un fichier MP3 depuis la vidéo.

**Paramètres :**
- `url` (string, required) : URL YouTube
- `quality` (string, required) : `standard` (128 kbps) ou `hd` (320 kbps)

**Réponse (200):**
Stream MP3 (audio/mpeg) avec Content-Disposition pour téléchargement.

**Erreurs:**
- `400` : Paramètres manquants ou invalides
- `413` : Vidéo trop longue
- `502` : Erreur de conversion

---

## 🎨 Interface utilisateur

- **Thème sombre** (Slate 950) pour une meilleure expérience nocturne
- **Mobile-first** : responsive sur tous les appareils
- **Emojis** pour une interface ludique
- **États UI clairs** : chargement, erreur, succès
- **Gestion d'erreurs** avec messages lisibles en français

### Flux utilisateur

1. Coller un lien YouTube
2. Cliquer "Rechercher" (ou Entrée)
3. Affichage de la miniature, titre, durée, chaîne
4. Choisir la qualité audio (128 ou 320 kbps)
5. Cliquer "Télécharger MP3"
6. Le fichier est streamé et téléchargé automatiquement

---

## 🛡️ Sécurité

- **Validation stricte** des URLs YouTube (regex + URL API)
- **Rate limiting** : 20 requêtes par minute par IP
- **CORS restrictif** : limitée à l'URL du frontend (via `.env`)
- **Pas de stockage disque** : stream direct mémoire via pipes Node.js
- **Nettoyage du nom de fichier** : suppression des caractères dangereux
- **Gestion des erreurs** : messages d'erreur sécurisés
- **Timeout processus** : arrêt automatique des processus enfants si la connexion se ferme

---

## ⚙️ Architecture technique

### Backend

- **Framework** : Express.js (ES modules)
- **Conversion** : yt-dlp + FFmpeg
- **Gestion des processus** : `node:child_process` avec `spawn()`
- **Rate limiting** : express-rate-limit
- **CORS** : cors
- **Orchestration** : pipe streaming (yt-dlp → ffmpeg → réponse HTTP)

### Frontend

- **Framework** : React 18
- **Bundler** : Vite
- **Styles** : Tailwind CSS
- **State management** : React Hooks

---

## 📦 Déploiement

### Render (Backend)

1. **Créer un compte Render.com** (gratuit)

2. **Connecter le dépôt GitHub**

3. **Créer un nouveau "Web Service"**
   - Repository: `Zizo131/ffmpeg-project`
   - Root Directory: `server`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Runtime: **Node**

4. **Ajouter les variables d'environnement** dans Render
   ```
   PORT=3000
   FRONTEND_URL=https://votre-frontend-url.vercel.app
   YTDLP_PATH=bin/yt-dlp
   MAX_DURATION_SECONDS=900
   ```

5. **Déployer** → L'app est en live sur `https://votre-service.onrender.com`

### Vercel / Netlify (Frontend)

#### Option Vercel

1. **Importer le projet**
   - URL: https://github.com/Zizo131/ffmpeg-project
   - Root Directory: `client`

2. **Ajouter une variable d'environnement**
   ```
   VITE_API_URL=https://votre-service.onrender.com
   ```

3. **Déployer** → Live sur `https://votre-app.vercel.app`

#### Option Netlify

1. **Connecter GitHub** et sélectionner le dépôt

2. **Configuration**
   - Base directory: `client`
   - Build command: `npm run build`
   - Publish directory: `client/dist`

3. **Ajouter une variable d'environnement**
   ```
   VITE_API_URL=https://votre-service.onrender.com
   ```

4. **Déployer** → Live

---

## 🔗 Domaines YouTube supportés

- `youtube.com`
- `www.youtube.com`
- `m.youtube.com`
- `music.youtube.com`
- `youtu.be`

Les URLs suivantes sont valides :
- `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- `https://youtu.be/dQw4w9WgXcQ`
- `https://music.youtube.com/watch?v=dQw4w9WgXcQ`

---

## 📝 Scripts

### Backend

| Script | Commande | Description |
|--------|----------|-------------|
| `dev` | `npm run dev` | Lance le serveur en mode watch (dev) |
| `start` | `npm start` | Lance le serveur en production |
| `build` | `npm run build` | Télécharge yt-dlp dans `bin/` |

### Frontend

| Script | Commande | Description |
|--------|----------|-------------|
| `dev` | `npm run dev` | Démarre le Vite dev server |
| `build` | `npm run build` | Crée une version optimisée dans `dist/` |
| `preview` | `npm run preview` | Prévisualise la version optimisée localement |

---

## 🚨 Dépannage

### Le binaire yt-dlp est introuvable

```bash
cd server && npm run build
```

### Port 3000 déjà utilisé

Modifier `.env` :
```
PORT=3001
```

### CORS error au téléchargement

Vérifier que `FRONTEND_URL` dans `.env` du backend correspond à l'URL réelle du frontend.

### YouTube bloque les requêtes

- Attendre quelques heures
- yt-dlp peut nécessiter une mise à jour
- Les durées limites réduisent le blocage

### Erreur "ffmpeg not found"

Vérifier que `ffmpeg-static` est bien installé :
```bash
npm list ffmpeg-static
```

---

## 📄 Licence

Usage personnel uniquement. Respectez les droits d'auteur et la législation locale.

---

## 👨‍💻 Auteur

Développé avec ❤️ pour usage personnel.

---

## 🤝 Contribuer

Ce projet est destiné à l'usage personnel. Contributions libres mais non sollicitées.

---

**Dernière mise à jour** : 2026-10-05
