import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ArrowLeft, User, Lock, Check, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Input } from '../../components/common';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import './Settings.css';

const Settings = () => {
  const { user, updateProfile, changePassword, isLoading } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');

  // Profile form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
    },
  });

  // Password form
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
    watch,
  } = useForm();

  const newPassword = watch('newPassword');

  const onProfileSubmit = async (data) => {
    const result = await updateProfile(data);
    if (result.success) {
      toast.success('Профіль оновлено успішно!');
    } else {
      toast.error(result.error || 'Помилка оновлення профілю');
    }
  };

  const onPasswordSubmit = async (data) => {
    const result = await changePassword(data.currentPassword, data.newPassword);
    if (result.success) {
      toast.success('Пароль змінено успішно!');
      resetPassword();
    } else {
      toast.error(result.error || 'Помилка зміни пароля');
    }
  };

  return (
    <div className="settings">
      <div className="settings__container">
        <Link to="/profile" className="settings__back">
          <ArrowLeft size={18} />
          Назад до профілю
        </Link>

        <h1 className="settings__title">Налаштування</h1>

        {/* Tabs */}
        <div className="settings__tabs">
          <button
            className={`settings__tab ${activeTab === 'profile' ? 'settings__tab--active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={18} />
            Профіль
          </button>
          <button
            className={`settings__tab ${activeTab === 'security' ? 'settings__tab--active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <Lock size={18} />
            Безпека
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="settings__panel">
            <h2 className="settings__panel-title">Редагування профілю</h2>
            <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="settings__form">
              <div className="settings__form-row">
                <div className="settings__form-group">
                  <label htmlFor="firstName">Ім'я</label>
                  <Input
                    id="firstName"
                    placeholder="Введіть ім'я"
                    {...registerProfile('firstName', {
                      required: "Ім'я обов'язкове",
                      minLength: { value: 2, message: "Мінімум 2 символи" },
                    })}
                    error={profileErrors.firstName?.message}
                  />
                </div>
                <div className="settings__form-group">
                  <label htmlFor="lastName">Прізвище</label>
                  <Input
                    id="lastName"
                    placeholder="Введіть прізвище"
                    {...registerProfile('lastName', {
                      required: "Прізвище обов'язкове",
                      minLength: { value: 2, message: "Мінімум 2 символи" },
                    })}
                    error={profileErrors.lastName?.message}
                  />
                </div>
              </div>

              <div className="settings__form-group">
                <label htmlFor="email">Email</label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Введіть email"
                  {...registerProfile('email', {
                    required: "Email обов'язковий",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Невірний формат email',
                    },
                  })}
                  error={profileErrors.email?.message}
                />
              </div>

              <Button type="submit" loading={isLoading}>
                <Check size={18} />
                Зберегти зміни
              </Button>
            </form>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="settings__panel">
            <h2 className="settings__panel-title">Зміна пароля</h2>
            <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="settings__form">
              <div className="settings__form-group">
                <label htmlFor="currentPassword">Поточний пароль</label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="Введіть поточний пароль"
                  {...registerPassword('currentPassword', {
                    required: "Поточний пароль обов'язковий",
                  })}
                  error={passwordErrors.currentPassword?.message}
                />
              </div>

              <div className="settings__form-group">
                <label htmlFor="newPassword">Новий пароль</label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Введіть новий пароль"
                  {...registerPassword('newPassword', {
                    required: "Новий пароль обов'язковий",
                    minLength: { value: 6, message: 'Мінімум 6 символів' },
                  })}
                  error={passwordErrors.newPassword?.message}
                />
              </div>

              <div className="settings__form-group">
                <label htmlFor="confirmPassword">Підтвердження пароля</label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Підтвердіть новий пароль"
                  {...registerPassword('confirmPassword', {
                    required: "Підтвердіть пароль",
                    validate: (value) =>
                      value === newPassword || 'Паролі не співпадають',
                  })}
                  error={passwordErrors.confirmPassword?.message}
                />
              </div>

              <div className="settings__password-hints">
                <AlertCircle size={16} />
                <span>Пароль повинен містити мінімум 6 символів</span>
              </div>

              <Button type="submit" loading={isLoading}>
                <Lock size={18} />
                Змінити пароль
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;

