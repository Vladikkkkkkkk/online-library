import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, Lock, BookOpen } from 'lucide-react';
import { Button, Input } from '../../components/common';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import './Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuthStore();
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setError('');
    const result = await login(data.email, data.password);
    
    if (result.success) {
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="auth">
      <div className="auth__container">
        <div className="auth__header">
          <Link to="/" className="auth__logo">
            <BookOpen size={32} />
            <span>Online Library</span>
          </Link>
          <h1>Welcome Back</h1>
          <p>Sign in to continue to your library</p>
        </div>

        <form className="auth__form" onSubmit={handleSubmit(onSubmit)}>
          {error && <div className="auth__error">{error}</div>}

          <Input
            label="Email"
            type="email"
            placeholder="Enter your email"
            icon={Mail}
            error={errors.email?.message}
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Invalid email address',
              },
            })}
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            icon={Lock}
            error={errors.password?.message}
            {...register('password', {
              required: 'Password is required',
            })}
          />

          <Button type="submit" fullWidth loading={isLoading}>
            Sign In
          </Button>
        </form>

        <p className="auth__footer">
          Don't have an account?{' '}
          <Link to="/register">Sign Up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

