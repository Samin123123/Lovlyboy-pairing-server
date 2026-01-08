// Node.js Backend for LovlyBoy WhatsApp Pairing
const express = require("express");
const cors = require("cors");
const path = require("path");

// Baileys WhatsApp Library
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const Pino = require("pino");

const app = express();
app.use(cors());
app.use(express.json());

// Serve HTML files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// WhatsApp Bot setup
let sock;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  
  sock = makeWASocket({
    logger: Pino({ level: 'silent' }),
    auth: state,
    printQRInTerminal: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if(connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if(reason !== DisconnectReason.loggedOut) {
        startBot(); // Auto reconnect
      }
    }
  });
}

// Pairing API
app.post('/pair', async (req, res) => {
  try {
    const number = req.body.number;
    if(!number) return res.json({ error: 'Number required' });

    const code = await sock.requestPairingCode(number);
    res.json({ success: true, code });
  } catch(e) {
    res.json({ success: false, error: e.message });
  }
});

// Start Bot & Server
startBot();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open your browser: /index.html`);
});
