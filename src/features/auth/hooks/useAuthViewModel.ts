import { useEffect, useMemo, useState } from 'react';
import { PASSWORD_RULES } from '../constants/passwordRules';
import {
  requestPasswordReset,
  signInWithApple,
  signInWithEmailPassword,
  signInWithGoogle,
  signUpWithEmail,
} from '../services/authService';
import {
  isEmailValid,
  isPasswordValid,
  validateForgotPasswordInput,
  validateLoginInput,
  validateRegisterInput,
} from '../services/authValidation';

export type AuthMode = 'login' | 'register' | 'forgot' | 'verify';

export function useAuthViewModel(onAuthSuccess: () => void | Promise<void>) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (error) {
      setError(null);
    }
    if (successMessage) {
      setSuccessMessage(null);
    }
  }, [name, email, password, confirmPassword, mode]);

  const passwordRules = useMemo(
    () =>
      PASSWORD_RULES.map((rule) => ({
        ...rule,
        passed: rule.test(password),
      })),
    [password]
  );

  const isCurrentEmailValid = useMemo(() => isEmailValid(email), [email]);
  const isCurrentPasswordValid = useMemo(() => isPasswordValid(password), [password]);
  const doPasswordsMatch = useMemo(
    () => password === confirmPassword && password.length > 0,
    [password, confirmPassword]
  );

  const resetSensitiveFields = () => {
    setPassword('');
    setConfirmPassword('');
  };

  const resetFeedback = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const submit = async () => {
    setError(null);

    if (mode === 'forgot') {
      const validationError = validateForgotPasswordInput(email);
      if (validationError) {
        setError(validationError);
        return;
      }

      setIsLoading(true);
      try {
        await requestPasswordReset(email.trim());
      } finally {
        setSuccessMessage('If an account exists for this email, we’ve sent a reset link.');
        setIsLoading(false);
      }
      return;
    }

    if (mode === 'register') {
      const validationError = validateRegisterInput({
        name,
        email,
        password,
        confirmPassword,
      });

      if (validationError) {
        setError(validationError);
        return;
      }

      setIsLoading(true);
      try {
        const result = await signUpWithEmail({
          name: name.trim(),
          email: email.trim(),
          password,
        });

        if (result.requiresEmailVerification) {
          setPendingVerifyEmail(email.trim());
          setMode('verify');
          return;
        }

        if (result.hasSession) {
          await onAuthSuccess();
        }
      } catch (submitError: unknown) {
        setError(submitError instanceof Error ? submitError.message : 'Registration failed');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const validationError = validateLoginInput({ email, password });
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    try {
      const hasSession = await signInWithEmailPassword(email.trim(), password);
      if (hasSession) {
        await onAuthSuccess();
      }
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const continueWithGoogle = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signInWithGoogle();
      if (result === 'session') {
        await onAuthSuccess();
      }
    } catch (oauthError: unknown) {
      if (oauthError instanceof Error && oauthError.message !== 'cancelled') {
        setError(oauthError.message || 'Google sign-in failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const continueWithApple = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signInWithApple();
      if (result === 'session') {
        await onAuthSuccess();
      }
    } catch (oauthError: unknown) {
      if (oauthError instanceof Error && oauthError.message !== 'cancelled') {
        setError(oauthError.message || 'Apple sign-in failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    resetFeedback();
    resetSensitiveFields();
  };

  const switchToForgot = () => {
    setMode('forgot');
    resetFeedback();
    resetSensitiveFields();
  };

  const backToLogin = () => {
    setMode('login');
    resetFeedback();
    resetSensitiveFields();
  };

  const toggleShowPassword = () => {
    setShowPassword((prev) => !prev);
  };

  return {
    mode,
    isLoading,
    error,
    successMessage,
    pendingVerifyEmail,
    name,
    email,
    password,
    confirmPassword,
    showPassword,
    isCurrentEmailValid,
    isCurrentPasswordValid,
    doPasswordsMatch,
    passwordRules,
    setName,
    setEmail,
    setPassword,
    setConfirmPassword,
    toggleShowPassword,
    submit,
    continueWithGoogle,
    continueWithApple,
    switchMode,
    switchToForgot,
    backToLogin,
  };
}
