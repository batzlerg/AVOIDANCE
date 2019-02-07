// AVOIDANCE
// https://grahammak.es/games/avoidance

/************
 DEFINITIONS
************/

const mainTitle = 'AVOIDANCE';
const credit = `\u00A9 ${(new Date()).getFullYear()} https://grahammak.es`;
const difficultyCurve = .5; //todo: make user-selectable

// design
const colors = {
  white: 255,
  lightGrey: 230,
  backgroundGrey: 200,
  grey: 160,
  darkGrey: 90,
  charcoal: 70,
  black: 20
};
const padding = 15;
const defaultFontSize = 22;
const mainTitlePrefs = {
  fontSize: 40,
  fuzzDensity: 200,
  fadeInAlpha: 30,
  fadeInTint: 10,
  filter: 10
};
const echoLength = 3;

// initializers
const initPlayer = () => ({
  isDead: false,
  hasPowerUp: false,
  isVisible: true,
  size: 5,
  deathLocation: null
});

// game objects
let player = initPlayer();
let powerUp = null;
let enemies = [];
const game = {
  isStarted: false,
  isFadeOut: false,
  currentLevel: 0,
  deathCount: 0,
  nightVisionEnabled: true,
  mouseHoldTime: 0,
  pauseTimer: 0
};
const powerUpColors = {
  YELLOW: 'yellow',
  PURPLE: 'purple'
};
const youLose = [
  'yikes',
  'and that\'s that',
  'no más',
  'door\'s that way, friend',
  'strike three, yer out',
  'FIN',
  'ouch.'
];
const getYouLoseMessage = () => youLose[Math.floor(Math.random() * Math.floor(youLose.length))];
let youLoseMessage = getYouLoseMessage();

/**********
 LIFECYCLE
**********/

function setup() {
  createCanvas(window.innerWidth, window.innerHeight);
  strokeWeight(0);
  fill(colors.charcoal);
  background(colors.backgroundGrey);
  noCursor();
  textSize(defaultFontSize);
  textFont('Helvetica');
}

