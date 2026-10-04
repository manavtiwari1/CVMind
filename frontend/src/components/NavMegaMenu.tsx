import { NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuTrigger } from './ui/navigation-menu';
import type { NavMenu, NavBadge } from './navMenus';
import './NavMegaMenu.css';

const BADGE_LABEL: Record<NavBadge, string> = { new: 'NEW', soon: 'SOON' };

interface NavMegaMenuProps {
  menu: NavMenu;
  currentPage: string;
  onNavigate: (page: string) => void;
}

/** One top-level navbar item with a mega menu: icon tiles plus plain "Learning" links. */
export default function NavMegaMenu({ menu, currentPage, onNavigate }: NavMegaMenuProps) {
  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger className={`nav-link nav-link-trigger${menu.pages.includes(currentPage) ? ' active' : ''}`}>
        {menu.label}
      </NavigationMenuTrigger>
      <NavigationMenuContent>
        <div className="nm-panel">
          {menu.columns.map((col) => (
            <div key={col.heading} className={`nm-col${col.tiles ? '' : ' nm-col--links'}`}>
              <span className="nm-heading">{col.heading}</span>
              {col.tiles?.map((t) => (
                <NavigationMenuLink key={t.page} render={<button type="button" className="nm-tile" onClick={() => onNavigate(t.page)} />}>
                  <span className="nm-icon"><t.icon size={18} strokeWidth={1.75} aria-hidden="true" /></span>
                  <span className="nm-text">
                    <span className="nm-title">
                      {t.title}
                      {t.badge && <span className={`nm-badge nm-badge--${t.badge}`}>{BADGE_LABEL[t.badge]}</span>}
                    </span>
                    <span className="nm-desc">{t.desc}</span>
                  </span>
                </NavigationMenuLink>
              ))}
              {col.links?.map((l) => (
                <NavigationMenuLink key={l.page} render={<button type="button" className="nm-link" onClick={() => onNavigate(l.page)} />}>
                  {l.title}
                </NavigationMenuLink>
              ))}
            </div>
          ))}
        </div>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}
