import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen } from 'lucide-react';
import { useCategories } from '../../hooks';
import { Loader } from '../../components/common';
import './CategoriesPage.css';

const CategoriesPage = () => {
  const { t } = useTranslation();
  const { data: categoriesData, isLoading } = useCategories();

  const categories = categoriesData?.data || [];

  return (
    <div className="categories-page">
      <div className="categories-page__container">
        <header className="categories-page__header">
          <h1>{t('home.categories')}</h1>
        </header>

        {isLoading ? (
          <div className="categories-page__loading">
            <Loader size="lg" />
          </div>
        ) : categories.length === 0 ? (
          <div className="categories-page__empty">
            <div className="categories-page__empty-icon">
              <BookOpen size={48} />
            </div>
            <h3>{t('categories.noCategories') || 'No categories available'}</h3>
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
    </div>
  );
};

export default CategoriesPage;

