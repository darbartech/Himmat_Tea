export const USER_ERRORS = {
  AUTH: {
    PASSWORD_MISMATCH: "Password does not match. Please check your password and try again.",
    INVALID_CREDENTIALS: "The email or password you entered is incorrect. Please try again.",
    EMAIL_NOT_FOUND: "No account found with this email address. Please sign up first.",
    ACCOUNT_INACTIVE: "Your account is currently inactive. Please contact support for assistance.",
    SESSION_EXPIRED: "Your session has expired. Please log in again to continue.",
    UNAUTHORIZED: "You do not have permission to perform this action.",
    TOO_MANY_ATTEMPTS: "Too many failed attempts. Please try again later or reset your password.",
    EMAIL_ALREADY_REGISTERED: "This email is already registered. Please log in or use a different email.",
  },
  PRODUCTS: {
    OUT_OF_STOCK: "This product is not available at this time. Please check back later.",
    NOT_FOUND: "The product you are looking for does not exist or has been removed.",
    GEO_RESTRICTED: "This product is not available for delivery in your region.",
    INSUFFICIENT_STOCK: "Insufficient stock available for the requested quantity.",
  },
  ORDERS: {
    NOT_FOUND: "The order you are looking for does not exist.",
    CANNOT_UPDATE_STATUS: "This order status cannot be changed from its current state.",
    MIN_ONE_ITEM: "Please add at least one product to place an order.",
    TRACKING_UPDATE_FAILED: "Failed to update tracking information. Please try again.",
  },
  PAYMENT: {
    PROCESSING_ERROR: "We encountered an issue processing your payment. Please verify your details and try again.",
    INSUFFICIENT_FUNDS: "Your payment was declined due to insufficient funds. Please try another method.",
    EXPIRED_CARD: "Your card has expired. Please update your payment method.",
    PAYMENT_DECLINED: "Your payment was declined by your bank. Please contact your bank or try another method.",
    VERIFICATION_FAILED: "Payment verification failed. Please check the transaction details and try again.",
    PENDING: "Your payment is being processed. This may take a few moments.",
  },
  COUPONS: {
    INVALID_CODE: "Invalid coupon code. Please check and try again.",
    EXPIRED: "This coupon code has expired.",
    USAGE_LIMIT_REACHED: "This coupon code has reached its usage limit.",
    MIN_AMOUNT_NOT_MET: "Your cart total is below the minimum amount required for this coupon.",
    ALREADY_APPLIED: "A coupon has already been applied to your cart. Remove it first to use a different code.",
  },
  VALIDATION: {
    REQUIRED_FIELD: "This field is required.",
    INVALID_EMAIL: "Please enter a valid email address.",
    INVALID_PHONE: "Please enter a valid phone number.",
    PASSWORD_TOO_SHORT: "Password must be at least 8 characters long.",
    PASSWORD_WEAK: "Password must contain uppercase, lowercase, and numbers.",
    PASSWORDS_DO_NOT_MATCH: "Passwords do not match. Please try again.",
    MIN_LENGTH: (field: string, min: number) => `${field} must be at least ${min} characters long.`,
    MAX_LENGTH: (field: string, max: number) => `${field} cannot exceed ${max} characters.`,
  },
  GENERAL: {
    NETWORK_ERROR: "Unable to connect to the server. Please check your internet connection and try again.",
    SERVER_ERROR: "Something went wrong on our end. Please try again in a few moments.",
    TIMEOUT: "The request timed out. Please try again.",
    PERMISSION_DENIED: "You do not have the required permissions to access this resource.",
    TRY_AGAIN_LATER: "We are experiencing high demand right now. Please try again shortly.",
  },
  CART: {
    ADD_FAILED: "Unable to add the product to your cart. Please try again.",
    UPDATE_FAILED: "Unable to update your cart. Please try again.",
    REMOVE_FAILED: "Unable to remove the item from your cart. Please try again.",
    EMPTY_CHECKOUT: "Your cart is empty. Add some products before checking out.",
  },
} as const;

export type ErrorCategory = keyof typeof USER_ERRORS;
export type ErrorKey<T extends ErrorCategory> = keyof (typeof USER_ERRORS)[T];

export function getUserError<T extends ErrorCategory>(
  category: T,
  key: ErrorKey<T>
): string {
  return (USER_ERRORS[category] as Record<string, string>)[key as string] ?? USER_ERRORS.GENERAL.SERVER_ERROR;
}

export const ERROR_CODE_MAP: Record<string, string> = {
  PASSWORD_MISMATCH: USER_ERRORS.AUTH.PASSWORD_MISMATCH,
  INVALID_CREDENTIALS: USER_ERRORS.AUTH.INVALID_CREDENTIALS,
  AUTH_EMAIL_NOT_FOUND: USER_ERRORS.AUTH.EMAIL_NOT_FOUND,
  AUTH_ACCOUNT_INACTIVE: USER_ERRORS.AUTH.ACCOUNT_INACTIVE,
  OUT_OF_STOCK: USER_ERRORS.PRODUCTS.OUT_OF_STOCK,
  PRODUCT_NOT_FOUND: USER_ERRORS.PRODUCTS.NOT_FOUND,
  PAYMENT_PROCESSING: USER_ERRORS.PAYMENT.PROCESSING_ERROR,
  COUPON_INVALID: USER_ERRORS.COUPONS.INVALID_CODE,
  COUPON_EXPIRED: USER_ERRORS.COUPONS.EXPIRED,
  COUPON_LIMIT: USER_ERRORS.COUPONS.USAGE_LIMIT_REACHED,
  COUPON_MIN_AMOUNT: USER_ERRORS.COUPONS.MIN_AMOUNT_NOT_MET,
};

export function resolveErrorMessage(rawError: unknown, fallback: string = USER_ERRORS.GENERAL.SERVER_ERROR): string {
  if (typeof rawError === "string") {
    if (ERROR_CODE_MAP[rawError]) return ERROR_CODE_MAP[rawError];
    return rawError;
  }
  if (rawError && typeof rawError === "object") {
    const obj = rawError as Record<string, unknown>;
    const code = typeof obj.code === "string" ? obj.code : null;
    const message = typeof obj.message === "string" ? obj.message : null;
    if (code && ERROR_CODE_MAP[code]) return ERROR_CODE_MAP[code];
    if (message) return message;
  }
  return fallback;
}
