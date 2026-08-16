import { createSignupFormSchema, type SignupFormData } from './validation';

const _t = (key: string) => key;
const signupFormSchema = createSignupFormSchema(_t);

export { SignupForm, default } from './SignupForm';
export { createSignupFormSchema, signupFormSchema, type SignupFormData };
