/* global styleConfig */

// Debug 

// Function to log based on category
function logDebug(category, ...messages) {
    if (!gameState.isPaused && !gameState.gameOver && debugSettings[category]) {
        console.log(`[${category}]`, ...messages);
    }
}

// Logging categories
const debugSettings = {
    general: false,
    foodGeneration: false,
    keyEvents: false,
    powerUps: true, 
    snakeSegments: true,
    snakeTotalSegments: false
};


// ------------
// Global Variables
// ------------
const canvas = document.getElementById('gameCanvas');
const gameCanvas = canvas; // This line explicitly declares gameCanvas.
const ctx = canvas.getContext('2d');

// Game dimensions and settings
const gameWidth = gameCanvas.clientWidth; // Width of the game canvas
const gameHeight = gameCanvas.clientHeight; // Height of the game canvas
const snakeSize = 20; // Size of each snake segment
const SNAKE_SPEED = 5; // Number of times the snake moves per second
const GRID_SIZE = snakeSize; // Size of the grid cell, equal to snake size
const MOVE_INTERVAL = 1000 / SNAKE_SPEED; // Time in milliseconds between moves
let moveTimer = 0; // Timer to track time since last grid movement

// Direction and turning statef
let currentDirection = 'right'; // Initial direction
let nextDirection = null; // Next direction to turn
let isTurning = false; // Indicates if the snake is currently truning
let turnStartTime = 0; // Start time of the turn animation
const TURN_DURATION = 20; // Duration of the turn animation in milliseconds

// Body segment dimensions and offsets for drawing
const BODY_PART_WIDTH = 16; // Width of snake body parts
const BODY_PART_HEIGHT = 16; // Height of snake body parts
const horizontalOffset = (GRID_SIZE - BODY_PART_WIDTH) / 2; // Horizontal offset for body parts
const verticalOffset = (GRID_SIZE - BODY_PART_HEIGHT) / 2; // Vertical offset for body parts

// Game state object holding the current state of the game
const gameState = {

    score: 0, // Initial score 0
    goalsAchieved: 0, // Count of goals achieved
    snake: [{ x: 160, y: 200 }, 
            { x: 160 - snakeSize, y: 200 },
            { x: 160 - 2 * snakeSize, y: 200 }
        ], // Initial snake segments
    food: [], // Array to hold food items
    foods: [],
    isPaused: false, // Tracks whether the game is paused
    currentVelocity: { horizontal: 20, vertical: 0 }, // Horizontal and Vertical movement increment
    currentValue: 0, // Current value accumulated by the snake
    goalNumber: 0, // Goal number to achieve by eating food
    lastOperation: '', // Last collected food operation 
    refreshAvailable: true, // Whether the food refresh power-up is available
    powerUpActive: false, // Tracks if a power-up is active
    duringSpecialMode: false, // Indicates if in power-up or quick refresh mode
    lastRefreshTime: Date.now(), // Timestamp of the last refresh
    quickRefreshAvailable: false, // Whether quick refresh is available for use
    refreshPowerUpTimer: null, // Global variable to hold timer references for easy access and management
    lastUpdateTime: 0, // Timestamp of the last update
    deltaTime: 0.01, // Delta time for game loop calculations
    foodCollected: 0, // Food collected count
    positiveFoodCollected: 0, // Positive food collected count
    multiplyPowerUpAvailable: false, // Tracks whether multiply power-up is available
    multiplyPowerUpUses: 0, // How many uses there are for multiply power-up
    multiplyNext: false,  // Indicates if the next food should trigger multiplication
    toggledMultiplyPowerUp: false // Indicates if the multiply power-up is toggled
}

// ------------
// Image/Frames 
// ------------

// Utility function to load an image and log success
function loadImage(src, description) {
    const img = new Image();
    img.src = src;
    img.onload = function() {
        console.log(`${description} loaded successfully.`);
    };
    return img;
}

// Load body part image
const bodyPartImage = loadImage('imgs/sprite/body_segments/body_type(3).png', 'Body part image');

// Load head images
const headImages = {
    up: loadImage('imgs/sprite/head/default/head_up.png', 'Head image for up'),
    down: loadImage('imgs/sprite/head/default/head_down.png', 'Head image for down'),
    left: loadImage('imgs/sprite/head/default/head_left.png', 'Head image for left'),
    right: loadImage('imgs/sprite/head/default/head_right.png', 'Head image for right')
};

// Load turn frames
const turnFrames = {
    right_to_up: loadImage('imgs/sprite/head/turn/right_to_up.png', 'Turn frame image for right to up'),
    right_to_down: loadImage('imgs/sprite/head/turn/right_to_down.png', 'Turn frame image for right to down'),
    left_to_up: loadImage('imgs/sprite/head/turn/left_to_up.png', 'Turn frame image for left to up'),
    left_to_down: loadImage('imgs/sprite/head/turn/left_to_down.png', 'Turn frame image for left to down'),
    up_to_right: loadImage('imgs/sprite/head/turn/up_to_right.png', 'Turn frame image for up to right'),
    up_to_left: loadImage('imgs/sprite/head/turn/up_to_left.png', 'Turn frame image for up to left'),
    down_to_right: loadImage('imgs/sprite/head/turn/down_to_right.png', 'Turn frame image for down to right'),
    down_to_left: loadImage('imgs/sprite/head/turn/down_to_left.png', 'Turn frame image for down to left')
};

