import { useEffect, useState } from "react";
import { Loader2, Package, Pencil, Plus, Search, Tag } from "lucide-react";
import {
  useListProducts, getListProductsQueryKey, useListCategories, getListCategoriesQueryKey,
  useCreateProduct, useUpdateProduct, useCreateCategory, type Product,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { EmptyState, ErrorState, PageHeader, Panel, RowsSkeleton } from "@/components/khata-ui";
import { AMOUNT_RE, errorMessage, formatINR, REFETCH, useInvalidateLedger } from "@/lib/khata";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export default function Products() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [cat, setCat] = useState("all");
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  const [newCat, setNewCat] = useState("");
  const [catErr, setCatErr] = useState<string | null>(null);
  const { toast } = useToast();
  const invalidate = useInvalidateLedger();
  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  const params = { search: debounced || undefined, category_id: cat === "all" ? undefined : cat };
  const q = useListProducts(params, { query: { queryKey: getListProductsQueryKey(params), refetchInterval: REFETCH } });
  const cats = useListCategories({ query: { queryKey: getListCategoriesQueryKey(), refetchInterval: REFETCH } });
  const createCat = useCreateCategory();

  const addCategory = () => {
    if (!newCat.trim()) return setCatErr("Enter a name");
    createCat.mutate({ data: { category_name: newCat.trim() } }, {
      onSuccess: (c) => { invalidate(); setNewCat(""); setCatErr(null); toast({ title: "Category added", description: c.category_name }); },
      onError: (e) => setCatErr(errorMessage(e)),
    });
  };

  return (
    <>
      <PageHeader eyebrow={t("productsTitle")} title={t("productName")}>
        <Button onClick={() => setEditing(null)} data-testid="button-add-product"><Plus className="h-4 w-4 mr-1.5" />{t("btnAddProduct")}</Button>
      </PageHeader>
      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <div>
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <label htmlFor="product-search" className="sr-only">{t("searchProductsPlaceholder")}</label>
            <Input id="product-search" type="search" className="pl-9" placeholder={t("searchProductsPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search-products" />
          </div>
          {q.isLoading && <RowsSkeleton />}
          {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
          {q.data?.length === 0 && (
            <EmptyState icon={<Package className="h-5 w-5" />} title={debounced || cat !== "all" ? t("noProductsFound") : t("noProductsFound")} body={t("noProductsFound")}>
              <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-1.5" />{t("btnAddProduct")}</Button>
            </EmptyState>
          )}
          {!!q.data?.length && (
            <Panel>
              <ul className="divide-y">
                {q.data.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-2.5" data-testid={`row-product-${p.id}`}>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{p.product_name}</p><p className="text-xs text-muted-foreground">{p.category_name ?? "Uncategorised"}</p></div>
                    <span className="num text-sm font-semibold">{formatINR(p.price)}</span>
                    <Button variant="ghost" size="icon" aria-label={`Edit ${p.product_name}`} onClick={() => setEditing(p)} data-testid={`button-edit-product-${p.id}`}><Pencil className="h-4 w-4" /></Button>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
        <Panel className="h-fit p-4">
          <h2 className="font-display font-bold flex items-center gap-2"><Tag className="h-4 w-4 text-primary" />Categories</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[{ id: "all", category_name: "All" }, ...(cats.data ?? [])].map((c) => (
              <button key={c.id} onClick={() => setCat(c.id)} aria-pressed={cat === c.id} data-testid={`filter-category-${c.id}`}
                className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", cat === c.id ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted")}>{c.category_name}</button>
            ))}
          </div>
          {cats.isError && <p className="mt-2 text-xs text-destructive">Couldn't load categories.</p>}
          <form className="mt-4 space-y-1.5" onSubmit={(e) => { e.preventDefault(); addCategory(); }}>
            <Label htmlFor="new-cat">New category</Label>
            <div className="flex gap-2">
              <Input id="new-cat" maxLength={100} value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="e.g. Pulses" data-testid="input-new-category" />
              <Button type="submit" size="icon" variant="outline" disabled={createCat.isPending} aria-label="Add category" data-testid="button-add-category">{createCat.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}</Button>
            </div>
            {catErr && <p className="text-xs text-destructive">{catErr}</p>}
          </form>
        </Panel>
      </div>
      <ProductDialog product={editing} onClose={() => setEditing(undefined)} categories={cats.data ?? []} />
    </>
  );
}

function ProductDialog({ product, onClose, categories }: { product: Product | null | undefined; onClose: () => void; categories: { id: string; category_name: string }[] }) {
  const open = product !== undefined;
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const invalidate = useInvalidateLedger();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [cat, setCat] = useState("none");
  const [err, setErr] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;
  useEffect(() => { if (open) { setName(product?.product_name ?? ""); setPrice(product?.price ?? ""); setCat(product?.category_id ?? "none"); setErr(null); } }, [open, product]);

  const submit = () => {
    if (!name.trim()) return setErr("Product name is required");
    if (!AMOUNT_RE.test(price.trim())) return setErr("Price must be a number with up to 2 decimals");
    const data = { product_name: name.trim(), price: price.trim(), category_id: cat === "none" ? null : cat };
    const h = { onSuccess: () => { invalidate(); toast({ title: product ? "Product updated" : "Product added" }); onClose(); }, onError: (e: unknown) => setErr(errorMessage(e)) };
    if (product) update.mutate({ productId: product.id, data }, h); else create.mutate({ data }, h);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="font-display text-xl">{product ? "Edit product" : "New product"}</DialogTitle><DialogDescription>Name, price, and optional category.</DialogDescription></DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div className="space-y-1.5"><Label htmlFor="p-name">Product name</Label><Input id="p-name" autoFocus maxLength={150} value={name} onChange={(e) => setName(e.target.value)} data-testid="input-product-name" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="p-price">Price (INR)</Label><Input id="p-price" inputMode="decimal" className="num" value={price} onChange={(e) => setPrice(e.target.value)} data-testid="input-product-price" /></div>
            <div className="space-y-1.5"><Label htmlFor="p-cat">Category</Label>
              <Select value={cat} onValueChange={setCat}><SelectTrigger id="p-cat" data-testid="select-product-category"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">None</SelectItem>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.category_name}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          {err && <p className="text-sm text-destructive" role="alert">{err}</p>}
          <DialogFooter><Button type="button" variant="ghost" onClick={onClose} disabled={pending}>Cancel</Button>
            <Button type="submit" disabled={pending} data-testid="button-save-product">{pending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Save</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
