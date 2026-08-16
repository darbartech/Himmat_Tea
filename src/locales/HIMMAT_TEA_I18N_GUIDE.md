# Himmat Tea — Login/Signup/Checkout Translation Audit & Implementation Guide

**Scope:** Every user-facing string and validation message in the customer auth flow (`LoginForm`, `SignupForm`, `ForgotPasswordForm`, `ResetPasswordForm`, `VerifyResetForm`, the `CustomerAuth` wrapper page) and the checkout delivery-details step, none of which currently pass through the app's translation system.
**Deliverables in this package:**
1. `himmat_tea_new_translation_keys.json` — the **158 new keys**, in English, Hindi (`hi`), Japanese (`ja`), Nepali (`ne`), and Simplified Chinese (`zh`), grouped by language — for review/import.
2. `locales/en.json`, `locales/hi.json`, `locales/ja.json`, `locales/ne.json`, `locales/zh.json` — **full, ready-to-drop-in replacements** for `src/locales/*.json`: your existing 618 keys, unchanged, plus the 158 new ones merged in (776 total per language, verified with no key collisions and no gaps between languages).
3. This document.

---

## 1. What I found

Your app already has a real, working i18n system: `TranslationContext.tsx` + `src/locales/{en,hi,ja,ne,zh}.json`, consumed via `useTranslation()` → `t('some.key')`, with 5 languages already fully translated and key-complete (I diffed all 618 existing keys across all 5 files — zero missing, zero extra, in any language).

**The gap is that the entire customer authentication module was built outside this system.** None of these files import or call `useTranslation`/`t()` at all:

- `src/modules/auth/LoginForm/LoginForm.tsx`
- `src/modules/auth/SignupForm/SignupForm.tsx`
- `src/modules/auth/ForgotPasswordForm/ForgotPasswordForm.tsx`
- `src/modules/auth/ResetPasswordForm/ResetPasswordForm.tsx`
- `src/modules/auth/VerifyResetForm/VerifyResetForm.tsx`
- `src/app/pages/CustomerAuth.tsx` (the page that wraps the two forms)

Every label, placeholder, button, helper line, and password-strength word in these six files is a hardcoded English string literal. A Hindi/Japanese/Nepali/Chinese visitor switching the site language gets a fully translated header/footer/product catalog, but a 100% English login and signup screen.

**Validation messages are a separate, deeper problem.** The five Zod schemas that back these forms —

- `src/modules/auth/LoginForm/validation.ts`
- `src/modules/auth/SignupForm/validation.ts`
- `src/modules/auth/ForgotPasswordForm/validation.ts`
- `src/modules/auth/ResetPasswordForm/validation.ts`
- `src/modules/auth/VerifyResetForm/validation.ts`

define their error messages as static string literals at module-load time (e.g. `z.string().min(1, 'Email is required')`), and the forms render them raw via `{errors.email.message}` (confirmed in `LoginForm.tsx` line 119, and the same pattern in every other form). Because Zod schemas here are built once at import time, they can't just call `t()` inline — `t()` depends on React context that doesn't exist yet at that point. This needs a small structural change (§3), not just new JSON.

**Checkout has the same issue for its own inline validation.** `Checkout.tsx` already imports and uses `useTranslation` for page copy, but its `validateStep1()` function (lines 180–213) and its field labels/placeholders (lines 412–467) are still hardcoded English, sitting right next to already-translated content on the same page — this one's the easiest fix since `t` is already in scope there.

I did **not** find hardcoded strings in the checkout order-summary/payment area beyond the "Free" shipping-cost fallback — that section already uses `t()` correctly.

---

## 2. What's in the JSON deliverable

158 new keys, organized under four namespaces that match your existing dot-notation convention (e.g. `dashboard.settings.passwordSecurity`):

| Namespace | Covers | Key count |
|---|---|---|
| `validation.*` | Shared Zod error messages (email/password/name/phone/address/terms/OTP rules) used across all five auth schemas | 21 |
| `checkout.validation.*` / `checkout.fields.*` / `checkout.steps.*` / `checkout.summary.*` | Checkout's own inline validation + delivery-step field labels/placeholders | 22 |
| `auth.login.*` / `auth.signup.*` / `auth.forgotPassword.*` / `auth.resetPassword.*` / `auth.verifyReset.*` | Every label, placeholder, button state, password-strength word, and OTP-flow string in the five auth form components | 87 |
| `auth.page.*` | The `CustomerAuth.tsx` wrapper page — hero copy, benefit bullets, social buttons, tab labels | 28 |

