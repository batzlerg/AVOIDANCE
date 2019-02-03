// AVOIDANCE
// https://grahammak.es/games/avoidance

/************
 DEFINITIONS
************/

// config
var difficultyMap = [1, .75, .6, .45, .3, .15];
var difficultyCurve = .2; //todo: make user-selectable
var enemySpawnRate = 0;
var echoLength = 3;
var nightVisionFadeInTime = 30;
var mainTitle = 'AVOIDANCE';

// design
var colors = {
  white: 255,
  lightGrey: 230,
  backgroundGrey: 200,
  grey: 160,
  darkGrey: 90,
  black: 80
};
var windowPadding = 15;
var defaultFontSize = 22;
var mainTitleFontSize = 40;
var mainTitleFuzziness = 800;
var mainTitleFadeInTime = 450;

// other stuff
var pauseTimer = 0;
var lfoSeed = 0;

// initializers
var initPlayer = () => ({
  isDead: false,
  hasPowerUp: false,
  isVisible: true,
  size: 5,
  deathLocation: null
});

// game objects
var game = {
  isStarted: false,
  isFadeOut: false,
  currentLevel: 0,
  deathCount: 0,
  nightVisionEnabled: true
};
var player = initPlayer();
var enemies = [];
var powerUp = null;
var powerUpColors = {
  YELLOW: 'yellow',
  PURPLE: 'purple'
};
var youLose = [
  'yikes',
  'and that\'s that',
  'no más',
  'door\'s that way, friend',
  'strike three, yer out',
  'FIN',
  'ouch.'
];
var getYouLoseMessage = () => youLose[Math.floor(Math.random() * Math.floor(youLose.length))];
var youLoseMessage = getYouLoseMessage();

/**********
 LIFECYCLE
**********/

function setup() {
  createCanvas(window.innerWidth, window.innerHeight);
  strokeWeight(0);
  fill(colors.black);
  background(colors.backgroundGrey);
  noCursor();
  textSize(defaultFontSize);
  textFont('Helvetica');
}

function draw() {
  noCursor();
  if (game.isStarted && !game.isFadeOut) {
    if (player.isDead) {
      if (player.deathLocation) {
        fill('red');
        circle(player.deathLocation.x, player.deathLocation.y, player.size);
      }
      displayTextDialog(youLoseMessage);
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
      pauseTimer = (10 * 1/difficultyCurve);
    }
    drawHeader();
    if (!player.hasPowerUp) {
      drawPlayer();
    }
  } else if (game.isFadeOut) {
    rectMode(CENTER);
    const increasingDarkness = color(random(0,30), random(0,30), random(0,30));
    increasingDarkness.setAlpha(20);
    fill(increasingDarkness); // me_irl
    rect(width/2, height/2, width, height);
    pauseTimer--;

    if (game.nightVisionEnabled && pauseTimer < nightVisionFadeInTime) {
      drawAllEnemies({ fadeIn: true });
    }
    if (pauseTimer === 0) {
      game.isFadeOut = false;
    }
    if (!player.hasPowerUp) {
      drawPlayer();
    }
    if (powerUp) {
      powerUp.drawSelf();
      powerUp.update();
    }
    return;
  } else {
    displayIntroDialog();
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
    youLoseMessage = getYouLoseMessage();
    player = initPlayer();
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
  } else if (powerUp && powerUp.isTriggered) {
    powerUp.isTriggered = false;
    powerUp.isActive = true;
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
  this.initSize = initSize;
  this.size = initSize;
  this.shrinkRate = shrinkRate;
  this.echoAngle = 0;

  this.update = function() {
    if (this.isCollisionWithMouse()) {
      player.isDead = true;
      player.deathLocation = {x: mouseX, y: mouseY};
    }
    if (powerUp && powerUp.isActive && this.isCollisionWithPowerUp()) {
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
        this.size -= 10/Math.abs(this.shrinkRate - (this.initSize * this.size)/50);
      }
      if (this.size <= 0) {
        killEnemy(this);
      }
    }
  };
  this.drawSelf = function() {
    if (!player.isDead && this.size > 0) {
      fill(colors.white);
      circle(this.x, this.y, this.size);
    }
  };
  this.drawSelfTranslucent = function() {
    if (!player.isDead && this.size > 0) {
      const translucentWhite = color(colors.white);
      translucentWhite.setAlpha(1/difficultyCurve);
      fill(translucentWhite);
      circle(this.x, this.y, this.size);
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
      circle(posX, posY, exhaustSize);
    }
  };
}

