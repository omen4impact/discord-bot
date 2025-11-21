require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const bodyParser = require('body-parser');

// fetch Polyfill
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BOT_TOKEN = process.env.BOT_TOKEN;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const PORT = process.env.PORT || 3001;

if (!BOT_TOKEN || !N8N_WEBHOOK_URL) {
  console.error("⚠️ Bitte BOT_TOKEN und N8N_WEBHOOK_URL in .env setzen!");
  process.exit(1);
}

// Discord Bot Setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on('clientReady', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.mentions.has(client.user)) {
    const payload = {
      user: message.author.username,
      userId: message.author.id,
      content: message.content,
      attachments: message.attachments.map(a => a.url),
      channelId: message.channel.id,
      channelName: message.channel.name
    };

    try {
      const res = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('📡 HTTP Status von n8n:', res.status);
      const text = await res.text();
      console.log('📄 Response Body von n8n:', text);

      if (!res.ok) console.error('❌ Fehler beim Senden an n8n:', res.statusText);
      else console.log('✅ Nachricht erfolgreich an n8n gesendet:', payload);

    } catch (err) {
      console.error('❌ Fehler beim Senden an n8n:', err);
    }
  }
});

client.login(BOT_TOKEN);

// Express Webhook für Antworten vom n8n Workflow
const app = express();
app.use(bodyParser.json());

app.post('/discord-response', async (req, res) => {
  const { replyTo, message, channelId } = req.body;

  try {
    const channel = await client.channels.fetch(channelId);
    await channel.send({
      content: `<@${replyTo}> ${message}`,
      allowedMentions: { users: [replyTo] }
    });
    res.status(200).send('✅ Nachricht gesendet');
  } catch (err) {
    console.error('❌ Fehler beim Senden:', err);
    res.status(500).send('Fehler beim Senden');
  }
});

app.listen(PORT, () => console.log(`Webhook Server läuft auf Port ${PORT}`));
