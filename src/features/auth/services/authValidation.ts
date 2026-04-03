import { PASSWORD_RULES } from '../constants/passwordRules';

export type RegisterFormInput = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type LoginFormInput = {
  email: string;
  password: string;
};

export function isEmailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

export function validateForgotPasswordInput(email: string): string | null {
  if (!email.trim()) {
    return 'Please enter your email to continue.';
  }

  if (!isEmailValid(email)) {
    return 'Please enter a valid email address.';
  }

  return null;
}

export function validateRegisterInput(input: RegisterFormInput): string | null {
  if (!input.name.trim() || !input.email.trim() || !input.password || !input.confirmPassword) {
    return 'Please complete all fields to continue.';
  }

  if (!isEmailValid(input.email)) {
    return 'Please enter a valid email address.';
  }

  if (!isPasswordValid(input.password)) {
    return 'Please ensure your password meets all the secure criteria.';
  }

  if (input.password !== input.confirmPassword) {
    return "Passwords don't match yet.";
  }

  return null;
}

export function validateLoginInput(input: LoginFormInput): string | null {
  if (!input.email.trim() || !input.password) {
    return 'Please enter your email and password to log in.';
  }

  return null;
}

export function validateRecoveryPasswordInput(
  password: string,
  confirmPassword: string
): string | null {
  if (!isPasswordValid(password)) {
    return 'Please ensure your password meets all criteria.';
  }

  if (password !== confirmPassword || !password.length) {
    return "Passwords don't match.";
  }

  return null;
}
