import React, { useState } from "react";
import "./index.css";

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
  }
];

const PAYMENTS = [
  { id: "efectivo", label: "Efectivo", icon: "💵" },
  { id: "transferencia", label: "Transferencia / QR", icon: "📱" }
];

const WA_NUMBER = "5493705402315";

const formatPrice = (price) => `$${price.toLocaleString("es-AR")}`;

export default function App() {
  const [page, setPage] = useState("menu");
  const [cart, setCart] = useState([]);
  const [deliveryMode, setDeliveryMode] = useState("local");
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState("efectivo");
  const [quantities, setQuantities] = useState({});

  const subtotal = cart.reduce((acc, item) => acc + item.price, 0);

  // Group cart items by product id
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

  const getQuantity = (productId) => quantities[productId] || 1;

  const updateQuantity = (productId, delta) => {
    setQuantities(prev => {
      const current = prev[productId] || 1;
      const newQty = Math.max(1, current + delta);
      return { ...prev, [productId]: newQty };
    });
  };

  const addToCart = (product) => {
    const qty = getQuantity(product.id);
    for (let i = 0; i < qty; i++) {
      setCart(prev => [...prev, { ...product, uid: Date.now() + Math.random(), quantity: 1 }]);
    }
    setQuantities(prev => ({ ...prev, [product.id]: 1 }));
  };

  const removeFromCart = (uid) => {
    setCart(cart.filter((item) => item.uid !== uid));
  };

  const removeOneFromGroup = (productId) => {
    const itemToRemove = cart.find(item => item.id === productId);
    if (itemToRemove) {
      setCart(cart.filter((item) => item.uid !== itemToRemove.uid));
    }
  };

  const addOneToGroup = (productId) => {
    const product = MENU.find(p => p.id === productId);
    if (product) {
      setCart(prev => [...prev, { ...product, uid: Date.now() + Math.random() }]);
    }
  };

  const removeAllFromGroup = (productId) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const sendOrder = () => {
    const lines = [
      "✨ *PEDIDO — KEBONDIOLA* ✨",
      "━━━━━━━━━━━━━━━━━━━━",
      ""
    ];

    groupedCart.forEach((item, index) => {
      lines.push(`🥪 *${index + 1}. ${item.name}* ${item.quantity > 1 ? `(x${item.quantity})` : ''}`);
      lines.push(`   💰 ${formatPrice(item.price * item.quantity)}`);
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

    lines.push(`💳 *Forma de pago:* ${PAYMENTS.find((p) => p.id === payment).label}`);
    lines.push("━━━━━━━━━━━━━━━━━━━━");
    lines.push("");
    lines.push("¡Gracias por tu pedido! 🔥");

    const text = encodeURIComponent(lines.join("\n"));
    window.open(`https://wa.me/${WA_NUMBER}?text=${text}`, "_blank");
    setPage("done");
  };

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
        {page === "menu" && (
          <>
            <div className="product-grid">
              {MENU.map((product) => (
                <div key={product.id} className="card">
                  <div className="card-img-wrapper">
                    <img src={product.image} alt={product.name} className="card-img" />
                  </div>
                  <div className="card-body">
                    <h3 className="card-title">{product.name}</h3>
                    <p className="card-desc">{product.description}</p>
                    <div className="card-footer">
                      <span className="price">{formatPrice(product.price * getQuantity(product.id))}</span>
                      <div className="quantity-selector">
                        <button 
                          className="qty-btn" 
                          onClick={() => updateQuantity(product.id, -1)}
                          disabled={getQuantity(product.id) <= 1}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                        </button>
                        <span className="qty-value">{getQuantity(product.id)}</span>
                        <button 
                          className="qty-btn" 
                          onClick={() => updateQuantity(product.id, 1)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                        </button>
                      </div>
                      <button className="btn-primary" onClick={() => addToCart(product)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                          <line x1="12" y1="5" x2="12" y2="19"/>
                          <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Agregar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {page === "cart" && (
          <div className="checkout-section">
            <h2>Tu Pedido</h2>
            {cart.length === 0 ? (
              <p className="empty-msg">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto 16px', opacity: 0.5 }}>
                  <circle cx="9" cy="21" r="1"/>
                  <circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                El carrito está vacío
              </p>
            ) : (
              <div className="cart-items">
                {groupedCart.map((item) => (
                  <div key={item.id} className="cart-row">
                    <div className="item-name">
                      {item.name}
                    </div>
                    <div className="item-actions">
                      <div className="cart-qty-controls">
                        <button 
                          className="cart-qty-btn" 
                          onClick={() => removeOneFromGroup(item.id)}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                        </button>
                        <span className="cart-qty-value">{item.quantity}</span>
                        <button 
                          className="cart-qty-btn" 
                          onClick={() => addOneToGroup(item.id)}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                        </button>
                      </div>
                      <span className="item-price">{formatPrice(item.price * item.quantity)}</span>
                      <button className="btn-remove" onClick={() => removeAllFromGroup(item.id)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <div className="summary-box">
                <div className="form-group">
                  <label>Opciones de entrega</label>
                  <div className="toggle-group">
                    <button 
                      className={`btn-toggle ${deliveryMode === "local" ? "active" : ""}`}
                      onClick={() => setDeliveryMode("local")}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9 22 9 12 15 12 15 22"/>
                      </svg>
                      Retiro por el local
                    </button>
                    <button 
                      className={`btn-toggle ${deliveryMode === "envio" ? "active" : ""}`}
                      onClick={() => setDeliveryMode("envio")}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
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
                        <span style={{ marginRight: '8px' }}>{method.icon}</span>
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
                  disabled={deliveryMode === "envio" && address.trim() === ""}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Realizar Pedido por WhatsApp
                </button>
              </div>
            )}
            <button className="btn-back" onClick={() => setPage("menu")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              Volver al menú
            </button>
          </div>
        )}

        {page === "done" && (
          <div className="success-section">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#25d366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto 24px' }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <h2>¡Pedido enviado!</h2>
            <p>Se ha abierto WhatsApp con el detalle de tu pedido listo para enviar.<br/>¡Gracias por elegirnos!</p>
            <button className="btn-primary" onClick={() => { setCart([]); setPage("menu"); }} style={{ marginTop: '16px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
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
