import { useSavedMods } from "./useSavedMods";

export function useFavorites() {
  return useSavedMods("favorites");
}
