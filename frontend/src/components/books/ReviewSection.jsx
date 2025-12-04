import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star, Edit2, Trash2, User } from 'lucide-react';
import { useBookReviews, useUserReview, useCreateOrUpdateReview, useDeleteReview } from '../../hooks/useReviews';
import { Button, Loader } from '../common';
import useAuthStore from '../../context/authStore';
import './ReviewSection.css';

const ReviewSection = ({ openLibraryId }) => {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState(null);

  const { data: reviewsData, isLoading } = useBookReviews(openLibraryId);

  const { data: userReviewData } = useUserReview(openLibraryId, { enabled: isAuthenticated });
  const createOrUpdateReview = useCreateOrUpdateReview();
  const deleteReview = useDeleteReview();

  const reviews = reviewsData?.reviews || [];
  const stats = reviewsData?.stats || {};
  const userReview = userReviewData?.data;

  const handleEdit = () => {
    setEditingReview(userReview);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (window.confirm(t('books.deleteReviewConfirm'))) {
      deleteReview.mutate(openLibraryId);
    }
  };

  const handleSubmit = (reviewData) => {
    createOrUpdateReview.mutate(
      { openLibraryId, data: reviewData },
      {
        onSuccess: () => {
          setShowForm(false);
          setEditingReview(null);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="review-section__loading">
        <Loader />
      </div>
    );
  }

  return (
    <div className="review-section">
      <div className="review-section__header">
        <h2>{t('books.reviewsAndRatings')}</h2>
        {stats.averageRating && stats.ratingCount > 0 ? (
          <div className="review-section__stats">
            <div className="review-section__rating">
              <Star size={24} fill="currentColor" />
              <span className="review-section__rating-value">
                {stats.averageRating.toFixed(1)}
              </span>
              <span className="review-section__rating-count">
                ({stats.ratingCount} {stats.ratingCount === 1 ? t('books.rating') : t('books.ratings')})
              </span>
            </div>
          </div>
        ) : (
          <div className="review-section__stats">
            <div className="review-section__rating">
              <Star size={24} fill="none" stroke="currentColor" />
              <span className="review-section__rating-value">{t('books.noRatingsYet')}</span>
            </div>
          </div>
        )}
      </div>

      {}
      {isAuthenticated && (
        <div className="review-section__user-review">
          {userReview ? (
            <div className="review-item review-item--own">
              <div className="review-item__header">
                <div className="review-item__user">
                  <User size={20} />
                  <span>{user?.firstName || t('books.you')}</span>
                </div>
                <div className="review-item__rating">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      fill={i < userReview.rating ? 'currentColor' : 'none'}
                    />
                  ))}
                </div>
                <div className="review-item__actions">
                  <button onClick={handleEdit} className="review-item__action">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={handleDelete} className="review-item__action review-item__action--danger">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {userReview.title && (
                <h4 className="review-item__title">{userReview.title}</h4>
              )}
              {userReview.comment && (
                <p className="review-item__comment">{userReview.comment}</p>
              )}
            </div>
          ) : (
            !showForm && (
              <Button onClick={() => setShowForm(true)} variant="primary">
                {t('books.writeReview')}
              </Button>
            )
          )}

          {showForm && (
            <ReviewForm
              review={editingReview}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingReview(null);
              }}
              isLoading={createOrUpdateReview.isPending}
            />
          )}
        </div>
      )}

      {}
      {reviews.length > 0 && (
        <div className="review-section__reviews">
          <h3>{t('books.allReviews')} ({reviews.length})</h3>
          {reviews
            .filter((r) => !userReview || r.id !== userReview.id)
            .map((review) => (
              <div key={review.id} className="review-item">
                <div className="review-item__header">
                  <div className="review-item__user">
                    <User size={20} />
                    <span>
                      {review.user?.firstName} {review.user?.lastName}
                    </span>
                  </div>
                  <div className="review-item__rating">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        fill={i < review.rating ? 'currentColor' : 'none'}
                      />
                    ))}
                  </div>
                  <div className="review-item__date">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </div>
                </div>
                {review.title && (
                  <h4 className="review-item__title">{review.title}</h4>
                )}
                {review.comment && (
                  <p className="review-item__comment">{review.comment}</p>
                )}
              </div>
            ))}
        </div>
      )}

      {reviews.length === 0 && !isAuthenticated && (
        <div className="review-section__empty">
          <p>{t('books.noReviewsYet')}</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            <Link to="/login" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
              {t('books.signIn')}
            </Link> {t('books.signInToReview')}
          </p>
        </div>
      )}

      {reviews.length === 0 && isAuthenticated && !showForm && stats.averageRating && (
        <div className="review-section__empty">
          <p>{t('books.noWrittenReviews')}</p>
        </div>
      )}
    </div>
  );
};

const ReviewForm = ({ review, onSubmit, onCancel, isLoading }) => {
  const { t } = useTranslation();
  const [rating, setRating] = useState(review?.rating || 0);
  const [title, setTitle] = useState(review?.title || '');
  const [comment, setComment] = useState(review?.comment || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rating === 0) {
      alert(t('books.selectRating'));
      return;
    }
    onSubmit({ rating, title: title.trim() || null, comment: comment.trim() || null });
  };

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <div className="review-form__rating">
        <label>{t('books.reviewRating')}</label>
        <div className="review-form__stars">
          {Array.from({ length: 5 }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRating(i + 1)}
              className={`review-form__star ${i < rating ? 'review-form__star--filled' : ''}`}
            >
              <Star size={24} fill={i < rating ? 'currentColor' : 'none'} />
            </button>
          ))}
        </div>
      </div>

      <div className="review-form__field">
        <label htmlFor="review-title">{t('books.reviewTitle')}</label>
        <input
          id="review-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('books.reviewTitlePlaceholder')}
          maxLength={100}
        />
      </div>

      <div className="review-form__field">
        <label htmlFor="review-comment">{t('books.reviewComment')}</label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t('books.reviewCommentPlaceholder')}
          rows={5}
          maxLength={1000}
        />
        <span className="review-form__char-count">{comment.length}/1000</span>
      </div>

      <div className="review-form__actions">
        <Button type="submit" variant="primary" loading={isLoading}>
          {review ? t('books.updateReview') : t('books.submitReview')}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
};

export default ReviewSection;

