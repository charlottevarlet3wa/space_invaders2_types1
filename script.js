

// Define the Question class
class Question {
    constructor(question, answers, correctAnswer) {
        this.question = question;
        this.answers = answers;
        this.correctAnswer = correctAnswer;
        this.activeAnswers = new Array(answers.length).fill(true);
        this.answerPositions = [];
    }

    initActiveAnswers(canvas) {
        this.answerPositions = [];
        this.answers.forEach(() => {
            let position;
            do {
                position = {
                    x: Math.random() * (canvas.width - 150),
                    y: 100 + Math.random() * (canvas.height - 200)
                };
            } while (this.checkForOverlap(position));
            this.answerPositions.push(position);
        });
    }

    checkForOverlap(newPosition) {
        return this.answerPositions.some(pos => {
            return !(newPosition.x + 150 < pos.x || newPosition.x > pos.x + 150 ||
                     newPosition.y + 50 < pos.y || newPosition.y > pos.y + 50);
        });
    }

    drawQuestion(elementId) {
        document.getElementById(elementId).innerText = this.question;
    }

    drawAnswers(ctx) {
        this.answers.forEach((answer, index) => {
            if (this.activeAnswers[index]) {
                const pos = this.answerPositions[index];
                ctx.fillStyle = 'red';
                ctx.fillRect(pos.x, pos.y, 150, 50);
                ctx.fillStyle = 'white';
                ctx.font = '16px Arial';
                ctx.fillText(answer, pos.x + 5, pos.y + 30);
            }
        });
    }

    validateAnswer(index, spaceship, game) {
        if (index === this.correctAnswer) {
            game.currentQuestionIndex++;
            if (game.currentQuestionIndex >= game.questions.length) {
                game.currentQuestionIndex = 0; // Loop back to the first question
            }
            game.questions[game.currentQuestionIndex].initActiveAnswers(game.canvas);
        } else {
            this.activeAnswers[index] = false;
        }
    }
}

// Define the Spaceship class
class Spaceship {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.speed = 1.5;
        this.health = 50;
        this.moveLeft = false;
        this.moveRight = false;
        this.moveUp = false;
        this.moveDown = false;
    }

    draw(ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    updatePosition(canvasWidth, canvasHeight) {
        if (this.moveLeft && this.x > 0) this.x -= this.speed;
        if (this.moveRight && this.x + this.width < canvasWidth) this.x += this.speed;
        if (this.moveUp && this.y > 0) this.y -= this.speed;
        if (this.moveDown && this.y + this.height < canvasHeight) this.y += this.speed;
    }

    fireBullet(game) {
        const bullet = new Projectile(this.x + this.width / 2 - 2.5, this.y, 0, -4);
        game.playerBullets.push(bullet);
    }
}

// Define the Enemy class
class Enemy {
    constructor(x, y, width, height, speed, color, movementBehavior, game) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.color = color;
        this.movementBehavior = movementBehavior;
        this.game = game;
        this.markedForDeletion = false;
        this.fireIntervalId = null;
        this.fireX = this.x + this.width / 2 - 2.5;
        this.fireY = this.y + this.height;
        this.fireSpeedX = 0;
        this.fireSpeedY = 1;

