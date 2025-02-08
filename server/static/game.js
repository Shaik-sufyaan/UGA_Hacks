let ws;
let username;
let jobTitle;
let roomCode;
let currentQuestionIndex = 0;

function generateClientId() {
    return Math.random().toString(36).substr(2, 9);
}

function createRoom() {
    console.log('createRoom called');
    username = document.getElementById('username').value;
    jobTitle = document.getElementById('job-title').value;

    if (!username) {
        alert('Please enter a username');
        return;
    }

    const clientId = generateClientId();
    console.log('Generated clientId:', clientId);
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${clientId}`;
    console.log('Connecting to:', wsUrl);
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('Connected to server');
        const message = {
            type: 'create_room',
            username: username
        };
        console.log('Sending message:', message);
        ws.send(JSON.stringify(message));
    };

    setupWebSocketHandlers();
}

function joinGame() {
    username = document.getElementById('username').value;
    jobTitle = document.getElementById('job-title').value;
    roomCode = document.getElementById('room-code').value;

    if (!username || !roomCode) {
        alert('Please fill in all fields');
        return;
    }

    const clientId = generateClientId();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${clientId}`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('Connected to server');
        ws.send(JSON.stringify({
            type: 'join_room',
            room: roomCode,
            username: username
        }));
    };

    setupWebSocketHandlers();
};

function setupWebSocketHandlers() {
    ws.onmessage = handleMessage;
    ws.onclose = () => console.log('Disconnected from server');
}

function handleMessage(event) {
    console.log('Received message:', event.data);
    const message = JSON.parse(event.data);
    console.log('Parsed message:', message);
    
    switch (message.type) {
        case 'room_created':
            console.log('Handling room_created message');
            handleRoomCreated(message);
            break;

        case 'room_update':
            console.log('Handling room_update message');
            updatePlayersList(message.players);
            updateWaitingScreen(message.players);
            break;
            
        case 'question':
            displayQuestion(message);
            break;
            
        case 'answer_result':
            handleAnswerResult(message);
            break;
            
        case 'level_complete':
            handleLevelComplete(message);
            break;
            
        case 'player_disconnect':
            handlePlayerDisconnect(message);
            break;

        case 'error':
            console.error('Received error:', message.message);
            alert(message.message);
            break;

        default:
            console.log('Unknown message type:', message.type);
    }
}

function updatePlayersList(players) {
    console.log('Updating players list:', players);
    const playersList = document.getElementById('players');
    if (!playersList) {
        console.error('Players list element not found!');
        return;
    }
    if (!Array.isArray(players)) {
        console.error('Invalid players data received:', players);
        return;
    }
    const playerElements = players
        .map(player => {
            const name = player.name || 'Unknown';
            const score = typeof player.score === 'number' ? player.score : 0;
            return `<li class="player-item">${name} - Score: ${score}</li>`;
        })
        .join('');
    playersList.innerHTML = playerElements;
    console.log('Players list updated with:', playerElements);
}

function displayQuestion(message) {
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    
    questionText.textContent = message.question;
    optionsContainer.innerHTML = '';
    
    message.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'option';
        button.textContent = option;
        button.onclick = () => submitAnswer(index);
        optionsContainer.appendChild(button);
    });
    
    document.getElementById('current-level').textContent = message.level;
    document.getElementById('next-question').classList.add('hidden');
}

function submitAnswer(answerIndex) {
    ws.send(JSON.stringify({
        type: 'answer',
        job_title: jobTitle,
        answer_idx: answerIndex
    }));
    
    // Mark selected answer and disable all options
    const options = document.querySelectorAll('.option');
    options.forEach((option, index) => {
        option.style.pointerEvents = 'none';
        if (index === answerIndex) {
            option.classList.add('selected');
        }
    });
}

function handleAnswerResult(message) {
    const options = document.querySelectorAll('.option');
    const nextQuestionBtn = document.getElementById('next-question');
    
    // Show correct answer
    options[message.correct_answer].classList.add('correct');
    
    // If user's answer was wrong, show it in red
    if (!message.correct) {
        options.forEach((option, index) => {
            if (option.classList.contains('selected')) {
                option.classList.add('incorrect');
            }
        });
    }
    
    // Update score
    document.getElementById('current-score').textContent = message.score;
    
    // Show next question button
    nextQuestionBtn.classList.remove('hidden');
    
    if (!message.correct) {
        options[message.selected_answer].classList.add('incorrect');
    }
    
    document.getElementById('current-score').textContent = message.score;
    document.getElementById('next-question').classList.remove('hidden');
    currentQuestionIndex++;
}

function handleLevelComplete(message) {
    alert(`Congratulations! You've completed level ${message.level}! Your score: ${message.score}`);
    currentQuestionIndex = 0;
    requestQuestion();
}

function handlePlayerDisconnect(message) {
    console.log(`Player ${message.client_id} disconnected`);
}

function requestQuestion() {
    ws.send(JSON.stringify({
        type: 'get_question',
        job_title: jobTitle
    }));
    document.getElementById('next-question').classList.add('hidden');
}

function handleRoomCreated(message) {
    console.log('handleRoomCreated called with:', message);
    roomCode = message.room_code;
    
    // Hide welcome screen and show waiting screen
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('waiting-screen').classList.remove('hidden');
    
    // Display room code
    document.getElementById('waiting-room-code').textContent = roomCode;
    console.log('Room code displayed:', roomCode);
}

function updateWaitingScreen(players) {
    const waitingList = document.getElementById('waiting-players-list');
    const startButton = document.getElementById('start-game-btn');
    
    // Update players list
    waitingList.innerHTML = players
        .map(player => `<li>${player.name}</li>`)
        .join('');
    
    // Enable/disable start button based on player count
    if (players.length >= 2) {
        startButton.textContent = 'Start Game';
        startButton.classList.remove('disabled');
        startButton.disabled = false;
        startButton.onclick = startGame;
    } else {
        startButton.textContent = 'Waiting for players...';
        startButton.classList.add('disabled');
        startButton.disabled = true;
        startButton.onclick = null;
    }
}

function startGame() {
    document.getElementById('waiting-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    requestQuestion();
}
