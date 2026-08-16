import { createResetPasswordSchema, type ResetPasswordData } from './validation';

const _t = (key: string) => key;
const resetPasswordSchema = createResetPasswordSchema(_t);

export { ResetPasswordForm, default } from './ResetPasswordForm';
export { createResetPasswordSchema, resetPasswordSchema, type ResetPasswordData };
