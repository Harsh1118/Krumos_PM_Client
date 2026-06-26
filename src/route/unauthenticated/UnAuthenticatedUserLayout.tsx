import React from 'react';
import { Outlet } from 'react-router-dom';

export const UnAuthenticatedUserLayout: React.FC = () => {
  return (
    <div className="unauthenticated-layout">
      <Outlet />
    </div>
  );
};
