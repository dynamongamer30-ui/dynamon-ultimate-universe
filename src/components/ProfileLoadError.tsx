export function ProfileLoadError({ retry }: { retry: () => Promise<unknown> }) {
  return (
    <div
      role="alert"
      className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 text-center"
    >
      <p className="font-semibold">Could not load your profile. Please try again.</p>
      <button
        type="button"
        onClick={() => void retry()}
        className="touch-target mt-4 rounded-xl border border-border px-5 py-3 font-semibold hover:bg-primary/10"
      >
        Retry profile
      </button>
    </div>
  );
}
