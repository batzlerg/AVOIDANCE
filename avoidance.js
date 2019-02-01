// AVOIDANCE
// https://grahammak.es/games/avoidance

/************
 DEFINITIONS
************/

// objects
var game = {
  isStarted: false,
  isFadeOut: false,
  currentLevel: 0,
  deathCount: 0
};
var player = {
  isDead: false,
  hasPowerUp: false,
  isVisible: true
};
var enemies = [];
var powerUp = null;

// design
var colors = {
  white: 255,
  backgroundGrey: 200,
  grey: 160,
  darkGrey: 90,
  black: 0
};
var windowPadding = 15;

// config
var difficultyMap = [1, .75, .6, .45, .3, .15];
var difficultyCurve = .2; //todo: make user-selectable
var enemySpawnRate = 0;
var echoLength = 3;
var fadeInRamp = 30;

// other stuff
var pauseTimer = 0;
var lfoSeed = 0;

/**********
 LIFECYCLE
**********/

function setup() {
  createCanvas(window.innerWidth, window.innerHeight);
  strokeWeight(0);
  background(colors.backgroundGrey);
  noCursor();
  textSize(20);
  textFont('Helvetica');
}

function draw() {
  noCursor();
  if (game.isStarted && !game.isFadeOut) {
    if (player.isDead) {
      displayTextDialog('you suck');
      background(random(0,100), random(0,100), random(0,100), 1);
      drawPlayer();
      return;
    }
    // actual render loop
    background(colors.backgroundGrey);

    if (powerUp) {
      powerUp.drawSelf();
      powerUp.update();
    }
    if (enemies.length > 0) {
      // active game session
      drawAllEnemies();
    } else {
      incrementLevel();
      game.isFadeOut = true;
      pauseTimer = (10 * 1/difficultyCurve) - game.currentLevel;
    }
    textAlign(RIGHT, TOP);
    fill(colors.darkGrey);
    text(`level: ${game.currentLevel}`, width - windowPadding, windowPadding);
    textAlign(LEFT, TOP);
    text(`deaths: ${game.deathCount}`, windowPadding, windowPadding);
    drawPlayer();
  } else if (game.isFadeOut) {
    const increasingDarkness = color(random(0,30), random(0,30), random(0,30));
    increasingDarkness.setAlpha(20);
    fill(increasingDarkness); // me_irl
    rect(width/2, height/2, width, height);
    pauseTimer--;

    if (pauseTimer < fadeInRamp) {
      drawAllEnemies({ fadeIn: true });
    }
    if (pauseTimer === 0) {
      game.isFadeOut = false;
    }
    drawPlayer();
    if (powerUp) {
      powerUp.drawSelf();
      powerUp.update();
    }
    return;
  } else {
    displayTextDialog('click here to begin');
    cursor();
  }
}

/***************
 EVENT HANDLERS
***************/

function mouseClicked() {
  if (!game.isStarted) {
    game.isStarted = true;
    return;
  }
  if (player.isDead) {
    game.deathCount++;
    player = {
      isDead: false,
      hasPowerUp: false,
      isVisible: true
    };
    powerUp = null;
    game.isStarted = false;
    game.currentLevel = 1;
    enemies = [];
    createEnemy();
    return;
  }
}

function mouseReleased() {
  if (player.hasPowerUp && powerUp) {
    powerUp.use();
  }
}

/*********
 CLASSES
*********/

