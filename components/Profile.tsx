import React, { useState } from 'react';
import { Plus, Trash2, Users, Edit2, Check, X, User } from 'lucide-react';
import { Button } from './Button';
import { UserProfile, Companion } from '../types';

interface ProfileProps {
  user: UserProfile;
  onUpdate: (user: UserProfile) => void;
  t: any; // Translation object
}

export const Profile: React.FC<ProfileProps> = ({ user, onUpdate, t }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newCompanion, setNewCompanion] = useState<Partial<Companion>>({});
  
  // State for editing companions
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Companion>>({});

  // State for editing Main User
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [userEditData, setUserEditData] = useState<{name: string; age: string; relation: string}>({
      name: user.name,
      age: user.age?.toString() || '',
      relation: user.relation || 'Organizer'
  });

  const handleAddCompanion = () => {
    if (!newCompanion.name || !newCompanion.age || !newCompanion.relation) return;
    
    const companion: Companion = {
      id: Math.random().toString(36).substr(2, 9),
      name: newCompanion.name,
      age: Number(newCompanion.age),
      relation: newCompanion.relation
    };

    onUpdate({
      ...user,
      companions: [...user.companions, companion]
    });
    setNewCompanion({});
    setIsAdding(false);
  };

  const removeCompanion = (id: string) => {
    if (window.confirm('Are you sure you want to remove this companion?')) {
        onUpdate({
        ...user,
        companions: user.companions.filter(c => c.id !== id)
        });
    }
  };

  const startEditing = (companion: Companion) => {
    setEditingId(companion.id);
    setEditFormData({ ...companion });
    setIsAdding(false); // Close add form if open
    setIsEditingUser(false);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const saveEditing = () => {
    if (!editFormData.name || !editFormData.age || !editFormData.relation) return;

    const updatedCompanions = user.companions.map(c => 
      c.id === editingId ? { ...c, ...editFormData } as Companion : c
    );

    onUpdate({
      ...user,
      companions: updatedCompanions
    });
    setEditingId(null);
    setEditFormData({});
  };

  const saveUserEditing = () => {
     if (!userEditData.name || !userEditData.age || !userEditData.relation) return;
     
     onUpdate({
         ...user,
         name: userEditData.name,
         age: Number(userEditData.age),
         relation: userEditData.relation
     });
     setIsEditingUser(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-colors duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t.dashboard.profileTitle}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.dashboard.profileSubtitle}</p>
          </div>
        </div>
        {/* Only show Add button if not currently adding or editing */}
        {!isAdding && !editingId && !isEditingUser && (
          <Button onClick={() => setIsAdding(true)} variant="secondary" size="sm" className="dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
            <Plus className="w-4 h-4 mr-2" />
            {t.profile.add}
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {/* Main User Profile Section */}
        <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30 overflow-hidden">
            <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900/30 text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide flex justify-between items-center">
                <span>My Profile</span>
                {!isEditingUser && (
                    <button onClick={() => { setIsEditingUser(true); setUserEditData({ name: user.name, age: user.age?.toString(), relation: user.relation }); }} className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded text-blue-600 dark:text-blue-400">
                        <Edit2 className="w-3 h-3" />
                    </button>
                )}
            </div>
            
            {isEditingUser ? (
                 <div className="p-4 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <input
                        placeholder={t.profile.name}
                        className="px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full"
                        value={userEditData.name}
                        onChange={e => setUserEditData({...userEditData, name: e.target.value})}
                        autoFocus
                    />
                    <input
                        placeholder={t.profile.age}
                        type="number"
                        className="px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full"
                        value={userEditData.age}
                        onChange={e => setUserEditData({...userEditData, age: e.target.value})}
                    />
                    <input
                        placeholder="Relation (e.g. Organizer)"
                        className="px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full"
                        value={userEditData.relation}
                        onChange={e => setUserEditData({...userEditData, relation: e.target.value})}
                    />
                    </div>
                    <div className="flex justify-end space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingUser(false)} className="text-slate-500 dark:text-slate-400">
                        <X className="w-4 h-4 mr-1" /> {t.profile.cancel}
                    </Button>
                    <Button size="sm" onClick={saveUserEditing} className="bg-green-600 hover:bg-green-700 text-white">
                        <Check className="w-4 h-4 mr-1" /> {t.profile.save}
                    </Button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-200 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-200 font-bold mr-3">
                            {user.name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="font-medium text-slate-900 dark:text-white">{user.name}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{user.age || '?'} years • {user.relation || 'Organizer'}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Companions List */}
        <div className="space-y-4">
            {user.companions.length === 0 && !isAdding && (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                {t.profile.empty}
            </div>
            )}

            {user.companions.map((companion) => (
            <div key={companion.id} className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 transition-all">
                {editingId === companion.id ? (
                // EDIT MODE
                <div className="p-4 animate-in fade-in">
                    <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-wide">{t.profile.editing} {companion.name}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <input
                        placeholder={t.profile.name}
                        className="px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full"
                        value={editFormData.name || ''}
                        onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                        autoFocus
                    />
                    <input
                        placeholder={t.profile.age}
                        type="number"
                        className="px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full"
                        value={editFormData.age || ''}
                        onChange={e => setEditFormData({...editFormData, age: Number(e.target.value)})}
                    />
                    <select
                        className="px-3 py-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full"
                        value={editFormData.relation || ''}
                        onChange={e => setEditFormData({...editFormData, relation: e.target.value})}
                    >
                        <option value="">{t.profile.selectRelation}</option>
                        <option value="Partner">{t.profile.partner}</option>
                        <option value="Child">{t.profile.child}</option>
                        <option value="Parent">{t.profile.parent}</option>
                        <option value="Friend">{t.profile.friend}</option>
                        <option value="Other">{t.profile.other}</option>
                    </select>
                    </div>
                    <div className="flex justify-end space-x-2">
                    <Button variant="ghost" size="sm" onClick={cancelEditing} className="text-slate-500 dark:text-slate-400">
                        <X className="w-4 h-4 mr-1" /> {t.profile.cancel}
                    </Button>
                    <Button size="sm" onClick={saveEditing} className="bg-green-600 hover:bg-green-700 text-white">
                        <Check className="w-4 h-4 mr-1" /> {t.profile.save}
                    </Button>
                    </div>
                </div>
                ) : (
                // VIEW MODE
                <div className="flex items-center justify-between p-4">
                    <div>
                    <h3 className="font-medium text-slate-900 dark:text-white">{companion.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{companion.age} • {companion.relation}</p>
                    </div>
                    <div className="flex space-x-1">
                    <button 
                        onClick={() => startEditing(companion)}
                        className="text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-2 rounded-full hover:bg-blue-50 dark:hover:bg-slate-700"
                        title="Edit"
                        disabled={!!editingId || isAdding || isEditingUser} // Disable if doing something else
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => removeCompanion(companion.id)}
                        className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Delete"
                        disabled={!!editingId || isAdding || isEditingUser}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    </div>
                </div>
                )}
            </div>
            ))}
        </div>

        {isAdding && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30 animate-in fade-in slide-in-from-top-2">
            <div className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3">{t.profile.addNewTitle}</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <input
                placeholder={t.profile.name}
                className="px-3 py-2 rounded-md border border-blue-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full"
                value={newCompanion.name || ''}
                onChange={e => setNewCompanion({...newCompanion, name: e.target.value})}
                autoFocus
              />
              <input
                placeholder={t.profile.age}
                type="number"
                className="px-3 py-2 rounded-md border border-blue-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full"
                value={newCompanion.age || ''}
                onChange={e => setNewCompanion({...newCompanion, age: Number(e.target.value)})}
              />
              <select
                className="px-3 py-2 rounded-md border border-blue-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none w-full"
                value={newCompanion.relation || ''}
                onChange={e => setNewCompanion({...newCompanion, relation: e.target.value})}
              >
                <option value="">{t.profile.selectRelation}</option>
                <option value="Partner">{t.profile.partner}</option>
                <option value="Child">{t.profile.child}</option>
                <option value="Parent">{t.profile.parent}</option>
                <option value="Friend">{t.profile.friend}</option>
                <option value="Other">{t.profile.other}</option>
              </select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)} className="dark:text-slate-300">{t.profile.cancel}</Button>
              <Button size="sm" onClick={handleAddCompanion} className="text-white">{t.profile.addBtn}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};