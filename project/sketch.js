let spriteWidth = 150; //pixel width of sprite
let spriteHeight = 100; //pixel height of sprite
let pixels = []; //array of pixels
let mouseOutside = true; //whether mouse is outside of drawing area

//coordinates of recently drawn pixels, for pixel perfect function
let currentX = 0,
    currentY = 0, //pixel that has just been drawn
    prevX = 0,
    prevY = 0, //pixel that was drawn before current
    permX = 0,
    permY = 0; //pixel that was drawn before previous

let currentPosColor = 1, prevPosColor = 1; //store color of pixel that was drawn before current

let cellSize = 4; //how big the pixels appear on screen
let spriteBuffer; //actual sprite canvas
let spritePosX, spritePosY; //position of sprite canvas on screen
let spriteUpper, spriteLower, spriteLeft, spriteRight; //bounds of sprite canvas
let brushSize = 1; //size of brush
let ditherDens = 2; //density of dithering
let currentTool = 0; //current tool being used (pen by default) 0 = pen, 1 = erase, 2 = dither
let toolColor = 2; //current drawing color 0 = transparent, 1 = white, 2 = black, 3 = red
let toolPadding = 8; //padding for toolbox section
let buttonHeight = 32;
let toolBoxWidth = buttonHeight + toolPadding * 2 //toolbox section
let toolBoxHeight = buttonHeight * 4 + toolPadding * 5;
let selectedTool, toolSelectY; //highlight rect for indicating currently selected tool
let pencilToolButton, eraseToolButton, ditherToolButton, save, plus, minus, normaloom, doubleZoom, navigationStart; //all tool & navigation buttons

function preload() {
    soundFormats('wav');
    clearSound = loadSound('uiassets/slide'); //when user clears canvas
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    //create all sprite pixel info (default is a white pixel)
    for (let x = 0; x < spriteWidth; x++) { //iterate through pixel columns
        let thisCol = [];
        for (let y = 0; y < spriteHeight; y++) { //add a pixel for each row
            thisCol.push(1);
        }
        pixels.push(thisCol);
    }
    scaleBuffer();
    noStroke();
    spriteBuffer.noStroke();

    /*TOOL & NAVIGATION BUTTONS*/
    toolSelectY = windowHeight / 2 - toolBoxHeight / 2 + toolPadding;

    //PENCIL BUTTON
    pencilToolButton = new toolButton(toolPadding, windowHeight / 2 - toolBoxHeight / 2 + toolPadding, 'uiassets/pencil2x.png', 0, true, 1);
    pencilToolButton = pencilToolButton.returnButton();

    selectedTool = pencilToolButton;

    //ERASE BUTTON
    eraseToolButton = new toolButton(toolPadding, windowHeight / 2 - toolBoxHeight / 2 + toolPadding * 2 + buttonHeight, 'uiassets/eraser2x.png', 1, true, 4);
    eraseToolButton = eraseToolButton.returnButton();

    //DITHER BUTTON
    ditherToolButton = new toolButton(toolPadding, windowHeight / 2 - toolBoxHeight / 2 + toolPadding * 3 + buttonHeight * 2, 'uiassets/dither2x.png', 2, true, 6);
    ditherToolButton = ditherToolButton.returnButton();

    //vertical positioning of navigation buttons
    navigationStart = windowHeight * .8;

    //SAVE BUTTON
    save = new toolButton(toolPadding * 3 + buttonHeight, toolPadding, 'uiassets/saveIcon2x.png', -1, false, -1);
    save.returnButton().mousePressed(function () {
        saveCanvas(spriteBuffer, 'pixelPerfectSprite', 'png');
    });
    save = save.returnButton();

    //PLUS BUTTON
    plus = new toolButton(toolPadding, navigationStart, 'uiassets/inIcon2x.png', -1, false, -1);
    plus.returnButton().mousePressed(function () {
        cellSize += 2;
        scaleBuffer();
    });
    plus = plus.returnButton();

    //MINUS BUTTON
    minus = new toolButton(toolPadding, navigationStart + toolPadding + buttonHeight, 'uiassets/outIcon2x.png', -1, false, -1);
    minus.returnButton().mousePressed(function () {
        if (cellSize > 2) {
            cellSize -= 2;
            scaleBuffer();
        }
    });
    minus = minus.returnButton();

    //1x zoom button
    normalZoom = new toolButton(toolPadding, navigationStart + toolPadding * 2 + buttonHeight * 2, 'uiassets/normalZoom2x.png', -1, false, -1);
    normalZoom.returnButton().mousePressed(function () {
        cellSize = 2;
        scaleBuffer();
    });
    normalZoom = normalZoom.returnButton();

    //2x zoom button
    doubleZoom = new toolButton(toolPadding, navigationStart + toolPadding * 3 + buttonHeight * 3, 'uiassets/doubleZoom2x.png', -1, false, -1);
    doubleZoom.returnButton().mousePressed(function () {
        cellSize = 4;
        scaleBuffer();
    });
    doubleZoom = doubleZoom.returnButton();
}

