import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  circle,
  className = '',
  style,
}) => {
  const customStyles: React.CSSProperties = {
    width,
    height,
    borderRadius: circle ? '50%' : 'var(--radius-sm, 6px)',
    ...style,
  };

  return <div className={`skeleton-shimmer ${className}`} style={customStyles} />;
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="card w-full flex flex-col gap-4 bg-bone-2 border border-line rounded-lg p-5">
      <div className="flex justify-between items-center">
        <Skeleton width="60%" height={20} />
        <Skeleton width="20%" height={20} />
      </div>
      <Skeleton width="90%" height={14} className="mt-2" />
      <Skeleton width="75%" height={14} />
      
      <div className="h-[1px] bg-line my-1" />
      
      <div className="flex justify-between items-center mt-1">
        <div className="flex items-center gap-2">
          <Skeleton circle width={32} height={32} />
          <div className="flex flex-col gap-1">
            <Skeleton width={80} height={12} />
            <Skeleton width={50} height={10} />
          </div>
        </div>
        <div className="flex gap-1.5">
          <Skeleton width={28} height={28} />
          <Skeleton width={28} height={28} />
        </div>
      </div>
    </div>
  );
};

export const RowSkeleton: React.FC = () => {
  return (
    <tr className="border-b border-line/50">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton circle width={36} height={36} className="shrink-0" />
          <div className="flex-grow flex flex-col gap-1.5">
            <Skeleton width="50%" height={14} />
            <Skeleton width="80%" height={10} />
          </div>
        </div>
      </td>
      <td className="p-4">
        <Skeleton width={60} height={20} />
      </td>
      <td className="p-4">
        <Skeleton width={80} height={14} />
      </td>
      <td className="p-4 text-center">
        <div className="inline-flex gap-1.5 justify-center">
          <Skeleton width={28} height={28} />
        </div>
      </td>
    </tr>
  );
};

export const BoardSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-4 gap-6 w-full flex-1 max-lg:grid-cols-[repeat(4,min(280px,80vw))] max-lg:snap-x max-lg:snap-mandatory overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-bone-2 border border-line rounded-md flex flex-col p-5 gap-4 max-h-full max-lg:snap-align-start shrink-0">
          <div className="flex justify-between items-center mb-1 border-b border-line pb-3">
            <Skeleton width="50%" height={18} />
            <Skeleton width={24} height={20} />
          </div>
          <div className="flex flex-col gap-4 overflow-y-auto">
            {[1, 2, 3].map((j) => (
              <div key={j} className="card bg-bone p-5 flex flex-col gap-4 shadow-sm border border-line">
                <Skeleton width="95%" height={14} />
                <Skeleton width="60%" height={10} className="mt-1" />
                <div className="flex justify-between items-center mt-2">
                  <Skeleton width={40} height={16} />
                  <Skeleton circle width={20} height={20} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card flex items-center p-4 gap-3 bg-bone-2 border border-line">
            <Skeleton circle width={36} height={36} className="shrink-0" />
            <div className="flex-grow flex flex-col gap-2">
              <Skeleton width={30} height={24} />
              <Skeleton width={60} height={10} />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card bg-bone-2 border border-line p-5">
          <div className="flex items-center mb-4 gap-2">
            <Skeleton circle width={20} height={20} />
            <Skeleton width={120} height={18} />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between items-center py-3 border-b border-line last:border-0">
              <div className="flex-grow flex flex-col gap-2">
                <Skeleton width="70%" height={14} />
                <Skeleton width="30%" height={10} />
              </div>
              <div className="flex gap-2 items-center">
                <Skeleton width={40} height={16} />
                <Skeleton width={50} height={16} />
              </div>
            </div>
          ))}
        </div>
        <div className="card bg-bone-2 border border-line p-5">
          <div className="flex items-center mb-4 gap-2">
            <Skeleton circle width={20} height={20} />
            <Skeleton width={100} height={18} />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 py-3 border-b border-line last:border-0">
              <Skeleton circle width={32} height={32} className="shrink-0" />
              <div className="flex-grow flex flex-col gap-2">
                <Skeleton width="90%" height={12} />
                <Skeleton width="20%" height={10} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default Skeleton;
