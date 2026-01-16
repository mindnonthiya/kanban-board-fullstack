import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';

const API_URL = 'http://192.168.1.147:3000/api';

interface Tag { id: number; name: string; color: string; }
interface Task { id: number; title: string; column_id: number; position: number; assignee_id?: number; assignee_name?: string; tags: Tag[]; }
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

    //State สำหรับ Modal สร้าง Tag
    const [showTagModal, setShowTagModal] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('#3B82F6');

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

    const handleInvite = async () => { const email = prompt("Email:"); if (email) { try { const token = localStorage.getItem('token'); await axios.post(`${API_URL}/boards/${boardId}/invite`, { email }, { headers: { Authorization: `Bearer ${token}` } }); alert(`Invited ${email}!`); } catch (err: any) { alert(err.response?.data?.error || 'Failed'); } } };
    const handleAddTagToTask = async (taskId: number, tagId: string) => { if (tagId) { try { const token = localStorage.getItem('token'); await axios.post(`${API_URL}/tags/task`, { taskId, tagId: Number(tagId) }, { headers: { Authorization: `Bearer ${token}` } }); fetchData(); } catch (err) { alert('Failed'); } } };
    const handleRemoveTag = async (taskId: number, tagId: number) => { if (window.confirm("Remove Tag?")) { try { const token = localStorage.getItem('token'); await axios.delete(`${API_URL}/tags/task/${taskId}/${tagId}`, { headers: { Authorization: `Bearer ${token}` } }); fetchData(); } catch (err) { alert('Failed'); } } };
    const updateBoardName = async () => { if (tempBoardName.trim()) { try { const token = localStorage.getItem('token'); await axios.put(`${API_URL}/boards/${boardId}`, { name: tempBoardName }, { headers: { Authorization: `Bearer ${token}` } }); setBoardName(tempBoardName); setIsEditingBoard(false); } catch (err) { setIsEditingBoard(false); } } else setIsEditingBoard(false); };
    const updateColumnName = async (colId: number) => { if (tempColName.trim()) { setColumns(columns.map(c => c.id === colId ? { ...c, name: tempColName } : c)); setEditingColId(null); try { const token = localStorage.getItem('token'); await axios.put(`${API_URL}/columns/${colId}`, { name: tempColName }, { headers: { Authorization: `Bearer ${token}` } }); } catch (err) { fetchData(); } } else setEditingColId(null); };
    const updateTask = async (taskId: number, newTitle?: string, newAssigneeId?: number | null) => { const task = tasks.find(t => t.id === taskId); if (!task) return; const titleToSend = newTitle !== undefined ? newTitle : task.title; const assigneeToSend = newAssigneeId !== undefined ? newAssigneeId : task.assignee_id; const newTasks = tasks.map(t => t.id === taskId ? { ...t, title: titleToSend, assignee_id: assigneeToSend || undefined, assignee_name: members.find(m => m.id === assigneeToSend)?.username } : t); setTasks(newTasks); setEditingTaskId(null); try { const token = localStorage.getItem('token'); await axios.put(`${API_URL}/tasks/${taskId}`, { title: titleToSend, assigneeId: assigneeToSend }, { headers: { Authorization: `Bearer ${token}` } }); } catch (err) { fetchData(); } };
    const handleDeleteColumn = async (colId: number) => { if (window.confirm('Delete Column?')) { try { const token = localStorage.getItem('token'); await axios.delete(`${API_URL}/columns/${colId}`, { headers: { Authorization: `Bearer ${token}` } }); fetchData(); } catch (err) { alert('Failed'); } } };
    const handleDeleteTask = async (taskId: number) => { if (window.confirm('Delete Task?')) { try { const token = localStorage.getItem('token'); await axios.delete(`${API_URL}/tasks/${taskId}`, { headers: { Authorization: `Bearer ${token}` } }); fetchData(); } catch (err) { alert('Failed'); } } };
    const onDragEnd = (result: DropResult) => { const { source, destination, draggableId } = result; if (!destination) return; if (source.droppableId === destination.droppableId && source.index === destination.index) return; const newTasks = Array.from(tasks); const movedTaskIndex = newTasks.findIndex(t => t.id === parseInt(draggableId)); const [movedTask] = newTasks.splice(movedTaskIndex, 1); movedTask.column_id = parseInt(destination.droppableId); newTasks.splice(destination.index, 0, movedTask); setTasks(newTasks); const token = localStorage.getItem('token'); axios.put(`${API_URL}/tasks/${draggableId}/move`, { columnId: parseInt(destination.droppableId), position: destination.index }, { headers: { Authorization: `Bearer ${token}` } }); };
    const handleAddColumn = async () => { if (newColName) { try { const token = localStorage.getItem('token'); await axios.post(`${API_URL}/columns`, { name: newColName, boardId: boardId }, { headers: { Authorization: `Bearer ${token}` } }); setNewColName(''); fetchData(); } catch (err) { alert('Error'); } } };
    const handleAddTask = async (columnId: number) => { const title = newTaskTitles[columnId]; if (title) { try { const token = localStorage.getItem('token'); await axios.post(`${API_URL}/tasks`, { title: title, columnId: columnId }, { headers: { Authorization: `Bearer ${token}` } }); setNewTaskTitles({ ...newTaskTitles, [columnId]: '' }); fetchData(); } catch (err) { alert('Error'); } } };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="min-h-screen w-screen bg-[#FAFAFA] p-8 font-sans overflow-x-auto relative text-gray-900 selection:bg-black selection:text-white" onClick={() => setShowNotif(false)}>

            {/* Header */}
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200">
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
                        <button onClick={handleInvite} className="bg-black text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-gray-800 transition-all shadow-sm">Invite +</button>
                        
                        <button onClick={() => setShowTagModal(true)} className="bg-white border border-gray-300 text-gray-600 px-4 py-1.5 rounded-full text-xs font-bold hover:border-black hover:text-black transition-all">Tag +</button>
                    </div>
                </div>

                <div className="flex items-center gap-6">
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
                </div>
            </div>

            {/*Modal สร้าง Tag*/}
            {showTagModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] flex items-center justify-center" onClick={() => setShowTagModal(false)}>
                    <div className="bg-white p-6 rounded-2xl shadow-2xl w-80 border border-gray-100" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-4 text-center">Create New Tag</h3>
                        <input
                            autoFocus
                            placeholder="Tag Name (e.g. Urgent)"
                            className="w-full p-2 border border-gray-300 rounded-lg mb-4 text-sm focus:outline-none focus:border-black"
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
                                    <h2 onClick={() => { setEditingColId(col.id); setTempColName(col.name); }} className="font-bold text-gray-700 text-sm uppercase tracking-wide cursor-pointer w-full hover:text-black transition-colors">{col.name} <span className="text-gray-400 font-normal ml-2">{tasks.filter(t => t.column_id === col.id).length}</span></h2>
                                )}
                                <button onClick={() => handleDeleteColumn(col.id)} className="text-gray-400 hover:text-red-500 font-bold px-2 transition-colors">×</button>
                            </div>

                            <Droppable droppableId={col.id.toString()}>
                                {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef} className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[100px] scrollbar-hide">
                                        {tasks.filter(task => task.column_id === col.id).map((task, index) => (
                                            <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                                                {(provided, snapshot) => (
                                                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} style={{ ...provided.draggableProps.style }}
                                                        className={`bg-white p-4 rounded-xl shadow-sm text-gray-800 border border-gray-200 group relative transition-all ${snapshot.isDragging ? 'shadow-lg rotate-2 scale-105 ring-2 ring-black' : 'hover:border-gray-300 hover:shadow-md'}`}>
                                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                                            {task.tags.map(tag => (
                                                                <span key={tag.id} onClick={(e) => { e.stopPropagation(); handleRemoveTag(task.id, tag.id); }} className="text-[10px] font-bold px-2 py-1 rounded-md text-white cursor-pointer hover:opacity-80 shadow-sm" style={{ backgroundColor: tag.color }} title="Click to remove">{tag.name}</span>
                                                            ))}
                                                        </div>
                                                        {editingTaskId === task.id ? (
                                                            <div className="flex flex-col gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                                                                <input autoFocus className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-sm bg-white" value={tempTaskTitle} onChange={e => setTempTaskTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && updateTask(task.id, tempTaskTitle)} />
                                                                <div className="flex gap-2">
                                                                    <select className="flex-1 p-1.5 border border-gray-300 rounded-md text-xs bg-white focus:border-black" value={task.assignee_id || ''} onChange={(e) => updateTask(task.id, undefined, e.target.value ? Number(e.target.value) : null)}>
                                                                        <option value="">Assignee</option>
                                                                        {members.map(m => <option key={m.id} value={m.id}>{m.username}</option>)}
                                                                    </select>
                                                                    <select className="flex-1 p-1.5 border border-gray-300 rounded-md text-xs bg-white focus:border-black" value="" onChange={(e) => handleAddTagToTask(task.id, e.target.value)}>
                                                                        <option value="">Tag</option>
                                                                        {availableTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                                    </select>
                                                                </div>
                                                                <button onClick={() => updateTask(task.id, tempTaskTitle)} className="bg-black text-white text-xs py-1.5 rounded-md hover:bg-gray-800 font-bold transition-colors">Save</button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div onClick={() => { setEditingTaskId(task.id); setTempTaskTitle(task.title); }} className="cursor-pointer">
                                                                    <span className="block mb-2 font-medium leading-snug">{task.title}</span>
                                                                    {task.assignee_name &&
                                                                        <div className="flex items-center gap-1 mt-2">
                                                                            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">{task.assignee_name[0].toUpperCase()}</div>
                                                                            <span className="text-[10px] text-gray-500 font-medium">{task.assignee_name}</span>
                                                                        </div>
                                                                    }
                                                                </div>
                                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500 p-1">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
                                        <input autoFocus className="w-full p-3 rounded-xl border border-gray-300 shadow-sm text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black bg-white" placeholder="Type task title..." value={newTaskTitles[col.id]} onChange={(e) => setNewTaskTitles({ ...newTaskTitles, [col.id]: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleAddTask(col.id)} />
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleAddTask(col.id)} className="bg-black text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-800 transition-colors shadow-sm">Add Card</button>
                                            <button onClick={() => setNewTaskTitles({ ...newTaskTitles, [col.id]: undefined })} className="text-gray-400 hover:text-gray-600 p-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => setNewTaskTitles({ ...newTaskTitles, [col.id]: '' })} className="w-full text-left text-gray-500 hover:text-black hover:bg-gray-200/50 p-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 group">
                                        <span className="bg-gray-200 text-gray-500 w-5 h-5 rounded flex items-center justify-center group-hover:bg-gray-300 group-hover:text-black transition-colors text-xs">+</span> Add a card
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {/*Add Column Button*/}
                    <div className="min-w-[300px] bg-white/50 border-2 border-dashed border-gray-300 hover:border-black hover:bg-white transition-all rounded-2xl p-4 cursor-pointer group">
                        {newColName ? (
                            <div className="bg-white p-1 rounded-lg">
                                <input autoFocus type="text" placeholder="List title..." className="w-full p-2.5 rounded-lg border border-gray-300 text-sm mb-2 focus:outline-none focus:border-black" value={newColName} onChange={(e) => setNewColName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()} />
                                <div className="flex items-center gap-2">
                                    <button onClick={handleAddColumn} className="bg-black text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-800 transition-colors">Add List</button>
                                    <button onClick={() => setNewColName('')} className="text-gray-400 hover:text-gray-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => setNewColName(' ')} className="w-full text-gray-500 font-bold p-2 text-left flex items-center gap-2 group-hover:text-black transition-colors">
                                <span className="text-xl">+</span> Add another list
                            </button>
                        )}
                    </div>
                </div>
            </DragDropContext>
        </div>
    );
}

export default KanbanBoard;