import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from './config';

function Register() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!username.trim() || !email.trim() || !password) {
            setError('Please fill in all fields');
            return;
        }

        setIsLoading(true);
        try {
            await axios.post(`${API_URL}/auth/register`, {
                username,
                email,
                password
            });
            setSuccess('Registration successful! Redirecting to login...');
            setTimeout(() => {
                navigate('/');
            }, 1200);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Register failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-screen flex items-center justify-center bg-[#FAFAFA] text-gray-900 font-sans p-4">

            {/*Register*/}
            <div className="bg-white p-10 rounded-[2rem] shadow-xl border border-gray-100 w-full max-w-md relative overflow-hidden">

                
                <div className="relative z-10">
                    {/*Header*/}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-black tracking-tighter mb-2 flex items-center justify-center gap-2">
                            <span className="w-3 h-3 bg-black rounded-full"></span>
                            Create Account
                        </h1>
                        <p className="text-gray-400 text-sm font-medium">Join us and start organizing.</p>
                    </div>

                    {error && (
                        <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="mb-5 p-3.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span>{success}</span>
                        </div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 ml-1">Username</label>
                            <input
                                type="text"
                                className="w-full bg-gray-50 border-2 border-transparent focus:border-black focus:bg-white px-4 py-3 rounded-xl outline-none transition-all text-gray-900 font-medium placeholder-gray-400"
                                placeholder="Your Name"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 ml-1">Email</label>
                            <input
                                type="email"
                                className="w-full bg-gray-50 border-2 border-transparent focus:border-black focus:bg-white px-4 py-3 rounded-xl outline-none transition-all text-gray-900 font-medium placeholder-gray-400"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
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
                                required
                            />
                        </div>

                        {/*Sign Up*/}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition-all active:scale-[0.98] shadow-lg shadow-gray-200 mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    <span>Creating account...</span>
                                </>
                            ) : (
                                'Sign Up'
                            )}
                        </button>
                    </form>

                    {/*Login*/}
                    <div className="mt-8 text-center">
                        <p className="text-sm text-gray-500 font-medium">
                            Already have an account?{' '}
                            <Link to="/" className="text-black font-bold hover:underline transition-colors">
                                Login
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Register;