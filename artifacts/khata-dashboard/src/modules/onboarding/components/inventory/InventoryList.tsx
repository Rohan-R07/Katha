import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, PricingType, UnitType } from '../../types/inventory';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Scale, 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Calculator, 
  Mic 
} from 'lucide-react';

export const InventoryList: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, theme, t } = useApp();
  
  const isDark = theme === 'black';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPricingType, setSelectedPricingType] = useState<string>('all');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Weight calculator state
  const [calculatorProduct, setCalculatorProduct] = useState<Product | null>(null);
  const [calcWeightGrams, setCalcWeightGrams] = useState<number>(500);

  // Form State for Add / Edit
  const initialForm = {
    name: '',
    nameKannada: '',
    nameHindi: '',
    category: 'Staples & Grains',
    pricingType: 'per_unit' as PricingType,
    pricePerUnit: '0.00',
    unit: 'packet' as UnitType,
    stockQuantity: 50,
    minStockAlert: 10,
    voiceKeywords: '',
    barcode: '',
    emoji: '🌾',
    isAvailable: true,
  };
  const [formData, setFormData] = useState(initialForm);

  // Categories extraction
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add(p.category));
    return Array.from(set);
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchSearch =
        prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.nameKannada?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.nameHindi?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.voiceKeywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCategory = selectedCategory === 'all' || prod.category === selectedCategory;
      const matchPricing = selectedPricingType === 'all' || prod.pricingType === selectedPricingType;

      return matchSearch && matchCategory && matchPricing;
    });
  }, [products, searchQuery, selectedCategory, selectedPricingType]);

  const handleOpenAdd = () => {
    setFormData(initialForm);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      nameKannada: product.nameKannada || '',
      nameHindi: product.nameHindi || '',
      category: product.category,
      pricingType: product.pricingType,
      pricePerUnit: product.priceDecimal ?? String(product.pricePerUnit),
      unit: product.unit,
      stockQuantity: product.stockQuantity,
      minStockAlert: product.minStockAlert,
      voiceKeywords: (product.voiceKeywords || []).join(', '),
      barcode: product.barcode || '',
      emoji: product.emoji || '📦',
      isAvailable: product.isAvailable,
    });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const keywords = formData.voiceKeywords
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    try { if (editingProduct) {
      await updateProduct(editingProduct.id, {
        name: formData.name,
        nameKannada: formData.nameKannada,
        nameHindi: formData.nameHindi,
        category: formData.category,
        pricingType: formData.pricingType,
        pricePerUnit: Number(formData.pricePerUnit),
        priceDecimal: formData.pricePerUnit,
        unit: formData.unit,
        stockQuantity: Number(formData.stockQuantity),
        minStockAlert: Number(formData.minStockAlert),
        voiceKeywords: keywords,
        barcode: formData.barcode,
        emoji: formData.emoji || '📦',
        isAvailable: formData.isAvailable,
      });
      setEditingProduct(null);
    } else {
      await addProduct({
        name: formData.name,
        nameKannada: formData.nameKannada,
        nameHindi: formData.nameHindi,
        category: formData.category,
        pricingType: formData.pricingType,
        pricePerUnit: Number(formData.pricePerUnit),
        priceDecimal: formData.pricePerUnit,
        unit: formData.unit,
        stockQuantity: Number(formData.stockQuantity),
        minStockAlert: Number(formData.minStockAlert),
        voiceKeywords: keywords,
        barcode: formData.barcode,
        emoji: formData.emoji || '📦',
        isAvailable: formData.isAvailable,
      });
      setIsAddModalOpen(false);
    }
    } catch { return; }
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const handleDelete = async (id: string) => {
    try { await deleteProduct(id); } catch { return; }
    setDeletingProductId(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24">
      {/* Header bar */}
      {showSuccessToast && (
        <div className="mb-4 p-3.5 bg-emerald-50 border-2 border-emerald-400 rounded-2xl flex items-center justify-between text-xs font-black text-emerald-900 shadow-md animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span>ವಸ್ತು ಯಶಸ್ವಿಯಾಗಿ ಸೇರಿಸಲಾಗಿದೆ / Product successfully saved & synced!</span>
          </div>
          <button onClick={() => setShowSuccessToast(false)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {t.inventoryTitle}
            </h1>
            <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-200">
              {products.length} Products
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dynamic catalog supporting both Per-Unit & Per-KG loose weights, stock triggers, and multi-lingual voice keywords.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const perKgProd = products.find((p) => p.pricingType === 'per_kg') || products[0];
              setCalculatorProduct(perKgProd);
            }}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Scale className="w-4 h-4 text-blue-600" />
            <span>Weight Calculator</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addProduct}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`p-3 rounded-2xl border shadow-xs mb-6 grid grid-cols-1 sm:grid-cols-12 gap-3 ${
        isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Search */}
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t.searchProducts}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium ${
              isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'border-slate-200 text-slate-900'
            }`}
          />
        </div>

        {/* Category Filter */}
        <div className="sm:col-span-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`w-full text-xs py-2.5 px-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium ${
              isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <option value="all">All Categories ({products.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Pricing Type Filter */}
        <div className="sm:col-span-3">
          <select
            value={selectedPricingType}
            onChange={(e) => setSelectedPricingType(e.target.value)}
            className={`w-full text-xs py-2.5 px-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium ${
              isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <option value="all">All Pricing Types</option>
            <option value="per_unit">Per-Unit (Packet/Piece)</option>
            <option value="per_kg">Per-KG (Loose/Weight)</option>
          </select>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((prod) => {
          const isLowStock = prod.stockQuantity <= prod.minStockAlert && prod.stockQuantity > 0;
          const isOutStock = prod.stockQuantity <= 0;

          return (
            <div
              key={prod.id}
              className={`rounded-2xl border p-4 shadow-xs transition-all flex flex-col justify-between group ${
                isDark ? 'bg-zinc-900 border-zinc-800 text-white hover:border-zinc-700' : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <span className="text-3xl p-1.5 bg-amber-50 rounded-2xl border border-amber-200 shrink-0">
                      {prod.emoji || '📦'}
                    </span>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                        {prod.category}
                      </span>
                      <h2 className={`font-extrabold text-sm mt-1 transition-colors ${
                        isDark ? 'text-white group-hover:text-amber-400' : 'text-slate-900 group-hover:text-amber-700'
                      }`}>
                        {prod.name}
                      </h2>
                      {(prod.nameKannada || prod.nameHindi) && (
                        <div className="text-xs font-bold text-amber-500 mt-0.5">
                          {prod.nameKannada} {prod.nameHindi && `• ${prod.nameHindi}`}
                        </div>
                      )}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
                      prod.pricingType === 'per_kg'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-purple-100 text-purple-800 border border-purple-200'
                    }`}
                  >
                    {prod.pricingType === 'per_kg' ? (
                      <>
                        <Scale className="w-2.5 h-2.5" />
                        <span>Per-KG</span>
                      </>
                    ) : (
                      <>
                        <Package className="w-2.5 h-2.5" />
                        <span>Per-Unit</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Price Display */}
                <div className="mt-3 flex items-baseline justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-xs text-slate-500 font-medium">Selling Price:</span>
                    <div className="text-lg font-black text-slate-900">
                      ₹{prod.pricePerUnit}
                      <span className="text-xs font-normal text-slate-500 ml-1">/ {prod.unit}</span>
                    </div>
                  </div>

                  {/* Stock Status Badge */}
                  <div className="text-right">
                    <span className="text-xs text-slate-500 font-medium">Stock:</span>
                    <div>
                      {isOutStock ? (
                        <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Out of Stock</span>
                        </span>
                      ) : isLowStock ? (
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Low ({prod.stockQuantity} {prod.unit})</span>
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          <span>{prod.stockQuantity} {prod.unit}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Spoken Voice Keywords pill */}
                {prod.voiceKeywords && prod.voiceKeywords.length > 0 && (
                  <div className="mt-2.5 flex items-center gap-1 text-[11px] text-slate-500 flex-wrap">
                    <Mic className="w-3 h-3 text-amber-600 shrink-0" />
                    <span className="font-semibold text-slate-600">Voice tags:</span>
                    {prod.voiceKeywords.slice(0, 3).map((kw, i) => (
                      <span key={i} className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-mono text-[10px]">
                        {kw}
                      </span>
                    ))}
                    {prod.voiceKeywords.length > 3 && (
                      <span className="text-[10px] text-slate-400">+{prod.voiceKeywords.length - 3}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {prod.pricingType === 'per_kg' ? (
                  <button
                    onClick={() => {
                      setCalculatorProduct(prod);
                      setCalcWeightGrams(500);
                    }}
                    className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"
                  >
                    <Scale className="w-3 h-3" />
                    <span>Calc Weight</span>
                  </button>
                ) : (
                  <div className="text-[10px] text-slate-400 font-mono">ID: {prod.id}</div>
                )}

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(prod)}
                    className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                    title={t.editProduct}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingProductId(prod.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title={t.deleteProduct}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Product Modal */}
      {(isAddModalOpen || editingProduct) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-600" />
                <span>{editingProduct ? t.editProduct : t.addProduct}</span>
              </h2>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingProduct(null);
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              {/* Emoji selector for visual village accessibility */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ಚಿತ್ರದ ಐಕಾನ್ (Item Icon / Emoji)
                </label>
                <div className="flex flex-wrap gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  {['🌾', '🍬', '🥛', '🌻', '🍜', '🥣', '🧂', '🍚', '☕', '🌶️', '🧼', '🍫', '🍞', '🍪', '📦'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormData({ ...formData, emoji })}
                      className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all cursor-pointer ${
                        formData.emoji === emoji ? 'bg-amber-500 text-white scale-110 shadow-sm ring-2 ring-amber-300' : 'hover:bg-slate-200'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.productName} (English) *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Sugar (M-Grade) or Sunflower Oil"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Name in Kannada (ಕನ್ನಡ)
                  </label>
                  <input
                    type="text"
                    value={formData.nameKannada}
                    onChange={(e) => setFormData({ ...formData, nameKannada: e.target.value })}
                    placeholder="e.g. ಸಕ್ಕರೆ"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Name in Hindi (हिंदी)
                  </label>
                  <input
                    type="text"
                    value={formData.nameHindi}
                    onChange={(e) => setFormData({ ...formData, nameHindi: e.target.value })}
                    placeholder="e.g. चीनी"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Pricing Model: Per Unit vs Per KG */}
              <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                <label className="block text-xs font-bold text-amber-900 mb-2">
                  {t.pricingType} *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, pricingType: 'per_unit', unit: 'packet' })}
                    className={`p-2.5 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer ${
                      formData.pricingType === 'per_unit'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    <span>Per-Unit (Packet/Piece)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, pricingType: 'per_kg', unit: 'kg' })}
                    className={`p-2.5 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer ${
                      formData.pricingType === 'per_kg'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    <Scale className="w-4 h-4" />
                    <span>Per-KG (Loose/Weight)</span>
                  </button>
                </div>
              </div>

              {/* Price and Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {formData.pricingType === 'per_kg' ? t.pricePerKg : t.pricePerUnit} *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="any"
                      value={formData.pricePerUnit}
                      onChange={(e) => setFormData({ ...formData, pricePerUnit: e.target.value })}
                      className="w-full text-xs pl-7 pr-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 font-bold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.unitType}
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value as UnitType })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="kg">kg (Kilogram)</option>
                    <option value="gram">gram</option>
                    <option value="packet">packet</option>
                    <option value="piece">piece</option>
                    <option value="litre">litre</option>
                    <option value="pouch">pouch</option>
                    <option value="bottle">bottle</option>
                    <option value="box">box</option>
                  </select>
                </div>
              </div>

              {/* Category & Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Staples & Grains">Staples & Grains</option>
                    <option value="Dals & Pulses">Dals & Pulses</option>
                    <option value="Flours & Atta">Flours & Atta</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Oils & Ghee">Oils & Ghee</option>
                    <option value="Spices & Seasoning">Spices & Seasoning</option>
                    <option value="Packaged Foods">Packaged Foods</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Personal Care">Personal Care</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.stockQuantity}
                  </label>
                  <input
                    type="number"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-bold"
                  />
                </div>
              </div>

              {/* Voice Keywords for Rohan's Assistant */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Mic className="w-3.5 h-3.5 text-amber-600" />
                  <span>{t.aliases}</span>
                </label>
                <input
                  type="text"
                  value={formData.voiceKeywords}
                  onChange={(e) => setFormData({ ...formData, voiceKeywords: e.target.value })}
                  placeholder="sugar, sakkare, cheeni, shakkara"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Used by Rohan’s Voice Assistant to recognize customer orders accurately.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingProduct(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-extrabold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-md cursor-pointer"
                >
                  {editingProduct ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProductId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center animate-scaleUp">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Delete Product?</h3>
            <p className="text-xs text-slate-500 mt-1">
              This item will be removed from your store catalog and voice assistant dictionary.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={() => setDeletingProductId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingProductId)}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Weight & Price Calculator Modal */}
      {calculatorProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  {t.weightCalculator}
                </h3>
              </div>
              <button
                onClick={() => setCalculatorProduct(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 mb-4">
              <div className="text-xs text-blue-800 font-semibold">Selected Item:</div>
              <div className="text-sm font-black text-blue-950">{calculatorProduct.name}</div>
              <div className="text-xs font-bold text-blue-700 mt-0.5">
                Rate: ₹{calculatorProduct.pricePerUnit} / 1 KG
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">Quick Weight Presets:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '100g', grams: 100 },
                  { label: '250g (Paavu)', grams: 250 },
                  { label: '500g (Adha)', grams: 500 },
                  { label: '1 KG', grams: 1000 },
                  { label: '2 KG', grams: 2000 },
                  { label: '5 KG', grams: 5000 },
                ].map((preset) => (
                  <button
                    key={preset.grams}
                    type="button"
                    onClick={() => setCalcWeightGrams(preset.grams)}
                    className={`py-2 px-1 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                      calcWeightGrams === preset.grams
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Or Custom Weight in Grams:
                </label>
                <input
                  type="number"
                  step="10"
                  value={calcWeightGrams}
                  onChange={(e) => setCalcWeightGrams(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-bold"
                />
              </div>

              {/* Calculated Result */}
              <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl text-center mt-4">
                <span className="text-xs text-emerald-800 font-semibold">Calculated Amount:</span>
                <div className="text-3xl font-black text-emerald-900 mt-1">
                  ₹{Math.round(((calculatorProduct.pricePerUnit * calcWeightGrams) / 1000) * 100) / 100}
                </div>
                <div className="text-[11px] text-emerald-700 mt-1">
                  {calcWeightGrams >= 1000
                    ? `${(calcWeightGrams / 1000).toFixed(2)} kg`
                    : `${calcWeightGrams} grams`}{' '}
                  @ ₹{calculatorProduct.pricePerUnit}/kg
                </div>
              </div>
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => setCalculatorProduct(null)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl"
              >
                Close Calculator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
