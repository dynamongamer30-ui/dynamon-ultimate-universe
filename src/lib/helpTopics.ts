export const HELP_TOPICS = [
  {
    id: "start",
    title: "Start here: how the website works",
    steps: [
      "Browse the published Dynamons World builds. Each edition has its own notes, version and features.",
      "Open a build, read its details, then use its Download button. Follow the access steps displayed; the website never needs your game password.",
      "Sign in to save favorites, receive rewards and keep your account preferences connected.",
    ],
    link: "/mods",
  },
  {
    id: "accounts",
    title: "Sign in, profiles and account recovery",
    steps: [
      "Use Sign in in the header. Use the same account each time so your saved content and rewards stay together.",
      "Finish profile setup if requested. Your avatar and display name belong to your profile; they do not change the website logo.",
      "Use the password-recovery option if you use email/password. For Google sign-in, recover access through Google. Never share passwords or one-time codes with support.",
    ],
    link: "/auth",
  },
  {
    id: "discovery",
    title: "Search, filters and saved searches",
    steps: [
      "Open Mods and search by build name or a listed feature. Filter by element, rating and version, then choose a sort order.",
      "Save a useful set of filters under a name. Signed-in saved searches sync to your account after the server feature is enabled; visitor searches stay on this device.",
      "Use Reset discovery if a combination produces no matches. Share the catalog URL to share its filters.",
    ],
    link: "/mods",
  },
  {
    id: "compare",
    title: "Compare builds and share your selection",
    steps: [
      "Choose Add to comparison on two or three build cards, then select Compare builds.",
      "Read versions, sizes, community signals and features side by side. A dash means a feature is not listed; it does not prove that a build cannot support it.",
      "On a phone, swipe inside the table to see the other columns. Differences only hides identical rows. Copy comparison link shares public build choices only.",
    ],
    link: "/mods",
  },
  {
    id: "downloads",
    title: "Download and unlock a build",
    steps: [
      "Open the build details and review its version, release notes and available file information.",
      "Sign in if asked. Select Download and follow the follow/unlock steps shown. Timers and verification remain part of the normal access flow.",
      "A Phoenix Pass can skip the supported follow step when offered. Spending it is a separate confirmation. Missing links cannot be fixed by repeatedly spending passes.",
    ],
    link: "/mods",
  },
  {
    id: "keys",
    title: "DG keys, device binding and expiry",
    steps: [
      "A DG key is a license code for the supported game client; a Phoenix Pass is a website download reward. They are different.",
      "Claim an eligible key in My Rewards, then copy it into the supported client. Copying does not activate the license.",
      "Activation can bind the key to a device. Follow its displayed validity; the website does not extend a key merely because you copied it again. Keep a copy after activation if the client may need it.",
    ],
    link: "/rewards",
  },
  {
    id: "history",
    title: "Recover a reward after its notification disappears",
    steps: [
      "Open My Rewards from Rewards or your account. Notifications announce prizes; the reward record is what controls access.",
      "Claim a daily prize before its deadline, normally within 24 hours. An unread or dismissed notice does not extend that deadline.",
      "Reveal/copy eligible claimed keys again here. Claimed Phoenix Passes remain available until spent or their existing expiry, normally 30 days. Used and expired items leave the available list.",
    ],
    link: "/rewards",
  },
  {
    id: "phoenix",
    title: "Claim and spend a Phoenix Pass",
    steps: [
      "Claim a daily pass before the displayed deadline. Owner grants and successful campaign claims are already claimed.",
      "Open a build and choose the Phoenix Pass option when available. Confirm the spend only for the build you want.",
      "An unavailable download or failed operation must not consume a second pass on retry. If the outcome is uncertain, refresh My Rewards before trying another pass.",
    ],
    link: "/rewards",
  },
  {
    id: "campaigns",
    title: "Phoenix campaign links and claim protection",
    steps: [
      "Open the official campaign URL, sign in with an eligible verified account, and complete the website security check.",
      "Each campaign allows one claim per account and one per recognized browser identity. A browser identity is not a permanent phone hardware ID.",
      "Campaigns can be paused, not yet started, ended or fully claimed. Failed verification does not reserve a prize. Retrying a confirmed claim must not award another pass.",
    ],
    link: "/phoenix-pass/claim/tesla",
  },
  {
    id: "notifications",
    title: "Notifications and automatic cleanup",
    steps: [
      "Open a message deliberately to acknowledge it. Visiting the inbox should not erase every unread notice.",
      "Automated notices clear after acknowledgement or dismissal. Shared notices clear separately for each user. Manual announcements remain until the owner removes or expires them.",
      "Find eligible prizes in My Rewards even after a notification disappears. The inbox badge counts messages, not the number of passes you own.",
    ],
    link: "/notifications",
  },
  {
    id: "preferences",
    title: "Favorites, themes and phone gestures",
    steps: [
      "Use the bookmark control to save a build and the heart to like it. These are separate actions.",
      "Open the menu for website themes and feedback settings. Sound and vibration depend on your preferences and browser support.",
      "Swipe horizontally across build artwork to open details; scroll vertically to browse. Reduced-motion preferences reduce decorative movement.",
    ],
    link: "/favorites",
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting and support",
    steps: [
      "For a loading error, use the page’s Retry action. Refresh after a website update if a tab is stale.",
      "If a reward claim was interrupted, check My Rewards before repeating the action. If it already succeeded, use the existing reward.",
      "For a broken download, report the build name, version and step that failed. Never include passwords, account tokens or a private key in a public comment.",
    ],
    link: "/contact",
  },
];
