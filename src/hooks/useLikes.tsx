import { useSavedMods } from "./useSavedMods";

export function useLikes() {
  return useSavedMods("mod_likes");
}
