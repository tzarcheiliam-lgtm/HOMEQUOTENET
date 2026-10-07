import { startTransition, type FormEvent } from 'react';

/**
 * onSubmit handler for forms driven by `useActionState`.
 *
 * React 19 resets a form's uncontrolled fields after every `action` finishes,
 * including when the server returned a validation error, so a phone user who
 * mistyped one field would lose everything else. Submitting through onSubmit
 * runs the same action but leaves the entered values in place. Forms that do
 * want to clear after success should reset themselves.
 *
 *   <form onSubmit={keepValuesOnError(formAction)}>
 */
export function keepValuesOnError(formAction: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const data = new FormData(event.currentTarget, submitter);
    startTransition(() => formAction(data));
  };
}