function draw() {
  noCursor();
  if (mouseIsPressed && game.mouseHoldTime < 1000) {
    game.mouseHoldTime++;
  }
  if (game.isStarted && !game.isFadeOut) {
    if (player.isDead) {
      if (player.deathLocation) {
        fill('red');
        circle(player.deathLocation.x, player.deathLocation.y, player.size);
      }
      fillWithIncreasingDarkness({
        alpha: 1,
        tint: 0
      });
      displayTextDialog(youLoseMessage);
      displayCredit();
      drawPlayer();
      return;
    }
    // actual render loop

    if (enemies.length > 0) {
      // active game session
      background(colors.backgroundGrey);
      drawAllEnemies();
      drawHeader();
    } else {
      incrementLevel();
      background(colors.black);
      game.isFadeOut = true;
      game.pauseTimer = map(difficultyCurve, 0, 1, 100, 20);
    }
    if (powerUp) {
      powerUp.drawSelf();
      powerUp.update();
    }
    if (!player.hasPowerUp) {
      drawPlayer();
    }
  } else if (game.isFadeOut) {
    fillWithIncreasingDarkness({
      alpha: 20,
      tint: 30
    }); //me_irl
    game.pauseTimer--;

    if (game.nightVisionEnabled) {
      drawAllEnemies({
        fadeIn: true
      });
    }
    if (game.pauseTimer === 0) {
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
    displayIntroScreen();
    displayCredit();
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
    game.currentLevel = 0;
    enemies = [];
    return;
  }
}

function mouseReleased() {
  game.mouseHoldTime = 0;
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
  const {
    initX,
    initY,
    initSize,
    initSpeed,
    shrinkRate
  } = initOptions;
  this.x = initX;
  this.y = initY;
  this.speed = initSpeed;
  this.initSize = initSize;
  this.size = initSize;
  this.shrinkRate = shrinkRate;
  this.echoAngle = 0;
  this.naturalMotion = {
    thrustAngle: 0,
    pitchAngle: 0
  };

  this.update = function() {
    if (this.isCollisionWithMouse()) {
      player.isDead = true;
      player.deathLocation = {
        x: mouseX,
        y: mouseY
      };
    }
    if (powerUp && powerUp.isActive && this.isCollisionWithPowerUp()) {
      killEnemy(this);
    }
    if (!player.isDead) {
      // how far ahead to move
      const xDiff = Math.abs(mouseX - this.x);
      const yDiff = Math.abs(mouseY - this.y);
      const motionXIncrement = this.speed > xDiff ? xDiff : this.speed;
      const motionYIncrement = this.speed > yDiff ? yDiff : this.speed;
      // fudging of motion for a more natural look
      let thrustVariance;
      let pitchVariance
      if (millis() % 20) {
        this.naturalMotion.thrustAngle += .1;
        thrustVariance = cos(this.naturalMotion.thrustAngle);
        pitchVariance = 0;
      } else if (millis() % 10) {
        this.naturalMotion.pitchAngle += map(this.size, 0, this.initSize, 1, 15);
        pitchVariance = sin(this.naturalMotion.pitchAngle);
        thrustVariance = 0;
      } else {
        thrustVariance = 0;
        pitchVariance = 0;
      }
      // motor away
      if (mouseX > this.x) {
        this.x += motionXIncrement + thrustVariance + pitchVariance;
      } else {
        this.x -= motionXIncrement - thrustVariance - pitchVariance;
      }
      if (mouseY > this.y) {
        this.y += motionYIncrement + thrustVariance + pitchVariance;
      } else {
        this.y -= motionYIncrement - thrustVariance - pitchVariance;
      }
      // cubic-bezier shrinkage
      if (this.size > 0) {
        this.size -= 10 / Math.abs(this.shrinkRate - (this.initSize * this.size) / 50);
      }
      // ded
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
      translucentWhite.setAlpha(map(difficultyCurve, 0, 1, 10, 2));
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
    let sinVal = sin(this.echoAngle);
    let echoMapPoint = {
      x: this.x,
      y: this.y
    };

    if (!this.echoMap) {
      this.echoMap = new Array(echoMapPoint);
    } else {
      if (fudge(sinVal, 5000) > 0) { // sputtering effect
        this.echoMap.push(echoMapPoint);
      }
      if (this.echoMap.length > echoLength) {
        this.echoMap = this.echoMap.slice(1, echoLength + 1);
      }
    }

    let percentage, colorObj, posX, posY, exhaustSize;
    for (let k = 0; k < this.echoMap.length; k++) {
      percentage = k / this.echoMap.length;
      colorObj = lerpColor(color(colors.charcoal), color(colors.white), percentage);
      colorObj.setAlpha(percentage * 255 - 50);
      fill(colorObj);

      posX = fudge(this.echoMap[k].x, .5);
      posY = fudge(this.echoMap[k].y, .5);
      exhaustSize = this.size - (10 / echoLength) * (this.echoMap.length - k);
      circle(posX, posY, exhaustSize);
    }
  };
}

function PowerUp(initOptions) {
  const {
    x,
    y,
    type
  } = initOptions;
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
  this.stepsUntilActive = this.durations[this.type] * 3;
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
          const sinVal = sin(this.seedAngle);
          this.size = player.size * 3 + sinVal;
          this.colorObjs[this.type].setAlpha(100 * sinVal + 155);
        }
        break;
      case powerUpColors.PURPLE:
        if (this.isActive) {
          // do explosion
          this.stepsUntilDeath--;
          if (this.stepsUntilDeath < this.durations[this.type] / 3) {
            this.size -= this.size / (this.stepsUntilDeath + .1); // no division by zero in my house
          } else {
            this.size = this.size + .4 * this.stepsUntilDeath;
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
          const sinVal = sin(this.seedAngle);
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
          const sinVal = sin(this.seedAngle);
          this.size = 3 * sinVal + player.size * 3;
          this.colorObjs[this.type].setAlpha(100 * sinVal + 155);
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
    fill(colors.charcoal);
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
  rect(width / 2 + 12, height / 2 + 12, width / 2, height / 4);
  // white rect
  fill(colors.white);
  rect(width / 2, height / 2, width / 2, height / 4);
}

function displayTextDialog(textToDisplay) {
  drawDialogBox();
  textAlign(CENTER, CENTER);
  fill(colors.charcoal);
  text(textToDisplay, width / 2, height / 2);
}

function displayCredit() {
  const creditBoxWidth = 180;
  const creditBoxHeight = 20;
  const textX = width - (padding + creditBoxWidth / 2) - padding / 2;
  const textY = height - (padding + creditBoxHeight / 2) - padding / 2;
  push();
  rectMode(CENTER);
  fill(color(colors.lightGrey, 40));
  rect(textX, textY, creditBoxWidth + 2 * padding, creditBoxHeight + 2 * padding);
  textAlign(CENTER, CENTER);
  fill(colors.charcoal);
  textSize(14);
  text(credit, textX, textY);
  pop();
}

function displayIntroScreen() {
  textAlign(CENTER, CENTER);
  push();
  fillWithIncreasingDarkness({
    alpha: mainTitlePrefs.fadeInAlpha,
    tint: mouseIsPressed ? mainTitlePrefs.fadeInTint + game.mouseHoldTime : mainTitlePrefs.fadeInTint
  });
  const filter = color(colors.darkGrey);
  filter.setAlpha(mainTitlePrefs.filter);
  fill(filter);
  rectMode(CORNER);
  rect(0, 0, width, height);
  if (random(-1, 1) > 0) {
    let circleLocation;
    for (let f = 0; f < mainTitlePrefs.fuzzDensity; f++) {
      fill(fudge(colors.grey, 20));
      circleLocation = {
        x: random(0, width),
        y: random(0, height),
        size: fudge(100, 50)
      };
      if (!collisionDetection(circleLocation)) {
        circle(circleLocation.x, circleLocation.y, 1);
      }
    }
  }
  drawDialogBox();
  fill(colors.white);
  if (random(-6, 1) > 0) { // jitter
    scale(1 + random(-.003, .003));
  }
  fill(colors.charcoal);
  textFont('Courier New');
  textSize(mainTitlePrefs.fontSize);
  textStyle('bold');
  text(mainTitle, width / 2, height / 2 - 30);
  pop();
  fill(colors.grey);
  text('click anywhere to begin', width / 2, height / 2 + 30);
}

function collisionDetection(objA, objB = {
  x: mouseX,
  y: mouseY,
  size: player.size
}) {
  const diffX = Math.abs(objB.x - objA.x);
  const diffY = Math.abs(objB.y - objA.y);
  return Math.sqrt(diffX * diffX + diffY * diffY) < objA.size + objB.size;
};

function incrementLevel() {
  game.currentLevel++;
  const enemySpawnRate = (.8 + difficultyCurve / 10) * game.currentLevel;
  const numberOfEnemies = game.currentLevel < 4 ? game.currentLevel : Math.floor(enemySpawnRate);

  for (let j = 0; j < numberOfEnemies; j++) {
    createEnemy();
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
}

function createEnemy() {
  const initX = random(0, width);
  const initY = random(0, height);
  const initSize = random(fudge(50, game.currentLevel), fudge(80, game.currentLevel));
  const initSpeed = 4 + random(0, game.currentLevel / initSize);
  const shrinkRate = random(-map(difficultyCurve, 0, 1, 1, 0), .2 / game.currentLevel);

  // init position can't be toooo close to the player...that's just evil.
  // 20px is an arbitrary fudge factor based on my own reaction time
  const isLikelyCollision = collisionDetection({
    x: initX,
    y: initY,
    size: initSize + 20
  });
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
  for (let i = 0; i < enemies.length; i++) {
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
  fill(player.isDead ? colors.charcoal : colors.darkGrey);
  textAlign(RIGHT, TOP);
  text(`level: ${game.currentLevel}`, width - padding, padding);
  textAlign(LEFT, TOP);
  text(`deaths: ${game.deathCount}`, padding, padding);
}

function drawPlayer() {
  const isPlayerOnScreen = mouseX > 0 && mouseY > 0 && mouseX < width && mouseY < height;
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
  return inputVal + random(-pct / 100 * inputVal, pct / 100 * inputVal);
}

const getColor = range => map(random(0, 255), 0, 255, 0, range);

function fillWithIncreasingDarkness({
  alpha,
  tint
}) {
  push();
  rectMode(CORNER);
  const increasingDarkness = color(getColor(tint), getColor(tint), getColor(tint));
  increasingDarkness.setAlpha(alpha);
  fill(increasingDarkness); // me_irl
  rect(0, 0, width, height);
  pop();
}