// ------------
// Game Drawing
// ------------

// Function to set up UI styles
function drawUI() {
    ctx.font = styleConfig.ui.font; // Set font for UI elements
    ctx.fillStyle = styleConfig.ui.fillStyle; // Set fill color for UI elements
}

// Function to create a new div element and add it to the game canvas
function createDiv(gameCanvas, className, x, y, text = '', extraClass = '') {
    const div = document.createElement('div'); // Create a new div element
    div.className = `${className} ${extraClass}`; // Set class names
    div.style.left = `${x}px`; // Position the div horizontally
    div.style.top = `${y}px`; // Position the div vertically
    div.innerText = text; // Set the text content
    gameCanvas.appendChild(div); // Add the div to the game canvas
    return div; // Return the created div
}

// Example div creation
createDiv(gameCanvas, 'some-class', 100, 100, 'Example Text');

// Function to draw the snake on the canvas
function drawSnake() {
    gameState.snake.forEach((segment, index) => {
        segment.visualX = segment.x; // Set visual X coordinate
        segment.visualY = segment.y; // Set visual Y coordinate

        if (index === 0) { // If the segment is the head
            // Draw the head image based on the current direction
            if (isTurning) { // If the snake is turning
                let elapsedTime = performance.now() - turnStartTime; // Calculate elapsed time
                let progress = elapsedTime / TURN_DURATION; // Calculate progress of the turn

                if (progress >= 1) { // If the turn is complete
                    isTurning = false; // Reset turning state
                    currentDirection = nextDirection; // Update direction
                    nextDirection = null; // Clear next direction
                    ctx.drawImage(headImages[currentDirection], segment.visualX, segment.visualY, GRID_SIZE, GRID_SIZE); // Draw the head image
                } else {
                    let turnKey = `${currentDirection}_to_${nextDirection}`; // Get the turn frame key
                    ctx.drawImage(turnFrames[turnKey], segment.visualX, segment.visualY, GRID_SIZE, GRID_SIZE); // Draw the turn frame image
                }
            } else {
                ctx.drawImage(headImages[currentDirection], segment.visualX, segment.visualY, GRID_SIZE, GRID_SIZE); // Draw the head image
            }
        } else {
            // Draw the body part image for each body segment
            ctx.drawImage(bodyPartImage, segment.visualX + horizontalOffset, segment.visualY + verticalOffset, BODY_PART_WIDTH, BODY_PART_HEIGHT);
        }
    });
}

// Function to draw food items on the canvas
function drawFood() {
    logDebug('foodGeneration', "Preparing to draw food items:", gameState.foods.length); // Log the food drawing process

    gameState.foods.forEach(food => {
        // Set the style for the food item based on its value
        const foodStyle = food.value > 0 ? styleConfig.foodPositive : styleConfig.foodNegative;

        // Draw the number on the food item
        ctx.font = foodStyle.textFont; // Set font for the food item
        ctx.fillStyle = foodStyle.textColor; // Set text color for the food item
        ctx.textAlign = 'center'; // Align text to be centered
        ctx.textBaseline = 'middle'; // Align text in the middle of the box vertically
        ctx.fillText(food.value.toString(), food.x + snakeSize / 2, food.y + snakeSize / 2); // Position the text in the center of the square
    });
}

// Function to draw the game over screen
function drawGameOver() {
    ctx.fillStyle = 'rgba(0,0,0,0.8)'; // Set the overlay color
    ctx.fillRect(0, 0, canvas.width, canvas.height); // Draw the overlay

    ctx.font = '24px Arial'; // Set font for the game over text
    ctx.fillStyle = 'white'; // Set text color
    ctx.textAlign = 'center'; // Center the text
    ctx.fillText(`Game Over! Your score: ${gameState.score}`, canvas.width / 2, canvas.height / 2); // Display the score

    ctx.font = '18px Arial'; // Set font for the restart text
    ctx.fillText('Press Enter to restart', canvas.width / 2, canvas.height / 2 + 40); // Display the restart instruction

    updateScoreDisplay(); // Update the score display
    updateGoalDisplay(); // Update the goal display
    updateCurrentValueDisplay(); // Update the current value display
    updateLastOperationDisplay(); // Update the last operation display

    console.log("Game over screen displayed."); // Log for debugging
}

// Function to update the score display element
function updateScoreDisplay() {
    const scoreDisplay = document.querySelector('.score-display'); // Select the score display element
    if (scoreDisplay) {
        scoreDisplay.innerText = `Score: ${gameState.score}`; // Update the score text
    }
}

// Function to update the goal display element
function updateGoalDisplay() {
    const goalDisplay = document.querySelector('.goal-display'); // Select the goal display element
    if (goalDisplay) {
        goalDisplay.innerText = `${gameState.goalNumber}`; // Update the goal text
    }
}

// Function to update the current value display element
function updateCurrentValueDisplay() {
    const cValueDisplay = document.querySelector('.cValue-display'); // Select the current value display element
    if (cValueDisplay) {
        cValueDisplay.innerText = `${gameState.currentValue}`; // Update the current value text
    }
}

