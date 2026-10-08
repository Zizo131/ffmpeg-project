# Zitube — Référence complète du projet

> Document de référence technique : installation, développement, architecture,
> sécurité, variables d'environnement, tests et déploiement.
>
> Zitube est un convertisseur de liens YouTube en fichiers MP3. Utilisez
> uniquement des contenus que vous êtes légalement autorisé à télécharger.

## 1. Vue d'ensemble

| Élément | Technologie |
| --- | --- |
| Nom du produit | Zitube |
| Backend | Node.js + Express |
| Frontend principal | React 18 + Vite + Tailwind CSS |
| Icônes | lucide-react |
| Métadonnées vidéo | yt-dlp |
| Conversion audio | ffmpeg-static |
| Streaming | yt-dlp stdout → FFmpeg stdin → réponse HTTP |
| Tests backend | Vitest + Supertest |
| Logs | Pino |
| Sécurité HTTP | Helmet, CORS, express-rate-limit, express-slow-down |
| Validation | Zod + validation URL canonique |
| Hébergement backend | Render |
| Hébergement frontend prévu | Vercel |
| Protection prévue | Cloudflare WAF/DDoS/Bot Management + Turnstile |

Le projet actif est situé dans `client/` et `server/`. Le dossier `zitube/`
est un autre scaffold Vite indépendant et n'est pas utilisé par les scripts
principaux du projet.

## 2. Arborescence active

```text
.
├── package.json                 # scripts racine
├── render.yaml                  # service Render
├── vercel.json                  # headers et rewrite Vercel
├── SECURITY-AUDIT.md            # rapport et checklist AppSec
├── IMPLEMENTATION.md            # documentation d'implémentation historique
├── .github/
│   └── dependabot.yml           # mises à jour npm hebdomadaires
├── client/
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── public/
│   │   └── favicon.svg
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api.js
│       ├── index.css
│       └── components/
│           ├── Footer.jsx
│           ├── Header.jsx
│           ├── InfoCard.jsx
│           ├── QualitySelector.jsx
│           ├── Stepper.jsx
│           ├── Suggestions.jsx
│           ├── Toast.jsx
│           └── UrlInput.jsx
└── server/
    ├── server.js
    ├── package.json
    ├── package-lock.json
    ├── .env.example
    ├── middleware/
    │   └── security.js
    ├── utils/
    │   └── validateUrl.js
    ├── scripts/
    │   └── download-ytdlp.js
    ├── tests/
    │   └── security.test.js
    └── bin/
        └── yt-dlp(.exe)       # généré par le build, ignoré par Git
```

## 3. Scripts disponibles

### Depuis la racine

```powershell
# Lance Vite dans client/
npm run dev

# Build yt-dlp + frontend
npm run build

# Lance le backend Express
npm run start

# Lance le backend avec node --watch
npm run server:dev

# Lance seulement Vite
npm run client:dev
```

### Depuis `server/`

```powershell
npm ci
npm run dev
npm start
npm run build
npm test
npm audit --omit=dev --audit-level=high
```

### Depuis `client/`

```powershell
npm ci
npm run dev
npm run build
npm run preview
```

## 4. Développement local

Le frontend Vite écoute généralement sur `http://localhost:5173`.
Le backend Express écoute sur `http://localhost:3000`.

Utiliser deux terminaux :

```powershell
# Terminal 1
npm run server:dev
```

```powershell
# Terminal 2
npm run dev
```

Vérifier le backend :

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3000/health
```

Réponse attendue :

```json
{"status":"ok"}
```

### Erreur `ECONNREFUSED`

Cette erreur signifie que Vite ne trouve aucun backend sur le port `3000`.
Lancer `npm run server:dev`.

### Erreur `EADDRINUSE`

Cette erreur signifie qu'une autre instance utilise déjà le port `3000`.
Ne lancer qu'une seule instance du backend. Pour identifier le processus sous
Windows :

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen
```

## 5. Fonctionnement frontend

### États de l'application

`App.jsx` utilise les états suivants :

- `idle` : formulaire initial ;
- `searching` : récupération des métadonnées ;
- `ready` : vidéo analysée et téléchargement disponible ;
- `downloading` : conversion MP3 en cours ;
- `error` : toast d'erreur affiché.

### Flux utilisateur

1. L'utilisateur colle ou saisit un lien YouTube.
2. `UrlInput` valide localement le hostname.
3. `fetchVideoInfo()` appelle `/api/info`.
4. `InfoCard` affiche titre, miniature, chaîne et durée.
5. `QualitySelector` choisit `standard` ou `hd`.
6. `downloadMP3()` appelle `/api/download`.
7. Le blob est téléchargé côté navigateur.
8. La blob URL est révoquée avec `URL.revokeObjectURL()`.

### API frontend

`client/src/api.js` utilise :

