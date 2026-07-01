
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './components/AuthContext'; // Wires up security context
import AppRoutes from './components/AppRoutes';       // 👈 Wires up your routing engine

function App() {
  return (
    <BrowserRouter> 
      <AuthProvider>
        <div className="app-container">
          <AppRoutes />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;