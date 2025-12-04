import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Calendar, BookOpen, Heart, Settings, LogOut } from 'lucide-react';
import { useUserStats } from '../../hooks/useLibrary';
import { Button, Loader } from '../../components/common';
import useAuthStore from '../../context/authStore';
import './Profile.css';

const Profile = () => {
  const { user, logout } = useAuthStore();
  const { data: statsData, isLoading: statsLoading } = useUserStats();

  const stats = statsData?.data || {};

  const handleLogout = () => {
    logout();
  };

  if (!user) {
    return (
      <div className="profile__loading">
        <Loader size="lg" />
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('uk-UA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="profile">
      <div className="profile__container">
        {}
        <div className="profile__header">
          <div className="profile__avatar">
            {user.avatar ? (
              <img src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />
            ) : (
              <div className="profile__avatar-placeholder">
                <User size={48} />
              </div>
            )}
          </div>
          <div className="profile__info">
            <h1 className="profile__name">
              {user.firstName} {user.lastName}
            </h1>
            <p className="profile__email">
              <Mail size={16} />
              {user.email}
            </p>
            <p className="profile__joined">
              <Calendar size={16} />
              Зареєстровано: {formatDate(user.createdAt)}
            </p>
            <span className={`profile__role profile__role--${user.role?.toLowerCase()}`}>
              {user.role === 'ADMIN' ? 'Адміністратор' : 'Користувач'}
            </span>
          </div>
          <div className="profile__actions">
            <Link to="/settings">
              <Button variant="secondary">
                <Settings size={18} />
                Налаштування
              </Button>
            </Link>
            <Button variant="danger" onClick={handleLogout}>
              <LogOut size={18} />
              Вийти
            </Button>
          </div>
        </div>

        {}
        <div className="profile__stats">
          <h2 className="profile__section-title">Статистика</h2>
          {statsLoading ? (
            <div className="profile__stats-loading">
              <Loader />
            </div>
          ) : (
            <div className="profile__stats-grid">
              <div className="profile__stat-card">
                <div className="profile__stat-icon profile__stat-icon--saved">
                  <Heart size={24} />
                </div>
                <div className="profile__stat-content">
                  <span className="profile__stat-value">{stats.savedBooks || 0}</span>
                  <span className="profile__stat-label">Збережених книг</span>
                </div>
              </div>
              <div className="profile__stat-card">
                <div className="profile__stat-icon profile__stat-icon--playlists">
                  <BookOpen size={24} />
                </div>
                <div className="profile__stat-content">
                  <span className="profile__stat-value">{stats.playlists || 0}</span>
                  <span className="profile__stat-label">Плейлистів</span>
                </div>
              </div>
              <div className="profile__stat-card">
                <div className="profile__stat-icon profile__stat-icon--reviews">
                  <Heart size={24} />
                </div>
                <div className="profile__stat-content">
                  <span className="profile__stat-value">{stats.reviews || 0}</span>
                  <span className="profile__stat-label">Відгуків</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {}
        <div className="profile__links">
          <h2 className="profile__section-title">Швидкі посилання</h2>
          <div className="profile__links-grid">
            <Link to="/library" className="profile__link-card">
              <Heart size={24} />
              <span>Моя бібліотека</span>
            </Link>
            <Link to="/books" className="profile__link-card">
              <BookOpen size={24} />
              <span>Каталог книг</span>
            </Link>
            <Link to="/settings" className="profile__link-card">
              <Settings size={24} />
              <span>Налаштування</span>
            </Link>
            {user.role === 'ADMIN' && (
              <Link to="/admin" className="profile__link-card profile__link-card--admin">
                <User size={24} />
                <span>Адмін панель</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

