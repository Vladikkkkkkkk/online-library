import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import './BookCard.css';

const DEFAULT_COVER = 'https://via.placeholder.com/200x300/e0e0e0/666666?text=No+Cover';

const BookCard = ({ book, onSave, onRemove, isSaved = false, showActions = true }) => {
  const {
    id,
    title,
    authors = [],
    coverUrl,
    publishYear,
    openLibraryId,
    source,
  } = book;

  // Determine book link based on source
  const bookLink = source === 'openlibrary' || openLibraryId
    ? `/books/${id || openLibraryId}?source=openlibrary`
    : `/books/${id}`;

  const authorNames = authors.map(a => a.name || a).join(', ');

  return (
    <article className="book-card">
      <Link to={bookLink} className="book-card__link">
        <div className="book-card__cover">
          <img 
            src={coverUrl || DEFAULT_COVER} 
            alt={`Cover of ${title}`}
            loading="lazy"
            onError={(e) => {
              e.target.src = DEFAULT_COVER;
            }}
          />
          {publishYear && (
            <span className="book-card__year">{publishYear}</span>
          )}
        </div>
        <div className="book-card__info">
          <h3 className="book-card__title">{title}</h3>
          {authorNames && (
            <p className="book-card__authors">{authorNames}</p>
          )}
        </div>
      </Link>
      
      {showActions && (
        <div className="book-card__actions">
          {onSave && (
            <button 
              className={`book-card__btn ${isSaved ? 'book-card__btn--active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                onSave(id || openLibraryId);
              }}
              aria-label={isSaved ? 'Remove from library' : 'Save to library'}
            >
              <Heart size={18} fill={isSaved ? 'currentColor' : 'none'} />
            </button>
          )}
          {onRemove && (
            <button 
              className="book-card__btn book-card__btn--danger"
              onClick={(e) => {
                e.preventDefault();
                onRemove(id || openLibraryId, title, source || 'local');
              }}
              aria-label="Remove from library"
            >
              <Heart size={18} fill="currentColor" />
            </button>
          )}
        </div>
      )}
    </article>
  );
};

export default BookCard;

