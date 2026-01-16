import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || '登录失败，请检查邮箱和密码');
    }
  };

  return (
    <div className="app">
      <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px' }}>
        <div className="card">
          <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>登录</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <div className="error-message">{error}</div>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              登录
            </button>
          </form>
          <p style={{ marginTop: '15px', textAlign: 'center' }}>
            还没有账号？ <Link to="/register">注册</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