function Enemy(initOptions) {
  const { initX, initY, initSize, initSpeed, shrinkRate } = initOptions;
  this.x = initX;
  this.y = initY;
  this.speed = initSpeed;
  this.size = initSize;
  this.shrinkRate = shrinkRate;
  this.echoAngle = 0;

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
        console.log(this.size);
        killEnemy(this);
      }
    }
  };
  this.drawSelf = function() {
    if (!player.isDead && this.size > 0) {
      fill(colors.white);
      ellipse(this.x, this.y, this.size, this.size);
    }
  };
  this.drawSelfTranslucent = function() {
    if (!player.isDead && this.size > 0) {
      const translucentWhite = color(colors.white);
      translucentWhite.setAlpha(1/difficultyCurve - game.currentLevel);
      fill(translucentWhite);
      ellipse(this.x, this.y, this.size, this.size);
    }
  };
  this.isCollisionWithMouse = () => collisionDetection(this);
  this.isCollisionWithPowerUp = () => collisionDetection(this, powerUp);

  // exhaust animation
  this.drawEcho = function() {
    this.echoAngle += .9;
    if (this.echoAngle >= 360) {
      this.echoAngle = 0;
    }
    var sinVal = sin(this.echoAngle);
    var echoMapPoint = { x: this.x, y: this.y };

    if (!this.echoMap) {
      this.echoMap = new Array(echoMapPoint);
    } else {
      if (fudge(sinVal, 5000) > 0) { // sputtering effect
        this.echoMap.push(echoMapPoint);
      }
      if (this.echoMap.length > echoLength) {
        this.echoMap = this.echoMap.slice(1, echoLength+1);
      }
    }

    for (var k=0; k<this.echoMap.length; k++) {
      var percentage = k/this.echoMap.length;
      const colorObj = lerpColor(color(colors.black), color(colors.white), percentage);
      colorObj.setAlpha(percentage * 255 - 50);
      fill(colorObj);

      var posX = fudge(this.echoMap[k].x, .5);
      var posY = fudge(this.echoMap[k].y, .5);
      var exhaustSize = this.size - (10/echoLength)*(this.echoMap.length-k);
      ellipse(posX, posY, exhaustSize, exhaustSize);
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
    fill(colors.black);
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

/********
 HELPERS
********/

function displayTextDialog(textToDisplay) {
  rectMode(CENTER);
  // grey backdrop
  fill(colors.grey);
  rect(width/2 + 12, height/2 + 12, width/2, height/4);
  // white rect
  fill(colors.white);
  rect(width/2, height/2, width/2, height/4);
  textAlign(CENTER, CENTER);
  fill(colors.black);
  text(textToDisplay, width/2, height/2);
}

function collisionDetection(objA, objB = { x: mouseX, y: mouseY, size: 0 }) {
  // "size" param is diameter, we need radius...hence size / 2
  var isCollisionX = Math.abs(objB.x - objA.x) <= (objA.size/2 + objB.size/2);
  var isCollisionY = Math.abs(objB.y - objA.y) <= (objA.size/2 + objB.size/2);

  return isCollisionX && isCollisionY;
};

function incrementLevel() {
  game.currentLevel++;
  for (var j=0; j<game.currentLevel; j++) {
    if(random(0, 1) < difficultyMap[Math.floor(enemySpawnRate)]) {
      createEnemy();
    }
  }
  if (
    game.currentLevel % 3 === 0
    && !player.hasPowerUp
    && !powerUp
  ) {
    powerUp = new PowerUp({
      x: random(0, width),
      y: random(0, height)
    });
    enemySpawnRate += difficultyCurve;
  }
}

function createEnemy() {
  var initX = random(0, width);
  var initY = random(0, height);
  var initSize = random(fudge(20, game.currentLevel), fudge(100, game.currentLevel * 1/difficultyCurve));
  var initSpeed = 3 + random(0, game.currentLevel * difficultyCurve);
  var shrinkRate = random(-1*difficultyCurve, game.currentLevel);

  // init position can't be toooo close to the player...that's just evil.
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
  enemies.splice(enemies.indexOf(enemy), 1);
}

function drawAllEnemies(options = {}) {
  for (var i=0; i<enemies.length; i++) {
    if (options.fadeIn) {
      enemies[i].drawSelfTranslucent();
    } else {
      enemies[i].drawEcho();
      enemies[i].drawSelf();
      enemies[i].update();
    }
  }
}

function drawPlayer() {
  lfoSeed+= 1;
  if (lfoSeed >= 360) {
    lfoSeed = 0;
  }
  var lfoVal = sin(lfoSeed);
  var isPlayerInBounds = mouseX > 0 && mouseY > 0 && mouseX < width && mouseY < height;
  if (player.isVisible && isPlayerInBounds) {
    fill(colors.grey);
    circle(mouseX, mouseY, 5, 5);
    fill(colors.darkGrey);
  }
}

/**********
 UTILITIES
**********/

function fudge(inputVal, pct) {
  return inputVal + random(-pct/100 * inputVal, pct/100 * inputVal);
}
