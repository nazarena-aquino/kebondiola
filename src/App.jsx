import React, { useState, useEffect } from "react";
import "./index.css";
import { supabase } from "./supabaseClient";

// ============================================================
// PRECIOS ESPECIALES POR DOCENA (múltiplos de 12)
// Solo aplica a empanadas. Modificá los valores acá.
// ============================================================
const DOZEN_PRICES = {
  "empanada-bondiola": 20000,
  "empanada-osobuco":  22000,
};

const EMPANADA_IDS = ["empanada-bondiola", "empanada-osobuco"];

const MENU = [
  {
    id: "bondiola",
    name: "Sándwich de Bondiola",
    description: "Pan brioche artesanal, bondiolita al vino tinto desmenuzada. Incluye dos salsas (alioli y criolla) + papas rústicas.",
    price: 10500,
    image: "/bondiola.jpeg"
  },
  {
    id: "osobuco",
    name: "Sándwich de Osobuco",
    description: "Pan brioche artesanal, osobuco braseado deshilachado. Incluye dos salsas (alioli y criolla) + papas rústicas.",
    price: 10500,
    image: "/osobuco.jpeg"
  },
  {
    id: "empanada-bondiola",
    name: "Empanadas de Bondiola",
    description: "Empanadas fritas de bondiolita al vino tinto desmenuzada. Incluye dos salsas (alioli y criolla).",
    price: 2000,
    image: "/empanadas.jpeg"
  },
  {
    id: "empanada-osobuco",
    name: "Empanadas de Osobuco",
    description: "Empanadas fritas de osobuco braseado deshilachado. Incluye dos salsas (alioli y criolla).",
    price: 2000,
    image: "/empanadas.jpeg"
  },
];

const PAYMENTS = [
  { id: "efectivo", label: "Efectivo", icon: "💵" },
  { id: "transferencia", label: "Transferencia / QR", icon: "📱" }
];

const WA_NUMBER = "5493704628845";

const formatPrice = (price) => `$${price.toLocaleString("es-AR")}`;

const calcEmpanadasPrice = (productId, qty, unitPrice) => {
  const dozenPrice = DOZEN_PRICES[productId];
  const dozens = Math.floor(qty / 12);
  const remainder = qty % 12;
  return dozens * dozenPrice + remainder * unitPrice;
};

const getPriceForQty = (product, qty, stockQty) => {
  if (EMPANADA_IDS.includes(product.id) && stockQty >= 12) {
    return calcEmpanadasPrice(product.id, qty, product.price);
  }
  return product.price * qty;
};

