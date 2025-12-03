import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, Lock, User, BookOpen } from 'lucide-react';
import { Button, Input } from '../../components/common';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import './Auth.css';

const Register = () => {
  const navigate = useNavigate();
  const { register: registerUser, isLoading } = useAuthStore();
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm();

  const password = watch('password');

  const onSubmit = async (data) => {
    setError('');
    const result = await registerUser({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
    });
    
    if (result.success) {
      toast.success('Account created successfully!');
      navigate('/');
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
          <h1>Create Account</h1>
          <p>Join our library and start reading today</p>
        </div>

        <form className="auth__form" onSubmit={handleSubmit(onSubmit)}>
          {error && <div className="auth__error">{error}</div>}

          <div className="auth__row">
            <Input
              label="First Name"
              type="text"
              placeholder="John"
              icon={User}
              error={errors.firstName?.message}
              {...register('firstName', {
                required: 'First name is required',
                minLength: {
                  value: 2,
                  message: 'Minimum 2 characters',
                },
                maxLength: {
                  value: 50,
                  message: 'Maximum 50 characters',
                },
              })}
            />

            <Input
              label="Last Name"
              type="text"
              placeholder="Doe"
              icon={User}
              error={errors.lastName?.message}
              {...register('lastName', {
                required: 'Last name is required',
                minLength: {
                  value: 2,
                  message: 'Minimum 2 characters',
                },
                maxLength: {
                  value: 50,
                  message: 'Maximum 50 characters',
                },
              })}
            />
          </div>

          <Input
            label="Email"
            type="email"
            placeholder="john@example.com"
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
            placeholder="Min. 6 characters"
            icon={Lock}
            error={errors.password?.message}
            {...register('password', {
              required: 'Password is required',
              minLength: {
                value: 6,
                message: 'Password must be at least 6 characters',
              },
            })}
          />

          <Input
            label="Confirm Password"
            type="password"
            placeholder="Repeat your password"
            icon={Lock}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (value) =>
                value === password || 'Passwords do not match',
            })}
          />

          <Button type="submit" fullWidth loading={isLoading}>
            Create Account
          </Button>
        </form>

        <p className="auth__footer">
          Already have an account?{' '}
          <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

