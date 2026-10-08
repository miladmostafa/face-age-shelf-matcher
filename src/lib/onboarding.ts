/** Face Age panel where a person creates a Client ID. */
export const PANEL_URL = "https://panel.getfaceage.com/";

export const SETUP_TITLE = "Set your Client ID first";

export const SETUP_MESSAGE =
  "Add a Face Age Client ID in the extension settings before you scan. The scanner stays off until that ID is saved on this browser.";

export function needsClientId(clientId: string): boolean {
  return clientId.trim().length === 0;
}

/** Open the options page only on a fresh install that has no Client ID yet. */
export function shouldOpenOptionsOnInstall(reason: string, clientId: string): boolean {
  return reason === "install" && needsClientId(clientId);
}
