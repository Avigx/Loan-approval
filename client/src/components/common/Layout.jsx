import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
  return (
    <div className="flex min-h-screen bg-surface-100">
      <Sidebar />
      <main className="flex-1 ml-64 p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
