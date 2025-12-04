import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, User, Shield, Lock, Unlock } from 'lucide-react';
import { adminApi } from '../../api/admin';
import { Button, Loader } from '../../components/common';
import toast from 'react-hot-toast';
import './Admin.css';

const UsersManagement = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin', 'users', currentPage, searchQuery],
    queryFn: () => adminApi.getUsers({ 
      page: currentPage, 
      limit: 10,
      search: searchQuery || undefined 
    }),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => adminApi.updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'users']);
      toast.success('Роль користувача оновлено');
    },
    onError: () => {
      toast.error('Помилка оновлення ролі');
    },
  });

  const toggleBlockMutation = useMutation({
    mutationFn: ({ userId, isBlocked }) => adminApi.toggleUserBlock(userId, isBlocked),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['admin', 'users']);
      toast.success(variables.isBlocked ? 'Користувача заблоковано' : 'Користувача розблоковано');
    },
    onError: () => {
      toast.error('Помилка зміни статусу блокування');
    },
  });

  const users = usersData?.data || [];
  const pagination = usersData?.pagination || { totalPages: 1 };

  const handleRoleChange = (userId, currentRole, userName) => {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    if (window.confirm(`Змінити роль користувача "${userName}" на ${newRole}?`)) {
      updateRoleMutation.mutate({ userId, role: newRole });
    }
  };

  const handleToggleBlock = (userId, userName, isCurrentlyBlocked) => {
    const action = isCurrentlyBlocked ? 'розблокувати' : 'заблокувати';
    if (window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} користувача "${userName}"?`)) {
      toggleBlockMutation.mutate({ userId, isBlocked: !isCurrentlyBlocked });
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('uk-UA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="admin-users">
      <div className="admin-users__header">
        <h1 className="admin-users__title">Управління користувачами</h1>
        <span style={{ color: 'var(--color-text-muted)' }}>
          Всього: {usersData?.total || 0} користувачів
        </span>
      </div>

      {}
      <form onSubmit={handleSearch} className="admin-books__filters">
        <div className="admin-books__search">
          <Search size={18} className="admin-books__search-icon" />
          <input
            type="text"
            placeholder="Пошук за ім'ям або email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="admin-books__search-input"
          />
        </div>
        <Button type="submit" variant="secondary">
          Пошук
        </Button>
      </form>

      {}
      {isLoading ? (
        <div className="admin-loading">
          <Loader size="lg" />
        </div>
      ) : users.length === 0 ? (
        <div className="admin-empty">
          <User size={48} />
          <h2>Користувачів не знайдено</h2>
          <p>Спробуйте змінити параметри пошуку</p>
        </div>
      ) : (
        <>
          <div className="admin-table">
            <table>
              <thead>
                <tr>
                  <th>Користувач</th>
                  <th>Email</th>
                  <th>Роль</th>
                  <th>Статус</th>
                  <th>Зареєстровано</th>
                  <th>Збережено книг</th>
                  <th>Дії</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: 'var(--color-primary-light)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-primary)',
                          }}
                        >
                          <User size={20} />
                        </div>
                        <span style={{ fontWeight: 500 }}>
                          {user.firstName} {user.lastName}
                        </span>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`admin-user-role admin-user-role--${user.role?.toLowerCase()}`}>
                        {user.role === 'ADMIN' ? 'Адмін' : 'Користувач'}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-user-role ${user.isBlocked ? 'admin-user-role--blocked' : 'admin-user-role--active'}`}>
                        {user.isBlocked ? 'Заблоковано' : 'Активний'}
                      </span>
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>{user._count?.savedBooks || 0}</td>
                    <td>
                      <div className="admin-table__actions">
                        <button
                          className="admin-table__action"
                          title={user.role === 'ADMIN' ? 'Зняти права адміна' : 'Зробити адміном'}
                          onClick={() => handleRoleChange(user.id, user.role, `${user.firstName} ${user.lastName}`)}
                          disabled={toggleBlockMutation.isPending}
                        >
                          <Shield size={18} />
                        </button>
                        <button
                          className={`admin-table__action ${user.isBlocked ? 'admin-table__action--unblock' : 'admin-table__action--block'}`}
                          title={user.isBlocked ? 'Розблокувати' : 'Заблокувати'}
                          onClick={() => handleToggleBlock(user.id, `${user.firstName} ${user.lastName}`, user.isBlocked)}
                          disabled={toggleBlockMutation.isPending || user.role === 'ADMIN'}
                        >
                          {user.isBlocked ? <Unlock size={18} /> : <Lock size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {}
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

export default UsersManagement;

