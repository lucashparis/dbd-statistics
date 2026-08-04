"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

const inputClass =
  "w-full rounded-md border border-subtle bg-surface-2 px-3 py-2 pr-10 text-sm text-white outline-none transition-colors focus:border-blood";

interface PasswordInputProps {
  name: string;
  label: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
}

export function PasswordInput({ name, label, required, minLength, autoComplete }: PasswordInputProps) {
  const [visible, setVisible] = React.useState(false);
  const id = React.useId();

  return (
    <div className="space-y-1.5">
      {/* Explicit htmlFor/id (rather than wrapping the input in the label) keeps
          the toggle button — a labelable element too — out of the input's
          accessible label. */}
      <label htmlFor={id} className="block text-xs uppercase tracking-widest text-muted">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex items-center rounded-md px-3 text-muted transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blood/60"
        >
          {visible ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
        </button>
      </div>
    </div>
  );
}
