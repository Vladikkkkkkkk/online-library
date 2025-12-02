import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Bookmark, Plus, Trash2, Edit2 } from 'lucide-react';
import { usePlaylist, useAddBookToPlaylist, useRemoveBookFromPlaylist, useUpdatePlaylist, useDeletePlaylist } from '../../hooks/usePlaylists';
import { BookGrid } from '../../components/books';
import { Button, Loader } from '../../components/common';
import useAuthStore from '../../context/authStore';
import './PlaylistDetail.css';

const PlaylistDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [page, setPage] = useState(1);
  const limit = 12;
  const { data, isLoading } = usePlaylist(id, { page, limit });
  const removeBook = useRemoveBookFromPlaylist();
  const updatePlaylist = useUpdatePlaylist();
  const deletePlaylist = useDeletePlaylist();

  const playlist = data?.data;

  const isOwner = playlist?.user?.id === user?.id;

  const handleRemoveBook = (openLibraryId) => {
    removeBook.mutate({ playlistId: id, openLibraryId });
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${playlist?.name}"?`)) {
      deletePlaylist.mutate(id, {
        onSuccess: () => {
          navigate('/playlists');
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="playlist-detail__loading">
        <Loader size="lg" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="playlist-detail__not-found">
        <h2>Playlist not found</h2>
        <Link to="/playlists">
          <Button>
            <ArrowLeft size={18} />
            Back to Playlists
          </Button>
        </Link>
      </div>
    );
  }

  const books = playlist.books
    ?.filter(pb => pb.book && pb.book.title && pb.book.title !== 'Book not available')
    .map((pb) => ({
      ...pb.book,
      id: pb.openLibraryId || pb.book?.id,
      openLibraryId: pb.openLibraryId || pb.book?.id,
    })) || [];
  
  const pagination = playlist?.pagination || {};
  const totalBooks = pagination?.totalItems || books.length;

  return (
    <div className="playlist-detail">
      <div className="playlist-detail__container">
        <Link to="/playlists" className="playlist-detail__back">
          <ArrowLeft size={18} />
          Back to Playlists
        </Link>

        <div className="playlist-detail__header">
          <div className="playlist-detail__icon">
            <Bookmark size={48} />
          </div>
          <div className="playlist-detail__info">
            <h1 className="playlist-detail__name">{playlist.name}</h1>
            {playlist.description && (
              <p className="playlist-detail__description">{playlist.description}</p>
            )}
            <div className="playlist-detail__meta">
              <span>{totalBooks} {totalBooks === 1 ? 'book' : 'books'}</span>
              {playlist.isPublic && (
                <span className="playlist-detail__badge">Public</span>
              )}
              <span className="playlist-detail__author">
                by {playlist.user?.firstName} {playlist.user?.lastName}
              </span>
            </div>
          </div>
          {isOwner && (
            <div className="playlist-detail__actions">
              <Button variant="secondary" onClick={handleDelete}>
                <Trash2 size={18} />
                Delete
              </Button>
            </div>
          )}
        </div>

        {books.length === 0 ? (
          <div className="playlist-detail__empty">
            <Bookmark size={64} />
            <h2>Цей список порожній</h2>
            <p>Додайте книги, щоб почати!</p>
          </div>
        ) : (
          <>
            <div className="playlist-detail__books">
              <BookGrid
                books={books}
                onRemove={isOwner ? handleRemoveBook : undefined}
                showActions={isOwner}
              />
            </div>
            
            {/* Pagination */}
            {totalBooks > limit && (
              <div className="playlist-detail__pagination">
                <Button
                  variant="secondary"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  {t('common.previous')}
                </Button>
                <span className="playlist-detail__page-info">
                  {t('common.page')} {page} {t('common.of')} {pagination.totalPages || Math.ceil(totalBooks / limit)}
                </span>
                <Button
                  variant="secondary"
                  disabled={books.length < limit || page * limit >= totalBooks}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t('common.next')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PlaylistDetail;

