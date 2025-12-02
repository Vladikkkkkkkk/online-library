import { useState } from 'react';
import { Bookmark, Plus } from 'lucide-react';
import { useUserPlaylists, useAddBookToPlaylist } from '../../hooks/usePlaylists';
import { Button, Loader } from '../common';
import './AddToPlaylist.css';

const AddToPlaylist = ({ openLibraryId, onClose }) => {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');
  const { data, isLoading } = useUserPlaylists();
  const addBook = useAddBookToPlaylist();

  const playlists = data?.data || [];

  const handleAdd = () => {
    if (!selectedPlaylistId) {
      alert('Please select a playlist');
      return;
    }
    addBook.mutate(
      { playlistId: selectedPlaylistId, openLibraryId },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="add-to-playlist__loading">
        <Loader />
      </div>
    );
  }

  return (
    <div className="add-to-playlist">
      <div className="add-to-playlist__header">
        <Bookmark size={24} />
        <h3>Додати до списку</h3>
      </div>

      {playlists.length === 0 ? (
        <div className="add-to-playlist__empty">
          <p>You don't have any playlists yet.</p>
          <Button variant="primary" onClick={() => (window.location.href = '/playlists')}>
            Create Playlist
          </Button>
        </div>
      ) : (
        <>
          <div className="add-to-playlist__list">
            {playlists.map((playlist) => (
              <label key={playlist.id} className="add-to-playlist__item">
                <input
                  type="radio"
                  name="playlist"
                  value={playlist.id}
                  checked={selectedPlaylistId === playlist.id}
                  onChange={(e) => setSelectedPlaylistId(e.target.value)}
                />
                <div className="add-to-playlist__item-info">
                  <span className="add-to-playlist__item-name">{playlist.name}</span>
                  <span className="add-to-playlist__item-count">
                    {playlist.bookCount || 0} books
                  </span>
                </div>
              </label>
            ))}
          </div>

          <div className="add-to-playlist__actions">
            <Button variant="primary" onClick={handleAdd} loading={addBook.isPending}>
              <Plus size={18} />
              Add to Playlist
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default AddToPlaylist;