```text
GET /api/info?url=...
GET /api/suggestions?q=...
GET /api/download?url=...&quality=standard|hd
```

L'API reste relative (`/api`) afin de fonctionner avec le proxy Vite en local,
la rewrite Vercel en production et le serveur Express unifié si nécessaire.

## 6. API backend

### `GET /health`

Healthcheck public sans information sensible :

```json
{"status":"ok"}
```

### `GET /api/info`

Paramètre :

```text
url=<lien YouTube>
```

Limite :

```text
20 requêtes par IP et par minute
```

Réponse :

```json
{
  "title": "Titre",
  "thumbnail": "https://i.ytimg.com/vi/VIDEO_ID/hqdefault.jpg",
  "duration": 215,
  "channel": "Chaîne"
}
```

### `GET /api/suggestions`

Paramètre :

```text
q=<titre de recherche>
```

La recherche est limitée à 2-200 caractères et les résultats sont bornés.

### `GET /api/download`

Paramètres :

```text
url=<lien YouTube>
quality=standard|hd
```

Qualités :

| Valeur | Bitrate |
| --- | --- |
| `standard` | 128 kbps |
| `hd` | 320 kbps |

Limites :

- 5 requêtes par IP et par minute ;
- nombre global de conversions simultanées configurable ;
- timeout de processus de 120 secondes ;
- taille source maximale yt-dlp : 100 MB ;
- durée vidéo maximale configurable ;
- Turnstile requis si `TURNSTILE_SECRET_KEY` est défini.

## 7. Validation URL et anti-SSRF

Le module `server/utils/validateUrl.js` applique :

- protocole `https:` obligatoire ;
- hostnames autorisés uniquement :
  - `youtube.com` ;
  - `www.youtube.com` ;
  - `m.youtube.com` ;
  - `music.youtube.com` ;
  - `youtu.be` ;
  - `www.youtu.be` ;
- aucun username/password ;
- aucun port explicite ;
- aucun fragment ;
- aucune playlist (`list`, `index`) ;
- aucun paramètre inattendu ;
- aucun caractère de contrôle ;
- video ID conforme à `^[A-Za-z0-9_-]{11}$`.

L'URL passée à yt-dlp est reconstruite côté serveur :

```text
https://www.youtube.com/watch?v=<VIDEO_ID>
```

L'URL utilisateur originale n'est jamais transmise au processus enfant.

## 8. Sécurité HTTP et processus

### Headers backend

Helmet est appliqué à l'API avec :

- CSP API `default-src 'none'` ;
- `frame-ancestors 'none'` ;
- HSTS `max-age=63072000` avec `includeSubDomains` et `preload` ;
- `X-Content-Type-Options: nosniff` ;
- `Referrer-Policy: no-referrer` ;
- `Cross-Origin-Resource-Policy: same-site` ;
- COOP same-origin ;
- Permissions Policy caméra, microphone et géolocalisation désactivées ;
- `X-Powered-By` désactivé.

### Processus enfants

Les appels yt-dlp et FFmpeg utilisent :

- `spawn()` ;
- tableau d'arguments ;
- `shell: false` ;
- environnement minimal ;
- séparateur `--` avant l'URL ;
- `--no-playlist` ;
- `--no-config` ;
- `--ignore-config` ;
- `--no-exec` ;
- `--max-filesize 100M` ;
- `--socket-timeout 10` ;
- `--retries 0`.

Les streams et processus sont surveillés, et les enfants sont tués lors d'un
timeout, d'une erreur ou de la fermeture de la requête.

## 9. yt-dlp et supply chain

Le script `server/scripts/download-ytdlp.js` :

1. utilise une version épinglée ;
2. télécharge l'exécutable depuis une release GitHub précise ;
3. télécharge le manifeste `SHA2-256SUMS` ;
4. calcule le SHA-256 local ;
5. refuse l'installation si le checksum diffère ;
6. supprime le manifeste temporaire après vérification.

Version par défaut actuelle :

```text
2026.08.19
```

Modifier la version uniquement avec :

```powershell
$env:YTDLP_VERSION="version-validee"
npm run build
```

Le binaire généré n'est pas commité dans Git.

## 10. Variables d'environnement

Copier `server/.env.example` vers un fichier local non commité si nécessaire.

| Variable | Exemple non secret | Utilisation |
| --- | --- | --- |
| `PORT` | `3000` | Port Express |
| `FRONTEND_URL` | `http://localhost:5173` | Origine CORS autorisée |
| `YTDLP_PATH` | vide | Chemin optionnel vers yt-dlp |
| `MAX_DURATION_SECONDS` | `900` | Durée vidéo maximale |
| `MAX_CONCURRENT_CONVERSIONS` | `2` | Conversions simultanées |
| `NODE_ENV` | `production` | Messages d'erreur et HTTPS |
| `TRUST_PROXY` | `true` | Proxy Render |
| `TURNSTILE_SECRET_KEY` | vide | Secret Cloudflare, jamais dans Git |
| `LOG_LEVEL` | `info` | Niveau Pino |