function draw() {
    checkMouseOutside(); //check if mouse is in drawing area
    background(color(126, 126, 126)); //fill background
    spriteBuffer.fill("#ffffff"); //fill sprite background
    spriteBuffer.rect(0, 0, width, height); //draw rect to fill sprite background
    displayPixels(); //draw all pixels

    image(spriteBuffer, spritePosX, spritePosY); //draw sprite area
    if (!mouseOutside) {
        if (mouseIsPressed) {
            if (currentTool == 0) {
                penTool();
            } else if (currentTool == 1) {
                eraseTool();
            } else if (currentTool == 2) {
                ditherTool(ditherDens);
            }
        }
        drawCursor();
    }

    fill('#555555'); //fill ui bar background
    noStroke();

    rect(0, 0, toolBoxWidth, height); //sidebar for tools and navigation
    rect(0, 0, width, toolBoxWidth); //top bar for color/brush size

    //color of indicator for selected tool
    if (currentTool == 1) {
        fill('#333333');
    } else if (toolColor == 3) {
        fill(color(255, 0, 0));
    } else if (toolColor == 2) {
        fill(0);
    }
    rect(toolPadding, toolSelectY, buttonHeight, buttonHeight); //indicates selected tool
    strokeWeight(1)
    stroke('#000000');
    line(toolBoxWidth, toolBoxWidth, toolBoxWidth, height); //vertical line on ui sidebar
    if (currentTool == 0 || currentTool == 2) {
        penOptions(width / 2 - buttonHeight - toolPadding, toolPadding);
    }
}

//option bar- includes color pickers and will eventually include dither options for dither tool
function penOptions(xPos, yPos) {
    //clicking black
    if (mouseX > xPos && mouseX < xPos + buttonHeight && mouseY < yPos + buttonHeight && mouseY > yPos && mouseIsPressed) {
        toolColor = 2;
    }
    //clicking red
    if (mouseX > xPos + buttonHeight + toolPadding && mouseX < xPos + buttonHeight * 2 + toolPadding * 2 && mouseY < yPos + buttonHeight && mouseY > yPos && mouseIsPressed) {
        toolColor = 3;
    }
    noStroke();
    //black color picker
    fill(0);
    rect(xPos, yPos, buttonHeight, buttonHeight);
    //red color picker
    fill(color(255, 0, 0));
    rect(xPos + buttonHeight + toolPadding, yPos, buttonHeight, buttonHeight);
}

//rescale active drawing area (sprite buffer)
function scaleBuffer() {
    spriteBuffer = createGraphics(
        cellSize * spriteWidth,
        cellSize * spriteHeight
    );
    spritePosX = constrain(width / 2 - spriteBuffer.width / 2, toolPadding * 2 + buttonHeight, width);
    spritePosY = constrain(height / 2 - spriteBuffer.height / 2, 0, height / 2);
}

//call when mouse is pressed
function penTool() {
    let mouse1 = createVector(pmouseX - spritePosX, pmouseY - spritePosY); //pmouse location
    let mouse2 = createVector(mouseX - spritePosX, mouseY - spritePosY); //mouse location

    //lerp 100 times between mouse positions, fill in gaps and connect lines
    for (let i = 0; i < 100; i++) {
        let thisVector = p5.Vector.lerp(mouse1, mouse2, 0.01 * i);
        newPixel(thisVector.x, thisVector.y, toolColor); //try to make a new pixel for each lerp point
    }
    newPixel(mouseX - spritePosX, mouseY - spritePosY, toolColor);
}

