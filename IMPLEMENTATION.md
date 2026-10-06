# 🛠️ Détails techniques d'implémentation

## Backend (server/server.js)

### Validation d'URL
```javascript
parseYoutubeUrl(value) → URL | null
- Valide le protocole (http/https)
- Limite à 2048 caractères
- Accepte: youtube.com, youtu.be, music.youtube.com
- Vérifie la présence du param ?v= ou du video ID
```

### Pipeline streaming (sans stockage disque)
```
yt-dlp (vidéo) 
  ↓ stdout
ffmpeg (encode MP3)
  ↓ stdout
Response HTTP (audio/mpeg)
```

**Avantages :**
- Pas de fichier temporaire sur disque
- Pas de limite d'espace disque
- Arrêt automatique si le client ferme la connexion
- Mémoire contrôlée par les buffers de pipe

### Rate Limiting
- 20 requêtes/minute par IP
- Appliqué à `/api/*`
- Message d'erreur localisé en français

### Gestion des erreurs yt-dlp
```
Erreur → Message lisible pour l'utilisateur
"Private video" → "Vidéo privée ou nécessite connexion"
"Not available" → "Vidéo n'est pas disponible"
"confirm you" → "YouTube a bloqué temporairement"
```

### Nettoyage du nom de fichier
```javascript
cleanFilename(title)
- Supprime: < > : " / \ | ? * et caractères contrôle
- Limite à 180 caractères
- Content-Disposition: UTF-8 encoded + fallback ASCII
```

### Processus enfants
- Lancés avec `spawn()` (jamais string shell)
- Tués à la déconnexion client (`request.on("close")`)
- Pas de pollution processus zombie

---

## Frontend (client/src)

### Architecture composants
```
App.jsx (state: url, info, state, error, quality)
  ├── UrlInput (input + bouton recherche)
  ├── InfoCard (affichage vidéo)
  ├── QualitySelector (standard/HD)
  └── Erreur (auto-efface après 5s)
```

### États UI
- `idle` : initial
- `searching` : attente /api/info
- `ready` : vidéo chargée, prêt à télécharger
- `downloading` : streaming MP3 en cours
- `error` : erreur API

### Téléchargement
```javascript
downloadMP3(url, quality)
  ↓ fetch /api/download
  ↓ response.blob()
  ↓ URL.createObjectURL()
  ↓ <a>.download trigger
```

### Tailwind CSS
- Mode sombre par défaut (classe `dark` sur `<html>`)
- Mobile-first (p-4 = padding mobile, puis ajusté)
- Tokens couleur : slate-950, slate-800, etc.
- Composants réutilisables (buttons, inputs)

### Gestion d'erreurs frontend
- Affichage toast rouge (bg-red-900/30)
- Auto-efface après 5 secondes
- Messages d'erreur backend intégrés

---

## Déploiement

### Render (Backend)

**Process:**
1. Git push → Webhook Render
2. `npm install && npm run build` (télécharge yt-dlp)
3. `npm start` (démarre Express)
4. Écoute PORT=3000 (env Render)

**Variables critiques:**
```
FRONTEND_URL=https://monapp.vercel.app  (CORS)
YTDLP_PATH=bin/yt-dlp                   (chemin binaire)
MAX_DURATION_SECONDS=900                (limite)
```

### Vercel/Netlify (Frontend)

**Process:**
1. Git push → Webhook Vercel/Netlify
2. `npm install && npm run build`
3. Génère `dist/`
4. Serveur statique (CDN + edge)

**Variables:**
```
VITE_API_URL=https://monapp.onrender.com  (proxy /api)
```

**Proxy Vite:**
```javascript
/api → VITE_API_URL
```

---

## Sécurité

### Input validation
- ✅ Regex stricte URL YouTube
- ✅ Limite longueur URL (2048)
- ✅ Whitelist domaines
- ✅ Spawn + args tableau (pas de shell injection)

### CORS
- ✅ Limitée à FRONTEND_URL (env)
- ✅ Pas de "*"

### Erreurs
- ✅ Messages génériques en production (pas de stack traces)
- ✅ Pas de logs sensibles en stdout

### Processus
- ✅ Arrêt des enfants
- ✅ Pas de `exec()` / `shell: true`
- ✅ Timeouts implicites (client close)

---

## Performance

### Frontend
- **Bundle size:** 147 kB (gzipped 47.5 kB)
- **Framework:** React (lazy load possible pour futures features)
- **CSS:** Tailwind (utility-first, 9.4 kB gzipped)

### Backend
- **Startup:** <1s (pas de compilation)
- **Mémoire:** ~100 MB (Express + deps)
- **Stream:** Pas de buffer complet (pipe)

### Réseau
- **Info:** 1-2 secondes (dépend YouTube/réseau)
- **Download:** Variable (vitesse vidéo + FFmpeg)
- **Rate limit:** 20/min (évite blocage YouTube)

---

## Extensibilité

### Futures features possibles
1. **Queue de téléchargement** → Redis + worker threads
2. **History utilisateur** → SQLite + Auth
3. **Format alternatif** → AAC, FLAC (param `format`)
4. **Proxy YouTube** → VPN/rotating IPs si bloqué
5. **Progress WebSocket** → Real-time encoding status

### Modifications code
- API: Ajouter endpoint → vérifier CORS
- Frontend: Nouveau composant → ajouter props validation
- Backend: Nouvelle conversion → FFmpeg args

---

## Troubleshooting checklist

| Problème | Solution |
|----------|----------|
| yt-dlp not found | `cd server && npm run build` |
| CORS error | Vérifier `FRONTEND_URL` dans `.env` backend |
| "Trop de demandes" | Attendre 1 min (rate limit 20/min) |
| YouTube bloque | Attendre quelques heures |
| Port 3000 occupé | `PORT=3001 npm start` |
| ffmpeg not found | `npm list ffmpeg-static` → réinstaller |
| Build frontend lent | Normal (~1m30s) |

---

## Fichiers clés

| Fichier | Rôle | Lignes |
|---------|------|--------|
| server.js | Logique API | ~200 |
| App.jsx | State management | ~60 |
| api.js | Fetch wrapper | ~20 |
| UrlInput.jsx | Input field | ~25 |
| InfoCard.jsx | Video metadata | ~20 |
| QualitySelector.jsx | Audio quality | ~30 |

---

**Total:** ~1500 lignes de code (commenté + français) + 130+ npm packages
**Temps dev:** Optimisé pour déploiement rapide
**Maintenance:** Minimal (yt-dlp updates auto via GitHub releases)
