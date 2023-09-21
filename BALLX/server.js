const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

let players = {};
let waitingPlayers = [];

wss.on('connection', function connection(ws) {
    console.log('A new player connected.');
    console.log('Player ID:', ws._playerId);

    ws.on('message', function incoming(data) {
        

        let parsedData = JSON.parse(data);

        if (parsedData.type === 'matchmaking') {
            console.log('Received matchmaking request from player ID:', parsedData.id);
            ws._playerId = parsedData.id;
            console.log("Updated player ID:", ws._playerId);

            waitingPlayers.push({ ws: ws, id: parsedData.id });
            console.log('Current waiting players:', waitingPlayers.map(p => p.id));

            if (waitingPlayers.length >= 2) {
                const player1 = waitingPlayers.shift();
                const player2 = waitingPlayers.shift();

                console.log('Match found between player1 ID:', player1.id, ' and player2 ID:', player2.id);

                const matchId = generateMatchId();

                player1.ws.send(JSON.stringify({ type: 'matchFound', matchId: matchId, player: 'Player 1' }));
                console.log('Inviato matchFound a Player 1');

                player2.ws.send(JSON.stringify({ type: 'matchFound', matchId: matchId, player: 'Player 2' }));
                console.log('Inviato matchFound a Player 2');
            }
        } else if (parsedData.type === 'updatePosition') {
        
            players[parsedData.id] = parsedData.position;
        
            wss.clients.forEach(function each(client) {
                if (client !== ws && client.readyState === WebSocket.OPEN) { 

                    client.send(JSON.stringify({ type: 'updatePlayers', players: players }));
                } else {
                }
            });
        } else if (parsedData.type === 'fireBullet') {
            wss.clients.forEach(function each(client) {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'fireBullet', playerId: ws._playerId, ...parsedData }));
                }
            });
        }
        else if (parsedData.type === 'bulletCollision') {
            console.log('Bullet collision detected for player ID:', parsedData.id);
        
            // Invia un messaggio a tutti i client per informarli della collisione
            wss.clients.forEach(function each(client) {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'bulletCollision',
                        id: parsedData.id,
                        health: parsedData.health,
                        matchId: parsedData.matchId
                    }));
                }
            });
        }
        
    });

    ws.on('close', function close() {
        console.log("Player disconnected with ID:", ws._playerId);

        waitingPlayers = waitingPlayers.filter(player => player.ws !== ws);

        if (ws._playerId) {
            delete players[ws._playerId];
        }

        wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'playerDisconnected', id: ws._playerId }));
            }
        });
    });
});

function generateMatchId() {
    return Math.random().toString(36).substr(2, 9);
}

console.log('Server is running on ws://localhost:8080');