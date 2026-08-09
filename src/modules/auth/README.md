# Authentication Modules

This directory contains reusable, self-contained authentication components for login and signup functionality.

## Overview

- **LoginForm**: Reusable login component with validation, loading states, and accessibility support
- **SignupForm**: Reusable signup component with password strength indicator, validation, and accessibility support

## Installation

These components require the following dependencies (already installed):
- `react-hook-form`: For form state management
- `zod`: For validation schema
- `@hookform/resolvers`: For integrating Zod with React Hook Form

## Usage

### LoginForm Component

```tsx
import { LoginForm } from '@/modules/auth';

export default function LoginPage() {
  return (
    <div>
      <h1>Login</h1>
      <LoginForm 
        onSuccess={() => {
          console.log('Login successful!');
          // Redirect or update state
        }}
        redirectTo="/account"
        showForgotPassword={true}
      />
    </div>
  );
}
```

#### LoginForm Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSuccess` | `() => void` | `undefined` | Callback function called when login is successful |
| `redirectTo` | `string` | `undefined` | Optional URL to redirect to after successful login |
| `showForgotPassword` | `boolean` | `true` | Whether to show the "Forgot Password" link |
| `className` | `string` | `''` | Custom class name for the form container |

### SignupForm Component

```tsx
import { SignupForm } from '@/modules/auth';

export default function SignupPage() {
  return (
    <div>
      <h1>Create Account</h1>
      <SignupForm 
        onSuccess={() => {
          console.log('Signup successful!');
          // Redirect or update state
        }}
        redirectTo="/welcome"
      />
    </div>
  );
}
```

#### SignupForm Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSuccess` | `() => void` | `undefined` | Callback function called when signup is successful |
| `redirectTo` | `string` | `undefined` | Optional URL to redirect to after successful signup |
| `className` | `string` | `''` | Custom class name for the form container |

## Validation Schema

### LoginForm Data Structure

```typescript
import { type LoginFormData } from '@/modules/auth';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}
```

### SignupForm Data Structure

```typescript
import { type SignupFormData } from '@/modules/auth';

interface SignupFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  address: string;
  agreeToTerms: boolean;
}
```

## Password Requirements

For signup, the password must meet the following criteria:
- At least 8 characters long
- Contains at least one uppercase letter
- Contains at least one lowercase letter
- Contains at least one number
- Contains at least one special character (@$!%*?&)

## Accessibility

Both components are fully WCAG 2.1 compliant:
- Proper HTML labels for all form fields
- ARIA attributes (`aria-describedby`, `aria-invalid`, `role="alert"`)
- Keyboard navigation support
- Screen reader announcements for errors and loading states

## API Integration

The components integrate with the following API endpoints:
- `POST /api/customer/login`: For login functionality
- `POST /api/customer/signup`: For signup functionality

## Styling

Components use the project's existing design system with:
- Primary color: `#2d5a3d`
- Background color: `#f9f7f4`
- Typography: DM Sans and Playfair Display
- Consistent spacing and border radius

## Customization

You can customize the appearance by:
1. Using the `className` prop to add custom styles
2. Overriding Tailwind classes in your own CSS
3. Creating wrapper components that modify the appearance

## Example: Full Auth Page

```tsx
'use client';

import { useState } from 'react';
import { LoginForm, SignupForm } from '@/modules/auth';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  return (
    <div className="min-h-screen py-20">
      <div className="max-w-md mx-auto">
        <div className="flex gap-4 mb-8">
          <button 
            onClick={() => setMode('login')}
            className={`px-4 py-2 rounded-lg ${mode === 'login' ? 'bg-[#2d5a3d] text-white' : 'bg-gray-100'}`}
          >
            Login
          </button>
          <button 
            onClick={() => setMode('signup')}
            className={`px-4 py-2 rounded-lg ${mode === 'signup' ? 'bg-[#2d5a3d] text-white' : 'bg-gray-100'}`}
          >
            Signup
          </button>
        </div>

        {mode === 'login' ? (
          <LoginForm redirectTo="/account" />
        ) : (
          <SignupForm redirectTo="/account" />
        )}
      </div>
    </div>
  );
}
```
