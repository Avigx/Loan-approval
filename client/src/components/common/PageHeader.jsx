import { ChevronRight } from 'lucide-react';

/**
 * Reusable page header with breadcrumbs, title, description, and optional actions.
 *
 * Props:
 *  - title: string
 *  - description: string (optional)
 *  - breadcrumbs: Array<{ label, href? }> (optional)
 *  - actions: React node (optional)
 */
const PageHeader = ({ title, description, breadcrumbs, actions }) => {
  return (
    <div className="mb-6">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-xs text-slate-400 mb-2" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3 h-3" />}
              <span className={i === breadcrumbs.length - 1 ? 'text-slate-600' : ''}>{crumb.label}</span>
            </span>
          ))}
        </nav>
      )}

      {/* Title + Actions row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          {description && (
            <p className="text-sm text-slate-500 mt-0.5">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
    </div>
  );
};

export default PageHeader;
