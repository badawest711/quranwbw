#!/usr/bin/env node
// One-time script to register the Telegram webhook for the Arabic bot.
// Usage: node scripts/setup-arabic-webhook.js

import { config } from 'dotenv';
config();

const { ARABIC_BOT_TOKEN, ARABIC_BOT_WEBHOOK_SECRET } = process.env;
const APP_URL = process.argv[2]; // e.g. https://yourapp.com

if (!APP_URL) {
	console.error('Usage: node scripts/setup-arabic-webhook.js https://yourapp.com');
	process.exit(1);
}

const webhookUrl = `${APP_URL}/api/telegram-webhook`;

const res = await fetch(`https://api.telegram.org/bot${ARABIC_BOT_TOKEN}/setWebhook`, {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({
		url: webhookUrl,
		secret_token: ARABIC_BOT_WEBHOOK_SECRET,
		allowed_updates: ['message']
	})
});

const result = await res.json();
console.log(result.ok ? `✅ Webhook set to ${webhookUrl}` : `❌ Failed: ${result.description}`);