Ne jamais mettre de secret dans une variable `VITE_*` : ces variables sont
accessibles dans le bundle frontend.

## 11. Déploiement Render

La configuration est dans `render.yaml`.

Build Render :

```bash
npm ci && npm --prefix server ci && npm --prefix client ci && npm run build
```

Démarrage :

```bash
npm start
```

Variables Render à définir :

```text
NODE_ENV=production
FRONTEND_URL=https://<domaine-vercel>
TRUST_PROXY=true
MAX_DURATION_SECONDS=900
MAX_CONCURRENT_CONVERSIONS=2
TURNSTILE_SECRET_KEY=<secret-cloudflare>
LOG_LEVEL=info
```

Vérifications :

```text
GET https://<domaine-render>/health
```

Le serveur sert également `client/dist` si le dossier existe. Cela permet un
fonctionnement full-stack sur Render, même si le frontend est normalement
prévu pour Vercel.

## 12. Déploiement Vercel

`vercel.json` configure :

- headers CSP ;
- HSTS ;
- `nosniff` ;
- `X-Frame-Options: DENY` ;
- Referrer Policy ;
- Permissions Policy ;
- rewrite `/api/:path*` vers Render.

Avant le déploiement, remplacer dans `vercel.json` :

```text
https://zitube.onrender.com
```

par le domaine Render réel.

La directive `connect-src` doit contenir ce même domaine Render.

## 13. Cloudflare et Turnstile

Configuration recommandée :

- placer Cloudflare devant le domaine backend Render ;
- activer HTTPS strict ;
- activer WAF ;
- activer DDoS Protection ;
- activer Bot Fight Mode ou Bot Management ;
- ajouter une règle de rate limit sur `/api/download` ;
- configurer Turnstile sur l'interface de téléchargement ;
- transmettre le token via `X-Turnstile-Token`.

Le serveur vérifie le token côté serveur avec :

```text
https://challenges.cloudflare.com/turnstile/v0/siteverify
```

## 14. Tests et validation

Tests présents dans `server/tests/security.test.js` :

- URLs `file://` ;
- localhost ;
- IP ;
- ports ;
- credentials ;
- playlists ;
- injection `--exec` ;
- caractères de contrôle ;
- video ID invalide ;
- qualité invalide ;
- payload JSON trop volumineux ;
- origine CORS non autorisée ;
- headers de sécurité.

Commandes :

```powershell
npm --prefix server test
npm --prefix server audit --omit=dev --audit-level=high
npm run build
git diff --check
```

Résultat attendu :

```text
13 tests passed
0 vulnerabilities high/critical dans les dépendances de production
build réussi
checksum yt-dlp validé
```

## 15. Maintenance

- Garder les trois lockfiles à jour : racine, `server/`, `client/`.
- Utiliser `npm ci` en CI et sur Render.
- Examiner les pull requests Dependabot.
- Mettre à jour yt-dlp vers une release vérifiée.
- Relancer les tests après toute modification de validation ou de processus.
- Ne jamais commiter `.env`, tokens, clés API, cookies ou binaires non vérifiés.
- Contrôler les logs Render sans enregistrer les URLs complètes ni les IP en clair.
- Régénérer les secrets Turnstile en cas de fuite.

## 16. Dépannage rapide

| Symptôme | Cause probable | Action |
| --- | --- | --- |
| `ECONNREFUSED` sur `/api` | Backend arrêté | Lancer `npm run server:dev` |
| `EADDRINUSE :3000` | Deux backends actifs | Garder une seule instance |
| `yt-dlp introuvable` | Build serveur non exécuté | Lancer `npm --prefix server run build` |
| `The page needs to be reloaded` | yt-dlp trop ancien | Relancer le build avec une release récente |
| `503 service occupé` | Limite de concurrence atteinte | Réessayer plus tard ou ajuster `MAX_CONCURRENT_CONVERSIONS` |
| `403 origine non autorisée` | `FRONTEND_URL` incorrect | Utiliser l'origine exacte Vercel |
| `403 vérification anti-abus` | Turnstile absent/invalide | Configurer le widget et `TURNSTILE_SECRET_KEY` |
| `502 API` | Erreur yt-dlp/YouTube/réseau | Vérifier les logs Pino et le healthcheck |

## 17. Commandes de référence complètes

```powershell
# Installation complète
npm ci
npm --prefix server ci
npm --prefix client ci

# Développement
npm run server:dev
npm run dev

# Tests et audit
npm --prefix server test
npm --prefix server audit --omit=dev --audit-level=high

# Build
npm run build

# Santé locale
Invoke-WebRequest -UseBasicParsing http://localhost:3000/health

# Git
git status
git diff --check
```