function PowerUp(initOptions) {
  const { x, y, type } = initOptions;
  this.x = x;
  this.y = y;
  this.type = type;
  this.seedAngle = 0;
  this.colorObjs = {
    [powerUpColors.YELLOW]: color(255, 230, 0),
    [powerUpColors.PURPLE]: color(170, 82, 207)
  };
  this.durations = {
    [powerUpColors.YELLOW]: 10,
    [powerUpColors.PURPLE]: 40
  };
  this.size = 0;
  this.isTriggered = false;
  this.stepsUntilActive = this.durations[this.type]*3;
  this.isActive = false;
  this.stepsUntilDeath = this.durations[this.type];

  this.update = function() {
    switch (this.type) {
      case powerUpColors.YELLOW:
        if (this.isActive) {
          // do explosion
          this.stepsUntilDeath--;
          this.size = this.size + this.stepsUntilDeath;
          if (!this.stepsUntilDeath) {
            powerUp = null;
          }
          this.colorObjs[this.type].setAlpha(255);
        } else {
          if (!player.hasPowerUp && !this.isActive && this.isCollisionWithMouse()) {
            player.hasPowerUp = true;
          }
          this.seedAngle += .1;
          if (this.seedAngle >= 360) {
            this.seedAngle = 0;
          }
          var sinVal = sin(this.seedAngle);
          this.size = player.size * 3 + sinVal;
          this.colorObjs[this.type].setAlpha(100*sinVal + 155);
        }
        break;
      case powerUpColors.PURPLE:
        if (this.isActive) {
          // do explosion
          this.stepsUntilDeath--;
          if (this.stepsUntilDeath < this.durations[this.type]/3) {
            this.size = this.size - .7*this.stepsUntilDeath;
          } else {
            this.size = this.size + .7*this.stepsUntilDeath;
          }
          if (!this.stepsUntilDeath) {
            powerUp = null;
          }
          this.colorObjs[this.type].setAlpha(255);
        } else if (this.isTriggered) {
          this.stepsUntilActive--;
          this.seedAngle += .3;
          if (this.seedAngle >= 360) {
            this.seedAngle = 0;
          }
          var sinVal = sin(this.seedAngle);
          this.size = player.size * 3 + sinVal;
          if (this.stepsUntilActive <= 0) {
            this.isActive = true;
          }
          this.colorObjs[this.type].setAlpha(map(this.stepsUntilActive, 0, this.durations[this.type], 0, 255));
          // draw color-coded detonation indicator
          noFill();
          strokeWeight(2);
          stroke(this.colorObjs[this.type]);
          circle(mouseX, mouseY, player.size + sinVal);
          noStroke();
        } else {
          if (!player.hasPowerUp && this.isCollisionWithMouse()) {
            player.hasPowerUp = true;
          }
          this.seedAngle += .3;
          if (this.seedAngle >= 360) {
            this.seedAngle = 0;
          }
          var sinVal = sin(this.seedAngle);
          this.size = 3*sinVal + player.size*3;
          this.colorObjs[this.type].setAlpha(100*sinVal + 155);
        }
        break;
    }
  }

  this.drawSelf = function() {
    fill(this.colorObjs[this.type]);
    if (player.hasPowerUp) {
      circle(mouseX, mouseY, this.size);
    } else {
      circle(this.x, this.y, this.size);
    }
    fill(colors.black);
  }

  this.isCollisionWithMouse = () => collisionDetection(this);

  this.use = function() {
    player.hasPowerUp = false;
    this.x = mouseX;
    this.y = mouseY;
    switch (this.type) {
      case powerUpColors.YELLOW:
        this.isActive = true;
        this.size = this.size * this.stepsUntilDeath;
        break;
      case powerUpColors.PURPLE:
        this.isTriggered = true;
        this.size = player.size;
        break;
    }
  }
}

/********
 HELPERS
********/

function drawDialogBox() {
  rectMode(CENTER);
  // grey backdrop
  fill(colors.grey);
  rect(width/2 + 12, height/2 + 12, width/2, height/4);
  // white rect
  fill(colors.white);
  rect(width/2, height/2, width/2, height/4);
}

