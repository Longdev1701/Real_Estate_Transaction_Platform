"use client";

import { useCallback } from "react";

let sendAudio: HTMLAudioElement | null = null;
let receiveAudio: HTMLAudioElement | null = null;
let detailAudio: HTMLAudioElement | null = null;
let likeBeginAudio: HTMLAudioElement | null = null;
let likeEndAudio: HTMLAudioElement | null = null;
let commentAudio: HTMLAudioElement | null = null;
let saveAudio: HTMLAudioElement | null = null;
let reportAudio: HTMLAudioElement | null = null;
let homePageAudio: HTMLAudioElement | null = null;
let homePageReadyPromise: Promise<void> | null = null;

const createAudio = (src: string) => {
  const audio = new Audio(src);
  audio.preload = "auto";
  audio.load();
  return audio;
};

const initAudio = () => {
  if (typeof window !== "undefined" && !sendAudio) {
    sendAudio = createAudio("/sounds/apple_send.mp3");
    receiveAudio = createAudio("/sounds/apple_receive.mp3");
    detailAudio = createAudio("/sounds/xem_chi_tiet.mp3");
    likeBeginAudio = createAudio("/sounds/like_begin.mp3");
    likeEndAudio = createAudio("/sounds/like_end.mp3");
    commentAudio = createAudio("/sounds/comment.mp3");
    saveAudio = createAudio("/sounds/save.mp3");
    reportAudio = createAudio("/sounds/report.mp3");
    homePageAudio = createAudio("/sounds/home_page.mp3");
  }
};

const ensureHomePageAudioReady = () => {
  initAudio();

  if (!homePageAudio) {
    return Promise.resolve();
  }

  if (homePageAudio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    return Promise.resolve();
  }

  if (!homePageReadyPromise) {
    homePageReadyPromise = new Promise<void>((resolve) => {
      const handleReady = () => {
        cleanup();
        resolve();
      };

      const handleError = () => {
        cleanup();
        resolve();
      };

      const cleanup = () => {
        homePageAudio?.removeEventListener("canplaythrough", handleReady);
        homePageAudio?.removeEventListener("loadeddata", handleReady);
        homePageAudio?.removeEventListener("error", handleError);
        homePageReadyPromise = null;
      };

      homePageAudio?.addEventListener("canplaythrough", handleReady, { once: true });
      homePageAudio?.addEventListener("loadeddata", handleReady, { once: true });
      homePageAudio?.addEventListener("error", handleError, { once: true });
      homePageAudio?.load();
    });
  }

  return homePageReadyPromise;
};

export const useSound = () => {
  const playPop = useCallback(() => {
    initAudio();
    if (sendAudio) {
      sendAudio.currentTime = 0;
      sendAudio.play().catch((err) => {
        console.log("Khong the phat am thanh gui:", err);
      });
    }
  }, []);

  const playDing = useCallback(() => {
    initAudio();
    if (receiveAudio) {
      receiveAudio.currentTime = 0;
      receiveAudio.play().catch((err) => {
        console.log("Khong the phat am thanh nhan:", err);
      });
    }
  }, []);

  const playDetail = useCallback(() => {
    initAudio();
    if (detailAudio) {
      detailAudio.currentTime = 0;
      detailAudio.play().catch((err) => {
        console.log("Khong the phat am thanh xem chi tiet:", err);
      });
    }
  }, []);

  const playLikeBegin = useCallback(() => {
    initAudio();
    if (likeBeginAudio) {
      likeBeginAudio.currentTime = 0;
      likeBeginAudio.play().catch((err) => {
        console.log("Khong the phat am thanh bat dau like:", err);
      });
    }
  }, []);

  const playLikeEnd = useCallback(() => {
    initAudio();
    if (likeEndAudio) {
      likeEndAudio.currentTime = 0;
      likeEndAudio.play().catch((err) => {
        console.log("Khong the phat am thanh huy like:", err);
      });
    }
  }, []);

  const playComment = useCallback(() => {
    initAudio();
    if (commentAudio) {
      commentAudio.currentTime = 0;
      commentAudio.play().catch((err) => {
        console.log("Khong the phat am thanh comment:", err);
      });
    }
  }, []);

  const playSave = useCallback(() => {
    initAudio();
    if (saveAudio) {
      saveAudio.currentTime = 0;
      saveAudio.play().catch((err) => {
        console.log("Khong the phat am thanh luu bai:", err);
      });
    }
  }, []);

  const playReport = useCallback(() => {
    initAudio();
    if (reportAudio) {
      reportAudio.currentTime = 0;
      reportAudio.play().catch((err) => {
        console.log("Khong the phat am thanh bao cao:", err);
      });
    }
  }, []);

  const playHomePage = useCallback(async () => {
    await ensureHomePageAudioReady();

    if (homePageAudio) {
      homePageAudio.currentTime = 0;
      homePageAudio.play().catch((err) => {
        console.log("Khong the phat am thanh trang chu:", err);
      });
    }
  }, []);

  const prepareHomePageSound = useCallback(async () => {
    await ensureHomePageAudioReady();
  }, []);

  return {
    playPop,
    playDing,
    playDetail,
    playLikeBegin,
    playLikeEnd,
    playComment,
    playSave,
    playReport,
    playHomePage,
    prepareHomePageSound,
  };
};