Every key exists in all 5 languages with matching values verified programmatically (no missing keys, no orphaned keys in any file). Two keys use `{seconds}` as an interpolation placeholder (`auth.signup.otpResendIn`, `auth.verifyReset.resendIn`) — your `t()` implementation already supports this via its `params` argument, so no changes needed there.

**Translation quality note:** these translations were produced to a professional standard (consistent terminology, correct register, natural phrasing — not machine-literal), cross-checked against terminology your existing 618 keys already use for shared concepts (e.g. "Password" → पासवर्ड / パスワード / पासवर्ड / 密码, matching `dashboard.settings.*` exactly). As with any UI copy, I'd still recommend a native-speaker pass before shipping to production, the same as you'd do for the existing 618 keys — this is standard practice, not a flag that something's wrong.

A couple of deliberate choices worth knowing about:
- `checkout.fields.fullNamePlaceholder` ("Aarav Sharma") is left as the original Nepali name in every language, matching how you already handle example/placeholder values elsewhere (placeholders that are *examples of a name*, not translatable UI text) — same treatment I gave `auth.signup.fullNamePlaceholder`, which does localize to a native-sounding example name per language (John Doe / जॉन डो / 山田太郎 / जोन डो / 张三) since that field's original English placeholder was itself a generic example.
- Checkout's `province`/`city` placeholders ("Bagmati"/"Kathmandu") are transliterated into each script (काठमांडू, カトマンズ, काठमाडौं, 加德满都) rather than left in Roman script, consistent with how place names are handled in your existing translated content.

---

## 3. How to wire it in (code changes required)

### 3.1 Straightforward cases — component labels/placeholders/buttons

For `LoginForm.tsx`, `SignupForm.tsx`, `ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx`, `VerifyResetForm.tsx`, and `CustomerAuth.tsx`: add `import { useTranslation } from '@/hooks/useTranslation';` and `const { t } = useTranslation();` at the top of each component (same pattern already used correctly in `Checkout.tsx`), then swap hardcoded JSX text for the matching key. Example from `LoginForm.tsx`:

```tsx
// before
<label htmlFor="login-email" className="block text-sm font-medium text-[#1c1917]">
  Email Address
</label>
...
<input ... placeholder="you@example.com" ... />
...
<label>Forgot Password?</label>
...
<label>Remember Me</label>
...
<span>Signing In...</span> / <span>Sign In</span>

// after
<label htmlFor="login-email" className="block text-sm font-medium text-[#1c1917]">
  {t('auth.login.emailLabel')}
</label>
...
<input ... placeholder={t('auth.login.emailPlaceholder')} ... />
...
<Link href="/forgot-password">{t('auth.login.forgotPassword')}</Link>
...
<label>{t('auth.login.rememberMe')}</label>
...
<span>{isLoading ? t('auth.login.submitting') : t('auth.login.submit')}</span>
```

Also translate the `aria-label`s (`showPassword`/`hidePassword` keys are provided for exactly this) — screen-reader users deserve localized labels too, and it's an easy win since the keys already exist.

For the one non-Zod hardcoded error in `LoginForm.tsx`:

```tsx
// before
throw new Error('Invalid credentials');
...
setApiError(error instanceof Error ? error.message : 'Login failed. Please try again.');

// after
throw new Error(t('auth.login.invalidCredentials'));
...
setApiError(error instanceof Error ? error.message : t('auth.login.genericError'));
```

Repeat this pattern across the other four forms and the wrapper page using the matching `auth.signup.*`, `auth.forgotPassword.*`, `auth.resetPassword.*`, `auth.verifyReset.*`, and `auth.page.*` keys — every string I found has a 1:1 key already in the JSON.

### 3.2 Checkout — same pattern, `t` already in scope

