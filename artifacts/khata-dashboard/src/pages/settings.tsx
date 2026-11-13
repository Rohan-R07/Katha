import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2 } from "lucide-react";
import { useGetShop, getGetShopQueryKey, useUpdateShop, useGetIntegrationStatus, getGetIntegrationStatusQueryKey, useHealthCheck, getHealthCheckQueryKey, getGetMeQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ErrorState, PageHeader, Panel } from "@/components/khata-ui";
import { LanguageSelector } from "@/components/language-selector";
import { errorMessage, REFETCH, useInvalidateLedger } from "@/lib/khata";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const FIELD_KEYS = ["shop_name", "shop_type", "contact_number", "preferred_language", "address", "city", "state"] as const;
type Key = (typeof FIELD_KEYS)[number];

export default function Settings() {
  const { t } = useI18n();
  const shop = useGetShop({ query: { queryKey: getGetShopQueryKey() } });
  const status = useGetIntegrationStatus({ query: { queryKey: getGetIntegrationStatusQueryKey(), refetchInterval: REFETCH } });
  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), refetchInterval: REFETCH } });
  const update = useUpdateShop();
  const qc = useQueryClient();
  const invalidate = useInvalidateLedger();
  const { toast } = useToast();
  const [f, setF] = useState<Record<Key, string> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (shop.data && !f) setF(Object.fromEntries(FIELD_KEYS.map((k) => [k, (shop.data as any)[k] ?? ""])) as Record<Key, string>);
  }, [shop.data, f]);

  const FIELD_LABELS: Record<Key, string> = {
    shop_name: t("shopName"),
    shop_type: t("shopType"),
    contact_number: t("contactNumber"),
    preferred_language: t("preferredLanguage"),
    address: t("address"),
    city: t("city"),
    state: t("state"),
  };

  const LABELS: Record<string, string> = {
    backend: "Backend API", database: "Database", onboarding_api: "Onboarding API",
    structured_commands: "Structured commands", speech_to_text: "Speech to text",
    text_to_speech: "Text to speech", llm: "Language model",
  };

  const save = () => {
    if (!f) return;
    if (!f.shop_name.trim()) return setErr(`${t("shopName")} ${t("required")}`);
    setErr(null);
    update.mutate({ data: Object.fromEntries(Object.entries(f).map(([k, v]) => [k, (v as string).trim()])) as Record<Key, string> }, {
      onSuccess: () => { invalidate(); qc.invalidateQueries({ queryKey: getGetMeQueryKey() }); toast({ title: t("saveSuccessToast") }); },
      onError: (e) => setErr(errorMessage(e)),
    });
  };

  return (
    <>
      <PageHeader eyebrow={t("navSettings")} title={t("settingsTitle")} />
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          <Panel className="p-5">
            <h2 className="font-display text-lg font-bold">{t("shopDetails")}</h2>
            <p className="text-sm text-muted-foreground mb-4">{t("settingsTitle")}</p>
            {shop.isLoading && <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>}
            {shop.isError && <ErrorState error={shop.error} onRetry={() => shop.refetch()} />}
            {f && (
              <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save(); }}>
                {FIELD_KEYS.map((k) => (
                  <div key={k} className={cn("space-y-1.5", (k === "address" || k === "shop_name") && "sm:col-span-2")}>
                    <Label htmlFor={`s-${k}`}>{FIELD_LABELS[k]}</Label>
                    <Input id={`s-${k}`} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} data-testid={`input-shop-${k}`} />
                  </div>
                ))}
                {err && <p className="text-sm text-destructive sm:col-span-2" role="alert">{err}</p>}
                <div className="sm:col-span-2 flex justify-end">
                  <Button type="submit" disabled={update.isPending} data-testid="button-save-shop">
                    {update.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}{t("saveSettings")}
                  </Button>
                </div>
              </form>
            )}
          </Panel>

          <Panel className="p-5">
            <h2 className="font-display font-bold mb-3">{t("languageSelectorTitle")}</h2>
            <p className="text-sm text-muted-foreground mb-4">{t("voiceSubtitle")}</p>
            <LanguageSelector />
          </Panel>
        </div>

        <Panel className="h-fit">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-display font-bold">{t("systemStatus")}</h2>
            <span className="text-xs text-muted-foreground">API {health.data?.status ?? (health.isError ? "unreachable" : "...")}</span>
          </div>
          {status.isLoading && <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6" />)}</div>}
          {status.isError && <div className="p-4"><ErrorState error={status.error} onRetry={() => status.refetch()} /></div>}
          {status.data && (
            <>
              <ul className="divide-y">
                {Object.entries(LABELS).map(([k, l]) => {
                  const v = String((status.data as unknown as Record<string, string>)[k] ?? "unknown");
                  const good = /^(ok|ready|connected|available|healthy|up|active|enabled)$/i.test(v);
                  return (
                    <li key={k} className="flex items-center justify-between px-4 py-2.5 text-sm" data-testid={`status-${k}`}>
                      <span>{l}</span>
                      <span className={cn("inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold", good ? "bg-payment-soft text-payment" : "bg-muted text-muted-foreground")}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", good ? "bg-[hsl(168_58%_30%)]" : "bg-muted-foreground")} />{v.replace(/_/g, " ")}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {(status.data as any).documentation_url && (
                <a href={(status.data as any).documentation_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 border-t px-4 py-3 text-sm font-medium text-primary hover:underline" data-testid="link-docs">
                  Integration docs <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </>
          )}
        </Panel>
      </div>
    </>
  );
}
