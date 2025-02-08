# Career Quiz Game

A multiplayer quiz game where questions are based on job titles and difficulty increases with each level.

## Features

- Multiplayer support using WebSockets
- Job-specific questions
- Increasing difficulty levels
- Real-time score tracking
- Room-based gameplay

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the server:
   ```bash
   uvicorn main:app --reload
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:8000/static/index.html
   ```

## How to Play

1. Enter your username
2. Select your job title
3. Enter a room code (create a new one or join an existing room)
4. Answer questions correctly to progress through levels
5. Compete with other players in real-time

## Game Rules

- Each level has 4 questions
- Questions get progressively harder
- Score points based on correct answers
- Must complete all questions in a level to progress