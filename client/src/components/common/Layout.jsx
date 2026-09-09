import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 ml-60 p-6 lg:p-8 max-w-full overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
