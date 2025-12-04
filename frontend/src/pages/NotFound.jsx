import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, BookOpen, Search, ArrowLeft } from 'lucide-react';
import { Button } from '../components/common';
import './NotFound.css';

const NotFound = () => {
  const { t } = useTranslation();
  return (
    <div className="not-found">
      <div className="not-found__container">
        <div className="not-found__illustration">
          <div className="not-found__book">
            <BookOpen size={80} />
          </div>
          <div className="not-found__code">404</div>
        </div>

        <h1 className="not-found__title">{t('notFound.subtitle')}</h1>
        <p className="not-found__description">
          {t('notFound.description')}
        </p>

        <div className="not-found__actions">
          <Link to="/">
            <Button size="lg">
              <Home size={20} />
              {t('notFound.goHome')}
            </Button>
          </Link>
          <Link to="/books">
            <Button variant="secondary" size="lg">
              <Search size={20} />
              {t('books.title')}
            </Button>
          </Link>
        </div>

        <div className="not-found__suggestions">
          <h3>{t('profile.quickLinks')}</h3>
          <div className="not-found__links">
            <Link to="/books" className="not-found__link">
              <BookOpen size={18} />
              {t('nav.books')}
            </Link>
            <Link to="/categories" className="not-found__link">
              <Search size={18} />
              {t('nav.categories')}
            </Link>
            <Link to="/register" className="not-found__link">
              <ArrowLeft size={18} />
              {t('nav.register')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

