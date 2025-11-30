import { Link } from 'react-router-dom';
import { Users, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';
import { Loader } from '../../components/common';
import './Admin.css';

const Dashboard = () => {
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.getStats(),
    staleTime: 5 * 60 * 1000,
  });

  const stats = statsData?.data || {};

  if (isLoading) {
    return (
      <div className="admin-loading">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard__header">
        <div>
          <h1 className="admin-dashboard__title">Панель адміністратора</h1>
          <p className="admin-dashboard__subtitle">Огляд системи та управління контентом</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-card__icon admin-stat-card__icon--users">
            <Users size={24} />
          </div>
          <div className="admin-stat-card__content">
            <span className="admin-stat-card__value">{stats.totalUsers || 0}</span>
            <span className="admin-stat-card__label">Користувачів</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-card__icon admin-stat-card__icon--categories">
            <TrendingUp size={24} />
          </div>
          <div className="admin-stat-card__content">
            <span className="admin-stat-card__value">{stats.totalCategories || 0}</span>
            <span className="admin-stat-card__label">Категорій</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="admin-section">
        <h2 className="admin-section__title">Швидкі дії</h2>
        <div className="admin-quick-actions">
          <Link to="/admin/users" className="admin-quick-action">
            <Users size={24} />
            <span>Управління користувачами</span>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="admin-section">
        <h2 className="admin-section__title">Остання активність</h2>
        <div className="admin-activity">
          {stats.recentActivity?.length > 0 ? (
            <div className="admin-activity__list">
              {stats.recentActivity.map((activity, index) => (
                <div key={index} className="admin-activity__item">
                  <span className="admin-activity__text">{activity.text}</span>
                  <span className="admin-activity__time">{activity.time}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="admin-activity__empty">Немає останньої активності</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

