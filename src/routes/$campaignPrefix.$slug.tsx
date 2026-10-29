import { createFileRoute } from "@tanstack/react-router";
import { PhoenixCampaign } from "@/components/PhoenixCampaign";
export const Route = createFileRoute("/$campaignPrefix/$slug")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Campaign reward — Dynamon Universe" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: function CampaignPage() {
    const { slug, campaignPrefix } = Route.useParams();
    return (
      <PhoenixCampaign key={`${campaignPrefix}/${slug}`} slug={slug} prefix={campaignPrefix} />
    );
  },
});
