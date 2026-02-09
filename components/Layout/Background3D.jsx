"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const Background3D = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-base-100">
      {/* Primary Gradient Mesh */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 opacity-60"></div>

      {/* Floating Orb 1 - Top Left */}
      <motion.div
        className="absolute -top-20 -left-20 w-[40rem] h-[40rem] rounded-full bg-purple-300/30 blur-3xl"
        animate={{
          x: mousePosition.x * 30,
          y: mousePosition.y * 30,
        }}
        transition={{ type: "spring", stiffness: 50, damping: 20 }}
      />

      {/* Floating Orb 2 - Bottom Right */}
      <motion.div
        className="absolute top-1/2 -right-20 w-[30rem] h-[30rem] rounded-full bg-blue-300/20 blur-3xl"
        animate={{
          x: mousePosition.x * -40,
          y: mousePosition.y * -40,
        }}
        transition={{ type: "spring", stiffness: 40, damping: 20 }}
      />

      {/* Floating Orb 3 - Center dynamic */}
      <motion.div
        className="absolute bottom-0 left-1/3 w-[25rem] h-[25rem] rounded-full bg-pink-300/20 blur-3xl"
        animate={{
          x: mousePosition.x * 20,
          y: mousePosition.y * 20,
          scale: [1, 1.1, 1],
        }}
        transition={{ 
            x: { type: "spring", stiffness: 30, damping: 20 },
            y: { type: "spring", stiffness: 30, damping: 20 },
            scale: { duration: 5, repeat: Infinity, repeatType: "reverse" }
        }}
      />
      
      {/* Grid Overlay for depth */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
            backgroundImage: `radial-gradient(#444 1px, transparent 1px)`,
            backgroundSize: "40px 40px"
        }}
      ></div>
    </div>
  );
};

export default Background3D;