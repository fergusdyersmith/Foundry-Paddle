/** sessionStorage key: set before StaleDeployBoundary's one automatic reload. */
export const RELOAD_FLAG = "fp:stale-deploy-reload";

/** Called by Layout once the app has mounted. StaleDeployBoundary's own clear-on-success only
 *  runs while this boundary is on screen, which is to say only after an error, so a tab
 *  that reloaded once kept the flag for the rest of the session: the NEXT deploy showed
 *  the error page instead of quietly reloading. A page that mounted proves the reload
 *  worked, so that is where the flag comes off. */
export function clearStaleDeployFlag(): void {
  try {
    sessionStorage.removeItem(RELOAD_FLAG);
  } catch {
    /* storage disabled: there is no flag to clear */
  }
}
