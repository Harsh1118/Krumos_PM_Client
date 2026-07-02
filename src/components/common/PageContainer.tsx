import React from 'react';

interface PageContainerProps {
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  title,
  subtitle,
  headerActions,
  children,
  className = '',
}) => {
  return (
    <div className={`flex flex-col w-full page-enter ${className}`}>
      {/* Standard Page Header */}
      <div className="flex justify-between items-end border-b-2 border-line-strong pb-5 mb-8 flex-wrap gap-4">
        <div>
          <h1 className="page-title text-3xl font-extrabold tracking-tight font-display text-ink uppercase">
            {title}
          </h1>
          {subtitle && (
            <p className="eyebrow text-mute text-[11px] mt-1">
              {subtitle}
            </p>
          )}
        </div>

        {headerActions && (
          <div className="flex items-center gap-3">
            {headerActions}
          </div>
        )}
      </div>

      {/* Main Page Content */}
      <div className="flex-grow">
        {children}
      </div>
    </div>
  );
};

export default PageContainer;
