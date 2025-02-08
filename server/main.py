from fastapi import FastAPI, WebSocket, WebSocketDisconnect, APIRouter
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from typing import Dict, List, Set, Optional
import json
import random
import asyncio
import string

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
        self.room_codes = set()
        self.player_ready_states = {}  # Track ready states
        self.active_games = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.player_scores[client_id] = 0
        self.player_levels[client_id] = 1

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            # Remove from rooms and clean up empty rooms
            rooms_to_remove = []
            for room_id, players in self.room_players.items():
                if client_id in players:
                    players.remove(client_id)
                    if client_id in self.player_ready_states:
                        del self.player_ready_states[client_id]  # Clean up ready state
                    # If room is empty, mark it for removal
                    if not players:
                        rooms_to_remove.append(room_id)
                    else:
                        # Notify other players about disconnection
                        asyncio.create_task(self.broadcast_room_update(room_id))
            
            # Remove empty rooms and their codes
            for room_id in rooms_to_remove:
                del self.room_players[room_id]
                self.room_codes.remove(room_id)
            
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
            try:
                # Get all active players in the room
                active_players = [client_id for client_id in self.room_players[room_id] if client_id in self.active_connections]
                
                # Get the room creator (first player)
                room_creator = list(self.room_players[room_id])[0] if self.room_players[room_id] else None
                
                # Create player info list
                player_info = []
                for client_id in active_players:
                    is_creator = client_id == room_creator
                    ready_state = self.player_ready_states.get(client_id, False)
                    print(f"Player {client_id} - Creator: {is_creator}, Ready: {ready_state}")
                    player_info.append({
                        "id": client_id,
                        "name": self.player_names.get(client_id, "Unknown Player"),
                        "score": self.player_scores.get(client_id, 0),
                        "ready": ready_state,
                        "isCreator": is_creator
                    })
                
                # Send update to all players
                message = json.dumps({
                    "type": "room_update",
                    "players": player_info
                })
                print(f"Broadcasting room update: {message}")
                await self.broadcast(message, room_id)
            except Exception as e:
                print(f"Error in broadcast_room_update: {str(e)}")

    def start_game(self, room_id: str):
        """Initialize a new game session"""
        if room_id not in self.room_players:
            return None

        players = list(self.room_players[room_id])
        if len(players) < 2:
            return None

        # Reset scores and levels for all players
        for player_id in players:
            self.player_scores[player_id] = 0
            self.player_levels[player_id] = 1

        # Initialize game state
        game_state = {
            'status': 'active',
            'current_round': 1,
            'players': [
                {
                    'id': player_id,
                    'name': self.player_names[player_id],
                    'score': self.player_scores[player_id],
                    'level': self.player_levels[player_id]
                }
                for player_id in players
            ],
            'current_question': self.get_next_question(players[0])  # Start with first player
        }

        self.active_games[room_id] = game_state
        return game_state

    def get_next_question(self, player_id: str):
        """Get the next question for a player"""
        level = self.player_levels.get(player_id, 1)
        job_titles = list(QUESTIONS.keys())
        
        if job_titles:
            job_title = job_titles[0]  # For now, use the first job title
            if job_title in QUESTIONS and level in QUESTIONS[job_title]:
                questions = QUESTIONS[job_title][level]
                if questions:
                    # Pick a random question
                    question = random.choice(questions)
                    return {
                        'question': question['question'],
                        'options': question['options'],
                        'correct': question['correct'],
                        'level': level
                    }
        return None

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

            if message["type"] == "create_room":
                if "username" not in message:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Missing username in create room request"
                    })
                    continue
                
                # Generate a unique room code
                while True:
                    room_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
                    if room_code not in manager.room_codes:
                        break
                
                manager.room_codes.add(room_code)
                manager.room_players[room_code] = set([client_id])
                manager.player_names[client_id] = message["username"]
                
                await websocket.send_json({
                    "type": "room_created",
                    "room_code": room_code
                })
                
                await manager.broadcast_room_update(room_code)
                
            elif message["type"] == "join_room":
                # Validate required fields for join_room
                if "username" not in message or "room" not in message:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Missing username or room in join request"
                    })
                    continue
                
                room_id = message["room"]
                username = message["username"]
                
                # Check if room exists
                if room_id not in manager.room_players:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Room does not exist"
                    })
                    continue
                
                # Check room capacity
                if len(manager.room_players[room_id]) >= 2:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Room is full"
                    })
                    continue

                # Store player info
                manager.player_names[client_id] = username
                manager.room_players[room_id].add(client_id)
                
                # Send room joined confirmation to the joining player
                player_info = [
                    {
                        "id": player_id,
                        "name": manager.player_names.get(player_id, "Unknown Player"),
                        "score": manager.player_scores.get(player_id, 0)
                    }
                    for player_id in manager.room_players[room_id]
                ]
                
                await websocket.send_json({
                    "type": "room_joined",
                    "room_code": room_id,
                    "players": player_info
                })
                
                # Broadcast room update to all players
                await manager.broadcast_room_update(room_id)

            elif message["type"] == "toggle_ready":
                try:
                    room_id = None
                    # Find the room this player is in
                    for rid, players in manager.room_players.items():
                        if client_id in players:
                            room_id = rid
                            break
                    
                    if room_id:
                        room_creator = list(manager.room_players[room_id])[0]
                        # Only allow non-creator players to toggle ready state
                        if client_id != room_creator:
                            current_state = manager.player_ready_states.get(client_id, False)
                            manager.player_ready_states[client_id] = not current_state
                            print(f"Player {client_id} toggled ready state to: {manager.player_ready_states[client_id]}")
                            
                            # Send immediate confirmation to the player
                            await websocket.send_json({
                                "type": "ready_state_updated",
                                "ready": manager.player_ready_states[client_id]
                            })
                            
                            # Then broadcast to all players
                            await manager.broadcast_room_update(room_id)
                except Exception as e:
                    print(f"Error in toggle_ready: {str(e)}")
                    await websocket.send_json({
                        "type": "error",
                        "message": "Failed to update ready state"
                    })
                    
            elif message["type"] == "start_game":
                try:
                    room_id = None
                    # Find the room this player is in
                    for rid, players in manager.room_players.items():
                        if client_id in players:
                            room_id = rid
                            break
                    
                    if room_id:
                        room_creator = list(manager.room_players[room_id])[0]
                        if client_id == room_creator:
                            # Check if all players are ready
                            non_creator_players = [pid for pid in manager.room_players[room_id] if pid != room_creator]
                            all_ready = all(manager.player_ready_states.get(pid, False) for pid in non_creator_players)
                            
                            if all_ready and len(manager.room_players[room_id]) > 1:
                                # Initialize game state
                                game_state = manager.start_game(room_id)
                                if game_state:
                                    print(f"Starting game in room {room_id}")
                                    # Notify all players
                                    await manager.broadcast(json.dumps({
                                        "type": "game_started",
                                        "game_state": game_state
                                    }), room_id)
                                else:
                                    await websocket.send_json({
                                        "type": "error",
                                        "message": "Failed to initialize game state"
                                    })
                            else:
                                await websocket.send_json({
                                    "type": "error",
                                    "message": "Cannot start game: waiting for players to be ready"
                                })
                except Exception as e:
                    print(f"Error in start_game: {str(e)}")
                    await websocket.send_json({
                        "type": "error",
                        "message": "Failed to start game"
                    })

            elif message["type"] == "submit_answer":
                try:
                    room_id = None
                    for rid, players in manager.room_players.items():
                        if client_id in players:
                            room_id = rid
                            break

                    if room_id and room_id in manager.active_games:
                        game_state = manager.active_games[room_id]
                        current_question = game_state['current_question']
                        
                        if current_question and 'answer_index' in message:
                            is_correct = message['answer_index'] == current_question['correct']
                            
                            # Update score
                            if is_correct:
                                manager.player_scores[client_id] += current_question['level'] * 10
                            
                            # Get next question
                            next_question = manager.get_next_question(client_id)
                            
                            # Update game state
                            game_state['current_question'] = next_question
                            game_state['players'] = [
                                {
                                    'id': pid,
                                    'name': manager.player_names[pid],
                                    'score': manager.player_scores[pid],
                                    'level': manager.player_levels[pid]
                                }
                                for pid in manager.room_players[room_id]
                            ]
                            
                            # Broadcast updated game state
                            await manager.broadcast(json.dumps({
                                "type": "game_state_update",
                                "game_state": game_state,
                                "answer_result": {
                                    "correct": is_correct,
                                    "player_id": client_id
                                }
                            }), room_id)
                except Exception as e:
                    print(f"Error processing answer: {str(e)}")
                    await websocket.send_json({
                        "type": "error",
                        "message": "Failed to process answer"
                    })

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
