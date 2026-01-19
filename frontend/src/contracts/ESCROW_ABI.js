export const ESCROW_ABI = [
  // Order functions
  "function pay(uint256 amount)",
  "function adminApprovePayment(uint256 orderId)",
  "function adminRejectPayment(uint256 orderId)",
  "function adminApproveRefund(uint256 orderId)",
  "function adminRejectRefund(uint256 orderId)",
  "function requestRefund(uint256 orderId)",
  
  // Release functions
  "function releaseToSeller(uint256 orderId, address seller)",
  
  // View functions
  "function orders(uint256) view returns (address buyer, uint256 amount, uint8 status, uint256 timestamp)",
  "function getOrderDetails(uint256 orderId) view returns (address, uint256, uint8, uint256)",
  "function orderCount() view returns (uint256)",
  "function getOrdersCount() view returns (uint256)",
  "function admin() view returns (address)",
  "function token() view returns (address)",
  "function THRESHOLD() view returns (uint256)",
  
  // Events
  "event OrderCreated(uint256 indexed orderId, address buyer, uint256 amount, uint8 status)",
  "event PaymentApproved(uint256 indexed orderId, address approvedBy)",
  "event PaymentRejected(uint256 indexed orderId, address rejectedBy)",
  "event RefundRequested(uint256 indexed orderId, address buyer, uint256 amount)",
  "event RefundApproved(uint256 indexed orderId, address approvedBy)",
  "event RefundRejected(uint256 indexed orderId, address rejectedBy)"
];