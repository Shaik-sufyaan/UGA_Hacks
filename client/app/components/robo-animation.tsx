"use client"

import { motion } from "framer-motion"

export function RoboAnimation() {
  return (
    <motion.div
      animate={{
        rotate: [0, 360, 0],
      }}
      transition={{
        duration: 5,
        repeat: Number.POSITIVE_INFINITY,
        ease: "linear",
      }}
      className="absolute bottom-0 right-0 w-96 h-96"
    >
      <img src="https://i.imgur.com/5o7k89L.gif" alt="Animated Robot" className="w-full h-full" />
    </motion.div>
  )
}

