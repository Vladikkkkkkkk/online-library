import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Search, Download, Check, BookOpen } from 'lucide-react';
import { adminApi } from '../../api/admin';
import { booksApi } from '../../api/books';
import { categoriesApi } from '../../api/categories';
import { Button, Input, Loader } from '../../components/common';
import toast from 'react-hot-toast';
import './Admin.css';

const DEFAULT_COVER = 'https://via.placeholder.com/100x140/e0e0e0/666666?text=No+Cover';

const ImportBooks = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getCategories(),
  });

  const categories = categoriesData?.data || [];

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await booksApi.searchBooks({
        q: searchQuery,
        source: 'openlibrary',
        limit: 10,
      });
      setSearchResults(response.data?.openLibrary?.data || []);
    } catch (error) {
      toast.error('Помилка пошуку');
    } finally {
      setIsSearching(false);
    }
  };

  const importMutation = useMutation({
    mutationFn: (data) => adminApi.importBook(data.openLibraryId, data.categoryIds),
    onSuccess: () => {
      toast.success('Книгу імпортовано успішно!');
      navigate('/admin/books');
    },
    onError: (error) => {
      toast.error(error.message || 'Помилка імпорту книги');
    },
  });

  const handleImport = () => {
    if (!selectedBook) return;
    importMutation.mutate({
      openLibraryId: selectedBook.openLibraryId,
      categoryIds: selectedCategories,
    });
  };

  const handleCategoryToggle = (categoryId) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <div className="admin-books" style={{ maxWidth: '1000px' }}>
      <Link to="/admin/books" className="settings__back">
        <ArrowLeft size={18} />
        Назад до списку книг
      </Link>

      <h1 className="admin-books__title" style={{ marginBottom: '0.5rem' }}>
        Імпорт з Open Library
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
        Знайдіть та імпортуйте книги з каталогу Open Library (понад 20 мільйонів книг)
      </p>

      {}
      <form onSubmit={handleSearch} className="admin-books__filters">
        <div className="admin-books__search">
          <Search size={18} className="admin-books__search-icon" />
          <input
            type="text"
            placeholder="Введіть назву книги або автора..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="admin-books__search-input"
          />
        </div>
        <Button type="submit" loading={isSearching}>
          Пошук
        </Button>
      </form>

      {}
      {isSearching ? (
        <div className="admin-loading">
          <Loader size="lg" />
        </div>
      ) : searchResults.length > 0 ? (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Результати пошуку:</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {searchResults.map((book) => (
              <div
                key={book.openLibraryId}
                onClick={() => setSelectedBook(book)}
                style={{
                  display: 'flex',
                  gap: '1rem',
                  padding: '1rem',
                  background:
                    selectedBook?.openLibraryId === book.openLibraryId
                      ? 'var(--color-primary-light)'
                      : 'var(--color-surface)',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  border:
                    selectedBook?.openLibraryId === book.openLibraryId
                      ? '2px solid var(--color-primary)'
                      : '2px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                <img
                  src={book.coverUrl || DEFAULT_COVER}
                  alt={book.title}
                  style={{
                    width: 80,
                    height: 112,
                    objectFit: 'cover',
                    borderRadius: 'var(--radius-sm)',
                  }}
                  onError={(e) => {
                    e.target.src = DEFAULT_COVER;
                  }}
                />
                <div style={{ flex: 1 }}>
                  <h4 style={{ marginBottom: '0.25rem' }}>{book.title}</h4>
                  <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                    {book.authors?.join(', ') || 'Невідомий автор'}
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    {book.publishYear && <span>📅 {book.publishYear}</span>}
                    {book.pageCount && <span>📄 {book.pageCount} стор.</span>}
                    {book.languages?.[0] && <span>🌍 {book.languages[0].toUpperCase()}</span>}
                  </div>
                </div>
                {selectedBook?.openLibraryId === book.openLibraryId && (
                  <div style={{ alignSelf: 'center', color: 'var(--color-primary)' }}>
                    <Check size={24} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : searchQuery && !isSearching ? (
        <div className="admin-empty">
          <BookOpen size={48} />
          <h2>Нічого не знайдено</h2>
          <p>Спробуйте інший пошуковий запит</p>
        </div>
      ) : null}

      {}
      {selectedBook && (
        <div className="settings__panel">
          <h3 style={{ marginBottom: '1rem' }}>Імпортувати: {selectedBook.title}</h3>

          <div className="settings__form-group">
            <label>Виберіть категорії:</label>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                marginTop: '0.5rem',
              }}
            >
              {categories.map((category) => (
                <label
                  key={category.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: selectedCategories.includes(category.id)
                      ? 'var(--color-primary)'
                      : 'var(--color-surface-hover)',
                    color: selectedCategories.includes(category.id)
                      ? 'white'
                      : 'var(--color-text)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.id)}
                    onChange={() => handleCategoryToggle(category.id)}
                    style={{ display: 'none' }}
                  />
                  {category.nameUk || category.name}
                </label>
              ))}
            </div>
          </div>

          <Button
            onClick={handleImport}
            loading={importMutation.isPending}
            style={{ marginTop: '1rem' }}
          >
            <Download size={18} />
            Імпортувати книгу
          </Button>
        </div>
      )}
    </div>
  );
};

export default ImportBooks;

