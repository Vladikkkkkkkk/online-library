import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, Trash2, BookOpen, Search, Filter } from 'lucide-react';
import { useSavedBooks, useRemoveBook } from '../../hooks/useLibrary';
import { BookGrid } from '../../components/books';
import { Button, Input, Loader } from '../../components/common';
import toast from 'react-hot-toast';
import './MyLibrary.css';

const MyLibrary = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: libraryData, isLoading } = useSavedBooks();
  const removeBook = useRemoveBook();

  const savedBooks = libraryData?.data || [];

  // Filter books by search query
  const filteredBooks = savedBooks.filter((item) => {
    const book = item.book;
    if (!book) return false;
    
    const title = book.title?.toLowerCase() || '';
    const authors = book.authors?.map(a => (typeof a === 'string' ? a : a.name)?.toLowerCase() || '').join(' ') || '';
    const query = searchQuery.toLowerCase();
    return title.includes(query) || authors.includes(query);
  });

  const handleRemoveBook = async (bookId, bookTitle, source = 'local') => {
    if (window.confirm(t('library.removeConfirm', { title: bookTitle }))) {
      removeBook.mutate({ bookId, source }, {
        onSuccess: () => {
          toast.success(t('library.removed'));
        },
        onError: () => {
          toast.error(t('library.removeError'));
        },
      });
    }
  };

  // Transform saved books to match BookGrid format
  const booksForGrid = filteredBooks
    .filter(item => item.book) // Filter out items without book data
    .map((item) => ({
      ...item.book,
      id: item.book.id || item.openLibraryId, // Use openLibraryId if id is missing
      savedAt: item.savedAt,
      source: item.source, // Include source for navigation
    }));

  return (
    <div className="my-library">
      <div className="my-library__container">
        {/* Header */}
        <div className="my-library__header">
          <div className="my-library__title-section">
            <h1 className="my-library__title">
              <Heart size={28} fill="currentColor" />
              {t('library.title')}
            </h1>
            <p className="my-library__subtitle">
              {t('library.booksSaved', { count: savedBooks.length })}
            </p>
          </div>

          {savedBooks.length > 0 && (
            <div className="my-library__search">
              <Search size={18} className="my-library__search-icon" />
              <input
                type="text"
                placeholder={t('library.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="my-library__search-input"
              />
            </div>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="my-library__loading">
            <Loader size="lg" />
          </div>
        ) : savedBooks.length === 0 ? (
          <div className="my-library__empty">
            <div className="my-library__empty-icon">
              <BookOpen size={64} />
            </div>
            <h2>{t('library.empty')}</h2>
            <p>
              {t('library.emptyDesc')}
            </p>
            <Link to="/books">
              <Button size="lg">
                <BookOpen size={18} />
                {t('library.goToCatalog')}
              </Button>
            </Link>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="my-library__no-results">
            <Search size={48} />
            <h2>{t('library.noResults')}</h2>
            <p>{t('library.tryDifferentQuery')}</p>
            <Button variant="secondary" onClick={() => setSearchQuery('')}>
              {t('library.clearSearch')}
            </Button>
          </div>
        ) : (
          <div className="my-library__content">
            <BookGrid 
              books={booksForGrid} 
              showActions={true}
              onRemove={handleRemoveBook}
              showSavedBadge={true}
            />
          </div>
        )}

        {/* Info Section */}
        {savedBooks.length > 0 && (
          <div className="my-library__info">
            <h3>💡 Підказка</h3>
            <p>
              Натисніть на книгу, щоб переглянути деталі, або використовуйте кнопку завантаження,
              щоб скачати книгу у PDF форматі.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyLibrary;

