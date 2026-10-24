import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_URL } from './config';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!email.trim() || !password) {
            setError('Please enter both email and password');
            return;
        }

        setIsLoading(true);
        try {
            const res = await axios.post(`${API_URL}/auth/login`, {
                email,
                password
            });

            localStorage.setItem('token', res.data.token);
            localStorage.setItem('userId', res.data.user.id);
            localStorage.setItem('username', res.data.user.username);

            navigate('/board');

        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-screen flex items-center justify-center bg-[#FAFAFA] text-gray-900 font-sans p-4">

            {/*Login*/}
            <div className="bg-white p-10 rounded-[2rem] shadow-xl border border-gray-100 w-full max-w-md relative overflow-hidden">

                <div className="relative z-10">
                    {/*Header*/}
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-black tracking-tighter mb-2 flex items-center justify-center gap-2">
                            <span className="w-3 h-3 bg-black rounded-full"></span>
                            KANBAN.
                        </h1>
                        <p className="text-gray-400 text-sm font-medium">Welcome back, please login.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 ml-1">Email</label>
                            <input
                                type="email"
                                className="w-full bg-gray-50 border-2 border-transparent focus:border-black focus:bg-white px-4 py-3 rounded-xl outline-none transition-all text-gray-900 font-medium placeholder-gray-400"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 ml-1">Password</label>
                            <input
                                type="password"
                                className="w-full bg-gray-50 border-2 border-transparent focus:border-black focus:bg-white px-4 py-3 rounded-xl outline-none transition-all text-gray-900 font-medium placeholder-gray-400"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {/*Login*/}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition-all active:scale-[0.98] shadow-lg shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    <span>Logging in...</span>
                                </>
                            ) : (
                                'Login'
                            )}
                        </button>
                    </form>

                    {/*Register*/}
                    <div className="mt-8 text-center">
                        <p className="text-sm text-gray-500 font-medium">
                            Don't have an account?{' '}
                            <span
                                onClick={() => navigate('/register')}
                                className="text-black font-bold hover:underline cursor-pointer transition-colors"
                            >
                                Register
                            </span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;