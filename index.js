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

client.once('clientReady', () => {
  console.log(`✅ Bot online als ${client.user.tag} – bereit für @mentions`);
});

// === @MENTION ===
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.mentions.has(client.user)) return;

  console.log(`\n🎯 NEUE @MENTION von ${message.author.tag} (${message.author.id}) in #${message.channel.name || message.channel.id}`);
  console.log(`📝 Nachricht: "${message.content}"`);

  message.channel.sendTyping();

  const payload = {
    type: "message",
    user: message.author.username,
    userId: message.author.id,
    userTag: message.author.tag,
    content: message.content.replace(`<@${client.user.id}>`, '').trim(),
    rawContent: message.content,
    attachments: message.attachments.map(a => ({ url: a.url, name: a.name })) || [],
    channelId: message.channel.id,
    channelName: message.channel?.name || "DM",
    guildId: message.guild?.id || null,
    messageId: message.id
  };

  try {
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload, null, 2)
    });

    console.log(`➡️ An n8n gesendet – Status: ${res.status} ${res.statusText}`);
    if (!res.ok) {
      const text = await res.text();
      console.error('❌ n8n hat Fehler zurückgegeben:', text.substring(0, 500));
    } else {
      console.log('✅ Payload erfolgreich an n8n übergeben');
    }
  } catch (err) {
    console.error('🚨 Netzwerkfehler beim Senden an n8n:', err.message);
  }
});

// === EXPRESS – RÜCKANTWORT VON N8N ===
const app = express();
app.use(express.json({ limit: '50mb' }));

app.post('/discord-response', async (req, res) => {
  console.log('\n🔙🔙🔙 N8N SCHICKT RÜCKANTWORT! 🔙🔙🔙');
  console.log('Raw Body:', JSON.stringify(req.body, null, 2));

  const { replyTo, message, channelId, embeds, files } = req.body;

  if (!channelId || !replyTo) {
    console.error('❌ FEHLENDE DATEN – replyTo oder channelId fehlt!');
    return res.status(400).json({ error: "replyTo & channelId required" });
  }

  try {
    const channel = await client.channels.fetch(channelId);
    console.log(`📬 Sende in Channel ${channel.name || channelId} an <@${replyTo}>`);

    await channel.send({
      content: message ? `<@${replyTo}> ${message}` : undefined,
      embeds: embeds || undefined,
      files: files || undefined,
      allowedMentions: { users: [replyTo] }
    });

    console.log('🎉 NACHRICHT ERFOLGREICH IM DISCORD GESENDET!');
    res.json({ success: true });
  } catch (err) {
    console.error('💥 FEHLER BEIM SENDEN INS DISCORD:', err.message);
    console.error(err.stack);
    res.status(500).json({ error: err.message });
  }
});

// Health-Check (nur damit wir sehen, dass der Server lebt)
app.get('/', (req, res) => res.send('TerpTorch-Bot läuft – alles gut im Hood!'));

app.listen(PORT, () => {
  console.log(`🚀 Webhook-Server läuft auf Port ${PORT}`);
  console.log(`   POST → https://bot.weeel.de/discord-response`);
});

client.login(BOT_TOKEN);
