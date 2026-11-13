import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useI18n, SUPPORTED_LANGUAGES, type Language } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageSelector({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { language, setLanguage, t } = useI18n();

  const current = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          className={cn(
            "flex items-center gap-1.5 font-medium border-border hover:bg-muted/60 transition-colors",
            className
          )}
          data-testid="language-selector-trigger"
        >
          <Globe className="h-4 w-4 text-primary shrink-0" />
          <span className="font-semibold">{current.nativeLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={cn(
              "flex items-center justify-between cursor-pointer py-2 px-3 text-sm font-medium",
              language === lang.code ? "bg-primary/10 text-primary font-bold" : ""
            )}
            data-testid={`language-option-${lang.code}`}
          >
            <span>{lang.nativeLabel}</span>
            <span className="text-xs text-muted-foreground uppercase">{lang.code}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
