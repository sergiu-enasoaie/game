var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var engine = require('./public/game')
var gameStarted = false;
var gameInterval, updateInterval;

function genName() {
  var names = [
    'Babel',
    'Ionic',
    'Sass',
    'Jade',
    'AngularJS',
    'React',
    'Redux',
    'jQuery',
    'LeSS',
    'PhantomJS',
    'Git',
  ];
  return names[Math.floor(Math.random() * names.length)];
}

// TODO: extract below
function gameLoop() {
  // move everyone around
  Object.keys(engine.players).forEach((playerId) => {
    let player = engine.players[playerId];
    engine.movePlayer(playerId);

    if (engine.players[playerId].score == engine.gameWin) {
      gameStarted = false;
      io.emit('gameFinished');
      
      // clearInterval(gameInterval);
      // clearInterval(updateInterval);
    }
  })
}

// ----------------------------------------
// Main server code
// ----------------------------------------

// serve css and js
app.use(express.static(__dirname))

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});


function emitUpdates() {
  // tell everyone what's up
  io.emit('gameStateUpdate', { players: engine.players, doubloon: engine.doubloon });
}

io.on('connection', function(socket){
  console.log('User connected: ', socket.id);

  // set socket listeners
  socket.on('playerWantsToJoin', function () {

    // don't add any more players
    if (gameStarted) {
      socket.emit('enoughPlayers');
      return;
    }

    // get open position
    var posX = 0
    var posY = 0
    while (!engine.isValidPosition({ x: posX, y: posY }, socket.id)) {
      posX = Math.floor(Math.random() * Number(engine.gameSizeX) - 100) + 10
      posY = Math.floor(Math.random() * Number(engine.gameSizeY) - 100) + 10
    }

    // add player to engine.players obj
    engine.players[socket.id] = {
      accel: {
        x: 0,
        y: 0
      },
      x: posX,
      y: posY,
      colour: engine.stringToColour(socket.id),
      score: 0,
      name: genName()
    }

    // send the curent number of players so we show exactly what happens
    io.emit('currentPlayers', Object.keys(engine.players).length);

    // start game if this is the first player
    if (Object.keys(engine.players).length == engine.maxPlayers) {
      gameStarted = true;
    }
  });

  socket.on('start', function() {
    io.emit('startGame');
    engine.shuffleDoubloon();
    gameInterval = setInterval(gameLoop, 25);
    updateInterval = setInterval(emitUpdates, 40);
  });

  // set socket listeners
  socket.on('disconnect', function () {
    if (engine.players[socket.id]) {
      delete engine.players[socket.id];

      // send the curent number of players so we show exactly what happens
      io.emit('currentPlayers', Object.keys(engine.players).length);

      gameStarted = false;
    }
   
    // end game if there are no engine.players left
    if (gameStarted) return;
    if (Object.keys(engine.players).length > 0) {
      io.emit('gameStateUpdate', { players: engine.players, doubloon: engine.doubloon });
    } else {
      clearInterval(gameInterval)
      clearInterval(updateInterval)
    }
  });

  socket.on('up', function (msg) {
    engine.accelPlayer(socket.id, 0, -1)
  });

  socket.on('down', function (msg) {
    engine.accelPlayer(socket.id, 0, 1)
  })

  socket.on('left', function (msg) {
    engine.accelPlayer(socket.id, -1, 0)
  });

  socket.on('right', function (msg) {
    engine.accelPlayer(socket.id, 1, 0)
  })
});

http.listen(process.env.PORT || 8080, function(){
  console.log('listening on *:8080', process.env.PORT);
});
