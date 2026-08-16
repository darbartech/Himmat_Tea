import { createLoginFormSchema, type LoginFormData } from './validation';

const _t = (key: string) => key;
const loginFormSchema = createLoginFormSchema(_t);

export { LoginForm, default } from './LoginForm';
export { createLoginFormSchema, loginFormSchema, type LoginFormData };
