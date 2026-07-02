import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  disabled?: boolean;
  delayMs?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  disabled = false,
  delayMs = 2000, // 2-second hover delay as required
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const handleMouseEnter = (event: React.MouseEvent) => {
    if (disabled || !content) return;

    const rect = event.currentTarget.getBoundingClientRect();
    setCoords({
      top: rect.top + rect.height / 2,
      left: rect.right + 8, // 8px gap next to the icon
    });

    // Start timer for 2 seconds
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delayMs);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (disabled || !content) {
    return children;
  }

  // Clone children to attach events and refs
  const child = React.Children.only(children) as React.ReactElement<any>;
  const childWithEvents = React.cloneElement(child, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      // Handle forwarding refs if needed
      const { ref } = child as any;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    onMouseEnter: (e: React.MouseEvent) => {
      if (child.props.onMouseEnter) child.props.onMouseEnter(e);
      handleMouseEnter(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      if (child.props.onMouseLeave) child.props.onMouseLeave(e);
      handleMouseLeave();
    },
  });

  return (
    <>
      {childWithEvents}
      {createPortal(
        <AnimatePresence>
          {isVisible && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, x: -6 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, x: -6 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="fixed bg-slate-900 border border-white/[0.08] text-white px-3 py-1.5 rounded shadow-lg font-mono text-[10px] font-bold uppercase tracking-wider select-none pointer-events-none"
              style={{
                top: coords.top,
                left: coords.left,
                transform: 'translateY(-50%)',
                zIndex: 9999, // Ensure it is above all other UI elements
              }}
            >
              {content}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default Tooltip;
