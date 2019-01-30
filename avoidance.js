// AVOIDANCE
// by Graham Batzler

// config
var backgroundColor = 200;
var enemies = [];
var isPlayerDead = false;
var isGameStarted = false;
var currentLevel = 0;

function setup() {
  createCanvas(window.innerWidth,window.innerHeight);
  strokeWeight(2);
  background(backgroundColor);
}

function draw() {
  if (isGameStarted) {
    if (isPlayerDead) {
      displayTextDialog('you suck');
      return;
    }
    // actual render loop
    background(backgroundColor);
    if (enemies.length > 0) {
      for (var i=0; i<enemies.length; i++) {
        enemies[i].drawSelf();
        enemies[i].update();
      }
    }
    else {
      debugger;
      currentLevel++;
      for (var i=0; i<currentLevel; i++) {
        createEnemy();
      }
    }
    textAlign(RIGHT, TOP);
    text(`level: ${currentLevel}`, width - 10, 10);
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
  if (isPlayerDead) {
    pop();
    isPlayerDead = false;
    isGameStarted = false;
    currentLevel = 1;
    enemies = [];
    createEnemy();
    return;
  }
  if (hasPowerUp) {
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
      isPlayerDead = true;
    }
    if (!isPlayerDead) {
      var xDiff = Math.abs(mouseX - this.x);
      var yDiff = Math.abs(mouseY - this.y);
      var motionXIncrement = this.speed > xDiff ? xDiff : this.speed;
      var motionYIncrement = this.speed > yDiff ? yDiff : this.speed;
      this.x += mouseX > this.x ? motionXIncrement : (-1 * motionXIncrement);
      this.y += mouseY > this.y ? motionYIncrement : (-1 * motionYIncrement);

      if (!isPlayerDead && this.size > 0) {
        this.size -= .1;
      }
      if (this.size <= 0) {
        killEnemy(this);
      }
    }
  }
  this.drawSelf = function() {
    if (!isPlayerDead && this.size > 0) {
      ellipse(this.x, this.y, this.size, this.size);
    }
  }
  this.isProximateToMouse = function() {
    var absMouseX = Math.abs(mouseX);
    var absMouseY = Math.abs(mouseY);
    var absX = Math.abs(this.x);
    var absY = Math.abs(this.y);
    var isProximateX = Math.abs(absMouseX - absX) <= this.size;
    var isProximateY = Math.abs(absMouseY - absY) <= this.size;
    return isProximateX && isProximateY;
  }
}

// HELPERS
function displayTextDialog(textToDisplay) {
  rectMode(CENTER);
  rect(width/2, height/2, width/2, height/4);
  textAlign(CENTER, CENTER);
  textSize(18);
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

// NOTES

// mouseX and mouseY are relative to the canvas, not the coord system of draw()

// translate and rotate move the "pen" position so that all draw() values are offset
// by the same amount
