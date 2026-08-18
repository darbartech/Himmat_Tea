"use client";

import { toast as sonnerToast, type ToastT, type PromiseData } from "sonner";

const DEFAULT_DURATION = 3200;
const LOADING_DURATION = 120_000;

export type NotifyToastOptions = Partial<Pick<ToastT, "description" | "action" | "cancel" | "className" | "style" | "descriptionClassName" | "position" | "dismissible" | "closeButton">>;

export type PromiseToastStates<TData> = {
  loading: string;
  success: string | ((data: TData) => string);
  error: string | ((err: unknown) => string);
};

export const notify = {
  success(message: string, opts: NotifyToastOptions = {}) {
    return sonnerToast.success(message, {
      duration: DEFAULT_DURATION,
      className:
        "bg-white text-[#1c1917] border border-[#2d5a3d]/20 shadow-lg shadow-[#2d5a3d]/10 rounded-xl",
      classNames: {
        icon: "text-[#2d5a3d]",
        description: "text-[#78746e]",
        closeButton: "text-[#78746e] hover:text-[#1c1917]",
      },
      ...opts,
    });
  },

  error(message: string, opts: NotifyToastOptions = {}) {
    return sonnerToast.error(message, {
      duration: DEFAULT_DURATION,
      className:
        "bg-white text-[#1c1917] border border-red-200 shadow-lg shadow-red-500/10 rounded-xl",
      classNames: {
        icon: "text-red-600",
        description: "text-red-600/80",
        closeButton: "text-[#78746e] hover:text-red-600",
      },
      ...opts,
    });
  },

  info(message: string, opts: NotifyToastOptions = {}) {
    return sonnerToast.info(message, {
      duration: DEFAULT_DURATION,
      className:
        "bg-white text-[#1c1917] border border-[#2d5a3d]/20 shadow-lg shadow-[#2d5a3d]/10 rounded-xl",
      classNames: {
        icon: "text-[#2d5a3d]",
        description: "text-[#78746e]",
        closeButton: "text-[#78746e] hover:text-[#1c1917]",
      },
      ...opts,
    });
  },

  warning(message: string, opts: NotifyToastOptions = {}) {
    return sonnerToast.warning(message, {
      duration: DEFAULT_DURATION,
      className:
        "bg-white text-[#1c1917] border border-[#c8a96e]/30 shadow-lg shadow-[#c8a96e]/10 rounded-xl",
      classNames: {
        icon: "text-[#8a6a2f]",
        description: "text-[#78746e]",
        closeButton: "text-[#78746e] hover:text-[#1c1917]",
      },
      ...opts,
    });
  },

  loading(message: string, opts: NotifyToastOptions = {}) {
    return sonnerToast.loading(message, {
      duration: LOADING_DURATION,
      className:
        "bg-white text-[#1c1917] border border-[#2d5a3d]/20 shadow-lg shadow-[#2d5a3d]/10 rounded-xl",
      classNames: {
        icon: "text-[#2d5a3d]",
        description: "text-[#78746e]",
        closeButton: "text-[#78746e] hover:text-[#1c1917]",
      },
      ...opts,
    });
  },

  dismiss(toastId?: string | number) {
    return sonnerToast.dismiss(toastId);
  },

  custom: sonnerToast.custom,
  message: sonnerToast.message,

  promise<TData, TErr = unknown>(
    promise: Promise<TData> | (() => Promise<TData>),
    states: PromiseToastStates<TData>,
    opts?: Partial<PromiseData<TData, TErr>> & NotifyToastOptions,
  ) {
    // Normalize to a real Promise up front so the same instance can be
    // handed to sonner (for the loading/success/error toast UI) AND
    // returned to the caller. sonner's own toast.promise() returns a
    // toast id, not the resolved value, so callers doing
    // `const data = await notify.promise(...)` need the underlying
    // promise's resolution, not sonner's return value.
    const settledPromise: Promise<TData> =
      typeof promise === "function" ? promise() : promise;

    sonnerToast.promise<TData, TErr>(settledPromise, {
      loading: states.loading,
      success: states.success as any,
      error: states.error as any,
      duration: DEFAULT_DURATION,
      style: {
        borderRadius: "12px",
      },
      classNames: {
        success:
          "bg-white text-[#1c1917] border border-[#2d5a3d]/20 shadow-lg shadow-[#2d5a3d]/10 rounded-xl",
        error:
          "bg-white text-[#1c1917] border border-red-200 shadow-lg shadow-red-500/10 rounded-xl",
        loading:
          "bg-white text-[#1c1917] border border-[#2d5a3d]/20 shadow-lg shadow-[#2d5a3d]/10 rounded-xl",
      },
      ...(opts as any),
    });

    return settledPromise;
  },
};

export type Notify = typeof notify;