//call when mouse is pressed
function eraseTool() {
    let mouse1 = createVector(pmouseX - spritePosX, pmouseY - spritePosY); //pmouse location
    let mouse2 = createVector(mouseX - spritePosX, mouseY - spritePosY); //mouse location

    //lerp 100 times between mouse positions, fill in gaps and connect lines
    for (let i = 0; i < 100; i++) {
        let thisVector = p5.Vector.lerp(mouse1, mouse2, 0.01 * i);
        erasePixel(thisVector.x, thisVector.y); //try to make a new pixel for each lerp point
    }
    erasePixel(mouseX - spritePosX, mouseY - spritePosY);
}

//call when mouse is pressed
function ditherTool(ditherDensity) {
    let mouse1 = createVector(pmouseX - spritePosX, pmouseY - spritePosY); //pmouse location
    let mouse2 = createVector(mouseX - spritePosX, mouseY - spritePosY); //mouse location

    //lerp 100 times between mouse positions, fill in gaps and connect lines
    for (let i = 0; i < 100; i++) {
        let thisVector = p5.Vector.lerp(mouse1, mouse2, 0.01 * i);
        dither(thisVector.x, thisVector.y, toolColor, ditherDensity); //try to make a new pixel for each lerp point
    }
    dither(mouseX - spritePosX, mouseY - spritePosY, toolColor, ditherDensity);
}

//densest dither
function dither(xPos, yPos, newColor, ditherFactor) {
    let ditherSize = floor(brushSize / 2);
    let xCenter = floor(xPos / cellSize); //origin of dither
    let yCenter = floor(yPos / cellSize);

    for (let x = xCenter - ditherSize; x < xCenter + brushSize / 2; x++) {
        for (let y = yCenter - ditherSize; y < yCenter + brushSize / 2; y++) {
            if (x % ditherFactor == 0) {
                if (y % 2 == 0) {
                    pixels[constrain(x, 0, spriteWidth - 1)][constrain(y, 0, spriteHeight - 1)] = newColor;
                } else {
                    pixels[constrain(x + ditherFactor / 2, 0, spriteWidth - 1)][constrain(y, 0, spriteHeight - 1)] = newColor;
                }
            }
        }
    }
}

//penTool: try to make a new pixel at specified cell location
function newPixel(xPos, yPos, newColor) {
    pixelPerfect(floor(xPos / cellSize), floor(yPos / cellSize));
    pixels[currentX][currentY] = newColor;
}

//used by erase tool to make a pixel white
function erasePixel(xPos, yPos) {
    let eraseSize = floor(brushSize / 2);
    let eraseX = floor(xPos / cellSize);
    let eraseY = floor(yPos / cellSize);
    for (let x = eraseX - eraseSize; x < eraseX + brushSize / 2; x++) {
        for (let y = eraseY - eraseSize; y < eraseY + brushSize / 2; y++) {
            pixels[constrain(x, 0, spriteWidth - 1)][constrain(y, 0, spriteHeight - 1)] = 1;
        }
    }
}

//penTool: checks the last drawn pixel to see if its sides are touching the pixel drawn before it and after it
//current: pixel being drawn
//prev: pixel that was drawn before current (is potentially modified if it is touching sides with both current and perm)
//perm: drawn before prev, is "permanent", because it was not modified by this function
function pixelPerfect(xArg, yArg) {
    let newX = constrain(xArg, 0, spriteWidth - 1); //limit arguments to existing pixels
    let newY = constrain(yArg, 0, spriteHeight - 1);

    if (newX != currentX || newY != currentY) { //a new pixel is being proposed
        permX = prevX; //previous drawn is now permanent
        permY = prevY;
        prevX = currentX; //"currently drawn" is now previously drawn
        prevY = currentY;
        prevPosColor = currentPosColor; //remember the last drawn color
        currentPosColor = pixels[newX][newY]; //remember the color being drawn
    }
    currentX = newX; //currently drawn pixel is from the argument
    currentY = newY;

    if (
        (currentX == prevX && prevY == permY) || //if previously drawn pixel is touching sides with its predecessor and successor
        (currentY == prevY && prevX == permX)
    ) {
        pixels[prevX][prevY] = prevPosColor; //reference old color, replace its new color with the stored 'previous color'
        prevX = permX;
        prevY = permY;
    }
}

