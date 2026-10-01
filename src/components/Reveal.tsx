import { motion } from "motion/react";
import type { ReactNode } from "react";

/** Fades + slides children in once when they scroll into view. Wrap any card/section. */
export function Reveal({
  children, delay = 0, className = "",
}: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
