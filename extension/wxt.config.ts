import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "BiliShelf Manager",
    short_name: "BiliShelf",
    description: "Capture Bilibili videos into local folders, then search, tag, and batch-manage.",
    version: "0.1.0",
    permissions: ["storage", "activeTab", "tabs", "scripting"],
    options_page: "manager/index.html",
    icons: {
      "16": "icons/16.png",
      "32": "icons/32.png",
      "48": "icons/48.png",
      "128": "icons/128.png"
    },
    action: {
      default_title: "BiliShelf Manager",
      default_icon: {
        "16": "icons/16.png",
        "32": "icons/32.png"
      }
    },
    browser_specific_settings: {
      gecko: {
        id: "bilishelf@tlrk.dev",
        data_collection_permissions: {
          required: ["none"]
        }
      }
    },
    host_permissions: [
      "https://www.bilibili.com/*",
      "https://api.bilibili.com/*"
    ]
  }
});
