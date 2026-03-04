export default defineContentScript({
  matches: [
    "https://www.bilibili.com/video/*",
    "https://www.bilibili.com/list/watchlater*",
  ],
  runAt: "document_idle",
  main() {
    import("../content.js");
  }
});