// Function to update the last operation display element
function updateLastOperationDisplay() {
    const lastOp = document.querySelector('.lastOp-display'); // Select the last operation display element
    if (lastOp) {
        lastOp.innerText = `${gameState.lastOperation}`; // Update the last operation text
    }
}

// Function to update the game state based on delta time
function updateGameState(deltaTime) {
    SnakeModule.moveSnake(deltaTime); // Move the snake based on delta time

    updateScoreDisplay(); // Update the score display
    updateGoalDisplay(); // Update the goal display
    updateCurrentValueDisplay(); // Update the current value display
    updateLastOperationDisplay(); // Update the last operation display
}

// Start the game loop
requestAnimationFrame(gameLoop);


// ------------
// Snake Module
// ------------
const SnakeModule = (function() {
    // Function to add segments to the snake
    function addSnakeSegments(number) {
        const head = gameState.snake[0];
        for (let i = 0; i < number; i++) {
            // Adds new segments at the head position
            gameState.snake.unshift({ x: head.x, y: head.y });
        }
        logDebug('snakeSegments', `Added ${number} segments, total now: ${gameState.snake.length}`);
    }

    // Function to move the snake based on deltaTime
    function moveSnake(deltaTime) {
        if (gameState.gameOver || gameState.snake.length === 0 || gameState.isPaused) return;

        moveTimer += deltaTime * 1100; // Convert deltaTime to milliseconds and add to moveTimer

        while (moveTimer >= MOVE_INTERVAL) {
            moveTimer -= MOVE_INTERVAL; // Subtract MOVE_INTERVAL to maintain precise timing

            // Calculate new head position based on current velocity
            let newHead = {
                x: gameState.snake[0].x + gameState.currentVelocity.horizontal,
                y: gameState.snake[0].y + gameState.currentVelocity.vertical,
            };

            // Grid wrapping logic to keep the snake within the canvas
            newHead.x = (newHead.x >= gameWidth) ? 0 : (newHead.x < 0) ? gameWidth - GRID_SIZE : newHead.x;
            newHead.y = (newHead.y >= gameHeight) ? 0 : (newHead.y < 0) ? gameHeight - GRID_SIZE : newHead.y;

            // Check for food collision and handle game over scenarios
            if (FoodModule.checkFoodCollision(newHead, gameState.snake)) {
                GameControl.gameOver();
                return;
            }

            // Check for self-collision
            if (gameState.snake.slice(1).some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
                GameControl.gameOver();
                return;
            }

            gameState.snake.unshift(newHead); // Add new head to the snake
            gameState.snake.pop(); // Remove the last segment to maintain length
            FoodModule.checkFoodCollision(newHead); // Check for food collision after moving
        }

        // Interpolate visual position for smooth movement
        gameState.snake.forEach((segment, index) => {
            if (index === 0) {
                segment.visualX = lerp(segment.visualX, segment.x, moveTimer / MOVE_INTERVAL);
                segment.visualY = lerp(segment.visualY, segment.y, moveTimer / MOVE_INTERVAL);
            } else {
                segment.visualX = lerp(gameState.snake[index - 1].visualX, gameState.snake[index - 1].x, moveTimer / MOVE_INTERVAL);
                segment.visualY = lerp(gameState.snake[index - 1].visualY, gameState.snake[index - 1].y, moveTimer / MOVE_INTERVAL);
            }
        });
    }

    // Linear interpolation function
    function lerp(start, end, t) {
        return start * (1 - t) + end * t;
    }

    // Function to remove segments from the snake
    function removeSnakeSegments(number) {
        // Ensure that at least one segment remains
        if (gameState.snake.length > number) {
            gameState.snake.splice(-number, number); // Remove 'number' segments from the end
            logDebug('snakeSegments', `Removed ${number} segments, total now: ${gameState.snake.length}`);
        } else {
            GameControl.gameOver(); // End the game if the snake would disappear
        }
    }

    // Expose the module's functions
    return {
        moveSnake,
        addSnakeSegments,
        removeSnakeSegments
    };
})();


