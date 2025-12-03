import { useState, useEffect } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Filter, X, BookOpen } from 'lucide-react';
import { useSearchBooks, useCategories } from '../../hooks';
import { BookGrid } from '../../components/books';
import { Button, Loader } from '../../components/common';
import './BooksPage.css';

const BooksPage = () => {
  const { t } = useTranslation();
  const { id: categoryId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const initialCategory = categoryId || searchParams.get('category') || '';
  
  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    category: initialCategory,
    language: searchParams.get('language') || '',
    title: searchParams.get('title') || '',
    author: searchParams.get('author') || '',
    publisher: searchParams.get('publisher') || '',
    yearFrom: searchParams.get('yearFrom') || '',
    yearTo: searchParams.get('yearTo') || '',
    sortBy: searchParams.get('sortBy') || 'relevance',
  });
  const [page, setPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { data: categoriesData } = useCategories();
  const { data, isLoading, isFetching } = useSearchBooks(
    { ...filters, page, limit: 12 },
    true
  );

  const categories = categoriesData?.data || [];
  const books = data?.data || [];

  useEffect(() => {
    if (categoryId && categoryId !== filters.category) {
      setFilters((prev) => ({ ...prev, category: categoryId }));
    }
  }, [categoryId]);

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ 
      q: '', 
      category: '', 
      language: '', 
      title: '',
      author: '',
      publisher: '',
      yearFrom: '',
      yearTo: '',
    });
    setPage(1);
  };

  const hasActiveFilters = filters.category || filters.language || 
    filters.title || filters.author || filters.publisher || 
    filters.yearFrom || filters.yearTo;

  return (
    <div className="books-page">
      <div className="books-page__container">
        <header className="books-page__header">
          {filters.author ? (
            <>
              <h1>{decodeURIComponent(filters.author)}</h1>
              <p>
                {t('books.authorBooks', { author: decodeURIComponent(filters.author) }) || `Книги автора "${decodeURIComponent(filters.author)}"`}
              </p>
            </>
          ) : filters.category ? (
            <>
              <h1>
                {categories.find(c => c.slug === filters.category)?.nameUk || 
                 categories.find(c => c.slug === filters.category)?.name || 
                 filters.category}
              </h1>
              <p>
                Книги в категорії "{categories.find(c => c.slug === filters.category)?.nameUk || 
                                   categories.find(c => c.slug === filters.category)?.name || 
                                   filters.category}"
              </p>
            </>
          ) : (
            <>
              <h1>{t('books.title')}</h1>
              <p>{t('home.hero.description')}</p>
            </>
          )}
        </header>

        <div className="books-page__toolbar">
          <form className="books-page__search" onSubmit={handleSearch}>
            <Search size={20} className="books-page__search-icon" />
            <input
              type="text"
              placeholder="Search books, authors..."
              value={filters.q}
              onChange={(e) => handleFilterChange('q', e.target.value)}
            />
          </form>

          <div className="books-page__toolbar-actions">
            <div className="books-page__sort">
              <label htmlFor="sort-select">{t('books.sortBy') || 'Sort by:'}</label>
              <select
                id="sort-select"
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="books-page__sort-select"
              >
                <option value="relevance">{t('books.sortRelevance') || 'Relevance'}</option>
                <option value="rating_desc">{t('books.sortRatingDesc') || 'Highest Rating'}</option>
                <option value="rating_asc">{t('books.sortRatingAsc') || 'Lowest Rating'}</option>
              </select>
            </div>

            <Button
              variant="secondary"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={hasActiveFilters ? 'books-page__filter-btn--active' : ''}
            >
              <Filter size={18} />
              {t('books.filters')}
              {hasActiveFilters && <span className="books-page__filter-badge" />}
            </Button>
          </div>
        </div>

        {isFilterOpen && (
          <div className="books-page__filters">
            <div className="books-page__filter-group">
              <label>{t('books.category')}</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <option value="">{t('common.allCategories')}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="books-page__filter-group">
              <label>{t('books.language')}</label>
              <select
                value={filters.language}
                onChange={(e) => handleFilterChange('language', e.target.value)}
              >
                <option value="">{t('common.allLanguages')}</option>
                <option value="en">English</option>
                <option value="uk">Ukrainian</option>
                <option value="de">German</option>
                <option value="fr">French</option>
              </select>
            </div>

            <div className="books-page__filter-group">
              <label>{t('books.titleField') || 'Назва книги'}</label>
              <input
                type="text"
                placeholder={t('books.titlePlaceholder') || 'Введіть назву книги'}
                value={filters.title}
                onChange={(e) => handleFilterChange('title', e.target.value)}
              />
            </div>

            <div className="books-page__filter-group">
              <label>{t('books.author') || 'Author'}</label>
              <input
                type="text"
                placeholder={t('books.authorPlaceholder') || 'Enter author name'}
                value={filters.author}
                onChange={(e) => handleFilterChange('author', e.target.value)}
              />
            </div>

            <div className="books-page__filter-group">
              <label>{t('books.publisher') || 'Publisher'}</label>
              <input
                type="text"
                placeholder={t('books.publisherPlaceholder') || 'Enter publisher name'}
                value={filters.publisher}
                onChange={(e) => handleFilterChange('publisher', e.target.value)}
              />
            </div>

            <div className="books-page__filter-group">
              <label>{t('books.publishYear') || 'Publish Year (From)'}</label>
              <input
                type="number"
                placeholder={t('books.yearFromPlaceholder') || 'From year'}
                value={filters.yearFrom}
                onChange={(e) => handleFilterChange('yearFrom', e.target.value)}
                min="1000"
                max={new Date().getFullYear()}
              />
            </div>

            <div className="books-page__filter-group">
              <label>{t('books.publishYearTo') || 'Publish Year (To)'}</label>
              <input
                type="number"
                placeholder={t('books.yearToPlaceholder') || 'To year'}
                value={filters.yearTo}
                onChange={(e) => handleFilterChange('yearTo', e.target.value)}
                min="1000"
                max={new Date().getFullYear()}
              />
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X size={16} />
                {t('books.clearFilters')}
              </Button>
            )}
          </div>
        )}

        <div className="books-page__results">
          {isLoading ? (
            <div className="books-page__loading">
              <Loader size="lg" />
            </div>
          ) : (
            <>
              {books.length > 0 ? (
                <section className="books-page__section">
                  <BookGrid books={books} />
                </section>
              ) : (
                <div className="books-page__empty">
                  <div className="books-page__empty-icon">
                    <BookOpen size={48} />
                  </div>
                  <h3>{t('books.noResults')}</h3>
                  <p>{t('books.tryDifferentQuery')}</p>
                  {hasActiveFilters && (
                    <Button variant="secondary" onClick={clearFilters}>
                      {t('books.clearFilters')}
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {books.length > 0 && (
          <div className="books-page__pagination">
            <Button
              variant="secondary"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              {t('common.previous')}
            </Button>
            <span className="books-page__page">{t('common.page')} {page}</span>
            <Button
              variant="secondary"
              disabled={books.length < 12}
              onClick={() => setPage((p) => p + 1)}
            >
              {t('common.next')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BooksPage;
