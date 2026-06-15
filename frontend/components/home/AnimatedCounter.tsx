"use client";

import { animate, useInView } from "framer-motion";
import { useEffect, useRef } from "react";

export function AnimatedCounter({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const isInView = useInView(nodeRef, { once: true, margin: "-50px" });

  useEffect(() => {
    const node = nodeRef.current;
    if (!node || !isInView) return;

    const controls = animate(0, value, {
      duration: 2,
      ease: "easeOut",
      onUpdate(v) {
        node.textContent = `${prefix}${new Intl.NumberFormat("vi-VN").format(Math.round(v))}${suffix}`;
      },
    });

    return () => controls.stop();
  }, [value, isInView, prefix, suffix]);

  return <span ref={nodeRef}>0</span>;
}
