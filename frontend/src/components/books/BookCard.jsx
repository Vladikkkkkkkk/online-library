import { Link } from 'react-router-dom';
import { Heart, Star } from 'lucide-react';
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
    subjects = [],
    categories = [],
    averageRating,
    ratingCount,
  } = book;

  // All books are now from Open Library, use openLibraryId or id
  const bookLink = `/books/${openLibraryId || id}`;

  const authorNames = authors.map(a => a.name || a).join(', ');
  const bookCategories = subjects.length > 0 ? subjects : (categories || []);

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
          {averageRating && (
            <div className="book-card__rating">
              <div className="book-card__stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={14}
                    fill={star <= Math.round(averageRating) ? '#fbbf24' : 'none'}
                    stroke={star <= Math.round(averageRating) ? '#fbbf24' : '#d1d5db'}
                    className="book-card__star"
                  />
                ))}
              </div>
              <span className="book-card__rating-value">{averageRating.toFixed(1)}</span>
              {ratingCount > 0 && (
                <span className="book-card__rating-count">({ratingCount})</span>
              )}
            </div>
          )}
          {bookCategories.length > 0 && (
            <div className="book-card__categories">
              {bookCategories.slice(0, 2).map((cat, idx) => (
                <span key={idx} className="book-card__category">
                  {typeof cat === 'string' ? cat : (cat?.name || cat)}
                </span>
              ))}
            </div>
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
                onRemove(openLibraryId || id, title);
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

