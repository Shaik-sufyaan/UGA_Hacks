"use client"

import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import type React from "react"
import { useEffect } from 'react'
import { useUser } from '@auth0/nextjs-auth0/client'

export default function Navbar() {
  const { user, isLoading } = useUser()

  useEffect(() => {
    // Redirect to finance app if user is authenticated
    if (user) {
      window.location.href = 'https://finance-anal-app-7b869ffc19b6.herokuapp.com/static/index.html'
    }
  }, [user])

  const handleGetStarted = () => {
    // Redirect to Auth0 signup page
    window.location.href = '/api/auth/login?screen_hint=signup'
  }

  const handleSignIn = () => {
    // Redirect to Auth0 login page
    window.location.href = '/api/auth/login'
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="flex items-center justify-between px-6 py-4 backdrop-blur-sm border-b border-white/10"
    >
      <Link href="/" className="flex items-center space-x-2">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/cat-removebg-preview-AUVrfevnO3MDTy3Wo9KMbWMcgpHZQR.png"
          alt="Broke to Woke Logo"
          width={32}
          height={32}
        />
        <span className="font-medium text-xl bg-gradient-to-r from-yellow-300 via-white to-yellow-300 text-transparent bg-clip-text">
          Broke to Woke
        </span>
      </Link>

      <div className="hidden md:flex items-center space-x-8">
        <NavLink href="/how-it-works">How it Works</NavLink>
        <NavLink href="/examples">Examples</NavLink>
      </div>

      <div className="hidden md:flex items-center space-x-4">
        {!user ? (
          <>
            <Button variant="ghost" className="text-white hover:text-purple-400" onClick={handleSignIn}>
              Sign In
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={handleGetStarted}>
              Get Started
            </Button>
          </>
        ) : (
          <Button variant="ghost" className="text-white hover:text-purple-400" onClick={() => window.location.href = '/api/auth/logout'}>
            Sign Out
          </Button>
        )}
      </div>

      <Button variant="ghost" size="icon" className="md:hidden text-white">
        <Menu className="w-6 h-6" />
      </Button>
    </motion.nav>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-gray-300 hover:text-white transition-colors relative group">
      {children}
      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-purple-500 transition-all group-hover:w-full" />
    </Link>
  )
}
