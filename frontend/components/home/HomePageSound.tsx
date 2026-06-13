"use client";

import { useEffect } from "react";

import { useSound } from "@/hooks/useSound";

export function HomePageSound() {
  const { playHomePage, prepareHomePageSound } = useSound();

  useEffect(() => {
    let isCancelled = false;

    prepareHomePageSound().then(() => {
      if (!isCancelled) {
        playHomePage();
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [playHomePage, prepareHomePageSound]);

  return null;
}
