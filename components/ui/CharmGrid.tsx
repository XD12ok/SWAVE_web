import { Charm } from "@/types/charm";
import CharmCard from "./CharmCard";

interface Props {
  charms: Charm[];
  onSelect: (charm: Charm) => void;
}

export default function CharmGrid({ charms, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-3">
      {charms.map((charm) => (
        <CharmCard key={charm.id} charm={charm} onSelect={onSelect} />
      ))}
    </div>
  );
}
