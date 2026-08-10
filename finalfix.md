# Himmat Tea — Final Corrected Order, Payment & Currency Implementation

Act as a **senior Next.js, Prisma/PostgreSQL, e-commerce, payment, security, and UX engineer**.

You are working on the existing **Himmat Tea** project.

The goal is to make the existing ordering system **real, simple, secure, reliable, and production-ready**.

Do NOT rebuild the application.

Do NOT create a demo order system.

Do NOT introduce unnecessary payment gateways.

Do NOT replace working components unnecessarily.

First inspect the existing implementation and then make the minimum required changes.

---

# 1. Existing Database Architecture

The existing Prisma schema contains:

```text
Product
ProductVariant
Customer
Order
OrderItem
Payment
InventoryTransaction
Settings
```

The important existing models are:

### Order

```prisma
model Order {
  id              String         @id @default(cuid())
  orderNumber     String         @unique
  customerId      Int
  customerName    String
  customerEmail   String
  customerPhone   String
  shippingAddress String
  total           Float
  shippingCost    Float          @default(0)
  tax             Float
  grandTotal      Float
  status          String         @default("AWAITING_PAYMENT")
  idempotencyKey  String
  orderDate       DateTime       @default(now())
  trackingNumber  String?
  courierPartner  String?
  refundReason    String?
  refundAmount    Float?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  internalNotes   InternalNote[]
  customer        Customer       @relation(fields: [customerId], references: [id], onDelete: Cascade)
  items           OrderItem[]
  payment         Payment?

  @@unique([customerId, idempotencyKey])
  @@index([customerId, status])
}
```

### OrderItem

```prisma
model OrderItem {
  id        Int      @id @default(autoincrement())
  orderId   String
  productId Int
  name      String
  quantity  Int
  price     Float
  weight    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  product   Product  @relation(fields: [productId], references: [id])
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
}
```

### Payment

```prisma
model Payment {
  id                    String   @id @default(cuid())
  orderId               String   @unique
  order                 Order    @relation(fields: [orderId], references: [id])
  method                String   @default("MANUAL_QR")
  status                String   @default("PENDING")
  amount                Float
  transactionReference  String?
  verifiedByAdminId     Int?
  verifiedAt            DateTime?
  paidAt                DateTime?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

### Settings

```prisma
model Settings {
  id                   String   @id @default(cuid())
  taxRate              Float    @default(18)
  shippingFlatRate     Float    @default(0)
  qrImageUrl           String?
  currency             String   @default("₹")
  storeName            String   @default("Himmat Tea")
  storeEmail           String   @default("support@himmattea.com")
  storePhone            String   @default("+91 9876543210")
  notificationsEnabled Boolean  @default(true)
  lowStockThreshold    Int      @default(30)
  gstNumber            String?
  updatedAt            DateTime @updatedAt
}
```

---

# 2. Immediate Currency Correction

The existing:

```prisma
currency String @default("₹")
```

is incorrect as an internal currency identifier because `₹` represents INR.

Change the default to:

```prisma
currency String @default("NPR")
```

The database/application should use:

```text
NPR
```

as the internal currency code.

The frontend can format NPR as:

```text
NPR 1,000
```

or:

```text
Rs. 1,000
```

according to the site's existing design.

Do NOT use `₹` as the internal currency code.

---

# 3. Do NOT Change Money Fields Yet

For this fix, do NOT migrate all existing `Float` monetary fields to `Decimal`.

That is a larger migration affecting:

* Product
* ProductVariant
* Order
* OrderItem
* Payment
* Customer
* PurchaseOrder
* Coupon

The immediate objective is to fix the order flow without creating unnecessary migration risk.

However:

* Perform calculations consistently.
* Round monetary results appropriately.
* Never trust frontend totals.

A future Decimal migration can be performed separately.

---

# 4. Correct Order Flow

Implement exactly this basic flow:

```text
Product
   ↓
Cart
   ↓
Checkout
   ↓
Customer + Delivery Details
   ↓
Review Order
   ↓
Place Order
   ↓
POST /orders
   ↓
Server Validation
   ↓
Server Price Calculation
   ↓