//iterate through each pixel in the array and render it as a rectangle
function displayPixels() {
    for (let x = 0; x < spriteWidth; x++) {
        for (let y = 0; y < spriteHeight; y++) {
            let thisPixel = pixels[x][y];
            if (thisPixel == 3) {
                spriteBuffer.fill(color(255, 0, 0));
            } else if (thisPixel == 2) {
                //BLACK
                spriteBuffer.fill(0);
            } else if (thisPixel == 1) {
                //WHITE
                //spriteBuffer.fill("#ffffff");
                spriteBuffer.noFill();
            } else if (thisPixel == 0) {
                //TRANSPARENT
                spriteBuffer.noFill();
            }
            spriteBuffer.noStroke();
            spriteBuffer.rect(x * cellSize, y * cellSize, cellSize, cellSize); //DRAW PIXEL
        }
    }
}

function keyPressed() {
    if (keyCode == 69) { //pressed E
        clearSprite();
    }
}

//makes all pixels white
function clearSprite() {
    for (let x = 0; x < spriteWidth; x++) {
        for (let y = 0; y < spriteHeight; y++) {
            pixels[x][y] = 1;
        }
    }
    clearSound.play();
}

//draws square cursor where the mouse is
function drawCursor() {
    stroke(color(0, 0, 0, 75));
    strokeWeight(2);
    noFill();
    rect(
        mouseX - (mouseX % cellSize) - brushSize / 2 * cellSize,
        mouseY - (mouseY % cellSize) - brushSize / 2 * cellSize,
        cellSize * brushSize,
        cellSize * brushSize
    );
}

//check if mouse is outside of drawing area
function checkMouseOutside() {
    if (
        mouseX >= spriteWidth * cellSize + spritePosX ||
        mouseY >= spriteHeight * cellSize + spritePosY ||
        mouseX < spritePosX ||
        mouseY < spritePosY
    ) {
        mouseOutside = true;
        return;
    }
    mouseOutside = false;
}

//create tool button based on coordinates and tool icon image
class toolButton {
    constructor(xPos, yPos, iconImg, thisTool, isTool, defaultBrushSize) {
        let thisButton = createImg(iconImg, '');
        thisButton.position(xPos, yPos);
        if (isTool) {
            thisButton.mousePressed(function () {
                brushSize = defaultBrushSize;
                toolSelectY = yPos;
                selectedTool = thisButton;
                currentTool = thisTool;
            });
        }
        this.objButton = thisButton;
    }
    returnButton() {
        return this.objButton;
    }
}

//change button positions based on window size
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    pencilToolButton.position(toolPadding, windowHeight / 2 - toolBoxHeight / 2 + toolPadding);
    pencilToolButton.yPos = windowHeight / 2 - toolBoxHeight / 2 + toolPadding;
    eraseToolButton.position(toolPadding, windowHeight / 2 - toolBoxHeight / 2 + toolPadding * 2 + buttonHeight);
    eraseToolButton.yPos = windowHeight / 2 - toolBoxHeight / 2 + toolPadding * 2 + buttonHeight;
    ditherToolButton.position(toolPadding, windowHeight / 2 - toolBoxHeight / 2 + toolPadding * 3 + buttonHeight * 2);
    ditherToolButton.yPos = windowHeight / 2 - toolBoxHeight / 2 + toolPadding * 3 + buttonHeight * 2;
    save.position(toolPadding * 3 + buttonHeight, toolPadding);
    navigationStart = windowHeight * .8;
    toolSelectY = selectedTool.position().y;
    console.log(selectedTool.position());
    plus.position(toolPadding, navigationStart);
    minus.position(toolPadding, navigationStart + toolPadding + buttonHeight);
    normalZoom.position(toolPadding, navigationStart + toolPadding * 2 + buttonHeight * 2);
    doubleZoom.position(toolPadding, navigationStart + toolPadding * 3 + buttonHeight * 3);
}