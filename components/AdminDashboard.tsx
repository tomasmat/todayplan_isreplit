import React, { useState } from 'react';
import { Settings, List, FileText, ChevronUp, ChevronDown, Edit2, Check, X, Eye, EyeOff, Save } from 'lucide-react';
import { ActivityData, DayPlan, Category } from '../types';
import { Button } from './Button';

interface AdminDashboardProps {
  activityData: ActivityData;
  onUpdateActivities: (data: ActivityData) => void;
  planCost: number;
  onUpdateCost: (cost: number) => void;
  adsEnabled: boolean;
  onUpdateAdsEnabled: (enabled: boolean) => void;
  planLogs: DayPlan[];
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  activityData,
  onUpdateActivities,
  planCost,
  onUpdateCost,
  adsEnabled,
  onUpdateAdsEnabled,
  planLogs,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'activities' | 'logs'>('settings');
  const [editingActivity, setEditingActivity] = useState<{ catKey: string; id: number; name: string; description: string } | null>(null);
  const [localCost, setLocalCost] = useState(planCost.toString());

  const handleSaveCost = () => {
    const val = parseFloat(localCost);
    if (!isNaN(val) && val >= 0) {
      onUpdateCost(val);
      alert('Plan cost updated successfully!');
    } else {
      alert('Please enter a valid cost.');
    }
  };

  const toggleActivity = (catKey: string, activityId: number) => {
    const updatedData = { ...activityData };
    const category = updatedData[catKey];
    const activityIndex = category.activities.findIndex(a => a.id === activityId);
    
    if (activityIndex > -1) {
      const activity = category.activities[activityIndex];
      // Toggle isActive (default is true if undefined)
      const currentStatus = activity.isActive !== false;
      category.activities[activityIndex] = { ...activity, isActive: !currentStatus };
      onUpdateActivities(updatedData);
    }
  };

  const moveActivity = (catKey: string, index: number, direction: 'up' | 'down') => {
    const updatedData = { ...activityData };
    const activities = updatedData[catKey].activities;
    
    if (direction === 'up' && index > 0) {
      [activities[index], activities[index - 1]] = [activities[index - 1], activities[index]];
    } else if (direction === 'down' && index < activities.length - 1) {
      [activities[index], activities[index + 1]] = [activities[index + 1], activities[index]];
    }
    
    onUpdateActivities(updatedData);
  };

  const startEdit = (catKey: string, activity: any) => {
    setEditingActivity({ catKey, id: activity.id, name: activity.name, description: activity.description });
  };

