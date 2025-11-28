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
  const { id: categoryId } = useParams(); // Get category from URL if /categories/:id
  const [searchParams, setSearchParams] = useSearchParams();
  
  // If we came from /categories/:id, use that as category
  const initialCategory = categoryId || searchParams.get('category') || '';
  // If category is set, default to 'all' sources to show both local and Open Library
  const initialSource = searchParams.get('source') || (initialCategory ? 'all' : 'all');
  
  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    category: initialCategory,
    language: searchParams.get('language') || '',
    source: initialSource,
  });
  const [page, setPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { data: categoriesData } = useCategories();
  // Always enable search - even if no query, we might have category
  const { data, isLoading, isFetching } = useSearchBooks(
    { ...filters, page, limit: 12 },
    true // Always enabled
  );

  const categories = categoriesData?.data || [];
  const localBooks = data?.data?.local?.data || [];
  const openLibraryBooks = data?.data?.openLibrary?.data || [];
  const allBooks = filters.source === 'local' 
    ? localBooks 
    : filters.source === 'openlibrary'
    ? openLibraryBooks
    : [...localBooks, ...openLibraryBooks];

  // Update filters when categoryId changes (from URL)
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
    setFilters({ q: '', category: '', language: '', source: 'all' });
    setPage(1);
  };

  const hasActiveFilters = filters.category || filters.language || filters.source !== 'all';

  return (
    <div className="books-page">
      <div className="books-page__container">
        <header className="books-page__header">
          {filters.category ? (
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

        {/* Search and Filter Bar */}
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

        {/* Filters Panel */}
        {isFilterOpen && (
          <div className="books-page__filters">
            <div className="books-page__filter-group">
              <label>{t('common.search')}</label>
              <select
                value={filters.source}
                onChange={(e) => handleFilterChange('source', e.target.value)}
              >
                <option value="all">{t('common.allSources')}</option>
                <option value="local">{t('common.localLibrary')}</option>
                <option value="openlibrary">{t('common.openLibrary')}</option>
              </select>
            </div>

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

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X size={16} />
                {t('books.clearFilters')}
              </Button>
            )}
          </div>
        )}

        {/* Results */}
        <div className="books-page__results">
          {isLoading ? (
            <div className="books-page__loading">
              <Loader size="lg" />
            </div>
          ) : (
            <>
              {filters.source !== 'openlibrary' && localBooks.length > 0 && (
                <section className="books-page__section">
                  <h2>{t('books.fromOurLibrary')} ({localBooks.length})</h2>
                  <BookGrid books={localBooks} />
                </section>
              )}

              {filters.source !== 'local' && openLibraryBooks.length > 0 && (
                <section className="books-page__section">
                  <h2>{t('books.fromOpenLibrary')} ({openLibraryBooks.length})</h2>
                  <BookGrid books={openLibraryBooks} showActions={false} />
                </section>
              )}
              
              {/* Show message if category is selected but no books found */}
              {filters.category && allBooks.length === 0 && !isLoading && (
                <div className="books-page__empty">
                  <div className="books-page__empty-icon">
                    <BookOpen size={48} />
                  </div>
                  <h3>{t('books.categoryNotFound')}</h3>
                  <p>{t('books.tryAnotherCategory')}</p>
                  <Button variant="secondary" onClick={clearFilters}>
                    {t('books.showAllBooks')}
                  </Button>
                </div>
              )}

              {allBooks.length === 0 && !filters.category && (
                <div className="books-page__empty">
                  <div className="books-page__empty-icon">
                    <BookOpen size={48} />
                  </div>
                  <h3>{t('books.noResults')}</h3>
                  <p>{t('books.tryDifferentQuery')}</p>
                  {filters.q && (
                    <Button variant="secondary" onClick={clearFilters}>
                      {t('books.clearFilters')}
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Pagination */}
        {allBooks.length > 0 && (
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
              disabled={allBooks.length < 12}
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

