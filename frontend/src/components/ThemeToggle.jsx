import { Sun, Moon } from 'lucide-react';
import useThemeStore from '../store/themeStore';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useThemeStore();
  const isLight = theme === 'light';

  return (
    <button
      onClick={toggleTheme}
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      className={`relative flex items-center justify-center transition-all duration-200 ${className}`}
      style={{
        width: '34px',
        height: '34px',
        borderRadius: '10px',
        background: isLight
          ? 'rgba(59,130,246,0.1)'
          : 'rgba(148,163,184,0.08)',
        border: isLight
          ? '1px solid rgba(59,130,246,0.2)'
          : '1px solid rgba(148,163,184,0.12)',
        color: isLight ? '#2563eb' : '#94a3b8',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = isLight
          ? 'rgba(59,130,246,0.18)'
          : 'rgba(148,163,184,0.15)';
        e.currentTarget.style.color = isLight ? '#1d4ed8' : '#e2e8f0';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = isLight
          ? 'rgba(59,130,246,0.1)'
          : 'rgba(148,163,184,0.08)';
        e.currentTarget.style.color = isLight ? '#2563eb' : '#94a3b8';
      }}
    >
      {isLight ? (
        <Moon className="w-4 h-4" style={{ transition: 'transform 0.3s', transform: 'rotate(0deg)' }} />
      ) : (
        <Sun className="w-4 h-4" style={{ transition: 'transform 0.3s', transform: 'rotate(0deg)' }} />
      )}
    </button>
  );
}