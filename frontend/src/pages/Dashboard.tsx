import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Copy, BarChart2, Activity, CheckCircle, Users, FileText } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

const mockActivityData = [
  { name: 'Day 1', votes: 120 },
  { name: 'Day 2', votes: 210 },
  { name: 'Day 3', votes: 180 },
  { name: 'Day 4', votes: 290 },
  { name: 'Day 5', votes: 250 },
  { name: 'Day 6', votes: 340 },
  { name: 'Day 7', votes: 420 },
];

const mockPolls = [
  {
    id: '1',
    name: 'Favorite JS Framework',
    status: 'Active',
    responses: 1452,
    leadingOption: 'React (45%)',
    createdAt: 'Oct 24, 2026',
  },
  {
    id: '2',
    name: 'Q3 All-Hands Feedback',
    status: 'Expired',
    responses: 310,
    leadingOption: 'Very Satisfied (68%)',
    createdAt: 'Sep 12, 2026',
  },
  {
    id: '3',
    name: 'Next Office Location',
    status: 'Active',
    responses: 89,
    leadingOption: 'New York (52%)',
    createdAt: 'Oct 26, 2026',
  },
  {
    id: '4',
    name: 'Product Roadmap Q4',
    status: 'Active',
    responses: 2450,
    leadingOption: 'AI Features (38%)',
    createdAt: 'Oct 20, 2026',
  },
  {
    id: '5',
    name: 'Holiday Party Theme',
    status: 'Expired',
    responses: 421,
    leadingOption: '80s Retro (41%)',
    createdAt: 'Aug 05, 2026',
  },
];

export default function Dashboard() {
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPolls = mockPolls.filter((poll) => {
    const matchesFilter = filter === 'All' || poll.status === filter;
    const matchesSearch = poll.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Overview</h1>
            <p className="text-sm text-slate-500 mt-1">Welcome back, Creator. Here's what's happening today.</p>
          </div>
          <Link
            to="/create"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm text-sm"
          >
            <Plus className="w-4 h-4" />
            Create New Poll
          </Link>
        </div>

        {/* Mini Analysis Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Card 1 */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-500">Total Polls Created</span>
              <FileText className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-slate-900">12</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-500">Total Responses</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex items-end gap-3">
              <span className="text-3xl font-bold text-slate-900">4,521</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700 mb-1">
                +12% this week
              </span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-500">Avg. Completion Rate</span>
              <CheckCircle className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-slate-900">94%</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-500">Activity Trend</span>
              <Activity className="w-4 h-4 text-slate-400" />
            </div>
            <div className="h-12 w-full mt-auto">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockActivityData}>
                  <Line 
                    type="monotone" 
                    dataKey="votes" 
                    stroke="#4f46e5" 
                    strokeWidth={2} 
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search polls..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
            />
          </div>
          <div className="flex bg-white rounded-lg border border-slate-200 p-1 w-full sm:w-auto">
            {['All', 'Active', 'Expired'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  filter === tab
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Dense Poll Overview Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Poll Name</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Responses</th>
                  <th className="px-6 py-4 font-medium">Leading Option</th>
                  <th className="px-6 py-4 font-medium">Created Date</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPolls.length > 0 ? (
                  filteredPolls.map((poll) => (
                    <tr key={poll.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900">{poll.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-full">
                          <span 
                            className={`w-2 h-2 rounded-full ${poll.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} 
                          />
                          <span className="text-xs font-medium text-slate-700">{poll.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-slate-700 font-medium">{poll.responses.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {poll.leadingOption}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {poll.createdAt}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                            title="Copy Link"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <Link
                            to={`/analytics/${poll.id}`}
                            className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-medium text-sm px-2 py-1.5 hover:bg-indigo-50 rounded-md transition-colors"
                          >
                            <BarChart2 className="w-4 h-4" />
                            Analytics
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No polls found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
