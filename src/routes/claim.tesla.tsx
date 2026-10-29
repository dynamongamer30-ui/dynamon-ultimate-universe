import { createFileRoute } from "@tanstack/react-router";
import { PhoenixCampaign } from "@/components/PhoenixCampaign";
export const Route = createFileRoute("/claim/tesla")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Phoenix Pass — Dynamon Universe" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => <PhoenixCampaign slug="tesla" />,
});
