import { createRouter, createWebHashHistory, createWebHistory } from "vue-router";
import { pinia } from "@/stores";
import { useLibraryStore } from "@/stores/library";

const isExtensionRuntime =
  import.meta.env.VITE_RUNTIME_TARGET === "extension" ||
  window.location.protocol === "chrome-extension:" ||
  window.location.protocol === "moz-extension:";

const router = createRouter({
  history: isExtensionRuntime ? createWebHashHistory() : createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: { name: "manager" },
    },
    {
      path: "/manager",
      name: "manager",
      component: () => import("../App.vue"),
      meta: { title: "BiliShelf Manager" },
    },
    {
      path: "/trash",
      name: "trash",
      component: () => import("../App.vue"),
      meta: { title: "BiliShelf Trash" },
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: { name: "manager" },
    },
  ],
});

router.beforeEach((to) => {
  if (to.name === "manager" || to.name === "trash") {
    return true;
  }
  return { name: "manager" };
});

router.beforeResolve(async (to) => {
  const libraryStore = useLibraryStore(pinia);
  if (to.name === "manager") {
    await libraryStore.prefetchForRoute("manager");
  } else if (to.name === "trash") {
    await libraryStore.prefetchForRoute("trash");
  }

  if (!to.meta.title) {
    to.meta.title = "BiliShelf";
  }
  return true;
});

router.afterEach((to) => {
  document.title = String(to.meta.title ?? "BiliShelf");
});

export default router;
