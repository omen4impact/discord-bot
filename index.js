require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fetch = require('node-fetch');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

client.on('clientReady', () => {
    console.log(`Logged in as ${client.user.tag}`);
});


client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.mentions.has(client.user)) {
        await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user: message.author.username,
                userId: message.author.id,
                content: message.content,
                attachments: message.attachments.map(a => a.url)
            })
        });
    }
});

client.login(process.env.BOT_TOKEN);