export default function App() {
  const [page, setPage] = useState("menu");
  const [cart, setCart] = useState([]);
  const [stock, setStock] = useState({});
  const [loadingStock, setLoadingStock] = useState(true);
  const [stockError, setStockError] = useState(false);
  const [sendingOrder, setSendingOrder] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState("local");
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState("efectivo");
  const [quantities, setQuantities] = useState({});

  // ── Cargar stock desde Supabase al montar ──────────────────
  useEffect(() => {
    fetchStock();

    // Tiempo real: si otro cliente confirma un pedido,
    // el stock se actualiza automáticamente en pantalla
    const channel = supabase
      .channel("stock-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "stock" },
        (payload) => {
          setStock(prev => ({
            ...prev,
            [payload.new.id]: payload.new.cantidad
          }));
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchStock = async () => {
    setLoadingStock(true);
    setStockError(false);
    try {
      const { data, error } = await supabase.from("stock").select("id, cantidad");
      if (error) throw error;
      const map = {};
      data.forEach(row => { map[row.id] = row.cantidad; });
      setStock(map);
    } catch (err) {
      console.error("Error cargando stock:", err);
      setStockError(true);
    } finally {
      setLoadingStock(false);
    }
  };

  // ── Carrito ────────────────────────────────────────────────
  const groupedCart = cart.reduce((acc, item) => {
    const existing = acc.find(g => g.id === item.id);
    if (existing) {
      existing.quantity += 1;
      existing.uids.push(item.uid);
    } else {
      acc.push({ ...item, quantity: 1, uids: [item.uid] });
    }
    return acc;
  }, []);

  const subtotal = groupedCart.reduce((acc, item) => {
    if (EMPANADA_IDS.includes(item.id) && (stock[item.id] || 0) >= 12) {
      return acc + calcEmpanadasPrice(item.id, item.quantity, item.price);
    }
    return acc + item.price * item.quantity;
  }, 0);

  const getQuantity = (productId) => quantities[productId] || 1;

  const updateQuantity = (productId, delta) => {
    setQuantities(prev => {
      const current = prev[productId] || 1;
      const available = stock[productId] || 0;
      const newQty = Math.min(available, Math.max(1, current + delta));
      return { ...prev, [productId]: newQty };
    });
  };

  
    const addToCart = (product) => {
      console.log("stock disponible:", stock[product.id], typeof stock[product.id]);
      const qty = getQuantity(product.id);
      const available = stock[product.id] || 0;
      console.log("qty:", qty, "available:", available);
      // ...resto del código
    if (available === 0) return;
    const safeQty = Math.min(qty, available);
    for (let i = 0; i < safeQty; i++) {
      setCart(prev => [...prev, { ...product, uid: Date.now() + Math.random() }]);
    }
    setQuantities(prev => ({ ...prev, [product.id]: 1 }));
  };

  const removeOneFromGroup = (productId) => {
    const itemToRemove = cart.find(item => item.id === productId);
    if (itemToRemove) setCart(cart.filter(item => item.uid !== itemToRemove.uid));
  };

  const addOneToGroup = (productId) => {
    const product = MENU.find(p => p.id === productId);
    const currentInCart = groupedCart.find(g => g.id === productId)?.quantity || 0;
    const available = stock[productId] || 0;
    if (product && currentInCart < available) {
      setCart(prev => [...prev, { ...product, uid: Date.now() + Math.random() }]);
    }
  };

  const removeAllFromGroup = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  // ── Enviar pedido: descuenta stock en Supabase ─────────────
  const sendOrder = async () => {
    if (sendingOrder) return;
    setSendingOrder(true);

    try {
      // Llama a la función SQL que descuenta el stock de forma atómica
      for (const item of groupedCart) {
        const { error } = await supabase.rpc("descontar_stock", {
          producto_id: item.id,
          cantidad:    item.quantity,
        });
        if (error) throw error;
      }

      const lines = [
        "✨ *PEDIDO — KEBONDIOLA* ✨",
        "━━━━━━━━━━━━━━━━━━━━",
        ""
      ];

      groupedCart.forEach((item, index) => {
        const isEmpanada = EMPANADA_IDS.includes(item.id);
        const itemTotal  = isEmpanada && (stock[item.id] || 0) >= 12
          ? calcEmpanadasPrice(item.id, item.quantity, item.price)
          : item.price * item.quantity;

        lines.push(`🥪 *${index + 1}. ${item.name}* ${item.quantity > 1 ? `(x${item.quantity})` : ""}`);
        lines.push(`   💰 ${formatPrice(itemTotal)}`);
        lines.push("");
      });

      lines.push("━━━━━━━━━━━━━━━━━━━━");
      lines.push(`📋 *Subtotal:* ${formatPrice(subtotal)}`);

      if (deliveryMode === "envio") {
        lines.push(`🚗 *Envío:* A domicilio (Costo a coordinar)`);
        lines.push(`📍 *Dirección:* ${address}`);
      } else {
        lines.push(`🏠 *Retiro:* Por el local`);
        lines.push(`📍 *Dirección del local:* Paraguay 169`);
      }

      lines.push(`💳 *Forma de pago:* ${PAYMENTS.find(p => p.id === payment).label}`);
      lines.push("━━━━━━━━━━━━━━━━━━━━");
      lines.push("");
      lines.push("¡Gracias por tu pedido! 🔥");

      const text = encodeURIComponent(lines.join("\n"));
      window.open(`https://wa.me/${WA_NUMBER}?text=${text}`, "_blank");

      setCart([]);
      setPage("done");
    } catch (err) {
      console.error("Error al procesar el pedido:", err);
      alert("Hubo un error al procesar el pedido. Por favor intentá de nuevo.");
    } finally {
      setSendingOrder(false);
    }
  };

  // ── Helpers de UI ──────────────────────────────────────────
  const getStockBadge = (productId) => {
    const s = stock[productId];
    if (s === 0) return { label: "¡¡SIN STOCK!!", type: "out" };
    if (s < 10)  return { label: `¡¡ÚLTIMOS ${s}!!`, type: "low" };
    return null;
  };

  const getDozenAlert = (productId, qty) => {
    if (!EMPANADA_IDS.includes(productId)) return null;
    const s = stock[productId] || 0;
    if (s < 12) return null;
    const remainder = qty % 12;
    if (remainder === 11) {
      const nextDozens = Math.floor(qty / 12) + 1;
      return { msg: `¡Agregá 1 más y obtenés precio especial por ${nextDozens} docena${nextDozens > 1 ? "s" : ""}!`, type: "tip" };
    }
    if (qty >= 12 && remainder === 0) {
      const dozens = qty / 12;
      return { msg: `¡Precio especial por ${dozens} docena${dozens > 1 ? "s" : ""} aplicado!`, type: "success" };
    }
    return null;
  };

  // ── Pantallas de carga / error ─────────────────────────────
  if (loadingStock) {
    return (
      <div className="app-container">
        <div className="loading-screen">
          <div className="loading-spinner" />
          <p>Cargando menú...</p>
        </div>
      </div>
    );
  }

  if (stockError) {
    return (
      <div className="app-container">
        <div className="loading-screen">
          <p style={{ color: "#dc2626", fontWeight: 700 }}>No se pudo cargar el menú.</p>
          <button className="btn-primary" onClick={fetchStock} style={{ marginTop: 16 }}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // ── Render principal ───────────────────────────────────────
  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="brand" onClick={() => setPage("menu")}>
          <img src="/logo.jpeg" alt="Kebiondiola Logo" className="logo-img" />
          <div className="brand-text">
            <span className="title">KEBONDIOLA</span>
            <span className="slogan">el cerdo que te gusta</span>
          </div>
        </div>
        <button className="cart-btn" onClick={() => setPage("cart")}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          Ver Pedido
          {cart.length > 0 && <span className="badge">{cart.length}</span>}
        </button>
      </nav>

      <main className="main-content">

        {/* ── MENÚ ── */}
        {page === "menu" && (
          <div className="product-grid">
            {MENU.map((product) => {
              const stockBadge    = getStockBadge(product.id);
              const outOfStock    = stock[product.id] === 0;
              const qty           = getQuantity(product.id);
              const dozenAlert    = getDozenAlert(product.id, qty);
              const displayPrice  = getPriceForQty(product, qty, stock[product.id]);
              const hasDozenPromo = EMPANADA_IDS.includes(product.id) && (stock[product.id] || 0) >= 12;
              const dozens        = Math.floor(qty / 12);
              const isDozenQty    = qty >= 12 && qty % 12 === 0;

              return (
                <div key={product.id} className={`card ${outOfStock ? "card--out" : ""}`}>
                  <div className="card-img-wrapper">
                    <img src={product.image} alt={product.name} className="card-img" />
                    {stockBadge && (
                      <div className={`stock-badge stock-badge--${stockBadge.type}`}>
                        {stockBadge.label}
                      </div>
                    )}
                  </div>

                  <div className="card-body">
                    <h3 className="card-title">{product.name}</h3>
                    <p className="card-desc">{product.description}</p>

                    {hasDozenPromo && !outOfStock && (
                      <div className="promo-banner">
                         Promo por docena: {formatPrice(DOZEN_PRICES[product.id])} 
                      </div>
                    )}

                    <div className="card-footer">
                      <div className="price-block">
                        <span className="price">{formatPrice(displayPrice)}</span>
                        {isDozenQty && dozens > 0 && (
                          <span className="price-hint">({dozens} docena{dozens > 1 ? "s" : ""})</span>
                        )}
                      </div>

                      {!outOfStock && (
                        <div className="quantity-selector">
                          <button
                            className="qty-btn"
                            onClick={() => updateQuantity(product.id, -1)}
                            disabled={qty <= 1}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                          </button>
                          <span className="qty-value">{qty}</span>
                          <button
                            className="qty-btn"
                            onClick={() => updateQuantity(product.id, 1)}
                            disabled={qty >= (stock[product.id] || 0)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19"/>
                              <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                          </button>
                        </div>
                      )}

                      <button
                        className="btn-primary"
                        onClick={() => addToCart(product)}
                        disabled={outOfStock}
                        style={outOfStock ? { opacity: 0.45, cursor: "not-allowed" } : {}}
                      >
                        {outOfStock ? "Sin stock" : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px", verticalAlign: "middle" }}>
                              <line x1="12" y1="5" x2="12" y2="19"/>
                              <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            Agregar
                          </>
                        )}
                      </button>
                    </div>

                    {dozenAlert && !outOfStock && (
                      <div className={`dozen-alert dozen-alert--${dozenAlert.type}`}>
                        {dozenAlert.type === "tip" ? " " : ""}{dozenAlert.msg}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── CARRITO ── */}
        {page === "cart" && (
          <div className="checkout-section">
            <h2>Tu Pedido</h2>
            {cart.length === 0 ? (
              <p className="empty-msg">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 16px", opacity: 0.5 }}>
                  <circle cx="9" cy="21" r="1"/>
                  <circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                El carrito está vacío
              </p>
            ) : (
              <div className="cart-items">
                {groupedCart.map((item) => {
                  const isEmpanada = EMPANADA_IDS.includes(item.id);
                  const itemTotal  = isEmpanada && (stock[item.id] || 0) >= 12
                    ? calcEmpanadasPrice(item.id, item.quantity, item.price)
                    : item.price * item.quantity;
                  const dozens = Math.floor(item.quantity / 12);
                  const hasDozenDiscount = isEmpanada && dozens > 0;

                  return (
                    <div key={item.id} className="cart-row">
                      <div className="item-name">
                        {item.name}
                        {hasDozenDiscount && (
                          <span className="cart-promo-tag">🎯 x{dozens} docena{dozens > 1 ? "s" : ""}</span>
                        )}
                      </div>
                      <div className="item-actions">
                        <div className="cart-qty-controls">
                          <button className="cart-qty-btn" onClick={() => removeOneFromGroup(item.id)}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                          </button>
                          <span className="cart-qty-value">{item.quantity}</span>
                          <button
                            className="cart-qty-btn"
                            onClick={() => addOneToGroup(item.id)}
                            disabled={item.quantity >= (stock[item.id] || 0)}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19"/>
                              <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                          </button>
                        </div>
                        <span className="item-price">{formatPrice(itemTotal)}</span>
                        <button className="btn-remove" onClick={() => removeAllFromGroup(item.id)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {cart.length > 0 && (
              <div className="summary-box">
                <div className="form-group">
                  <label>Opciones de entrega</label>
                  <div className="toggle-group">
                    <button className={`btn-toggle ${deliveryMode === "local" ? "active" : ""}`} onClick={() => setDeliveryMode("local")}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "8px", verticalAlign: "middle" }}>
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9 22 9 12 15 12 15 22"/>
                      </svg>
                      Retiro por el local
                    </button>
                    <button className={`btn-toggle ${deliveryMode === "envio" ? "active" : ""}`} onClick={() => setDeliveryMode("envio")}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "8px", verticalAlign: "middle" }}>
                        <rect x="1" y="3" width="15" height="13"/>
                        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                        <circle cx="5.5" cy="18.5" r="2.5"/>
                        <circle cx="18.5" cy="18.5" r="2.5"/>
                      </svg>
                      Envío a domicilio
                    </button>
                  </div>
                </div>

                {deliveryMode === "local" && (
                  <div className="form-group">
                    <div className="local-address-box">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      <div className="local-address-info">
                        <span className="local-address-label">Dirección del local</span>
                        <span className="local-address-text">Paraguay 169</span>
                      </div>
                    </div>
                  </div>
                )}

                {deliveryMode === "envio" && (
                  <div className="form-group">
                    <label>Dirección de entrega</label>
                    <input
                      type="text"
                      className="input-text"
                      placeholder="Calle, número, barrio..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                    <small className="hint">El costo del envío depende del cadete y la distancia.</small>
                  </div>
                )}

                <div className="form-group">
                  <label>Forma de pago</label>
                  <div className="toggle-group">
                    {PAYMENTS.map((method) => (
                      <button
                        key={method.id}
                        className={`btn-toggle ${payment === method.id ? "active" : ""}`}
                        onClick={() => setPayment(method.id)}
                      >
                        <span style={{ marginRight: "8px" }}>{method.icon}</span>
                        {method.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="total-row">
                  <span>Total a pagar:</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>

                <button
                  className="btn-whatsapp"
                  onClick={sendOrder}
                  disabled={(deliveryMode === "envio" && address.trim() === "") || sendingOrder}
                >
                  {sendingOrder ? (
                    <span>Procesando...</span>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Realizar Pedido por WhatsApp
                    </>
                  )}
                </button>
              </div>
            )}

            <button className="btn-back" onClick={() => setPage("menu")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "8px", verticalAlign: "middle" }}>
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              Volver al menú
            </button>
          </div>
        )}

        {/* ── CONFIRMACIÓN ── */}
        {page === "done" && (
          <div className="success-section">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#25d366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 24px" }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <h2>¡Pedido enviado!</h2>
            <p>Se ha abierto WhatsApp con el detalle de tu pedido listo para enviar.<br/>¡Gracias por elegirnos!</p>
            <button className="btn-primary" onClick={() => setPage("menu")} style={{ marginTop: "16px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "8px", verticalAlign: "middle" }}>
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              Volver al inicio
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
