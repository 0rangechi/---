// background.js

// 监听消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "start_task") {
    // 1. 任务开始：初始化队列和运行状态
    chrome.storage.local.set(
      {
        urlQueue: message.urls,
        isRunning: true,
        currentAutomatedTabId: null, // 初始化
      },
      () => {
        console.log("任务已初始化...");
        playNext();
      },
    );
  } else if (message.action === "video_ended") {
    // 2. 视频结束：验证发送者是否为当前任务标签
    chrome.storage.local.get(["currentAutomatedTabId"], (data) => {
      if (sender.tab && sender.tab.id === data.currentAutomatedTabId) {
        chrome.tabs.remove(sender.tab.id, () => {
          console.log("任务标签已关闭，切换下一个...");
          playNext();
        });
      }
    });
  }
  return true;
});

// 关键逻辑：监听标签页更新，仅对自动打开的页面注入脚本
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 仅在页面加载完成时处理
  if (changeInfo.status === "complete") {
    chrome.storage.local.get(["isRunning", "currentAutomatedTabId"], (data) => {
      // 只有同时满足：正在运行 且 标签ID匹配 时才注入
      if (data.isRunning && tabId === data.currentAutomatedTabId) {
        console.log("正在向自动化标签注入播放逻辑...");
        chrome.scripting.executeScript({
          target: { tabId: tabId, allFrames: true }, // allFrames 确保注入到视频所在的 iframe
          files: ["content.js"],
        });
      }
    });
  }
});

async function playNext() {
  chrome.storage.local.get(["urlQueue", "isRunning"], async (data) => {
    let queue = data.urlQueue || [];

    if (!data.isRunning) return;

    // 所有任务完成
    if (queue.length === 0) {
      console.log("所有视频播放完毕！正在清空缓存...");
      chrome.storage.local.clear(() => {
        console.log("任务完成，缓存已彻底清空。");
      });
      return;
    }

    const nextUrl = queue.shift();

    // 更新队列并记录即将打开的标签 ID
    chrome.storage.local.set({ urlQueue: queue }, async () => {
      try {
        const tab = await chrome.tabs.create({ url: nextUrl, active: true });
        // 记录当前自动化标签的 ID，用于后续识别
        chrome.storage.local.set({ currentAutomatedTabId: tab.id });
        console.log("已打开自动化页面:", nextUrl);
      } catch (error) {
        console.error("打开页面失败，跳过:", error);
        playNext();
      }
    });
  });
}
