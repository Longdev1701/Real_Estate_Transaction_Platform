"use client";
import { useCallback, useRef, useEffect } from 'react';

export const useSound = () => {
  const sendAudioRef = useRef<HTMLAudioElement | null>(null);
  const receiveAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Khởi tạo audio khi component mount để trình duyệt tải trước file
    if (typeof window !== 'undefined') {
      sendAudioRef.current = new Audio('/sounds/apple_send.mp3');
      receiveAudioRef.current = new Audio('/sounds/apple_receive.mp3');
    }
  }, []);

  const playPop = useCallback(() => {
    if (sendAudioRef.current) {
      sendAudioRef.current.currentTime = 0; // Trở về đầu file
      sendAudioRef.current.play().catch((err) => {
        console.log("Chưa có file send.mp3 hoặc trình duyệt chặn autoplay:", err);
      });
    }
  }, []);

  const playDing = useCallback(() => {
    if (receiveAudioRef.current) {
      receiveAudioRef.current.currentTime = 0; // Trở về đầu file
      receiveAudioRef.current.play().catch((err) => {
        console.log("Chưa có file receive.mp3 hoặc trình duyệt chặn autoplay:", err);
      });
    }
  }, []);

  return { playPop, playDing };
};
