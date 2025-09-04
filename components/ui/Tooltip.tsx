import React, { useLayoutEffect, useRef, useState } from 'react';

interface TooltipProps {
  target: HTMLElement | null;
  children: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ target, children }) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (target && tooltipRef.current) {
      const targetRect = target.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportPadding = 10;

      let top = targetRect.top - tooltipRect.height - 8; // Position above by default
      let left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);

      // Adjust if it goes off the top of the screen
      if (top < viewportPadding) {
        top = targetRect.bottom + 8;
      }

      // Adjust if it goes off the left/right of the screen
      if (left < viewportPadding) {
        left = viewportPadding;
      } else if (left + tooltipRect.width > window.innerWidth - viewportPadding) {
        left = window.innerWidth - tooltipRect.width - viewportPadding;
      }

      setPosition({ top, left });
    }
  }, [target]);

  if (!target) return null;

  return (
    <div
      ref={tooltipRef}
      className="fixed z-50 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm tooltip dark:bg-gray-700 border border-gray-600 transition-opacity duration-300"
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
        pointerEvents: 'none', // Allow mouse events to pass through
      }}
      role="tooltip"
    >
      {children}
    </div>
  );
};

export default Tooltip;
