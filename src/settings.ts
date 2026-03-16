export type TerminalTheme = "dark" | "light";
export type CwdMode = "vault-root";

export interface TerminalPluginSettings {
  shellPath: string;
  fontSize: number;
  theme: TerminalTheme;
  cwdMode: CwdMode;
  desktopOnlyNotice: true;
}

export const DEFAULT_SETTINGS: TerminalPluginSettings = {
  shellPath: "",
  fontSize: 14,
  theme: "dark",
  cwdMode: "vault-root",
  desktopOnlyNotice: true,
};

export function normalizeSettings(
  saved: Partial<Omit<TerminalPluginSettings, "desktopOnlyNotice">> & {
    desktopOnlyNotice?: boolean;
  } = {},
): TerminalPluginSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    desktopOnlyNotice: true,
  };
}
