import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, Trash2, BookOpen, Search, Filter } from 'lucide-react';
import { useSavedBooks, useRemoveBook } from '../../hooks/useLibrary';
import { BookGrid } from '../../components/books';
import { Button, Input, Loader, ConfirmModal } from '../../components/common';
import './MyLibrary.css';

const MyLibrary = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 12;
  const [bookToRemove, setBookToRemove] = useState(null);
  const { data: libraryData, isLoading } = useSavedBooks({ page, limit });
  const removeBook = useRemoveBook();

  const savedBooks = libraryData?.data || [];
  const pagination = libraryData?.pagination || {};
  const totalBooks = pagination?.totalItems || 0;


  const filteredBooks = savedBooks.filter((item) => {
    const book = item.book;
    if (!book) return false;

    const title = book.title?.toLowerCase() || '';
    const authors = book.authors?.map(a => (typeof a === 'string' ? a : a.name)?.toLowerCase() || '').join(' ') || '';
    const query = searchQuery.toLowerCase();
    return title.includes(query) || authors.includes(query);
  });

  const handleRemoveBook = (openLibraryId, bookTitle) => {
    setBookToRemove({ openLibraryId, title: bookTitle });
  };

  const confirmRemoveBook = () => {
    if (bookToRemove) {
      removeBook.mutate({ openLibraryId: bookToRemove.openLibraryId }, {
        onSuccess: () => {
          setBookToRemove(null);
        },
      });
    }
  };


  const booksForGrid = filteredBooks
    .filter(item => item.book && item.book.title && item.book.title !== 'Book unavailable' && item.book.title !== 'Loading...')
    .map((item) => ({
      ...item.book,
      id: item.openLibraryId || item.book.id, 
      openLibraryId: item.openLibraryId,
      savedAt: item.savedAt,
    }));

  return (
    <div className="my-library">
      <div className="my-library__container">
        {}
        <div className="my-library__header">
          <div className="my-library__title-section">
            <h1 className="my-library__title">
              <Heart size={28} fill="currentColor" />
              {t('library.title')}
            </h1>
            <p className="my-library__subtitle">
              {totalBooks > 0 
                ? `${totalBooks} ${totalBooks === 1 ? t('library.book') : totalBooks < 5 ? t('library.books') : t('common.books')} ${t('library.booksSavedText')}`
                : t('library.empty')}
            </p>
          </div>

          {totalBooks > 0 && (
            <div className="my-library__search">
              <Search size={18} className="my-library__search-icon" />
              <input
                type="text"
                placeholder={t('library.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1); 
                }}
                className="my-library__search-input"
              />
            </div>
          )}
        </div>

        {}
        {isLoading ? (
          <div className="my-library__loading">
            <Loader size="lg" />
          </div>
        ) : totalBooks === 0 ? (
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
            <Button variant="secondary" onClick={() => {
              setSearchQuery('');
              setPage(1);
            }}>
              {t('library.clearSearch')}
            </Button>
          </div>
        ) : (
          <>
            <div className="my-library__content">
              <BookGrid 
                books={booksForGrid} 
                showActions={true}
                onRemove={handleRemoveBook}
                showSavedBadge={true}
              />
            </div>

            {}
            {!searchQuery && totalBooks > limit && (
              <div className="my-library__pagination">
                <Button
                  variant="secondary"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  {t('common.previous')}
                </Button>
                <span className="my-library__page-info">
                  {t('common.page')} {page} {t('common.of')} {Math.ceil(totalBooks / limit)}
                </span>
                <Button
                  variant="secondary"
                  disabled={savedBooks.length < limit || page * limit >= totalBooks}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t('common.next')}
                </Button>
              </div>
            )}
          </>
        )}

        {}
        {totalBooks > 0 && (
          <div className="my-library__info">
            <h3>💡 {t('library.tip')}</h3>
            <p>
              {t('library.tipClickBook')}
            </p>
          </div>
        )}
      </div>

      {}
      {bookToRemove && (
        <ConfirmModal
          isOpen={!!bookToRemove}
          onClose={() => setBookToRemove(null)}
          onConfirm={confirmRemoveBook}
          title={t('library.removeTitle') || 'Видалити книгу?'}
          message={t('library.removeConfirm', { title: bookToRemove.title }) || `Ви впевнені, що хочете видалити "${bookToRemove.title}" з бібліотеки?`}
          confirmText={t('common.delete') || 'Видалити'}
          cancelText={t('common.cancel') || 'Скасувати'}
          variant="danger"
        />
      )}
    </div>
  );
};

export default MyLibrary;

