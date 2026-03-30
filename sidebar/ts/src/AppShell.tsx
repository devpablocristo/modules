import { useEffect, useState, type PropsWithChildren, type ReactNode } from 'react';

export type AppShellNavItem = {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
  isActive?: (pathname: string, search: string) => boolean;
};

export type AppShellNavSection = {
  label: string;
  items: AppShellNavItem[];
};

export type AppShellProps = PropsWithChildren<{
  brandTitle: string;
  brandSubtitle: string;
  brandIcon?: ReactNode;
  sections: AppShellNavSection[];
  footerContent?: ReactNode;
  /** Renderiza cada link de navegación. Recibe el item y si está activo según isActive custom. */
  renderLink: (item: AppShellNavItem, className: string) => ReactNode;
  /** Formatea labels (ej. sentenceCase). Default: identidad. */
  formatLabel?: (label: string) => string;
  /** Pathname actual para scroll-to-top. */
  pathname?: string;
}>;

export function AppShell({
  children,
  brandTitle,
  brandSubtitle,
  brandIcon,
  sections,
  footerContent,
  renderLink,
  formatLabel = (s) => s,
  pathname,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const main = document.querySelector<HTMLElement>('.main-content');
    main?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return (
    <div className={`app-layout${sidebarOpen ? '' : ' sidebar-collapsed'}`}>
      <aside className="sidebar">
        <div
          className="sidebar-brand"
          onClick={() => setSidebarOpen((v) => !v)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setSidebarOpen((v) => !v)}
        >
          <div className="sidebar-brand-row">
            {brandIcon && <span className="sidebar-brand-icon">{brandIcon}</span>}
            <h1>{brandTitle}</h1>
            <span className="sidebar-brand-arrow">{sidebarOpen ? '‹' : '›'}</span>
          </div>
          <small>{formatLabel(brandSubtitle)}</small>
        </div>

        <nav className="sidebar-nav">
          {sections.map((section) => (
            <NavSection
              key={section.label}
              label={section.label}
              items={section.items}
              renderLink={renderLink}
              formatLabel={formatLabel}
            />
          ))}
        </nav>

        <div className="sidebar-footer">
          {footerContent ?? null}
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}

function NavSection({
  label,
  items,
  renderLink,
  formatLabel,
}: AppShellNavSection & {
  renderLink: AppShellProps['renderLink'];
  formatLabel: (s: string) => string;
}) {
  const [open, setOpen] = useState(true);

  return (
    <>
      <div
        className="sidebar-section-label"
        onClick={() => setOpen((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setOpen((v) => !v)}
      >
        <span>{formatLabel(label)}</span>
        <span className={`sidebar-section-arrow${open ? '' : ' sidebar-section-arrow--closed'}`}>‹</span>
      </div>
      {open && items.map((item) => (
        renderLink(item, 'sidebar-link')
      ))}
    </>
  );
}