function displayTextDialog(textToDisplay) {
  drawDialogBox();
  textAlign(CENTER, CENTER);
  fill(colors.black);
  text(textToDisplay, width/2, height/2);
}

function displayIntroDialog() {
  textAlign(CENTER, CENTER);
  push();
  var translucentGreyFill = color(colors.darkGrey);
  translucentGreyFill.setAlpha(30);
  fill(translucentGreyFill);
  rectMode(CORNER);
  rect(0, 0, width, height);
  var fuzzTime = mainTitleFuzziness/10000 - mainTitleFadeInTime;
  for (var f=mainTitleFuzziness; f>fuzzTime; f--) {
    fill(fudge(colors.lightGrey,20));
    var circleLocation = { x: random(0, width), y: random(0, height), size: fudge(100, 50) };
    if (!collisionDetection(circleLocation)) {
      circle(circleLocation.x, circleLocation.y, 1);
    }
  }
  drawDialogBox();
  fill(colors.white);
  if (random(-6, 1) > 0) { // jitter
    scale(1 + random(-.003, .003));
  }
  fill(colors.black);
  textFont('Courier New');
  textSize(mainTitleFontSize);
  textStyle('bold');
  var mainTitleX = width/2;
  var mainTitleY = height/2 - 30;
  text(mainTitle, mainTitleX, mainTitleY);
  pop();
  text('click anywhere to begin', width/2, height/2 + 30);
}

function collisionDetection(objA, objB = { x: mouseX, y: mouseY, size: player.size }) {
  var diffX = Math.abs(objB.x - objA.x);
  var diffY = Math.abs(objB.y - objA.y);
  return Math.sqrt(diffX*diffX + diffY*diffY) < objA.size + objB.size;
};

function incrementLevel() {
  game.currentLevel++;
  for (var j=0; j<game.currentLevel; j++) {
    if(random(0, 1) < difficultyMap[Math.floor(enemySpawnRate)]) {
      createEnemy();
    }
  }
  if (!powerUp) {
    if (game.currentLevel % 3 === 0) {
      powerUp = new PowerUp({
        x: random(0, width),
        y: random(0, height),
        type: powerUpColors.YELLOW
      });
    } else if (game.currentLevel % 4 === 0) {
      powerUp = new PowerUp({
        x: random(0, width),
        y: random(0, height),
        type: powerUpColors.PURPLE
      });
    }
  }
  enemySpawnRate += difficultyCurve;
}

function createEnemy() {
  var initX = random(0, width);
  var initY = random(0, height);
  var initSize = random(fudge(40, game.currentLevel), fudge(100, game.currentLevel * 1/difficultyCurve));
  var initSpeed = 3 + random(0, game.currentLevel * difficultyCurve);
  var shrinkRate = random(-1*difficultyCurve, .2/game.currentLevel);

  // init position can't be toooo close to the player...that's just evil.
  // 20px is an arbitrary fudge factor based on my own reaction time
  var isLikelyCollision = collisionDetection({ x: initX, y: initY, size: initSize + 20 });
  return enemies.push(new Enemy({
    initX: isLikelyCollision ? initX + initSize : initX,
    initY: isLikelyCollision ? initY + initSize : initY,
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

function drawHeader() {
  fill(player.isDead ? colors.black : colors.darkGrey);
  textAlign(RIGHT, TOP);
  text(`level: ${game.currentLevel}`, width - windowPadding, windowPadding);
  textAlign(LEFT, TOP);
  text(`deaths: ${game.deathCount}`, windowPadding, windowPadding);
}

function drawPlayer() {
  lfoSeed+= 1;
  if (lfoSeed >= 360) {
    lfoSeed = 0;
  }
  var lfoVal = sin(lfoSeed);
  var isPlayerOnScreen = mouseX > 0 && mouseY > 0 && mouseX < width && mouseY < height;
  if (player.isVisible && isPlayerOnScreen) {
    fill(colors.grey);
    circle(mouseX, mouseY, player.size);
    fill(colors.darkGrey);
  }
}

/**********
 UTILITIES
**********/

function fudge(inputVal, pct) {
  return inputVal + random(-pct/100 * inputVal, pct/100 * inputVal);
}
