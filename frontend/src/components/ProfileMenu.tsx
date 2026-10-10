import { useEffect, useState } from 'react';
import { ChevronDown, Globe, Check } from 'lucide-react';
import ContactDialog from './ContactDialog';
import type { StoredUser } from '../types/api';
import './ProfileMenu.css';

interface ProfileMenuProps {
  user: StoredUser | null;
  setCurrentPage: (page: string) => void;
  handleSignOut: () => void;
}

// Avatar button with the account dropdown (Plans, Account, Help Center, Contact Us, Language, Log Out)
export default function ProfileMenu({ user, setCurrentPage, handleSignOut }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const [showLanguages, setShowLanguages] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [open]);

  const go = (page: string) => {
    setOpen(false);
    setCurrentPage(page);
  };

  return (
    <>
      <div className="nav-profile-container" onClick={e => e.stopPropagation()}>
        <button
          className="nav-profile-trigger"
          onClick={() => { setOpen(prev => !prev); setShowLanguages(false); }}
          aria-haspopup="menu"
          aria-expanded={open}
          title="Profile Menu"
        >
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="nav-profile-avatar" />
          ) : (
            <div className="nav-profile-monogram">
              {String(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <ChevronDown size={16} className={`nav-profile-caret${open ? ' open' : ''}`} />
        </button>

        {open && (
          <div className="nav-profile-dropdown animate-scale-up" role="menu">
            <button role="menuitem" className="nav-profile-dropdown-item" onClick={() => go('pricing')}>
              Plans
            </button>
            <button role="menuitem" className="nav-profile-dropdown-item" onClick={() => go('account')}>
              Account
            </button>
            <button role="menuitem" className="nav-profile-dropdown-item" onClick={() => go('invite')}>
              Invite friends
            </button>
            <button role="menuitem" className="nav-profile-dropdown-item" onClick={() => go('help-center')}>
              Help Center
            </button>
            <button role="menuitem" className="nav-profile-dropdown-item" onClick={() => { setOpen(false); setContactOpen(true); }}>
              Contact Us
            </button>
            <button
              role="menuitem"
              className="nav-profile-dropdown-item"
              aria-expanded={showLanguages}
              onClick={() => setShowLanguages(v => !v)}
            >
              Language
              <Globe size={16} className="nav-profile-dropdown-trail" />
            </button>
            {showLanguages && (
              <div className="nav-language-list">
                <div className="nav-language-option selected">
                  English <Check size={15} />
                </div>
                <div className="nav-language-note">More languages coming soon</div>
              </div>
            )}
            <button role="menuitem" className="nav-profile-dropdown-item" onClick={() => { setOpen(false); handleSignOut(); }}>
              Log Out
            </button>
          </div>
        )}
      </div>

      <ContactDialog open={contactOpen} onClose={() => setContactOpen(false)} />
    </>
  );
}
