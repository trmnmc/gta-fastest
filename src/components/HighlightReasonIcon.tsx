import { Volume2, Scissors, MessageSquare } from "lucide-react";

export function HighlightReasonIcon({ reason }: { reason: string }) {
  if (reason === "loudness") return <Volume2 size={15} className="text-amber-400" />;
  if (reason === "scene_change") return <Scissors size={15} className="text-sky-400" />;
  return <MessageSquare size={15} className="text-creeper-400" />;
}

export const REASON_LABEL: Record<string, string> = {
  loudness: "Loud moment",
  scene_change: "Scene change",
  speech: "Speech",
};