Stock Validation
   ↓
Database Transaction
   ├── Order
   ├── OrderItems
   ├── Payment
   └── Stock Update
   ↓
Order Created
   ↓
Payment Pending
   ↓
QR Payment
   ↓
Admin Verification
   ↓
Order Confirmed
   ↓
Processing
   ↓
Shipped
   ↓
Delivered
```

Keep this flow simple.

---

# 5. POST /orders Must Be the Source of Truth

The existing frontend calls:

```text
POST /orders
```

Keep that endpoint unless the existing architecture requires another route.

The API must receive only necessary customer/order information.

The frontend may send:

```json
{
  "customerId": 123,
  "customerName": "Customer Name",
  "customerEmail": "customer@example.com",
  "customerPhone": "9800000000",
  "items": [
    {
      "productId": 1,
      "quantity": 2,
      "weight": "100g"
    }
  ],
  "shippingAddress": "Full delivery address",
  "idempotencyKey": "unique-key"
}
```

Do NOT trust frontend:

```text
price
subtotal
tax
shipping
grandTotal
currency
paymentStatus
orderStatus
productName
```

---

# 6. Customer Validation

Before creating an order:

1. Validate the request.
2. Validate customer information.
3. Verify the customer exists when `customerId` is supplied.
4. Do not blindly create duplicate customers.
5. Respect the unique constraint:

```prisma
Customer.email @unique
```

If the customer already exists, reuse the appropriate customer record.

Do not create a new customer every time an order is placed.

---

# 7. Product Validation

For every submitted product:

Fetch the actual product from PostgreSQL.

Use the database values for:

```text
id
name
price
stock
status
isActive
```

Never trust the browser's:

```text
name
price
stock
subtotal
```

If a product does not exist:

```text
404
```

with a safe message such as:

```text
One or more selected products could not be found.
```

If the product is inactive/unavailable, return an appropriate business error.

---

# 8. Variant Handling

The existing database supports:

```text
ProductVariant
```

If the checkout submits a variant ID, validate:

1. Variant exists.
2. Variant belongs to the selected product.
3. Variant is available.
4. Use the variant's authoritative price.
5. Use the variant's stock.

Do not silently use the parent product price when a valid variant has been selected.

If the current checkout does not actually support variants, do not invent new variant functionality during this fix.

---

# 9. Server-Side Price Calculation

Calculate the order entirely on the server.

Conceptually:

```text
itemPrice × quantity
        ↓
item subtotal

all item subtotals
        ↓
subtotal

subtotal
+ tax
+ shipping
- valid discount
        ↓
