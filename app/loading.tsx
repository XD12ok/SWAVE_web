export default function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/90 backdrop-blur-md z-50">
      <div className="relative flex flex-col items-center gap-6">
        {/* Glow effect */}
        <div className="absolute h-24 w-24 bg-white/20 blur-3xl rounded-full animate-pulse" />

        {/* Spinner */}
        <div className="h-14 w-14 border-2 border-white/30 border-t-white rounded-full animate-spin" />

        {/* Text */}
        <p className="text-white tracking-widest text-sm animate-pulse">
          LOADING EXPERIENCE
        </p>
      </div>
    </div>
  );
}
