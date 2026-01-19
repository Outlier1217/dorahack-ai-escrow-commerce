// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

interface IERC20 {
    function transferFrom(address from, address to, uint amount) external returns (bool);
    function transfer(address to, uint amount) external returns (bool);
}

contract EcommerceEscrow {
    IERC20 public token;
    address public admin;

    uint public constant THRESHOLD = 200 * 10**18; // 200 MNEE with 18 decimals

    enum Status {
        CREATED,        // 0
        PAID,           // 1
        HOLD_PAYMENT,   // 2
        RELEASED,       // 3
        REFUND_REQUESTED, // 4
        HOLD_REFUND,    // 5
        REFUNDED,       // 6
        CANCELLED       // 7
    }

    struct Order {
        address buyer;
        uint amount;
        Status status;
        uint timestamp;
    }

    uint public orderCount;
    mapping(uint => Order) public orders;
    
    // Events for frontend listening
    event OrderCreated(uint indexed orderId, address buyer, uint amount, Status status);
    event PaymentApproved(uint indexed orderId, address approvedBy);
    event PaymentRejected(uint indexed orderId, address rejectedBy);
    event RefundRequested(uint indexed orderId, address buyer, uint amount);
    event RefundApproved(uint indexed orderId, address approvedBy);
    event RefundRejected(uint indexed orderId, address rejectedBy);

    constructor(address _token) {
        token = IERC20(_token);
        admin = msg.sender;
    }

    /* ---------------- PAYMENT ---------------- */

    function pay(uint amount) external {
        require(amount > 0, "Invalid amount");
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        orderCount++;
        Status s = amount <= THRESHOLD ? Status.PAID : Status.HOLD_PAYMENT;

        orders[orderCount] = Order({
            buyer: msg.sender,
            amount: amount,
            status: s,
            timestamp: block.timestamp
        });

        emit OrderCreated(orderCount, msg.sender, amount, s);
    }

    function adminApprovePayment(uint orderId) external {
        require(msg.sender == admin, "Only admin");
        Order storage o = orders[orderId];
        require(o.status == Status.HOLD_PAYMENT, "Not in HOLD_PAYMENT state");

        o.status = Status.PAID;
        emit PaymentApproved(orderId, msg.sender);
    }

    function adminRejectPayment(uint orderId) external {
        require(msg.sender == admin, "Only admin");
        Order storage o = orders[orderId];
        require(o.status == Status.HOLD_PAYMENT, "Not in HOLD_PAYMENT state");

        o.status = Status.CANCELLED;
        require(token.transfer(o.buyer, o.amount), "Refund transfer failed");
        
        emit PaymentRejected(orderId, msg.sender);
    }

    function releaseToSeller(uint orderId, address seller) external {
        require(msg.sender == admin, "Only admin");
        Order storage o = orders[orderId];
        require(o.status == Status.PAID, "Not payable");

        o.status = Status.RELEASED;
        require(token.transfer(seller, o.amount), "Transfer to seller failed");
    }

    /* ---------------- REFUND ---------------- */

    function requestRefund(uint orderId) external {
        Order storage o = orders[orderId];
        require(msg.sender == o.buyer, "Not buyer");
        require(
            o.status == Status.PAID || o.status == Status.RELEASED,
            "Refund not allowed"
        );

        if (o.amount <= THRESHOLD) {
            // Auto refund for small amounts
            o.status = Status.REFUNDED;
            require(token.transfer(o.buyer, o.amount), "Refund transfer failed");
            emit RefundApproved(orderId, address(0)); // address(0) means auto-approved
        } else {
            // Hold for admin approval
            o.status = Status.HOLD_REFUND;
            emit RefundRequested(orderId, msg.sender, o.amount);
        }
    }

    function adminApproveRefund(uint orderId) external {
        require(msg.sender == admin, "Only admin");
        Order storage o = orders[orderId];
        require(o.status == Status.HOLD_REFUND, "Not in HOLD_REFUND state");

        o.status = Status.REFUNDED;
        require(token.transfer(o.buyer, o.amount), "Refund transfer failed");
        
        emit RefundApproved(orderId, msg.sender);
    }

    function adminRejectRefund(uint orderId) external {
        require(msg.sender == admin, "Only admin");
        Order storage o = orders[orderId];
        require(o.status == Status.HOLD_REFUND, "Not in HOLD_REFUND state");

        // If order was RELEASED before, keep it as RELEASED
        // Otherwise set back to PAID
        o.status = Status.PAID;
        
        emit RefundRejected(orderId, msg.sender);
    }
    
    /* ---------------- VIEW FUNCTIONS ---------------- */
    
    function getOrderDetails(uint orderId) external view returns (
        address buyer,
        uint amount,
        Status status,
        uint timestamp
    ) {
        Order memory o = orders[orderId];
        return (o.buyer, o.amount, o.status, o.timestamp);
    }
    
    function getOrdersCount() external view returns (uint) {
        return orderCount;
    }
}