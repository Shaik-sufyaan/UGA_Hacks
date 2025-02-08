from fastapi import FastAPI, WebSocket, WebSocketDisconnect, APIRouter
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from typing import Dict, List, Set, Optional
import json
import random
import asyncio

app = FastAPI()
router = APIRouter()

# Mount the static files directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# Store active connections and game states
class ConnectionManager:
    def __init__(self):
        self.active_connections = {}
        self.game_rooms = {}
        self.player_scores = {}
        self.player_levels = {}
        self.player_questions = {}
        self.player_names = {}
        self.room_players = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.player_scores[client_id] = 0
        self.player_levels[client_id] = 1

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            # Remove from rooms
            for room_id, players in self.room_players.items():
                if client_id in players:
                    players.remove(client_id)
                    # Notify other players about disconnection
                    asyncio.create_task(self.broadcast_room_update(room_id))
            
            # Clean up player data
            del self.active_connections[client_id]
            del self.player_scores[client_id]
            del self.player_levels[client_id]
            if client_id in self.player_names:
                del self.player_names[client_id]

    async def broadcast(self, message: str, room_id: str):
        if room_id in self.room_players:
            for client_id in self.room_players[room_id]:
                if client_id in self.active_connections:
                    await self.active_connections[client_id].send_text(message)

    async def broadcast_room_update(self, room_id: str):
        if room_id in self.room_players:
            # Get all active players in the room
            active_players = [client_id for client_id in self.room_players[room_id] if client_id in self.active_connections]
            
            # Create player info list with proper error handling
            player_info = []
            for client_id in active_players:
                try:
                    player_info.append({
                        "id": client_id,
                        "name": self.player_names.get(client_id, "Unknown Player"),
                        "score": self.player_scores.get(client_id, 0)
                    })
                except Exception as e:
                    print(f"Error creating player info for {client_id}: {str(e)}")
            
            # Send the update to all players in the room
            try:
                message = json.dumps({
                    "type": "room_update",
                    "players": player_info
                })
                print(f"Broadcasting room update: {message}")
                await self.broadcast(message, room_id)
            except Exception as e:
                print(f"Error broadcasting room update: {str(e)}")

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
    return JSONResponse(content={"message": "Career Quiz Game Server"})

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message["type"] == "join_room":
                # Validate required fields for join_room
                if "username" not in message or "room" not in message:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Missing username or room in join request"
                    })
                    continue
                
                room_id = message["room"]
                username = message["username"]

                # Store player info
                manager.player_names[client_id] = username
                    
                if room_id not in manager.room_players:
                    manager.room_players[room_id] = set()
                    
                manager.room_players[room_id].add(client_id)
                
                await manager.broadcast_room_update(room_id)

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
                            "level": level
                        })
            
            elif message["type"] == "answer":
                job_title = message["job_title"]
                answer_idx = message["answer_idx"]
                level = manager.player_levels[client_id]
                
                if client_id in manager.player_questions and manager.player_questions[client_id]:
                    current_question = manager.player_questions[client_id][-1]
                    is_correct = answer_idx == current_question["correct"]
                    
                    if is_correct:
                        manager.player_scores[client_id] += 10
                    
                    await websocket.send_json({
                        "type": "answer_result",
                        "correct": is_correct,
                        "correct_answer": current_question["correct"],
                        "score": manager.player_scores[client_id]
                    })
                    
                    # Broadcast updated scores to all players in the room
                    for room_id, players in manager.room_players.items():
                        if client_id in players:
                            await manager.broadcast_room_update(room_id)
                            break

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
