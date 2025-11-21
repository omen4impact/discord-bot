require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BOT_TOKEN = process.env.BOT_TOKEN;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN || !N8N_WEBHOOK_URL) {
  console.error("⚠️ BOT_TOKEN und N8N_WEBHOOK_URL in .env fehlen!");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`✅ Bot läuft als ${client.user.tag} – nur @mentions aktiv`);
});

// Wenn jemand den Bot mit @ anschreibt
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.mentions.has(client.user)) return;

  // Optional: reagier sofort mit Typing, damit User sieht "Bot tippt..."
  message.channel.sendTyping();

  const payload = {
    type: "message",
    user: message.author.username,
    userId: message.author.id,
    userTag: message.author.tag,           // z. B. Omen#1234
    content: message.content.replace(`<@${client.user.id}>`, '').trim(), // bereinigt den @Bot raus
    rawContent: message.content,
    attachments: message.attachments.map(a => ({ url: a.url, name: a.name })),
    channelId: message.channel.id,
    channelName: message.channel?.name || "DM",
    guildId: message.guild?.id || null,
    guildName: message.guild?.name || null,
    messageId: message.id
  };

  try {
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log('➡️ An n8n gesendet – Status:', res.status);
    if (!res.ok) {
      const text = await res.text();
      console.error('❌ n8n Fehler:', text);
      // optional: sofortige Fehlermeldung im Channel
      message.reply("Irgendwas ist bei mir schiefgelaufen 😓");
    }
  } catch (err) {
    console.error('❌ Netzwerkfehler zu n8n:', err);
    message.reply("Kann n8n gerade nicht erreichen 🚨");
  }
});

// Express: n8n schickt die Antwort zurück
const app = express();
app.use(express.json({ limit: '50mb' }));   // für große Bilder/Files

app.post('/discord-response', async (req, res) => {
  const { replyTo, message, channelId, embeds, files } = req.body;

  if (!channelId || !replyTo) {
    return res.status(400).json({ error: "channelId & replyTo fehlen" });
  }

  try {
    const channel = await client.channels.fetch(channelId);

    await channel.send({
      content: message ? `<@${replyTo}> ${message}` : undefined,
      embeds: embeds || undefined,
      files: files || undefined,                   // falls du Attachments zurückschicken willst
      allowedMentions: { users: [replyTo] }
    });

    console.log(`✅ Antwort an <@${replyTo}> in #${channel.name || channelId} gesendet`);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Fehler beim Senden der Antwort:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Webhook-Server läuft auf Port ${PORT} → /discord-response`);
});

client.login(BOT_TOKEN);
