export default defineContentScript({
  matches: ["https://www.bilibili.com/video/*"],
  runAt: "document_idle",
  main() {
    import("../content.js");
  }
});
