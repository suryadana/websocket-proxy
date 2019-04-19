const url = require('url');
const fs = require('fs');
const https = require('https');
const http = require('http');
const WebSocketServer = require('ws').Server;
const WebSocket = require('ws');

const server = new https.createServer({
  cert: fs.readFileSync('/etc/letsencrypt/live/www.domain.com/fullchain.pem'),
  key: fs.readFileSync('/etc/letsencrypt/live/www.domain.com/privkey.pem')
});

Array.prototype.random = function () {
  return this[Math.floor((Math.random()*this.length))];
}

const site_keys = [
  "xxxx",
];

function pad(number, length) {
  var str = '' + number;
  while (str.length < length) {
    str = '0' + str;
  }
  return str;
}

const core = {};

for (let i = 1; i <= 32; i++)
{
  const number = pad(i, 3);
  core['ws_proxy' + number] = new WebSocketServer({ noServer: true });
  core['wsc_' + number] = new WebSocket('wss://ws' + number + '.coinhive.com/proxy');
  console.log(core['wsc_'+number]);

  core['ws_proxy' + number].on('connection', function(ws, request) {

    ws.on('message', function(message) {
      console.log('[Server][' + number + '] Message from server :', message);
      const message_json = JSON.parse(message);
      if (message_json['type'] === 'auth') {
        message_json['params']['site_key'] = site_keys.random();
        message = JSON.stringify(message_json);
        console.log('[Server][' + number + '] Change auth:', message);
      }
      core['wsc_' + number].send(message);
    });

    core['wsc_' + number].on('message', function(message) {
      console.log('[Server][' + number + '] Message from client:', message);
      core['ws_proxy' + number].clients.forEach( function each(client) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    });

  });
}


server.on('upgrade', function upgrade(request, socket, head) {
  const pathname = url.parse(request.url).pathname;

  let key_proxy = pathname.replace('/', '');
  key_proxy = 'ws_' + key_proxy;

  if (key_proxy in core) {
    core[key_proxy].handleUpgrade(request, socket, head, function done(ws) {
      core[key_proxy].emit('connection', ws, request);
    });
  } else {
    try {
      socket.destory();
    } catch (e) {

    }
  }
});


server.listen(8010);

