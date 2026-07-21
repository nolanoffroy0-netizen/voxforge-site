import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShoppingCart, X, Plus, Minus, Search, User, Settings, Star, Check,
  ChevronDown, Menu, Trash2, Package, CreditCard, Mail, ArrowRight,
  Filter, Box, Zap, Sparkles, Lightbulb, Bot, Gem, Watch, LogOut,
  ArrowLeft, Edit2, PlusCircle, ShieldCheck, Truck, RotateCw, MapPin,
  Phone, ChevronRight, Loader2, AlertCircle
} from "lucide-react";
import { supabase } from "./supabaseClient";

/* ============================================================
   VOXFORGE — boutique d'objets imprimés en 3D
   ============================================================ */

const CATEGORY_META = {
  "Décoration": { icon: Sparkles, grad: ["#7b61ff", "#00f0ff"] },
  "Luminaires": { icon: Lightbulb, grad: ["#ff2e9a", "#7b61ff"] },
  "Figurines": { icon: Bot, grad: ["#00f0ff", "#35e28f"] },
  "Bijoux": { icon: Gem, grad: ["#ff2e9a", "#ffb020"] },
  "Accessoires": { icon: Watch, grad: ["#35e28f", "#00f0ff"] },
};

const DEFAULT_PRODUCTS = [
  {
    id: "p1", name: "Vase Voronoi", category: "Décoration", material: "Résine",
    color: "Blanc", price: 39.9, stock: 14, customizable: true,
    description: "Un vase à structure alvéolaire générée par algorithme de Voronoï. Chaque face capte la lumière différemment, pour un objet qui ne se répète jamais tout à fait.",
    rating: 4.8, reviews: [
      { author: "Léa M.", note: 5, text: "Pièce maîtresse de mon salon, la texture est bluffante." },
      { author: "Karim B.", note: 4.5, text: "Très beau fini, livraison rapide." },
    ],
  },
  {
    id: "p2", name: "Lampe Prisme", category: "Luminaires", material: "PLA",
    color: "Transparent", price: 64.0, stock: 8, customizable: true,
    description: "Lampe d'appoint en facettes de prisme, diffuse une lumière fragmentée façon cristal taillé. Compatible ampoule LED E14 (non incluse).",
    rating: 4.6, reviews: [
      { author: "Sofia R.", note: 5, text: "L'ambiance qu'elle crée le soir est incroyable." },
    ],
  },
  {
    id: "p3", name: "Figurine Cyber-Renard", category: "Figurines", material: "Résine",
    color: "Multicolore", price: 28.5, stock: 22, customizable: false,
    description: "Renard low-poly aux allures de garde numérique. Détails peints à la main sur base imprimée haute résolution.",
    rating: 4.9, reviews: [
      { author: "Tom D.", note: 5, text: "Qualité de détail impressionnante pour le prix." },
      { author: "Inès V.", note: 5, text: "Exactement comme sur les photos, parfait cadeau." },
    ],
  },
  {
    id: "p4", name: "Bijou Génératif « Nébuleuse »", category: "Bijoux", material: "Résine",
    color: "Argent", price: 22.0, stock: 30, customizable: true,
    description: "Pendentif dont la forme est issue d'une simulation de champ de particules. Finition métallisée, chaîne acier incluse.",
    rating: 4.7, reviews: [
      { author: "Chloé P.", note: 4.5, text: "Très léger à porter, design unique." },
    ],
  },
  {
    id: "p5", name: "Support Casque Origami", category: "Accessoires", material: "PLA",
    color: "Noir", price: 18.9, stock: 40, customizable: false,
    description: "Support de casque audio aux plis géométriques inspirés de l'origami. Base lestée anti-basculement.",
    rating: 4.5, reviews: [
      { author: "Hugo L.", note: 4, text: "Stable et discret sur le bureau." },
    ],
  },
  {
    id: "p6", name: "Horloge Engrenages", category: "Décoration", material: "Nylon",
    color: "Noir", price: 54.0, stock: 6, customizable: false,
    description: "Horloge murale à engrenages apparents, mécanisme silencieux à quartz. Un clin d'œil steampunk assumé.",
    rating: 4.4, reviews: [
      { author: "Marc A.", note: 4, text: "Mouvement des rouages très fluide, bel effet." },
    ],
  },
  {
    id: "p7", name: "Pot Nid d'Abeille", category: "Décoration", material: "PLA",
    color: "Blanc", price: 24.9, stock: 17, customizable: true,
    description: "Cache-pot à motif hexagonal auto-drainant, parfait pour les plantes grasses et succulentes.",
    rating: 4.6, reviews: [
      { author: "Nora S.", note: 5, text: "Le drainage fonctionne vraiment bien, mes cactus adorent." },
    ],
  },
  {
    id: "p8", name: "Masque Facettes", category: "Décoration", material: "Résine",
    color: "Multicolore", price: 46.0, stock: 5, customizable: false,
    description: "Masque mural bas-relief à facettes cristallines, dégradé de teintes iridescentes selon la lumière.",
    rating: 4.9, reviews: [
      { author: "Yanis K.", note: 5, text: "Effet holographique superbe en vrai." },
    ],
  },
];

const FALLBACK_STOCK = 10;
const euros = (n) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

/* ---------------- Persistent storage helpers ----------------
   NOTE: en dehors de l'environnement Claude, window.storage n'existe pas.
   On utilise localStorage pour le panier, les commandes et le profil —
   ce sont des données propres à chaque visiteur, pas besoin de les
   partager. Les produits, eux, viennent maintenant de Supabase (voir
   plus bas), pour que le catalogue et le stock soient les mêmes pour
   tout le monde. */
