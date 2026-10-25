import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { API_URL } from './config';

interface Tag { id: number; name: string; color: string; }
interface Task {
    id: number;
    title: string;
    description?: string;
    column_id: number;
    position: number;
    assignee_id?: number;
    assignee_name?: string;
    tags: Tag[];
    priority?: 'low' | 'medium' | 'high';
    due_date?: string | null;
}
interface Column { id: number; name: string; }
interface Member { id: number; username: string; email: string; }
interface Notification { id: number; message: string; is_read: boolean; created_at: string; }

//สีสำเร็จรูปสวยๆ ให้เลือก (Preset Colors)
const PRESET_COLORS = [
    '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981',
    '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899',
    '#6B7280', '#000000'
];

function KanbanBoard() {
    const { boardId } = useParams();
    const navigate = useNavigate();
    const [columns, setColumns] = useState<Column[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [availableTags, setAvailableTags] = useState<Tag[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showNotif, setShowNotif] = useState(false);
    const [boardName, setBoardName] = useState('');
    const [newColName, setNewColName] = useState('');
    const [newTaskTitles, setNewTaskTitles] = useState<{ [key: number]: string | undefined }>({});
    const [isEditingBoard, setIsEditingBoard] = useState(false);
    const [editingColId, setEditingColId] = useState<number | null>(null);
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
    const [tempBoardName, setTempBoardName] = useState('');
    const [tempColName, setTempColName] = useState('');
    const [tempTaskTitle, setTempTaskTitle] = useState('');

    //State สำหรับ Modal รายละเอียด Task
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [taskModalTitle, setTaskModalTitle] = useState('');
    const [taskModalDesc, setTaskModalDesc] = useState('');
    const [taskModalAssignee, setTaskModalAssignee] = useState<number | null>(null);
    const [taskModalPriority, setTaskModalPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [taskModalDueDate, setTaskModalDueDate] = useState('');

    //State สำหรับ Modal สร้าง Tag
    const [showTagModal, setShowTagModal] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('#3B82F6');

    //State สำหรับ Modal Invite สมาชิก
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteMsg, setInviteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    //State สำหรับ Search & Filter
    const [searchQuery, setSearchQuery] = useState('');
    const [filterTagId, setFilterTagId] = useState<number | null>(null);
    const [filterMyTasks, setFilterMyTasks] = useState(false);
    const [filterPriority, setFilterPriority] = useState<string>('all');

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) { navigate('/'); return; }
            const headers = { Authorization: `Bearer ${token}` };
            const [boardRes, colsRes, tasksRes, membersRes, tagsRes, notifRes] = await Promise.all([
                axios.get(`${API_URL}/boards/${boardId}`, { headers }),
                axios.get(`${API_URL}/columns/${boardId}`, { headers }),
                axios.get(`${API_URL}/tasks/${boardId}`, { headers }),
                axios.get(`${API_URL}/boards/${boardId}/members`, { headers }),
                axios.get(`${API_URL}/tags/${boardId}`, { headers }),
                axios.get(`${API_URL}/notifications`, { headers })
            ]);
            if (boardRes.data) { setBoardName(boardRes.data.name); setTempBoardName(boardRes.data.name); }
            setColumns(colsRes.data); setMembers(membersRes.data); setAvailableTags(tagsRes.data); setNotifications(notifRes.data); setTasks(tasksRes.data.sort((a: Task, b: Task) => a.position - b.position));
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchData(); const interval = setInterval(fetchData, 5000); return () => clearInterval(interval); }, [boardId]);

    const handleReadNotif = async (notifId: number) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/notifications/${notifId}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
            setNotifications(notifications.map(n => n.id === notifId ? { ...n, is_read: true } : n));
        } catch (err) { console.error(err); }
    };

    //ฟังก์ชันสร้าง Tag ผ่าน Modal
    const submitCreateTag = async () => {
        if (!newTagName.trim()) return;
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/tags`, { name: newTagName, color: newTagColor, boardId }, { headers: { Authorization: `Bearer ${token}` } });
            fetchData();
            setShowTagModal(false); // ปิด Modal
            setNewTagName(''); // ล้างค่า
            setNewTagColor('#3B82F6'); // รีเซ็ตสี
        } catch (err) { alert('Failed to create tag'); }
    };

    //ฟังก์ชันเชิญสมาชิกผ่าน Modal
    const submitInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;
        setInviteLoading(true);
        setInviteMsg(null);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/boards/${boardId}/invite`, { email: inviteEmail.trim() }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInviteMsg({ type: 'success', text: `Invited ${inviteEmail.trim()} successfully!` });
            setInviteEmail('');
            fetchData();
        } catch (err: any) {
            setInviteMsg({ type: 'error', text: err.response?.data?.error || 'Failed to invite user' });
        } finally {
            setInviteLoading(false);
        }
    };

    const handleAddTagToTask = async (taskId: number, tagId: string) => { if (tagId) { try { const token = localStorage.getItem('token'); await axios.post(`${API_URL}/tags/task`, { taskId, tagId: Number(tagId) }, { headers: { Authorization: `Bearer ${token}` } }); fetchData(); } catch (err) { alert('Failed'); } } };
    const handleRemoveTag = async (taskId: number, tagId: number) => { if (window.confirm("Remove Tag?")) { try { const token = localStorage.getItem('token'); await axios.delete(`${API_URL}/tags/task/${taskId}/${tagId}`, { headers: { Authorization: `Bearer ${token}` } }); fetchData(); } catch (err) { alert('Failed'); } } };
    const updateBoardName = async () => { if (tempBoardName.trim()) { try { const token = localStorage.getItem('token'); await axios.put(`${API_URL}/boards/${boardId}`, { name: tempBoardName }, { headers: { Authorization: `Bearer ${token}` } }); setBoardName(tempBoardName); setIsEditingBoard(false); } catch (err) { setIsEditingBoard(false); } } else setIsEditingBoard(false); };
    const updateColumnName = async (colId: number) => { if (tempColName.trim()) { setColumns(columns.map(c => c.id === colId ? { ...c, name: tempColName } : c)); setEditingColId(null); try { const token = localStorage.getItem('token'); await axios.put(`${API_URL}/columns/${colId}`, { name: tempColName }, { headers: { Authorization: `Bearer ${token}` } }); } catch (err) { fetchData(); } } else setEditingColId(null); };
    const updateTask = async (
        taskId: number,
        newTitle?: string,
        newAssigneeId?: number | null,
        newDescription?: string,
        newPriority?: 'low' | 'medium' | 'high',
        newDueDate?: string | null
    ) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        const titleToSend = newTitle !== undefined ? newTitle : task.title;
        const assigneeToSend = newAssigneeId !== undefined ? newAssigneeId : task.assignee_id;
        const descToSend = newDescription !== undefined ? newDescription : (task.description || '');
        const priorityToSend = newPriority !== undefined ? newPriority : (task.priority || 'medium');
        const dueDateToSend = newDueDate !== undefined ? newDueDate : (task.due_date || null);

        const newTasks = tasks.map(t => t.id === taskId ? {
            ...t,
            title: titleToSend,
            description: descToSend,
            assignee_id: assigneeToSend || undefined,
            assignee_name: members.find(m => m.id === assigneeToSend)?.username,
            priority: priorityToSend,
            due_date: dueDateToSend
        } : t);
        setTasks(newTasks);
        setEditingTaskId(null);

        if (selectedTask && selectedTask.id === taskId) {
            setSelectedTask({
                ...selectedTask,
                title: titleToSend,
                description: descToSend,
                assignee_id: assigneeToSend || undefined,
                assignee_name: members.find(m => m.id === assigneeToSend)?.username,
                priority: priorityToSend,
                due_date: dueDateToSend
            });
        }

        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/tasks/${taskId}`, {
                title: titleToSend,
                description: descToSend,
                assigneeId: assigneeToSend,
                priority: priorityToSend,
                dueDate: dueDateToSend
            }, { headers: { Authorization: `Bearer ${token}` } });
        } catch (err) { fetchData(); }
    };

    const handleSaveTaskDetail = async () => {
        if (!selectedTask) return;
        await updateTask(
            selectedTask.id,
            taskModalTitle,
            taskModalAssignee,
            taskModalDesc,
            taskModalPriority,
            taskModalDueDate ? taskModalDueDate : null
        );
        setSelectedTask(null);
    };
    const handleDeleteColumn = async (colId: number) => { if (window.confirm('Delete Column?')) { try { const token = localStorage.getItem('token'); await axios.delete(`${API_URL}/columns/${colId}`, { headers: { Authorization: `Bearer ${token}` } }); fetchData(); } catch (err) { alert('Failed'); } } };
    const handleDeleteTask = async (taskId: number) => { if (window.confirm('Delete Task?')) { try { const token = localStorage.getItem('token'); await axios.delete(`${API_URL}/tasks/${taskId}`, { headers: { Authorization: `Bearer ${token}` } }); fetchData(); } catch (err) { alert('Failed'); } } };
    const onDragEnd = (result: DropResult) => { const { source, destination, draggableId } = result; if (!destination) return; if (source.droppableId === destination.droppableId && source.index === destination.index) return; const newTasks = Array.from(tasks); const movedTaskIndex = newTasks.findIndex(t => t.id === parseInt(draggableId)); const [movedTask] = newTasks.splice(movedTaskIndex, 1); movedTask.column_id = parseInt(destination.droppableId); newTasks.splice(destination.index, 0, movedTask); setTasks(newTasks); const token = localStorage.getItem('token'); axios.put(`${API_URL}/tasks/${draggableId}/move`, { columnId: parseInt(destination.droppableId), position: destination.index }, { headers: { Authorization: `Bearer ${token}` } }); };
    const handleAddColumn = async () => { if (newColName) { try { const token = localStorage.getItem('token'); await axios.post(`${API_URL}/columns`, { name: newColName, boardId: boardId }, { headers: { Authorization: `Bearer ${token}` } }); setNewColName(''); fetchData(); } catch (err) { alert('Error'); } } };
    const handleAddTask = async (columnId: number) => { const title = newTaskTitles[columnId]; if (title) { try { const token = localStorage.getItem('token'); await axios.post(`${API_URL}/tasks`, { title: title, columnId: columnId }, { headers: { Authorization: `Bearer ${token}` } }); setNewTaskTitles({ ...newTaskTitles, [columnId]: '' }); fetchData(); } catch (err) { alert('Error'); } } };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    // Filtered tasks computation
    const currentUserId = Number(localStorage.getItem('userId'));
    const filteredTasks = tasks.filter(task => {
        const matchesSearch = !searchQuery.trim() ||
            task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesTag = filterTagId === null ||
            task.tags?.some(tag => tag.id === filterTagId);
        const matchesMyTasks = !filterMyTasks ||
            task.assignee_id === currentUserId;
        const matchesPriority = filterPriority === 'all' ||
            (task.priority || 'medium') === filterPriority;
        return matchesSearch && matchesTag && matchesMyTasks && matchesPriority;
    });
    const isFilterActive = searchQuery.trim() !== '' || filterTagId !== null || filterMyTasks || filterPriority !== 'all';

    return (
        <div className="min-h-screen w-screen bg-[#FAFAFA] p-8 font-sans overflow-x-auto relative text-gray-900 selection:bg-black selection:text-white" onClick={() => setShowNotif(false)}>

            {/* Header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/board')} className="text-gray-400 hover:text-black transition-colors font-bold text-lg">←</button>
                    {isEditingBoard ? (
                        <input autoFocus className="text-3xl font-black text-black bg-transparent border-b-2 border-black outline-none w-auto" value={tempBoardName} onChange={e => setTempBoardName(e.target.value)} onBlur={updateBoardName} onKeyDown={e => e.key === 'Enter' && updateBoardName()} />
                    ) : (
                        <h1 onClick={() => { setIsEditingBoard(true); setTempBoardName(boardName); }} className="text-3xl font-black tracking-tight text-black cursor-pointer hover:opacity-70 transition-opacity">
                            {boardName || `Board #${boardId}`}
                        </h1>
                    )}
                    <div className="flex gap-2 ml-4">
                        <button
                            onClick={() => { setShowInviteModal(true); setInviteMsg(null); setInviteEmail(''); }}
                            className="bg-black text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-gray-800 transition-all shadow-sm flex items-center gap-1.5"
                        >
                            <span>Invite</span>
                            <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full">{members.length}</span>
                        </button>
                        
                        <button onClick={() => setShowTagModal(true)} className="bg-white border border-gray-300 text-gray-600 px-4 py-1.5 rounded-full text-xs font-bold hover:border-black hover:text-black transition-all">Tag +</button>
                    </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-6">
                    <div className="relative cursor-pointer" onClick={(e) => e.stopPropagation()}>
                        <div onClick={() => setShowNotif(!showNotif)} className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 hover:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                            {unreadCount > 0 && <span className="absolute top-1 right-2 bg-black text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white font-bold">{unreadCount}</span>}
                        </div>
                        {showNotif && (
                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl z-50 overflow-hidden text-black ring-1 ring-black/5">
                                <div className="p-4 bg-white font-bold text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">Updates</div>
                                <div className="max-h-64 overflow-y-auto">
                                    {notifications.length === 0 ? <div className="p-6 text-center text-gray-400 text-sm">No new updates</div> : notifications.map(n => (
                                        <div key={n.id} onClick={() => handleReadNotif(n.id)} className={`p-4 border-b border-gray-50 text-sm cursor-pointer hover:bg-gray-50 ${n.is_read ? 'opacity-50' : 'font-medium'}`}>
                                            {n.message}
                                            <div className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleTimeString()}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User profile & Logout */}
                    <div className="flex items-center gap-2.5 pl-3 border-l border-gray-200">
                        <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold shadow-sm">
                            {(localStorage.getItem('username') || 'U')[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-gray-800 hidden md:inline">
                            {localStorage.getItem('username') || 'User'}
                        </span>
                        <button
                            type="button"
                            onClick={() => { localStorage.clear(); navigate('/'); }}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-full transition-colors"
                            title="Logout"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-md">
                    <div className="relative w-full">
                        <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search cards by title or notes..."
                            className="w-full pl-9 pr-8 py-2 text-xs bg-gray-50 hover:bg-gray-100/70 focus:bg-white text-gray-900 placeholder-gray-400 border border-gray-200 focus:border-black rounded-xl outline-none transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black text-xs font-bold"
                            >
                                ×
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* My Tasks filter pill */}
                    <button
                        onClick={() => setFilterMyTasks(!filterMyTasks)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            filterMyTasks
                                ? 'bg-black text-white shadow-sm'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        <span>My Tasks</span>
                        {filterMyTasks && <span className="text-[10px]">✓</span>}
                    </button>

                    {/* Tag filter dropdown */}
                    {availableTags.length > 0 && (
                        <select
                            value={filterTagId === null ? '' : filterTagId}
                            onChange={(e) => setFilterTagId(e.target.value ? Number(e.target.value) : null)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border outline-none cursor-pointer ${
                                filterTagId !== null
                                    ? 'bg-black text-white border-black'
                                    : 'bg-gray-100 text-gray-700 border-transparent hover:bg-gray-200'
                            }`}
                        >
                            <option value="" className="bg-white text-gray-900">All Tags</option>
                            {availableTags.map(tag => (
                                <option key={tag.id} value={tag.id} className="bg-white text-gray-900">
                                    Tag: {tag.name}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Priority filter dropdown */}
                    <select
                        value={filterPriority}
                        onChange={(e) => setFilterPriority(e.target.value)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border outline-none cursor-pointer ${
                            filterPriority !== 'all'
                                ? 'bg-black text-white border-black'
                                : 'bg-gray-100 text-gray-700 border-transparent hover:bg-gray-200'
                        }`}
                    >
                        <option value="all" className="bg-white text-gray-900">All Priorities</option>
                        <option value="high" className="bg-white text-gray-900">🔴 High Priority</option>
                        <option value="medium" className="bg-white text-gray-900">🟡 Medium Priority</option>
                        <option value="low" className="bg-white text-gray-900">🟢 Low Priority</option>
                    </select>

                    {/* Filter count & clear */}
                    {isFilterActive && (
                        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                            <span className="text-xs text-gray-500 font-medium">
                                Showing <strong className="text-black">{filteredTasks.length}</strong> of {tasks.length}
                            </span>
                            <button
                                onClick={() => { setSearchQuery(''); setFilterTagId(null); setFilterMyTasks(false); setFilterPriority('all'); }}
                                className="text-xs text-red-500 hover:text-red-700 font-bold hover:underline"
                            >
                                Clear
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/*Modal รายละเอียด Task*/}
            {selectedTask && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in" onClick={() => setSelectedTask(null)}>
                    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-lg border border-gray-100 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-start gap-4 mb-5">
                            <div className="flex-1">
                                <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md mb-2">
                                    {columns.find(c => c.id === selectedTask.column_id)?.name || 'Column'}
                                </span>
                                <input
                                    type="text"
                                    value={taskModalTitle}
                                    onChange={(e) => setTaskModalTitle(e.target.value)}
                                    placeholder="Task title..."
                                    className="w-full text-xl font-bold text-gray-900 border-b-2 border-gray-200 focus:border-black outline-none transition-colors pb-1 bg-white"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedTask(null)}
                                className="text-gray-400 hover:text-black p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>

                        {/* Assignee & Tags */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Assignee</label>
                                <select
                                    className="w-full p-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                                    value={taskModalAssignee || ''}
                                    onChange={(e) => setTaskModalAssignee(e.target.value ? Number(e.target.value) : null)}
                                >
                                    <option value="">Unassigned</option>
                                    {members.map(m => (
                                        <option key={m.id} value={m.id}>{m.username}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Add Tag</label>
                                <select
                                    className="w-full p-2.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                                    value=""
                                    onChange={(e) => {
                                         if (e.target.value) {
                                            handleAddTagToTask(selectedTask.id, e.target.value);
                                        }
                                    }}
                                >
                                    <option value="">Select a tag...</option>
                                    {availableTags.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Priority & Due Date */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Priority</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setTaskModalPriority('low')}
                                        className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all text-center flex items-center justify-center gap-1 ${
                                            taskModalPriority === 'low'
                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                        }`}
                                    >
                                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                        Low
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTaskModalPriority('medium')}
                                        className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all text-center flex items-center justify-center gap-1 ${
                                            taskModalPriority === 'medium'
                                                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                        }`}
                                    >
                                        <span className="w-2 h-2 rounded-full bg-amber-300"></span>
                                        Med
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTaskModalPriority('high')}
                                        className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all text-center flex items-center justify-center gap-1 ${
                                            taskModalPriority === 'high'
                                                ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                        }`}
                                    >
                                        <span className="w-2 h-2 rounded-full bg-rose-300"></span>
                                        High
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Due Date</label>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        value={taskModalDueDate}
                                        onChange={(e) => setTaskModalDueDate(e.target.value)}
                                        className="flex-1 p-2 border border-gray-300 rounded-xl text-xs bg-white text-gray-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                                    />
                                    {taskModalDueDate && (
                                        <button
                                            type="button"
                                            onClick={() => setTaskModalDueDate('')}
                                            className="px-2.5 py-1.5 text-xs text-gray-400 hover:text-red-500 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                                            title="Clear due date"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Active Tags list */}
                        {selectedTask.tags.length > 0 && (
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Active Tags</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedTask.tags.map(tag => (
                                        <span
                                            key={tag.id}
                                            className="text-xs font-semibold px-2.5 py-1 rounded-md text-white flex items-center gap-1.5 shadow-sm"
                                            style={{ backgroundColor: tag.color }}
                                        >
                                            {tag.name}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveTag(selectedTask.id, tag.id)}
                                                className="hover:opacity-75 font-bold text-white text-xs ml-1"
                                                title="Remove tag"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Description Textarea */}
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
                            <textarea
                                rows={4}
                                placeholder="Add detailed notes, acceptance criteria, or context for this task..."
                                className="w-full p-3 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all leading-relaxed"
                                value={taskModalDesc}
                                onChange={(e) => setTaskModalDesc(e.target.value)}
                            />
                        </div>

                        {/* Modal Actions */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => {
                                    handleDeleteTask(selectedTask.id);
                                    setSelectedTask(null);
                                }}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                            >
                                Delete Task
                            </button>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedTask(null)}
                                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveTaskDetail}
                                    className="bg-black text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors shadow-sm"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/*Modal Invite สมาชิก*/}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowInviteModal(false)}>
                    <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-5">
                            <div>
                                <h3 className="text-lg font-black text-gray-900">Invite Member</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Share "{boardName}" with your teammates</p>
                            </div>
                            <button
                                onClick={() => setShowInviteModal(false)}
                                className="text-gray-400 hover:text-black p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {inviteMsg && (
                            <div className={`p-3 rounded-xl text-xs font-semibold mb-4 flex items-center gap-2 ${
                                inviteMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                                <span>{inviteMsg.type === 'success' ? '✓' : '⚠'}</span>
                                <span>{inviteMsg.text}</span>
                            </div>
                        )}

                        <form onSubmit={submitInvite} className="mb-6">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Member Email</label>
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    autoFocus
                                    required
                                    placeholder="colleague@example.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="flex-1 p-2.5 text-sm border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                                />
                                <button
                                    type="submit"
                                    disabled={inviteLoading}
                                    className="bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 whitespace-nowrap"
                                >
                                    {inviteLoading ? 'Sending...' : 'Invite'}
                                </button>
                            </div>
                        </form>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
                                Members in this board ({members.length})
                            </label>
                            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                                {members.map((m) => (
                                    <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-full bg-black text-white text-[11px] font-bold flex items-center justify-center">
                                                {m.username[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-gray-900">{m.username}</div>
                                                <div className="text-[11px] text-gray-400">{m.email}</div>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-white px-2 py-0.5 rounded-md border border-gray-200">
                                            Member
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/*Modal สร้าง Tag*/}
            {showTagModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] flex items-center justify-center" onClick={() => setShowTagModal(false)}>
                    <div className="bg-white p-6 rounded-2xl shadow-2xl w-80 border border-gray-100" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-4 text-center">Create New Tag</h3>
                        <input
                            autoFocus
                            placeholder="Tag Name (e.g. Urgent)"
                            className="w-full p-2.5 border border-gray-300 bg-white text-gray-900 placeholder-gray-400 rounded-lg mb-4 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                            value={newTagName}
                            onChange={(e) => setNewTagName(e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mb-2 font-bold uppercase">Pick a Color:</p>
                        <div className="grid grid-cols-6 gap-2 mb-4">
                            {PRESET_COLORS.map(color => (
                                <div
                                    key={color}
                                    onClick={() => setNewTagColor(color)}
                                    className={`w-8 h-8 rounded-full cursor-pointer transition-transform hover:scale-110 ${newTagColor === color ? 'ring-2 ring-black ring-offset-2' : ''}`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                        {/*Custom Color Input*/}
                        <div className="flex items-center gap-2 mb-6">
                            <span className="text-xs text-gray-400">Custom:</span>
                            <input
                                type="color"
                                value={newTagColor}
                                onChange={(e) => setNewTagColor(e.target.value)}
                                className="w-full h-8 cursor-pointer rounded-lg border-none"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={submitCreateTag} className="flex-1 bg-black text-white py-2 rounded-lg text-sm font-bold hover:bg-gray-800">Create</button>
                            <button onClick={() => setShowTagModal(false)} className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-lg text-sm font-bold hover:bg-gray-200">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/*Kanban Columns*/}
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex items-start gap-6 h-full overflow-x-auto pb-4">
                    {columns.map((col) => (
                        <div key={col.id} className="min-w-[300px] w-[300px] bg-[#F4F4F5] rounded-2xl p-4 flex flex-col max-h-[80vh] border border-transparent hover:border-gray-200 transition-colors">
                            <div className="flex justify-between items-center mb-4 px-1">
                                {editingColId === col.id ? (
                                    <input autoFocus className="font-bold text-gray-900 bg-white px-2 py-1 w-full border border-black rounded-lg shadow-sm" value={tempColName} onChange={e => setTempColName(e.target.value)} onBlur={() => updateColumnName(col.id)} onKeyDown={e => e.key === 'Enter' && updateColumnName(col.id)} />
                                ) : (
                                    <h2 onClick={() => { setEditingColId(col.id); setTempColName(col.name); }} className="font-bold text-gray-700 text-sm uppercase tracking-wide cursor-pointer w-full hover:text-black transition-colors">{col.name} <span className="text-gray-400 font-normal ml-2">{filteredTasks.filter(t => t.column_id === col.id).length}</span></h2>
                                )}
                                <button onClick={() => handleDeleteColumn(col.id)} className="text-gray-400 hover:text-red-500 font-bold px-2 transition-colors">×</button>
                            </div>

                            <Droppable droppableId={col.id.toString()}>
                                {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef} className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[100px] scrollbar-hide">
                                        {filteredTasks.filter(task => task.column_id === col.id).map((task, index) => (
                                            <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                                                {(provided, snapshot) => (
                                                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} style={{ ...provided.draggableProps.style }}
                                                        className={`bg-white p-4 rounded-xl shadow-sm text-gray-800 border border-gray-200 group relative transition-all ${snapshot.isDragging ? 'shadow-lg rotate-2 scale-105 ring-2 ring-black' : 'hover:border-gray-300 hover:shadow-md'}`}>
                                                        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                                                            {/* Priority Pill */}
                                                            {task.priority === 'high' && (
                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 flex items-center gap-1 shadow-xs">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> High
                                                                </span>
                                                            )}
                                                            {task.priority === 'medium' && (
                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 flex items-center gap-1 shadow-xs">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Med
                                                                </span>
                                                            )}
                                                            {task.priority === 'low' && (
                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 flex items-center gap-1 shadow-xs">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Low
                                                                </span>
                                                            )}
                                                            {task.tags.map(tag => (
                                                                <span key={tag.id} onClick={(e) => { e.stopPropagation(); handleRemoveTag(task.id, tag.id); }} className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white cursor-pointer hover:opacity-80 shadow-sm" style={{ backgroundColor: tag.color }} title="Click to remove">{tag.name}</span>
                                                            ))}
                                                        </div>
                                                        {editingTaskId === task.id ? (
                                                            <div className="flex flex-col gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                                                                <input autoFocus className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-sm bg-white text-gray-900" value={tempTaskTitle} onChange={e => setTempTaskTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && updateTask(task.id, tempTaskTitle)} />
                                                                <div className="flex gap-2">
                                                                    <select className="flex-1 p-1.5 border border-gray-300 rounded-md text-xs bg-white text-gray-900 focus:border-black" value={task.assignee_id || ''} onChange={(e) => updateTask(task.id, undefined, e.target.value ? Number(e.target.value) : null)}>
                                                                        <option value="">Assignee</option>
                                                                        {members.map(m => <option key={m.id} value={m.id}>{m.username}</option>)}
                                                                    </select>
                                                                    <select className="flex-1 p-1.5 border border-gray-300 rounded-md text-xs bg-white text-gray-900 focus:border-black" value="" onChange={(e) => handleAddTagToTask(task.id, e.target.value)}>
                                                                        <option value="">Tag</option>
                                                                        {availableTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                                    </select>
                                                                </div>
                                                                <button onClick={() => updateTask(task.id, tempTaskTitle)} className="bg-black text-white text-xs py-1.5 rounded-md hover:bg-gray-800 font-bold transition-colors">Save</button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div
                                                                    onClick={() => {
                                                                        setSelectedTask(task);
                                                                        setTaskModalTitle(task.title);
                                                                        setTaskModalDesc(task.description || '');
                                                                        setTaskModalAssignee(task.assignee_id || null);
                                                                        setTaskModalPriority(task.priority || 'medium');
                                                                        setTaskModalDueDate(task.due_date ? task.due_date.split('T')[0] : '');
                                                                    }}
                                                                    className="cursor-pointer"
                                                                >
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <span className="block mb-1.5 font-semibold text-gray-900 leading-snug">{task.title}</span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setEditingTaskId(task.id);
                                                                                setTempTaskTitle(task.title);
                                                                            }}
                                                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-black hover:bg-gray-100 rounded transition-all"
                                                                            title="Quick edit"
                                                                        >
                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                                            </svg>
                                                                        </button>
                                                                    </div>
                                                                    {task.description && (
                                                                        <p className="text-xs text-gray-500 line-clamp-2 mb-2 leading-relaxed">
                                                                            {task.description}
                                                                        </p>
                                                                    )}

                                                                    <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-gray-100 text-[11px]">
                                                                        {task.assignee_name ? (
                                                                            <div className="flex items-center gap-1.5">
                                                                                <div className="w-5 h-5 rounded-full bg-gray-900 text-white flex items-center justify-center text-[10px] font-bold">
                                                                                    {task.assignee_name[0].toUpperCase()}
                                                                                </div>
                                                                                <span className="text-gray-700 font-medium truncate max-w-[90px]">{task.assignee_name}</span>
                                                                            </div>
                                                                        ) : <span className="text-gray-400 text-[10px] italic">Unassigned</span>}

                                                                        {task.due_date && (() => {
                                                                            const due = new Date(task.due_date);
                                                                            const today = new Date();
                                                                            today.setHours(0, 0, 0, 0);
                                                                            due.setHours(0, 0, 0, 0);
                                                                            const isOverdue = due < today;
                                                                            const isToday = due.getTime() === today.getTime();
                                                                            const dateStr = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                                                                            return (
                                                                                <span
                                                                                    className={`flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md text-[10px] ${
                                                                                        isOverdue
                                                                                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                                                                            : isToday
                                                                                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                                                                : 'text-gray-500 bg-gray-50'
                                                                                    }`}
                                                                                    title={due.toDateString()}
                                                                                >
                                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                                    </svg>
                                                                                    <span>{isOverdue ? `Overdue (${dateStr})` : isToday ? `Today` : dateStr}</span>
                                                                                </span>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                                                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500 p-1"
                                                                    title="Delete task"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>

                            <div className="mt-3 pt-3 border-t border-gray-200/50">
                                {newTaskTitles[col.id] !== undefined && newTaskTitles[col.id] !== null ? (
                                    <div className="flex flex-col gap-2 animate-in fade-in zoom-in duration-200">
                                        <input
                                            autoFocus
                                            className="w-full p-3 rounded-xl border border-gray-300 shadow-sm text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black bg-white text-gray-900 placeholder-gray-400"
                                            placeholder="Type task title..."
                                            value={newTaskTitles[col.id]}
                                            onChange={(e) => setNewTaskTitles({ ...newTaskTitles, [col.id]: e.target.value })}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddTask(col.id)}
                                        />
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleAddTask(col.id)}
                                                className="bg-black text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-800 transition-colors shadow-sm"
                                            >
                                                Add Card
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setNewTaskTitles({ ...newTaskTitles, [col.id]: undefined })}
                                                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-200/50 transition-colors flex items-center justify-center"
                                                title="Cancel"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setNewTaskTitles({ ...newTaskTitles, [col.id]: '' })}
                                        className="w-full text-left bg-transparent text-gray-600 hover:text-black hover:bg-gray-200/70 p-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 group"
                                    >
                                        <span className="bg-white text-gray-500 border border-gray-300 w-5 h-5 rounded-md flex items-center justify-center group-hover:border-black group-hover:text-black transition-colors text-xs font-bold">+</span>
                                        <span>Add a card</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {/*Add Column Button*/}
                    <div className="min-w-[300px] w-[300px] bg-white/70 border-2 border-dashed border-gray-300 hover:border-black hover:bg-white transition-all rounded-2xl p-4 cursor-pointer group">
                        {newColName ? (
                            <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="List title..."
                                    className="w-full p-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 text-sm mb-3 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                                    value={newColName}
                                    onChange={(e) => setNewColName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                                />
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleAddColumn}
                                        className="bg-black text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-800 transition-colors shadow-sm"
                                    >
                                        Add List
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewColName('')}
                                        className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
                                        title="Cancel"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setNewColName(' ')}
                                className="w-full bg-transparent text-gray-500 font-bold p-2 text-left flex items-center gap-2 group-hover:text-black transition-colors"
                            >
                                <span className="text-xl leading-none">+</span>
                                <span>Add another list</span>
                            </button>
                        )}
                    </div>
                </div>
            </DragDropContext>
        </div>
    );
}

export default KanbanBoard;