# Codex n8n Bridge

Deze bridge laat n8n Cloud Codex-taken starten via HTTP. n8n stuurt JSON naar de server, de bridge start `codex exec` in de juiste projectmap, en stuurt na afloop een callback terug naar n8n.

## Flow

1. n8n stuurt `POST /tasks` naar deze bridge.
2. De bridge valideert `Authorization: Bearer <BRIDGE_TOKEN>`.
3. De bridge zoekt de projectconfig op in `projects.json`.
4. De bridge start Codex CLI non-interactief in die projectmap.
5. Codex voert de taak uit en maakt optioneel een commit.
6. De bridge stuurt het resultaat naar `callbackUrl`.

## Installatie

```bash
cd codex-bridge
cp .env.example .env
cp projects.example.json projects.json
npm start
```

Zet in `.env` minimaal een lange geheime waarde voor `BRIDGE_TOKEN`.

Op je server moet de Codex CLI beschikbaar zijn. Als `codex` niet in `PATH` staat, zet dan `CODEX_BIN` op het volledige pad.

Laat de bridge bij voorkeur op `HOST=127.0.0.1` draaien en zet er een reverse proxy met HTTPS voor, bijvoorbeeld Caddy, nginx of Traefik. Wil je de Node-server zelf rechtstreeks exposen, zet dan `HOST=0.0.0.0`.

## Projecten instellen

Pas `projects.json` aan:

```json
{
  "arc-booking": {
    "cwd": "/srv/projects/ARC-Booking_FeatureOverzicht",
    "model": "gpt-5",
    "reasoningEffort": "medium",
    "sandbox": "workspace-write",
    "branchPrefix": "codex/n8n-",
    "allowCommit": true
  }
}
```

Gebruik per project een eigen key. n8n hoeft dan alleen `project: "arc-booking"` mee te sturen.

## Request vanuit n8n

Gebruik in n8n een HTTP Request node:

- Method: `POST`
- URL: `https://jouw-server.example.com/tasks`
- Header: `Authorization: Bearer <BRIDGE_TOKEN>`
- Header: `Content-Type: application/json`
- Body:

```json
{
  "project": "arc-booking",
  "task": "Voeg een zoekfunctie toe aan de boekingstabel en commit de wijziging.",
  "context": {
    "source": "n8n",
    "ticket": "ARC-123"
  },
  "commit": true,
  "callbackUrl": "https://jouw-n8n-cloud-url/webhook/codex-result"
}
```

De bridge reageert direct:

```json
{
  "jobId": "uuid",
  "status": "queued",
  "branchName": "codex/n8n-voeg-een-zoekfunctie-toe-1234abcd",
  "statusUrl": "/tasks/uuid"
}
```

## Callback naar n8n

Na afloop stuurt de bridge:

```json
{
  "jobId": "uuid",
  "status": "completed",
  "project": "arc-booking",
  "task": "Voeg een zoekfunctie toe aan de boekingstabel en commit de wijziging.",
  "result": {
    "exitCode": 0,
    "finalMessage": "Samenvatting van Codex...",
    "logFile": "./jobs/uuid.log",
    "outputFile": "./jobs/uuid.final.txt"
  }
}
```

De callback bevat ook `x-codex-bridge-signature`, een HMAC-SHA256 over de body met `BRIDGE_TOKEN`. Daarmee kun je in n8n controleren dat de callback echt van je bridge komt.

## Aanbevolen beveiliging

- Zet de bridge achter HTTPS.
- Gebruik een lange random `BRIDGE_TOKEN`.
- Zet alleen expliciet toegestane projecten in `projects.json`.
- Laat `sandbox` standaard op `workspace-write`.
- Begin met `MAX_CONCURRENT_JOBS=1` per server om git-conflicten te voorkomen.
- Gebruik per project een aparte server-user of container als je strenger wilt isoleren.
