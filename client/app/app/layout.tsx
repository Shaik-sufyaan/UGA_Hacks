import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import type React from "react"
import { UserProvider } from '@auth0/nextjs-auth0/client'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Broke to Woke - Financial Education Game",
  description: "Level up your financial knowledge through an interactive game designed for employees",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  )
}