grandTotal
```

The server must use:

```text
Product.price
```

or:

```text
ProductVariant.price
```

from PostgreSQL.

---

# 10. Tax

Use the existing Settings model:

```prisma
taxRate Float @default(18)
```

Fetch the current tax rate from Settings.

Do not trust a tax value from the browser.

Calculate consistently.

For example:

```text
tax = subtotal × taxRate / 100
```

Round the result appropriately for the application's monetary precision.

---

# 11. Shipping

Use the existing:

```prisma
shippingFlatRate
```

from Settings.

The browser must not determine the shipping charge.

Server:

```text
shippingCost = settings.shippingFlatRate
```

unless existing business rules specify another valid calculation.

---

# 12. Currency

The authoritative order currency is:

```text
NPR
```

The order amount must always be calculated in NPR.

Even if the website displays:

```text
USD
INR
GBP
EUR
```

the actual order remains:

```text
currency = NPR
```

The current database does not have an `Order.currency` field.

Do NOT add it just to fix this order-flow issue unless the existing application genuinely requires multiple settlement currencies.

For now, NPR is the single authoritative order currency.

---

# 13. Currency Display System

The country-based currency system is display-only.

Example:

```text
Database price:
NPR 1,000
```

Customer may see:

```text
USD 7.50
```

But the order still becomes:

```text
NPR 1,000
```

and payment remains:

```text
NPR 1,000
```

The converted display amount must NEVER be used for order creation.

---

# 14. Idempotency

The existing schema already provides:

```prisma
@@unique([customerId, idempotencyKey])
```

Use this correctly.

If the same customer submits the same idempotency key again:

```text
DO NOT create another order.
```

Instead:

1. Detect the existing order.
2. Return the existing order when appropriate.

Do not allow Prisma's unique constraint exception to become a generic HTTP 500.

Expected duplicate submission should produce either:

```text
200
```

with the existing order, or:

```text
409
```

with a clear response.

Prefer returning the existing order if the same idempotent request has already succeeded.

---

# 15. Order Number

Never use hard-coded order numbers.

Generate a unique order number.

Recommended format:

```text
HT-YYYYMMDD-XXXXXX
```

Example:

```text
HT-20260810-000123
```

The `orderNumber` must remain unique because the database already enforces:

```prisma
orderNumber String @unique
```

If necessary, use a collision-safe generation strategy.

---

# 16. Order Status

Use the existing string field:

```prisma
status String @default("AWAITING_PAYMENT")
```

Do not introduce a Prisma enum migration for this immediate fix.

Use:

```text
AWAITING_PAYMENT
CONFIRMED
PROCESSING
SHIPPED
DELIVERED
CANCELLED
```

Only authorized server/admin actions can change these statuses.

The frontend must never be allowed to directly set them.

---

# 17. Payment

The existing Payment model already supports the required Phase-1 manual QR flow.

Create:

```text
method = MANUAL_QR
status = PENDING
amount = grandTotal
```

Example:

```ts
await tx.payment.create({
  data: {
    orderId: order.id,
    method: "MANUAL_QR",
    status: "PENDING",
    amount: grandTotal,
  },
});
```

Do NOT set:

```text
PAID
```

when the order is created.

---

# 18. Payment Status

Use:

```text
PENDING
PAID
FAILED
REFUNDED
```

The frontend cannot directly change payment status.

Only authorized backend/admin operations can mark:

```text
PENDING → PAID
```

After actual payment verification.

---

# 19. QR Payment

After order creation, show:

```text
Order #HT-XXXXXXXX
```

and:

```text
Amount to Pay
NPR X,XXX
```

Then display:

```text
Actual Himmat Tea QR Code
```

from:

```prisma
Settings.qrImageUrl
```

Do not generate a fake QR.

Do not use a client-provided amount.

The QR payment amount is always the server-created:

```text
order.grandTotal
```

---

# 20. Stock Handling

Before creating the order:

```text
requested quantity <= current stock
```

must be verified.

The stock operation must be safe against concurrent orders.

Use a database transaction.

If the current business strategy is to deduct stock when the order is created, keep that strategy for simplicity.

If payment later fails or the order is cancelled, restore stock appropriately.

Do not implement a complex inventory reservation system unless the existing application already requires it.

---

# 21. Inventory Transaction

When stock changes, create the existing:

```prisma
InventoryTransaction
```

record.

Populate:

```text
productId
productName
type
quantity
previousStock
newStock
reason
referenceId
```

For example:

```text
type = SALE
reason = ORDER_PLACED
referenceId = order.id
```

Use the actual conventions already present in the project if they differ.

---

# 22. Atomic Transaction

Order creation must happen inside one Prisma transaction.

Conceptually:

```ts
const result = await prisma.$transaction(async (tx) => {

  // Validate products

  // Validate stock

  // Calculate totals

  // Create order

  // Create order items

  // Create payment

  // Update stock

  // Create inventory transactions

  return order;

});
```

If any step fails:

```text
ROLLBACK EVERYTHING
```

No orphaned:

* Order
* OrderItem
* Payment
* Stock update

should remain.

---

# 23. Payment Creation Must Be Inside the Same Transaction

Do not:

```text
Create Order
        ↓
API finishes
        ↓
Create Payment separately
```

Use:

```text
Transaction
 ├── Order
 ├── OrderItems
 ├── Payment
 └── Stock