// ------------
// Food Module
// ------------
const FoodModule = (function() {
    
    // Function to generate new food items
    function generateNewFoods(count) {
        let attempts = 0; // To prevent infinite loop in case of no space available
        for (let i = 0; i < count; i++) {
            let validPlacement = false;
            let x, y, value;
            while (!validPlacement && attempts < 1000) {
                // Randomly generate food value and position
                value = Math.random() < 0.3 ? -Math.floor(Math.random() * 9) - 1 : Math.floor(Math.random() * 9) + 1;
                x = Math.floor(Math.random() * ((gameWidth - snakeSize) / snakeSize)) * snakeSize;
                y = Math.floor(Math.random() * ((gameHeight - snakeSize - 40) / snakeSize)) * snakeSize; // Ensuring y starts beyond the UI area and within the canvas

                // Check placement against UI, snake, and other foods
                let tooCloseToUI = y < 40; // Assuming UI occupies the first 40 pixels vertically
                let tooCloseToSnake = gameState.snake.some(segment => Math.hypot(segment.x - x, segment.y - y) < snakeSize);
                let tooCloseToFoods = gameState.foods.some(f => Math.hypot(f.x - x, f.y - y) < snakeSize * 2);

                validPlacement = !tooCloseToUI && !tooCloseToSnake && !tooCloseToFoods;
                attempts++;
            }
            if (validPlacement) {
                gameState.foods.push({x, y, value});
            } else {
                console.log("Failed to place new food after 1000 attempts");
                break;
            }
        }
    }

    // Function to handle food regeneration and quick refresh
    function foodRegenAndRefresh() {
        // Handle food regeneration based on collected count or other conditions
        if (gameState.foodCollected >= 15 && !gameState.duringSpecialMode) {
            gameState.foodCollected = 0;  // Reset the counter
            generateNewFoods(10);  // Generate 10 new foods
        }

        // Activate quick refresh if no positive food items are left and a power-up is active
        if (!gameState.foods.some(food => food.value > 0) && gameState.powerUpActive) {
            gameState.quickRefreshAvailable = true;
            gameState.powerUpActive = false;
            logDebug('powerUps', "Quick refresh activated for 5 seconds.");
            setTimeout(() => {
                gameState.quickRefreshAvailable = false;
                console.log("Quick refresh now unavailable.");
            }, 5000);
        }
    }

    // Function to move food, optionally regenerating food items
    function moveFood(isPowerUp = false, forceRegenerate = false) {
        if (gameState.gameOver) return;
        if (gameState.isPaused) {
            console.log("Attempted to move food while game is paused.");
            return;
        }
        console.log("Moving food with isPowerUp:", isPowerUp);

        // Check if it is necessary to regenerate food based on the flags
        if (isPowerUp || gameState.quickRefreshAvailable || forceRegenerate) {
            gameState.foods = [];  // Clear existing food before generating new
            let negativeProbability = isPowerUp ? 0.8 : 0.3;  // More likely to generate negative values during a power-up
            const attempts = 100;  // Limit attempts to prevent infinite loops

            for (let i = 0; i < 30; i++) {
                let validPlacement = false;
                let value, x, y, attempt = 0;
                while (!validPlacement && attempt < attempts) {
                    // Randomly generate food value and position
                    value = Math.floor(Math.random() * 9) + 1;
                    x = Math.floor(Math.random() * (gameWidth / snakeSize)) * snakeSize;
                    y = Math.floor(Math.random() * (gameHeight / snakeSize)) * snakeSize;

                    // Check if food is too close to the UI, the snake, or other foods
                    let tooCloseToUI = y < 40;  // Assuming UI occupies the first 40 pixels vertically
                    let tooCloseToSnake = gameState.snake.some(segment => Math.hypot(segment.x - x, segment.y - y) < snakeSize * 5);
                    let tooCloseToFoods = gameState.foods.some(f => Math.hypot(f.x - x, f.y - y) < snakeSize * 2);

                    validPlacement = !tooCloseToUI && !tooCloseToSnake && !tooCloseToFoods;
                    attempt++;
                }
                if (validPlacement) {
                    let isNegative = Math.random() < negativeProbability;
                    if (isNegative) {
                        value = -value;  // Apply negative value logic
                    }
                    gameState.foods.push({x, y, value});
                }
            }
            drawFood(); // Draw the newly generated food
        }
    }

    // Function to check for food collision and handle state changes
    function checkFoodCollision(head) {
        if (gameState.gameOver) return;

        // Find the index of the food item that the snake head collides with
        let foodIndex = gameState.foods.findIndex(food => 
            Math.abs(food.x - head.x) < snakeSize && Math.abs(food.y - head.y) < snakeSize
        );
        if (foodIndex !== -1) {
            let food = gameState.foods[foodIndex];

            // Apply multiplication if the next food collection should trigger it
            if (gameState.multiplyNext) {
                gameState.currentValue *= food.value; // Perform multiplication
                gameState.multiplyNext = false;  // Reset the trigger
            } else {
                GoalModule.updateGoalAndCurrentValue(food.value); // Normal update
            }

            gameState.foods.splice(foodIndex, 1);  // Remove the eaten food
            gameState.foodCollected++;  // Increment food collected counter

            if (food.value > 0) {
                // Increment positive food collected count and handle power-up availability
                if (!gameState.multiplyPowerUpAvailable || gameState.multiplyPowerUpUses >= 2) {
                    gameState.positiveFoodCollected++;
                    if (gameState.positiveFoodCollected >= 15) {
                        gameState.multiplyPowerUpAvailable = true;
                        gameState.multiplyPowerUpUses = 0; // Reset uses when a new power-up period starts
                        gameState.positiveFoodCollected = 0; // Reset the collection counter
                    }
                }
                // Positive food collection logic
                if (gameState.multiplyPowerUpAvailable && gameState.multiplyPowerUpUses < 2) {
                    SnakeModule.addSnakeSegments(4); // Grow by 4 segments instead of 2 when collecting positives
                    logDebug('snakeSegments', `Snake grew to ${gameState.snake.length} segments after eating positive food.`);
                } else {
                    SnakeModule.addSnakeSegments(2); // Normal growth 
                }
            } else {
                // Negative food collection logic
                if (food.value < 0 && gameState.toggledMultiplyPowerUp && gameState.toggledMultiplyPowerUp) {
                    SnakeModule.removeSnakeSegments(Math.abs(food.value)); // Remove segments based on the absolute value of negative food
                    gameState.toggledMultiplyPowerUp = false; // Deactivate the power-up immediately after use
                } else {
                    // Check if multiplication power-up is active and adjust shrink accordingly
                    if (gameState.multiplyPowerUpAvailable && gameState.multiplyPowerUpUses < 2) {
                        SnakeModule.addSnakeSegments(1); // Grows by 2 instead of shrinking when collecting negatives
                    } else {
                        SnakeModule.removeSnakeSegments(2); // Normal shrink 
                    }
                }
                logDebug('snakeSegments', `Snake shrunk to ${gameState.snake.length} segments after eating negative food.`);
            }
            if (gameState.foods.length === 0) FoodModule.moveFood();  // Optionally regenerate food if all are eaten
        } else {
            logDebug('snakeTotalSegments', `Snake moved, total segments now: ${gameState.snake.length}`);
        }
        FoodModule.foodRegenAndRefresh();
    }

    // Expose the module's functions
    return {
        generateNewFoods,
        foodRegenAndRefresh,
        moveFood,
        checkFoodCollision
    };
})();


