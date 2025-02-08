from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from typing import Dict, List, Set
import json
import random

app = FastAPI()

# Mount the static files directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# Store active connections and game states
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.game_rooms: Dict[str, Set[str]] = {}
        self.player_scores: Dict[str, int] = {}
        self.player_levels: Dict[str, int] = {}
        self.player_questions: Dict[str, List] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.player_scores[client_id] = 0
        self.player_levels[client_id] = 1

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            del self.player_scores[client_id]
            del self.player_levels[client_id]

    async def broadcast(self, message: str, room: str):
        if room in self.game_rooms:
            for client_id in self.game_rooms[room]:
                if client_id in self.active_connections:
                    await self.active_connections[client_id].send_text(message)

manager = ConnectionManager()

# Sample questions database (you can expand this)
QUESTIONS = {
    "software_engineer": {
        1: [  # Level 1
            {"question": "What does HTML stand for?", "options": ["Hyper Text Markup Language", "High Tech Modern Language", "Hybrid Text Making Language", "Home Tool Markup Language"], "correct": 0},
            {"question": "Which data structure uses LIFO?", "options": ["Queue", "Stack", "Array", "Tree"], "correct": 1},
            {"question": "What is the time complexity of binary search?", "options": ["O(n)", "O(n²)", "O(log n)", "O(1)"], "correct": 2},
            {"question": "What is a variable?", "options": ["A container for data", "A programming language", "A computer", "A website"], "correct": 0}
        ],
        2: [  # Level 2
            {"question": "What is a closure in programming?", "options": ["A function with access to its outer scope", "A closed program", "A type of loop", "A database connection"], "correct": 0},
            {"question": "What is the difference between == and === in JavaScript?", "options": ["No difference", "=== checks type and value", "== is faster", "=== is deprecated"], "correct": 1},
            {"question": "What is a RESTful API?", "options": ["A sleeping API", "An architectural style for APIs", "A testing framework", "A database"], "correct": 1},
            {"question": "What is dependency injection?", "options": ["A design pattern for handling dependencies", "A type of medication", "A database query", "A testing framework"], "correct": 0}
        ]
    },
    "data_scientist": {
        1: [  # Similar structure for data scientist questions
            {"question": "What is pandas in Python?", "options": ["A data manipulation library", "An animal", "A game", "A database"], "correct": 0},
            {"question": "What does SQL stand for?", "options": ["Some Query Language", "Structured Query Language", "Simple Query Language", "System Query Language"], "correct": 1},
            {"question": "What is a dataset?", "options": ["A collection of data", "A computer program", "A type of chart", "A database server"], "correct": 0},
            {"question": "What is correlation?", "options": ["Causation", "Statistical relationship between variables", "A programming language", "A type of graph"], "correct": 1}
        ]
    }
}

@app.get("/")
async def get():
    return {"message": "Career Quiz Game Server"}

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "join_room":
                room = message["room"]
                if room not in manager.game_rooms:
                    manager.game_rooms[room] = set()
                manager.game_rooms[room].add(client_id)
                await manager.broadcast(json.dumps({
                    "type": "room_update",
                    "players": list(manager.game_rooms[room])
                }), room)

            elif message["type"] == "get_question":
                job_title = message["job_title"]
                level = manager.player_levels[client_id]
                if job_title in QUESTIONS and level in QUESTIONS[job_title]:
                    questions = QUESTIONS[job_title][level]
                    if client_id not in manager.player_questions:
                        manager.player_questions[client_id] = []
                    
                    available_questions = [q for q in questions if q not in manager.player_questions[client_id]]
                    if available_questions:
                        question = random.choice(available_questions)
                        manager.player_questions[client_id].append(question)
                        await websocket.send_json({
                            "type": "question",
                            "question": question["question"],
                            "options": question["options"],
                            "level": level
                        })
                    else:
                        # Level completed
                        manager.player_levels[client_id] += 1
                        manager.player_questions[client_id] = []
                        await websocket.send_json({
                            "type": "level_complete",
                            "level": level,
                            "score": manager.player_scores[client_id]
                        })

            elif message["type"] == "answer":
                job_title = message["job_title"]
                level = manager.player_levels[client_id]
                question_idx = message["question_idx"]
                answer_idx = message["answer_idx"]
                
                if job_title in QUESTIONS and level in QUESTIONS[job_title]:
                    question = QUESTIONS[job_title][level][question_idx]
                    is_correct = question["correct"] == answer_idx
                    if is_correct:
                        manager.player_scores[client_id] += level * 10
                    
                    await websocket.send_json({
                        "type": "answer_result",
                        "correct": is_correct,
                        "score": manager.player_scores[client_id]
                    })

    except WebSocketDisconnect:
        manager.disconnect(client_id)
        for room in manager.game_rooms.values():
            if client_id in room:
                room.remove(client_id)
                await manager.broadcast(json.dumps({
                    "type": "player_disconnect",
                    "client_id": client_id
                }), room)
