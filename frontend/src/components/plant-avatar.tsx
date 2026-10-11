import { Flower2, Leaf, Sprout, TreeDeciduous } from "lucide-react";

const speciesIcon = (species: string) => {
  const s = species.toLowerCase();
  if (s.includes("cactus") || s.includes("succulent")) return Sprout;
  if (s.includes("fern") || s.includes("palm")) return TreeDeciduous;
  if (s.includes("basil") || s.includes("herb") || s.includes("mint"))
    return Sprout;
  if (s.includes("rose") || s.includes("orchid") || s.includes("lily"))
    return Flower2;
  return Leaf;
};

export function PlantAvatar({
  species,
  className = "h-11 w-11",
}: {
  species: string;
  className?: string;
}) {
  const Icon = speciesIcon(species);
  return (
    <span
      className={`flex items-center justify-center rounded-xl bg-sage text-leaf ${className}`}
    >
      <Icon className="h-5 w-5" />
    </span>
  );
}
