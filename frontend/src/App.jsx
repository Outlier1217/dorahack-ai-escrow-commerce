import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { MNEE_ABI } from "./contracts/MNEE_ABI";
import { ESCROW_ABI } from "./contracts/ESCROW_ABI";

/* ================= CONFIG ================= */
const MNEE_ADDRESS = "0x8Cd07e40C2801037dcaDA66CCe182F13CC3724c0";
const ESCROW_ADDRESS = "0x235Fda331a35bCff0c3F10622248d6912C576D82";
const ADMIN_ADDRESS = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";

/* ================= PRODUCTS ================= */
const products = [
  { id: 1, name: "Eminem Music", price: 50, category: "music", icon: "🎵" },
  { id: 2, name: "Blockchain Book", price: 30, category: "education", icon: "📚" },
  { id: 3, name: "Web3 Book", price: 40, category: "education", icon: "🌐" },
  { id: 4, name: "R.R. Martin Book", price: 60, category: "books", icon: "📖" },
  { id: 5, name: "Quantum Computing", price: 80, category: "technology", icon: "⚛️" }
];

/* ================= WALLET ================= */
async function connectWallet() {
  if (!window.ethereum) {
    alert("MetaMask not found");
    return null;
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  return { signer, address: await signer.getAddress() };
}

/* ================= MAIN APP ================= */
export default function App() {
  const [wallet, setWallet] = useState(null);
  const [cart, setCart] = useState([]);
  const [order, setOrder] = useState(null);
  const [escrowOrderId, setEscrowOrderId] = useState(null);
  const [orderStatus, setOrderStatus] = useState("");
  const [txStatus, setTxStatus] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminOrders, setAdminOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("products");

  const total = cart.reduce((s, p) => s + p.price, 0);

  // Add notification
  const addNotification = (message, type = "info") => {
    const id = Date.now();
    const newNotification = { id, message, type, time: new Date().toLocaleTimeString() };
    setNotifications(prev => [newNotification, ...prev.slice(0, 4)]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 8000);
  };

  // Check if user is admin
  useEffect(() => {
    if (wallet && wallet.address.toLowerCase() === ADMIN_ADDRESS.toLowerCase()) {
      setIsAdmin(true);
      addNotification("Admin mode activated", "success");
    } else {
      setIsAdmin(false);
    }
  }, [wallet]);

  // Auto-check order status for user
  useEffect(() => {
    if (!wallet || !escrowOrderId) return;
    
    const checkOrderStatus = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider);
        const orderData = await escrow.orders(escrowOrderId);
        const status = Number(orderData[2]);
        
        updateUserOrderStatus(status, orderData);
      } catch (err) {
        console.error("Status check error:", err);
      }
    };
    
    // Check every 3 seconds
    const interval = setInterval(checkOrderStatus, 3000);
    return () => clearInterval(interval);
  }, [wallet, escrowOrderId]);

  // Update user order status
  const updateUserOrderStatus = (status, orderData) => {
    const amount = ethers.formatEther(orderData[1]);
    const THRESHOLD_IN_MNEE = 200;
    const isLargeAmount = parseFloat(amount) > THRESHOLD_IN_MNEE;
    
    switch(status) {
      case 0: setOrderStatus("🆕 Order Created"); break;
      case 1: 
        if (isLargeAmount) {
          setOrderStatus("✅ Admin Approved - Payment Released!");
          addNotification("Your large order was approved by admin!", "success");
        } else {
          setOrderStatus("✅ Payment Released Successfully!");
        }
        break;
      case 2: 
        setOrderStatus("⏳ Payment Held - Waiting for Admin Approval");
        break;
      case 3: setOrderStatus("📤 Payment Sent to Seller"); break;
      case 4: setOrderStatus("🔄 Refund Requested"); break;
      case 5: 
        setOrderStatus("⏳ Refund Under Review (Admin Approval Needed)");
        addNotification("Large refund requested - waiting for admin approval", "info");
        break;
      case 6: 
        if (isLargeAmount) {
          setOrderStatus("✅ Admin Approved - Refund Sent to Your Wallet!");
          addNotification("Your large refund was approved by admin!", "success");
        } else {
          setOrderStatus("✅ Refund Sent to Your Wallet!");
          addNotification("Refund processed successfully!", "success");
        }
        break;
      case 7: 
        setOrderStatus("❌ Order Cancelled - Amount Refunded");
        addNotification("Order cancelled and refunded by admin", "warning");
        break;
      default: setOrderStatus(`Status: ${status}`);
    }
  };

  // Load admin orders
  const loadAdminOrders = async () => {
    try {
      setTxStatus("📋 Loading admin orders...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider);
      const count = await escrow.orderCount();
      
      const orders = [];
      for (let i = 1; i <= count; i++) {
        try {
          const orderData = await escrow.orders(i);
          orders.push({
            id: i,
            buyer: orderData[0],
            amount: ethers.formatEther(orderData[1]),
            status: Number(orderData[2]),
            timestamp: Number(orderData[3])
          });
        } catch (err) {
          console.log(`Order ${i} fetch error:`, err);
        }
      }
      setAdminOrders(orders);
      addNotification(`Loaded ${orders.length} orders`, "success");
    } catch (err) {
      console.error("Error loading admin orders:", err);
      addNotification("Failed to load orders", "error");
    }
  };

  // Load user order history
  const loadUserOrderHistory = async () => {
    if (!wallet) return;
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider);
      const count = await escrow.orderCount();
      
      const userOrders = [];
      for (let i = 1; i <= count; i++) {
        try {
          const orderData = await escrow.orders(i);
          if (orderData[0].toLowerCase() === wallet.address.toLowerCase()) {
            userOrders.push({
              id: i,
              buyer: orderData[0],
              amount: ethers.formatEther(orderData[1]),
              status: Number(orderData[2]),
              timestamp: new Date(Number(orderData[3]) * 1000).toLocaleString()
            });
          }
        } catch (err) {
          // Skip error
        }
      }
      setOrderHistory(userOrders);
    } catch (err) {
      console.error("Error loading user history:", err);
    }
  };

  /* ---------- STEP 1: AI CHECK ---------- */
  async function placeOrder() {
    try {
      setTxStatus("🤖 AI checking order...");
      const res = await fetch("http://localhost:3001/place-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_is_new: 1,
          order_amount: total,
          total_past_orders: 0,
          refunds_last_30_days: 0,
          account_age_days: 5
        })
      });
      const data = await res.json();
      setOrder(data);
      
      const THRESHOLD_IN_MNEE = 200;
      const isLargeAmount = total > THRESHOLD_IN_MNEE;
      
      if (data.payment_flow === "AUTO_APPROVE") {
        setOrderStatus("✅ AI Approved - Proceed to Payment");
        addNotification("AI approved your order", "success");
      } else {
        setOrderStatus("⏳ Payment Under Verification (Admin Approval Needed)");
        if (isLargeAmount) {
          addNotification(`Large order detected (${total} MNEE) - Needs admin approval`, "warning");
        }
      }
      setTxStatus(`AI Decision: ${data.payment_flow}`);
    } catch (err) {
      console.error("AI check error:", err);
      setTxStatus("❌ AI check failed");
      addNotification("AI service unavailable", "error");
    }
  }

  /* ---------- STEP 2: PAY ---------- */
  async function payWithEscrow() {
    try {
      console.log("Starting payment process...");
      
      const mnee = new ethers.Contract(MNEE_ADDRESS, MNEE_ABI, wallet.signer);
      const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, wallet.signer);

      const amount = ethers.parseUnits(String(total), 18);
      
      // Check balance
      const balance = await mnee.balanceOf(wallet.address);
      if (balance < amount) {
        setTxStatus("❌ Insufficient MNEE balance");
        addNotification("Insufficient MNEE balance", "error");
        return;
      }

      setTxStatus("🔓 Approving MNEE...");
      const approveTx = await mnee.approve(ESCROW_ADDRESS, amount);
      await approveTx.wait();

      setTxStatus("🔐 Sending payment to Escrow...");
      const payTx = await escrow.pay(amount);
      await payTx.wait();

      const id = await escrow.orderCount();
      setEscrowOrderId(id);
      
      // Check immediate status
      const orderData = await escrow.orders(id);
      const status = Number(orderData[2]);
      
      const THRESHOLD_IN_MNEE = 200;
      const isLargeAmount = total > THRESHOLD_IN_MNEE;
      
      if (status === 2) { // HOLD_PAYMENT
        setOrderStatus("⏳ Payment Held - Waiting for Admin Approval");
        if (isLargeAmount) {
          addNotification(`Large payment (${total} MNEE) held for admin approval`, "info");
        }
      } else if (status === 1) { // PAID
        setOrderStatus("✅ Payment Released Successfully!");
        addNotification("Payment successful!", "success");
      }

      setCart([]);
      setTxStatus(`✅ Payment Sent (Order #${id.toString()})`);
      
      // Load history
      loadUserOrderHistory();
      if (isAdmin) loadAdminOrders();
      
    } catch (err) {
      console.error("Payment error:", err);
      setTxStatus(`❌ Payment failed: ${err.reason || err.message}`);
      addNotification("Payment failed", "error");
    }
  }

  /* ---------- REFUND ---------- */
  async function requestRefund() {
    try {
      if (!escrowOrderId) {
        setTxStatus("❌ No order ID found");
        return;
      }
      
      console.log("Requesting refund for order:", escrowOrderId);
      const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, wallet.signer);
      
      // Check current status
      const orderData = await escrow.orders(escrowOrderId);
      const currentStatus = Number(orderData[2]);
      const amount = Number(ethers.formatEther(orderData[1]));
      
      if (currentStatus !== 1 && currentStatus !== 3) {
        setTxStatus(`❌ Refund not allowed. Current status: ${currentStatus}`);
        addNotification("Refund not allowed for this status", "error");
        return;
      }
      
      const THRESHOLD_IN_MNEE = 200;
      const isLargeAmount = amount > THRESHOLD_IN_MNEE;
      
      if (isLargeAmount) {
        setTxStatus("⚠️ Large amount detected. Refund needs admin approval.");
        addNotification(`Large refund (${amount} MNEE) - Needs admin approval`, "warning");
      } else {
        setTxStatus("🔄 Processing auto-refund...");
        addNotification("Processing auto-refund...", "info");
      }
      
      // Request refund
      const tx = await escrow.requestRefund(escrowOrderId);
      await tx.wait();
      
      // Check new status
      const updatedOrderData = await escrow.orders(escrowOrderId);
      const newStatus = Number(updatedOrderData[2]);
      
      if (newStatus === 6) { // REFUNDED
        setOrderStatus("✅ Refund Sent to Your Wallet!");
        setTxStatus("🎉 Refund successful!");
        addNotification("Refund processed successfully!", "success");
      } else if (newStatus === 5) { // HOLD_REFUND
        setOrderStatus("⏳ Refund Under Review (Admin Approval Needed)");
        setTxStatus("✅ Refund request submitted. Waiting for admin approval.");
        if (isLargeAmount) {
          addNotification("Large refund submitted for admin approval", "info");
        }
      }
      
      // Refresh data
      loadUserOrderHistory();
      if (isAdmin) loadAdminOrders();
      
    } catch (err) {
      console.error("Refund error details:", err);
      setTxStatus(`❌ Refund failed: ${err.reason || err.message}`);
      addNotification("Refund failed", "error");
    }
  }

  /* ---------- ADMIN FUNCTIONS ---------- */
  async function adminApprovePayment(orderId) {
    try {
      console.log("Admin approving payment for order:", orderId);
      
      const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, wallet.signer);
      
      // Check current status
      const orderData = await escrow.orders(orderId);
      const currentStatus = Number(orderData[2]);
      
      if (currentStatus !== 2) {
        addNotification(`Order not in HOLD_PAYMENT status (current: ${currentStatus})`, "error");
        return;
      }
      
      setTxStatus(`✅ Approving payment for order #${orderId}...`);
      const tx = await escrow.adminApprovePayment(orderId);
      await tx.wait();
      
      addNotification(`Approved payment for Order #${orderId}`, "success");
      setTxStatus(`✅ Payment approved for Order #${orderId}`);
      
      // Refresh orders
      await loadAdminOrders();
      addNotification("Order status updated - user will see approval", "info");
      
    } catch (err) {
      console.error("Admin approve payment error:", err);
      setTxStatus(`❌ Approval failed: ${err.reason || err.message}`);
      addNotification("Failed to approve payment", "error");
    }
  }

  async function adminRejectPayment(orderId) {
    try {
      console.log("Admin rejecting payment for order:", orderId);
      
      const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, wallet.signer);
      
      // Check current status
      const orderData = await escrow.orders(orderId);
      const currentStatus = Number(orderData[2]);
      
      if (currentStatus !== 2) {
        addNotification(`Order not in HOLD_PAYMENT status (current: ${currentStatus})`, "error");
        return;
      }
      
      setTxStatus(`❌ Rejecting payment for order #${orderId}...`);
      const tx = await escrow.adminRejectPayment(orderId);
      await tx.wait();
      
      addNotification(`Rejected payment for Order #${orderId}`, "warning");
      setTxStatus(`❌ Payment rejected & refunded for Order #${orderId}`);
      
      // Refresh orders
      await loadAdminOrders();
      addNotification("Order cancelled and refunded to user", "info");
      
    } catch (err) {
      console.error("Admin reject payment error:", err);
      setTxStatus(`❌ Rejection failed: ${err.reason || err.message}`);
      addNotification("Failed to reject payment", "error");
    }
  }

  async function adminApproveRefund(orderId) {
    try {
      console.log("Admin approving refund for order:", orderId);
      
      const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, wallet.signer);
      
      // Check current status
      const orderData = await escrow.orders(orderId);
      const currentStatus = Number(orderData[2]);
      
      if (currentStatus !== 5) {
        addNotification(`Order not in HOLD_REFUND status (current: ${currentStatus})`, "error");
        return;
      }
      
      setTxStatus(`✅ Approving refund for order #${orderId}...`);
      const tx = await escrow.adminApproveRefund(orderId);
      await tx.wait();
      
      addNotification(`Approved refund for Order #${orderId}`, "success");
      setTxStatus(`✅ Refund approved for Order #${orderId}`);
      
      // Refresh orders
      await loadAdminOrders();
      addNotification("Refund processed - user will see the refund", "info");
      
    } catch (err) {
      console.error("Admin approve refund error:", err);
      setTxStatus(`❌ Refund approval failed: ${err.reason || err.message}`);
      addNotification("Failed to approve refund", "error");
    }
  }

  async function adminRejectRefund(orderId) {
    try {
      console.log("Admin rejecting refund for order:", orderId);
      
      const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, wallet.signer);
      
      // Check current status
      const orderData = await escrow.orders(orderId);
      const currentStatus = Number(orderData[2]);
      
      if (currentStatus !== 5) {
        addNotification(`Order not in HOLD_REFUND status (current: ${currentStatus})`, "error");
        return;
      }
      
      setTxStatus(`❌ Rejecting refund for order #${orderId}...`);
      const tx = await escrow.adminRejectRefund(orderId);
      await tx.wait();
      
      addNotification(`Rejected refund for Order #${orderId}`, "warning");
      setTxStatus(`❌ Refund rejected for Order #${orderId}`);
      
      // Refresh orders
      await loadAdminOrders();
      addNotification("Refund request rejected", "info");
      
    } catch (err) {
      console.error("Admin reject refund error:", err);
      setTxStatus(`❌ Refund rejection failed: ${err.reason || err.message}`);
      addNotification("Failed to reject refund", "error");
    }
  }

  /* ---------- UTILITY FUNCTIONS ---------- */
  const checkContractStatus = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider);
      
      const admin = await escrow.admin();
      const threshold = await escrow.THRESHOLD();
      const orderCount = await escrow.orderCount();
      
      const info = `
Contract Info:
Admin: ${admin}
THRESHOLD: ${ethers.formatEther(threshold)} MNEE
Order Count: ${orderCount}
Is Admin: ${wallet.address.toLowerCase() === admin.toLowerCase()}
      `;
      
      console.log(info);
      addNotification("Contract info loaded", "info");
      setTxStatus(`📊 Contract: ${orderCount} orders, THRESHOLD=${ethers.formatEther(threshold)} MNEE`);
      
    } catch (err) {
      console.error("Contract check error:", err);
      addNotification("Failed to check contract", "error");
    }
  };

  // Format status for display
  const formatStatus = (status) => {
    switch(status) {
      case 0: return { text: "🆕 CREATED", color: "#2196F3" };
      case 1: return { text: "✅ PAID", color: "#4CAF50" };
      case 2: return { text: "⏳ HOLD_PAYMENT", color: "#FF9800" };
      case 3: return { text: "📤 RELEASED", color: "#673AB7" };
      case 4: return { text: "🔄 REFUND_REQUESTED", color: "#009688" };
      case 5: return { text: "⏳ HOLD_REFUND", color: "#FF9800" };
      case 6: return { text: "💸 REFUNDED", color: "#4CAF50" };
      case 7: return { text: "❌ CANCELLED", color: "#F44336" };
      default: return { text: `Unknown (${status})`, color: "#9E9E9E" };
    }
  };

  /* ================= UI ================= */
  return (
    <div style={styles.container}>
      {/* TOP BAR */}
      <div style={styles.topBar}>
        <div style={styles.hackathonBanner}>
          🏆 Cronos x402 Paytech Hackathon
        </div>
        
        <div style={styles.topBarContent}>
          <div style={styles.logoContainer}>
            <div style={styles.logoIcon}>🛡️</div>
            <div>
              <h1 style={styles.appTitle}>AI Escrow Commerce</h1>
              <p style={styles.appSubtitle}>Secure Web3 Payments with AI Risk Assessment</p>
            </div>
          </div>
          
          <div style={styles.walletSection}>
            {!wallet ? (
              <button 
                onClick={async () => setWallet(await connectWallet())}
                style={styles.connectButton}
              >
                🔗 Connect Wallet
              </button>
            ) : (
              <div style={styles.walletConnected}>
                <div style={styles.walletInfo}>
                  <div style={styles.walletAddress}>
                    {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                    {isAdmin && <span style={styles.adminBadge}>👑 ADMIN</span>}
                  </div>
                  <div style={styles.walletStatus}>🟢 Connected</div>
                </div>
                {isAdmin && (
                  <div style={styles.adminButtons}>
                    <button 
                      onClick={loadAdminOrders}
                      style={styles.adminButton}
                    >
                      👨‍💼 Admin Panel
                    </button>
                    <button 
                      onClick={checkContractStatus}
                      style={styles.adminButton}
                    >
                      🔍 Debug
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NOTIFICATIONS */}
      {notifications.length > 0 && (
        <div style={styles.notifications}>
          {notifications.map(notif => (
            <div 
              key={notif.id} 
              style={{
                ...styles.notification,
                background: notif.type === "success" ? "#10B981" : 
                           notif.type === "error" ? "#EF4444" : 
                           notif.type === "warning" ? "#F59E0B" : "#3B82F6"
              }}
            >
              <span>{notif.message}</span>
              <small style={styles.notificationTime}>{notif.time}</small>
            </div>
          ))}
        </div>
      )}

      {/* MAIN CONTENT */}
      <div style={styles.mainContent}>
        {/* LEFT SIDEBAR - NAVIGATION */}
        <div style={styles.sidebar}>
          <nav style={styles.nav}>
            <button 
              onClick={() => setActiveTab("products")}
              style={{
                ...styles.navButton,
                ...(activeTab === "products" && styles.navButtonActive)
              }}
            >
              🛍️ Products
            </button>
            <button 
              onClick={() => setActiveTab("cart")}
              style={{
                ...styles.navButton,
                ...(activeTab === "cart" && styles.navButtonActive)
              }}
            >
              🛒 Cart ({cart.length})
            </button>
            <button 
              onClick={() => setActiveTab("orders")}
              style={{
                ...styles.navButton,
                ...(activeTab === "orders" && styles.navButtonActive)
              }}
            >
              📦 My Orders
            </button>
            {isAdmin && (
              <button 
                onClick={() => {
                  setActiveTab("admin");
                  loadAdminOrders();
                }}
                style={{
                  ...styles.navButton,
                  ...(activeTab === "admin" && styles.navButtonActive)
                }}
              >
                👑 Admin Panel
              </button>
            )}
          </nav>

          {/* STATUS PANEL */}
          {(orderStatus || txStatus) && (
            <div style={styles.statusPanel}>
              <h3 style={styles.statusTitle}>🔍 Status</h3>
              {orderStatus && (
                <div style={styles.statusItem}>
                  <strong>Order:</strong> {orderStatus}
                </div>
              )}
              {txStatus && (
                <div style={styles.statusItem}>
                  <strong>Transaction:</strong> {txStatus}
                </div>
              )}
              {escrowOrderId && (
                <div style={styles.statusItem}>
                  <strong>Order ID:</strong> #{escrowOrderId}
                </div>
              )}
            </div>
          )}

          {/* CONTRACT INFO */}
          <div style={styles.contractInfo}>
            <h4 style={styles.contractTitle}>📜 Contract Info</h4>
            <div style={styles.contractAddress}>
              <strong>Escrow:</strong> {ESCROW_ADDRESS.slice(0, 10)}...
            </div>
            <div style={styles.contractAddress}>
              <strong>Token:</strong> {MNEE_ADDRESS.slice(0, 10)}...
            </div>
            <div style={styles.thresholdInfo}>
              ⚡ Threshold: 200 MNEE
            </div>
          </div>
        </div>

        {/* MAIN PANEL */}
        <div style={styles.mainPanel}>
          {/* PRODUCTS TAB */}
          {activeTab === "products" && (
            <div>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>🎁 Digital Products</h2>
                <p style={styles.sectionSubtitle}>Browse and add items to your cart</p>
              </div>
              
              <div style={styles.productsGrid}>
                {products.map(p => (
                  <div key={p.id} style={styles.productCard}>
                    <div style={styles.productIcon}>{p.icon}</div>
                    <h3 style={styles.productName}>{p.name}</h3>
                    <div style={styles.productCategory}>{p.category}</div>
                    <div style={styles.productPrice}>
                      <span style={styles.priceAmount}>{p.price}</span>
                      <span style={styles.priceCurrency}> MNEE</span>
                    </div>
                    <button 
                      onClick={() => {
                        setCart([...cart, p]);
                        addNotification(`Added ${p.name} to cart`, "info");
                      }}
                      style={styles.addToCartButton}
                    >
                      + Add to Cart
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CART TAB */}
          {activeTab === "cart" && (
            <div>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>🛒 Your Shopping Cart</h2>
                <p style={styles.sectionSubtitle}>
                  {cart.length} item{cart.length !== 1 ? 's' : ''} • Total: {total} MNEE
                </p>
              </div>

              {cart.length === 0 ? (
                <div style={styles.emptyCart}>
                  <div style={styles.emptyCartIcon}>🛒</div>
                  <h3>Your cart is empty</h3>
                  <p>Add some products from the Products tab</p>
                  <button 
                    onClick={() => setActiveTab("products")}
                    style={styles.browseButton}
                  >
                    Browse Products
                  </button>
                </div>
              ) : (
                <>
                  <div style={styles.cartItems}>
                    {cart.map((item, idx) => (
                      <div key={idx} style={styles.cartItem}>
                        <div style={styles.cartItemInfo}>
                          <span style={styles.cartItemName}>{item.name}</span>
                          <span style={styles.cartItemPrice}>{item.price} MNEE</span>
                        </div>
                        <button 
                          onClick={() => {
                            const newCart = [...cart];
                            newCart.splice(idx, 1);
                            setCart(newCart);
                            addNotification(`Removed ${item.name} from cart`, "info");
                          }}
                          style={styles.removeButton}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  <div style={styles.cartSummary}>
                    <div style={styles.summaryRow}>
                      <span>Subtotal</span>
                      <span>{total} MNEE</span>
                    </div>
                    <div style={styles.summaryRow}>
                      <span>AI Processing Fee</span>
                      <span>0 MNEE</span>
                    </div>
                    <div style={styles.summaryTotal}>
                      <span>Total Amount</span>
                      <span style={styles.totalAmount}>{total} MNEE</span>
                    </div>

                    <div style={styles.cartActions}>
                      <button 
                        onClick={() => {
                          setCart([]);
                          addNotification("Cart cleared", "info");
                        }}
                        style={styles.clearCartButton}
                      >
                        Clear Cart
                      </button>
                      
                      {wallet && cart.length > 0 && !order && (
                        <button 
                          onClick={placeOrder}
                          style={styles.placeOrderButton}
                        >
                          🤖 Place Order (AI Check)
                        </button>
                      )}

                      {order && (
                        <div style={styles.paymentButtons}>
                          {order?.payment_flow === "AUTO_APPROVE" && (
                            <button 
                              onClick={payWithEscrow}
                              style={styles.payButton}
                            >
                              💳 Pay with Escrow
                            </button>
                          )}

                          {order?.payment_flow === "HOLD_VERIFICATION" && (
                            <button 
                              onClick={payWithEscrow}
                              style={styles.payButtonHold}
                            >
                              ⏳ Pay (Admin Verification Needed)
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ORDERS TAB */}
          {activeTab === "orders" && (
            <div>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>📦 Order History</h2>
                <div style={styles.orderHeaderActions}>
                  <button 
                    onClick={loadUserOrderHistory}
                    style={styles.refreshButton}
                  >
                    🔄 Refresh Orders
                  </button>
                  {escrowOrderId && (
                    <button 
                      onClick={requestRefund}
                      style={styles.refundButton}
                    >
                      🔄 Request Refund
                    </button>
                  )}
                </div>
              </div>

              {orderHistory.length === 0 ? (
                <div style={styles.emptyOrders}>
                  <div style={styles.emptyOrdersIcon}>📦</div>
                  <h3>No orders yet</h3>
                  <p>Make your first purchase to see orders here</p>
                </div>
              ) : (
                <div style={styles.ordersList}>
                  {orderHistory.map(o => {
                    const statusInfo = formatStatus(o.status);
                    return (
                      <div key={o.id} style={styles.orderCard}>
                        <div style={styles.orderHeader}>
                          <div>
                            <h4 style={styles.orderId}>Order #{o.id}</h4>
                            <div style={styles.orderTime}>{o.timestamp}</div>
                          </div>
                          <div style={{
                            ...styles.orderStatus,
                            background: `${statusInfo.color}20`,
                            color: statusInfo.color,
                            borderColor: statusInfo.color
                          }}>
                            {statusInfo.text}
                          </div>
                        </div>
                        <div style={styles.orderDetails}>
                          <div style={styles.orderAmount}>
                            Amount: <strong>{parseFloat(o.amount).toFixed(2)} MNEE</strong>
                          </div>
                          <div style={styles.orderBuyer}>
                            Buyer: {o.buyer.slice(0, 8)}...{o.buyer.slice(-6)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ADMIN TAB */}
          {activeTab === "admin" && isAdmin && (
            <div>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>👑 Admin Dashboard</h2>
                <div style={styles.adminHeaderActions}>
                  <button 
                    onClick={loadAdminOrders}
                    style={styles.refreshButton}
                  >
                    🔄 Refresh Orders
                  </button>
                  <button 
                    onClick={checkContractStatus}
                    style={styles.debugButton}
                  >
                    📊 Contract Info
                  </button>
                </div>
              </div>

              {adminOrders.length === 0 ? (
                <div style={styles.emptyAdmin}>
                  <div style={styles.emptyAdminIcon}>👑</div>
                  <h3>No orders to manage</h3>
                  <p>Waiting for users to place orders...</p>
                </div>
              ) : (
                <div style={styles.adminOrdersGrid}>
                  {adminOrders.map(o => {
                    const statusInfo = formatStatus(o.status);
                    return (
                      <div key={o.id} style={styles.adminOrderCard}>
                        <div style={styles.adminOrderHeader}>
                          <div>
                            <h4 style={styles.adminOrderId}>Order #{o.id}</h4>
                            <div style={styles.adminOrderTime}>
                              {o.timestamp ? new Date(o.timestamp * 1000).toLocaleString() : "N/A"}
                            </div>
                          </div>
                          <div style={{
                            ...styles.adminOrderStatus,
                            background: `${statusInfo.color}20`,
                            color: statusInfo.color
                          }}>
                            {statusInfo.text}
                          </div>
                        </div>

                        <div style={styles.adminOrderInfo}>
                          <div style={styles.adminOrderField}>
                            <strong>Buyer:</strong> 
                            <span style={styles.adminOrderAddress}>
                              {o.buyer.slice(0, 8)}...{o.buyer.slice(-6)}
                            </span>
                          </div>
                          <div style={styles.adminOrderField}>
                            <strong>Amount:</strong> 
                            <span style={styles.adminOrderAmount}>
                              {parseFloat(o.amount).toFixed(2)} MNEE
                            </span>
                          </div>
                        </div>

                        {/* Admin Actions */}
                        {o.status === 2 && (
                          <div style={styles.adminActions}>
                            <div style={styles.adminActionNote}>
                              ⚠️ Large payment requires approval
                            </div>
                            <div style={styles.adminActionButtons}>
                              <button 
                                onClick={() => adminApprovePayment(o.id)}
                                style={styles.approveButton}
                              >
                                ✅ Approve Payment
                              </button>
                              <button 
                                onClick={() => adminRejectPayment(o.id)}
                                style={styles.rejectButton}
                              >
                                ❌ Reject & Refund
                              </button>
                            </div>
                          </div>
                        )}

                        {o.status === 5 && (
                          <div style={styles.adminActions}>
                            <div style={styles.adminActionNote}>
                              ⚠️ Large refund requires approval
                            </div>
                            <div style={styles.adminActionButtons}>
                              <button 
                                onClick={() => adminApproveRefund(o.id)}
                                style={styles.approveButton}
                              >
                                ✅ Approve Refund
                              </button>
                              <button 
                                onClick={() => adminRejectRefund(o.id)}
                                style={styles.rejectButton}
                              >
                                ❌ Reject Refund
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <div style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.footerSection}>
            <h4>🛡️ AI Escrow System</h4>
            <p>Secure Web3 payments powered by AI risk assessment</p>
          </div>
          <div style={styles.footerSection}>
            <h4>📋 Rules</h4>
            <p>≤200 MNEE = Auto Approval</p>
            <p>&gt;200 MNEE = Admin Verification Required</p>
          </div>
          <div style={styles.footerSection}>
            <h4>💡 Tips</h4>
            <p>• Check browser console for detailed logs</p>
            <p>• Admin address: {ADMIN_ADDRESS.slice(0, 10)}...</p>
            <p>• Refresh page if transactions seem stuck</p>
          </div>
        </div>
      </div>

      {/* STYLES */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#333',
  },
  
  topBar: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '0 20px',
  },
  
  hackathonBanner: {
    background: 'linear-gradient(90deg, #FF6B6B, #4ECDC4)',
    color: 'white',
    textAlign: 'center',
    padding: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
  },
  
  topBarContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 0',
    maxWidth: '1400px',
    margin: '0 auto',
    width: '100%',
  },
  
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  
  logoIcon: {
    fontSize: '40px',
    background: 'rgba(255, 255, 255, 0.2)',
    padding: '15px',
    borderRadius: '12px',
  },
  
  appTitle: {
    margin: 0,
    color: 'white',
    fontSize: '28px',
    fontWeight: 'bold',
  },
  
  appSubtitle: {
    margin: '5px 0 0 0',
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '14px',
  },
  
  walletSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  
  connectButton: {
    background: 'white',
    color: '#764ba2',
    border: 'none',
    padding: '12px 28px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
  },
  
  walletConnected: {
    textAlign: 'right',
  },
  
  walletInfo: {
    background: 'rgba(255, 255, 255, 0.2)',
    padding: '12px 20px',
    borderRadius: '12px',
    marginBottom: '10px',
  },
  
  walletAddress: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: '16px',
    marginBottom: '5px',
  },
  
  adminBadge: {
    background: '#FFD700',
    color: '#333',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    marginLeft: '8px',
  },
  
  walletStatus: {
    color: '#4CAF50',
    fontSize: '12px',
  },
  
  adminButtons: {
    display: 'flex',
    gap: '10px',
  },
  
  adminButton: {
    background: '#FF9800',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  
  notifications: {
    position: 'fixed',
    top: '80px',
    right: '20px',
    zIndex: 1000,
    maxWidth: '400px',
  },
  
  notification: {
    color: 'white',
    padding: '12px 16px',
    borderRadius: '10px',
    marginBottom: '10px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    animation: 'slideIn 0.3s ease',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  notificationTime: {
    opacity: 0.8,
    fontSize: '12px',
  },
  
  mainContent: {
    display: 'flex',
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px',
    gap: '20px',
    minHeight: 'calc(100vh - 180px)',
  },
  
  sidebar: {
    width: '280px',
    flexShrink: 0,
  },
  
  nav: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '15px',
    padding: '15px',
    marginBottom: '20px',
  },
  
  navButton: {
    display: 'block',
    width: '100%',
    padding: '12px 15px',
    marginBottom: '8px',
    background: 'transparent',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    textAlign: 'left',
    fontSize: '15px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  
  navButtonActive: {
    background: 'rgba(255, 255, 255, 0.2)',
    fontWeight: 'bold',
  },
  
  statusPanel: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '15px',
    padding: '20px',
    marginBottom: '20px',
    color: 'white',
  },
  
  statusTitle: {
    marginTop: 0,
    marginBottom: '15px',
    fontSize: '18px',
  },
  
  statusItem: {
    marginBottom: '10px',
    fontSize: '14px',
  },
  
  contractInfo: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '15px',
    padding: '20px',
    color: 'white',
  },
  
  contractTitle: {
    marginTop: 0,
    marginBottom: '15px',
    fontSize: '16px',
  },
  
  contractAddress: {
    fontSize: '12px',
    marginBottom: '8px',
    opacity: 0.9,
  },
  
  thresholdInfo: {
    fontSize: '13px',
    background: 'rgba(255, 255, 255, 0.2)',
    padding: '8px 12px',
    borderRadius: '6px',
    marginTop: '10px',
  },
  
  mainPanel: {
    flex: 1,
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '20px',
    padding: '30px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
    overflowY: 'auto',
  },
  
  sectionHeader: {
    marginBottom: '30px',
    borderBottom: '2px solid #f0f0f0',
    paddingBottom: '20px',
  },
  
  sectionTitle: {
    margin: '0 0 10px 0',
    fontSize: '28px',
    color: '#333',
  },
  
  sectionSubtitle: {
    margin: 0,
    color: '#666',
    fontSize: '16px',
  },
  
  productsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '20px',
  },
  
  productCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    transition: 'all 0.3s ease',
    border: '1px solid #f0f0f0',
  },
  
  productIcon: {
    fontSize: '40px',
    marginBottom: '15px',
  },
  
  productName: {
    margin: '0 0 10px 0',
    fontSize: '18px',
    color: '#333',
  },
  
  productCategory: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '15px',
  },
  
  productPrice: {
    marginBottom: '20px',
  },
  
  priceAmount: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#764ba2',
  },
  
  priceCurrency: {
    fontSize: '16px',
    color: '#666',
  },
  
  addToCartButton: {
    background: '#764ba2',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    width: '100%',
    fontSize: '14px',
    transition: 'all 0.3s ease',
  },
  
  emptyCart: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  
  emptyCartIcon: {
    fontSize: '60px',
    marginBottom: '20px',
    opacity: 0.3,
  },
  
  browseButton: {
    background: '#764ba2',
    color: 'white',
    border: 'none',
    padding: '12px 30px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    marginTop: '20px',
  },
  
  cartItems: {
    marginBottom: '30px',
  },
  
  cartItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    background: '#f8f8f8',
    borderRadius: '8px',
    marginBottom: '10px',
  },
  
  cartItemInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    flex: 1,
    marginRight: '20px',
  },
  
  cartItemName: {
    fontWeight: 'bold',
  },
  
  cartItemPrice: {
    color: '#764ba2',
    fontWeight: 'bold',
  },
  
  removeButton: {
    background: '#FF6B6B',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  
  cartSummary: {
    background: '#f8f8f8',
    borderRadius: '12px',
    padding: '25px',
  },
  
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
    fontSize: '16px',
  },
  
  summaryTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '2px solid #ddd',
    fontSize: '20px',
    fontWeight: 'bold',
  },
  
  totalAmount: {
    color: '#764ba2',
    fontSize: '24px',
  },
  
  cartActions: {
    marginTop: '30px',
    display: 'flex',
    gap: '15px',
  },
  
  clearCartButton: {
    background: '#FF6B6B',
    color: 'white',
    border: 'none',
    padding: '15px 30px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    flex: 1,
  },
  
  placeOrderButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    padding: '15px 30px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    flex: 2,
    fontWeight: 'bold',
  },
  
  paymentButtons: {
    flex: 2,
  },
  
  payButton: {
    background: '#4CAF50',
    color: 'white',
    border: 'none',
    padding: '15px 30px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    width: '100%',
    fontWeight: 'bold',
  },
  
  payButtonHold: {
    background: '#FF9800',
    color: 'white',
    border: 'none',
    padding: '15px 30px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    width: '100%',
    fontWeight: 'bold',
  },
  
  orderHeaderActions: {
    display: 'flex',
    gap: '15px',
    marginTop: '15px',
  },
  
  refreshButton: {
    background: '#2196F3',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  
  refundButton: {
    background: '#F44336',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  
  emptyOrders: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  
  emptyOrdersIcon: {
    fontSize: '60px',
    marginBottom: '20px',
    opacity: 0.3,
  },
  
  ordersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  
  orderCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: '1px solid #f0f0f0',
  },
  
  orderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px',
  },
  
  orderId: {
    margin: '0 0 5px 0',
    fontSize: '18px',
  },
  
  orderTime: {
    fontSize: '12px',
    color: '#666',
  },
  
  orderStatus: {
    padding: '5px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 'bold',
    border: '1px solid',
  },
  
  orderDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  orderAmount: {
    fontSize: '16px',
  },
  
  orderBuyer: {
    fontSize: '14px',
    color: '#666',
  },
  
  adminHeaderActions: {
    display: 'flex',
    gap: '15px',
    marginTop: '15px',
  },
  
  debugButton: {
    background: '#9C27B0',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  
  emptyAdmin: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  
  emptyAdminIcon: {
    fontSize: '60px',
    marginBottom: '20px',
    opacity: 0.3,
  },
  
  adminOrdersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
  },
  
  adminOrderCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: '1px solid #f0f0f0',
  },
  
  adminOrderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px',
  },
  
  adminOrderId: {
    margin: '0 0 5px 0',
    fontSize: '18px',
  },
  
  adminOrderTime: {
    fontSize: '12px',
    color: '#666',
  },
  
  adminOrderStatus: {
    padding: '5px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  
  adminOrderInfo: {
    marginBottom: '20px',
  },
  
  adminOrderField: {
    marginBottom: '8px',
    display: 'flex',
    justifyContent: 'space-between',
  },
  
  adminOrderAddress: {
    fontSize: '14px',
    color: '#666',
  },
  
  adminOrderAmount: {
    fontSize: '16px',
    color: '#764ba2',
    fontWeight: 'bold',
  },
  
  adminActions: {
    background: '#f8f8f8',
    padding: '15px',
    borderRadius: '8px',
    marginTop: '15px',
  },
  
  adminActionNote: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '10px',
  },
  
  adminActionButtons: {
    display: 'flex',
    gap: '10px',
  },
  
  approveButton: {
    background: '#4CAF50',
    color: 'white',
    border: 'none',
    padding: '8px 15px',
    borderRadius: '6px',
    cursor: 'pointer',
    flex: 1,
    fontSize: '14px',
  },
  
  rejectButton: {
    background: '#F44336',
    color: 'white',
    border: 'none',
    padding: '8px 15px',
    borderRadius: '6px',
    cursor: 'pointer',
    flex: 1,
    fontSize: '14px',
  },
  
  footer: {
    background: 'rgba(0, 0, 0, 0.3)',
    color: 'white',
    padding: '30px 20px',
    marginTop: '40px',
  },
  
  footerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '30px',
  },
  
  footerSection: {
    fontSize: '14px',
  },
  
  footerSection: {
    fontSize: '14px',
  },
  
  footerSection: {
    fontSize: '14px',
  },
};