async function storageGet(key) {
  try {
    const raw = localStorage.getItem(`voxforge:${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
async function storageSet(key, value) {
  try {
    localStorage.setItem(`voxforge:${key}`, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/* ---------------- Supabase: produits partagés ---------------- */
async function fetchProducts() {
  const { data, error } = await supabase.from("products").select("*").order("name");
  if (error) {
    console.error("Erreur chargement produits:", error.message);
    return [];
  }
  return data || [];
}
async function insertProductRemote(product) {
  const { data, error } = await supabase.from("products").insert(product).select().single();
  if (error) throw new Error(error.message);
  return data;
}
async function updateProductRemote(id, patch) {
  const { data, error } = await supabase.from("products").update(patch).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data;
}
async function deleteProductRemote(id) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
async function decrementStockRemote(id, qty) {
  const { error } = await supabase.rpc("decrement_stock", { pid: id, qty });
  if (error) console.error("Erreur mise à jour du stock:", error.message);
}
async function insertOrderRemote(order) {
  const { error } = await supabase.from("orders").insert({
    id: order.id,
    items: order.items,
    shipping_info: order.shippingInfo,
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    status: order.status,
  });
  if (error) console.error("Erreur enregistrement commande:", error.message);
}

/* ---------------- Small UI atoms ---------------- */
function ProductVisual({ category, className = "", spin = false }) {
  const meta = CATEGORY_META[category] || CATEGORY_META["Décoration"];
  const Icon = meta.icon;
  return (
    <div
      className={`vf-visual ${className}`}
      style={{ background: `linear-gradient(135deg, ${meta.grad[0]}22, ${meta.grad[1]}22)` }}
    >
      <div className="vf-visual-grid" />
      <Icon size={56} className={`vf-visual-icon ${spin ? "vf-spin-slow" : ""}`} style={{ color: meta.grad[0] }} strokeWidth={1.3} />
      <div className="vf-scan" />
    </div>
  );
}

function StarRow({ value, size = 14 }) {
  return (
    <div className="vf-flex-center" style={{ gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          fill={value >= i ? "#ffb020" : value >= i - 0.5 ? "#ffb02080" : "none"}
          color={value >= i - 0.5 ? "#ffb020" : "#3a3a52"}
        />
      ))}
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className="vf-toast">
      <Check size={16} color="#0a0a0f" />
      <span>{toast}</span>
    </div>
  );
}

function FormField({ error, className = "", children }) {
  const child = React.cloneElement(children, {
    className: `${children.props.className || ""} ${error ? "vf-input-error" : ""}`.trim(),
  });
  return (
    <div className={className}>
      {child}
      {error && <span className="vf-error-text"><AlertCircle size={12} /> {error}</span>}
    </div>
  );
}

function Qty({ value, onChange, min = 1, max = 99 }) {
  return (
    <div className="vf-qty">
      <button onClick={() => onChange(Math.max(min, value - 1))} aria-label="Diminuer"><Minus size={14} /></button>
      <span>{value}</span>
      <button onClick={() => onChange(Math.min(max, value + 1))} aria-label="Augmenter"><Plus size={14} /></button>
    </div>
  );
}

/* ============================================================
   APP
   ============================================================ */
export default function App() {
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [cart, setCart] = useState([]); // {id, qty}
  const [orders, setOrders] = useState([]);
  const [account, setAccount] = useState(null); // {name, email, isAdmin}
  const [page, setPage] = useState("home");
  const [selectedId, setSelectedId] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastOrder, setLastOrder] = useState(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }, []);

  /* ---- initial load ---- */
  useEffect(() => {
    (async () => {
      const [remoteProducts, storedCart, storedOrders, storedAccount, { data: sessionData }] = await Promise.all([
        fetchProducts(),
        storageGet("cart"),
        storageGet("orders"),
        storageGet("account"),
        supabase.auth.getSession(),
      ]);
      setProducts(remoteProducts);
      if (storedCart) setCart(storedCart);
      if (storedOrders) setOrders(storedOrders);
      if (sessionData?.session?.user) {
        setAccount({ name: storedAccount?.name || sessionData.session.user.email, email: sessionData.session.user.email, isAdmin: true });
      } else if (storedAccount) {
        setAccount(storedAccount);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => { if (!loading) storageSet("cart", cart); }, [cart, loading]);
  useEffect(() => { if (!loading) storageSet("orders", orders); }, [orders, loading]);
  useEffect(() => { if (!loading) storageSet("account", account); }, [account, loading]);

  const refreshProducts = useCallback(async () => {
    setProducts(await fetchProducts());
  }, []);

  const goTo = (p, id = null) => {
    setPage(p);
    setSelectedId(id);
    setMenuOpen(false);
    setCartOpen(false);
    window.scrollTo?.({ top: 0, behavior: "instant" });
  };

  const addToCart = (id, qty = 1) => {
    setCart((c) => {
      const existing = c.find((it) => it.id === id);
      if (existing) {
        return c.map((it) => (it.id === id ? { ...it, qty: it.qty + qty } : it));
      }
      return [...c, { id, qty }];
    });
    showToast("Ajouté au panier");
    setCartOpen(true);
  };

  const updateQty = (id, qty) => {
    setCart((c) => c.map((it) => (it.id === id ? { ...it, qty } : it)));
  };
  const removeFromCart = (id) => setCart((c) => c.filter((it) => it.id !== id));

  const cartDetailed = useMemo(
    () => cart.map((it) => ({ ...it, product: products.find((p) => p.id === it.id) })).filter((it) => it.product),
    [cart, products]
  );
  const subtotal = useMemo(() => cartDetailed.reduce((s, it) => s + it.product.price * it.qty, 0), [cartDetailed]);
  const cartCount = useMemo(() => cart.reduce((s, it) => s + it.qty, 0), [cart]);

  const placeOrder = async (shippingInfo) => {
    const shipping = subtotal >= 50 ? 0 : 4.9;
    const order = {
      id: "VX-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
      date: new Date().toISOString(),
      items: cartDetailed.map((it) => ({ id: it.id, name: it.product.name, qty: it.qty, price: it.product.price })),
      shippingInfo,
      subtotal,
      shipping,
      total: subtotal + shipping,
      status: "Confirmée",
    };
    // Diminue le stock réel côté serveur pour chaque article commandé
    await Promise.all(cart.map((it) => decrementStockRemote(it.id, it.qty)));
    await insertOrderRemote(order);
    await refreshProducts();
    setOrders((o) => [order, ...o]);
    setLastOrder(order);
    setCart([]);
    goTo("confirmation");
  };

  if (loading) {
    return (
      <div className="vf-root vf-loading">
        <style>{CSS}</style>
        <Loader2 className="vf-spin" size={28} />
        <span>Chargement de VOXFORGE…</span>
      </div>
    );
  }

  return (
    <div className="vf-root">
      <style>{CSS}</style>
      <div className="vf-bggrid" />
      <Toast toast={toast} />

      <Navbar
        page={page} goTo={goTo} cartCount={cartCount}
        setCartOpen={setCartOpen} account={account}
        menuOpen={menuOpen} setMenuOpen={setMenuOpen}
      />

      <main>
        {page === "home" && <Home products={products} goTo={goTo} />}
        {page === "shop" && <Shop products={products} goTo={goTo} addToCart={addToCart} />}
        {page === "product" && (
          <ProductDetail
            product={products.find((p) => p.id === selectedId)}
            products={products} goTo={goTo} addToCart={addToCart}
          />
        )}
        {page === "checkout" && (
          <Checkout
            cartDetailed={cartDetailed} subtotal={subtotal}
            goTo={goTo} placeOrder={placeOrder} account={account}
          />
        )}
        {page === "confirmation" && <Confirmation order={lastOrder} goTo={goTo} account={account} />}
        {page === "account" && (
          <Account
            account={account} setAccount={setAccount} orders={orders}
            goTo={goTo} showToast={showToast}
          />
        )}
        {page === "admin" && account?.isAdmin && (
          <Admin products={products} refreshProducts={refreshProducts} showToast={showToast} />
        )}
        {page === "about" && <About goTo={goTo} />}
        {page === "contact" && <ContactFAQ showToast={showToast} />}
      </main>

      <Footer goTo={goTo} />

      <CartDrawer
        open={cartOpen} setOpen={setCartOpen} cartDetailed={cartDetailed}
        subtotal={subtotal} updateQty={updateQty} removeFromCart={removeFromCart}
        goTo={goTo}
      />
    </div>
  );
}

/* ============================================================
   NAVBAR
   ============================================================ */
function Navbar({ page, goTo, cartCount, setCartOpen, account, menuOpen, setMenuOpen }) {
  const links = [
    { id: "home", label: "Accueil" },
    { id: "shop", label: "Boutique" },
    { id: "about", label: "L'atelier" },
    { id: "contact", label: "Contact / FAQ" },
  ];
  return (
    <header className="vf-nav">
      <div className="vf-nav-inner">
        <button className="vf-logo" onClick={() => goTo("home")}>
          <Box size={20} className="vf-logo-icon" />
          <span>VOX<span className="vf-accent">FORGE</span></span>
        </button>

        <nav className="vf-nav-links vf-hide-mobile">
          {links.map((l) => (
            <button key={l.id} onClick={() => goTo(l.id)} className={`vf-navlink ${page === l.id ? "active" : ""}`}>
              {l.label}
            </button>
          ))}
          {account?.isAdmin && (
            <button onClick={() => goTo("admin")} className={`vf-navlink ${page === "admin" ? "active" : ""}`}>
              Admin
            </button>
          )}
        </nav>

        <div className="vf-flex-center" style={{ gap: 8 }}>
          <button className="vf-icon-btn vf-hide-mobile" onClick={() => goTo("account")} aria-label="Compte">
            <User size={19} />
          </button>
          <button className="vf-icon-btn" onClick={() => setCartOpen(true)} aria-label="Panier">
            <ShoppingCart size={19} />
            {cartCount > 0 && <span className="vf-badge">{cartCount}</span>}
          </button>
          <button className="vf-icon-btn vf-show-mobile" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="vf-mobile-menu vf-show-mobile">
          {links.map((l) => (
            <button key={l.id} onClick={() => goTo(l.id)} className="vf-navlink">{l.label}</button>
          ))}
          <button onClick={() => goTo("account")} className="vf-navlink">Mon compte</button>
          {account?.isAdmin && <button onClick={() => goTo("admin")} className="vf-navlink">Admin</button>}
        </div>
      )}
    </header>
  );
}

/* ============================================================
   HOME
   ============================================================ */
function Home({ products, goTo }) {
  const featured = products.slice(0, 4);
  return (
    <div>
      <section className="vf-hero">
        <div className="vf-hero-cube-wrap vf-hide-mobile">
          <div className="vf-cube">
            <div className="vf-face vf-f1" /><div className="vf-face vf-f2" />
            <div className="vf-face vf-f3" /><div className="vf-face vf-f4" />
            <div className="vf-face vf-f5" /><div className="vf-face vf-f6" />
          </div>
        </div>
        <div className="vf-hero-content">
          <span className="vf-eyebrow">Impression 3D · Édition limitée</span>
          <h1 className="vf-h1">
            Des objets qui n'existaient<br />pas avant qu'on les <span className="vf-accent">calcule</span>.
          </h1>
          <p className="vf-lead">
            VOXFORGE conçoit et imprime des pièces génératives — vases, luminaires, figurines, bijoux —
            nées d'algorithmes puis façonnées couche par couche dans notre atelier.
          </p>
          <div className="vf-flex-center" style={{ gap: 12, marginTop: 28, flexWrap: "wrap" }}>
            <button className="vf-btn vf-btn-primary" onClick={() => goTo("shop")}>
              Explorer la boutique <ArrowRight size={16} />
            </button>
            <button className="vf-btn vf-btn-ghost" onClick={() => goTo("about")}>
              Découvrir l'atelier
            </button>
          </div>
        </div>
      </section>

      <section className="vf-section">
        <div className="vf-section-head">
          <h2 className="vf-h2">Pièces phares</h2>
          <button className="vf-link" onClick={() => goTo("shop")}>Tout voir <ChevronRight size={15} /></button>
        </div>
        <div className="vf-grid-cards">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} onClick={() => goTo("product", p.id)} />
          ))}
        </div>
      </section>

      <section className="vf-section vf-strip">
        <div className="vf-strip-item"><Zap size={20} /> <span>Impression sur demande, sans stock dormant</span></div>
        <div className="vf-strip-item"><ShieldCheck size={20} /> <span>Paiement sécurisé</span></div>
        <div className="vf-strip-item"><Truck size={20} /> <span>Livraison offerte dès 50 €</span></div>
        <div className="vf-strip-item"><RotateCw size={20} /> <span>Retours sous 14 jours</span></div>
      </section>
    </div>
  );
}

function ProductCard({ product, onClick }) {
  return (
    <button className="vf-card" onClick={onClick}>
      <ProductVisual category={product.category} className="vf-card-visual" />
      <div className="vf-card-body">
        <div className="vf-card-top">
          <span className="vf-card-cat">{product.category}</span>
          {product.stock <= 6 && product.stock > 0 && <span className="vf-tag-low">Stock limité</span>}
          {product.stock === 0 && <span className="vf-tag-out">Épuisé</span>}
        </div>
        <h3 className="vf-card-title">{product.name}</h3>
        <div className="vf-flex-center" style={{ justifyContent: "space-between", marginTop: 6 }}>
          <StarRow value={product.rating} />
          <span className="vf-price">{euros(product.price)}</span>
        </div>
      </div>
    </button>
  );
}

/* ============================================================
   SHOP + FILTERS
   ============================================================ */
function Shop({ products, goTo, addToCart }) {
  const [query, setQuery] = useState("");
  const [cats, setCats] = useState([]);
  const [mats, setMats] = useState([]);
  const [cols, setCols] = useState([]);
  const [maxPrice, setMaxPrice] = useState(70);
  const [sort, setSort] = useState("pop");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const allCats = [...new Set(products.map((p) => p.category))];
  const allMats = [...new Set(products.map((p) => p.material))];
  const allCols = [...new Set(products.map((p) => p.color))];

  const toggle = (arr, set, val) => set(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);

  let filtered = products.filter((p) =>
    (query === "" || p.name.toLowerCase().includes(query.toLowerCase())) &&
    (cats.length === 0 || cats.includes(p.category)) &&
    (mats.length === 0 || mats.includes(p.material)) &&
    (cols.length === 0 || cols.includes(p.color)) &&
    p.price <= maxPrice
  );
  if (sort === "price-asc") filtered = [...filtered].sort((a, b) => a.price - b.price);
  if (sort === "price-desc") filtered = [...filtered].sort((a, b) => b.price - a.price);
  if (sort === "rating") filtered = [...filtered].sort((a, b) => b.rating - a.rating);

  const clearAll = () => { setCats([]); setMats([]); setCols([]); setMaxPrice(70); setQuery(""); };

  return (
    <div className="vf-section">
      <div className="vf-section-head">
        <h2 className="vf-h2">Boutique</h2>
        <div className="vf-search">
          <Search size={16} />
          <input placeholder="Rechercher un objet…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <button className="vf-btn vf-btn-ghost vf-show-mobile" style={{ marginBottom: 16 }} onClick={() => setFiltersOpen((v) => !v)}>
        <Filter size={15} /> Filtres {filtersOpen ? <X size={14} /> : <ChevronDown size={14} />}
      </button>

      <div className="vf-shop-layout">
        <aside className={`vf-filters ${filtersOpen ? "vf-filters-open" : ""}`}>
          <div className="vf-filter-block">
            <h4>Catégorie</h4>
            {allCats.map((c) => (
              <label key={c} className="vf-check">
                <input type="checkbox" checked={cats.includes(c)} onChange={() => toggle(cats, setCats, c)} />
                {c}
              </label>
            ))}
          </div>
          <div className="vf-filter-block">
            <h4>Matériau</h4>
            {allMats.map((m) => (
              <label key={m} className="vf-check">
                <input type="checkbox" checked={mats.includes(m)} onChange={() => toggle(mats, setMats, m)} />
                {m}
              </label>
            ))}
          </div>
          <div className="vf-filter-block">
            <h4>Couleur</h4>
            {allCols.map((c) => (
              <label key={c} className="vf-check">
                <input type="checkbox" checked={cols.includes(c)} onChange={() => toggle(cols, setCols, c)} />
                {c}
              </label>
            ))}
          </div>
          <div className="vf-filter-block">
            <h4>Prix max : {euros(maxPrice)}</h4>
            <input type="range" min="15" max="70" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="vf-range" />
          </div>
          <button className="vf-link" onClick={clearAll}>Réinitialiser les filtres</button>
        </aside>

        <div style={{ flex: 1 }}>
          <div className="vf-flex-center" style={{ justifyContent: "space-between", marginBottom: 16 }}>
            <span className="vf-muted">{filtered.length} objet{filtered.length > 1 ? "s" : ""}</span>
            <select className="vf-select" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="pop">Popularité</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
              <option value="rating">Mieux notés</option>
            </select>
          </div>
          {filtered.length === 0 ? (
            <div className="vf-empty">
              <AlertCircle size={22} />
              <p>Aucun objet ne correspond à ces filtres.</p>
              <button className="vf-link" onClick={clearAll}>Effacer les filtres</button>
            </div>
          ) : (
            <div className="vf-grid-cards">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} onClick={() => goTo("product", p.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PRODUCT DETAIL
   ============================================================ */
function ProductDetail({ product, products, goTo, addToCart }) {
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState("desc");

  if (!product) {
    return (
      <div className="vf-section vf-empty">
        <p>Cet objet n'est plus disponible.</p>
        <button className="vf-btn vf-btn-ghost" onClick={() => goTo("shop")}>Retour à la boutique</button>
      </div>
    );
  }

  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 3);

  return (
    <div className="vf-section">
      <button className="vf-link" style={{ marginBottom: 18 }} onClick={() => goTo("shop")}>
        <ArrowLeft size={15} /> Retour
      </button>

      <div className="vf-product-layout">
        <ProductVisual category={product.category} className="vf-product-visual" spin />

        <div>
          <span className="vf-card-cat">{product.category}</span>
          <h1 className="vf-h2" style={{ marginTop: 6 }}>{product.name}</h1>
          <div className="vf-flex-center" style={{ gap: 10, margin: "8px 0 16px" }}>
            <StarRow value={product.rating} />
            <span className="vf-muted">{product.rating} · {product.reviews.length} avis</span>
          </div>
          <div className="vf-price-lg">{euros(product.price)}</div>
          <p className="vf-desc">{product.description}</p>

          <div className="vf-spec-grid">
            <div><span className="vf-muted">Matériau</span><br />{product.material}</div>
            <div><span className="vf-muted">Coloris</span><br />{product.color}</div>
            <div><span className="vf-muted">Stock</span><br />{product.stock > 0 ? `${product.stock} disponibles` : "Épuisé"}</div>
            <div><span className="vf-muted">Personnalisable</span><br />{product.customizable ? "Oui" : "Non"}</div>
          </div>

          {product.customizable && (
            <div className="vf-callout">
              <Sparkles size={15} /> Cet objet peut être personnalisé (coloris, taille) — précisez vos souhaits dans les notes de commande.
            </div>
          )}

          <div className="vf-flex-center" style={{ gap: 14, marginTop: 22, flexWrap: "wrap" }}>
            <Qty value={qty} onChange={setQty} max={product.stock || 1} />
            <button
              className="vf-btn vf-btn-primary"
              disabled={product.stock === 0}
              onClick={() => addToCart(product.id, qty)}
            >
              <ShoppingCart size={16} /> {product.stock === 0 ? "Indisponible" : "Ajouter au panier"}
            </button>
          </div>
        </div>
      </div>

      <div className="vf-tabs">
        <button className={`vf-tab ${tab === "desc" ? "active" : ""}`} onClick={() => setTab("desc")}>Description</button>
        <button className={`vf-tab ${tab === "reviews" ? "active" : ""}`} onClick={() => setTab("reviews")}>Avis ({product.reviews.length})</button>
      </div>
      {tab === "reviews" && (
        <div className="vf-reviews">
          {product.reviews.map((r, i) => (
            <div key={i} className="vf-review">
              <div className="vf-flex-center" style={{ justifyContent: "space-between" }}>
                <strong>{r.author}</strong>
                <StarRow value={r.note} size={13} />
              </div>
              <p>{r.text}</p>
            </div>
          ))}
        </div>
      )}

      {related.length > 0 && (
        <div style={{ marginTop: 48 }}>
          <h3 className="vf-h3">Vous aimerez aussi</h3>
          <div className="vf-grid-cards" style={{ marginTop: 16 }}>
            {related.map((p) => <ProductCard key={p.id} product={p} onClick={() => goTo("product", p.id)} />)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   CART DRAWER
   ============================================================ */
function CartDrawer({ open, setOpen, cartDetailed, subtotal, updateQty, removeFromCart, goTo }) {
  return (
    <>
      {open && <div className="vf-overlay" onClick={() => setOpen(false)} />}
      <div className={`vf-drawer ${open ? "open" : ""}`}>
        <div className="vf-drawer-head">
          <h3><ShoppingCart size={18} /> Votre panier</h3>
          <button className="vf-icon-btn" onClick={() => setOpen(false)}><X size={18} /></button>
        </div>
        {cartDetailed.length === 0 ? (
          <div className="vf-empty" style={{ marginTop: 40 }}>
            <Package size={26} />
            <p>Votre panier est vide.</p>
            <button className="vf-btn vf-btn-ghost" onClick={() => { setOpen(false); goTo("shop"); }}>Voir la boutique</button>
          </div>
        ) : (
          <>
            <div className="vf-drawer-items">
              {cartDetailed.map((it) => (
                <div key={it.id} className="vf-drawer-item">
                  <ProductVisual category={it.product.category} className="vf-drawer-thumb" />
                  <div style={{ flex: 1 }}>
                    <div className="vf-flex-center" style={{ justifyContent: "space-between" }}>
                      <strong>{it.product.name}</strong>
                      <button className="vf-icon-btn small" onClick={() => removeFromCart(it.id)}><Trash2 size={14} /></button>
                    </div>
                    <span className="vf-muted">{euros(it.product.price)}</span>
                    <div style={{ marginTop: 6 }}>
                      <Qty value={it.qty} onChange={(q) => updateQty(it.id, q)} max={it.product.stock} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="vf-drawer-foot">
              <div className="vf-flex-center" style={{ justifyContent: "space-between", marginBottom: 12 }}>
                <span>Sous-total</span>
                <strong>{euros(subtotal)}</strong>
              </div>
              <span className="vf-muted" style={{ fontSize: 12 }}>Livraison calculée à l'étape suivante — offerte dès 50 €.</span>
              <button className="vf-btn vf-btn-primary" style={{ width: "100%", marginTop: 14 }} onClick={() => { setOpen(false); goTo("checkout"); }}>
                Commander <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ============================================================
   CHECKOUT
   ============================================================ */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function luhnValid(num) {
  const digits = num.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d; alt = !alt;
  }
  return sum % 10 === 0;
}

function expiryValid(exp) {
  const m = exp.match(/^(\d{2})\/(\d{2})$/);
  if (!m) return false;
  const month = parseInt(m[1], 10);
  const year = 2000 + parseInt(m[2], 10);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const expDate = new Date(year, month, 0, 23, 59, 59);
  return expDate >= now;
}

function Checkout({ cartDetailed, subtotal, goTo, placeOrder, account }) {
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [shipping, setShipping] = useState({
    name: account?.name || "", email: account?.email || "", address: "", city: "", zip: "", phone: "", notes: "",
  });
  const [card, setCard] = useState({ number: "", expiry: "", cvc: "", name: "" });
  const [attemptedStep2, setAttemptedStep2] = useState(false);
  const [attemptedStep3, setAttemptedStep3] = useState(false);
  const shippingFee = subtotal >= 50 ? 0 : 4.9;
  const total = subtotal + shippingFee;

  if (cartDetailed.length === 0 && step !== 3) {
    return (
      <div className="vf-section vf-empty">
        <Package size={24} />
        <p>Votre panier est vide.</p>
        <button className="vf-btn vf-btn-primary" onClick={() => goTo("shop")}>Voir la boutique</button>
      </div>
    );
  }

  const shippingErrors = {
    name: shipping.name.trim().length < 2 ? "Indiquez votre nom complet." : "",
    email: !EMAIL_RE.test(shipping.email) ? "Adresse email invalide." : "",
    address: shipping.address.trim().length < 4 ? "Indiquez une adresse complète." : "",
    city: shipping.city.trim().length < 2 ? "Indiquez une ville." : "",
    zip: !/^\d{5}$/.test(shipping.zip) ? "Le code postal doit contenir 5 chiffres." : "",
    phone: shipping.phone && !/^[0-9+ .()-]{6,}$/.test(shipping.phone) ? "Numéro de téléphone invalide." : "",
  };
  const shippingValid = Object.values(shippingErrors).every((e) => !e);

  const cardDigits = card.number.replace(/\s/g, "");
  const cardErrors = {
    name: card.name.trim().length < 2 ? "Indiquez le nom du titulaire." : "",
    number: cardDigits.length < 13 ? "Numéro de carte incomplet." : !luhnValid(cardDigits) ? "Numéro de carte invalide." : "",
    expiry: card.expiry.length < 5 ? "Format attendu : MM/AA." : !expiryValid(card.expiry) ? "Date d'expiration invalide ou passée." : "",
    cvc: card.cvc.length < 3 ? "3 ou 4 chiffres requis." : "",
  };
  const cardValid = Object.values(cardErrors).every((e) => !e);

  const formatCard = (v) => v.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
  const formatExpiry = (v) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  const tryContinueToPayment = () => {
    setAttemptedStep2(true);
    if (shippingValid) setStep(3);
  };

  const submitPayment = () => {
    setAttemptedStep3(true);
    if (!cardValid) return;
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      placeOrder(shipping);
    }, 1100);
  };

  const field = (key, errors, attempted, value) => (attempted || value) ? errors[key] : "";

  return (
    <div className="vf-section vf-checkout">
      <div className="vf-steps">
        {["Panier", "Livraison", "Paiement"].map((s, i) => (
          <div key={s} className={`vf-step ${step === i + 1 ? "active" : ""} ${step > i + 1 ? "done" : ""}`}>
            <span className="vf-step-dot">{step > i + 1 ? <Check size={12} /> : i + 1}</span> {s}
          </div>
        ))}
      </div>

      <div className="vf-checkout-layout">
        <div className="vf-checkout-main">
          {step === 1 && (
            <div>
              <h3 className="vf-h3">Votre panier</h3>
              {cartDetailed.map((it) => (
                <div key={it.id} className="vf-cline">
                  <span>{it.product.name} × {it.qty}</span>
                  <strong>{euros(it.product.price * it.qty)}</strong>
                </div>
              ))}
              <button className="vf-btn vf-btn-primary" style={{ marginTop: 18 }} onClick={() => setStep(2)}>
                Continuer <ArrowRight size={16} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="vf-h3"><MapPin size={16} /> Adresse de livraison</h3>
              <div className="vf-form-grid">
                <FormField error={field("name", shippingErrors, attemptedStep2, shipping.name)}>
                  <input placeholder="Nom complet" value={shipping.name} onChange={(e) => setShipping({ ...shipping, name: e.target.value })} />
                </FormField>
                <FormField error={field("email", shippingErrors, attemptedStep2, shipping.email)}>
                  <input placeholder="Email" value={shipping.email} onChange={(e) => setShipping({ ...shipping, email: e.target.value })} />
                </FormField>
                <FormField error={field("address", shippingErrors, attemptedStep2, shipping.address)} className="vf-span2">
                  <input placeholder="Adresse" value={shipping.address} onChange={(e) => setShipping({ ...shipping, address: e.target.value })} />
                </FormField>
                <FormField error={field("city", shippingErrors, attemptedStep2, shipping.city)}>
                  <input placeholder="Ville" value={shipping.city} onChange={(e) => setShipping({ ...shipping, city: e.target.value })} />
                </FormField>
                <FormField error={field("zip", shippingErrors, attemptedStep2, shipping.zip)}>
                  <input placeholder="Code postal (5 chiffres)" value={shipping.zip} onChange={(e) => setShipping({ ...shipping, zip: e.target.value.replace(/\D/g, "").slice(0, 5) })} />
                </FormField>
                <FormField error={field("phone", shippingErrors, attemptedStep2, shipping.phone)}>
                  <input placeholder="Téléphone (optionnel)" value={shipping.phone} onChange={(e) => setShipping({ ...shipping, phone: e.target.value })} />
                </FormField>
                <textarea placeholder="Notes de commande (personnalisation, instructions…)" className="vf-span2" value={shipping.notes} onChange={(e) => setShipping({ ...shipping, notes: e.target.value })} />
              </div>
              {attemptedStep2 && !shippingValid && (
                <div className="vf-form-alert"><AlertCircle size={15} /> Merci de corriger les champs indiqués en rouge avant de continuer.</div>
              )}
              <div className="vf-flex-center" style={{ gap: 10, marginTop: 18 }}>
                <button className="vf-btn vf-btn-ghost" onClick={() => setStep(1)}><ArrowLeft size={15} /> Retour</button>
                <button className="vf-btn vf-btn-primary" onClick={tryContinueToPayment}>
                  Continuer vers le paiement <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 className="vf-h3"><CreditCard size={16} /> Paiement</h3>
              <div className="vf-form-grid">
                <FormField error={field("name", cardErrors, attemptedStep3, card.name)} className="vf-span2">
                  <input placeholder="Nom sur la carte" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} />
                </FormField>
                <FormField error={field("number", cardErrors, attemptedStep3, card.number)} className="vf-span2">
                  <input placeholder="Numéro de carte" inputMode="numeric" value={card.number} onChange={(e) => setCard({ ...card, number: formatCard(e.target.value) })} />
                </FormField>
                <FormField error={field("expiry", cardErrors, attemptedStep3, card.expiry)}>
                  <input placeholder="MM/AA" inputMode="numeric" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })} />
                </FormField>
                <FormField error={field("cvc", cardErrors, attemptedStep3, card.cvc)}>
                  <input placeholder="CVC" inputMode="numeric" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
                </FormField>
              </div>
              {attemptedStep3 && !cardValid && (
                <div className="vf-form-alert"><AlertCircle size={15} /> Merci de corriger les champs indiqués en rouge avant de payer.</div>
              )}
              <div className="vf-callout" style={{ marginTop: 14 }}>
                <ShieldCheck size={15} /> Paiement simulé pour cette démo — aucune carte réelle n'est débitée. Prêt à être branché sur Stripe/PayPal en production.
              </div>
              <div className="vf-flex-center" style={{ gap: 10, marginTop: 18 }}>
                <button className="vf-btn vf-btn-ghost" onClick={() => setStep(2)}><ArrowLeft size={15} /> Retour</button>
                <button className="vf-btn vf-btn-primary" disabled={processing} onClick={submitPayment}>
                  {processing ? <><Loader2 size={16} className="vf-spin" /> Traitement…</> : <>Payer {euros(total)}</>}
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="vf-summary">
          <h4>Récapitulatif</h4>
          <div className="vf-cline"><span>Sous-total</span><span>{euros(subtotal)}</span></div>
          <div className="vf-cline"><span>Livraison</span><span>{shippingFee === 0 ? "Offerte" : euros(shippingFee)}</span></div>
          <div className="vf-cline vf-cline-total"><span>Total</span><span>{euros(total)}</span></div>
        </aside>
      </div>
    </div>
  );
}

function Confirmation({ order, goTo, account }) {
  if (!order) {
    return (
      <div className="vf-section vf-empty">
        <p>Aucune commande récente.</p>
        <button className="vf-btn vf-btn-primary" onClick={() => goTo("shop")}>Voir la boutique</button>
      </div>
    );
  }
  return (
    <div className="vf-section vf-empty" style={{ maxWidth: 560, margin: "0 auto" }}>
      <div className="vf-confirm-icon"><Check size={30} /></div>
      <h2 className="vf-h2">Commande confirmée</h2>
      <p className="vf-muted">Référence <strong>{order.id}</strong></p>
      <div className="vf-callout" style={{ marginTop: 16, width: "100%" }}>
        <Mail size={15} /> Un email de confirmation a été envoyé à {order.shippingInfo.email}.
      </div>
      <div className="vf-summary" style={{ width: "100%", marginTop: 20 }}>
        {order.items.map((it) => (
          <div key={it.id} className="vf-cline"><span>{it.name} × {it.qty}</span><span>{euros(it.price * it.qty)}</span></div>
        ))}
        <div className="vf-cline vf-cline-total"><span>Total payé</span><span>{euros(order.total)}</span></div>
      </div>
      <div className="vf-flex-center" style={{ gap: 10, marginTop: 22 }}>
        <button className="vf-btn vf-btn-ghost" onClick={() => goTo("shop")}>Continuer mes achats</button>
        <button className="vf-btn vf-btn-primary" onClick={() => goTo("account")}>Voir mes commandes</button>
      </div>
    </div>
  );
}

/* ============================================================
   ACCOUNT
   ============================================================ */
function Account({ account, setAccount, orders, goTo, showToast }) {
  const [mode, setMode] = useState("client"); // "client" | "admin"
  const [form, setForm] = useState({ name: "", email: "" });
  const [adminForm, setAdminForm] = useState({ email: "", password: "" });
  const [attempted, setAttempted] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");

  if (!account) {
    const nameError = form.name.trim().length < 2 ? "Indiquez votre nom (2 caractères min)." : "";
    const emailError = !EMAIL_RE.test(form.email) ? "Adresse email invalide." : "";
    const valid = !nameError && !emailError;

    const submitClient = () => {
      setAttempted(true);
      if (!valid) return;
      setAccount({ name: form.name, email: form.email, isAdmin: false });
      showToast(`Bienvenue, ${form.name}`);
    };

    const submitAdmin = async (e) => {
      e.preventDefault();
      setAdminError("");
      setAdminLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: adminForm.email,
        password: adminForm.password,
      });
      setAdminLoading(false);
      if (error) {
        setAdminError("Email ou mot de passe incorrect.");
        return;
      }
      setAccount({ name: data.user.email, email: data.user.email, isAdmin: true });
      showToast("Connecté en tant qu'administrateur");
    };

    return (
      <div className="vf-section" style={{ maxWidth: 420, margin: "0 auto" }}>
        <h2 className="vf-h2">Connexion</h2>
        <div className="vf-tabs" style={{ marginTop: 10, marginBottom: 18 }}>
          <button className={`vf-tab ${mode === "client" ? "active" : ""}`} onClick={() => setMode("client")}>Je suis client</button>
          <button className={`vf-tab ${mode === "admin" ? "active" : ""}`} onClick={() => setMode("admin")}>Je suis l'administrateur</button>
        </div>

        {mode === "client" ? (
          <>
            <p className="vf-muted" style={{ marginBottom: 18 }}>Démo : entrez simplement un nom et un email pour créer votre profil.</p>
            <div className="vf-form-grid" style={{ gridTemplateColumns: "1fr" }}>
              <FormField error={(attempted || form.name) && nameError}>
                <input placeholder="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </FormField>
              <FormField error={(attempted || form.email) && emailError}>
                <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </FormField>
            </div>
            <button className="vf-btn vf-btn-primary" style={{ marginTop: 16 }} onClick={submitClient}>
              Se connecter
            </button>
          </>
        ) : (
          <form onSubmit={submitAdmin}>
            <p className="vf-muted" style={{ marginBottom: 18 }}>Réservé au propriétaire de la boutique — vérifié par Supabase.</p>
            <div className="vf-form-grid" style={{ gridTemplateColumns: "1fr" }}>
              <input placeholder="Email administrateur" type="email" required value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} />
              <input placeholder="Mot de passe" type="password" required value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} />
            </div>
            {adminError && <div className="vf-form-alert" style={{ marginTop: 12 }}><AlertCircle size={15} /> {adminError}</div>}
            <button className="vf-btn vf-btn-primary" style={{ marginTop: 16 }} type="submit" disabled={adminLoading}>
              {adminLoading ? <><Loader2 size={16} className="vf-spin" /> Vérification…</> : "Se connecter"}
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="vf-section">
      <div className="vf-flex-center" style={{ justifyContent: "space-between" }}>
        <div>
          <h2 className="vf-h2">Bonjour, {account.name}</h2>
          <p className="vf-muted">{account.email}{account.isAdmin && " · Administrateur"}</p>
        </div>
        <button className="vf-btn vf-btn-ghost" onClick={async () => { await supabase.auth.signOut(); setAccount(null); }}><LogOut size={15} /> Déconnexion</button>
      </div>

      <h3 className="vf-h3" style={{ marginTop: 32 }}>Historique de commandes</h3>
      {orders.length === 0 ? (
        <div className="vf-empty"><Package size={22} /><p>Aucune commande pour l'instant.</p></div>
      ) : (
        <div style={{ marginTop: 12 }}>
          {orders.map((o) => (
            <div key={o.id} className="vf-order-card">
              <div className="vf-flex-center" style={{ justifyContent: "space-between" }}>
                <strong>{o.id}</strong>
                <span className="vf-tag-ok">{o.status}</span>
              </div>
              <span className="vf-muted" style={{ fontSize: 13 }}>{new Date(o.date).toLocaleDateString("fr-FR")}</span>
              <div style={{ marginTop: 8 }}>
                {o.items.map((it) => (
                  <div key={it.id} className="vf-cline" style={{ fontSize: 14 }}>
                    <span>{it.name} × {it.qty}</span><span>{euros(it.price * it.qty)}</span>
                  </div>
                ))}
              </div>
              <div className="vf-cline vf-cline-total"><span>Total</span><span>{euros(o.total)}</span></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   ADMIN
   ============================================================ */
function emptyProduct() {
  return { name: "", category: "Décoration", material: "PLA", color: "Noir", price: "", stock: "", customizable: false, description: "" };
}

function Admin({ products, refreshProducts, showToast }) {
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyProduct());
  const [adding, setAdding] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);

  const startEdit = (p) => {
    setEditingId(p.id);
    setForm({ ...p, price: String(p.price), stock: String(p.stock) });
    setAdding(false);
    setAttempted(false);
  };
  const startAdd = () => { setAdding(true); setEditingId(null); setForm(emptyProduct()); setAttempted(false); };
  const cancel = () => { setAdding(false); setEditingId(null); setForm(emptyProduct()); setAttempted(false); };

  const priceNum = parseFloat(form.price);
  const stockNum = parseInt(form.stock, 10);
  const errors = {
    name: form.name.trim().length < 2 ? "Le nom du produit est requis." : "",
    price: !form.price || isNaN(priceNum) || priceNum <= 0 ? "Indiquez un prix supérieur à 0." : "",
    stock: form.stock === "" || isNaN(stockNum) || stockNum < 0 ? "Indiquez un stock (0 ou plus)." : "",
    description: form.description.trim().length < 10 ? "Décrivez le produit (10 caractères min)." : "",
  };
  const valid = Object.values(errors).every((e) => !e);
  const fieldErr = (key) => (attempted || form[key]) ? errors[key] : "";

  const save = async () => {
    setAttempted(true);
    if (!valid) return;
    setSaving(true);
    const clean = {
      name: form.name,
      category: form.category,
      material: form.material,
      color: form.color,
      price: priceNum,
      stock: stockNum,
      customizable: form.customizable,
      description: form.description,
      rating: form.rating || 4.5,
      reviews: form.reviews || [],
    };
    try {
      if (editingId) {
        await updateProductRemote(editingId, clean);
        showToast("Produit mis à jour");
      } else {
        await insertProductRemote({ ...clean, id: "p" + Date.now() });
        showToast("Produit ajouté");
      }
      await refreshProducts();
      cancel();
    } catch (e) {
      showToast("Erreur : " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    try {
      await deleteProductRemote(id);
      showToast("Produit supprimé");
      await refreshProducts();
      if (editingId === id) cancel();
    } catch (e) {
      showToast("Erreur : " + e.message);
    }
  };

  const formOpen = adding || editingId;

  return (
    <div className="vf-section">
      <div className="vf-flex-center" style={{ justifyContent: "space-between" }}>
        <h2 className="vf-h2"><Settings size={20} /> Espace admin</h2>
        {!formOpen && (
          <button className="vf-btn vf-btn-primary" onClick={startAdd}><PlusCircle size={16} /> Nouveau produit</button>
        )}
      </div>

      {formOpen && (
        <div className="vf-admin-form">
          <h4>{editingId ? "Modifier le produit" : "Nouveau produit"}</h4>
          <div className="vf-form-grid">
            <FormField error={fieldErr("name")}>
              <input placeholder="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </FormField>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {Object.keys(CATEGORY_META).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder="Matériau" value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} />
            <input placeholder="Couleur" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            <FormField error={fieldErr("price")}>
              <input placeholder="Prix (€)" type="number" min="0" step="0.10" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </FormField>
            <FormField error={fieldErr("stock")}>
              <input placeholder="Stock" type="number" min="0" step="1" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </FormField>
            <FormField error={fieldErr("description")} className="vf-span2">
              <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </FormField>
            <label className="vf-check">
              <input type="checkbox" checked={form.customizable} onChange={(e) => setForm({ ...form, customizable: e.target.checked })} />
              Personnalisable
            </label>
          </div>
          {attempted && !valid && (
            <div className="vf-form-alert"><AlertCircle size={15} /> Merci de corriger les champs indiqués en rouge.</div>
          )}
          <div className="vf-flex-center" style={{ gap: 10, marginTop: 14 }}>
            <button className="vf-btn vf-btn-ghost" onClick={cancel}>Annuler</button>
            <button className="vf-btn vf-btn-primary" onClick={save} disabled={saving}>
              {saving ? <Loader2 size={15} className="vf-spin" /> : <Check size={15} />} Enregistrer
            </button>
          </div>
        </div>
      )}

      <div className="vf-admin-table">
        <div className="vf-admin-row vf-admin-head">
          <span>Produit</span><span>Catégorie</span><span>Prix</span><span>Stock</span><span></span>
        </div>
        {products.map((p) => (
          <div key={p.id} className="vf-admin-row">
            <span>{p.name}</span>
            <span className="vf-muted">{p.category}</span>
            <span>{euros(p.price)}</span>
            <span className={p.stock <= 5 ? "vf-low-stock" : ""}>{p.stock}</span>
            <span className="vf-flex-center" style={{ gap: 6 }}>
              <button className="vf-icon-btn small" onClick={() => startEdit(p)}><Edit2 size={14} /></button>
              <button className="vf-icon-btn small" onClick={() => remove(p.id)}><Trash2 size={14} /></button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   ABOUT
   ============================================================ */
function About({ goTo }) {
  return (
    <div className="vf-section" style={{ maxWidth: 760 }}>
      <span className="vf-eyebrow">Notre histoire</span>
      <h1 className="vf-h2" style={{ marginTop: 8 }}>L'atelier VOXFORGE</h1>
      <p className="vf-desc">
        VOXFORGE est né d'une obsession simple : et si les objets du quotidien étaient dessinés par des règles plutôt que par une main ?
        Dans notre atelier, chaque pièce commence comme un algorithme — un champ de particules, une structure de Voronoï, une répétition
        fractale — avant d'être traduite en modèle 3D puis imprimée couche par couche, en petites séries.
      </p>
      <p className="vf-desc">
        Nous travaillons avec des matériaux choisis pour leur durabilité (PLA biosourcé, résines faible impact, nylon recyclé) et
        imprimons à la demande : pas de stock dormant, pas de surproduction. Chaque commande déclenche une impression, pas un
        déstockage d'entrepôt.
      </p>
      <p className="vf-desc">
        Le résultat : des objets qui portent la trace de leur calcul d'origine, légèrement différents d'une pièce à l'autre,
        pensés pour des intérieurs qui ne ressemblent à aucun autre.
      </p>
      <button className="vf-btn vf-btn-primary" style={{ marginTop: 10 }} onClick={() => goTo("shop")}>
        Découvrir la collection <ArrowRight size={16} />
      </button>
    </div>
  );
}

/* ============================================================
   CONTACT / FAQ
   ============================================================ */
function ContactFAQ({ showToast }) {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const errors = {
    name: form.name.trim().length < 2 ? "Indiquez votre nom." : "",
    email: !EMAIL_RE.test(form.email) ? "Adresse email invalide." : "",
    message: form.message.trim().length < 10 ? "Votre message doit contenir au moins 10 caractères." : "",
  };
  const valid = Object.values(errors).every((e) => !e);
  const fieldErr = (key) => (attempted || form[key]) ? errors[key] : "";

  const faqs = [
    { q: "Quels délais de livraison ?", a: "Chaque objet est imprimé à la commande : comptez 3 à 6 jours de fabrication, puis 2 à 4 jours de livraison en France métropolitaine." },
    { q: "Puis-je personnaliser un objet ?", a: "Les objets marqués « Personnalisable » acceptent des variantes de couleur ou de taille. Indiquez vos souhaits dans les notes de commande à l'étape livraison." },
    { q: "Quelle est votre politique de retour ?", a: "Vous disposez de 14 jours après réception pour nous retourner un objet non personnalisé et non abîmé, à vos frais." },
    { q: "Les matériaux sont-ils résistants ?", a: "Oui : PLA renforcé, résine UV-stable ou nylon selon les pièces. Chaque fiche produit précise le matériau utilisé." },
  ];
  const [openFaq, setOpenFaq] = useState(null);

  const submit = (e) => {
    e.preventDefault();
    setAttempted(true);
    if (!valid) return;
    setSent(true);
    showToast("Message envoyé");
  };

  return (
    <div className="vf-section vf-contact-layout">
      <div>
        <h2 className="vf-h2">Contact</h2>
        {sent ? (
          <div className="vf-callout" style={{ marginTop: 16 }}>
            <Check size={15} /> Merci {form.name}, nous répondons sous 24-48h à {form.email}.
          </div>
        ) : (
          <form className="vf-form-grid" style={{ gridTemplateColumns: "1fr", marginTop: 16 }} onSubmit={submit} noValidate>
            <FormField error={fieldErr("name")}>
              <input placeholder="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </FormField>
            <FormField error={fieldErr("email")}>
              <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </FormField>
            <FormField error={fieldErr("message")}>
              <textarea placeholder="Votre message" rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </FormField>
            <button className="vf-btn vf-btn-primary" type="submit">Envoyer <ArrowRight size={16} /></button>
          </form>
        )}
        <div className="vf-flex-center" style={{ gap: 18, marginTop: 22 }}>
          <span className="vf-flex-center" style={{ gap: 6 }}><Mail size={15} /> hello@voxforge.io</span>
          <span className="vf-flex-center" style={{ gap: 6 }}><Phone size={15} /> +33 1 23 45 67 89</span>
        </div>
      </div>

      <div>
        <h2 className="vf-h2">FAQ</h2>
        <div style={{ marginTop: 16 }}>
          {faqs.map((f, i) => (
            <div key={i} className="vf-faq-item">
              <button className="vf-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                {f.q} <ChevronDown size={15} className={openFaq === i ? "vf-rot180" : ""} />
              </button>
              {openFaq === i && <p className="vf-faq-a">{f.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   FOOTER
   ============================================================ */
function Footer({ goTo }) {
  return (
    <footer className="vf-footer">
      <div className="vf-footer-inner">
        <div>
          <button className="vf-logo" onClick={() => goTo("home")}>
            <Box size={18} className="vf-logo-icon" />
            <span>VOX<span className="vf-accent">FORGE</span></span>
          </button>
          <p className="vf-muted" style={{ marginTop: 8, maxWidth: 280 }}>Objets génératifs imprimés en 3D, façonnés en petites séries.</p>
        </div>
        <div className="vf-footer-cols">
          <div>
            <h5>Boutique</h5>
            <button onClick={() => goTo("shop")}>Toute la collection</button>
            <button onClick={() => goTo("about")}>L'atelier</button>
          </div>
          <div>
            <h5>Aide</h5>
            <button onClick={() => goTo("contact")}>Contact / FAQ</button>
            <button onClick={() => goTo("account")}>Mon compte</button>
          </div>
        </div>
      </div>
      <div className="vf-footer-bottom">© {new Date().getFullYear()} VOXFORGE — Tous droits réservés.</div>
    </footer>
  );
}

/* ============================================================
   STYLES
   ============================================================ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap');

.vf-root {
  --void:#0a0a0f; --panel:#12121c; --panel2:#191926; --border:#2a2a3d;
  --text:#eef0f8; --muted:#8b8ba3;
  --cyan:#00f0ff; --magenta:#ff2e9a; --violet:#7b61ff; --green:#35e28f;
  background:var(--void); color:var(--text); font-family:'Inter',sans-serif;
  min-height:100vh; position:relative; overflow-x:hidden;
}
html, body { background:#0a0a0f; margin:0; }
.vf-root * { box-sizing:border-box; }
.vf-root button, .vf-root input, .vf-root select, .vf-root textarea {
  color:inherit; font:inherit;
}
.vf-root a:focus-visible, .vf-root button:focus-visible, .vf-root input:focus-visible, .vf-root select:focus-visible, .vf-root textarea:focus-visible {
  outline:2px solid var(--cyan); outline-offset:2px; border-radius:4px;
}
@media (prefers-reduced-motion: reduce) {
  .vf-root, .vf-root * { animation-duration:0.01ms !important; animation-iteration-count:1 !important; transition-duration:0.01ms !important; }
}
.vf-root h1,.vf-root h2,.vf-root h3,.vf-root h4 { font-family:'Space Grotesk',sans-serif; margin:0; }
.vf-root button { font-family:inherit; cursor:pointer; }
.vf-root input, .vf-root select, .vf-root textarea { font-family:inherit; }

.vf-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; height:100vh; color:var(--muted); }
.vf-spin { animation: vf-rotate 1s linear infinite; }
.vf-spin-slow { animation: vf-rotate 6s linear infinite; }
@keyframes vf-rotate { to { transform: rotate(360deg); } }

.vf-bggrid {
  position:fixed; inset:0; z-index:0; pointer-events:none;
  background-image: linear-gradient(rgba(123,97,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(123,97,255,0.06) 1px, transparent 1px);
  background-size: 44px 44px;
  -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%);
  mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%);
}
.vf-root > * { position:relative; z-index:1; }

/* Nav */
.vf-nav { position:sticky; top:0; z-index:50; backdrop-filter:blur(14px); background:rgba(10,10,15,0.75); border-bottom:1px solid var(--border); }
.vf-nav-inner { max-width:1180px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; padding:14px 24px; }
.vf-logo { display:flex; align-items:center; gap:8px; background:none; border:none; color:var(--text); font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:17px; letter-spacing:0.5px; }
.vf-logo-icon { color:var(--cyan); }
.vf-accent { color:var(--cyan); text-shadow:0 0 18px rgba(0,240,255,0.5); }
.vf-nav-links { display:flex; gap:6px; }
.vf-navlink { background:none; border:none; color:var(--muted); padding:8px 12px; border-radius:8px; font-size:14px; font-weight:500; transition:all .15s; }
.vf-navlink:hover { color:var(--text); background:var(--panel); }
.vf-navlink.active { color:var(--void); background:var(--cyan); }
.vf-icon-btn { position:relative; background:var(--panel); border:1px solid var(--border); color:var(--text); width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; transition:all .15s; }
.vf-icon-btn:hover { border-color:var(--cyan); color:var(--cyan); }
.vf-icon-btn.small { width:30px; height:30px; border-radius:8px; }
.vf-badge { position:absolute; top:-6px; right:-6px; background:var(--magenta); color:white; font-size:10px; font-weight:700; width:17px; height:17px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
.vf-mobile-menu { display:flex; flex-direction:column; padding:10px 24px 18px; gap:4px; border-top:1px solid var(--border); }
.vf-mobile-menu .vf-navlink { text-align:left; }
.vf-hide-mobile { display:flex; }
.vf-show-mobile { display:none; }
@media (max-width:820px) {
  .vf-hide-mobile { display:none !important; }
  .vf-show-mobile { display:flex !important; }
}

/* Hero */
.vf-hero { max-width:1180px; margin:0 auto; padding:70px 24px 40px; display:grid; grid-template-columns:1fr 1fr; align-items:center; gap:40px; }
@media (max-width:820px){ .vf-hero{ grid-template-columns:1fr; padding-top:40px; } }
.vf-eyebrow { font-family:'JetBrains Mono',monospace; font-size:12px; letter-spacing:1.5px; text-transform:uppercase; color:var(--cyan); }
.vf-h1 { font-size:44px; line-height:1.12; font-weight:700; margin-top:14px; letter-spacing:-0.5px; }
@media (max-width:600px){ .vf-h1{ font-size:32px; } }
.vf-lead { color:var(--muted); font-size:16px; line-height:1.6; margin-top:18px; max-width:460px; }
.vf-hero-cube-wrap { display:flex; align-items:center; justify-content:center; perspective:900px; height:320px; }
.vf-cube { width:150px; height:150px; position:relative; transform-style:preserve-3d; animation: vf-cube-rotate 14s linear infinite; }
.vf-face { position:absolute; width:150px; height:150px; border:1px solid var(--cyan); background:rgba(0,240,255,0.04); box-shadow: 0 0 30px rgba(123,97,255,0.25) inset; }
.vf-f1 { transform: rotateY(0deg) translateZ(75px); }
.vf-f2 { transform: rotateY(180deg) translateZ(75px); border-color:var(--magenta); }
.vf-f3 { transform: rotateY(90deg) translateZ(75px); border-color:var(--violet); }
.vf-f4 { transform: rotateY(-90deg) translateZ(75px); border-color:var(--violet); }
.vf-f5 { transform: rotateX(90deg) translateZ(75px); border-color:var(--cyan); }
.vf-f6 { transform: rotateX(-90deg) translateZ(75px); border-color:var(--magenta); }
@keyframes vf-cube-rotate { from { transform: rotateX(-20deg) rotateY(0deg); } to { transform: rotateX(-20deg) rotateY(360deg); } }

.vf-btn { display:inline-flex; align-items:center; gap:8px; padding:11px 20px; border-radius:10px; font-weight:600; font-size:14px; border:1px solid transparent; transition:all .15s; }
.vf-btn:disabled { opacity:0.4; cursor:not-allowed; }
.vf-btn-primary { background:var(--cyan); color:#04121a; box-shadow:0 0 22px rgba(0,240,255,0.25); }
.vf-btn-primary:not(:disabled):hover { box-shadow:0 0 30px rgba(0,240,255,0.5); transform:translateY(-1px); }
.vf-btn-ghost { background:transparent; border-color:var(--border); color:var(--text); }
.vf-btn-ghost:hover { border-color:var(--cyan); color:var(--cyan); }

.vf-section { max-width:1180px; margin:0 auto; padding:50px 24px; }
.vf-section-head { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:14px; margin-bottom:22px; }
.vf-h2 { font-size:28px; font-weight:700; }
.vf-h3 { font-size:19px; font-weight:600; display:flex; align-items:center; gap:8px; }
.vf-link { background:none; border:none; color:var(--cyan); font-size:14px; font-weight:600; display:inline-flex; align-items:center; gap:4px; }
.vf-muted { color:var(--muted); }

.vf-grid-cards { display:grid; grid-template-columns:repeat(4,1fr); gap:18px; }
@media (max-width:980px){ .vf-grid-cards{ grid-template-columns:repeat(2,1fr);} }
@media (max-width:560px){ .vf-grid-cards{ grid-template-columns:1fr;} }

.vf-card { text-align:left; background:var(--panel); border:1px solid var(--border); border-radius:16px; overflow:hidden; padding:0; transition:all .2s; }
.vf-card:hover { border-color:var(--cyan); transform:translateY(-3px); box-shadow:0 8px 30px rgba(0,240,255,0.12); }
.vf-visual { position:relative; height:150px; display:flex; align-items:center; justify-content:center; overflow:hidden; }
.vf-visual-grid { position:absolute; inset:0; background-image:linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px); background-size:16px 16px; }
.vf-visual-icon { position:relative; z-index:1; }
.vf-scan { position:absolute; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,rgba(0,240,255,0.8),transparent); animation:vf-scan 3s linear infinite; opacity:0.7; }
@keyframes vf-scan { 0%{ top:0%; } 100%{ top:100%; } }
.vf-card-body { padding:14px 16px 16px; }
.vf-card-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
.vf-card-cat { font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--violet); text-transform:uppercase; letter-spacing:0.5px; }
.vf-tag-low { font-size:10px; background:rgba(255,176,32,0.15); color:#ffb020; padding:2px 7px; border-radius:6px; font-weight:600; }
.vf-tag-out { font-size:10px; background:rgba(255,46,154,0.15); color:var(--magenta); padding:2px 7px; border-radius:6px; font-weight:600; }
.vf-tag-ok { font-size:11px; background:rgba(53,226,143,0.15); color:var(--green); padding:3px 9px; border-radius:6px; font-weight:600; }
.vf-card-title { font-size:15px; font-weight:600; margin-top:2px; }
.vf-price { font-family:'JetBrains Mono',monospace; font-weight:600; color:var(--cyan); }
.vf-price-lg { font-family:'JetBrains Mono',monospace; font-size:26px; font-weight:600; color:var(--cyan); margin-bottom:14px; }

.vf-strip { display:flex; flex-wrap:wrap; gap:24px; justify-content:space-between; padding-top:0; border-top:1px solid var(--border); margin-top:10px; padding-top:30px; }
.vf-strip-item { display:flex; align-items:center; gap:10px; color:var(--muted); font-size:14px; }
.vf-strip-item svg { color:var(--cyan); }

.vf-flex-center { display:flex; align-items:center; }

/* Shop */
.vf-search { display:flex; align-items:center; gap:8px; background:var(--panel); border:1px solid var(--border); border-radius:10px; padding:9px 14px; min-width:240px; }
.vf-search input { background:none; border:none; outline:none; color:var(--text); width:100%; font-size:14px; }
.vf-search svg { color:var(--muted); }
.vf-shop-layout { display:flex; gap:32px; align-items:flex-start; }
.vf-filters { width:220px; flex-shrink:0; position:sticky; top:90px; }
.vf-filter-block { margin-bottom:22px; }
.vf-filter-block h4 { font-size:13px; text-transform:uppercase; letter-spacing:0.5px; color:var(--muted); margin-bottom:10px; font-family:'Inter',sans-serif; font-weight:600; }
.vf-check { display:flex; align-items:center; gap:8px; font-size:14px; margin-bottom:8px; cursor:pointer; }
.vf-check input { accent-color:var(--cyan); width:15px; height:15px; }
.vf-range { width:100%; accent-color:var(--cyan); }
.vf-select { background:var(--panel); border:1px solid var(--border); color:var(--text); padding:8px 12px; border-radius:8px; font-size:14px; }
@media (max-width:820px) {
  .vf-shop-layout { flex-direction:column; }
  .vf-filters { display:none; width:100%; position:static; }
  .vf-filters-open { display:block; }
}
.vf-empty { display:flex; flex-direction:column; align-items:center; gap:10px; text-align:center; padding:50px 20px; color:var(--muted); }

/* Product detail */
.vf-product-layout { display:grid; grid-template-columns:1fr 1fr; gap:44px; }
@media (max-width:820px){ .vf-product-layout{ grid-template-columns:1fr; } }
.vf-product-visual { height:380px; border-radius:20px; border:1px solid var(--border); }
.vf-desc { color:var(--muted); line-height:1.7; margin:14px 0; }
.vf-spec-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; background:var(--panel); border:1px solid var(--border); border-radius:12px; padding:16px; font-size:14px; }
.vf-callout { display:flex; align-items:flex-start; gap:8px; background:rgba(123,97,255,0.1); border:1px solid rgba(123,97,255,0.3); color:var(--text); padding:12px 14px; border-radius:10px; font-size:13px; margin-top:16px; }
.vf-qty { display:flex; align-items:center; gap:14px; background:var(--panel); border:1px solid var(--border); border-radius:10px; padding:6px 12px; }
.vf-qty button { background:none; border:none; color:var(--text); }
.vf-tabs { display:flex; gap:6px; border-bottom:1px solid var(--border); margin-top:44px; }
.vf-tab { background:none; border:none; color:var(--muted); padding:10px 16px; font-weight:600; font-size:14px; border-bottom:2px solid transparent; }
.vf-tab.active { color:var(--cyan); border-color:var(--cyan); }
.vf-reviews { padding-top:18px; display:flex; flex-direction:column; gap:14px; }
.vf-review { background:var(--panel); border:1px solid var(--border); border-radius:12px; padding:14px 16px; }
.vf-review p { color:var(--muted); margin-top:6px; font-size:14px; }

/* Drawer */
.vf-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:60; }
.vf-drawer { position:fixed; top:0; right:-420px; width:400px; max-width:92vw; height:100%; background:var(--panel2); border-left:1px solid var(--border); z-index:70; display:flex; flex-direction:column; transition:right .3s ease; }
.vf-drawer.open { right:0; }
.vf-drawer-head { display:flex; align-items:center; justify-content:space-between; padding:18px 20px; border-bottom:1px solid var(--border); }
.vf-drawer-head h3 { display:flex; align-items:center; gap:8px; font-size:16px; }
.vf-drawer-items { flex:1; overflow-y:auto; padding:14px 20px; display:flex; flex-direction:column; gap:16px; }
.vf-drawer-item { display:flex; gap:12px; }
.vf-drawer-thumb { width:70px; height:70px; border-radius:10px; flex-shrink:0; }
.vf-drawer-foot { padding:16px 20px 22px; border-top:1px solid var(--border); }

/* Checkout */
.vf-checkout { max-width:920px; }
.vf-steps { display:flex; gap:22px; margin-bottom:32px; flex-wrap:wrap; }
.vf-step { display:flex; align-items:center; gap:8px; color:var(--muted); font-size:14px; font-weight:600; }
.vf-step.active { color:var(--text); }
.vf-step.done { color:var(--green); }
.vf-step-dot { width:22px; height:22px; border-radius:50%; border:1px solid var(--border); display:flex; align-items:center; justify-content:center; font-size:12px; }
.vf-step.active .vf-step-dot { border-color:var(--cyan); color:var(--cyan); }
.vf-step.done .vf-step-dot { border-color:var(--green); background:rgba(53,226,143,0.15); color:var(--green); }
.vf-checkout-layout { display:grid; grid-template-columns:1fr 320px; gap:32px; align-items:flex-start; }
@media (max-width:760px){ .vf-checkout-layout{ grid-template-columns:1fr; } }
.vf-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:14px; }
.vf-form-grid .vf-span2 { grid-column:1/3; }
@media (max-width:500px){ .vf-form-grid{ grid-template-columns:1fr; } .vf-form-grid .vf-span2{ grid-column:1; } }
.vf-form-grid input, .vf-form-grid textarea, .vf-form-grid select { background:var(--panel); border:1px solid var(--border); color:var(--text); padding:11px 13px; border-radius:9px; font-size:14px; outline:none; }
.vf-form-grid input:focus, .vf-form-grid textarea:focus, .vf-form-grid select:focus { border-color:var(--cyan); }
.vf-form-grid input.vf-input-error, .vf-form-grid textarea.vf-input-error { border-color:var(--magenta); background:rgba(255,46,154,0.06); }
.vf-error-text { display:flex; align-items:center; gap:5px; color:var(--magenta); font-size:12px; margin-top:5px; }
.vf-form-alert { display:flex; align-items:center; gap:8px; color:var(--magenta); background:rgba(255,46,154,0.1); border:1px solid rgba(255,46,154,0.3); padding:10px 14px; border-radius:9px; font-size:13px; margin-top:14px; }
.vf-cline { display:flex; align-items:center; justify-content:space-between; padding:8px 0; font-size:14px; border-bottom:1px solid var(--border); }
.vf-cline-total { border-bottom:none; font-weight:700; font-size:16px; color:var(--cyan); padding-top:12px; }
.vf-summary { background:var(--panel); border:1px solid var(--border); border-radius:14px; padding:18px 20px; }
.vf-summary h4 { margin-bottom:10px; font-size:15px; }
.vf-confirm-icon { width:56px; height:56px; border-radius:50%; background:rgba(53,226,143,0.15); color:var(--green); display:flex; align-items:center; justify-content:center; margin-bottom:14px; }

/* Account / Admin */
.vf-order-card { background:var(--panel); border:1px solid var(--border); border-radius:12px; padding:16px 18px; margin-bottom:14px; }
.vf-admin-form { background:var(--panel); border:1px solid var(--border); border-radius:14px; padding:20px; margin:18px 0; }
.vf-admin-table { margin-top:20px; border:1px solid var(--border); border-radius:12px; overflow:hidden; }
.vf-admin-row { display:grid; grid-template-columns:2fr 1.2fr 1fr 0.7fr 0.8fr; gap:10px; padding:12px 16px; align-items:center; font-size:14px; border-bottom:1px solid var(--border); }
.vf-admin-row:last-child { border-bottom:none; }
.vf-admin-head { background:var(--panel2); font-weight:600; color:var(--muted); font-size:12px; text-transform:uppercase; }
.vf-low-stock { color:#ffb020; font-weight:600; }
@media (max-width:700px){ .vf-admin-row{ grid-template-columns:1.5fr 1fr 0.8fr; } .vf-admin-row span:nth-child(2){ display:none; } }

/* Contact / FAQ */
.vf-contact-layout { display:grid; grid-template-columns:1fr 1fr; gap:50px; }
@media (max-width:820px){ .vf-contact-layout{ grid-template-columns:1fr; } }
.vf-faq-item { border-bottom:1px solid var(--border); padding:14px 0; }
.vf-faq-q { width:100%; display:flex; justify-content:space-between; align-items:center; background:none; border:none; color:var(--text); font-weight:600; font-size:14.5px; text-align:left; }
.vf-faq-a { color:var(--muted); margin-top:10px; font-size:14px; line-height:1.6; }
.vf-rot180 { transform:rotate(180deg); }

/* Footer */
.vf-footer { border-top:1px solid var(--border); margin-top:40px; }
.vf-footer-inner { max-width:1180px; margin:0 auto; padding:40px 24px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:30px; }
.vf-footer-cols { display:flex; gap:60px; }
.vf-footer-cols h5 { font-size:13px; text-transform:uppercase; color:var(--muted); margin-bottom:10px; letter-spacing:0.5px; }
.vf-footer-cols button { display:block; background:none; border:none; color:var(--text); font-size:14px; padding:5px 0; text-align:left; }
.vf-footer-cols button:hover { color:var(--cyan); }
.vf-footer-bottom { text-align:center; padding:16px; color:var(--muted); font-size:12px; border-top:1px solid var(--border); }

/* Toast */
.vf-toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:var(--cyan); color:#04121a; padding:11px 20px; border-radius:10px; display:flex; align-items:center; gap:8px; font-weight:600; font-size:14px; z-index:100; box-shadow:0 6px 24px rgba(0,240,255,0.35); animation:vf-toast-in .2s ease; }
@keyframes vf-toast-in { from{ opacity:0; transform:translate(-50%,10px);} to{ opacity:1; transform:translate(-50%,0);} }
`;
