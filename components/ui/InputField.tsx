import React, { ChangeEvent, forwardRef } from 'react';

export interface InputFieldProps {
  label: string;
  id: string;
  name?: string;
  value?: string | number;
  checked?: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  type?: string;
  // FIX: Allow readonly arrays for options prop to support arrays defined with 'as const'
  options?: readonly (string | { value: string; label: string })[];
  textarea?: boolean;
  className?: string;
  placeholder?: string;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  rows?: number;
  disabled?: boolean;
  // FIX: Add missing 'accept' prop for file inputs.
  accept?: string;
}

// FIX: Wrapped component in forwardRef to allow passing refs to the underlying input/textarea/select element.
type Ref = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

const InputField = forwardRef<Ref, InputFieldProps>(({ label, id, name, value, checked, onChange, type = "text", options, textarea, className = "", placeholder, min, max, step, rows = 2, disabled = false, accept }, ref) => (
  <div className={`mb-4 ${type === 'checkbox' ? 'flex items-center' : ''}`}>
    {type === 'checkbox' ? (
      <>
        <input
          type="checkbox"
          id={id}
          name={name}
          checked={checked}
          onChange={onChange}
          className={`h-5 w-5 text-indigo-600 border-gray-500 rounded focus:ring-indigo-500 bg-gray-700 mr-2 ${className}`}
          disabled={disabled}
          ref={ref as React.ForwardedRef<HTMLInputElement>}
        />
        <label htmlFor={id} className="text-sm font-medium text-gray-300 select-none">
          {label}
        </label>
      </>
    ) : (
      <>
        <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        {textarea ? (
          <textarea ref={ref as React.ForwardedRef<HTMLTextAreaElement>} id={id} name={name} value={value as string ?? ''} onChange={onChange} rows={rows} className={`w-full p-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 transition-colors duration-150 ${className}`} placeholder={placeholder} disabled={disabled} />
        ) : type === 'select' && options ? (
          <select ref={ref as React.ForwardedRef<HTMLSelectElement>} id={id} name={name} value={value as string ?? ''} onChange={onChange} className={`w-full p-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 transition-colors duration-150 ${className}`} disabled={disabled}>
            {/* FIX: Spread the readonly array to create a new mutable array for mapping */}
            {[...(options || [])].map((opt, index) => {
              const val = typeof opt === 'string' ? opt : opt.value;
              const lbl = typeof opt === 'string' ? opt : opt.label;
              return <option key={`${val}-${index}`} value={val}>{lbl}</option>
            })}
          </select>
        ) : (
          <input
            ref={ref as React.ForwardedRef<HTMLInputElement>}
            type={type}
            id={id}
            name={name}
            value={value ?? ''}
            onChange={onChange}
            className={`w-full p-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 transition-colors duration-150 ${className}`}
            placeholder={placeholder}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            // FIX: Pass the accept prop to the input element.
            accept={accept}
          />
        )}
      </>
    )}
  </div>
));

export default InputField;