// ------------
// Goal Module
// ------------
const GoalModule = (function() {

    // Function to generate a random goal based on the current score
    function getRandomGoal() {
        const base = 10; // Base goal
        const growthRate = 0.05; // How quickly the goal increases with score
        const randomFactor = Math.random() * 5; // Random Factor between 0 and 5
        // Calculate new goal based on current score using an exponential growth formula
        return Math.floor(base + Math.exp(growthRate * gameState.score) + randomFactor);
    }

    // Function to update the goal and current value based on the collected food value
    function updateGoalAndCurrentValue(number) {
        // Record the last operation performed with the food value
        gameState.lastOperation = (number >= 0 ? '+' : '-') + ' ' + Math.abs(number);
        
        // Update the current value based on the food value
        if (number < 0 && gameState.currentValue < 0) {
            // Adding two negatives results in a less negative number (mathematically subtracting a negative)
            gameState.currentValue += number;
        } else {
            // Standard addition of the absolute values
            gameState.currentValue += number;
        }

        // Check if the goal has been achieved
        checkGoalAchieved();
    }

    // Function to check if the current goal has been achieved
    function checkGoalAchieved() {
        if (gameState.currentValue === gameState.goalNumber) {
            gameState.score += 10; // Increase score
            gameState.goalNumber = getRandomGoal(); // Set new goal
            gameState.currentValue = 0; // Reset current value
            gameState.goalsAchieved += 1; // Increment the count of goals achieved
        }
    }

    // Expose the module's functions
    return {
        getRandomGoal,
        updateGoalAndCurrentValue,
        checkGoalAchieved
    };
})();