```

This prevents orders without payments.

---

# 24. Fix the Current 500 Error

Do not modify:

```text
src/lib/api-client.ts
```

just to suppress the error.

The client correctly throws when the API returns 500.

Fix the server endpoint.

Add controlled server logging:

```ts
try {
  // order transaction
} catch (error) {
  console.error("ORDER_CREATION_ERROR", error);

  return NextResponse.json(
    {
      error: "Unable to place your order right now."
    },
    {
      status: 500
    }
  );
}
```

For expected business errors, return the appropriate status rather than 500.

---

# 25. Prisma Error Handling

Explicitly handle common Prisma errors.

For example:

### Unique constraint

```text
P2002
```

Handle idempotency/order-number conflicts gracefully.

### Record not found

```text
P2025
```

Return an appropriate 404/business response.

### Foreign key failure

```text
P2003
```

Return a safe validation/data-integrity response.

Do not expose Prisma's internal error message to customers.

---

# 26. Authentication / Authorization

Do not trust:

```text
customerId
```

from the browser when authentication is available.

If the project already has authenticated customers:

```text
session/authenticated user
        ↓
server determines customerId
```

If guest checkout is intentionally supported, preserve that behavior but validate the supplied customer identity appropriately.

Customers must only be able to access their own orders.

Admins can access/manage orders according to their existing role system.

---

# 27. Order Response

After successful creation, return only the required information.

Example:

```json
{
  "success": true,
  "order": {
    "id": "clxxxxxxxx",
    "orderNumber": "HT-20260810-000123",
    "status": "AWAITING_PAYMENT",
    "grandTotal": 5000,
    "currency": "NPR"
  },
  "payment": {
    "method": "MANUAL_QR",
    "status": "PENDING",
    "amount": 5000
  }
}
```

Do not expose unnecessary internal fields.

---

# 28. Order Confirmation

The confirmation page must use the real returned order.

Never display:

```text
#HT-2026-12345
```

or any hard-coded order.

Show:

```text
Real order number
Real items
Real quantities
Real totals
Real payment status
Real order status
Real QR
```

---

# 29. Customer-Facing Payment Message

Use a simple message:

> Your order has been created successfully. Please complete the payment using the QR code below. Your payment will be verified by our team before the order is confirmed.

Then:

```text
Payment Status: Awaiting Verification
```

Do not say:

```text
Payment Successful
```

until an admin actually verifies it.

---

# 30. Admin Payment Verification

Admin can:

```text
Verify Payment
Reject Payment
```

When verified:

```text
Payment.status = PAID
Payment.verifiedAt = now()
Payment.verifiedByAdminId = admin.id
Payment.paidAt = now()
```

and:

```text
Order.status = CONFIRMED
```

Do not let a normal customer perform these operations.

---

# 31. Existing Settings

Correct:

```prisma
currency String @default("NPR")
```

Keep:

```text
taxRate
shippingFlatRate
qrImageUrl
storeName
storeEmail
storePhone
```

The QR image should come from the existing settings/admin system.

---

# 32. Do Not Add Unnecessary Schema Changes

For this implementation, avoid adding:

```text
Order.currency
Payment.currency
ExchangeRate table
Currency table
PaymentGateway table
```

unless the existing code genuinely requires them.

The immediate business requirement is:

```text
Display currency may change
Actual order currency remains NPR
```

Keep the database simple.

---

# 33. Error Responses

Use clear API errors.

### Invalid request

```json
{
  "error": "Please check the order information and try again."
}
```

### Product unavailable

```json
{
  "error": "One or more selected products are no longer available."
}
```

### Insufficient stock

```json
{
  "error": "Some products do not have enough stock."
}
```

### Duplicate order

Return the existing order or:

```json
{
  "error": "This order has already been submitted."
}
```

### Unexpected error

```json
{
  "error": "Unable to place your order right now."
}
```

Never expose:

```text
Prisma error
SQL error
Stack trace
Database URL
Internal IDs unnecessarily
```

---

# 34. Frontend Requirements

Keep the existing checkout flow.

The frontend should:

1. Validate customer information.
2. Validate cart.
3. Generate idempotency key.
4. Send order request.
5. Wait for server response.
6. Redirect to confirmation.
7. Display actual order data.
8. Display actual NPR payment amount.
9. Display actual QR.

Do not calculate the authoritative order total on the frontend.

Frontend calculations may remain for preview only.

---

# 35. Prevent Double Submission

When the user clicks:

```text
Place Order
```

immediately:

```text
disable button
show loading state
```

If the request succeeds:

```text
redirect
```

If it fails:

```text
enable button
show safe error
```

The backend idempotency key remains the final protection.

---

# 36. Testing

Test all of these after implementation.

### Successful order

```text
Cart
→ Checkout
→ Place Order
→ Order created
→ Payment PENDING
→ QR displayed
```

### Duplicate click

```text
2 clicks
→ 1 order
```

### Duplicate idempotency key

```text
same key
→ no duplicate order
```

### Invalid product

```text
→ no order
→ safe 404/400
```

### Insufficient stock

```text
→ no order
→ safe 409
```

### Payment

```text
new order
→ PENDING
```

Never:

```text
new order
→ PAID
```

### Admin verification

```text
PENDING
→ PAID
→ CONFIRMED
```

### Cancellation

```text
CANCELLED
→ restore stock if stock was deducted
```

### Database failure

Verify transaction rollback.

### Currency

Test:

```text
Display USD
→ Order NPR
→ Payment NPR
→ QR NPR
```

### Security

Attempt to manipulate:

```text
price
subtotal
tax
shipping
grandTotal
currency
payment status
order status
customerId
```

from the browser.

The server must remain authoritative.

---

# 37. Final Expected Architecture

The finished system must behave like:

```text
                  CUSTOMER
                     │
                     ▼
                   CART
                     │
                     ▼
                 CHECKOUT
                     │
                     ▼
              POST /orders
                     │
                     ▼
             SERVER VALIDATION
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
       Products               Customer
          │                     │
          └──────────┬──────────┘
                     ▼
             STOCK VALIDATION
                     │
                     ▼
             PRICE CALCULATION
                     │
                     ▼
              NPR GRAND TOTAL
                     │
                     ▼
              DB TRANSACTION
          ┌──────────┼──────────┐
          ▼          ▼          ▼
        ORDER     ITEMS      PAYMENT
                               │
                               ▼
                          PENDING / QR
          │
          ▼
      STOCK UPDATE
          │
          ▼
        COMMIT
          │
          ▼
   ORDER CONFIRMATION
          │
          ▼
       REAL QR
          │
          ▼
  ADMIN PAYMENT VERIFY
          │
          ▼
      ORDER CONFIRMED
          │
          ▼
      PROCESSING
          │
          ▼
        SHIPPED
          │
          ▼
       DELIVERED
