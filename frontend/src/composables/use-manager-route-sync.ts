import { ref, type Ref } from "vue";
import type { LocationQuery, Router, RouteLocationNormalizedLoaded } from "vue-router";
import { buildManagerQueryFromState, parseManagerQuery } from "@/lib/manager-query";
import { PAGE_SIZE_OPTIONS } from "@/stores/library";
import { isSameQuery } from "@/lib/route-query";

type UseManagerRouteSyncParams = {
  route: RouteLocationNormalizedLoaded;
  router: Router;
  trashMode: Ref<boolean>;
  keyword: Ref<string>;
  selectedFolderId: Ref<number | null>;
  fromDate: Ref<string>;
  toDate: Ref<string>;
  videoPage: Ref<number>;
  videoPageSize: Ref<number>;
};

export function useManagerRouteSync(params: UseManagerRouteSyncParams) {
  const {
    route,
    router,
    trashMode,
    keyword,
    selectedFolderId,
    fromDate,
    toDate,
    videoPage,
    videoPageSize,
  } = params;

  const routeReady = ref(false);
  const syncingFromRoute = ref(false);
  const syncingToRoute = ref(false);

  function buildManagerQuery() {
    return buildManagerQueryFromState(
      {
        keyword: keyword.value,
        selectedFolderId: selectedFolderId.value,
        fromDate: fromDate.value,
        toDate: toDate.value,
        videoPage: videoPage.value,
        videoPageSize: videoPageSize.value,
      },
      30
    );
  }

  function applyManagerQuery(query: LocationQuery) {
    const parsed = parseManagerQuery(query, PAGE_SIZE_OPTIONS, 30);
    keyword.value = parsed.keyword;
    selectedFolderId.value = parsed.selectedFolderId;
    fromDate.value = parsed.fromDate;
    toDate.value = parsed.toDate;
    videoPage.value = parsed.videoPage;
    videoPageSize.value = parsed.videoPageSize;
  }

  async function syncManagerQueryToRoute(replace = true) {
    if (!routeReady.value || trashMode.value) return;
    if (syncingFromRoute.value) return;
    const nextQuery = buildManagerQuery();
    if (isSameQuery(nextQuery, route.query)) return;

    syncingToRoute.value = true;
    try {
      if (replace) {
        await router.replace({ name: "manager", query: nextQuery });
      } else {
        await router.push({ name: "manager", query: nextQuery });
      }
    } finally {
      syncingToRoute.value = false;
    }
  }

  return {
    routeReady,
    syncingFromRoute,
    syncingToRoute,
    buildManagerQuery,
    applyManagerQuery,
    syncManagerQueryToRoute,
  };
}