        this.startFiring(); // Commence à tirer si le mouvement est horizontal
        
    }

    update(canvas) {
        this.movementBehavior(this, canvas);
        if (this.isOffScreen(canvas)) {
            this.markForDeletion();
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    startFiring() {
        this.fireIntervalId = setInterval(() => {
            if (!this.markedForDeletion) {
                this.game.bullets.push(new Projectile(this.x + this.width / 2 - 2.5, this.y + this.height, 0, 2, this.color));
            }
        }, 1600);
    }

    markForDeletion() {
        this.markedForDeletion = true;
        if (this.fireIntervalId) {
            clearInterval(this.fireIntervalId);
        }
    }

    isOffScreen(canvas) {
        return (
            this.x + this.width < 0 ||
            this.x > canvas.width ||
            this.y + this.height < 0 ||
            this.y > canvas.height
        );
    }
}

function horizontalMovement(enemy, canvas) {
    // Initialiser la variable pour suivre le nombre de descentes
    if (enemy.descendCount === undefined) {
        enemy.descendCount = 0;
        enemy.movingRight = enemy.x < canvas.width / 2; // Détermine la direction initiale
    }
    
    if (enemy.movingRight) {
        enemy.x += enemy.speed;
    } else {
        enemy.x -= enemy.speed;
    }

    if(enemy.x <= 50 ||enemy.x >= canvas.width - 50 && enemy.descendCount != 0 && enemy.descendCount < 3){
        enemy.movingRight = !enemy.movingRight;
        enemy.y += 50;
        enemy.descendCount++;
    }

    // Si l'ennemi est déjà descendu 3 fois, le laisser sortir de l'écran
    if (enemy.descendCount >= 3 && (enemy.x + enemy.width < 0 || enemy.x > canvas.width)) {
        enemy.markForDeletion();
    }
}


function verticalMovement(enemy, canvas) {
    enemy.y += enemy.speed;
    if (enemy.y > canvas.height) {
        enemy.markForDeletion();
    }
}

function upMovement(enemy, canvas) {
    enemy.y -= enemy.speed;
    if (enemy.y > canvas.height) {
        enemy.markForDeletion();
    }
}

function diagonalMovement(enemy, canvas) {
    enemy.x -= enemy.speed;
    enemy.y += enemy.speed;
    if (enemy.x + enemy.width < 0 || enemy.y > canvas.height) {
        enemy.markForDeletion();
    }
}

function toRightDiagonalMovement(enemy, canvas) {
    enemy.x += enemy.speed;
    enemy.y += enemy.speed * 1.2;
    if (enemy.x >= canvas.width || enemy.y > canvas.height) {
        enemy.markForDeletion();
    }
}

const movements = [horizontalMovement, verticalMovement, diagonalMovement, toRightDiagonalMovement, upMovement];
function spawnCustomWave(game) {
    const colors = ['yellow', 'green', 'blue', 'red'].sort((a, b) => 0.5 - Math.random());;
    const movementBehavior = movements[Math.floor(Math.random() * movements.length)]; // Tous les mouvements sont horizontaux ici
    // const movementBehavior = verticalMovement; // Tous les mouvements sont horizontaux ici
    // const movementBehavior = diagonalMovement; // Tous les mouvements sont horizontaux ici
    // const movementBehavior = toRightDiagonalMovement; // Tous les mouvements sont horizontaux ici
    // const movementBehavior = horizontalMovement; // Tous les mouvements sont horizontaux ici
    // const movementBehavior = upMovement; // Tous les mouvements sont horizontaux ici
    const enemyWidth = 30;
    const enemyHeight = 30;
    let startX = Math.floor(Math.random() * 600 + 100);
    let speed = 0.5;
    let yPosition = -enemyHeight;   // Tous les ennemis apparaissent à la même hauteur
    switch(movementBehavior){
        case horizontalMovement:
            yPosition = 200;
            yPosition = Math.floor(Math.random() * 200 + 50);
            break;
        case upMovement:
            yPosition = game.canvas.height;
            break;

    }
    const interval = 1000; // Intervalle d'une seconde entre chaque spawn

    let enemy = null;
    colors.forEach((color, index) => {
        setTimeout(() => {
            switch(movementBehavior){
                case toRightDiagonalMovement:
                        enemy = new Enemy(
                            startX < game.canvas.width / 2 ? startX + 150 * index : startX - 150 * index, // Position horizontale initiale
                            yPosition, // Position verticale fixe
                            enemyWidth,
                            enemyHeight,
                            speed,
                            color,
                            movementBehavior,
                            game // Passe l'objet jeu pour que l'ennemi puisse ajouter des projectiles
                        );
                    break;
                case horizontalMovement:
                    enemy = new Enemy(
                        game.canvas.width, // Position horizontale initiale
                        yPosition, // Position verticale fixe
                        enemyWidth,
                        enemyHeight,
                        speed,
                        color,
                        movementBehavior,
                        game // Passe l'objet jeu pour que l'ennemi puisse ajouter des projectiles
                    );
                    break;
                default:
                    enemy = new Enemy(
                        startX < game.canvas.width / 2 ? startX + 100 * index : startX - 100 * index, // Position horizontale initiale
                        yPosition, // Position verticale fixe
                        enemyWidth,
                        enemyHeight,
                        speed,
                        color,
                        movementBehavior,
                        game // Passe l'objet jeu pour que l'ennemi puisse ajouter des projectiles
                    );
            }

            game.enemies.push(enemy);
        }, index * interval); // Décalage de l'apparition de chaque ennemi
    });
}

class Projectile {
    constructor(x, y, speedX, speedY, color = 'white', width = 5, height = 10) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speedX = speedX;
        this.speedY = speedY;
        this.color = color;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    isOffScreen(canvas) {
        return this.y < 0 || this.y > canvas.height || this.x < 0 || this.x > canvas.width;
    }
}

class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.spaceship = new Spaceship(400, 470);
        this.enemies = [];
        this.playerBullets = [];
        this.bullets = [];
        this.score = 0;
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.gameStarted = false;
        this.paused = false;
        this.spawnInterval = null;  // Pour gérer l'intervalle de spawn
        this.init();

        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());

    }

    handleVisibilityChange() {
        if (document.hidden) {
            console.log('hidden')
            this.pauseGame();  // Mettre le jeu en pause
        } else {
            console.log('not hidden')
            this.resumeGame();  // Reprendre le jeu
        }
    }

    pauseGame() {
        if (this.gameStarted && !this.paused) {
            this.paused = true;
            this.stopSpawnChecker(); // Arrête le spawn checker
            // Autres actions pour mettre en pause le jeu
            // Par exemple : Arrêter les animations, les timers, etc.
        }
    }

    resumeGame() {
        if (this.gameStarted && this.paused) {
            this.paused = false;
            this.startSpawnChecker(); // Reprend le spawn checker
            // this.gameLoop(); // Reprend la boucle du jeu
            // Autres actions pour reprendre le jeu
        }
    }

    async init() {
        this.canvas.width = 800;
        this.canvas.height = 600;
        await this.loadQuestions();
        this.displayQuestion();
        this.attachEventListeners();
        this.showStartScreen();
    }

    showStartScreen() {
        const startScreen = document.getElementById('startScreen');
        startScreen.style.display = 'block';

        const startGame = () => {
            startScreen.style.display = 'none';
            this.gameStarted = true;
            this.spawnEnemyWave();
            this.startSpawnChecker();  // Commence à vérifier le nombre d'ennemis
            this.gameLoop();
        };

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Enter' && !this.gameStarted) {
                startGame();
            }
        });
    }

    

    async loadQuestions() {
        const response = await fetch('questions.json');
        const data = await response.json();
        this.questions = data;
    }

    displayQuestion() {
        this.currentQuestionIndex = Math.floor(Math.random() * this.questions.length); 
        const questionData = this.questions[this.currentQuestionIndex];
        let valeur = questionData.valeur;
    
        // Ajoute des guillemets si le type est string
        if (questionData.type === 'string') {
            valeur = `"${valeur}"`;
        }
    
        const questionText = `${questionData.variable} <- ${valeur}`;
        document.getElementById('question-display').innerText = questionText;
    }

    startSpawnChecker() {
        this.spawnInterval = setInterval(() => {
            if (this.enemies.length < 4) {
                this.spawnEnemyWave();
            }
        }, 2000);
    }

    stopSpawnChecker() {
        if (this.spawnInterval) {
            clearInterval(this.spawnInterval);
        }
    }

    spawnEnemyWave() {
        if (this.gameStarted) {
            spawnCustomWave(this);
        }
    }

    gameLoop() {

        if (!this.paused) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.spaceship.draw(this.ctx);
            this.updateEntities();
            this.drawEntities();
            this.drawHealthBar();
            this.drawScore();
            if (this.gameStarted) {
                requestAnimationFrame(() => this.gameLoop());
            }
        }
    }

    updateEntities() {
        this.spaceship.updatePosition(this.canvas.width, this.canvas.height);
        this.enemies = this.enemies.filter(enemy => {
            enemy.update(this.canvas);
            return !enemy.markedForDeletion;
        });
        this.playerBullets = this.playerBullets.filter(bullet => !bullet.isOffScreen(this.canvas));
        this.playerBullets.forEach(bullet => bullet.update());
        this.bullets = this.bullets.filter(bullet => !bullet.isOffScreen(this.canvas));
        this.bullets.forEach(bullet => bullet.update());
        this.checkCollisions();
    }

    drawEntities() {
        this.playerBullets.forEach(bullet => bullet.draw(this.ctx));
        this.bullets.forEach(bullet => bullet.draw(this.ctx));
        this.enemies.forEach(enemy => enemy.draw(this.ctx));
    }

    drawHealthBar() {
        this.ctx.fillStyle = 'grey';
        this.ctx.fillRect(10, 10, 200, 20);
        this.ctx.fillStyle = 'green';
        this.ctx.fillRect(10, 10, 2 * this.spaceship.health, 20);
        this.ctx.strokeStyle = 'black';
        this.ctx.strokeRect(10, 10, 200, 20);
    }

    drawScore() {
        this.ctx.fillStyle = 'white';
        this.ctx.font = '18px Arial';
        this.ctx.fillText("Score: " + this.score, this.canvas.width - 100, 30);
    }

    checkCollisions() {
        const currentQuestion = this.questions[this.currentQuestionIndex];
        
        this.playerBullets.forEach((bullet, bulletIndex) => {
            this.enemies.forEach((enemy, enemyIndex) => {
                if (
                    bullet.x < enemy.x + enemy.width &&
                    bullet.x + bullet.width > enemy.x &&
                    bullet.y < enemy.y + enemy.height &&
                    bullet.y + bullet.height > enemy.y
                ) {
                    this.playerBullets.splice(bulletIndex, 1);
                    enemy.markForDeletion();
                    this.enemies.splice(enemyIndex, 1);

                    // Mise à jour de la question après avoir tiré sur un ennemi
                    if ((currentQuestion.type === 'int' && enemy.color === 'red') ||
                        (currentQuestion.type === 'string' && enemy.color === 'green') ||
                        (currentQuestion.type === 'float' && enemy.color === 'blue') ||
                        (currentQuestion.type === 'bool' && enemy.color === 'yellow')) {
                        this.displayQuestion();
                        this.score += 1;
                    }

                }
            });
        });

        this.bullets.forEach((bullet, index) => {
            if (
                this.spaceship.x < bullet.x + bullet.width &&
                this.spaceship.x + this.spaceship.width > bullet.x &&
                this.spaceship.y < bullet.y + bullet.height &&
                this.spaceship.y + this.spaceship.height > bullet.y
            ) {
                this.bullets.splice(index, 1);

                let bulletEffect = -2; // Effet par défaut : la balle diminue la vie

                if ((currentQuestion.type === 'int' && bullet.color === 'red') ||
                    (currentQuestion.type === 'string' && bullet.color === 'green') ||
                    (currentQuestion.type === 'float' && bullet.color === 'blue') ||
                    (currentQuestion.type === 'bool' && bullet.color === 'yellow')) {
                    bulletEffect = 2; // Effet positif : la balle augmente la vie
                }

                this.spaceship.health += bulletEffect;

                // S'assurer que la vie ne dépasse pas 100 ou ne tombe pas en dessous de 0
                this.spaceship.health = Math.max(0, Math.min(100, this.spaceship.health));

                if (this.spaceship.health <= 0) {
                    this.endGame();
                }
            }
        });
    }

    endGame() {
        this.gameStarted = false;
        this.stopSpawnChecker();  // Arrête le spawn checker lorsque le jeu se termine
        const gameOverScreen = document.getElementById('gameOverScreen');
        const finalScore = document.getElementById('finalScore');
        
        finalScore.innerText = this.score;
        gameOverScreen.style.display = 'block';
    }

    attachEventListeners() {
        document.addEventListener('keydown', (event) => {
            if (this.gameStarted) {
                switch (event.key) {
                    case 'ArrowLeft':
                    case 'q':
                        this.spaceship.moveLeft = true;
                        break;
                    case 'ArrowRight':
                    case 'd':
                        this.spaceship.moveRight = true;
                        break;
                    case 'ArrowUp':
                    case 'z':
                        this.spaceship.moveUp = true;
                        break;
                    case 'ArrowDown':
                    case 's':
                        this.spaceship.moveDown = true;
                        break;
                    case ' ':
                        this.spaceship.fireBullet(this);
                        break;
                }
            }
        });

        document.addEventListener('keyup', (event) => {
            switch (event.key) {
                case 'ArrowLeft':
                case 'q':
                    this.spaceship.moveLeft = false;
                    break;
                case 'ArrowRight':
                case 'd':
                    this.spaceship.moveRight = false;
                    break;
                case 'ArrowUp':
                case 'z':
                    this.spaceship.moveUp = false;
                    break;
                case 'ArrowDown':
                case 's':
                    this.spaceship.moveDown = false;
                    break;
            }
        });
    }
}

const game = new Game('gameCanvas');
