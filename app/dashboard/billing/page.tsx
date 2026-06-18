'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { formatPrice, getCategoryIcon } from '@/lib/utils';
import {
  Search, Plus, Minus, Trash2, Printer, RotateCcw, Receipt, ShoppingCart,
  Clock, ChevronDown, ChevronUp,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  pricing?: { full?: number; half?: number; qtr?: number; piece?: number };
  is_available: boolean;
}

interface BillLineItem {
  id: string;
  name: string;
  category: string;
  price: number;
  qty: number;
  subtotal: number;
}

interface Restaurant {
  id: string;
  name: string;
  phone: string;
  location: string;
  billing_enabled: boolean;
}

interface SavedBill {
  id: string;
  invoice_no: string;
  items: BillLineItem[];
  total: number;
  note: string;
  created_at: string | null;
}

/* ─── Helper ─────────────────────────────────────────────────────────────── */
function getEffectivePrice(item: MenuItem): number {
  const p = item.pricing;
  if (p) {
    if (p.full !== undefined) return p.full;
    if (p.half !== undefined) return p.half;
    if (p.piece !== undefined) return p.piece;
    if (p.qtr !== undefined) return p.qtr;
  }
  return item.price;
}

/* ─── Print via new window (reliable for thermal printers) ──────────────── */
function openPrintWindow(restaurant: Restaurant, bill: BillLineItem[], invoiceNo: string, note: string) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const total = bill.reduce((s, i) => s + i.subtotal, 0);

  const DASH = '--------------------------------';
  const EQ   = '================================';

  // Build items rows — fixed-width text layout
  const itemRows = bill.map((item) => {
    const name = item.name.length > 14 ? item.name.slice(0, 13) + '…' : item.name.padEnd(14);
    const qty  = String(item.qty).padStart(3);
    const rate = String(item.price.toFixed(0)).padStart(6);
    const amt  = String(item.subtotal.toFixed(0)).padStart(7);
    return `${name}${qty}${rate}${amt}`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Bill ${invoiceNo}</title>
  <style>
    @page { size: 58mm auto; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10px;
      line-height: 1.4;
      width: 58mm;
      padding: 3mm 2mm 5mm;
      background: #fff;
      color: #000;
    }
    .center { text-align: center; }
    .bold   { font-weight: bold; }
    .lg     { font-size: 13px; }
    .sm     { font-size: 9px; }
    .divider{ letter-spacing: -0.5px; white-space: pre; margin: 3px 0; }
    .row    { display: flex; justify-content: space-between; }
    .meta   { margin: 2px 0; display: flex; gap: 4px; }
    .meta-label { min-width: 68px; }
    pre     { white-space: pre; font-family: inherit; font-size: 9.5px; }
    .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 12px; margin-top: 4px; }
    .footer { text-align: center; font-size: 8px; color: #555; margin-top: 6px; }
  </style>
</head>
<body>
  <div class="center bold lg">${restaurant.name}</div>
  ${restaurant.location ? `<div class="center sm">${restaurant.location}</div>` : ''}
  ${restaurant.phone ? `<div class="center sm">Ph: ${restaurant.phone}</div>` : ''}
  <div class="divider">${DASH}</div>

  <div class="meta"><span class="meta-label">Invoice No. :</span><span>${invoiceNo}</span></div>
  <div class="meta"><span class="meta-label">Date        :</span><span>${dateStr}</span></div>
  <div class="meta"><span class="meta-label">Time        :</span><span>${timeStr}</span></div>
  ${note ? `<div class="meta"><span class="meta-label">Note        :</span><span>${note}</span></div>` : ''}

  <div class="divider">${EQ}</div>
  <pre>Item            Qty  Rate    Amt
${DASH}
${itemRows}
${DASH}</pre>

  <div class="total-row">
    <span>TOTAL</span>
    <span>Rs. ${total.toFixed(0)}</span>
  </div>

  <div class="divider" style="margin-top:6px">${EQ}</div>
  <div class="footer">Thank you for visiting!<br/>Powered by MenuQR</div>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=320,height=500,toolbar=0,menubar=0,scrollbars=1');
  if (!w) {
    alert('Popup blocked! Please allow popups for this site to print bills.');
    return;
  }
  w.document.write(html);
  w.document.close();
  // Give browser time to render before printing
  w.onload = () => { w.focus(); w.print(); };
  // Fallback if onload already fired
  setTimeout(() => { try { w.focus(); w.print(); } catch { /* already closed */ } }, 400);
}

/* ─── Saved bill row component ──────────────────────────────────────────── */
function SavedBillRow({ bill, restaurant }: { bill: SavedBill; restaurant: Restaurant }) {
  const [open, setOpen] = useState(false);
  const dateStr = bill.created_at
    ? new Date(bill.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <div style={{ borderBottom: '1px solid var(--db-border)' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }}
        onClick={() => setOpen((o) => !o)}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--db-accent)' }}>{bill.invoice_no}</span>
            {bill.note && <span className="db-badge db-badge-muted" style={{ fontSize: '0.68rem' }}>{bill.note}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <Clock size={11} style={{ color: 'var(--db-text-muted)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--db-text-muted)' }}>{dateStr}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--db-text-muted)' }}>·</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--db-text-muted)' }}>{bill.items.length} item{bill.items.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--db-text)', flexShrink: 0 }}>{formatPrice(bill.total)}</span>
        <button
          onClick={(e) => { e.stopPropagation(); openPrintWindow(restaurant, bill.items, bill.invoice_no, bill.note); }}
          style={{ padding: '5px 10px', borderRadius: 8, border: '1.5px solid var(--db-border-2)', background: 'var(--db-surface-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--db-text-2)', flexShrink: 0 }}
          title="Reprint this bill"
        >
          <Printer size={12} /> Reprint
        </button>
        {open ? <ChevronUp size={14} style={{ color: 'var(--db-text-muted)', flexShrink: 0 }} /> : <ChevronDown size={14} style={{ color: 'var(--db-text-muted)', flexShrink: 0 }} />}
      </div>
      {open && (
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ background: 'var(--db-surface-2)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px 56px 56px', gap: 8, padding: '6px 12px', borderBottom: '1px solid var(--db-border)', fontSize: '0.68rem', fontWeight: 700, color: 'var(--db-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <span>Item</span><span style={{ textAlign: 'center' }}>Qty</span><span style={{ textAlign: 'right' }}>Rate</span><span style={{ textAlign: 'right' }}>Amt</span>
            </div>
            {bill.items.map((item, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 48px 56px 56px', gap: 8, padding: '6px 12px', borderBottom: i < bill.items.length - 1 ? '1px solid var(--db-border)' : 'none', fontSize: '0.8rem', color: 'var(--db-text)' }}>
                <span>{item.name}</span>
                <span style={{ textAlign: 'center' }}>{item.qty}</span>
                <span style={{ textAlign: 'right', color: 'var(--db-text-muted)' }}>{formatPrice(item.price)}</span>
                <span style={{ textAlign: 'right', fontWeight: 600 }}>{formatPrice(item.subtotal)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main billing content ───────────────────────────────────────────────── */
function BillingContent() {
  const { success, error: toastError } = useToast();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  // Bill state
  const [bill, setBill] = useState<BillLineItem[]>([]);
  const [note, setNote] = useState('');
  /**
   * Once a bill is saved, we store its invoice number here.
   * Subsequent "Print" clicks reprint WITHOUT creating a new bill.
   * Cleared only on "New Bill".
   */
  const [savedInvoiceNo, setSavedInvoiceNo] = useState<string | null>(null);

  // Filter state
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Recent bills
  const [recentBills, setRecentBills] = useState<SavedBill[]>([]);
  const [billsLoading, setBillsLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [homeRes, menuRes] = await Promise.all([
          fetch('/api/dashboard/home'),
          fetch('/api/dashboard/menu'),
        ]);
        const homeData = await homeRes.json();
        const menuData = await menuRes.json();

        if (homeData.error) throw new Error(homeData.error);
        if (!homeData.restaurant.billing_enabled) {
          setAccessDenied(true);
          return;
        }
        setRestaurant(homeData.restaurant);

        const items: MenuItem[] = (menuData.items || []).filter((i: MenuItem) => i.is_available !== false);
        setMenuItems(items);
        const cats = [...new Set(items.map((i: MenuItem) => i.category))];
        setCategories(cats);

        // Load recent bills
        loadRecentBills();
      } catch (err) {
        toastError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function loadRecentBills() {
    setBillsLoading(true);
    try {
      const res = await fetch('/api/dashboard/bills');
      const data = await res.json();
      if (res.ok) setRecentBills(data.bills || []);
    } catch { /* silent */ }
    finally { setBillsLoading(false); }
  }

  /* ── Bill helpers ──────────────────────────────────────────────────── */
  function addItem(item: MenuItem) {
    // If bill was already saved, editing it means we treat it as a NEW unsaved bill
    setSavedInvoiceNo(null);
    const price = getEffectivePrice(item);
    setBill((prev) => {
      const existing = prev.find((b) => b.id === item.id);
      if (existing) {
        return prev.map((b) =>
          b.id === item.id ? { ...b, qty: b.qty + 1, subtotal: (b.qty + 1) * b.price } : b
        );
      }
      return [...prev, { id: item.id, name: item.name, category: item.category, price, qty: 1, subtotal: price }];
    });
  }

  function adjustQty(id: string, delta: number) {
    setSavedInvoiceNo(null); // editing invalidates the saved bill
    setBill((prev) =>
      prev
        .map((b) => b.id === id ? { ...b, qty: b.qty + delta, subtotal: (b.qty + delta) * b.price } : b)
        .filter((b) => b.qty > 0)
    );
  }

  function removeItem(id: string) {
    setSavedInvoiceNo(null);
    setBill((prev) => prev.filter((b) => b.id !== id));
  }

  function clearBill() {
    setBill([]);
    setNote('');
    setSavedInvoiceNo(null);
  }

  const total = bill.reduce((s, i) => s + i.subtotal, 0);

  /* ── Print (always safe to call — doesn't save) ─────────────────────── */
  function doPrint(invoiceNo: string) {
    if (!restaurant || bill.length === 0) return;
    openPrintWindow(restaurant, bill, invoiceNo, note);
  }

  /* ── Save bill (only if not already saved) ─────────────────────────── */
  async function saveBill(): Promise<string | null> {
    if (savedInvoiceNo) return savedInvoiceNo; // already saved — reuse
    setSaving(true);
    try {
      const res = await fetch('/api/dashboard/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: bill, subtotal: total, total, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save bill');
      setSavedInvoiceNo(data.invoice_no);
      success(`Bill ${data.invoice_no} saved!`);
      loadRecentBills(); // refresh history
      return data.invoice_no as string;
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Error saving bill');
      return null;
    } finally {
      setSaving(false);
    }
  }

  /* ── Button handlers ─────────────────────────────────────────────────── */
  async function handlePrint() {
    if (bill.length === 0) { toastError('Add items to generate a bill'); return; }
    const invoiceNo = await saveBill();
    if (invoiceNo) doPrint(invoiceNo);
  }

  async function handleSaveNew() {
    if (bill.length === 0) { toastError('Add items to generate a bill'); return; }
    await saveBill();
    clearBill();
  }

  /* ── Filtered items ─────────────────────────────────────────────────── */
  const filteredItems = menuItems.filter((item) => {
    const matchesCat = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  /* ── Render ──────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
          <div style={{ width: 32, height: 32, border: '3px solid var(--db-border)', borderTopColor: 'var(--db-accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </DashboardLayout>
    );
  }

  if (accessDenied) {
    return (
      <DashboardLayout>
        <div className="db-card" style={{ padding: 48, textAlign: 'center' }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>🔒</p>
          <p style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--db-text)', marginBottom: 8 }}>Billing Not Enabled</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--db-text-muted)' }}>
            This feature is not enabled for your account. Please contact the admin to get access.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const billIsSaved = !!savedInvoiceNo;

  return (
    <DashboardLayout restaurantName={restaurant?.name} billingEnabled>
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Header */}
        <div>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 700, color: 'var(--db-text)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Receipt size={24} style={{ color: 'var(--db-accent)' }} /> Bill Generator
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--db-text-muted)' }}>Select items, then Save & Print or Save & New</p>
        </div>

        {/* Two-panel layout */}
        <div className="billing-layout">
          {/* ── Left: Item selector ──────────────────────────────────── */}
          <div className="db-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 480 }}>
            {/* Search */}
            <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--db-border)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--db-text-muted)', pointerEvents: 'none' }} />
                <input
                  type="search"
                  placeholder="Search items…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="db-search"
                  style={{ paddingLeft: 36, height: 38 }}
                />
              </div>
            </div>

            {/* Category tabs */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '10px 14px', borderBottom: '1px solid var(--db-border)' }}>
              {['All', ...categories].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`db-tab${activeCategory === cat ? ' active' : ''}`}
                  style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                >
                  {cat === 'All' ? '🍽️ All' : `${getCategoryIcon(cat)} ${cat}`}
                </button>
              ))}
            </div>

            {/* Item grid */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
              {filteredItems.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--db-text-muted)', fontSize: '0.875rem', padding: '32px 0' }}>No items found</p>
              ) : (
                <div className="billing-item-grid">
                  {filteredItems.map((item) => {
                    const price = getEffectivePrice(item);
                    const inBill = bill.find((b) => b.id === item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => addItem(item)}
                        className="billing-item-card"
                        title={`Add ${item.name} to bill`}
                      >
                        <span className="billing-item-icon">{getCategoryIcon(item.category)}</span>
                        <span className="billing-item-name">{item.name}</span>
                        <span className="billing-item-price">{formatPrice(price)}</span>
                        {inBill && (
                          <span className="billing-item-badge">{inBill.qty}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Bill summary ──────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Bill header */}
            <div className="db-card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--db-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShoppingCart size={17} style={{ color: 'var(--db-accent)' }} /> Current Bill
                  {bill.length > 0 && (
                    <span style={{ fontSize: '0.72rem', background: 'var(--db-accent)', color: '#fff', borderRadius: 999, padding: '1px 8px', marginLeft: 4 }}>{bill.length}</span>
                  )}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Saved indicator */}
                  {billIsSaved && (
                    <span className="db-badge db-badge-success" style={{ fontSize: '0.68rem' }}>✓ Saved as {savedInvoiceNo}</span>
                  )}
                  {bill.length > 0 && (
                    <button
                      onClick={clearBill}
                      style={{ fontSize: '0.78rem', color: 'var(--db-text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <RotateCcw size={12} /> New
                    </button>
                  )}
                </div>
              </div>

              {bill.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--db-text-muted)' }}>
                  <ShoppingCart size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <p style={{ fontSize: '0.85rem' }}>No items added yet</p>
                  <p style={{ fontSize: '0.75rem', marginTop: 4 }}>Click items on the left to add them</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {/* Column header */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 88px 32px', gap: 8, padding: '4px 0 8px', borderBottom: '1px solid var(--db-border)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--db-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <span>Item</span>
                    <span style={{ textAlign: 'center' }}>Qty</span>
                    <span style={{ textAlign: 'right' }}>Amt</span>
                  </div>
                  {bill.map((lineItem) => (
                    <div key={lineItem.id} style={{ display: 'grid', gridTemplateColumns: '1fr 88px 32px', gap: 8, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--db-border)' }}>
                      <div>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--db-text)', lineHeight: 1.2 }}>{lineItem.name}</p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--db-text-muted)', marginTop: 1 }}>{formatPrice(lineItem.price)} each</p>
                      </div>
                      {/* Qty stepper */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                        <button
                          onClick={() => adjustQty(lineItem.id, -1)}
                          style={{ width: 24, height: 24, borderRadius: 6, border: '1.5px solid var(--db-border-2)', background: 'var(--db-surface-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--db-text-muted)', flexShrink: 0 }}
                        >
                          <Minus size={11} />
                        </button>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--db-text)', minWidth: 20, textAlign: 'center' }}>{lineItem.qty}</span>
                        <button
                          onClick={() => adjustQty(lineItem.id, 1)}
                          style={{ width: 24, height: 24, borderRadius: 6, border: '1.5px solid var(--db-accent)', background: 'var(--db-accent-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--db-accent)', flexShrink: 0 }}
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                      {/* Subtotal + remove */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--db-text)' }}>{formatPrice(lineItem.subtotal)}</span>
                        <button
                          onClick={() => removeItem(lineItem.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--db-text-muted)', lineHeight: 0 }}
                          title="Remove"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Total row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0 4px', marginTop: 4 }}>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--db-text)' }}>Total</span>
                    <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--db-accent)' }}>{formatPrice(total)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Note field */}
            <div className="db-card" style={{ padding: '14px 18px' }}>
              <label className="db-label" htmlFor="bill-note">Note / Table No. (optional)</label>
              <input
                id="bill-note"
                type="text"
                value={note}
                onChange={(e) => { setSavedInvoiceNo(null); setNote(e.target.value); }}
                placeholder="e.g. Table 4, Parcel, etc."
                className="db-input"
                style={{ marginTop: 4 }}
              />
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Button
                fullWidth
                leftIcon={<Printer size={16} />}
                loading={saving}
                disabled={bill.length === 0}
                onClick={handlePrint}
              >
                {billIsSaved ? 'Reprint Bill' : 'Save & Print Bill'}
              </Button>
              <Button
                fullWidth
                variant="outline"
                leftIcon={<Receipt size={16} />}
                loading={saving}
                disabled={bill.length === 0}
                onClick={handleSaveNew}
              >
                {billIsSaved ? 'Start New Bill' : 'Save & New Bill'}
              </Button>
            </div>

            {bill.length > 0 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', textAlign: 'center' }}>
                {bill.reduce((s, i) => s + i.qty, 0)} items · {bill.length} lines
              </p>
            )}
          </div>
        </div>

        {/* ── Recent Bills ────────────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Clock size={16} style={{ color: 'var(--db-accent)' }} />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--db-text)' }}>Recent Bills</h2>
            <button
              onClick={loadRecentBills}
              style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--db-accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}
            >
              Refresh
            </button>
          </div>
          <div className="db-card" style={{ overflow: 'hidden' }}>
            {billsLoading ? (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <div style={{ width: 24, height: 24, border: '2px solid var(--db-border)', borderTopColor: 'var(--db-accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : recentBills.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--db-text-muted)' }}>
                <Receipt size={32} style={{ opacity: 0.25, marginBottom: 8 }} />
                <p style={{ fontSize: '0.875rem' }}>No bills saved yet</p>
                <p style={{ fontSize: '0.75rem', marginTop: 4 }}>Bills you save will appear here for reprinting</p>
              </div>
            ) : (
              restaurant && recentBills.map((b) => (
                <SavedBillRow key={b.id} bill={b} restaurant={restaurant} />
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function BillingPage() {
  return (
    <ToastProvider>
      <BillingContent />
    </ToastProvider>
  );
}
