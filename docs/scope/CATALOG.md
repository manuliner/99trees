---
audience: agent
category: scope
type: Codemap
last_verified: 2026-06-19
load-when: MVP feature checklist, data model sketch, API surface, or NFR targets.
---
# Scope — Funktionskatalog & Anhang

Part of the product spec. Hub: [`SCOPE.md`](../SCOPE.md).

## Funktionskatalog MVP (exakt)

### F1 — Team-Onboarding (PWA-Einstieg)

- QR am Festival-Eingang → Landing „Team erstellen“
- Eingabe: **Teamname**, **4-stellige Team-PIN** (zur Wiederherstellung), optional Teamgröße 1–5
- Server erstellt Team + **Session-Token**; Rejoin unter `/rejoin` mit Name + PIN
- PIN-Reset durch Crew/Admin am Infostand
- Kein E-Mail/Passwort
- **Akzeptanz:** Gleicher Name → Fehler; Refresh behält Session; Rejoin stellt Spielstand wieder her

### F2 — Spielbrett (Team-Ansicht)

- Visualisierung Felder 1…N als Vogelzug (Süd → Nord); N = Stationsanzahl
- Markierung: eigenes Team (`confirmed` + optional `pending` während offenem Zug)
- **Akzeptanz:** Mobil lesbar, Position sofort nach Bestätigung aktualisiert

### F3 — Würfeln

- Button nur wenn kein offener Zug
- Animation/Ergebnis Anzeige Würfelwert
- **Akzeptanz:** Doppelklick/Doppel-API → idempotent, nur ein aktiver Zug

### F4 — Stationshinweis (nach Wurf)

- Anzeige vager Beschreibung für Zielfeld
- Countdown bis Hinweise freigeschaltet
- **Akzeptanz:** Hinweis-Buttons disabled bis Timer abgelaufen

### F5 — QR-Scan Station

- **In-App:** Button „Station scannen“ → Kamera-Scanner → URL parsen → API-Validierung
- Stations-QR encodiert URL `/s/{slug}?t={token}`
- Scan nur gültig wenn `station.fieldNumber === position_pending` (sonst Fehlermeldung „falsche Station“)
- **Fallback:** System-Kamera öffnet gleiche URL als Deep-Link
- Öffnet Aufgabe der Station
- **Akzeptanz:** Scanner funktioniert auf gängigen Android + iOS-Browsern (HTTPS); Kamera-Freigabe dokumentiert; Deep-Link wenn App bereits offen

### F6 — Quiz-Aufgabe

- Frage, Eingabefeld oder Multiple Choice (MVP: **Freitext + Normalisierung** reicht)
- Feedback Erfolg/Fehler; begrenzte Versuche konfigurierbar (Default: unbegrenzt bis Timeout Zug)
- **Akzeptanz:** Falsche Antwort blockiert Bestätigung nicht dauerhaft (neu versuchen)

### F7 — Performance-Aufgabe

- Anzeige Aufgabenstellung für Team
- Status „Warte auf Crew-Bewertung“
- **Akzeptanz:** Team kann Zug nicht selbst abschließen bis Crew bewertet hat

### F8 — Crew-Interface

- Routen `/crew`, `/crew/login`, Team-Detail (siehe UF-3)
- Crew-Login: gemeinsames **Crew-Passwort** pro Edition
- **Team bewerten:** Suche nach Name **oder** Team-QR scannen → „Geschafft“ / „Besonders gut“ (+25 Punkte)
- Team-App: **„Unser Team-QR“** anzeigen (für Crew-Scan bei Performance)
- Optional: Warteschlange offener Anfragen (`GET /api/crew/pending`)
- **PIN zurücksetzen** für Teams (UF-1b)
- **Akzeptanz:** Bewertung setzt `task_completed`; Team kann bestätigen; Doppelbewertung blockiert; Audit-Log

### F9 — Hinweis-System

- 3 gestaffelte Hinweise wie in Spielregeln
- Felder-Strafe serverseitig anwenden
- Hinweis 3: Punkt auf **statischer Festival-Karte** (Bild + %-Koordinaten pro Station)
- **Akzeptanz:** Jeder Hinweis nur einmal pro Zug; Strafe vor erneutem Würfeln sichtbar

### F10 — Zug abschließen / abbrechen

- Nach Task-Erfolg: „Zug bestätigen“ → `position_confirmed` aktualisieren
- Ohne Hinweise: „Neu würfeln“ verwirft offenen Zug (gemäß festgelegter Default-Regel zu Feldposition)
- **Akzeptanz:** Kein paralleler offener Zug

### F11 — Live-Leaderboard

- Öffentliche Seite `/leaderboard` (siehe UF-4) — kein Login
- Vogelzug-Brett + Rangliste; nur `position_confirmed` (kein pending)
- QR zum Ausdrucken (Admin); Link aus `/play`
- MVP-Technik: **Polling** ~8 s + `updatedAt`/`etag`
- Banner wenn Team Ziel-Feld N erreicht
- **Akzeptanz:** 50+ Teams; `draft` zeigt Platzhalter; `paused`/`ended` korrekt

### F12 — PWA-Basics

- `manifest.webmanifest`, Service Worker für App-Shell/Assets
- **MVP:** Online-first (Spiel-API braucht Netz); Offline nur für statische UI
- „Zum Home-Bildschirm hinzufügen“-Hinweis
- **Akzeptanz:** Installierbar auf iOS/Android Browser