// ------------
// Power-ups Module
// ------------
const PowerUpsModule = (function() {

    // Function to activate the refresh power-up
    function activateRefreshPowerUp() {
        // Check if the game is over, a power-up is already active, or the game is paused
        if (gameState.gameOver || gameState.powerUpActive || gameState.isPaused) return;

        gameState.duringSpecialMode = true;
        FoodModule.moveFood(true, true);  // Refresh the food with a power-up effect
        gameState.refreshAvailable = false;  // Disable the power-up
        gameState.powerUpActive = true;
        gameState.powerUpEnded = false; // Flag to prevent re-execution
        logDebug('powerUps', "Refresh power-up activated.");

        let powerUpDuration = 20000; // Power-up duration in milliseconds

        // Function to execute the logic when the power-up ends
        let executePowerUpEndLogic = () => {
            if (gameState.isPaused || gameState.gameOver || gameState.powerUpEnded) {
                console.log("Attempted to execute power-up logic while game is paused, over, or already handled.");
                return;
            }
            gameState.powerUpActive = false;
            gameState.duringSpecialMode = false;
            gameState.powerUpEnded = true; // Mark that this logic has run
            logDebug('powerUps', "Power-up effects have ended. Performing a normal refresh.");
            FoodModule.moveFood(false, true);

            let cooldownDuration = 120000; // Cooldown duration in milliseconds
            let cooldownTimer = setTimeout(() => {
                gameState.refreshAvailable = true;
                logDebug('powerUps', "Refresh power-up reactivated.");
            }, cooldownDuration);

            gameState.activeTimers.push({
                id: cooldownTimer,
                type: 'cooldown',
                duration: cooldownDuration,
                startTime: Date.now(),
                callback: () => gameState.refreshAvailable = true
            });
        };

        // Function to reschedule the power-up timer if needed
        let reschedulePowerUpTimer = () => {
            if (gameState.isPaused || gameState.powerUpEnded) {
                console.log('Game is paused or power-up end logic already executed, skipping reschedule.');
                return;
            }
            executePowerUpEndLogic();
        };

        let powerUpTimer = setTimeout(reschedulePowerUpTimer, powerUpDuration);
        gameState.activeTimers.push({
            id: powerUpTimer,
            type: 'powerUp',
            duration: powerUpDuration,
            startTime: Date.now(),
            callback: executePowerUpEndLogic
        });
    }

    // Function to handle the activation of the quick refresh
    function activateQuickRefresh() {
        if (gameState.gameOver) return;

        if (gameState.quickRefreshAvailable) {
            logDebug('powerUps', "Quick refresh activated, overriding any existing power-up.");

            // Clear only the active power-up effects and timers, keep cooldown timers
            gameState.activeTimers = gameState.activeTimers.filter(timer => {
                if (timer.type === 'powerUp') {
                    clearTimeout(timer.id);
                    return false; // Remove this timer from the array
                }
                return true; // Keep cooldown timers
            });

            gameState.powerUpActive = false;
            FoodModule.moveFood(true); // Perform a quick refresh with special conditions
            gameState.quickRefreshAvailable = false; // Quick refresh used, becomes unavailable

            // Set the duration for the quick refresh effect
            let quickRefreshDuration = 15000; // Duration in milliseconds
            setTimeout(() => {
                logDebug('powerUps', "Quick refresh effect ended.");
                FoodModule.moveFood(false, true); // Regenerate food normally after quick refresh ends

                // Check if we need to restart or continue a cooldown
                if (!gameState.refreshAvailable && !gameState.activeTimers.some(timer => timer.type === 'cooldown')) {
                    // Suppose the cooldown was mistakenly cleared or never set, restart it
                    let cooldownDuration = 10000; // Adjust the duration according to your game's logic
                    let cooldownTimer = setTimeout(() => {
                        gameState.refreshAvailable = true;
                        logDebug('powerUps', "Refresh power-up reactivated.");
                    }, cooldownDuration);
                    gameState.activeTimers.push({
                        id: cooldownTimer,
                        type: 'cooldown',
                        duration: cooldownDuration,
                        startTime: Date.now()
                    });
                }
            }, quickRefreshDuration);
        } else if (gameState.refreshAvailable && !gameState.powerUpActive) {
            activateRefreshPowerUp();
        }
        assessBoardBeforeAutoRefresh();
    }

    // Function to handle the activation of the Multiply power-up
    function toggleMultiplyPowerUp() {
        if (gameState.gameOver) return;

        // Toggle the multiplyNext flag to activate the special effect on the next food collision
        if (gameState.multiplyPowerUpAvailable && !gameState.toggledMultiplyPowerUp) {
            gameState.multiplyNext = true;  // Prepare for next food collision to use the special effect
            gameState.toggledMultiplyPowerUp = true;
            gameState.multiplyPowerUpUses++;
        } else {
            gameState.toggledMultiplyPowerUp = false;
            gameState.multiplyNext = false;  // Ensure this is false when power-up is not active
        }

        if (gameState.multiplyPowerUpUses >= 2 ) {
            gameState.multiplyPowerUpAvailable = false;
            gameState.multiplyPowerUpUses = 0;
        }
        console.log(`Power-Up Toggled: ${gameState.toggledMultiplyPowerUp}, Power-Up Available: ${gameState.multiplyPowerUpAvailable}, Next Multiplication: ${gameState.multiplyNext}`);
    }

    // Function to assess the board and activate quick refresh if necessary
    function assessBoardBeforeAutoRefresh() {
        if (gameState.isPaused || gameState.gameOver) return; // Check if the game is paused

        let positivesLeft = gameState.foods.some(food => food.value > 0);
        if (!positivesLeft && gameState.powerUpActive) {
            // Only activate quick refresh if no positives are left and a power-up is currently active
            gameState.quickRefreshAvailable = true;
            logDebug('powerUps', "Quick refresh available for 5 seconds.");
            let quickRefreshTimer = setTimeout(() => {
                if (!gameState.isPaused && gameState.gameOver) { // Check again before making changes
                    gameState.quickRefreshAvailable = false;
                    logDebug('powerUps', "Quick refresh now unavailable.");
                }
            }, 10000); // Quick refresh available for 10 seconds

            // Store the quick refresh timer for pause management
            gameState.activeTimers.push({
                id: quickRefreshTimer,
                type: 'quickRefresh',
                duration: 10000,  // 10 seconds duration
                startTime: Date.now(),
                callback: () => {
                    if (gameState.gameOver) {
                        gameState.quickRefreshAvailable = false;
                    }
                }
            });
        }
    }

    // Use this function to handle refresh based on quick refresh state or regular refresh availability
    // eslint-disable-next-line no-unused-vars
    function handleRefreshPowerUp() {
        if (gameState.gameOver) return;
        if (gameState.quickRefreshAvailable) {
            logDebug('powerUps', "Using quick refresh.");
            FoodModule.moveFood(true); // Perform a quick refresh with special conditions
            gameState.quickRefreshAvailable = false; // Disable quick refresh immediately after use
        } else if (gameState.refreshAvailable && !gameState.powerUpActive) {
            activateRefreshPowerUp();
        }
    }

    // Expose the module's functions
    return {
        activateRefreshPowerUp,
        activateQuickRefresh,
        toggleMultiplyPowerUp,
        assessBoardBeforeAutoRefresh,
        handleRefreshPowerUp
    }
})();


// ------------
// Game State
// ------------
gameState.activeTimers = []; // Initialize the array to hold active timers

