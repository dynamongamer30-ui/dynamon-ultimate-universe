import { createFileRoute } from "@tanstack/react-router";
import { PhoenixCampaign } from "@/components/PhoenixCampaign";
export const Route = createFileRoute("/diwali-pass/$slug")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Diwali Pass — Dynamon Universe" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: function CampaignPage() {
    const { slug } = Route.useParams();
    return <PhoenixCampaign key={slug} slug={slug} prefix="diwali-pass" />;
  },
});
