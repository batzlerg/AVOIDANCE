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
var numberOfDeaths = 0;
var whiteVal = 255;
var blackVal = 0;

var difficultyMap = [1, .75, .6, .45, .3, .15];
var currentDifficulty = 0;
var difficultyCurve = .2; //todo: make user-selectable

var powerUp = null;

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
      incrementLevel();
    }
    if (powerUp) {
      powerUp.drawSelf();
      powerUp.update();
    }
    textAlign(RIGHT, TOP);
    fill(blackVal);
    text(`level: ${currentLevel}`, width - 10, 10);
    textAlign(LEFT, TOP);
    text(`deaths: ${numberOfDeaths}`, 10, 10);
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
    numberOfDeaths++;
    player = {
      isDead: false,
      hasPowerUp: false
    };
    powerUp = null;
    isGameStarted = false;
    currentLevel = 1;
    enemies = [];
    createEnemy();
    return;
  }
  if (player.hasPowerUp && powerUp) {
    powerUp.use();
  }
}

// CLASSES

function Enemy(initOptions) {
  const { initX, initY, initSize, initSpeed, shrinkRate } = initOptions;
  this.x = initX;
  this.y = initY;
  this.speed = initSpeed;
  this.size = initSize;
  this.shrinkRate = shrinkRate;

  this.update = function() {
    if (this.isCollisionWithMouse()) {
      player.isDead = true;
    }
    if (powerUp && powerUp.stepsUntilDeath && this.isCollisionWithPowerUp()) {
      killEnemy(this);
    }
    if (!player.isDead) {
      var xDiff = Math.abs(mouseX - this.x);
      var yDiff = Math.abs(mouseY - this.y);
      var motionXIncrement = this.speed > xDiff ? xDiff : this.speed;
      var motionYIncrement = this.speed > yDiff ? yDiff : this.speed;
      this.x += mouseX > this.x ? motionXIncrement : (-1 * motionXIncrement);
      this.y += mouseY > this.y ? motionYIncrement : (-1 * motionYIncrement);

      if (!player.isDead && this.size > 0) {
        this.size -= .1 + this.shrinkRate/1000;
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
  this.isCollisionWithMouse = () => collisionDetection(this);
  this.isCollisionWithPowerUp = () => collisionDetection(this, powerUp);
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

    for (var k=0; k<this.echoMap.length; k++) {
      var percentage = k/this.echoMap.length;
      const colorObj = lerpColor(color(blackVal), color(whiteVal), percentage);
      colorObj.setAlpha(percentage * 255 - 50);
      fill(colorObj);

      var posX = this.echoMap[k].x + (random(0, 1) > .9 ? random(-1, 1) : 0);
      var posY = this.echoMap[k].y + (random(0, 1) > .9 ? random(-1, 1) : 0);
      ellipse(posX, posY, this.size, this.size);
      if (k === this.echoMap.length - 1) {
        // last time 'round, reset the fill
        fill(whiteVal);
      }
    }
  };
}

function PowerUp(initOptions) {
  const { x, y } = initOptions;
  this.x = x;
  this.y = y;
  this.seedAngle = 0;
  this.colorObj = color(255, 230, 0);
  this.size = 0;
  this.stepsUntilDeath = null;

  this.update = function() {
    if (this.stepsUntilDeath) {
      // do explosion
      this.stepsUntilDeath--;
      this.size = this.size + this.stepsUntilDeath;
      if (!this.stepsUntilDeath) {
        powerUp = null;
      }
    } else {
      if (!player.hasPowerUp && !this.stepsUntilDeath && this.isCollisionWithMouse()) {
        player.hasPowerUp = true;
        console.log('got it');
      }
      this.seedAngle += .1;
      if (this.seedAngle === 360) {
        this.seedAngle = 0;
      }
      var sinVal = sin(this.seedAngle);
      this.size = 5*sinVal + 25;
      this.colorObj.setAlpha(100*sinVal + 155);
    }
  }

  this.drawSelf = function() {
    fill(this.colorObj);
    if (player.hasPowerUp) {
      ellipse(mouseX, mouseY, this.size, this.size);
    } else {
      ellipse(this.x, this.y, this.size, this.size);
    }
    fill(blackVal);
  }

  this.isCollisionWithMouse = () => collisionDetection(this);

  this.use = function() {
    player.hasPowerUp = false;
    this.x = mouseX;
    this.y = mouseY;
    this.stepsUntilDeath = 10;
    this.size = this.size * this.stepsUntilDeath;
  }
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

function collisionDetection(objA, objB = { x: mouseX, y: mouseY, size: 0 }) {
  // "size" param is diameter, we need radius...hence size / 2
  var isCollisionX = Math.abs(objB.x - objA.x) <= (objA.size/2 + objB.size/2);
  var isCollisionY = Math.abs(objB.y - objA.y) <= (objA.size/2 + objB.size/2);

  return isCollisionX && isCollisionY;
};

function incrementLevel() {
  currentLevel++;
  for (var j=0; j<currentLevel; j++) {
    if(random(0, 1) < difficultyMap[Math.floor(currentDifficulty)]) {
      createEnemy();
    }
  }
  if (currentLevel % 3 > 0
    && !player.hasPowerUp
    && !powerUp
  ) {
    powerUp = new PowerUp({
      x: random(0, width),
      y: random(0, height)
    });
    currentDifficulty += difficultyCurve;
  }
}

function createEnemy() {
  var initX = random(0, width);
  var initY = random(0, height);
  var initSize = random(currentLevel + 10, currentLevel * 1/difficultyCurve + 100);
  var initSpeed = 3 + random(0, currentLevel * difficultyCurve);
  var shrinkRate = random(-1*difficultyCurve, currentLevel);

  // init position shouldn't === mouse position...that's just evil.
  // 20px is an arbitrary fudge factor based on my own reaction time
  var isGuaranteedCollision = collisionDetection({ x: initX, y: initY, size: initSize + 20 });
  return enemies.push(new Enemy({
    initX: isGuaranteedCollision ? initX + initSize : initX,
    initY: isGuaranteedCollision ? initY + initSize : initY,
    initSize,
    initSpeed,
    shrinkRate
  }));
}

function killEnemy(enemy) {
  enemies.splice(enemies.indexOf(this), 1);
}
