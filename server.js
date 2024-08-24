const express = require('express');
const fs = require('fs').promises;
const WebSocket = require('ws');
const app = express();

app.use(express.static('public'))
app.use(express.static('files'))

// Initialize WebSocket server
const wss = new WebSocket.Server({ port: 3001 });

// WebSocket event handling
wss.on('connection', (ws) => {
  console.log('A new client connected.');

  // Event listener for incoming messages
  ws.on('message', (message) => {
    console.log('Received message:', message.toString());

    // Broadcast the message to all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message.toString());
      }
    });
  });

  // Event listener for client disconnection
  ws.on('close', () => {
    console.log('A client disconnected.');
  });
});

app.post('/data_stream', (request, respond) => {
  var buffer = [];
  filePath = __dirname + '/public/data.json'; //file that stores old data

  //read data body
  request.on('data', (data) => {
    console.log(JSON.parse(data))
    buffer.push(JSON.parse(data));
  });

  request.on('end', async () => {
    var combined_data = []
    
    //send the new reading to all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(buffer[0]));
      }
    });
  
    //read stored data from a file
    try {
      let data = await fs.readFile(filePath, 'utf8');
      //console.log("readfile = ",data)
      var stored_data = JSON.parse(data);
      combined_data = combined_data.concat(stored_data)
    } catch (e) {
      console.warn('no data.json present, creating new file')
    }

    combined_data = combined_data.concat(buffer)
    //console.log(buffer,combined_data)

    //append and store new reading on a file
    await fs.writeFile(filePath, JSON.stringify(combined_data, null, 4));
    respond.end();
  });

  
});

app.get('/logger', (request, respond) => {
  respond.sendFile(__dirname+'/client/index.html');
})

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`The server is listening for data on http://localhost:${PORT}/data_stream`);
    console.log(`To open the logger head over to http://localhost:${PORT}/logger`);
    console.log('Press Ctrl+C to quit.');
});