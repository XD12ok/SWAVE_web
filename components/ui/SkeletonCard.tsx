export default function SkeletonCard() {
  return (
    <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 lg:p-2 animate-pulse">
      <div className="aspect-square flex items-center justify-center mb-2 lg:mb-1">
        <div className="w-full h-full rounded-lg bg-white/5" />
      </div>
      <div className="h-4 lg:h-3.5 w-2/3 rounded bg-white/10 mb-2" />
      <div className="h-3 lg:h-2.5 w-1/3 rounded bg-white/10 mb-2" />
      <div className="h-3 lg:h-2.5 w-1/2 rounded bg-white/5 mt-2" />
    </div>
  );
}
