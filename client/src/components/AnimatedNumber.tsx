import { animate, useMotionValue, useTransform, motion } from 'motion/react'
import { useEffect } from 'react'

interface Props {
  value: number
  format: (value: number) => string
  className?: string
}

export function AnimatedNumber({ value, format, className }: Props) {
  const motionValue = useMotionValue(value)
  const text = useTransform(motionValue, format)

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 0.6, ease: [0.22, 1, 0.36, 1] })
    return () => controls.stop()
  }, [motionValue, value])

  return <motion.span className={className}>{text}</motion.span>
}