const GameControl = (function() {
    // Game Initialization function
    function initGame() {
        // Reset all game state variables to their initial values
        gameState.score = 0;
        gameState.goalsAchieved = 0;
        gameState.snake = [{ x: 160, y: 200 }, { x: 160 - snakeSize, y: 200 }, { x: 160 - 2 * snakeSize, y: 200 }];
        gameState.food = [];
        gameState.foods = [];
        gameState.isPaused = true;
        gameState.currentVelocity = { horizontal: 20, vertical: 0 }; 
        gameState.currentValue = 0;
        gameState.goalNumber = GoalModule.getRandomGoal(); 
        gameState.lastOperation = '';
        gameState.refreshAvailable = true; 
        gameState.powerUpActive = false; 
        gameState.duringSpecialMode = false; 
        gameState.lastRefreshTime = Date.now();
        gameState.quickRefreshAvailable = false;
        gameState.refreshPowerUpTimer = null; 
        gameState.lastUpdateTime = 0;
        gameState.deltaTime = 0.01;
        gameState.foodCollected = 0;
        gameState.positiveFoodCollected = 0;
        gameState.multiplyPowerUpAvailable = false;
        gameState.multiplyPowerUpUses = 0;
        gameState.multiplyNext = false; 
        gameState.toggledMultiplyPowerUp = false;
        currentDirection = 'right'; 
        nextDirection = null;
        isTurning = false;
        turnStartTime = 0;
        moveTimer = 0; 

        FoodModule.generateNewFoods(30); // Generate 30 foods at the start
    }

    // Start the game loop after the DOM content is loaded
    document.addEventListener('DOMContentLoaded', () => {
        initGame(); 
        requestAnimationFrame(gameLoop); // Start the game loop after initializing
    });

    // Function to pause and unpause the game
    function setPause(pauseState) {
        gameState.isPaused = pauseState;
        if (pauseState) {
            // If pausing, halt all active timers
            gameState.activeTimers.forEach(timer => {
                clearTimeout(timer.id);
                timer.remaining = timer.duration - (Date.now() - timer.startTime);
            });
            console.log("Game paused, timers halted.");
        } else {
            // If unpausing, resume all halted timers
            let timersToResume = gameState.activeTimers;
            gameState.activeTimers = []; // Clear old timers array to prevent duplicates
            timersToResume.forEach(timer => {
                let newTimerId = setTimeout(timer.callback, timer.remaining);
                gameState.activeTimers.push({...timer, id: newTimerId, startTime: Date.now()});
            });
            console.log("Game resumed, timers continued.");
            gameState.lastUpdateTime = performance.now(); // Reset the last update time to avoid a large deltaTime
        }
        requestAnimationFrame(gameLoop);
    }

    // Function to handle game over logic
    function gameOver() {
        if (gameState.gameOver) return; // Prevent multiple triggers

        gameState.gameOver = true; // Set the game over flag

        console.log("Game Over! Score:", gameState.score);

        clearTimeout(gameState.refreshPowerUpTimer); // Clear any ongoing timers
        clearTimers(); // Clear all active game timers
        drawGameOver(); // Draw the game over screen

        // Reset power-up and game variables
        gameState.refreshAvailable = true;
        gameState.powerUpActive = false;
        gameState.quickRefreshAvailable = false;
        gameState.multiplyPowerUpAvailable = false;
        gameState.multiplyPowerUpUses = 0;
        gameState.multiplyNext = false;
        gameState.positiveFoodCollected = 0;

        currentDirection = 'right';
    }

    // Function to restart the game
function restartGame() {
        // Reset the game state to initial values
        gameState.score = 0;
        gameState.goalsAchieved = 0;
        gameState.currentValue = 0;
        gameState.lastOperation = '';
        gameState.foodCollected = 0;
        gameState.goalNumber = GoalModule.getRandomGoal();
        gameState.refreshAvailable = true;
        gameState.powerUpActive = false;
        gameState.quickRefreshAvailable = false;
        gameState.duringSpecialMode = false;

        currentDirection = 'right';
        gameState.snake = [{ x: 160, y: 200 }, { x: 140, y: 200 }]; // Reset snake position
        gameState.currentVelocity = { horizontal: 20, vertical: 0 }; // Reset movement

        gameState.foods = []; // Clear foods
        gameState.gameOver = false; // Clear the game over flag

        initGame(); // Reinitialize game setup

        // Redraw and restart the game loop
        redrawGameCanvas(); 
        requestAnimationFrame(gameLoop); 
        console.log("Game has been restarted."); // Debugging log

        // Update displays
        updateScoreDisplay();
        updateGoalDisplay();
        updateCurrentValueDisplay();
        updateLastOperationDisplay();
    }

    // Expose the module's functions
    return {
        initGame,
        gameOver,
        restartGame,
        setPause
    };
})();

// Function to reset timers once the game is over
function clearTimers() {
    gameState.activeTimers.forEach(timer => clearTimeout(timer.id));
    gameState.activeTimers = []; // Reset the timers array

    console.log("Game Over. Timers cleared and game over screen drawn.");
}

