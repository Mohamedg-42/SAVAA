# SAVAA — Plateforme Agropastorale (Site Web, Application Mobile & Serveur PostgreSQL)

Plateforme SAVAA (marché agropastoral, suivi sanitaire, traçabilité `SAV-TRACE`, logistique intelligente et espace investisseur) structurée en architecture **Client-Serveur** :
- **Client 1 (`apps/web/`)** : Site Web e-commerce + Fiches QR publiques + Back-Office (`/admin`)
- **Client 2 (`apps/mobile/` + `android/` & `ios/`)** : Application Mobile Native Android & iOS via Capacitor (sans `/admin`)
- **Code partagé (`packages/shared/`)** : Règles métier et client API REST / Temps réel (SSE)
- **Serveur (`backend/`)** : API REST Node.js + Base de données **PostgreSQL** ([backend/db/schema.sql](backend/db/schema.sql))

```bash
npm install
docker compose up -d   # Démarre PostgreSQL 16 (port 5432)
npm run db:migrate     # Initialise les 16 tables PostgreSQL
npm run dev:api        # Serveur Backend API REST (http://localhost:4000)
npm run dev:web        # Site Web + Back-Office /admin (http://localhost:5173)
npm run dev:mobile     # Application Mobile sans /admin (http://localhost:5174)
npm run mobile:sync    # Compile l'App Mobile et synchronise Android & iOS
```

- Documentation complète du projet : [DOCUMENTATION_PROJET_SAVAA.md](DOCUMENTATION_PROJET_SAVAA.md)
- Guide opérationnel de passation : [PASSATION.md](PASSATION.md)
