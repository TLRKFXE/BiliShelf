import { CONTENT_SCRIPT_MATCHES } from "../shared/content-matches";

export default defineContentScript({
  matches: CONTENT_SCRIPT_MATCHES,
  runAt: "document_idle",
  main() {
    import("../content.js");
  }
});
