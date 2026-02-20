const PAGE_FETCH_MESSAGE_TYPE = "BILISHELF_PAGE_FETCH_JSON";
const PAGE_FETCH_REQUEST_EVENT = "BILISHELF_PAGE_FETCH_REQUEST";
const PAGE_FETCH_RESPONSE_EVENT = "BILISHELF_PAGE_FETCH_RESPONSE";

type PageFetchRequestDetail = {
  requestId: string;
  url: string;
};

type PageFetchResponseDetail = {
  requestId: string;
  ok: boolean;
  status: number;
  payload?: unknown;
  error?: string;
};

function injectPageBridge() {
  const marker = "__BILISHELF_PAGE_FETCH_BRIDGE__";
  const bridgeCode = `
    (() => {
      if (window.${marker}) return;
      window.${marker} = true;

      const requestEvent = "${PAGE_FETCH_REQUEST_EVENT}";
      const responseEvent = "${PAGE_FETCH_RESPONSE_EVENT}";

      window.addEventListener(requestEvent, async (event) => {
        const detail = event && event.detail ? event.detail : {};
        const requestId = String(detail.requestId || "");
        const url = String(detail.url || "");
        if (!requestId || !url) return;

        const emit = (result) => {
          window.dispatchEvent(new CustomEvent(responseEvent, { detail: { requestId, ...result } }));
        };

        try {
          const response = await fetch(url, {
            credentials: "include",
            headers: {
              Accept: "application/json, text/plain, */*"
            }
          });
          const text = await response.text();
          let payload = null;
          try {
            payload = text ? JSON.parse(text) : null;
          } catch {
            payload = { code: -1, message: text || "Invalid JSON response" };
          }

          if (!response.ok) {
            emit({
              ok: false,
              status: response.status,
              error: payload && typeof payload.message === "string"
                ? payload.message
                : \`Request failed (\${response.status})\`,
              payload
            });
            return;
          }

          emit({
            ok: true,
            status: response.status,
            payload
          });
        } catch (error) {
          emit({
            ok: false,
            status: 500,
            error: error instanceof Error ? error.message : String(error || "Page fetch failed")
          });
        }
      });
    })();
  `;

  const script = document.createElement("script");
  script.textContent = bridgeCode;
  (document.documentElement || document.head || document.body)?.appendChild(script);
  script.remove();
}

function pageFetchJson(
  request: PageFetchRequestDetail,
  timeoutMs = 20_000
): Promise<PageFetchResponseDetail> {
  injectPageBridge();

  return new Promise((resolve, reject) => {
    let timeoutId = 0;
    const onResponse = (event: Event) => {
      const custom = event as CustomEvent<PageFetchResponseDetail>;
      const detail = custom.detail;
      if (!detail || detail.requestId !== request.requestId) return;
      cleanup();
      resolve(detail);
    };

    const cleanup = () => {
      window.removeEventListener(PAGE_FETCH_RESPONSE_EVENT, onResponse as EventListener);
      window.clearTimeout(timeoutId);
    };

    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("Page-context fetch timeout"));
    }, timeoutMs);

    window.addEventListener(PAGE_FETCH_RESPONSE_EVENT, onResponse as EventListener);
    window.dispatchEvent(
      new CustomEvent<PageFetchRequestDetail>(PAGE_FETCH_REQUEST_EVENT, {
        detail: request
      })
    );
  });
}

export default defineContentScript({
  matches: ["https://www.bilibili.com/*"],
  runAt: "document_start",
  main() {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (!message || message.type !== PAGE_FETCH_MESSAGE_TYPE) return false;
      const url = typeof message.url === "string" ? message.url.trim() : "";
      if (!url) {
        sendResponse({
          ok: false,
          status: 400,
          error: "Invalid request url"
        });
        return false;
      }

      const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      pageFetchJson({ requestId, url })
        .then((result) => sendResponse(result))
        .catch((error) => {
          sendResponse({
            ok: false,
            status: 500,
            error: error instanceof Error ? error.message : String(error)
          });
        });
      return true;
    });
  }
});
