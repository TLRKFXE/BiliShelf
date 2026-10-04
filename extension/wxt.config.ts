import { defineConfig } from "wxt";
import packageJson from "./package.json";

export default defineConfig({
  manifest: {
    default_locale: "zh_CN",
    name: "__MSG_extensionName__",
    short_name: "__MSG_extensionShortName__",
    description: "__MSG_extensionDescription__",
    version: packageJson.version,
    permissions: [
      "storage",
      "activeTab",
      "tabs",
      "scripting",
      "alarms",
      "cookies",
      "notifications",
    ],
    options_page: "manager/index.html",
    icons: {
      "16": "icons/16.png",
      "32": "icons/32.png",
      "48": "icons/48.png",
      "128": "icons/128.png",
    },
    action: {
      default_title: "__MSG_extensionActionTitle__",
      default_icon: {
        "16": "icons/16.png",
        "32": "icons/32.png",
      },
    },
    browser_specific_settings: {
      gecko: {
        id: "bilishelf-dev-20260315@tlrk.dev",
        data_collection_permissions: {
          required: ["none"],
        },
      } as { id: string } & Record<string, unknown>,
    },
    host_permissions: ["https://*.bilibili.com/*", "https://*/*", "http://*/*"],
  },
});
