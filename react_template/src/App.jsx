// src/App.jsx
import React, { useEffect } from 'react';
import MainLayout from './components/Layout/MainLayout';
import useUserStore from './stores/userStore';

function App() {
  const { user, checkUser, login } = useUserStore();

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-6">Welcome to Personal Wiki</h1>
          <button
            onClick={login}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return <MainLayout />;
}

export default App;