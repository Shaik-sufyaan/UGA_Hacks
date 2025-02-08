let ws;
let username;
let jobTitle;
let roomCode;
let currentQuestionIndex = 0;

function generateClientId() {
    return Math.random().toString(36).substr(2, 9);
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
            room: roomCode
        }));
        
        document.getElementById('welcome-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        
        requestQuestion();
    };

    ws.onmessage = handleMessage;
    ws.onclose = () => console.log('Disconnected from server');
}

function handleMessage(event) {
    const message = JSON.parse(event.data);
    
    switch (message.type) {
        case 'room_update':
            updatePlayersList(message.players);
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
    }
}

function updatePlayersList(players) {
    const playersList = document.getElementById('players');
    playersList.innerHTML = players
        .map(player => `<li>${player}</li>`)
        .join('');
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
        question_idx: currentQuestionIndex,
        answer_idx: answerIndex
    }));
    
    // Disable all options after answering
    const options = document.querySelectorAll('.option');
    options.forEach(option => option.style.pointerEvents = 'none');
}

function handleAnswerResult(message) {
    const options = document.querySelectorAll('.option');
    options[message.correct_answer].classList.add('correct');
    
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
