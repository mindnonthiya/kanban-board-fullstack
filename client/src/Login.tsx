import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_URL } from './config';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API_URL}/auth/login`, {
                email,
                password
            });

            localStorage.setItem('token', res.data.token);
            localStorage.setItem('userId', res.data.user.id);
            localStorage.setItem('username', res.data.user.username);

            // alert('Login Success! 🎉'); // เอา Alert ออกเพื่อให้ดูลื่นไหลขึ้น
            navigate('/board');

        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.error || 'Login failed');
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
                        <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition-transform active:scale-[0.98] shadow-lg shadow-gray-200">
                            Login
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