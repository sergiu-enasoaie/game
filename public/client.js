
    var socket = io();
    var canvas = document.getElementById('game');
    var join = document.getElementById('join');
    var ctx = canvas.getContext('2d');
    var localDirection; // used to display accel direction
    var gameLoopVar;
    var enoughPlayers = false;

    // register service worker
    if ('serviceWorker' in navigator) {
      console.log("Will the service worker register?");
      navigator.serviceWorker.register('service-worker.js')
        .then(function (reg) {
          console.log("Yes, it did.");
        }).catch(function (err) {
          console.log("No it didn't. This happened:", err)
        });
    }

    // add event that will add the player on the list 
    join.addEventListener('click', function(event){
      enoughPlayers = false;
      document.getElementById('waitingContainer').style.display = 'block';
      document.getElementById('joinContainer').style.display = 'none';
      socket.emit('playerWantsToJoin');
      if (document.getElementById('maxPlayer')) document.getElementById('maxPlayer').innerHTML = maxPlayers;
    });

    socket.on('currentPlayers', (count) => {
      if (document.getElementById('connected')) document.getElementById('connected').innerHTML = count;
    });
    
    socket.on('startGame', function(){
      if (enoughPlayers) return;
      document.getElementById('waitingContainer').style.display = 'none';
      document.getElementById('gameContainer').style.display = 'block';
      gameLoopVar = setInterval(gameLoop, 25);
      requestAnimationFrame(drawGame);
    });

    socket.on('enoughPlayers', function() {
      enoughPlayers = true;
      document.getElementById('waitingContainer').querySelector('h3').innerText = 'The limit of maximum players was reached!';
      document.getElementById('waitingContainer').querySelector('span').innerText = 'Refresh and try to join again, maybe a spot is opened.';
    });

    socket.on('gameStateUpdate', updateGameState);
    socket.on('gameFinished', () => {
      if (enoughPlayers) {
        document.getElementById('waitingContainer').style.display = 'none';
        document.getElementById('gameStats').innerHTML = 'The game has finished, maybe next time!';
        return;
      }
      document.getElementById('gameContainer').style.display = 'none';
      var theWinner = Object.keys(players).filter(playerId => playerId == socket.id && players[playerId].score == 3);
      if (theWinner.length === 1) {
        document.getElementById('gameStats').innerHTML = 'You\'ve won a shot, come in front :)';
      } else {
        document.getElementById('gameStats').innerHTML = 'Game Over. You\'ve LOST :(';
      }
    });

    var playerImages = {};
    function drawPlayers(players) {
      // draw players
      // the game world is 500x500, but we're downscaling 5x to smooth accel out
      Object.keys(players).forEach((playerId) => {
        let player = players[playerId];
        var direction;

        if (!playerImages.hasOwnProperty(playerId)) {
          var image = new Image(20, 20);   // using optional size for image
          // load an image of intrinsic size 300x227 in CSS pixels
          if (playerId == socket.id) {
            image.src = `public/images/shot-sergiu.png`;
          } else {
            image.src = `public/images/black.png`;
          }

          playerImages[playerId] = image;
          image.onload = function () {
            ctx.drawImage(playerImages[playerId], player.x / 5, player.y / 5, playerSize / 5, playerSize / 5);
          }
        } else {
          ctx.drawImage(playerImages[playerId], player.x / 5, player.y / 5, playerSize / 5, playerSize / 5);
        }
        
        // ctx.fillStyle = player.colour;
        // ctx.fillRect(player.x/5, player.y/5, playerSize/5, playerSize/5);

        if (playerId == socket.id) {
          direction = localDirection
        } else {
          direction = player.direction
        }
        // draw accel direction for current player based on local variable
        // the idea here is to give players instant feedback when they hit a key
        // to mask the server lag
        ctx.fillStyle = 'black';
        let accelWidth = 3
        switch(direction) {
          case 'up':
            ctx.fillRect(player.x/5, player.y/5 - accelWidth, playerSize/5, accelWidth);
            break
          case 'down':
            ctx.fillRect(player.x/5, player.y/5  + playerSize/5, playerSize/5, accelWidth);
            break
          case 'left':
            ctx.fillRect(player.x/5 - accelWidth, player.y/5, accelWidth, playerSize/5);
            break
          case 'right':
            ctx.fillRect(player.x/5 + playerSize/5, player.y/5, accelWidth, playerSize/5);
        }
      })
    }

    var image = new Image(20, 20);   // using optional size for image
    // load an image of intrinsic size 300x227 in CSS pixels
    image.src = `public/images/mouth.png`;
    function updateGameState(gameState) {
      // update local state to match state on server
      players = gameState.players
      doubloon = gameState.doubloon

      // draw stuff
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      Object.keys(players).forEach((playerId) => {
        if (playerId == socket.id) {
          let player = players[playerId]
          document.getElementById('name').innerHTML = player.name;
          document.getElementById('score').innerHTML = player.score;
        }
      });
      

      // draw doubloon
      ctx.beginPath();

      // ctx.drawImage(image, doubloon.x / 5, doubloon.y / 5, doubloonSize, doubloonSize);
      ctx.drawImage(image, (doubloon.x + doubloonSize / 2) / 5, (doubloon.y + doubloonSize / 2) / 5, doubloonSize / 2, doubloonSize / 2);
      // ctx.arc((doubloon.x + doubloonSize/2)/5, (doubloon.y + doubloonSize/2)/5, doubloonSize/5, 0, 2 * Math.PI, false);
      // ctx.fillStyle = 'gold';
      // ctx.fill();
      // ctx.lineWidth = 2;
      // ctx.strokeStyle = '#003300';
      // ctx.stroke();

      drawPlayers(players)
    }

    // key handling
    $('html').keydown(function(e) {
      if (e.key == "ArrowDown") {
        socket.emit('down', players);
        accelPlayer(socket.id, 0, 1)
        localDirection = 'down'
      } else if (e.key == "ArrowUp") {
        socket.emit('up', players);
        accelPlayer(socket.id, 0, -1)
        localDirection = 'up'
      } else if (e.key == "ArrowLeft") {
        socket.emit('left', players);
        accelPlayer(socket.id, -1, 0)
        localDirection = 'left'
      } else if (e.key == "ArrowRight") {
        socket.emit('right', players);
        accelPlayer(socket.id, 1, 0)
        localDirection = 'right'
      }
    })

    $('.navigation').on('click', function () {
      if ($(this).data('id') == "down") {
        socket.emit('down', players);
        accelPlayer(socket.id, 0, 1)
        localDirection = 'down'
      } else if ($(this).data('id') == "up") {
        socket.emit('up', players);
        accelPlayer(socket.id, 0, -1)
        localDirection = 'up'
      } else if ($(this).data('id') == "left") {
        socket.emit('left', players);
        accelPlayer(socket.id, -1, 0)
        localDirection = 'left'
      } else if ($(this).data('id') == "right") {
        socket.emit('right', players);
        accelPlayer(socket.id, 1, 0)
        localDirection = 'right'
      }
    });

    function gameLoop() {
      // update game
      updateGameState({ players: players, doubloon: doubloon})
      // move everyone around
      Object.keys(players).forEach((playerId) => {
        let player = players[playerId]
        movePlayer(playerId)
      })
    }

    function drawGame() {
      // draw stuff
      drawPlayers(players)
      requestAnimationFrame(drawGame)
    }

