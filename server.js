const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
app.use(express.static('public'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// sdílený stav dokumentu
let documentText = '';
let users = [];

// broadcast helper
function broadcast(obj) {
  const msg = JSON.stringify(obj);
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) c.send(msg);
  });
}

// nové připojení
wss.on('connection', ws => {
  console.log('WS: client connected');

  const user = {
    id: Date.now() + Math.random(),
    name: 'User' + Math.floor(Math.random() * 1000),
    color: '#' + Math.floor(Math.random() * 16777215).toString(16),
    cursor: 0
  };
  users.push(user);

  // po připojení – pošli aktuální stav jen novému klientovi
  ws.send(JSON.stringify({
    type: 'init',
    text: documentText,
    users
  }));

  // a všem pošli aktualizovaný seznam uživatelů
  broadcast({ type: 'users', users });

  ws.on('message', msg => {
    let data;
    try { data = JSON.parse(msg); } catch { return; }

    // typ: update textu
    if (data.type === 'edit') {
      documentText = data.text;
      broadcast({ type: 'text', text: documentText });
    }

    // typ: pohyb kurzoru
    if (data.type === 'cursor') {
      const u = users.find(u => u.id === user.id);
      if (u) u.cursor = data.cursor;
      broadcast({ type: 'users', users });
    }
  });

  ws.on('close', () => {
    users = users.filter(u => u.id !== user.id);
    broadcast({ type: 'users', users });
  });
});

server.listen(8080, () => {
  console.log('Ječná Docs běží na http://localhost:8080');
});
