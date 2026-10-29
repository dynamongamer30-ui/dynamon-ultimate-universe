import { createFileRoute } from "@tanstack/react-router";
import { PhoenixCampaign } from "@/components/PhoenixCampaign";
export const Route = createFileRoute("/phoenix-pass/claim/$slug")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Phoenix Pass — Dynamon Universe" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: function PhoenixClaimPage() {
    const { slug } = Route.useParams();
    return <PhoenixCampaign key={slug} slug={slug} />;
  },
});