// Function to redraw the game canvas
function redrawGameCanvas() {
    if (gameState.gameOver) {
        drawGameOver();
        return;  // Do not draw anything else if the game is over
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas for new drawing
    drawSnake();  // Draw the snake
    drawFood();   // Draw the food
    drawUI();     // Draw the UI elements
}

// ------------
// Event Listener
// ------------

// Debounce interval in milliseconds to prevent rapid direction changes
const directionChangeDebounce = 100;
let lastDirectionChangeTime = 0; // Timestamp of the last direction change
let bufferedDirectionChange = null; // Store the buffered direction change event
let debounceTimeout = null; // Timeout for debouncing direction changes

// Event listener for keydown events to handle snake direction and game controls
document.addEventListener('keydown', function(e) {
    const currentTime = new Date().getTime(); // Get the current timestamp

    // Check if the debounce interval has passed since the last direction change
    if (currentTime - lastDirectionChangeTime < directionChangeDebounce) {
        bufferedDirectionChange = e; // Buffer the event for later processing
        clearTimeout(debounceTimeout); // Clear any existing debounce timeout
        debounceTimeout = setTimeout(() => {
            if (bufferedDirectionChange) {
                processDirectionChange(bufferedDirectionChange); // Process the buffered event
                bufferedDirectionChange = null; // Clear the buffer
            }
        }, directionChangeDebounce - (currentTime - lastDirectionChangeTime)); // Adjust the timeout for the remaining debounce interval
        return; // Exit and wait to apply the buffered input
    }
    processDirectionChange(e); // Process the event immediately if not within debounce period
});

// Function to process direction change events and other key controls
function processDirectionChange(e) {
    lastDirectionChangeTime = new Date().getTime(); // Update the timestamp of the last direction change

    // Handle specific key events
    if (e.key === 'Enter' && gameState.gameOver) {
        GameControl.restartGame(); // Restart the game if Enter is pressed and the game is over
    } else if (e.key === 'Escape') {
        GameControl.setPause(!gameState.isPaused); // Toggle pause state if Escape is pressed
    } else if (gameState.isPaused) {
        GameControl.setPause(false); // Unpause the game if any direction key is pressed while paused
    } else if (!gameState.isPaused) {
        let newHorizontalVelocity = gameState.currentVelocity.horizontal;
        let newVerticalVelocity = gameState.currentVelocity.vertical;
        let newDirection = currentDirection;

        logDebug('keyEvents', `Key pressed: ${e.key}`); // Debug log for key presses

        // Determine the new direction and velocity based on the key pressed
        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                if (gameState.currentVelocity.vertical === 0) { // Prevent 180-degree turns
                    newVerticalVelocity = -snakeSize;
                    newHorizontalVelocity = 0;
                    newDirection = 'up';
                }
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                if (gameState.currentVelocity.vertical === 0) { // Prevent 180-degree turns
                    newVerticalVelocity = snakeSize;
                    newHorizontalVelocity = 0;
                    newDirection = 'down';
                }
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                if (gameState.currentVelocity.horizontal === 0) { // Prevent 180-degree turns
                    newHorizontalVelocity = -snakeSize;
                    newVerticalVelocity = 0;
                    newDirection = 'left';
                }
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                if (gameState.currentVelocity.horizontal === 0) { // Prevent 180-degree turns
                    newHorizontalVelocity = snakeSize;
                    newVerticalVelocity = 0;
                    newDirection = 'right';
                }
                break;
            case 'R':
            case 'r':
                if (gameState.quickRefreshAvailable) {
                    PowerUpsModule.activateQuickRefresh(); // Activate quick refresh power-up
                } else if (gameState.refreshAvailable) {
                    PowerUpsModule.activateRefreshPowerUp(); // Activate refresh power-up
                }
                break;
            case 'm':
            case 'M':
                if (!gameState.toggledMultiplyPowerUp && gameState.multiplyPowerUpAvailable) {
                    PowerUpsModule.toggleMultiplyPowerUp(); // Toggle multiply power-up
                    gameState.toggledMultiplyPowerUp = true;
                } else {
                    gameState.toggledMultiplyPowerUp = false;
                }
                break;
        }

        // If the direction has changed, update the game state
        if (currentDirection !== newDirection && newDirection !== null) {
            gameState.currentVelocity.horizontal = newHorizontalVelocity;
            gameState.currentVelocity.vertical = newVerticalVelocity;
            nextDirection = newDirection;
            isTurning = true;
            turnStartTime = performance.now(); // Record the start time of the turn animation
            logDebug('keyEvents', `Velocity updated to: Horizontal ${gameState.currentVelocity.horizontal}, Vertical ${gameState.currentVelocity.vertical}`); // Confirm velocity update
        }
    }
}

// Interval to check for buffered direction changes and apply them if debounce period has passed
setInterval(() => {
    if (bufferedDirectionChange && new Date().getTime() - lastDirectionChangeTime >= directionChangeDebounce) {
        processDirectionChange(bufferedDirectionChange); // Process the buffered event
        bufferedDirectionChange = null; // Clear the buffer after processing
    }
}, 10); // Check every 10 ms

// ------------
// Game Start
// ------------

// Start the game
function gameLoop(currentTime) {
    if (gameState.gameOver) {
        drawGameOver();
        return; // Stop the loop by not requesting another frame
    }
    
    if (!gameState.isPaused) {
        const deltaTime = (currentTime - gameState.lastUpdateTime) / 1000;
        gameState.lastUpdateTime = currentTime;

        SnakeModule.moveSnake(deltaTime); // Move snake based on deltaTime, but only update position on interval
        updateGameState(deltaTime);  // Handle all game logic
    }

    redrawGameCanvas(); // Redraw everything every frame
    requestAnimationFrame(gameLoop); // Continue the loop if not game over or paused
}