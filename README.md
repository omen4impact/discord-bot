# TerpTorch Discord Bot + n8n Webhook

## Setup
1. .env.template kopieren nach .env und Werte eintragen
2. Auf GitHub pushen
3. Coolify → Neuer Service → Dockerfile auswählen
4. Environment-Variablen setzen (BOT_TOKEN, N8N_WEBHOOK_URL)
5. Build starten → Forced Deploy falls nötig
6. Workflow in n8n anlegen:
   - Webhook Node: POST auf /discord-webhook
   - Optional IF Node für Attachments / Channel
   - HTTP Request Node: POST auf http://<bot-ip>:3001/discord-response
