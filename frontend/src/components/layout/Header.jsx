import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Menu, X, User, LogOut, Settings, BookOpen, Shield, Globe } from 'lucide-react';
import useAuthStore from '../../context/authStore';
import './Header.css';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, isAuthenticated, logout, isAdmin } = useAuthStore();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'uk' ? 'en' : 'uk';
    i18n.changeLanguage(newLang);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/books?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="header__container">
        <Link to="/" className="header__logo">
          <BookOpen className="header__logo-icon" />
          <span>Online Library</span>
        </Link>

        <form className="header__search" onSubmit={handleSearch}>
          <Search className="header__search-icon" size={20} />
          <input
            type="text"
            placeholder={t('books.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        <nav className={`header__nav ${isMenuOpen ? 'header__nav--open' : ''}`}>
          <Link to="/books" className="header__nav-link" onClick={() => setIsMenuOpen(false)}>
            {t('nav.books')}
          </Link>
          <Link to="/categories" className="header__nav-link" onClick={() => setIsMenuOpen(false)}>
            {t('nav.categories')}
          </Link>

          {/* Language Toggle */}
          <button className="header__lang-toggle" onClick={toggleLanguage} title="Change language">
            <Globe size={18} />
            <span>{i18n.language.toUpperCase()}</span>
          </button>

          {isAuthenticated ? (
            <div className="header__user">
              <button className="header__user-btn">
                <User size={20} />
                <span>{user?.firstName}</span>
              </button>
              <div className="header__dropdown">
                <Link to="/profile" className="header__dropdown-item" onClick={() => setIsMenuOpen(false)}>
                  <User size={18} />
                  <span>{t('nav.profile')}</span>
                </Link>
                <Link to="/library" className="header__dropdown-item" onClick={() => setIsMenuOpen(false)}>
                  <BookOpen size={18} />
                  <span>{t('nav.library')}</span>
                </Link>
                <Link to="/settings" className="header__dropdown-item" onClick={() => setIsMenuOpen(false)}>
                  <Settings size={18} />
                  <span>{t('nav.settings')}</span>
                </Link>
                {isAdmin() && (
                  <Link to="/admin" className="header__dropdown-item" onClick={() => setIsMenuOpen(false)}>
                    <Shield size={18} />
                    <span>{t('nav.admin')}</span>
                  </Link>
                )}
                <hr className="header__dropdown-divider" />
                <button className="header__dropdown-item header__dropdown-item--danger" onClick={handleLogout}>
                  <LogOut size={18} />
                  <span>{t('nav.logout')}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="header__auth">
              <Link to="/login" className="header__auth-link" onClick={() => setIsMenuOpen(false)}>
                {t('nav.login')}
              </Link>
              <Link to="/register" className="header__auth-btn" onClick={() => setIsMenuOpen(false)}>
                {t('nav.register')}
              </Link>
            </div>
          )}
        </nav>

        <button className="header__menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </header>
  );
};

export default Header;

