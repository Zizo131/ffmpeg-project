# Zitube - audit et checklist AppSec

## Résumé

Le backend Express applique maintenant une validation canonique des URLs YouTube,
des en-têtes de sécurité API, des limites par IP, une concurrence bornée, des
timeouts de processus et une exécution `yt-dlp` sans shell. Le client Vercel
dispose d'une CSP et d'en-têtes de transport dans `vercel.json`.

## Findings traités

| Sévérité | Sujet | Traitement |
| --- | --- | --- |
| Haute | Téléchargement de `yt-dlp` depuis `releases/latest` sans intégrité | Version épinglée et vérification SHA-256 du manifeste `SHA2-256SUMS` |
| Haute | URL utilisateur transmise au processus externe | URL HTTPS canonique reconstruite à partir d'un video ID validé |
| Haute | Processus externes sans borne stricte | `spawn` sans shell, environnement minimal, timeout 120 s, SIGKILL et limite de concurrence |
| Moyenne | Abus et épuisement de ressources | Rate limits `/info` 20/min, `/download` 5/min, ralentissement progressif et plafond de conversions |
| Moyenne | En-têtes/CORS insuffisants | Helmet API, CSP frontend, CORS allowlist, HSTS, nosniff, COOP/CORP |
| Moyenne | Entrées non bornées | JSON 1 kb, qualité whitelistée, titres/minia­tures bornés et validés |
| Basse | Diagnostic et erreurs trop verbeux | Request ID, logs Pino avec IP hachée et messages génériques en production |

## Déploiement Render

1. Définir `FRONTEND_URL` avec l'origine Vercel exacte, sans slash final.
2. Définir `NODE_ENV=production`, `TRUST_PROXY=true` et `MAX_CONCURRENT_CONVERSIONS`.
3. Définir `TURNSTILE_SECRET_KEY` après activation du widget Turnstile.
4. Utiliser le build `npm ci && npm --prefix server ci && npm --prefix client ci && npm run build`.
5. Vérifier `GET /health` après déploiement.
6. Placer Cloudflare devant le service Render et limiter `/api/download`.

## Déploiement Vercel

1. Déployer le dossier racine avec `client` comme projet frontend si nécessaire.
2. Vérifier que `connect-src` dans `vercel.json` correspond au domaine Render réel.
3. Ne jamais placer `TURNSTILE_SECRET_KEY` ou une clé privée dans une variable `VITE_*`.
4. Vérifier les en-têtes CSP, HSTS et `X-Frame-Options` dans l'onglet Network.

## Compte et chaîne CI/CD

- Activer secret scanning et push protection GitHub.
- Activer 2FA sur GitHub, Render et Vercel.
- Utiliser `npm ci`, Dependabot et `npm audit --omit=dev --audit-level=high`.
- Mettre à jour régulièrement la version épinglée de `yt-dlp` et contrôler son manifeste.
