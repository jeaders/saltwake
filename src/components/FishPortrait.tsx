import { memo, useEffect, useRef } from "react";
import { getSprite, SPECIES } from "../game/species";

export const FishPortrait = memo(function FishPortrait({ id, silhouette = false, large = false }: { id: string; silhouette?: boolean; large?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current, fish = SPECIES[id];
    if (!canvas || !fish) return;
    const ctx = canvas.getContext("2d")!;
    const sprite = getSprite(fish);
    const width = large ? 460 : 220, height = large ? 230 : 120;
    canvas.width = width; canvas.height = height;
    const scale = Math.min((width - 24) / sprite.w, (height - 12) / sprite.h);
    ctx.clearRect(0, 0, width, height);
    ctx.translate(width / 2, height / 2);
    ctx.drawImage(sprite.frames[1], -sprite.w * scale / 2, -sprite.h * scale / 2, sprite.w * scale, sprite.h * scale);
  }, [id, large]);
  return <canvas ref={ref} className={`fish-portrait ${silhouette ? "silhouette" : ""}`} role="img" aria-label={silhouette ? "Specie da scoprire" : SPECIES[id]?.name} />;
});
