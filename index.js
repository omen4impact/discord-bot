require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BOT_TOKEN = process.env.BOT_TOKEN;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const APPLICATION_ID = process.env.APPLICATION_ID; // neu: deine Bot Application ID
const PORT = process.env.PORT || 3001;

if (!BOT_TOKEN || !N8N_WEBHOOK_URL || !APPLICATION_ID) {
  console.error("⚠️ BOT_TOKEN, N8N_WEBHOOK_URL und APPLICATION_ID in .env setzen!");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', () => {
  console.log(`✅ Bot läuft als ${client.user.tag}`);
});

// =============== WICHTIG: Interactions (Slash Commands, Buttons, etc.) ===============
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton() && !interaction.isModalSubmit()) return;

  // Sofort defern – wir haben max. 3 Sekunden Zeit!
  await interaction.deferReply({ ephemeral: false }); // oder true, je nach Wunsch

  const payload = {
    type: 'interaction',
    interactionId: interaction.id,
    interactionToken: interaction.token,
    applicationId: interaction.applicationId,
    user: interaction.user.username,
    userId: interaction.user.id,
    commandName: interaction.commandName || null,
    customId: interaction.customId || null,
    values: interaction.fields ? Object.fromEntries(interaction.fields.fields.map(f => [f.customId, f.value])) : null,
    channelId: interaction.channelId,
    guildId: interaction.guildId
  };

  try {
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log('📡 An n8n gesendet – Status:', res.status);
    if (!res.ok) {
      const text = await res.text();
      console.error('❌ n8n Fehler:', text);
      await interaction.editReply({ content: 'Fehler beim Verarbeiten (n8n)' });
    }
  } catch (err) {
    console.error('❌ Fetch Fehler:', err);
    await interaction.editReply({ content: 'Netzwerkfehler beim Kontaktieren von n8n' });
  }
});

// =============== Express Endpoint für Rückantwort von n8n ===============
const app = express();
app.use(express.json({ limit: '10mb' })); // body-parser ist deprecated

app.post('/discord-response', async (req, res) => {
  const { interactionToken, applicationId, content, embeds, files, ephemeral } = req.body;

  if (!interactionToken || !applicationId) {
    return res.status(400).json({ error: 'interactionToken & applicationId required' });
  }

  const webhookUrl = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`;

  try {
    await fetch(webhookUrl, {
      method: 'PATCH', // editReply = PATCH auf @original
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content,
        embeds,
        files,
        flags: ephemeral ? 64 : undefined // 64 = ephemeral
      })
    });

    console.log('✅ Antwort erfolgreich an Discord gesendet');
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Fehler beim Senden an Discord:', err);
    res.status(500).json({ error: err.message });
  }
});

// Optional: FollowUp falls du nach editReply noch mehr schicken willst
app.post('/discord-followup', async (req, res) => {
  const { interactionToken, applicationId, content, embeds } = req.body;
  const url = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}`;

  // gleiche Logik wie oben, nur POST statt PATCH
  // ...
});

app.listen(PORT, () => {
  console.log(`Webhook-Server läuft auf Port ${PORT}`);
});

client.login(BOT_TOKEN);
