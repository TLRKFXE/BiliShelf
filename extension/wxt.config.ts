import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "BiliShelf Helper",
    short_name: "BiliShelf",
    description: "Save current Bilibili video into local BiliShelf backend",
    version: "0.1.0",
    permissions: ["storage", "activeTab"],
    icons: {
      "16": "icons/16.png",
      "32": "icons/32.png",
      "48": "icons/48.png",
      "128": "icons/128.png"
    },
    action: {
      default_title: "BiliShelf Helper",
      default_icon: {
        "16": "icons/16.png",
        "32": "icons/32.png"
      }
    },
    host_permissions: [
      "https://www.bilibili.com/*",
      "https://api.bilibili.com/*",
      "http://127.0.0.1:4321/*",
      "http://localhost:4321/*"
    ]
  }
});
