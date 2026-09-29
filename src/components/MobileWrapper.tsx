import { ReactNode } from 'react';

interface MobileWrapperProps {
  children: ReactNode;
}

export const MobileWrapper = ({ children }: MobileWrapperProps) => {
  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-background flex items-center justify-center">
      <div className="w-full max-w-[430px] min-h-screen min-h-[100dvh] bg-page-bg safe-area-inset relative shadow-2xl">
        {children}
      </div>
    </div>
  );
};
