import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "@tanstack/react-router";
import "./build-experience.css";
import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import type { AppNotification } from "@/lib/notifications";
import { NotificationBody } from "./NotificationBody";
import { NotificationClaim } from "./NotificationClaim";
export function NotificationDetail({
  notification,
  onClose,
}: {
  notification: AppNotification | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { user } = useAuth();
  const location = useLocation();
  useEffect(() => {
    ref.current?.close();
  }, [user?.id, location.pathname]);
  useEffect(() => {
    if (notification && !ref.current?.open) ref.current?.showModal();
    if (!notification && ref.current?.open) ref.current.close();
  }, [notification]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="notification-detail-title"
      className="comparison-dialog p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id="notification-detail-title" className="font-display text-xl font-bold">
          {notification?.title}
        </h2>
        <button
          onClick={() => ref.current?.close()}
          aria-label="Close notification"
          className="touch-target rounded-full border border-border px-3"
        >
          ✕
        </button>
      </div>
      {notification && (
        <>
          <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            <NotificationBody text={notification.body} />
          </div>
          <NotificationClaim notification={notification} />
          {notification.reward_kind && (
            <p className="mt-4 text-sm">
              <Link
                to="/rewards"
                hash="my-rewards"
                onClick={() => ref.current?.close()}
                className="underline"
              >
                Open My Rewards
              </Link>{" "}
              to recover eligible prizes after this notice clears.
            </p>
          )}
        </>
      )}
    </dialog>
  );
}
