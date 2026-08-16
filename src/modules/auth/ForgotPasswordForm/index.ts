import { createForgotPasswordSchema, type ForgotPasswordData } from './validation';

const _t = (key: string) => key;
const forgotPasswordSchema = createForgotPasswordSchema(_t);

export { ForgotPasswordForm, default } from './ForgotPasswordForm';
export { createForgotPasswordSchema, forgotPasswordSchema, type ForgotPasswordData };
