"use client"

import { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { motion } from "framer-motion"
import { FloatingPaper } from "@/components/floating-paper"
import { SparklesCore } from "@/components/sparkles"
import Navbar from "@/components/navbar"

type Player = {
  name: string
  id: string
  ready: boolean
  isCreator: boolean
}

export default function GamePage() {
  const [username, setUsername] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [gameState, setGameState] = useState<'setup' | 'waiting' | 'playing'>('setup')
  const [error, setError] = useState('')
  const [isReady, setIsReady] = useState(false)
  const [clientId, setClientId] = useState('')

  useEffect(() => {
    // Generate a client ID when component mounts
    const newClientId = Math.random().toString(36).substr(2, 9)
    setClientId(newClientId)
  }, [])

  const connectWebSocket = useCallback((cId: string) => {
    const wsUrl = `ws://localhost:8000/ws/${cId}`
    const websocket = new WebSocket(wsUrl)

    websocket.onopen = () => {
      console.log('Connected to server')
      setWs(websocket)
    }

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data)
      console.log('Received message:', message)

      switch (message.type) {
        case 'room_created':
          setRoomCode(message.room_code)
          setGameState('waiting')
          break

        case 'room_joined':
          setRoomCode(message.room_code)
          setGameState('waiting')
          setPlayers(message.players || [])
          break

        case 'room_update':
          console.log('Room update received:', message.players)
          setPlayers(message.players)
          // Update local ready state based on server state
          const currentPlayer = message.players.find((p: Player) => p.id === cId)
          if (currentPlayer) {
            setIsReady(currentPlayer.ready)
          }
          break

        case 'ready_state_updated':
          console.log('Ready state updated:', message.ready)
          setIsReady(message.ready)
          break

        case 'game_started':
          console.log('Game started!')
          setGameState('playing')
          break

        case 'error':
          setError(message.message)
          break
      }
    }

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error)
      setError('Connection error')
    }

    websocket.onclose = () => {
      console.log('Disconnected from server')
      setWs(null)
      // Attempt to reconnect after a delay
      setTimeout(() => {
        if (gameState !== 'setup') {
          console.log('Attempting to reconnect...')
          connectWebSocket(cId)
        }
      }, 3000)
    }

    return websocket
  }, [gameState])

  // Connect to WebSocket when client ID is available
  useEffect(() => {
    if (clientId && !ws) {
      connectWebSocket(clientId)
    }
  }, [clientId, ws, connectWebSocket])

  // Get current player from players list using clientId
  const currentPlayer = players.find(p => p.id === clientId)
  
  // Check if current player is the creator
  const isCreator = currentPlayer?.isCreator || false

  // Check if all non-creator players are ready
  const allPlayersReady = players.length > 1 && players
    .filter(p => !p.isCreator)
    .every(p => p.ready)

  const toggleReady = useCallback(() => {
    if (ws && ws.readyState === WebSocket.OPEN && !isCreator) {
      console.log('Toggling ready state')
      ws.send(JSON.stringify({
        type: 'toggle_ready'
      }))
    }
  }, [ws, isCreator])

  const startGame = useCallback(() => {
    if (ws && ws.readyState === WebSocket.OPEN && isCreator && allPlayersReady) {
      console.log('Starting game')
      ws.send(JSON.stringify({
        type: 'start_game'
      }))
    }
  }, [ws, isCreator, allPlayersReady])

  const createRoom = () => {
    if (!username) {
      setError('Please enter a username')
      return
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'create_room',
        username
      }))
    }
  }

  const joinRoom = () => {
    if (!username || !roomCode) {
      setError('Please enter both username and room code')
      return
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'join_room',
        username,
        room: roomCode
      }))
    }
  }

  return (
    <main className="min-h-screen bg-black/[0.96] antialiased bg-grid-white/[0.02] relative overflow-hidden">
      {/* Ambient background with moving particles */}
      <div className="absolute inset-0 z-0">
        <SparklesCore
          id="tsparticlesfullpage"
          background="transparent"
          minSize={0.6}
          maxSize={1.4}
          particleDensity={100}
          className="w-full h-full"
          particleColor="rgba(255, 255, 255, 0.3)"
        />
      </div>

      <div className="relative z-10">
        <Navbar />
        
        <div className="relative min-h-[calc(100vh-76px)] flex items-center">
          {/* Floating papers background */}
          <div className="absolute inset-0 overflow-hidden">
            <FloatingPaper count={6} />
          </div>

          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-md mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-8 rounded-lg shadow-xl border border-border"
              >
                {gameState === 'setup' ? (
                  <>
                    <h2 className="text-3xl font-bold mb-6 text-center">
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                        Join the Game
                      </span>
                    </h2>

                    {error && (
                      <div className="mb-4 p-3 bg-destructive/15 text-destructive rounded-md text-sm">
                        {error}
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <Input
                          placeholder="Enter your username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={createRoom}
                          size="lg"
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        >
                          Create New Room
                        </Button>

                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Or</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter room code"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                            className="flex-1"
                          />
                          <Button
                            onClick={joinRoom}
                            variant="outline"
                          >
                            Join Room
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-3xl font-bold mb-6 text-center">
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                        Waiting for Players
                      </span>
                    </h2>

                    <div className="text-center mb-8">
                      <p className="text-muted-foreground mb-2">Share this code with another player:</p>
                      <div className="text-3xl font-mono font-bold tracking-wider bg-muted/30 py-3 rounded-md">
                        {roomCode}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-muted/30 p-4 rounded-md">
                        <h3 className="text-sm font-medium mb-2">Players in Room:</h3>
                        <ul className="space-y-2">
                          {players.map((player) => (
                            <li
                              key={player.id}
                              className="bg-background/50 p-2 rounded flex items-center justify-between"
                            >
                              <span className="flex items-center gap-2">
                                {player.name}
                                {player.id === clientId && (
                                  <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                                    You
                                  </span>
                                )}
                                {player.isCreator && (
                                  <span className="text-xs bg-blue-500/20 text-blue-500 px-2 py-1 rounded">
                                    Host
                                  </span>
                                )}
                              </span>
                              <div className="flex items-center gap-2">
                                {!player.isCreator && (
                                  player.ready ? (
                                    <span className="text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded">
                                      Ready
                                    </span>
                                  ) : (
                                    <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded">
                                      Not Ready
                                    </span>
                                  )
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {isCreator ? (
                        <Button
                          onClick={startGame}
                          disabled={!allPlayersReady || players.length < 2}
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {players.length < 2 
                            ? 'Waiting for players to join...' 
                            : !allPlayersReady 
                              ? 'Waiting for players to be ready...' 
                              : 'Start Game'}
                        </Button>
                      ) : (
                        !isCreator && (
                          <Button
                            onClick={toggleReady}
                            className={`w-full ${
                              isReady
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                            }`}
                          >
                            {isReady ? 'Ready!' : 'Click when ready'}
                          </Button>
                        )
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}