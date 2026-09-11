const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

let tracked = new Set();

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth');
    const sock = makeWASocket({ 
        logger: pino({ level: 'silent' }), 
        auth: state,
        printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveCreds);

    // Get pairing code
    if (!sock.authState.creds.registered) {
        const phone = process.env.PHONE; // We will set this on Railway
        if (phone) {
            const code = await sock.requestPairingCode(phone);
            console.log(`\n\n=== YOUR PAIRING CODE: ${code} ===\n\n`);
        } else {
            console.log("Set PHONE env variable like: 23480xxxxxxx");
        }
    }

    // Track online/offline
    sock.ev.on('presence.update', async ({ id, presences }) => {
        if (tracked.has(id)) {
            const status = presences[id].lastKnownPresence;
            const time = new Date().toLocaleTimeString();
            const name = id.split('@')[0];
            console.log(`${name} is now ${status} at ${time}`);
            // Send to yourself
            await sock.sendMessage(sock.user.id, { text: `👀 ${name} is now *${status}* at ${time}` });
        }
    });

    // Commands
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
        const from = msg.key.remoteJid;

        if (text?.startsWith('.track ')) {
            const num = text.split(' ')[1].replace('+','') + '@s.whatsapp.net';
            tracked.add(num);
            await sock.sendMessage(from, { text: `✅ Now tracking: ${num.split('@')[0]}` });
        }
        if (text?.startsWith('.untrack ')) {
            const num = text.split(' ')[1].replace('+','') + '@s.whatsapp.net';
            tracked.delete(num);
            await sock.sendMessage(from, { text: `❌ Stopped tracking: ${num.split('@')[0]}` });
        }
        if (text === '.tracklist') {
            await sock.sendMessage(from, { text: `Tracking: \n${[...tracked].map(n=>n.split('@')[0]).join('\n') || 'None'}` });
        }
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            if (lastDisconnect.error?.output?.statusCode!== DisconnectReason.loggedOut) {
                startBot();
            }
        }
    });
}
startBot();# This is a basic workflow to help you get started with Actions

name: CI

# Controls when the workflow will run
on:
  # Triggers the workflow on push or pull request events but only for the "main" branch
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

  # Allows you to run this workflow manually from the Actions tab
  workflow_dispatch:

# A workflow run is made up of one or more jobs that can run sequentially or in parallel
jobs:
  # This workflow contains a single job called "build"
  build:
    # The type of runner that the job will run on
    runs-on: ubuntu-latest

    # Steps represent a sequence of tasks that will be executed as part of the job
    steps:
      # Checks-out your repository under $GITHUB_WORKSPACE, so your job can access it
      - uses: actions/checkout@v4

      # Runs a single command using the runners shell
      - name: Run a one-line script
        run: echo Hello, world!

      # Runs a set of commands using the runners shell
      - name: Run a multi-line script
        run: |
          echo Add other actions to build,
          echo test, and deploy your project.