`Checkout.tsx` already has `const { t } = useTranslation();`. Just replace the field labels/placeholders (lines ~412–467) and the `"Free"` fallback (line ~696) with `t('checkout.fields.fullName')`, `t('checkout.fields.fullNamePlaceholder')`, ..., `t('checkout.summary.free')`. Also update `STEPS`:

```tsx
// before
const STEPS = [
  { num: 1, label: "Delivery" },
  { num: 2, label: "Review & Place" },
];

// after — build inside the component so it can call t()
const STEPS = [
  { num: 1, label: t('checkout.steps.delivery') },
  { num: 2, label: t('checkout.steps.reviewAndPlace') },
];
```

### 3.3 The harder case — translating Zod validation messages

This needs a structural change because Zod schemas in this codebase are currently module-level constants built once at import time, before any React context (and therefore `t`) exists. The fix used across all five `validation.ts` files: turn each schema into a **factory function** that takes `t` and returns the schema, then call it inside the component (where `t` *is* available) via `useMemo` so it's not rebuilt on every render.

**`src/modules/auth/LoginForm/validation.ts` — before:**
```ts
import { z } from 'zod';

export const loginFormSchema = z.object({
  email: z.string().email('Please enter a valid email address').min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional()
});

export type LoginFormData = z.infer<typeof loginFormSchema>;
```

**After:**
```ts
import { z } from 'zod';

export type TFunc = (key: string, params?: Record<string, string | number>) => string;

export const createLoginFormSchema = (t: TFunc) => z.object({
  email: z.string()
    .email(t('validation.email.invalid'))
    .min(1, t('validation.email.required')),
  password: z.string().min(1, t('validation.password.required')),
  rememberMe: z.boolean().optional()
});

export type LoginFormData = z.infer<ReturnType<typeof createLoginFormSchema>>;
```

**`LoginForm.tsx` — before:**
```tsx
import { loginFormSchema, LoginFormData } from './validation';
...
const { register, handleSubmit, formState: { errors }, reset } = useForm<LoginFormData>({
  resolver: zodResolver(loginFormSchema),
  defaultValues: { email: '', password: '', rememberMe: false }
});
```

**After:**
```tsx
import { useMemo } from 'react';
import { createLoginFormSchema, LoginFormData } from './validation';
import { useTranslation } from '@/hooks/useTranslation';
...
const { t } = useTranslation();
const loginFormSchema = useMemo(() => createLoginFormSchema(t), [t]);

const { register, handleSubmit, formState: { errors }, reset } = useForm<LoginFormData>({
  resolver: zodResolver(loginFormSchema),
  defaultValues: { email: '', password: '', rememberMe: false }
});
```

Because `t` changes identity when the language changes (`TranslationContext` sets new `translations` state → new `t` callback), the `useMemo` correctly rebuilds the schema with the new language's messages, and react-hook-form will re-validate with localized errors from that point on.

**Apply the identical pattern to the other four schemas**, mapping each hardcoded message to its `validation.*` key:

| File | Zod rule | Old literal | New key |
|---|---|---|---|
| `SignupForm/validation.ts` | `name.min(2, ...)` | `Name must be at least 2 characters` | `validation.name.minLength` |
| | `name.max(100, ...)` | `Name must be less than 100 characters` | `validation.name.maxLength` |
| | `name.regex(...)` | `Name can only contain letters, spaces, hyphens, and apostrophes` | `validation.name.pattern` |
| | `name.min(1, ...)` | `Full name is required` | `validation.name.required` |
| | `email.email(...)` | `Please enter a valid email address` | `validation.email.invalid` |
| | `email.min(1, ...)` | `Email is required` | `validation.email.required` |
| | `password.min(8, ...)` | `Password must be at least 8 characters` | `validation.password.minLength` |
| | `password.max(50, ...)` | `Password must be less than 50 characters` | `validation.password.maxLength` |
| | 4× `password.refine(...)` | lowercase/uppercase/number/special-char messages | `validation.password.lowercase` / `.uppercase` / `.number` / `.specialChar` |
| | `confirmPassword.min(1, ...)` | `Please confirm your password` | `validation.password.confirmRequired` |
| | `phone.min(1, ...)` | `Phone number is required` | `validation.phone.required` |
| | `address.min(5, ...)` / `.max(500, ...)` / `.min(1, ...)` | address messages | `validation.address.minLength` / `.maxLength` / `.required` |
| | `agreeToTerms.refine(...)` | `You must agree to the Terms of Service and Privacy Policy` | `validation.terms.required` |
| | top-level `.refine(...)` (password match) | `Passwords do not match` | `validation.password.mismatch` |
| `ForgotPasswordForm/validation.ts` | same email rules as above | — | `validation.email.invalid` / `.required` |
| `ResetPasswordForm/validation.ts` | password rules (8/50/case/number/special) + confirm + match | — | same `validation.password.*` keys as signup |
| `VerifyResetForm/validation.ts` | `otp.length(6, ...)` | `Enter the 6-digit code from your email` | `validation.otp.length` |

