export function posConfig() {
  const runtime = window.DISHPATCH_POS ?? {};
  return {
    backendUrl: stripSlash(runtime.backendUrl || import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"),
    menuImagesBaseUrl: stripSlash(runtime.menuImagesBaseUrl || import.meta.env.VITE_MENU_IMAGES_BASE_URL || ""),
  };
}

function stripSlash(value) {
  return String(value).replace(/\/$/, "");
}
