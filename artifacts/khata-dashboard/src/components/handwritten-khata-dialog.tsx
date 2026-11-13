import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
  Loader2,
  HelpCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  useListCustomers,
  useExtractKhata,
  useSaveKhataBatch,
  getGetSummaryQueryKey,
  getListCustomersQueryKey,
  getListTransactionsQueryKey,
  type ExtractedKhataItem,
  type Customer,
  type OcrExtractResponse,
} from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";

interface EditableItem extends ExtractedKhataItem {
  uid: string;
}

export function HandwrittenKhataDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [step, setStep] = useState<"upload" | "review" | "saving" | "done">("upload");
  const [saveResult, setSaveResult] = useState<{ saved_count: number; message: string } | null>(null);

  const { data: customerList } = useListCustomers(
    undefined,
    {
      query: {
        queryKey: getListCustomersQueryKey(),
        enabled: open,
      },
    }
  );

  const extractMutation = useExtractKhata({
    mutation: {
      onSuccess: (data: OcrExtractResponse) => {
        // Filter out any zero amounts like header/title lines if detected, or let user edit
        const formattedItems: EditableItem[] = (data.extracted_entries || [])
          .filter((it) => parseFloat(it.amount || "0") > 0 || !it.uncertain)
          .map((it, idx) => ({
            ...it,
            uid: it.id || `${Date.now()}_${idx}`,
            is_new_customer: it.matched_customer_id ? false : true,
          }));
        setItems(formattedItems);
        setStep("review");
      },
    },
  });

  const saveBatchMutation = useSaveKhataBatch({
    mutation: {
      onSuccess: (data) => {
        setSaveResult({
          saved_count: data.saved_count,
          message: data.message,
        });
        setStep("done");
        queryClient.invalidateQueries({ queryKey: getGetSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
      },
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (file.type.startsWith("image/")) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleExtract = () => {
    if (!selectedFile) return;
    extractMutation.mutate({
      data: {
        file: selectedFile,
      },
    });
  };

  const handleUpdateItem = (uid: string, field: keyof EditableItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.uid !== uid) return item;
        const updated = { ...item, [field]: value };

        // If customer dropdown changed
        if (field === "matched_customer_id") {
          if (value === "new") {
            updated.is_new_customer = true;
            updated.matched_customer_id = undefined;
          } else {
            updated.is_new_customer = false;
            updated.matched_customer_id = value;
            const found = (customerList || []).find((c: Customer) => c.id === value);
            if (found) {
              updated.customer_name = found.customer_name;
            }
          }
        }
        return updated;
      })
    );
  };

  const handleRemoveItem = (uid: string) => {
    setItems((prev) => prev.filter((i) => i.uid !== uid));
  };

  const handleAddNewRow = () => {
    const newItem: EditableItem = {
      id: `${Date.now()}_manual`,
      uid: `${Date.now()}_manual`,
      customer_name: "Customer",
      transaction_type: "credit",
      amount: "100.00",
      uncertain: false,
      is_new_customer: true,
      description: "Manual entry",
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleConfirmSave = () => {
    if (items.length === 0) return;

    saveBatchMutation.mutate({
      data: {
        entries: items.map((it) => ({
          customer_name: it.customer_name.trim(),
          matched_customer_id: it.is_new_customer ? undefined : it.matched_customer_id,
          is_new_customer: it.is_new_customer,
          transaction_type: it.transaction_type,
          amount: it.amount,
          description: it.description || "Imported from handwritten Khata",
          idempotency_key: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        })),
      },
    });
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setItems([]);
    setStep("upload");
    setSaveResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-display font-bold">
                {t("handwrittenDialogTitle")}
              </DialogTitle>
              <DialogDescription>
                {t("handwrittenDialogDesc")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 py-3 space-y-4">
          {/* STEP 1: UPLOAD */}
          {step === "upload" && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  selectedFile
                    ? "border-primary/50 bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-muted/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Upload className="h-6 w-6" />
                  </div>
                  {selectedFile ? (
                    <div>
                      <p className="font-semibold text-primary">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(selectedFile.size / 1024).toFixed(1)} KB &bull; Click to change file
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold">{t("dropzoneText")}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("dropzoneSubtext")}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {previewUrl && (
                <div className="rounded-lg border bg-muted/30 p-2 max-h-56 flex justify-center overflow-hidden">
                  <img
                    src={previewUrl}
                    alt="Khata Preview"
                    className="object-contain max-h-52 rounded"
                  />
                </div>
              )}

              {extractMutation.isError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Extraction Failed</AlertTitle>
                  <AlertDescription>
                    {extractMutation.error instanceof Error
                      ? extractMutation.error.message
                      : "Could not read handwritten entries. Please verify the image is readable and try again."}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* EXTRACTING LOADER */}
          {extractMutation.isPending && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="space-y-1">
                <h3 className="font-semibold text-base">{t("extractingProgress")}</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  {t("extractingSubtext")}
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: REVIEW & EDIT */}
          {step === "review" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">
                    {t("reviewExtractedTitle")} ({items.length})
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {t("reviewExtractedDesc")}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={handleAddNewRow}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> {t("addRow")}
                </Button>
              </div>

              {items.length === 0 ? (
                <div className="p-8 text-center border rounded-lg bg-muted/20">
                  <HelpCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="font-medium text-sm">No structured transactions detected.</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">
                    The photo might be blurry, or you can add rows manually to verify.
                  </p>
                  <Button size="sm" onClick={handleAddNewRow}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Manual Entry
                  </Button>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden bg-background">
                  <div className="max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted text-xs text-muted-foreground uppercase font-semibold border-b">
                        <tr>
                          <th className="px-3 py-2">{t("customerName")}</th>
                          <th className="px-3 py-2 w-32">{t("typeCol")}</th>
                          <th className="px-3 py-2 w-32">{t("amountCol")} (₹)</th>
                          <th className="px-3 py-2">{t("description")}</th>
                          <th className="px-2 py-2 w-12 text-center">{t("actions")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {items.map((it) => {
                          const isUncertain = it.uncertain;
                          return (
                            <tr
                              key={it.uid}
                              className={`hover:bg-muted/40 transition-colors ${
                                isUncertain ? "bg-amber-500/5" : ""
                              }`}
                            >
                              {/* Customer Name & Link */}
                              <td className="px-3 py-2 space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <Input
                                    value={it.customer_name}
                                    onChange={(e) =>
                                      handleUpdateItem(it.uid, "customer_name", e.target.value)
                                    }
                                    placeholder="Customer name"
                                    className="h-8 text-xs font-medium"
                                  />
                                  {isUncertain && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] px-1 py-0 h-5 border-amber-500 text-amber-600 bg-amber-50 shrink-0"
                                    >
                                      {t("verifyBadge")}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <span>{t("linkToCustomer")}</span>
                                  <Select
                                    value={it.is_new_customer ? "new" : (it.matched_customer_id ?? undefined)}
                                    onValueChange={(val) =>
                                      handleUpdateItem(it.uid, "matched_customer_id", val)
                                    }
                                  >
                                    <SelectTrigger className="h-6 text-[11px] py-0 px-2 w-44">
                                      <SelectValue placeholder="Select customer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="new">{t("createNewCustomerOpt")}</SelectItem>
                                      {(customerList || []).map((cust: Customer) => (
                                        <SelectItem key={cust.id} value={cust.id}>
                                          {cust.customer_name} ({cust.mobile_number || "No mobile"})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </td>

                              {/* Transaction Type */}
                              <td className="px-3 py-2">
                                <Select
                                  value={it.transaction_type}
                                  onValueChange={(val) =>
                                    handleUpdateItem(it.uid, "transaction_type", val)
                                  }
                                >
                                  <SelectTrigger className="h-8 text-xs font-semibold">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="credit" className="text-credit font-medium">
                                      <div className="flex items-center gap-1">
                                        <ArrowUpRight className="h-3 w-3" />
                                        <span>{t("credit")}</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem
                                      value="payment"
                                      className="text-payment font-medium"
                                    >
                                      <div className="flex items-center gap-1">
                                        <ArrowDownLeft className="h-3 w-3" />
                                        <span>{t("payment")}</span>
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>

                              {/* Amount */}
                              <td className="px-3 py-2">
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1.5 text-xs text-muted-foreground">
                                    ₹
                                  </span>
                                  <Input
                                    value={it.amount}
                                    onChange={(e) =>
                                      handleUpdateItem(it.uid, "amount", e.target.value)
                                    }
                                    placeholder="0.00"
                                    className="h-8 pl-6 text-xs font-semibold font-mono"
                                  />
                                </div>
                              </td>

                              {/* Description */}
                              <td className="px-3 py-2">
                                <Input
                                  value={it.description || ""}
                                  onChange={(e) =>
                                    handleUpdateItem(it.uid, "description", e.target.value)
                                  }
                                  placeholder="Optional description"
                                  className="h-8 text-xs text-muted-foreground"
                                />
                              </td>

                              {/* Delete */}
                              <td className="px-2 py-2 text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleRemoveItem(it.uid)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {saveBatchMutation.isError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Save Error</AlertTitle>
                  <AlertDescription>
                    {saveBatchMutation.error instanceof Error
                      ? saveBatchMutation.error.message
                      : "Failed to persist transactions to the database."}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* STEP 3: DONE */}
          {step === "done" && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
              <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="font-bold text-lg">{t("saveBatchSuccessTitle")}</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {saveResult?.message ||
                  `Recorded ${saveResult?.saved_count} transactions into your ledger.`}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-3 flex justify-between items-center sm:justify-between">
          {step === "upload" && (
            <>
              <Button variant="ghost" onClick={handleClose}>
                {t("cancel")}
              </Button>
              <Button
                onClick={handleExtract}
                disabled={!selectedFile || extractMutation.isPending}
                className="gap-1.5"
              >
                {extractMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("extractingProgress")}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {t("extractWithAI")}
                  </>
                )}
              </Button>
            </>
          )}

          {step === "review" && (
            <>
              <Button variant="ghost" onClick={handleReset}>
                {t("backUploadAnother")}
              </Button>
              <Button
                onClick={handleConfirmSave}
                disabled={items.length === 0 || saveBatchMutation.isPending}
                className="gap-1.5"
              >
                {saveBatchMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("savingBatchProgress")}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    {t("confirmBatchSave")} ({items.length})
                  </>
                )}
              </Button>
            </>
          )}

          {step === "done" && (
            <div className="w-full flex justify-end">
              <Button onClick={handleClose}>{t("done")}</Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
