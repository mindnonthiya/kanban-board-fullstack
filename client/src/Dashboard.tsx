import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from './config';

interface Board { id: number; name: string; }
interface Notification { id: number; board_id: number; message: string; is_read: boolean; created_at: string; }

function Dashboard() {
    const [boards, setBoards] = useState<Board[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showNotif, setShowNotif] = useState(false);

    //Loading State
    const [isLoading, setIsLoading] = useState(true);

    const [isCreating, setIsCreating] = useState(false);
    const [newBoardName, setNewBoardName] = useState('');
    const [editingBoardId, setEditingBoardId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const navigate = useNavigate();

    const fetchData = async () => {
        const token = localStorage.getItem('token');
        if (!token) return navigate('/');
        const headers = { Authorization: `Bearer ${token}` };
        try {
            const [boardsRes, notifRes] = await Promise.all([
                axios.get(`${API_URL}/boards`, { headers }),
                axios.get(`${API_URL}/notifications`, { headers })
            ]);
            setBoards(boardsRes.data);
            setNotifications(notifRes.data);
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleCreateBoard = async () => {
        if (!newBoardName.trim()) { setIsCreating(false); return; }
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        try {
            setIsLoading(true);
            await axios.post(`${API_URL}/boards`, { name: newBoardName }, { headers });
            setNewBoardName('');
            setIsCreating(false);
            fetchData();
        } catch (err) { console.error(err); setIsLoading(false); }
    };

    //ฟังก์ชันลบบอร์ด
    const handleDeleteBoard = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (!window.confirm("⚠️ ยืนยันการลบบอร์ด? ข้อมูลภายในการ์ดจะหายไปทั้งหมด!")) return;

        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        try {
            await axios.delete(`${API_URL}/boards/${id}`, { headers });
            // ลบจาก State ทันทีไม่ต้องรอโหลดใหม่ (Optimistic UI)
            setBoards(boards.filter(b => b.id !== id));
        } catch (err) {
            alert('ไม่สามารถลบบอร์ดได้');
            console.error(err);
        }
    };

    const handleReadAndGo = async (notif: Notification) => {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        try {
            await axios.put(`${API_URL}/notifications/${notif.id}/read`, {}, { headers });
            setShowNotif(false);
            navigate(`/board/${notif.board_id}`);
        } catch (err) { console.error(err); }
    };

    const handleUpdateBoardName = async (e: React.KeyboardEvent, id: number) => {
        if (e.key === 'Enter') {
            e.preventDefault(); e.stopPropagation();
            if (!editName.trim()) { setEditingBoardId(null); return; }
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            try {
                await axios.put(`${API_URL}/boards/${id}`, { name: editName }, { headers });
                setEditingBoardId(null);
                fetchData();
            } catch (err) { console.error(err); }
        } else if (e.key === 'Escape') { setEditingBoardId(null); }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    //หน้า Loading
    if (isLoading && boards.length === 0 && !isCreating) {
        return (
            <div className="min-h-screen w-full bg-[#FAFAFA] flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black mb-4"></div>
                <p className="text-gray-400 text-sm font-medium animate-pulse">Loading Workspace...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-screen bg-[#FAFAFA] text-gray-900 font-sans selection:bg-black selection:text-white" onClick={() => setShowNotif(false)}>
            <header className="flex justify-between items-center px-8 py-5 sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
                <h1 className="text-2xl font-black tracking-tighter text-black cursor-pointer flex items-center gap-2" onClick={() => navigate('/')}>
                    <span className="w-3 h-3 bg-black rounded-full inline-block"></span>
                    KANBAN.
                </h1>
                <div className="flex items-center gap-5">
                    <div className="relative cursor-pointer group" onClick={(e) => { e.stopPropagation(); setShowNotif(!showNotif); }}>
                        <div className="p-2 rounded-full hover:bg-gray-100 transition-colors relative">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 group-hover:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            {unreadCount > 0 && <span className="absolute top-1 right-2 bg-black text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white">{unreadCount}</span>}
                        </div>
                        {showNotif && (
                            <div className="absolute right-0 mt-4 w-80 bg-white rounded-2xl shadow-xl z-50 border border-gray-100 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100">
                                <div className="p-4 bg-white font-bold text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">Notifications</div>
                                <div className="max-h-72 overflow-y-auto">
                                    {notifications.length === 0 ? <div className="p-8 text-center text-gray-400 text-sm">No new updates</div> : notifications.map(n => (
                                        <div key={n.id} onClick={() => handleReadAndGo(n)} className={`p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${n.is_read ? 'opacity-50' : ''}`}>
                                            <div className="flex gap-3">
                                                <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${n.is_read ? 'bg-gray-200' : 'bg-black'}`}></div>
                                                <div><p className="text-sm text-gray-800 font-medium leading-snug">{n.message}</p><span className="text-[10px] text-gray-400 mt-2 block font-medium">{new Date(n.created_at).toLocaleString()}</span></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div onClick={() => { localStorage.clear(); navigate('/'); }} className="group flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-100 rounded-full transition-all" title="Logout">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-8 py-10">
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-8">Your Board</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {boards.map((board, index) => (
                        <div key={board.id} className="group relative" onClick={() => navigate(`/board/${board.id}`)}>
                            <div className="bg-white rounded-[2rem] p-3 border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full">
                                <div className="aspect-[1.8/1] rounded-[1.5rem] relative overflow-hidden bg-gray-100">
                                    <div className={`absolute inset-0 opacity-90 transition-transform duration-500 group-hover:scale-110 ${index % 3 === 0 ? 'bg-gradient-to-tr from-gray-900 to-gray-700' : index % 3 === 1 ? 'bg-gradient-to-bl from-gray-600 to-gray-400' : 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gray-800 via-gray-900 to-black'}`}></div>

                                    {/*ปุ่มลบ Board*/}
                                    <button
                                        onClick={(e) => handleDeleteBoard(e, board.id)}
                                        className="absolute top-3 right-3 w-8 h-8 bg-black/20 hover:bg-red-500 backdrop-blur-md rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-10"
                                        
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="px-2 pt-4 pb-2">
                                    <div className="flex items-center justify-between h-8">
                                        {editingBoardId === board.id ? (
                                            <input autoFocus type="text" className="w-full bg-transparent border-b-2 border-black text-gray-900 text-base font-bold outline-none pb-1" value={editName} onChange={(e) => setEditName(e.target.value)} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => handleUpdateBoardName(e, board.id)} onBlur={() => setEditingBoardId(null)} />
                                        ) : (
                                            <>
                                                <span className="font-bold text-gray-800 text-base truncate pr-2">{board.name}</span>
                                                <button onClick={(e) => { e.stopPropagation(); setEditingBoardId(board.id); setEditName(board.name); }} className="text-gray-300 hover:text-black transition-colors p-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1 font-medium">Last updated recently</div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/*Create New Board*/}
                    {isCreating ? (
                        <div className="bg-white rounded-[2rem] p-3 border border-gray-200 shadow-lg h-full flex flex-col">
                            <div className="aspect-[1.8/1] rounded-[1.5rem] bg-gray-50 border-2 border-black flex flex-col items-center justify-center p-6 relative">
                                <input autoFocus type="text" placeholder="Board Name" className="w-full bg-transparent text-center text-gray-900 text-lg font-bold placeholder-gray-400 outline-none border-b border-gray-300 focus:border-black pb-1 mb-4 transition-colors" value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateBoard()} />
                                <div className="flex gap-2 w-full"><button onClick={handleCreateBoard} className="flex-1 bg-black text-white text-xs py-2 rounded-lg font-bold hover:bg-gray-800 transition-all">Create</button><button onClick={() => setIsCreating(false)} className="flex-1 bg-gray-100 text-gray-600 text-xs py-2 rounded-lg hover:bg-gray-200 transition-all">Cancel</button></div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-300 hover:border-black hover:bg-white cursor-pointer transition-all duration-300 h-full min-h-[240px] flex flex-col items-center justify-center gap-3 group" onClick={(e) => { e.stopPropagation(); setIsCreating(true); }}>
                            <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400 group-hover:text-black transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></div>
                            <span className="text-sm font-bold text-gray-400 group-hover:text-black transition-colors">Create New Board</span>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default Dashboard;