interface DiveButtonProps {
  isSubsurface: boolean;
  onDive: () => void;
  onSurface: () => void;
  disabled?: boolean;
}

export function DiveButton({ isSubsurface, onDive, onSurface, disabled }: DiveButtonProps) {
  const handleClick = () => {
    if (isSubsurface) {
      onSurface();
    } else {
      onDive();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      style={{
        position: 'absolute',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 35,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: isSubsurface
          ? 'rgba(34, 211, 238, 0.12)'
          : 'rgba(2, 8, 22, 0.85)',
        border: `1px solid ${isSubsurface ? 'rgba(34,211,238,0.4)' : 'rgba(34,211,238,0.2)'}`,
        borderRadius: '20px',
        padding: '8px 18px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        backdropFilter: 'blur(12px)',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.3s ease',
      }}
    >
      {/* Icon */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        style={{
          transform: isSubsurface ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.3s ease',
        }}
      >
        <path
          d="M7 2V12M7 12L3 8M7 12L11 8"
          stroke="#22d3ee"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Label */}
      <span
        style={{
          fontSize: '9px',
          letterSpacing: '0.2em',
          color: '#22d3ee',
          fontWeight: 600,
        }}
      >
        {isSubsurface ? 'RETURN TO SURFACE' : 'DIVE SUBSURFACE'}
      </span>
    </button>
  );
}
