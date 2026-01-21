// 导出当前所有标签页的 URL
document.getElementById("exportBtn").addEventListener("click", async () => {
  const tabs = await chrome.tabs.query({});
  const urls = tabs
    .map((tab) => tab.url)
    .filter((url) => url.startsWith("http"));

  const blob = new Blob([JSON.stringify(urls, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `urls_${Date.now()}.json`;
  a.click();
});

// 读取文件并通知 background 开始任务
document.getElementById("fileInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = (event) => {
    const urls = JSON.parse(event.target.result);
    chrome.runtime.sendMessage({ action: "start_task", urls: urls });
    document.getElementById("status").innerText =
      "任务已开始，请勿关闭浏览器...";
  };
  reader.readAsText(file);
});
