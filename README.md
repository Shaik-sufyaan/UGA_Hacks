# UGA Hacks

A multiplayer quiz game where questions are based on job titles and difficulty increases with each level.

## Team Members
Kamrul Tarafder, Shaik Sufyaan, and Mubashar Mian

## Purpose

Our purpose is to create a multiplayer quiz game where players can compete against each other in real-time. The game will feature job-specific questions that increase in difficulty as the game progresses. 

## Tools utilized

- FastAPI for web development
- Redis for storing game data
- WebSockets for real-time communication
- Next.js for user interface and user experience

## Problem team ran into

We ran into a few problems while developing the game. The main issue was with the WebSocket connections. None of us had ever worked with WebSocket before, so we struggled sometimes with proper client server communication. 

## Frameworks & APIs

- FastAPI for web development
- Redis for storing game data
- WebSockets for real-time communication
- Next.js for user interface and user experience
- Pinata for storing images

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