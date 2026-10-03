import { useCallback, useEffect, useState } from "react";
import {
  getFeedbackPreference,
  setFeedbackPreference,
  subscribeToFeedbackPreference,
  type FeedbackPreference,
} from "@/lib/sound";

export function useFeedbackPreferences() {
  const [preference, setPreferenceState] = useState<FeedbackPreference>(() => getFeedbackPreference());

  useEffect(() => subscribeToFeedbackPreference(setPreferenceState), []);

  const setPreference = useCallback((next: FeedbackPreference) => {
    setFeedbackPreference(next);
    setPreferenceState(next);
  }, []);

  return { preference, setPreference };
}
