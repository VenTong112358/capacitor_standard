export type PasswordRule = {
  label: string;
  test: (p: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'At least one letter', test: (p: string) => /[a-zA-Z]/.test(p) },
  { label: 'At least one number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'At least one uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'At least one special sign', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];
