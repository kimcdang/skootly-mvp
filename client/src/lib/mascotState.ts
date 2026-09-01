export function nextMascotPanelState(minimized: boolean, panelOpen: boolean) {
  return { minimized: false, panelOpen: minimized ? true : !panelOpen };
}
