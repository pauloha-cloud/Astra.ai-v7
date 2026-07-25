import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface SidebarTooltipProps {
  label: string;
  isCollapsed: boolean;
  isDarkMode?: boolean;
  children: React.ReactElement;
  sideOffset?: number;
  alwaysEnable?: boolean;
}

export const SidebarTooltip: React.FC<SidebarTooltipProps> = ({
  label,
  isCollapsed,
  isDarkMode = true,
  children,
  sideOffset = 10,
  alwaysEnable = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement | null>(null);

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top + rect.height / 2,
        left: rect.right + sideOffset,
      });
    }
  }, [sideOffset]);

  const showTooltip = useCallback(() => {
    if (!isCollapsed && !alwaysEnable) return;
    updatePosition();
    setIsVisible(true);
  }, [isCollapsed, alwaysEnable, updatePosition]);

  const hideTooltip = useCallback(() => {
    setIsVisible(false);
  }, []);

  useEffect(() => {
    if (isVisible) {
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isVisible, updatePosition]);

  // Hide tooltip when collapsed state changes or label changes
  useEffect(() => {
    setIsVisible(false);
  }, [isCollapsed, label]);

  const child = React.Children.only(children);

  const handleMouseEnter = (e: React.MouseEvent) => {
    child.props.onMouseEnter?.(e);
    showTooltip();
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    child.props.onMouseLeave?.(e);
    hideTooltip();
  };

  const handleFocus = (e: React.FocusEvent) => {
    child.props.onFocus?.(e);
    showTooltip();
  };

  const handleBlur = (e: React.FocusEvent) => {
    child.props.onBlur?.(e);
    hideTooltip();
  };

  const handleClick = (e: React.MouseEvent) => {
    child.props.onClick?.(e);
    hideTooltip();
  };

  const clonedChild = React.cloneElement(child, {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onClick: handleClick,
  });

  const shouldRender = (isCollapsed || alwaysEnable) && isVisible && Boolean(label);

  return (
    <div ref={triggerRef} className="relative flex w-full">
      {clonedChild}
      {shouldRender &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform: 'translateY(-50%)',
            }}
            className={`z-[9999] pointer-events-none flex items-center transition-opacity duration-150 ${
              isDarkMode
                ? 'bg-[#121215] text-white border-zinc-800 shadow-black/80'
                : 'bg-slate-900 text-white border-slate-800 shadow-slate-900/20'
            } px-3 py-1.5 text-xs font-medium rounded-lg shadow-xl border whitespace-nowrap`}
          >
            {/* Small left-pointing arrow ◀ */}
            <div
              className={`absolute -left-1.5 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[5px] border-y-transparent border-r-[6px] ${
                isDarkMode ? 'border-r-[#121215]' : 'border-r-slate-900'
              }`}
            />
            {label}
          </div>,
          document.body
        )}
    </div>
  );
};
