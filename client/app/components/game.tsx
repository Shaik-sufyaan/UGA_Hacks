"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { DollarSign, TrendingUp, CircleDollarSign, LineChart } from "lucide-react"

export default function FinancialGame() {
  const [timeLeft, setTimeLeft] = useState(15)

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [timeLeft])

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 flex flex-col items-center justify-center">
      {/* Header */}
      <div className="w-full max-w-3xl mb-8">
        <h1 className="text-2xl text-center mb-2">
          Complete the financial terms for <span className="text-emerald-400">Round</span> 
        </h1>
      </div>

      {/* Timer */}
      <div className="text-center mb-8">
        <div className="text-6xl font-bold mb-2 bg-gradient-to-r from-emerald-400 to-blue-400 text-transparent bg-clip-text drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]">
          {timeLeft} seconds
        </div>
        <div className="text-slate-400 text-xl">until next round</div>
      </div>

      {/* Progress Icons */}
      <div className="w-full max-w-2xl mb-8 relative">
        <div className="h-2 bg-slate-800 rounded-full"></div>
        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full flex justify-between">
          {[<DollarSign key="1" />, <TrendingUp key="2" />, <CircleDollarSign key="3" />, <LineChart key="4" />].map(
            (icon, i) => (
              <div key={i} className="transform -translate-y-1/2">
                <div className={`w-8 h-8 ${i === 0 ? "text-emerald-400" : "text-slate-600"}`}>{icon}</div>
              </div>
            ),
          )}
        </div>
      </div>

      {/* Financial Terms Box */}
      <div className="w-full max-w-2xl bg-slate-800/50 backdrop-blur-sm p-8 rounded-xl border border-slate-700 shadow-lg">
        <div className="space-y-4 text-2xl text-slate-300">
          <div className="flex items-center gap-2">
            Smart investors track their <Input className="w-40 inline-block bg-slate-700 border-slate-600" />,
          </div>
          <div className="flex items-center gap-2">
            While markets rise and <Input className="w-40 inline-block bg-slate-700 border-slate-600" /> each day.
          </div>
          <div className="flex items-center gap-2">
            Through <Input className="w-40 inline-block bg-slate-700 border-slate-600" /> and bonds they wisely grow,
          </div>
          <div>Their wealth compounds along the way!</div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="fixed top-0 right-0 p-8 text-slate-800/20">
        <TrendingUp className="w-32 h-32" />
      </div>
      <div className="fixed bottom-0 left-0 p-8 text-slate-800/20">
        <DollarSign className="w-32 h-32" />
      </div>
    </div>
  )
}