This reuse is intentional — the same rule ("must include a lowercase letter", "please enter a valid email") is worded identically across schemas today, so one shared `validation.*` key per rule keeps translations consistent and means a future wording tweak only has to happen in one place per language.

### 3.4 Checkout's separate inline validation

`Checkout.tsx`'s `validateStep1()` isn't Zod-based — it's plain `if` statements building an `errors` object — so no factory-function refactor is needed there, just swap the literals for `t()` calls directly, since `t` is already in scope in that component:

```tsx
// before
if (!formData.name.trim()) newErrors.name = "Full name is required";
if (!formData.email.trim()) newErrors.email = "Email address is required";
else if (!validateEmail(formData.email)) newErrors.email = "Please enter a valid email address";
// ...

// after
if (!formData.name.trim()) newErrors.name = t('checkout.validation.nameRequired');
if (!formData.email.trim()) newErrors.email = t('checkout.validation.emailRequired');
else if (!validateEmail(formData.email)) newErrors.email = t('checkout.validation.emailInvalid');
// ...
```

---

## 4. How to apply the JSON

**Recommended — drop-in replacement:** back up your current `src/locales/*.json`, then replace them with the five files under `locales/` in this package. Each one is your existing content, byte-for-byte, with the 158 new keys appended — nothing was reordered, reworded, or removed.

**Alternative — manual merge:** if you'd rather review/merge by hand (e.g. if `src/locales/*.json` has changed since this audit), use `himmat_tea_new_translation_keys.json` — it contains only the new keys, grouped by language (`{"en": {...}, "hi": {...}, "ja": {...}, "ne": {...}, "zh": {...}}`) — and merge each language's block into the corresponding existing file.

Either way, no existing key, value, or ordering changes — this is a pure addition.

---

## 5. Suggested rollout order

1. Drop in the updated locale JSON files (§4) — zero risk, purely additive, nothing references these keys yet so nothing changes visibly until step 2.
2. Wire `LoginForm.tsx` + its `validation.ts` end-to-end first (smallest form, good template for the rest) using the factory-function pattern in §3.3.
3. Repeat for `SignupForm`, `ForgotPasswordForm`, `ResetPasswordForm`, `VerifyResetForm` and their validation files.
4. Wire `CustomerAuth.tsx` (`auth.page.*` keys).
5. Wire `Checkout.tsx`'s field labels/placeholders and `validateStep1()` (§3.4) — quick, since `t` is already imported there.
6. QA pass: switch the site language selector through all 5 languages and walk signup → OTP verify → login → forgot password → reset password → checkout, checking that every label, placeholder, button state, and error message (including a deliberately wrong password/email to trigger validation) renders in the selected language.

---

## 6. Beyond this scope (flagged, not included)

While auditing I noticed a few other hardcoded-English spots outside the scope you asked for (login/signup/validation), worth a follow-up pass if you want full-site coverage later:

- Server-side API error messages (e.g. `"Invalid credentials"` returned from `/api/auth/login`, `/api/customer/login`) are plain English strings from the backend and would need either client-side re-mapping of known error codes to `t()` keys, or a locale-aware API layer — a larger change than the client-only fixes above.
- A few toast/alert strings elsewhere in the app (outside the auth/checkout scope reviewed here) may have the same hardcoded-string pattern; the same `t()`-swap approach applies if you'd like those covered too.
