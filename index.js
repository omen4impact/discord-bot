require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

// fetch Polyfill für Node <20
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!N8N_WEBHOOK_URL || !BOT_TOKEN) {
    console.error("⚠️ Bitte BOT_TOKEN und N8N_WEBHOOK_URL in .env setzen!");
    process.exit(1);
}

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
    console.log('Nachricht bekommen:', message.content);
    console.log('Von Benutzer:', message.author.username);
    console.log('Channel ID:', message.channel.id);

    if (message.author.bot) return;

    if (message.mentions.has(client.user)) {
        console.log('⚡ Bot wurde erwähnt! Sende Nachricht an n8n...');

        const payload = {
            user: message.author.username,
            userId: message.author.id,
            content: message.content,
            attachments: message.attachments.map(a => a.url),
            channel: message.channel.id
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

            if (!res.ok) {
                console.error('❌ Fehler beim Senden an n8n:', res.statusText);
            } else {
                console.log('✅ Nachricht erfolgreich an n8n gesendet:', payload);
            }

        } catch (err) {
            console.error('❌ Fehler beim Senden an n8n:', err);
        }
    }
});

client.login(BOT_TOKEN);
