import { useMemo, useState } from 'react';
import { validateRecoveryPasswordInput } from '../services/authValidation';
import { signOutCurrentUser, updateUserPassword } from '../services/authService';

export function useRecoveryPasswordViewModel(onDone: () => void | Promise<void>) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const match = useMemo(
    () => password === confirmPassword && password.length > 0,
    [password, confirmPassword]
  );

  const submit = async () => {
    setError(null);

    const validationError = validateRecoveryPasswordInput(password, confirmPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    try {
      await updateUserPassword(password);
      await signOutCurrentUser();
      await onDone();
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Update failed');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword((prev) => !prev);
  };

  return {
    password,
    confirmPassword,
    showPassword,
    error,
    isLoading,
    match,
    setPassword,
    setConfirmPassword,
    toggleShowPassword,
    submit,
  };
}
