import SkeletonCard from "./SkeletonCard";

interface Props {
  count?: number;
  wakeMessage?: string;
}

export default function SkeletonGrid({ count = 8, wakeMessage }: Props) {
  return (
    <div className="flex flex-col items-center">
      {wakeMessage && (
        <div className="mb-6 flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-4 py-2 text-sm text-amber-400/80">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          {wakeMessage}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-3 w-full">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
