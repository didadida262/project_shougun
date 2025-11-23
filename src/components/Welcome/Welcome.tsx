import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

function Welcome() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={cn(
          'w-full max-w-2xl rounded-2xl bg-white/10 p-8',
          'backdrop-blur-lg shadow-2xl',
          'border border-white/20'
        )}
      >
        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-6 text-center text-5xl font-bold text-white"
        >
          Welcome to react-template!
        </motion.h1>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="space-y-4 text-center text-white/90"
        >
          <p className="text-xl">
            这是一个使用 React + TypeScript + Tailwind CSS + Aceternity UI 构建的现代化项目模板
          </p>
          <p className="text-lg">
            开始编辑 <code className="rounded bg-white/20 px-2 py-1 font-mono text-sm">src/App.tsx</code> 来开始你的项目
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-8 flex flex-wrap justify-center gap-4"
        >
          <div className="rounded-lg bg-white/20 px-4 py-2 text-sm text-white">
            ⚡️ Vite
          </div>
          <div className="rounded-lg bg-white/20 px-4 py-2 text-sm text-white">
            ⚛️ React 18
          </div>
          <div className="rounded-lg bg-white/20 px-4 py-2 text-sm text-white">
            📘 TypeScript
          </div>
          <div className="rounded-lg bg-white/20 px-4 py-2 text-sm text-white">
            🎨 Tailwind CSS
          </div>
          <div className="rounded-lg bg-white/20 px-4 py-2 text-sm text-white">
            ✨ Framer Motion
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default Welcome

