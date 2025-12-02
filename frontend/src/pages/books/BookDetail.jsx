import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Heart, BookOpen, Calendar, Globe, User, ExternalLink, Bookmark } from 'lucide-react';
import { useBook } from '../../hooks';
import { useBookStatus, useSaveBook, useRemoveBook } from '../../hooks/useLibrary';
import { Button, Loader } from '../../components/common';
import ReviewSection from '../../components/books/ReviewSection';
import AddToPlaylist from '../../components/books/AddToPlaylist';
import useAuthStore from '../../context/authStore';
import './BookDetail.css';

const DEFAULT_COVER = 'https://via.placeholder.com/300x400/e0e0e0/666666?text=No+Cover';

const BookDetail = () => {
  const { id } = useParams();
  const { isAuthenticated } = useAuthStore();
  const { t } = useTranslation();
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  const { data: bookData, isLoading } = useBook(id);
  // Only check book status for authenticated users
  const { data: statusData } = useBookStatus(id, { enabled: isAuthenticated });
  const saveBook = useSaveBook();
  const removeBook = useRemoveBook();

  const book = bookData?.data;
  const isSaved = statusData?.data?.isSaved;

  const handleSaveToggle = () => {
    if (isSaved) {
      removeBook.mutate({ openLibraryId: id });
    } else {
      saveBook.mutate({ openLibraryId: id });
    }
  };

  if (isLoading) {
    return (
      <div className="book-detail__loading">
        <Loader size="lg" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="book-detail__not-found">
        <h2>Book Not Found</h2>
        <p>The book you're looking for doesn't exist.</p>
        <Link to="/books">
          <Button>
            <ArrowLeft size={18} />
            Back to Books
          </Button>
        </Link>
      </div>
    );
  }

  // Get authors list - can be array of objects or strings
  const authorsList = book.authors || [];
  const authorNames = authorsList.map(a => {
    if (typeof a === 'string') return a;
    return a?.name || a;
  }).filter(Boolean);
  
  // Open Library returns subjects as array of strings, not objects
  const categories = book.subjects || book.categories || [];
  
  // Normalize categories - handle both string arrays and object arrays
  const normalizedCategories = categories.map(cat => 
    typeof cat === 'string' ? cat : (cat?.name || cat)
  ).filter(Boolean);

  return (
    <div className="book-detail">
      <div className="book-detail__container">
        <Link to="/books" className="book-detail__back">
          <ArrowLeft size={18} />
          Back to Books
        </Link>

        <div className="book-detail__content">
          <div className="book-detail__cover">
            <img
              src={book.coverUrl || DEFAULT_COVER}
              alt={`Cover of ${book.title}`}
              onError={(e) => {
                e.target.src = DEFAULT_COVER;
              }}
            />
          </div>

          <div className="book-detail__info">
            <h1 className="book-detail__title">{book.title}</h1>
            
            <div className="book-detail__authors">
              <User size={18} />
              <div className="book-detail__authors-list">
                {authorNames.length > 0 ? (
                  authorNames.map((authorName, index) => (
                    <span key={index}>
                      <Link
                        to={`/books?author=${encodeURIComponent(authorName)}`}
                        className="book-detail__author-link"
                        title={t('books.viewAuthorBooks')}
                      >
                        {authorName}
                      </Link>
                      {index < authorNames.length - 1 && ', '}
                    </span>
                  ))
                ) : (
                  'Unknown Author'
                )}
              </div>
            </div>

            <div className="book-detail__meta">
              {book.publishYear && (
                <span className="book-detail__meta-item">
                  <Calendar size={16} />
                  {book.publishYear}
                </span>
              )}
              {book.language && (
                <span className="book-detail__meta-item">
                  <Globe size={16} />
                  {Array.isArray(book.language) ? book.language[0].toUpperCase() : book.language.toUpperCase()}
                </span>
              )}
              {book.pageCount && (
                <span className="book-detail__meta-item">
                  <BookOpen size={16} />
                  {book.pageCount} pages
                </span>
              )}
            </div>

            {normalizedCategories.length > 0 && (
              <div className="book-detail__categories">
                {normalizedCategories.slice(0, 5).map((cat, index) => (
                  <span key={index} className="book-detail__category">
                    {cat}
                  </span>
                ))}
              </div>
            )}

            {book.description && (
              <div className="book-detail__description">
                <h3>Description</h3>
                <p>{book.description}</p>
              </div>
            )}

            <div className="book-detail__actions">
              {/* Save to Library button - available for all authenticated users */}
              {isAuthenticated && (
                <>
                  <Button
                    variant={isSaved ? 'secondary' : 'primary'}
                    onClick={handleSaveToggle}
                    loading={saveBook.isPending || removeBook.isPending}
                  >
                    <Heart size={18} fill={isSaved ? 'currentColor' : 'none'} />
                    {isSaved ? t('books.saved') : t('books.save')}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowPlaylistModal(true)}
                  >
                    <Bookmark size={18} />
                    Додати до списку
                  </Button>
                </>
              )}

              {/* External links for Open Library */}
              <div className="book-detail__external-links">
                <a
                  href={`https://openlibrary.org/works/${id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="book-detail__external-link"
                >
                  <ExternalLink size={18} />
                  {t('books.viewOnOpenLibrary') || 'View on Open Library'}
                </a>
              </div>
            </div>

            {/* Add to Playlist Modal */}
            {showPlaylistModal && (
              <div className="book-detail__modal-overlay" onClick={() => setShowPlaylistModal(false)}>
                <div className="book-detail__modal-content" onClick={(e) => e.stopPropagation()}>
                  <AddToPlaylist
                    openLibraryId={id}
                    onClose={() => setShowPlaylistModal(false)}
                  />
                </div>
              </div>
            )}

            {book.isbn && (
              <p className="book-detail__isbn">
                <strong>ISBN:</strong> {book.isbn}
              </p>
            )}

            {book.publisher && (
              <p className="book-detail__publisher">
                <strong>Publisher:</strong> {Array.isArray(book.publisher) ? book.publisher[0] : book.publisher}
              </p>
            )}
          </div>
        </div>

        {/* Reviews Section */}
        <ReviewSection openLibraryId={id} />
      </div>
    </div>
  );
};

export default BookDetail;
