# Dependency graph

```mermaid
flowchart TB
  subgraph client [Browser]
    Pages[app/pages]
    Pixel[pixel components]
    AdminUI[admin components]
    Pixel --> Pages
    AdminUI --> Pages
  end
  Pages --> Comp[app/composables]
  Comp -->|credentials include| API[Nitro /api/*]
  API --> Svc[server/services]
  Svc --> DB[(SQLite)]
  Svc --> Shared[web/shared]
  API --> Shared
  Pages --> Shared
  Pixel --> Comp
```

## Module edges

`pages → composables → api → services → database`; `pages → pixel | admin`; `layouts → pages`; all use `shared`. `api → utils`; `plugins → database`. Services never import api; shared imports nothing from app/server.

## Roles and routes

| Role | Key routes | Session |
|------|------------|---------|
| Team | `/[edition]/join`, `/play`, `/s/[slug]`, `/t/[slug]` | team cookie |
| Crew | `/[edition]/crew/*` | crew cookie |
| Admin | `/admin/*` | admin cookie |
| Public | `/leaderboard`, `/`, `/privacy` | — |
