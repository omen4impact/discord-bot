require('dotenv').config(); // lädt .env Variablen
const { Client, GatewayIntentBits } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// n8n Webhook URL aus Environment
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
if (!N8N_WEBHOOK_URL) {
    console.error("⚠️ Bitte N8N_WEBHOOK_URL in .env setzen!");
    process.exit(1);
}

// Discord Bot Token aus Environment
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
    console.error("⚠️ Bitte BOT_TOKEN in .env setzen!");
    process.exit(1);
}

// Discord Client erstellen
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Bot ready Event
client.on('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

// Nachrichten Event
client.on('messageCreate', async (message) => {
    console.log('Message received:', message.content);
    console.log('Author:', message.author.username);

    // eigene Nachrichten ignorieren
    if (message.author.bot) return;

    // Prüfen, ob der Bot erwähnt wurde
    if (message.mentions.has(client.user)) {
        console.log('⚡ Bot was mentioned! Sending to n8n...');

        try {
            const payload = {
                user: message.author.username,
                userId: message.author.id,
                content: message.content,
                attachments: message.attachments.map(a => a.url),
                channel: message.channel.name
            };

            const res = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                console.error('❌ Failed to send to n8n:', res.statusText);
            } else {
                console.log('✅ Sent to n8n Webhook:', payload);
            }

        } catch (err) {
            console.error('❌ Error sending to n8n:', err);
        }
    }
});

// Bot starten
client.login(BOT_TOKEN);
