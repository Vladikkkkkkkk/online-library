import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit2, Trash2, Eye, Upload } from 'lucide-react';
import { adminApi } from '../../api/admin';
import { booksApi } from '../../api/books';
import { Button, Loader } from '../../components/common';
import toast from 'react-hot-toast';
import './Admin.css';

const DEFAULT_COVER = 'https://via.placeholder.com/40x56/e0e0e0/666666?text=No';

const BooksManagement = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();

  const { data: booksData, isLoading } = useQuery({
    queryKey: ['admin', 'books', currentPage, searchQuery],
    queryFn: () => booksApi.getBooks({ 
      page: currentPage, 
      limit: 10,
      q: searchQuery || undefined 
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: (bookId) => adminApi.deleteBook(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'books']);
      toast.success('Книгу видалено');
    },
    onError: () => {
      toast.error('Помилка видалення книги');
    },
  });

  const books = booksData?.data || [];
  const pagination = booksData?.pagination || { totalPages: 1 };

  const handleDelete = (bookId, bookTitle) => {
    if (window.confirm(`Видалити книгу "${bookTitle}"?`)) {
      deleteMutation.mutate(bookId);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  return (
    <div className="admin-books">
      <div className="admin-books__header">
        <h1 className="admin-books__title">Управління книгами</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to="/admin/books/import">
            <Button variant="secondary">
              <Upload size={18} />
              Імпорт
            </Button>
          </Link>
          <Link to="/admin/books/new">
            <Button>
              <Plus size={18} />
              Додати книгу
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="admin-books__filters">
        <div className="admin-books__search">
          <Search size={18} className="admin-books__search-icon" />
          <input
            type="text"
            placeholder="Пошук за назвою, автором, ISBN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="admin-books__search-input"
          />
        </div>
        <Button type="submit" variant="secondary">
          Пошук
        </Button>
      </form>

      {/* Table */}
      {isLoading ? (
        <div className="admin-loading">
          <Loader size="lg" />
        </div>
      ) : books.length === 0 ? (
        <div className="admin-empty">
          <Search size={48} />
          <h2>Книги не знайдено</h2>
          <p>Спробуйте змінити параметри пошуку або додайте нову книгу</p>
          <Link to="/admin/books/new">
            <Button>
              <Plus size={18} />
              Додати книгу
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="admin-table">
            <table>
              <thead>
                <tr>
                  <th>Книга</th>
                  <th>ISBN</th>
                  <th>Рік</th>
                  <th>Мова</th>
                  <th>Статус</th>
                  <th>Дії</th>
                </tr>
              </thead>
              <tbody>
                {books.map((book) => (
                  <tr key={book.id}>
                    <td>
                      <div className="admin-table__book">
                        <img
                          src={book.coverUrl || DEFAULT_COVER}
                          alt={book.title}
                          className="admin-table__book-cover"
                          onError={(e) => {
                            e.target.src = DEFAULT_COVER;
                          }}
                        />
                        <div>
                          <div className="admin-table__book-title">{book.title}</div>
                          <div className="admin-table__book-authors">
                            {book.authors?.map((a) => a.name).join(', ') || 'Невідомий автор'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{book.isbn || '—'}</td>
                    <td>{book.publishYear || '—'}</td>
                    <td>{book.language?.toUpperCase() || '—'}</td>
                    <td>
                      <span className={`admin-user-role admin-user-role--${book.status?.toLowerCase() || 'available'}`}>
                        {book.status || 'Available'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-table__actions">
                        <Link to={`/books/${book.id}`}>
                          <button className="admin-table__action" title="Переглянути">
                            <Eye size={18} />
                          </button>
                        </Link>
                        <Link to={`/admin/books/${book.id}/edit`}>
                          <button className="admin-table__action" title="Редагувати">
                            <Edit2 size={18} />
                          </button>
                        </Link>
                        <button
                          className="admin-table__action admin-table__action--delete"
                          title="Видалити"
                          onClick={() => handleDelete(book.id, book.title)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="admin-pagination">
              <button
                className="admin-pagination__btn"
                onClick={() => setCurrentPage((p) => p - 1)}
                disabled={currentPage === 1}
              >
                Попередня
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === pagination.totalPages ||
                    Math.abs(p - currentPage) <= 1
                )
                .map((pageNum, idx, arr) => (
                  <>
                    {idx > 0 && arr[idx - 1] !== pageNum - 1 && (
                      <span key={`ellipsis-${pageNum}`}>...</span>
                    )}
                    <button
                      key={pageNum}
                      className={`admin-pagination__btn ${
                        currentPage === pageNum ? 'admin-pagination__btn--active' : ''
                      }`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  </>
                ))}
              <button
                className="admin-pagination__btn"
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={currentPage === pagination.totalPages}
              >
                Наступна
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BooksManagement;

