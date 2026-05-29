"use client";
import { useCallback, useRef, useEffect } from 'react';

export const useSound = () => {
  const sendAudioRef = useRef<HTMLAudioElement | null>(null);
  const receiveAudioRef = useRef<HTMLAudioElement | null>(null);
  const detailAudioRef = useRef<HTMLAudioElement | null>(null);
  const likeBeginAudioRef = useRef<HTMLAudioElement | null>(null);
  const likeEndAudioRef = useRef<HTMLAudioElement | null>(null);
  const commentAudioRef = useRef<HTMLAudioElement | null>(null);
  const saveAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Khởi tạo audio khi component mount để trình duyệt tải trước file
    if (typeof window !== 'undefined') {
      sendAudioRef.current = new Audio('/sounds/apple_send.mp3');
      receiveAudioRef.current = new Audio('/sounds/apple_receive.mp3');
      detailAudioRef.current = new Audio('/sounds/xem_chi_tiet.mp3');
      likeBeginAudioRef.current = new Audio('/sounds/like_begin.mp3');
      likeEndAudioRef.current = new Audio('/sounds/like_end.mp3');
      commentAudioRef.current = new Audio('/sounds/comment.mp3');
      saveAudioRef.current = new Audio('/sounds/save.mp3');
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

  const playDetail = useCallback(() => {
    if (detailAudioRef.current) {
      detailAudioRef.current.currentTime = 0;
      detailAudioRef.current.play().catch((err) => {
        console.log("Không thể phát âm thanh xem chi tiết:", err);
      });
    }
  }, []);

  const playLikeBegin = useCallback(() => {
    if (likeBeginAudioRef.current) {
      likeBeginAudioRef.current.currentTime = 0;
      likeBeginAudioRef.current.play().catch((err) => {
        console.log("Không thể phát âm thanh bắt đầu like:", err);
      });
    }
  }, []);

  const playLikeEnd = useCallback(() => {
    if (likeEndAudioRef.current) {
      likeEndAudioRef.current.currentTime = 0;
      likeEndAudioRef.current.play().catch((err) => {
        console.log("Không thể phát âm thanh hủy like:", err);
      });
    }
  }, []);

  const playComment = useCallback(() => {
    if (commentAudioRef.current) {
      commentAudioRef.current.currentTime = 0;
      commentAudioRef.current.play().catch((err) => {
        console.log("Không thể phát âm thanh comment:", err);
      });
    }
  }, []);

  const playSave = useCallback(() => {
    if (saveAudioRef.current) {
      saveAudioRef.current.currentTime = 0;
      saveAudioRef.current.play().catch((err) => {
        console.log("Không thể phát âm thanh lưu bài:", err);
      });
    }
  }, []);

  return { playPop, playDing, playDetail, playLikeBegin, playLikeEnd, playComment, playSave };
};
