import type { ComponentPropsWithRef } from 'react';

type CardProps = ComponentPropsWithRef<'div'>;

export default function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div {...props} className={`card ${className}`}>
      {children}
    </div>
  );
}
