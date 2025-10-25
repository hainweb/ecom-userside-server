# User Backend | Multi-Role E-Commerce Platform

This module is the **User API Server** for the Multi-Role E-Commerce Platform.  
It handles authentication, cart/wishlist logic, order placement, payment integration, user management, and data storage for the user panel.

---

## Features

- OTP-based signup and password reset (via Nodemailer)
- Secure JWT & Express Session-based authentication
- Bcrypt password hashing for secure passwords
- User data management (profile, address)
- Cart and Wishlist APIs
- Coupon auto-apply logic
- Payment processing with Razorpay
- Order management and invoice generation (PDF)
- Real-time status updates from Delivery API
- Product filtering, search, and suggestions
- Ratings and reviews submission & retrieval
- Contact form submission
- Sliders and category management endpoints

---

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **Authentication**: Express Session
- **Payment**: Razorpay SDK
- **Security**: Bcrypt
- **Email**: Nodemailer

---

## Environment Variables

Create a `.env` file in the **root directory** with the following variables:

```env
# MongoDB connection string
MONGO_URI=<your_mongodb_uri>

# Secret key for session & JWT
SESSION_SECRET=<your_session_secret>

# Node environment
NODE_ENV=development

# Frontend URL for CORS & redirects
FRONTEND_URL=http://localhost:3000

# Session TTL in seconds
SESSION_TTL=86400

# Session cookie max age in milliseconds
SESSION_COOKIE_MAX_AGE=86400000

# Email credentials for Nodemailer
EMAIL_USER=<your_email>
EMAIL_PASS=<your_email_password>

```

## Setup & Start Instructions

```bash
# 1️ Clone the repository
git clone https://github.com/hainweb/ecom-userside-server.git

# 2️ Navigate to project directory
cd ecom-userside-server

# 3️ Install dependencies
npm install

# 4️ Create .env file in the root directory (see Environment Variables section)

# 5️ Start the development server
npm start

