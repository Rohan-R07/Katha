import type { Transaction } from "@workspace/api-client-react";
import { SignedAmount, TypePill } from "@/components/khata-ui";
import { businessDateTime } from "@/lib/khata";
import { useI18n } from "@/lib/i18n";

export function TxnList({ items, onOpen, showCustomer = true }: { items: Transaction[]; onOpen: (id: string) => void; showCustomer?: boolean }) {
  const { t } = useI18n();
  return (
    <ul className="divide-y">
      {items.map((txn) => (
        <li key={txn.id}>
          <button onClick={() => onOpen(txn.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:outline-none" data-testid={`row-txn-${txn.id}`}>
            <div className="w-20 shrink-0 text-xs text-muted-foreground num leading-tight">
              {businessDateTime(txn.created_at, { day: "2-digit", month: "short" })}<br />
              {businessDateTime(txn.created_at, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })} IST
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {showCustomer && <span className="truncate font-semibold text-sm">{txn.customer_name}</span>}
                <TypePill t={txn} />
              </div>
              <p className="truncate text-xs text-muted-foreground">{txn.description || (txn.reversal_of ? t("reversed") : t("notes"))}</p>
            </div>
            <SignedAmount t={txn} className="text-sm" />
          </button>
        </li>
      ))}
    </ul>
  );
}
