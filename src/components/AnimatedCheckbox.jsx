export default function AnimatedCheckbox({ checked, onChange, disabled, ariaLabel }) {
  return (
    <label className="checkbox-wrapper" aria-label={ariaLabel}>
      <input
        type="checkbox"
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="checkmark">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
    </label>
  );
}
