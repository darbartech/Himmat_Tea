import { createVerifyOtpSchema, type VerifyOtpData } from './validation';

const _t = (key: string) => key;
const verifyOtpSchema = createVerifyOtpSchema(_t);

export { VerifyResetForm, default } from './VerifyResetForm';
export { createVerifyOtpSchema, verifyOtpSchema, type VerifyOtpData };
