import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Music, BookOpen } from 'lucide-react';
import { useUserPlaylists, useCreatePlaylist, useDeletePlaylist } from '../../hooks/usePlaylists';
import { Button, Loader, Input } from '../../components/common';
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
            <h1>My Playlists</h1>
            <p>Organize your favorite books into playlists</p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            <Plus size={18} />
            Create Playlist
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
            <Music size={64} />
            <h2>No playlists yet</h2>
            <p>Create your first playlist to organize your favorite books!</p>
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
  const deletePlaylist = useDeletePlaylist();

  const handleDelete = (e) => {
    e.preventDefault();
    if (window.confirm(`Are you sure you want to delete "${playlist.name}"?`)) {
      deletePlaylist.mutate(playlist.id);
    }
  };

  return (
    <Link to={`/playlists/${playlist.id}`} className="playlist-card">
      <div className="playlist-card__icon">
        <Music size={32} />
      </div>
      <div className="playlist-card__info">
        <h3 className="playlist-card__name">{playlist.name}</h3>
        {playlist.description && (
          <p className="playlist-card__description">{playlist.description}</p>
        )}
        <div className="playlist-card__meta">
          <span className="playlist-card__count">
            <BookOpen size={14} />
            {playlist.bookCount || 0} {playlist.bookCount === 1 ? 'book' : 'books'}
          </span>
          {playlist.isPublic && (
            <span className="playlist-card__badge">Public</span>
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
    </Link>
  );
};

const CreatePlaylistForm = ({ onSubmit, onCancel, isLoading }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a playlist name');
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
        <label htmlFor="playlist-name">Playlist Name *</label>
        <Input
          id="playlist-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Favorite Books"
          required
        />
      </div>
      <div className="create-playlist-form__field">
        <label htmlFor="playlist-description">Description</label>
        <textarea
          id="playlist-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description..."
          rows={3}
        />
      </div>
      <div className="create-playlist-form__field">
        <label className="create-playlist-form__checkbox">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          <span>Make this playlist public</span>
        </label>
      </div>
      <div className="create-playlist-form__actions">
        <Button type="submit" variant="primary" loading={isLoading}>
          Create Playlist
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default PlaylistsPage;

