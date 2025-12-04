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
    isbn,
    publisher,
    publishers,
    numberOfPages,
    pageCount,
    language,
    languages,
  } = book;


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
          {(publishYear || language || languages || numberOfPages || pageCount || publisher || publishers || isbn) && (
            <div className="book-card__meta">
              {publishYear && (
                <span className="book-card__meta-item">{publishYear}</span>
              )}
              {(language || (languages && languages.length > 0)) && (
                <span className="book-card__meta-item">
                  {(typeof language === 'string' 
                    ? (language.length === 2 
                        ? language.toUpperCase() 
                        : language.replace(/^\/languages\//, '').toUpperCase())
                    : (languages && languages.length > 0
                        ? (languages[0].length === 2 ? languages[0].toUpperCase() : languages[0].substring(0, 3).toUpperCase())
                        : null))}
                </span>
              )}
              {(numberOfPages || pageCount) && (
                <span className="book-card__meta-item">{(numberOfPages || pageCount)} стор.</span>
              )}
              {(publisher || (publishers && publishers.length > 0)) && (
                <span 
                  className="book-card__meta-item book-card__meta-item--truncate" 
                  title={typeof publisher === 'string' ? publisher : (publishers && publishers[0] ? publishers[0] : publisher?.[0])}
                >
                  {(() => {
                    const pub = publisher || (publishers && publishers[0]) || '';
                    return typeof pub === 'string' ? (pub.length > 15 ? pub.substring(0, 15) + '...' : pub) : (pub[0]?.length > 15 ? pub[0].substring(0, 15) + '...' : pub[0]);
                  })()}
                </span>
              )}
              {isbn && (
                <span className="book-card__meta-item" title={`ISBN: ${isbn}`}>ISBN</span>
              )}
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

