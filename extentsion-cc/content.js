(function () {
  // 防止重复注入
  if (window.hasRunPlayer) return;
  window.hasRunPlayer = true;

  console.log("播放助手已启动，正在分析页面结构...");

  const tryPlay = () => {
    const video = document.querySelector("video");

    // 1. 获取所有可能的点击对象
    const bigBtn = document.querySelector(".xt_video_bit_play_btn"); // 中心小按钮
    const bigBtnLayer = document.querySelector("xt-bigbutton"); // 中心大按钮层
    const playBarBtn = document.querySelector(".xt_video_player_play_btn"); // 左下角按钮
    const mask = document.querySelector(".xt_video_player_mask"); // 视频遮罩层

    if (video) {
      // 必须静音，否则浏览器禁止自动播放
      video.muted = true;

      // 如果视频已经在播放，就不再重复点击
      if (!video.paused) {
        console.log("视频正在播放中...");
        checkEnd(video);
        return;
      }

      console.log("尝试触发播放...");

      // 方案 A: 直接调用底层 API
      video.play().catch((err) => {
        console.log("API 播放受阻，尝试模拟点击...");

        // 方案 B: 模拟点击。优先点击遮罩层或大按钮层
        const targets = [mask, bigBtnLayer, bigBtn, playBarBtn];
        targets.forEach((el) => {
          if (el) {
            el.click();
            // 派发更底层的鼠标事件
            el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
          }
        });
      });

      checkEnd(video);
    } else {
      console.log("未检测到视频，等待中...");
    }
  };

  // 监测播放结束
  const checkEnd = (video) => {
    if (video.getAttribute("data-has-listener")) return;
    video.setAttribute("data-has-listener", "true");

    video.addEventListener("ended", () => {
      console.log("本视频播放结束，通知关闭页面...");
      chrome.runtime.sendMessage({ action: "video_ended" });
    });

    // 备用方案：定时检查进度，防止某些情况下 ended 事件不触发
    setInterval(() => {
      if (
        video.ended ||
        (video.currentTime > 0 &&
          video.duration > 0 &&
          video.currentTime >= video.duration - 1)
      ) {
        console.log("检测到视频已接近结束位置");
        chrome.runtime.sendMessage({ action: "video_ended" });
      }
    }, 3000);
  };

  // 每隔 3 秒循环检查一次（应对网络抖动或加载慢）
  const playerTimer = setInterval(() => {
    const video = document.querySelector("video");
    if (video && !video.paused) {
      // 如果已经在跑了，可以降低检查频率
      console.log("检测到播放正常...");
    } else {
      tryPlay();
    }
  }, 3000);
  setInterval(() => {
    chrome.runtime.sendMessage({ action: "video_ended" });
  }, 2000000);
})();
