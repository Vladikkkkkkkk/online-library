import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Heart, BookOpen, Calendar, Globe, User, ExternalLink, Eye } from 'lucide-react';
import { useBook } from '../../hooks';
import { useBookStatus, useSaveBook, useRemoveBook } from '../../hooks/useLibrary';
import { Button, Loader } from '../../components/common';
import useAuthStore from '../../context/authStore';
import './BookDetail.css';

const DEFAULT_COVER = 'https://via.placeholder.com/300x400/e0e0e0/666666?text=No+Cover';

const BookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const source = searchParams.get('source') || 'local';
  const { isAuthenticated } = useAuthStore();
  const { t } = useTranslation();

  const { data: bookData, isLoading } = useBook(id, source);
  const { data: statusData } = useBookStatus(id, source);
  const saveBook = useSaveBook();
  const removeBook = useRemoveBook();

  const book = bookData?.data;
  const isSaved = statusData?.data?.isSaved;

  const handleSaveToggle = () => {
    if (isSaved) {
      removeBook.mutate({ bookId: id, source });
    } else {
      saveBook.mutate({ bookId: id, source });
    }
  };

  const handleRead = () => {
    navigate(`/books/${id}/read${source === 'openlibrary' ? '?source=openlibrary' : ''}`);
  };

  // Check if book can be read (has PDF file)
  const pdfLink = source === 'openlibrary' 
    ? book?.downloadLinks?.find(link => link.format === 'PDF')
    : null;
  const canRead = book?.fileUrl || (source === 'openlibrary' && pdfLink?.url);

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

  const authors = book.authors?.map(a => a.name || a).join(', ') || 'Unknown Author';
  const categories = book.categories || book.subjects || [];

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
            
            <p className="book-detail__authors">
              <User size={18} />
              {authors}
            </p>

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
                  {book.language.toUpperCase()}
                </span>
              )}
              {book.pageCount && (
                <span className="book-detail__meta-item">
                  <BookOpen size={16} />
                  {book.pageCount} pages
                </span>
              )}
            </div>

            {categories.length > 0 && (
              <div className="book-detail__categories">
                {categories.slice(0, 5).map((cat, index) => (
                  <span key={index} className="book-detail__category">
                    {cat.name || cat}
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
              {/* Read button - available for all users if PDF is available */}
              {canRead && (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleRead}
                >
                  <Eye size={18} />
                  {t('books.readOnline')}
                </Button>
              )}

              {/* Save to Library button - available for all authenticated users */}
              {isAuthenticated && (
                <Button
                  variant={isSaved ? 'secondary' : 'primary'}
                  onClick={handleSaveToggle}
                  loading={saveBook.isPending || removeBook.isPending}
                >
                  <Heart size={18} fill={isSaved ? 'currentColor' : 'none'} />
                  {isSaved ? t('books.saved') : t('books.save')}
                </Button>
              )}

              {/* External links for Open Library books */}
              {source === 'openlibrary' && (
                <div className="book-detail__external-links">
                  {/* Read Online on Archive.org if available */}
                  {book.downloadLinks?.find(link => link.format === 'Read Online') && (
                    <a
                      href={book.downloadLinks.find(link => link.format === 'Read Online').url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="book-detail__external-link"
                    >
                      <BookOpen size={18} />
                      {t('books.readOnArchive')}
                    </a>
                  )}

                  {/* View on Open Library */}
                  <a
                    href={`https://openlibrary.org/works/${id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="book-detail__external-link"
                  >
                    <ExternalLink size={18} />
                    {t('books.viewOnOpenLibrary')}
                  </a>
                </div>
              )}
            </div>

            {book.isbn && (
              <p className="book-detail__isbn">
                <strong>ISBN:</strong> {book.isbn}
              </p>
            )}

            {book.publisher && (
              <p className="book-detail__publisher">
                <strong>Publisher:</strong> {book.publisher}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetail;

