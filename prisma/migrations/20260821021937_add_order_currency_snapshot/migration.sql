-- AlterTable
-- Adds a point-in-time multi-currency snapshot to Order.
-- `total`, `tax`, `shippingCost`, `discountAmount`, `grandTotal` remain the
-- NPR (base currency) accounting values used everywhere else in the app.
-- The new `converted*` columns capture the same amounts in the customer's
-- selected currency at the exchange rate in effect when the order was
-- placed, so historical orders never change when exchange rates move later.
ALTER TABLE "Order"
  ADD COLUMN "baseCurrency" TEXT NOT NULL DEFAULT 'NPR',
  ADD COLUMN "customerCurrency" TEXT NOT NULL DEFAULT 'NPR',
  ADD COLUMN "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
  ADD COLUMN "convertedTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "convertedTax" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "convertedShippingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "convertedDiscountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "convertedGrandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Backfill existing rows: converted* = base amounts (rate 1, NPR) so no
-- historical order silently shows zeroed converted totals.
UPDATE "Order" SET
  "convertedTotal" = "total",
  "convertedTax" = "tax",
  "convertedShippingCost" = "shippingCost",
  "convertedDiscountAmount" = "discountAmount",
  "convertedGrandTotal" = "grandTotal";
