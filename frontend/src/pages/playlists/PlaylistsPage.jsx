import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, BookOpen, Bookmark } from 'lucide-react';
import { useUserPlaylists, useCreatePlaylist, useDeletePlaylist } from '../../hooks/usePlaylists';
import { Button, Loader, Input, ConfirmModal } from '../../components/common';
import './PlaylistsPage.css';

const PlaylistsPage = () => {
  const { t } = useTranslation();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { data, isLoading } = useUserPlaylists();
  const createPlaylist = useCreatePlaylist();
  const deletePlaylist = useDeletePlaylist();

  const playlists = data?.data || [];

  const handleCreate = (playlistData) => {
    createPlaylist.mutate(playlistData, {
      onSuccess: () => {
        setShowCreateForm(false);
      },
    });
  };

  return (
    <div className="playlists-page">
      <div className="playlists-page__container">
        <div className="playlists-page__header">
          <div>
            <h1>{t('booklists.title')}</h1>
            <p>{t('booklists.description')}</p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            <Plus size={18} />
            {t('booklists.createPlaylist')}
          </Button>
        </div>

        {showCreateForm && (
          <CreatePlaylistForm
            onSubmit={handleCreate}
            onCancel={() => setShowCreateForm(false)}
            isLoading={createPlaylist.isPending}
          />
        )}

        {isLoading ? (
          <div className="playlists-page__loading">
            <Loader size="lg" />
          </div>
        ) : playlists.length === 0 ? (
          <div className="playlists-page__empty">
            <Bookmark size={64} />
            <h2>{t('booklists.empty')}</h2>
            <p>{t('booklists.emptyDesc')}</p>
          </div>
        ) : (
          <div className="playlists-page__grid">
            {playlists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const PlaylistCard = ({ playlist }) => {
  const { t } = useTranslation();
  const deletePlaylist = useDeletePlaylist();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDelete = (e) => {
    e.preventDefault();
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    deletePlaylist.mutate(playlist.id);
  };

  return (
    <Link to={`/playlists/${playlist.id}`} className="playlist-card">
      <div className="playlist-card__icon">
        <Bookmark size={32} />
      </div>
      <div className="playlist-card__info">
        <h3 className="playlist-card__name">{playlist.name}</h3>
        {playlist.description && (
          <p className="playlist-card__description">{playlist.description}</p>
        )}
        <div className="playlist-card__meta">
          <span className="playlist-card__count">
            <BookOpen size={14} />
            {playlist.bookCount || 0} {playlist.bookCount === 1 ? t('booklists.book') : t('booklists.books')}
          </span>
          {playlist.isPublic && (
            <span className="playlist-card__badge">{t('booklists.public')}</span>
          )}
        </div>
      </div>
      <button
        className="playlist-card__delete"
        onClick={handleDelete}
        aria-label="Delete playlist"
      >
        ×
      </button>
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title={t('booklists.deleteTitle') || 'Видалити плейлист?'}
        message={t('booklists.deleteConfirm', { name: playlist.name }) || `Ви впевнені, що хочете видалити плейлист "${playlist.name}"?`}
        confirmText={t('common.delete') || 'Видалити'}
        cancelText={t('common.cancel') || 'Скасувати'}
        variant="danger"
      />
    </Link>
  );
};

const CreatePlaylistForm = ({ onSubmit, onCancel, isLoading }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      return;
    }
    onSubmit({ name: name.trim(), description: description.trim() || null, isPublic });
    setName('');
    setDescription('');
    setIsPublic(false);
  };

  return (
    <form className="create-playlist-form" onSubmit={handleSubmit}>
      <div className="create-playlist-form__field">
        <label htmlFor="playlist-name">{t('booklists.playlistName')}</label>
        <Input
          id="playlist-name"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 100))}
          placeholder={t('booklists.playlistNamePlaceholder')}
          required
          maxLength={100}
        />
      </div>
      <div className="create-playlist-form__field">
        <label htmlFor="playlist-description">{t('booklists.playlistDescription')}</label>
        <textarea
          id="playlist-description"
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 500))}
          placeholder={t('booklists.playlistDescriptionPlaceholder')}
          rows={3}
          maxLength={500}
        />
      </div>
      <div className="create-playlist-form__field">
        <label className="create-playlist-form__checkbox">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          <span>{t('booklists.makePublic')}</span>
        </label>
      </div>
      <div className="create-playlist-form__actions">
        <Button type="submit" variant="primary" loading={isLoading}>
          {t('booklists.createPlaylist')}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
};

export default PlaylistsPage;

