import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

interface ScaleToFitProps {
  /** Width (px) the children are designed at. They are scaled to fill the container width. */
  width: number;
  /** Crop the visible area to this many design-px of height. Omit to show everything. */
  cropHeight?: number;
  className?: string;
  children: ReactNode;
}

/** Renders fixed-width markup (like a resume page) at any container width without reflowing it. */
export default function ScaleToFit({ width, cropHeight, className, children }: ScaleToFitProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [naturalHeight, setNaturalHeight] = useState(0);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const measure = () => {
      setScale(outer.clientWidth / width);
      setNaturalHeight(inner.offsetHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [width]);

  const visibleHeight = cropHeight ? Math.min(cropHeight, naturalHeight || cropHeight) : naturalHeight;

  return (
    <div
      ref={outerRef}
      className={className}
      style={{ position: 'relative', width: '100%', overflow: 'hidden', height: visibleHeight ? visibleHeight * scale : undefined }}
    >
      <div ref={innerRef} style={{ width, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  );
}
