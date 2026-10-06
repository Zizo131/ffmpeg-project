# 🚀 Quick Start Guide

Démarre l'application en 5 minutes.

## 1️⃣ Cloner et installer

```bash
# Aller au répertoire
cd "C:\Users\ZIDANI\Desktop\3eme anné EMSI\ffmpeg project"

# Backend
cd server
npm install
npm run build  # Télécharge yt-dlp
cp .env.example .env  # Créer la config

# Frontend (nouveau terminal)
cd ../client
npm install
```

## 2️⃣ Lancer localement

### Terminal 1 : Backend
```bash
cd server
npm run dev
# Écoute sur http://localhost:3000
```

### Terminal 2 : Frontend
```bash
cd client
npm run dev
# Ouvre http://localhost:5173 automatiquement
```

## 3️⃣ Tester l'app

1. **Ouvrir** http://localhost:5173
2. **Coller** un lien YouTube :
   ```
   https://www.youtube.com/watch?v=dQw4w9WgXcQ
   https://youtu.be/dQw4w9WgXcQ
   https://music.youtube.com/watch?v=...
   ```
3. **Cliquer** "🔍 Rechercher"
4. **Voir** titre, miniature, durée, chaîne
5. **Choisir** Standard (128 kbps) ou HD (320 kbps)
6. **Cliquer** "⬇ Télécharger MP3"
7. **Vérifier** le fichier .mp3 dans les téléchargements

## 📝 Fichiers modifiables

### Configuration Backend (.env)
```
PORT=3000
FRONTEND_URL=http://localhost:5173
YTDLP_PATH=bin/yt-dlp
MAX_DURATION_SECONDS=900
```

Exemples :
- **Changer le port :** `PORT=8080`
- **Augmenter durée max :** `MAX_DURATION_SECONDS=1800` (30 min)
- **Changer l'URL frontend :** `FRONTEND_URL=http://monsite.com`

### Changer la qualité par défaut (frontend)

[client/src/App.jsx](./client/src/App.jsx) ligne ~13 :
```jsx
const [quality, setQuality] = useState("standard");  // Changer en "hd"
```

### Changer le thème (frontend)

[client/tailwind.config.js](./client/tailwind.config.js) :
```js
darkMode: "selector"  // ou "class" ou "media"
```

---

## 🔧 Dépannage rapide

**Erreur : "yt-dlp not found"**
```bash
cd server && npm run build
```

**Erreur : "Port 3000 already in use"**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
# Ou changer le PORT dans .env
```

**Erreur : "Cannot find ffmpeg"**
```bash
npm list ffmpeg-static  # Vérifier l'installation
npm reinstall ffmpeg-static
```

**YouTube bloque :** Attendre 1-2 heures ou changer d'IP

---

## 📦 Production

### Build pour Render (Backend)
```bash
cd server
npm install
npm run build
npm start  # Écoutez les logs
```

### Build pour Vercel/Netlify (Frontend)
```bash
cd client
npm run build  # Génère dist/
npm run preview  # Tester localement
```

### Variables d'env pour Render
```
PORT=3000
FRONTEND_URL=https://votre-app.vercel.app
YTDLP_PATH=bin/yt-dlp
MAX_DURATION_SECONDS=900
```

### Variables d'env pour Vercel/Netlify
```
VITE_API_URL=https://votre-api.onrender.com
```

---

## 🧪 Tests manuels

### API /info
```bash
curl "http://localhost:3000/api/info?url=https://youtu.be/dQw4w9WgXcQ"
```

Résultat attendu :
```json
{
  "title": "Rick Astley - Never Gonna Give You Up",
  "thumbnail": "https://i.ytimg.com/...",
  "duration": 213,
  "channel": "Rick Astley Official"
}
```

### API /download
```bash
curl "http://localhost:3000/api/download?url=https://youtu.be/dQw4w9WgXcQ&quality=standard" > out.mp3
ffprobe out.mp3  # Vérifier le MP3
```

---

## 📚 Ressources

- **README.md** : Installation complète + API docs
- **IMPLEMENTATION.md** : Détails techniques
- **server/server.js** : Code backend (200 lignes, bien commenté)
- **client/src/App.jsx** : Logique frontend

---

## ✅ Checklist démarrage

- [ ] `npm install` backend
- [ ] `npm run build` backend (yt-dlp)
- [ ] `.env` créé depuis `.env.example`
- [ ] `npm run dev` backend running
- [ ] `npm install` frontend
- [ ] `npm run dev` frontend running
- [ ] Frontend accessible sur http://localhost:5173
- [ ] Tester avec une vidéo YouTube

---

**Bon développement ! 🎵**

Pour questions, consulter README.md ou IMPLEMENTATION.md
