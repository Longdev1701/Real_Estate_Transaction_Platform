"use client";
import { useCallback } from 'react';

// Singleton audio objects initialized once globally
let sendAudio: HTMLAudioElement | null = null;
let receiveAudio: HTMLAudioElement | null = null;
let detailAudio: HTMLAudioElement | null = null;
let likeBeginAudio: HTMLAudioElement | null = null;
let likeEndAudio: HTMLAudioElement | null = null;
let commentAudio: HTMLAudioElement | null = null;
let saveAudio: HTMLAudioElement | null = null;

const initAudio = () => {
  if (typeof window !== 'undefined' && !sendAudio) {
    sendAudio = new Audio('/sounds/apple_send.mp3');
    receiveAudio = new Audio('/sounds/apple_receive.mp3');
    detailAudio = new Audio('/sounds/xem_chi_tiet.mp3');
    likeBeginAudio = new Audio('/sounds/like_begin.mp3');
    likeEndAudio = new Audio('/sounds/like_end.mp3');
    commentAudio = new Audio('/sounds/comment.mp3');
    saveAudio = new Audio('/sounds/save.mp3');
  }
};

export const useSound = () => {
  // Ensure audio is initialized on client
  initAudio();

  const playPop = useCallback(() => {
    if (sendAudio) {
      sendAudio.currentTime = 0; // Trở về đầu file
      sendAudio.play().catch((err) => {
        console.log("Chưa có file send.mp3 hoặc trình duyệt chặn autoplay:", err);
      });
    }
  }, []);

  const playDing = useCallback(() => {
    if (receiveAudio) {
      receiveAudio.currentTime = 0; // Trở về đầu file
      receiveAudio.play().catch((err) => {
        console.log("Chưa có file receive.mp3 hoặc trình duyệt chặn autoplay:", err);
      });
    }
  }, []);

  const playDetail = useCallback(() => {
    if (detailAudio) {
      detailAudio.currentTime = 0;
      detailAudio.play().catch((err) => {
        console.log("Không thể phát âm thanh xem chi tiết:", err);
      });
    }
  }, []);

  const playLikeBegin = useCallback(() => {
    if (likeBeginAudio) {
      likeBeginAudio.currentTime = 0;
      likeBeginAudio.play().catch((err) => {
        console.log("Không thể phát âm thanh bắt đầu like:", err);
      });
    }
  }, []);

  const playLikeEnd = useCallback(() => {
    if (likeEndAudio) {
      likeEndAudio.currentTime = 0;
      likeEndAudio.play().catch((err) => {
        console.log("Không thể phát âm thanh hủy like:", err);
      });
    }
  }, []);

  const playComment = useCallback(() => {
    if (commentAudio) {
      commentAudio.currentTime = 0;
      commentAudio.play().catch((err) => {
        console.log("Không thể phát âm thanh comment:", err);
      });
    }
  }, []);

  const playSave = useCallback(() => {
    if (saveAudio) {
      saveAudio.currentTime = 0;
      saveAudio.play().catch((err) => {
        console.log("Không thể phát âm thanh lưu bài:", err);
      });
    }
  }, []);

  return { playPop, playDing, playDetail, playLikeBegin, playLikeEnd, playComment, playSave };
};
