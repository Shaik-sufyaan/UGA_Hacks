"use client"

import type React from "react"
import { useRef, useEffect } from "react"

interface Particle {
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
}

interface SparklesCoreProps {
  id: string
  background: string
  minSize: number
  maxSize: number
  particleDensity: number
  className: string
  particleColor: string
}

export const SparklesCore: React.FC<SparklesCoreProps> = ({
  id,
  background,
  minSize,
  maxSize,
  particleDensity,
  className,
  particleColor,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    let particles: Particle[] = []

    const createParticles = () => {
      const particleCount = Math.floor((canvas.width * canvas.height) / 10000) * particleDensity
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * (maxSize - minSize) + minSize,
          speedX: Math.random() * 0.5 - 0.25,
          speedY: Math.random() * 0.5 - 0.25,
        })
      }
    }

    const animateParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach((particle) => {
        particle.x += particle.speedX
        particle.y += particle.speedY

        if (particle.x > canvas.width) particle.x = 0
        else if (particle.x < 0) particle.x = canvas.width
        if (particle.y > canvas.height) particle.y = 0
        else if (particle.y < 0) particle.y = canvas.height

        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = particleColor
        ctx.fill()
      })
      requestAnimationFrame(animateParticles)
    }

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      particles = []
      createParticles()
    }

    createParticles()
    animateParticles()

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [minSize, maxSize, particleDensity, particleColor])

  return <canvas ref={canvasRef} id={id} className={className} style={{ background }} />
}

