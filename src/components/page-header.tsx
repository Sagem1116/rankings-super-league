import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <Link to="/" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-violet-200">
        <ArrowLeft className="h-3 w-3" /> Voltar ao Índice
      </Link>
      <h1 className="font-display bg-gradient-to-r from-violet-200 via-violet-300 to-violet-100 bg-clip-text text-4xl font-bold tracking-tight text-transparent drop-shadow-[0_0_28px_rgba(167,139,250,0.22)] glow-heading">{title}</h1>
      {description && <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{description}</p>}
    </div>
  );
}