```

---

# 38. Final Success Criteria

The implementation is complete only when all of the following are true:

* No generic 500 occurs during a valid order.
* The exact root cause of the previous 500 is fixed.
* Real products are read from PostgreSQL.
* Real prices are read from PostgreSQL.
* Server calculates the final amount.
* Stock is validated server-side.
* Order is created transactionally.
* Order items are created transactionally.
* Payment is created transactionally.
* Payment starts as `PENDING`.
* Payment method is `MANUAL_QR`.
* Order starts as `AWAITING_PAYMENT`.
* Order number is real and unique.
* Idempotency prevents duplicate orders.
* Stock changes are transactional.
* Inventory transactions are recorded.
* QR payment uses the actual order amount.
* QR payment is always NPR.
* Payment cannot be marked paid from the customer frontend.
* Admin verification changes payment to `PAID`.
* Admin verification changes order to `CONFIRMED`.
* No dummy order data remains.
* No fake payment success remains.
* Currency conversion remains display-only.
* Frontend cannot manipulate the authoritative order total.
* Database schema is changed only where necessary.
* Existing checkout UI remains functional.
* Existing customer/admin architecture is preserved.
* No unnecessary payment gateway is introduced.

## Final implementation priority

Follow this exact priority:

**1. Correctness**

**2. Security**

**3. Real order creation**

**4. Transaction integrity**

**5. Simple QR payment**

**6. Good customer UX**

**7. Currency display**

**8. Future extensibility**

Do not optimize for complexity.

Build the **simplest reliable Himmat Tea order system that can accept real orders and manual QR payments today.**
