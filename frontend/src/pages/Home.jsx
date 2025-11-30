import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, BookOpen, Search, Download, Users } from 'lucide-react';
import { useTrendingBooks, useCategories } from '../hooks';
import { BookGrid } from '../components/books';
import { Button, Loader } from '../components/common';
import './Home.css';

const Home = () => {
  const { t } = useTranslation();
  const { data: trendingData, isLoading: trendingLoading } = useTrendingBooks('weekly', 8);
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories();

  const trendingBooks = trendingData?.data || [];
  const categories = categoriesData?.data?.slice(0, 8) || [];

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero__container">
          <div className="hero__content">
            <h1 className="hero__title">
              {t('home.hero.title')}
              <span className="hero__title-highlight"> {t('home.hero.titleHighlight')}</span>
            </h1>
            <p className="hero__description">
              {t('home.hero.description')}
            </p>
            <div className="hero__actions">
              <Link to="/books">
                <Button size="lg">
                  {t('home.hero.browse')}
                  <ArrowRight size={20} />
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="secondary" size="lg">
                  {t('home.hero.getStarted')}
                </Button>
              </Link>
            </div>
          </div>
          <div className="hero__visual">
            <div className="hero__books">
              <div className="hero__book hero__book--1"></div>
              <div className="hero__book hero__book--2"></div>
              <div className="hero__book hero__book--3"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="features__container">
          <div className="feature">
            <div className="feature__icon">
              <Search size={24} />
            </div>
            <h3>{t('home.features.search')}</h3>
            <p>{t('home.features.searchDesc')}</p>
          </div>
          <div className="feature">
            <div className="feature__icon">
              <BookOpen size={24} />
            </div>
            <h3>{t('home.features.collection')}</h3>
            <p>{t('home.features.collectionDesc')}</p>
          </div>
          <div className="feature">
            <div className="feature__icon">
              <Download size={24} />
            </div>
            <h3>{t('home.features.download')}</h3>
            <p>{t('home.features.downloadDesc')}</p>
          </div>
          <div className="feature">
            <div className="feature__icon">
              <Users size={24} />
            </div>
            <h3>{t('home.features.personal')}</h3>
            <p>{t('home.features.personalDesc')}</p>
          </div>
        </div>
      </section>

      {/* Trending Books Section */}
      <section className="section">
        <div className="section__container">
          <div className="section__header">
            <h2 className="section__title">{t('home.trending')}</h2>
            <Link to="/books" className="section__link">
              {t('home.viewAll')} <ArrowRight size={18} />
            </Link>
          </div>
          {trendingLoading ? (
            <div className="section__loading">
              <Loader />
            </div>
          ) : (
            <BookGrid books={trendingBooks} showActions={false} />
          )}
        </div>
      </section>

      {/* Categories Section */}
      <section className="section section--alt">
        <div className="section__container">
          <div className="section__header">
            <h2 className="section__title">{t('home.categories')}</h2>
            <Link to="/categories" className="section__link">
              {t('home.viewAll')} <ArrowRight size={18} />
            </Link>
          </div>
          {categoriesLoading ? (
            <div className="section__loading">
              <Loader />
            </div>
          ) : (
            <div className="categories-grid">
              {categories.map((category) => (
                <Link 
                  key={category.id} 
                  to={`/categories/${category.slug}`}
                  className="category-card"
                >
                  <h3>{category.nameUk || category.name}</h3>
                  {category.nameUk && category.name !== category.nameUk && (
                    <span className="category-card__en">{category.name}</span>
                  )}
                  {category.description && (
                    <p className="category-card__description">{category.description}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="cta__container">
          <h2>{t('home.cta.title')}</h2>
          <p>{t('home.cta.description')}</p>
          <Link to="/register">
            <Button size="lg">
              {t('home.cta.signup')}
              <ArrowRight size={20} />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;

