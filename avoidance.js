// AVOIDANCE
// https://grahammak.es/games/avoidance

// config
var backgroundColor = 200;
var echoLength = 4;

var enemies = [];
var player = {
  isDead: false,
  hasPowerUp: false
};
var isGameStarted = false;
var currentLevel = 0;
var whiteVal = 255;
var blackVal = 0;

function setup() {
  createCanvas(window.innerWidth, window.innerHeight);
  strokeWeight(0);
  background(backgroundColor);
}

function draw() {
  if (isGameStarted) {
    if (player.isDead) {
      displayTextDialog('you suck');
      return;
    }
    // actual render loop
    background(backgroundColor);
    if (enemies.length > 0) {
      for (var i=0; i<enemies.length; i++) {
        enemies[i].drawEcho();
        enemies[i].drawSelf();
        enemies[i].update();
      }
    }
    else {
      currentLevel++;
      for (var j=0; j<currentLevel; j++) {
        createEnemy();
      }
    }
    textAlign(RIGHT, TOP);
    fill(blackVal);
    text(`level: ${currentLevel}`, width - 10, 10);
    // todo: break into own function, modulate glow with lfo
    if (player.hasPowerUp) {
      fill(255, 230, 0, 100);
      ellipse(mouseX, mouseY, 20, 20);
      fill(blackVal);
    }
  } else {
    displayTextDialog('click here to begin');
    push(); // save intro game state so we don't have to do setup when the player inevitably sucks
  }
}

function mouseClicked() {
  if (!isGameStarted) {
    isGameStarted = true;
    return;
  }
  if (player.isDead) {
    pop();
    player.isDead = false;
    isGameStarted = false;
    currentLevel = 1;
    enemies = [];
    createEnemy();
    return;
  }
  if (player.hasPowerUp) {
    usePowerUp();
  }
}

// CLASSES

function Enemy(initOptions) {
  const { initX, initY, initSize, initSpeed, lifespan } = initOptions;
  this.x = initX;
  this.y = initY;
  this.speed = initSpeed;
  this.size = initSize;
  this.shrinkRate = lifespan / 100;

  this.update = function() {
    if (this.isProximateToMouse()) {
      player.isDead = true;
    }
    if (!player.isDead) {
      var xDiff = Math.abs(mouseX - this.x);
      var yDiff = Math.abs(mouseY - this.y);
      var motionXIncrement = this.speed > xDiff ? xDiff : this.speed;
      var motionYIncrement = this.speed > yDiff ? yDiff : this.speed;
      this.x += mouseX > this.x ? motionXIncrement : (-1 * motionXIncrement);
      this.y += mouseY > this.y ? motionYIncrement : (-1 * motionYIncrement);

      if (!player.isDead && this.size > 0) {
        this.size -= .1;
      }
      if (this.size <= 0) {
        killEnemy(this);
      }
    }
  };
  this.drawSelf = function() {
    if (!player.isDead && this.size > 0) {
      fill(whiteVal);
      ellipse(this.x, this.y, this.size, this.size);
    }
  };
  this.isProximateToMouse = function() {
    var absMouseX = Math.abs(mouseX);
    var absMouseY = Math.abs(mouseY);
    var absX = Math.abs(this.x);
    var absY = Math.abs(this.y);
    var isProximateX = Math.abs(absMouseX - absX) <= this.size;
    var isProximateY = Math.abs(absMouseY - absY) <= this.size;
    return isProximateX && isProximateY;
  };
  // GRAPHIX
  this.drawEcho = function() {
    var echoMapPoint = {x: this.x, y: this.y};
    if (!this.echoMap) {
      this.echoMap = new Array(echoMapPoint);
    } else {
      if (random(-.5, 1) > 0) { // sputtering effect
        this.echoMap.push(echoMapPoint);
      }
      if (this.echoMap.length > echoLength) {
        this.echoMap = this.echoMap.slice(1, echoLength+1);
      }
    }

    for(var k=0; k<this.echoMap.length; k++) {
      var percentage = k/this.echoMap.length;
      // var interpolatedColor =
      // noStroke();
      const colorObj = lerpColor(color(blackVal), color(whiteVal), percentage);
      colorObj.setAlpha(percentage * 255 - 50);
      fill(colorObj); // trial and error til it looks cool

      var posX = this.echoMap[k].x + (random(0, 1) > .9 ? random(-1, 1) : 0);
      var posY = this.echoMap[k].y + (random(0, 1) > .9 ? random(-1, 1) : 0);
      ellipse(posX, posY, this.size, this.size);
      if (k === this.echoMap.length - 1) {
        // last time 'round, reset the stroke
        fill(whiteVal);
      }
    }
  };
}

// HELPERS
function displayTextDialog(textToDisplay) {
  fill(whiteVal);
  rectMode(CENTER);
  rect(width/2, height/2, width/2, height/4);
  textAlign(CENTER, CENTER);
  textSize(18);
  fill(blackVal);
  text(textToDisplay, width/2, height/2);
}

function createEnemy() {
  var initX = random(0, width);
  var initY = random(0, height);
  var initSize = random(currentLevel + 10, currentLevel * 2 + 100);
  var initSpeed = 4 + random(0, currentLevel);
  var lifespan = random(100, currentLevel + 100);

  return enemies.push(new Enemy({
    initX: initX === mouseX ? initX + initSize : initX,
    initY: initY === mouseX ? initY + initSize : initY,
    initSize,
    initSpeed,
    lifespan
  }));
}

function killEnemy(enemy) {
  enemies.splice(enemies.indexOf(this), 1);
}

function usePowerUp() {
  console.log('powerup used');
}

// NOTES

// mouseX and mouseY are relative to the canvas, not the coord system of draw()

// translate and rotate move the "pen" position so that all draw() values are offset
// by the same amount