### F13 — Organisations-Minimal (kein CMS)

- Stationen/Aufgaben/Hinweise/Karte per **Seed-Skript oder YAML/JSON-Import** (Drizzle + Migration)
- Schutz: Admin-Secret oder VPN-only Route für:
  - Edition starten/stoppen
  - Leaderboard zurücksetzen (Notfall)
  - Team manuell sperren/entfernen
- **Akzeptanz:** Import setzt `field_count`; jede Feldnummer 1…N hat Station

### F14 — Observability & Betrieb

- Health-Endpoint
- Strukturiertes Logging (Zug, Scan, Bewertung)
- Docker-Image + Env-Konfiguration passend zu ticketing-Deployment
- **Akzeptanz:** Ein Befehl Deploy; DB-Backup dokumentiert

---

## Explizit außerhalb MVP (V1/V2 im Scope-Dokument)

| Feature | Phase |
|---------|--------|
| Vollständiges Admin-CMS (Stationen im UI pflegen) | V1 |
| WebSocket/SSE Leaderboard | V1 |
| Offline-Spiel mit Sync-Queue | V2 |
| Mehrere parallele Editionen / Jahresarchiv UI | V1 |
| Anti-Cheat (GPS-Nähe zur Station) | V2 |
| Mehrsprachigkeit | V1 |
| Team-Statistiken / Replay | V2 |
| Push-Benachrichtigungen | V2 |
| Integration Pretix-Ticket → Auto-Team | V2 |
| Team-QR von anderem Team scannen (Team-vs-Team-Aufgaben) | V2 |

---

## Datenmodell (MVP, grob)

**Tabellen / Entitäten:**

- `editions` — name, **field_count**, starts_at, ends_at, config (dice_max, hint_timers, hint_point_costs, crew_password_hash)
- `stations` — field_number (1…N unique), slug, hints (text×3), map_x/map_y, qr_token, task_type (`quiz`|`performance`)
- `tasks` — station_id, type (`quiz`|`performance`), payload JSON (question, answers, performance_text)
- `teams` — …, **score_total**, **reached_goal_at?**, **completed_fields** (Bitmask/JSON 1…N), …
- `turns` — …, **score_delta**, **hint_level_used**, **quiz_wrong_attempts**, **duration_sec**
- `turns` — team_id, dice_value, position_from, position_pending, state, hint_level_used, timestamps
- `task_attempts` — turn_id, answers, success_at
- `crew_ratings` — turn_id, crew_user_id, rating, bonus_applied
- `crew_users` — optional MVP: nur shared crew role

**Shared Layer:** Zod-Schemas in `web/shared/` für API-Contracts (wie Schwarmplaner).

---

## API-Oberfläche (MVP, grob)

| Bereich | Beispiel-Endpunkte |
|---------|-------------------|
| Public | `GET /api/leaderboard`, `GET /api/health` |
| Team (Session) | `POST /api/teams`, `GET /api/me`, `POST /api/turns/roll`, `POST /api/turns/:id/scan`, `POST /api/turns/:id/answer`, `POST /api/turns/:id/confirm`, `POST /api/turns/:id/hint`, `POST /api/turns/:id/abandon` |
| Crew | `POST /api/crew/login`, `GET /api/crew/teams/search`, `POST /api/crew/rate` |
| Admin | `POST /api/admin/editions`, `POST /api/admin/import-stations` (Secret-geschützt) |

---

## Nicht-funktionale Anforderungen MVP

| Thema | Ziel |
|-------|------|
| **Last** | ~30–80 Teams gleichzeitig, 30–50 aktive Stationen |
| **Latenz** | API < 300 ms p95 auf Festival-WLAN |
| **Sicherheit** | Team-Session opaque; Crew/Admin getrennt; Rate-Limits auf Roll/Scan |
| **DSGVO** | Nur Teamname + Spielverlauf; kurze Speicherfrist nach Festival; `/privacy` page (EN) |
| **Barrierefreiheit** | Große Touch-Targets (44px+), Kontrast, readable body text, **English UI** |
| **Design** | 8-Bit Retro-Hybrid, Palette „Dawn Forest“, eigene Pixel-Komponenten |
| **Locale** | `en` only (MVP); copy in code/YAML, no runtime language switch |

---

## MVP-Content-Stand

- **N = Anzahl Stationen** (z.B. 30–50); Brett zeigt exakt N Felder
- Import-YAML: Feldnummer 1…N lückenlos, Aufgabe (Quiz default), optional Performance + `crew_station: true`
- Crew-Performance nur wo Menschen mit Erkennungsmerkmal am Stand sind

---

## Nächste Schritte (nach Scope-Freigabe)

1. **Spielregel-Klärer:** Default bei „nicht gefunden, keine Hinweise“ final bestätigen (siehe oben)
2. **Repo-Scaffold** nach Schwarmplaner-Muster (`web/`, pnpm, Nuxt 4, Drizzle, SQLite)
3. **Doc skills** — canonical five under `.cursor/skills/` (`docs-init cursor full`); core rules in `.cursor/rules/`
4. **Implementierung in Wellen:** Domain/DB → Team-Loop → Crew → Leaderboard → PWA → Deploy

---

## Deliverable dieses Plans

Nach deiner Freigabe: Scope als `docs/SCOPE.md` (oder `docs/game/SCOPE.md`) im Repo festhalten — das wird die verbindliche Referenz für alle folgenden Implementierungs-PRs.
