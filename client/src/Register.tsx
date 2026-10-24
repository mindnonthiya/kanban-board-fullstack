import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from './config';

function Register() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/auth/register`, {
                username,
                email,
                password
            });
            alert('สมัครสมาชิกสำเร็จ! 🎉 กรุณา Login');
            navigate('/');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Register failed');
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
                        <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition-transform active:scale-[0.98] shadow-lg shadow-gray-200 mt-2">
                            Sign Up
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