  const saveEdit = () => {
    if (!editingActivity) return;
    
    const updatedData = { ...activityData };
    const category = updatedData[editingActivity.catKey];
    const activityIndex = category.activities.findIndex(a => a.id === editingActivity.id);
    
    if (activityIndex > -1) {
       category.activities[activityIndex] = {
           ...category.activities[activityIndex],
           name: editingActivity.name,
           description: editingActivity.description
       };
       onUpdateActivities(updatedData);
    }
    setEditingActivity(null);
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Admin Dashboard</h1>
        <Button variant="outline" onClick={onClose} className="dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800">Exit Admin</Button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col md:flex-row min-h-[600px] transition-colors duration-300">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-4 space-y-2">
            <button
                onClick={() => setActiveTab('settings')}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center transition-colors ${activeTab === 'settings' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'}`}
            >
                <Settings className="w-5 h-5 mr-3" /> Settings
            </button>
            <button
                onClick={() => setActiveTab('activities')}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center transition-colors ${activeTab === 'activities' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'}`}
            >
                <List className="w-5 h-5 mr-3" /> Activities
            </button>
            <button
                onClick={() => setActiveTab('logs')}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center transition-colors ${activeTab === 'logs' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'}`}
            >
                <FileText className="w-5 h-5 mr-3" /> Plan Logs
            </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto max-h-[calc(100vh-12rem)]">
            
            {/* SETTINGS TAB */}
            {activeTab === 'settings' && (
                <div className="max-w-md">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">General Settings</h2>
                    
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Base Cost per Plan (€)</label>
                        <div className="flex items-center space-x-3">
                            <input 
                                type="number" 
                                step="0.50"
                                value={localCost}
                                onChange={(e) => setLocalCost(e.target.value)}
                                className="px-4 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-32"
                            />
                            <Button onClick={handleSaveCost} className="flex-shrink-0 text-white">
                                <Save className="w-4 h-4 mr-2" /> Save Cost
                            </Button>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">This amount will be displayed in the payment step of the Plan Wizard.</p>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Advertisement revenue</label>
                        <button
                            type="button"
                            onClick={() => onUpdateAdsEnabled(!adsEnabled)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                              adsEnabled
                                ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20'
                                : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800'
                            }`}
                        >
                            <div className="text-left">
                                <p className="font-semibold text-slate-900 dark:text-white">
                                    {adsEnabled ? 'Ads enabled' : 'Ads disabled'}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Users can watch a rewarded ad to generate a plan for free. Banner ads appear on the dashboard.
                                </p>
                            </div>
                            <span className={`ml-3 shrink-0 w-11 h-6 rounded-full relative transition-colors ${adsEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${adsEnabled ? 'translate-x-5' : ''}`} />
                            </span>
                        </button>
                    </div>
                </div>
            )}

            {/* ACTIVITIES TAB */}
            {activeTab === 'activities' && (
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Manage Activities</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Reorder, edit, or disable activities. Disabled activities will not appear in the wizard.</p>
                    
                    <div className="space-y-6">
                        {(Object.entries(activityData) as [string, Category][]).map(([key, category]) => (
                            <div key={key} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                                <div className="bg-slate-50 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 flex justify-between">
                                    <span>{category.category_name}</span>
                                    <span className="text-xs font-normal bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-400">{key}</span>
                                </div>
                                <div>
                                    {category.activities.map((activity, idx) => {
                                        const isEditing = editingActivity?.catKey === key && editingActivity?.id === activity.id;
                                        const isActive = activity.isActive !== false;

                                        return (
                                            <div key={activity.id} className={`p-4 border-b border-slate-100 dark:border-slate-800 last:border-0 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${!isActive ? 'opacity-60 bg-slate-50 dark:bg-slate-800' : ''}`}>
                                                <div className="flex flex-col space-y-1 pt-1">
                                                    <button 
                                                        disabled={idx === 0}
                                                        onClick={() => moveActivity(key, idx, 'up')}
                                                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 disabled:opacity-30"
                                                    >
                                                        <ChevronUp className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        disabled={idx === category.activities.length - 1}
                                                        onClick={() => moveActivity(key, idx, 'down')}
                                                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 disabled:opacity-30"
                                                    >
                                                        <ChevronDown className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <div className="flex-1">
                                                    {isEditing ? (
                                                        <div className="grid gap-2">
                                                            <input 
                                                                className="px-2 py-1 border border-blue-300 dark:border-blue-700 dark:bg-slate-700 dark:text-white rounded text-sm font-medium w-full"
                                                                value={editingActivity.name}
                                                                onChange={(e) => setEditingActivity({...editingActivity, name: e.target.value})}
                                                                placeholder="Activity Name"
                                                            />
                                                            <input 
                                                                className="px-2 py-1 border border-blue-300 dark:border-blue-700 dark:bg-slate-700 dark:text-slate-200 rounded text-sm text-slate-600 w-full"
                                                                value={editingActivity.description}
                                                                onChange={(e) => setEditingActivity({...editingActivity, description: e.target.value})}
                                                                placeholder="Description"
                                                            />
                                                            <div className="flex space-x-2 mt-1">
                                                                <Button size="sm" onClick={saveEdit} className="text-white">Save</Button>
                                                                <Button size="sm" variant="ghost" onClick={() => setEditingActivity(null)} className="dark:text-slate-300">Cancel</Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-slate-800 dark:text-slate-200">{activity.name}</span>
                                                                {!isActive && <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-bold uppercase">Disabled</span>}
                                                            </div>
                                                            <p className="text-sm text-slate-500 dark:text-slate-400">{activity.description}</p>
                                                        </>
                                                    )}
                                                </div>

                                                <div className="flex items-center space-x-1">
                                                    {!isEditing && (
                                                        <>
                                                            <button 
                                                                onClick={() => toggleActivity(key, activity.id)}
                                                                className={`p-2 rounded-full transition-colors ${isActive ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                                                title={isActive ? "Disable" : "Enable"}
                                                            >
                                                                {isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                            </button>
                                                            <button 
                                                                onClick={() => startEdit(key, activity)}
                                                                className="p-2 rounded-full text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* LOGS TAB */}
            {activeTab === 'logs' && (
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Plan Generation Logs</h2>
                    
                    {planLogs.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                            No plans generated in this session yet.
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                                <thead className="bg-slate-50 dark:bg-slate-800">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date/Time</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Title</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cost Est.</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                                    {planLogs.map((plan) => (
                                        <tr key={plan.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                                {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                                                {plan.title}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400 font-mono">
                                                {plan.id.substring(0, 8)}...
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                                {plan.totalCostEstimate}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {plan.finalizedPlan ? (
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                        Finalized
                                                    </span>
                                                ) : (
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                                        Draft
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

        </div>
      </div>
    </div>
  );
};