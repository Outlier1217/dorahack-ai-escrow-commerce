📦 AI Escrow Commerce
Cronos x402 Hackathon Submission
🚀 Project Overview

AI Escrow Commerce is a decentralized e-commerce payment infrastructure that combines AI-driven risk assessment with smart contract escrow on the Cronos blockchain.

The system intelligently routes payments based on transaction risk and amount:

Low-risk / small payments are automatically settled

High-value or risky payments are securely held in escrow for admin verification

This project demonstrates real-world x402-compatible, agent-triggered payment flows with AI decision making and on-chain execution.

✨ Core Features

🤖 AI-Powered Risk Assessment
XGBoost model evaluates transaction parameters to determine payment routing.

🔒 Smart Contract Escrow
Secure, automated escrow deployed on Cronos EVM.

⚡ Automated Payments
Transactions ≤ 200 MNEE are auto-approved without admin intervention.

🔐 Admin-Verified Security
Transactions > 200 MNEE require admin approval before fund release.

💸 Intelligent Refund System
Refunds follow the same AI-based risk logic as payments.

📊 Real-Time Admin Dashboard
Monitor pending approvals, transaction history, and refunds.

🌐 Cronos Native
Fully deployed and tested on Cronos Testnet.

🏆 Hackathon Tracks Qualified
✅ Main Track – x402 Applications

Agent-triggered payments based on AI decisions

AI-driven smart contract interactions

✅ x402 Agentic Finance / Payment Track

Automated settlement pipelines

Conditional transaction execution

Multi-step payment workflows

✅ Crypto.com × Cronos Ecosystem Integration

Native Cronos dApp

Wallet-based user interactions

Ecosystem-ready architecture

🛠️ Tech Stack
Component	Technology
Blockchain	Cronos EVM
Smart Contracts	Solidity, Hardhat, Ethers.js
Frontend	React.js, Vite, Ethers.js
Backend	Node.js, Express.js
AI / ML	Python, FastAPI, XGBoost
Database	JSON-based storage
Testing	Hardhat Network, MetaMask
📁 Repository Structure
ai-escrow-commerce/
├── contracts/                 # Smart Contracts
│   ├── MNEEToken.sol          # ERC-20 Token
│   └── EcommerceEscrow.sol    # Escrow Logic
├── frontend/                  # React Frontend
│   ├── src/
│   └── public/
├── backend/                   # Node.js API
│   └── server.js
├── ai/                        # AI Risk Engine
│   └── agent.py
├── scripts/                   # Deployment Scripts
├── test/                      # Smart Contract Tests
└── README.md

🚀 Quick Start
Prerequisites

Node.js v18+

Python 3.8+

MetaMask Wallet

Git

🔧 Local Development Setup
# 1. Clone repository
git clone https://github.com/yourusername/ai-escrow-commerce.git
cd ai-escrow-commerce

# 2. Install dependencies
npm install
cd backend && npm install
cd ../frontend && npm install

# 3. Start local blockchain
npx hardhat node

# 4. Deploy contracts
npx hardhat run scripts/deploy.js --network localhost

# 5. Start backend
cd backend
node server.js

# 6. Start AI service
cd ai
pip install -r requirements.txt
uvicorn agent:app --reload --port 8000

# 7. Start frontend
cd frontend
npm run dev

🌐 Cronos Testnet Deployment
# 1. Set environment variables
echo "PRIVATE_KEY=your_private_key" > .env

# 2. Get test CRO
# https://cronos.org/faucet

# 3. Deploy contracts
npx hardhat run scripts/deploy.js --network cronosTestnet

# 4. Update frontend contract addresses
# frontend/src/config/contracts.js

# 5. Distribute test tokens
npx hardhat run scripts/distribute-tokens.js --network cronosTestnet

🎮 How It Works
💳 Payment Flow

User adds products to cart

AI service analyzes transaction parameters

Decision Logic

≤ 200 MNEE → Auto-approve

200 MNEE → Hold for admin

Smart contract escrows funds

Admin approves or rejects

Funds released or refunded

🔄 Refund Flow

User requests refund

AI evaluates refund request

Low value → Auto refund

High value → Admin approval

Smart contract processes refund

🔗 Smart Contracts
🪙 MNEEToken (ERC-20)

Address: 0xCABEe62adFB2a4d4172Fc2F7536f324FC52C274a

Network: Cronos Testnet

Decimals: 18

🏦 EcommerceEscrow

Address: 0xD89c1432EaA169C54dC7610C744c68a2F4b6B3e5

Network: Cronos Testnet

Features

Threshold-based payment routing

Admin approval mechanism

Automated refunds

Order status tracking

🤖 AI Integration
Risk Factors Analyzed

Transaction amount

User account age

Past order history

Recent refund behavior

Decision Matrix
Amount ≤ 200 MNEE + Low Risk → AUTO_APPROVE
Amount > 200 MNEE            → HOLD_VERIFICATION
High Risk Score              → HOLD_VERIFICATION

📊 Admin Features

Pending order dashboard

Payment & refund approvals

Real-time status updates

Complete transaction history

🔐 Security Features

Smart contract escrow protection

Admin verification for high-value payments

AI-based fraud prevention

Fully transparent on-chain auditing

🧪 Testing
# Smart contract tests
npx hardhat test

# Specific test cases
npx hardhat test --grep "Payment"
npx hardhat test --grep "Refund"

# Frontend tests
cd frontend && npm test

📝 Configuration
Environment Variables
PRIVATE_KEY=your_wallet_private_key
CRONOS_RPC=https://evm-t3.cronos.org
MNEE_ADDRESS=0x...
ESCROW_ADDRESS=0x...
ADMIN_ADDRESS=0x...

🙏 Acknowledgments

Cronos Labs – x402 Hackathon

Crypto.com – Ecosystem support

DoraHacks – Hackathon platform

OpenZeppelin – Secure contract templates

Hardhat – Ethereum development framework

📞 Contact

Developer: Mustak Alam

Built with ❤️ for the Cronos x402 Paytech Hackathon