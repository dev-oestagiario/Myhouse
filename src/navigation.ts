export const PAGES = ['overview','projects','shopping','floorplan','plan-editor','works','scan','history'] as const;
export type Page = typeof PAGES[number];
export type AppRoute = { page: Page; projectId: string | null };

export function parseRoute(hash: string): AppRoute {
  const parts = hash.replace(/^#\/?/, '').split('/');
  const page = PAGES.find(item => item === parts[0]) ?? 'overview';
  if (page === 'projects' && parts[1] && parts.length === 2) {
    try {
      const projectId = decodeURIComponent(parts[1]);
      if (projectId && projectId.length <= 200 && !/[\u0000-\u001f]/.test(projectId)) return { page, projectId };
    } catch { /* invalid encoded link returns to the project list */ }
  }
  return { page, projectId: null };
}

export function routeHash(route: AppRoute): string {
  return '#/' + route.page + (route.page === 'projects' && route.projectId ? '/' + encodeURIComponent(route.projectId) : '');
}
